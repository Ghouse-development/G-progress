import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'

// .envファイルを読み込んでパース
const envPath = join(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// CSVファイルのパス
const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'

// 従業員名からIDを検索するためのマップ
let employeeMap: Record<string, string> = {}

// 従業員データを読み込む
async function loadEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, last_name, first_name')

  if (error) {
    console.error('❌ 従業員データの取得に失敗:', error)
    return
  }

  if (data) {
    data.forEach((emp: any) => {
      const fullName = `${emp.last_name} ${emp.first_name}`.trim()
      const lastNameOnly = emp.last_name
      employeeMap[fullName] = emp.id
      employeeMap[lastNameOnly] = emp.id
      // スペースなしバージョンも登録
      employeeMap[fullName.replace(/\s+/g, '')] = emp.id
    })
  }

  console.log(`✅ ${Object.keys(employeeMap).length / 3}人の従業員データを読み込みました`)
}

// 従業員名からIDを取得
function getEmployeeId(name: string | undefined): string | null {
  if (!name || name.trim() === '') return null

  // 複数の名前がある場合は最初の名前を使用
  const firstName = name.split(/[、,]|\s+/)[0].trim()

  return employeeMap[firstName] || employeeMap[firstName.replace(/\s+/g, '')] || null
}

// 日付文字列をyyyy-MM-dd形式に変換
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // M/Dまたはyyyy/M/d形式を想定
    const parts = dateStr.split('/')
    if (parts.length === 2) {
      // M/D形式の場合、2025年と仮定
      const month = parts[0].padStart(2, '0')
      const day = parts[1].padStart(2, '0')
      return `2025-${month}-${day}`
    } else if (parts.length === 3) {
      // yyyy/M/D形式
      const year = parts[0]
      const month = parts[1].padStart(2, '0')
      const day = parts[2].padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  } catch (error) {
    console.error('日付パースエラー:', dateStr, error)
  }

  return null
}

async function importProgressData() {
  console.log('🔄 進捗管理データのインポートを開始します...\n')

  // 従業員データを読み込む
  await loadEmployees()

  // CSVファイルを読み込む
  const csvContent = readFileSync(csvPath, 'utf-8')

  const parsed = Papa.parse(csvContent, {
    encoding: 'UTF-8',
    skipEmptyLines: true
  })

  if (parsed.errors.length > 0) {
    console.error('❌ CSVパースエラー:', parsed.errors)
    return
  }

  const rows = parsed.data as string[][]

  if (rows.length < 3) {
    console.error('❌ CSVファイルのデータが不足しています')
    return
  }

  console.log(`📊 CSVファイル: ${rows.length}行を読み込みました\n`)

  // ヘッダー行は複雑なので、データ行から開始（実際のデータは行102以降）
  // 列インデックスのマッピング
  const COL_CONTRACT_NO = 0       // 契約番号
  const COL_CUSTOMER_NAME = 1     // お客様名
  const COL_ADDRESS = 2           // 建設地
  const COL_PRODUCT = 3           // 商品
  const COL_SALES = 4             // 営業
  const COL_DESIGN = 5            // 設計
  const COL_IC = 6                // IC
  const COL_CONSTRUCTION = 7      // 工事
  const COL_EXTERIOR = 8          // 外構
  const COL_IMPL_DESIGNER = 9     // 実施図者
  const COL_FLOORS = 12           // 階数
  const COL_AREA = 13             // 坪数
  const COL_CONTRACT_DATE_PLAN = 14     // 請負契約 予定
  const COL_CONTRACT_DATE_ACTUAL = 15   // 請負契約 実績

  let successCount = 0
  let errorCount = 0
  let skipCount = 0

  // データ行は102行目以降（インデックス101以降）
  for (let i = 104; i < rows.length; i++) {
    const row = rows[i]

    // 契約番号が空の行はスキップ
    if (!row[COL_CONTRACT_NO] || row[COL_CONTRACT_NO].trim() === '') {
      continue
    }

    try {
      const contractNo = row[COL_CONTRACT_NO].trim()
      const customerName = row[COL_CUSTOMER_NAME]?.trim() || ''
      const address = row[COL_ADDRESS]?.trim() || ''
      const product = row[COL_PRODUCT]?.trim() || ''

      console.log(`\n📝 処理中: ${contractNo} - ${customerName}`)

      // 顧客名を分割（複数名の場合）
      const customerNames = customerName.split(/\s+/).filter(n => n.length > 0)

      // 顧客を作成または取得
      let customerId: string | null = null

      // 既存の顧客を検索
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, names')
        .contains('names', customerNames)

      if (existingCustomers && existingCustomers.length > 0) {
        customerId = existingCustomers[0].id
        console.log(`  ✓ 既存顧客を使用: ${customerId}`)
      } else {
        // 新規顧客を作成
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            names: customerNames,
            building_site: address,
            phone: null,
            email: null
          })
          .select()
          .single()

        if (customerError) {
          console.error(`  ❌ 顧客作成エラー:`, customerError.message)
          errorCount++
          continue
        }

        customerId = newCustomer.id
        console.log(`  ✓ 新規顧客を作成: ${customerId}`)
      }

      // 担当者IDを取得
      const salesId = getEmployeeId(row[COL_SALES])
      const designId = getEmployeeId(row[COL_DESIGN])
      const constructionId = getEmployeeId(row[COL_CONSTRUCTION])

      // 契約日を取得（予定のみ）
      const contractDate = parseDate(row[COL_CONTRACT_DATE_PLAN])

      if (!contractDate) {
        console.log(`  ⚠️  スキップ: 契約日（予定）がありません`)
        skipCount++
        continue
      }

      // プロジェクトを作成または取得
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('customer_id', customerId)
        .eq('contract_date', contractDate)
        .single()

      let projectId: string

      if (existingProject) {
        projectId = existingProject.id
        console.log(`  ✓ 既存プロジェクトを使用: ${projectId}`)
      } else {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            customer_id: customerId,
            contract_date: contractDate,
            status: 'post_contract',
            assigned_sales: salesId,
            assigned_design: designId,
            assigned_construction: constructionId
          })
          .select()
          .single()

        if (projectError) {
          console.error(`  ❌ プロジェクト作成エラー:`, projectError.message)
          errorCount++
          continue
        }

        projectId = newProject.id
        console.log(`  ✓ 新規プロジェクトを作成: ${projectId}`)
      }

      // マイルストーンタスクを作成（予定日のみ）
      // 主要なマイルストーン日付のインデックス
      const milestones = [
        { name: '設計ヒアリング', col: 17 },
        { name: 'プラン確定', col: 20 },
        { name: '構造GO', col: 26 },
        { name: '申請GO', col: 29 },
        { name: '着工日', col: 94 },
        { name: '上棟日', col: 96 },
        { name: '完了検査', col: 103 },
        { name: '引渡日', col: 106 }
      ]

      for (const milestone of milestones) {
        const dueDate = parseDate(row[milestone.col])

        if (dueDate) {
          // タスクが既に存在するかチェック
          const { data: existingTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', projectId)
            .eq('title', milestone.name)
            .single()

          if (!existingTask) {
            await supabase
              .from('tasks')
              .insert({
                project_id: projectId,
                title: milestone.name,
                due_date: dueDate,
                status: 'not_started',
                priority: 'high'
              })
          }
        }
      }

      console.log(`  ✅ インポート完了`)
      successCount++

    } catch (error: any) {
      console.error(`  ❌ エラー:`, error.message)
      errorCount++
    }
  }

  console.log('\n=== インポート完了 ===')
  console.log(`✅ 成功: ${successCount}件`)
  console.log(`⚠️  スキップ: ${skipCount}件`)
  console.log(`❌ エラー: ${errorCount}件`)
}

// 実行
importProgressData().catch(console.error)
