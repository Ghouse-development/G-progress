import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import Papa from 'papaparse'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// CSVファイルのパス
const csvPath = 'C:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'

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

  console.log(`✅ ${Object.keys(employeeMap).length / 3}人の従業員データを読み込みました\n`)
}

// 従業員名からIDを取得
function getEmployeeId(name: string | undefined): string | null {
  if (!name || name.trim() === '') return null

  // 複数の名前がある場合は最初の名前を使用
  const firstName = name.split(/[、,]|\s+/)[0].trim()

  return employeeMap[firstName] || employeeMap[firstName.replace(/\s+/g, '')] || null
}

async function updateStaffAssignments() {
  console.log('🔄 担当者情報の更新を開始します...\n')

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

  console.log(`📊 CSVファイル: ${rows.length}行を読み込みました\n`)

  // 列インデックス
  const COL_CONTRACT_NO = 0       // 契約番号
  const COL_CUSTOMER_NAME = 1     // お客様名
  const COL_SALES = 4             // 営業
  const COL_DESIGN = 5            // 設計
  const COL_IC = 6                // IC
  const COL_CONSTRUCTION = 7      // 工事
  const COL_EXTERIOR = 8          // 外構

  let successCount = 0
  let notFoundCount = 0
  let errorCount = 0

  // データ行はインデックス100以降
  for (let i = 100; i < rows.length; i++) {
    const row = rows[i]

    // 契約番号が空の行はスキップ
    if (!row[COL_CONTRACT_NO] || row[COL_CONTRACT_NO].trim() === '') {
      continue
    }

    try {
      const contractNo = row[COL_CONTRACT_NO].trim()
      const customerName = row[COL_CUSTOMER_NAME]?.trim() || ''

      // 担当者情報を取得
      const salesId = getEmployeeId(row[COL_SALES])
      const designId = getEmployeeId(row[COL_DESIGN])
      const icId = getEmployeeId(row[COL_IC])
      const constructionId = getEmployeeId(row[COL_CONSTRUCTION])
      const exteriorId = getEmployeeId(row[COL_EXTERIOR])

      // 契約番号でプロジェクトを検索
      const { data: projects, error: searchError } = await supabase
        .from('projects')
        .select('id, contract_number')
        .eq('contract_number', contractNo)

      if (searchError) {
        console.error(`❌ 検索エラー (${contractNo}):`, searchError)
        errorCount++
        continue
      }

      if (!projects || projects.length === 0) {
        console.log(`⚠️  案件が見つかりません: ${contractNo} - ${customerName}`)
        notFoundCount++
        continue
      }

      const projectId = projects[0].id

      // 担当者情報を更新
      const updateData: any = {}
      if (salesId) updateData.sales_staff_id = salesId
      if (designId) updateData.design_staff_id = designId
      if (icId) updateData.ic_staff_id = icId
      if (constructionId) updateData.construction_staff_id = constructionId
      if (exteriorId) updateData.exterior_staff_id = exteriorId

      if (Object.keys(updateData).length === 0) {
        console.log(`⏭️  担当者情報なし: ${contractNo} - ${customerName}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)

      if (updateError) {
        console.error(`❌ 更新エラー (${contractNo}):`, updateError)
        errorCount++
      } else {
        const staffInfo = []
        if (salesId) staffInfo.push(`営業: ${row[COL_SALES]}`)
        if (designId) staffInfo.push(`設計: ${row[COL_DESIGN]}`)
        if (icId) staffInfo.push(`IC: ${row[COL_IC]}`)
        if (constructionId) staffInfo.push(`工事: ${row[COL_CONSTRUCTION]}`)
        if (exteriorId) staffInfo.push(`外構: ${row[COL_EXTERIOR]}`)

        console.log(`✅ ${contractNo} - ${customerName}: ${staffInfo.join(', ')}`)
        successCount++
      }
    } catch (error) {
      console.error(`❌ 処理エラー:`, error)
      errorCount++
    }
  }

  console.log('\n====================================')
  console.log('📊 更新結果サマリー')
  console.log('====================================')
  console.log(`✅ 成功: ${successCount}件`)
  console.log(`⚠️  案件未発見: ${notFoundCount}件`)
  console.log(`❌ エラー: ${errorCount}件`)
  console.log('====================================\n')
}

updateStaffAssignments()
