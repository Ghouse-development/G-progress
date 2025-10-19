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
    const value = match[2].trim().replace(/^[\"']|[\"']$/g, '')
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
const csvPath = 'C:/claudecode/G-progress/sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv'

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
      employeeMap[fullName.replace(/\s+/g, '')] = emp.id
    })
  }

  console.log(`✅ ${Object.keys(employeeMap).length / 3}人の従業員データを読み込みました`)
}

// 従業員名からIDを取得
function getEmployeeId(name: string | undefined): string | null {
  if (!name || name.trim() === '') return null
  const firstName = name.split(/[、,]|\s+/)[0].trim()
  return employeeMap[firstName] || employeeMap[firstName.replace(/\s+/g, '')] || null
}

// 日付文字列をyyyy-MM-dd形式に変換
// 契約日を基準に年を判定
function parseDate(dateStr: string | undefined, contractDate: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    const parts = dateStr.split('/')
    if (parts.length === 2) {
      const month = parseInt(parts[0])
      const day = parseInt(parts[1])

      // 契約日から年と月を取得
      const contractYear = parseInt(contractDate.split('-')[0])
      const contractMonth = parseInt(contractDate.split('-')[1])

      let targetYear = contractYear

      // 月が契約月より小さい場合
      if (month < contractMonth) {
        const monthDiff = contractMonth - month
        // 4ヶ月以上前の月は翌年として扱う
        // （例: 契約8月、タスク4月 → 翌年4月、契約8月、タスク6月 → 同年6月）
        if (monthDiff >= 4) {
          targetYear = contractYear + 1
        }
      }

      const monthStr = month.toString().padStart(2, '0')
      const dayStr = day.toString().padStart(2, '0')

      return `${targetYear}-${monthStr}-${dayStr}`
    } else if (parts.length === 3) {
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
  console.log('🔄 進捗管理データのインポートを開始します（実績データ対応版）...\n')

  await loadEmployees()

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

  // 列インデックスのマッピング（csv-all-tasks-complete.jsonから）
  // 各タスクに職種を追加（グリッドビュー用）
  const taskColumns = [
    { name: '請負契約', yoteiCol: 14, jissekiCol: 15, position: '営業' },
    { name: '設計ヒアリング', yoteiCol: 16, jissekiCol: 18, position: '意匠設計' },
    { name: 'プラン確定', yoteiCol: 19, jissekiCol: 21, position: '意匠設計' },
    { name: '構造GO', yoteiCol: 24, jissekiCol: 26, position: '構造設計' },
    { name: '申請GO', yoteiCol: 27, jissekiCol: 29, position: '申請設計' },
    { name: '構造1回目CB', yoteiCol: 30, jissekiCol: 32, position: '構造設計' },
    { name: '構造2回目CB', yoteiCol: 33, jissekiCol: 35, position: '構造設計' },
    { name: '最終打合', yoteiCol: 50, jissekiCol: 51, position: '意匠設計' },
    { name: '構造図UP', yoteiCol: 62, jissekiCol: 63, position: '実施設計' },
    { name: '着工許可', yoteiCol: 65, jissekiCol: 66, position: '申請設計' },
    { name: 'フラット設計通知書', yoteiCol: 71, jissekiCol: 72, position: 'ローン事務' },
    { name: '建築確認済証', yoteiCol: 73, jissekiCol: 74, position: '申請設計' },
    { name: '中間検査合格証', yoteiCol: 76, jissekiCol: 77, position: '申請設計' },
    { name: '検査済証', yoteiCol: 81, jissekiCol: 82, position: '申請設計' },
    { name: '変更契約日', yoteiCol: 97, jissekiCol: 98, position: '営業' },
    { name: '分筆', yoteiCol: 104, jissekiCol: 105, position: '営業事務' },
    { name: '請負契約着工日', yoteiCol: 107, jissekiCol: 108, position: '工事' },
    { name: '上棟日', yoteiCol: 119, jissekiCol: 120, position: '工事' },
    { name: '完了検査', yoteiCol: 128, jissekiCol: -1, position: '工事' },
    { name: '完了検査（予定）', yoteiCol: 129, jissekiCol: 130, position: '工事' },
    { name: '引渡日', yoteiCol: 135, jissekiCol: 136, position: '工事' },
    { name: 'ローン本申込許可', yoteiCol: 151, jissekiCol: 152, position: 'ローン事務' },
    { name: '申込金', yoteiCol: 155, jissekiCol: 156, position: '営業事務' },
    { name: '契約金', yoteiCol: 158, jissekiCol: 159, position: '営業事務' },
    { name: '着工金', yoteiCol: 161, jissekiCol: -1, position: '営業事務' },
    { name: '着工金（支払）', yoteiCol: 162, jissekiCol: 163, position: '営業事務' },
    { name: '上棟金', yoteiCol: 168, jissekiCol: -1, position: '営業事務' },
    { name: '上棟金（支払）', yoteiCol: 169, jissekiCol: 170, position: '営業事務' },
    { name: '最終金', yoteiCol: 175, jissekiCol: -1, position: '営業事務' },
    { name: '最終金（支払）', yoteiCol: 176, jissekiCol: 177, position: '営業事務' }
  ]

  let successCount = 0
  let errorCount = 0
  let skipCount = 0

  // データ行はインデックス3以降（ヘッダー行をスキップ）
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i]

    // 契約番号がない行、または契約番号が数字でない行はスキップ
    if (!row[0] || row[0].trim() === '' || !/^\d+$/.test(row[0].trim())) {
      continue
    }

    try {
      const contractNo = row[0].trim()
      const customerName = row[1]?.trim() || ''
      const address = row[2]?.trim() || ''

      console.log(`\n📝 処理中: ${contractNo} - ${customerName}`)

      const customerNames = customerName.split(/\s+/).filter(n => n.length > 0)

      // 顧客を作成または取得
      let customerId: string | null = null

      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, names')
        .contains('names', customerNames)

      if (existingCustomers && existingCustomers.length > 0) {
        customerId = existingCustomers[0].id
        console.log(`  ✓ 既存顧客を使用: ${customerId}`)
      } else {
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
      const salesId = getEmployeeId(row[4])
      const designId = getEmployeeId(row[5])
      const constructionId = getEmployeeId(row[7])

      // 契約日を取得（契約日自体は2024年として固定）
      const contractDate = parseDate(row[14], '2024-01-01')

      if (!contractDate) {
        console.log(`  ⚠️  スキップ: 契約日がありません`)
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

        // 既存プロジェクトの契約番号を更新
        await supabase
          .from('projects')
          .update({ contract_number: contractNo })
          .eq('id', projectId)

        // 既存プロジェクトのタスクを全て削除（再インポート）
        await supabase
          .from('tasks')
          .delete()
          .eq('project_id', projectId)
        console.log(`  🗑️  既存タスクを削除しました`)
      } else {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            customer_id: customerId,
            contract_number: contractNo,
            contract_date: contractDate,
            status: 'post_contract',
            assigned_sales: salesId,
            assigned_design: designId,
            assigned_construction: constructionId,
            progress_rate: 0  // 後で更新
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

      // タスクをインポート（実績データを考慮）
      let totalTasks = 0
      let completedTasks = 0

      for (const taskDef of taskColumns) {
        const dueDate = parseDate(row[taskDef.yoteiCol], contractDate)

        if (dueDate) {
          totalTasks++

          // 実績列をチェック
          let status = 'not_started'
          let actualCompletionDate: string | null = null

          if (taskDef.jissekiCol >= 0) {
            const jissekiDate = parseDate(row[taskDef.jissekiCol], contractDate)
            if (jissekiDate) {
              status = 'completed'
              actualCompletionDate = jissekiDate
              completedTasks++
            }
          }

          const { error: taskError } = await supabase
            .from('tasks')
            .insert({
              project_id: projectId,
              title: taskDef.name,
              description: `${taskDef.position}: ${taskDef.name}`,
              due_date: dueDate,
              status: status,
              priority: 'high',
              actual_completion_date: actualCompletionDate
            })

          if (taskError) {
            console.error(`    ❌ タスク挿入エラー: ${taskDef.name}`, taskError.message)
          }
        }
      }

      // 進捗率を計算してプロジェクトを更新
      const progressRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      await supabase
        .from('projects')
        .update({ progress_rate: progressRate })
        .eq('id', projectId)

      console.log(`  📊 タスク: ${totalTasks}件（完了: ${completedTasks}件）`)
      console.log(`  ✅ 進捗率: ${progressRate}%`)
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
