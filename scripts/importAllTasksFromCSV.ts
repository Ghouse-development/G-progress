import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// タスク定義：列インデックスと職種のマッピング
const TASK_DEFINITIONS = [
  // 契約関連
  { name: '請負契約', plannedCol: 14, actualCol: 15, department: '営業' },
  { name: '設計ヒアリング', plannedInputCol: 16, confirmedCol: 17, actualCol: 18, department: '意匠設計' },
  { name: 'プラン確定', plannedInputCol: 19, confirmedCol: 20, actualCol: 21, department: '意匠設計' },
  { name: '設計事務所発注', plannedInputCol: 22, confirmedCol: 23, actualCol: 24, department: '営業事務' },
  { name: 'プラン確定時資金計画書お客様送付', plannedInputCol: 25, confirmedCol: 26, actualCol: 27, department: '営業事務' },
  { name: '構造GO', plannedInputCol: 28, confirmedCol: 29, actualCol: 30, department: '構造設計' },
  { name: '申請GO', plannedInputCol: 31, confirmedCol: 32, actualCol: 33, department: '申請設計' },
  { name: '構造1回目CB', plannedInputCol: 34, confirmedCol: 35, actualCol: 36, department: '構造設計' },
  { name: '構造2回目CB', plannedInputCol: 37, confirmedCol: 38, actualCol: 39, department: '構造設計' },
  { name: '長期GO', plannedInputCol: 40, confirmedCol: 41, actualCol: 42, department: '申請設計' },

  // IC・打合せ関連
  { name: 'IC', plannedCol: 56, actualCol: 57, department: 'IC' },
  { name: '最終打合', plannedInputCol: 64, confirmedCol: 65, actualCol: 66, department: 'IC' },
  { name: '会議図面渡し日', plannedInputCol: 67, confirmedCol: 68, actualCol: 69, department: '実施設計' },
  { name: '変更契約前会議', plannedInputCol: 70, confirmedCol: 71, actualCol: 72, department: '営業' },
  { name: '図面UP', plannedInputCol: 73, confirmedCol: 74, actualCol: 75, department: '実施設計' },
  { name: '構造図UP', plannedInputCol: 76, confirmedCol: 77, actualCol: 78, department: '構造設計' },
  { name: '着工許可', plannedInputCol: 79, confirmedCol: 80, actualCol: 81, department: '営業' },

  // 申請関連
  { name: '長期必要期日', plannedCol: 82, actualCol: 83, department: '申請設計' },
  { name: 'フラット必要期日', plannedCol: 87, actualCol: 88, department: '申請設計' },
  { name: '建築確認済証取得', plannedCol: 89, confirmedCol: 90, actualCol: 91, department: '申請設計' },
  { name: '中間検査合格証取得', plannedCol: 92, confirmedCol: 93, actualCol: 94, department: '工事' },

  // 解体関連
  { name: '解体開始日', plannedCol: 103, confirmedCol: 104, actualCol: 105, department: '工事' },
  { name: '解体完了日', plannedCol: 106, confirmedCol: 107, actualCol: 108, department: '工事' },
  { name: '解体後ダンドリへ写真UP', plannedCol: 109, confirmedCol: 110, actualCol: 111, department: '工事' },

  // 変更契約・土地関連
  { name: '変更契約日', plannedInputCol: 112, confirmedCol: 113, actualCol: 114, department: '営業' },
  { name: '土地決済', plannedInputCol: 115, confirmedCol: 116, actualCol: 117, department: '営業' },
  { name: '分筆', plannedCol: 118, actualCol: 119, department: '営業事務' },
  { name: '新規水道引き込み工事', plannedInputCol: 120, confirmedCol: 121, actualCol: 122, department: '工事' },

  // 着工関連
  { name: '請負契約着工日', plannedInputCol: 123, confirmedCol: 124, actualCol: 125, department: '工事' },
  { name: '変更契約着工日', plannedInputCol: 126, confirmedCol: 127, actualCol: 128, department: '工事' },
  { name: '着工前先行工事', confirmedCol: 129, actualCol: 130, department: '工事' },
  { name: '地盤補強', plannedInputCol: 131, confirmedCol: 132, actualCol: 133, department: '工事' },
  { name: '基礎着工日', plannedInputCol: 134, confirmedCol: 135, actualCol: 136, department: '工事' },

  // 工事関連
  { name: '実行予算完成', plannedCol: 137, actualCol: 138, department: '積算・発注' },
  { name: '上棟日', plannedInputCol: 139, confirmedCol: 140, actualCol: 141, department: '工事' },
  { name: '中間検査', plannedInputCol: 146, confirmedCol: 147, actualCol: 148, department: '工事' },
  { name: '完了検査前先行工事', plannedInputCol: 149, confirmedCol: 150, actualCol: 151, department: '工事' },
  { name: '軽微変更', plannedCol: 152, actualCol: 153, department: '工事' },
  { name: '完了検査', plannedInputCol: 154, confirmedCol: 155, actualCol: 156, department: '工事' },

  // 引渡し関連
  { name: '引渡日', plannedCol: 161, actualCol: 162, department: '工事' },
  { name: '施主希望カギ渡し日', plannedInputCol: 163, confirmedCol: 164, actualCol: 165, department: '工事' },
  { name: '外構工事', plannedCol: 166, actualCol: 167, department: '外構工事' }
]

function parseCSVDate(dateStr: string, contractDate?: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  // 全角数字を半角に変換
  let trimmed = dateStr.trim()
    .replace(/０/g, '0')
    .replace(/１/g, '1')
    .replace(/２/g, '2')
    .replace(/３/g, '3')
    .replace(/４/g, '4')
    .replace(/５/g, '5')
    .replace(/６/g, '6')
    .replace(/７/g, '7')
    .replace(/８/g, '8')
    .replace(/９/g, '9')

  const parts = trimmed.split('/')

  if (parts.length === 2) {
    // MM/DD形式 → 年を推定
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])

    // 無効な月日チェック
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null
    }

    let year = 2024

    // 契約日がある場合、その年を基準にする
    if (contractDate) {
      const contractDateObj = new Date(contractDate)
      const contractYear = contractDateObj.getFullYear()
      const contractMonth = contractDateObj.getMonth() + 1
      const contractDay = contractDateObj.getDate()

      // 全タスクは請負契約日より後になるように年を決定
      if (month < contractMonth) {
        // 月が契約月より前の場合は翌年
        year = contractYear + 1
      } else if (month === contractMonth) {
        // 同じ月の場合は日で判断
        if (day >= contractDay) {
          year = contractYear
        } else {
          year = contractYear + 1
        }
      } else {
        // 月が契約月より後の場合は同じ年
        year = contractYear
      }
    }

    return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
  } else if (parts.length === 3) {
    // YYYY/M/D または M/D/YYYY 形式
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    } else {
      // M/D/YYYYの場合
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    }
  }

  return null
}

function getTaskStatus(plannedDate: string | null, actualDate: string | null): string {
  if (actualDate) return 'completed'
  if (plannedDate) return 'in_progress'
  return 'not_started'
}

async function importAllTasks() {
  console.log('📋 全タスクインポートを開始します...\n')
  console.log('=' .repeat(100))

  // Read CSV with proper parser
  const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  // Parse CSV using csv-parse/sync for proper handling of quoted fields
  const allRecords = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  })

  // Extract only valid data rows (skip header row)
  const records: string[][] = []
  for (let i = 1; i < allRecords.length; i++) {
    const row = allRecords[i]
    const contractNumber = row[0]?.trim()

    // Only include rows with 6-digit contract numbers
    if (contractNumber && /^\d{6}$/.test(contractNumber)) {
      records.push(row)
    }
  }

  console.log(`📊 CSV総データ行数: ${records.length}\n`)

  // Get all projects from database
  const { data: allProjects, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_number, contract_date, customer:customers(names)')
    .order('contract_number')

  if (projectError) {
    console.error('❌ データベースエラー:', projectError)
    return
  }

  console.log(`💾 データベース案件数: ${allProjects?.length || 0}\n`)
  console.log('=' .repeat(100))

  let processedProjects = 0
  let createdTasks = 0
  let skippedProjects = 0
  let errors = 0

  for (const record of records) {
    const contractNumber = record[0]?.trim()

    // Skip if not a valid 6-digit contract number
    if (!contractNumber || !/^\d{6}$/.test(contractNumber)) {
      continue
    }

    const customerName = record[1]?.trim()

    // Find matching project in database
    const matchingProjects = allProjects?.filter(p => p.contract_number === contractNumber)

    if (!matchingProjects || matchingProjects.length === 0) {
      console.log(`⚠️  契約番号 ${contractNumber}: データベースに見つかりません`)
      skippedProjects++
      continue
    }

    let targetProject = matchingProjects[0]

    // Handle duplicates - try to match by customer name
    if (matchingProjects.length > 1) {
      const csvCustomerNormalized = customerName.replace(/\s/g, '').replace(/　/g, '')

      for (const project of matchingProjects) {
        const dbCustomerName = project.customer?.names?.join('') || ''
        const dbCustomerNormalized = dbCustomerName.replace(/・/g, '').replace(/\s/g, '')

        if (csvCustomerNormalized.includes(dbCustomerNormalized) ||
            dbCustomerNormalized.includes(csvCustomerNormalized)) {
          targetProject = project
          break
        }
      }
    }

    console.log(`\n📌 処理中: 契約番号 ${contractNumber} - ${customerName}`)
    console.log(`   プロジェクトID: ${targetProject.id}`)

    const projectContractDate = targetProject.contract_date || null

    // Delete existing tasks for this project to avoid duplicates
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', targetProject.id)

    if (deleteError) {
      console.log(`   ⚠️  既存タスク削除エラー: ${deleteError.message}`)
    }

    // Create tasks for each task definition
    const tasksToInsert: any[] = []

    for (const taskDef of TASK_DEFINITIONS) {
      let plannedDate: string | null = null
      let actualDate: string | null = null

      // Extract planned date (try plannedInputCol first, then plannedCol)
      if (taskDef.plannedInputCol !== undefined && record[taskDef.plannedInputCol]) {
        plannedDate = parseCSVDate(record[taskDef.plannedInputCol], projectContractDate)
      } else if (taskDef.confirmedCol !== undefined && record[taskDef.confirmedCol]) {
        plannedDate = parseCSVDate(record[taskDef.confirmedCol], projectContractDate)
      } else if (taskDef.plannedCol !== undefined && record[taskDef.plannedCol]) {
        plannedDate = parseCSVDate(record[taskDef.plannedCol], projectContractDate)
      }

      // Extract actual date
      if (taskDef.actualCol !== undefined && record[taskDef.actualCol]) {
        actualDate = parseCSVDate(record[taskDef.actualCol], projectContractDate)
      }

      // Only create task if there's at least a planned or actual date
      if (plannedDate || actualDate) {
        const status = getTaskStatus(plannedDate, actualDate)

        tasksToInsert.push({
          project_id: targetProject.id,
          title: taskDef.name,
          description: `${taskDef.department}: ${taskDef.name}`,
          due_date: plannedDate,
          actual_completion_date: actualDate,
          status: status,
          priority: 'medium',
          assigned_to: null
        })
      }
    }

    if (tasksToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)

      if (insertError) {
        console.log(`   ❌ タスク挿入エラー: ${insertError.message}`)
        errors++
      } else {
        console.log(`   ✅ ${tasksToInsert.length} 件のタスクを挿入`)
        createdTasks += tasksToInsert.length
      }
    } else {
      console.log(`   ℹ️  タスクデータなし`)
    }

    processedProjects++
  }

  console.log('\n' + '=' .repeat(100))
  console.log('📊 インポート結果サマリー')
  console.log('=' .repeat(100))
  console.log(`✅ 処理完了案件数: ${processedProjects}`)
  console.log(`✅ 作成タスク数: ${createdTasks}`)
  console.log(`⏭️  スキップ案件数: ${skippedProjects}`)
  console.log(`❌ エラー数: ${errors}`)
  console.log('\n' + '=' .repeat(100))
}

importAllTasks().catch(console.error)
