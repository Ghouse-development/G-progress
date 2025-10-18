import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

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

const csvPath = 'C:/claudecode/G-progress/sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv'

// タスク定義（importAllTasksFromCSV.tsと同じ）
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

async function strictVerifyAllTasks() {
  console.log('🔍 全タスク・期日の厳密な検証を開始します...\n')

  // CSVを読み込む（インポートスクリプトと同じパーサー）
  const csvContent = readFileSync(csvPath, 'utf-8')
  const allRecords = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  })

  console.log(`📄 CSVファイル: ${allRecords.length}行\n`)

  // データ行をカウント（契約番号がある行、ヘッダー行をスキップ）
  let csvProjectCount = 0
  let csvTaskCount = 0
  const csvProjects: { contractNo: string, name: string, expectedTasks: number }[] = []

  for (let i = 1; i < allRecords.length; i++) {
    const row = allRecords[i]
    const contractNo = row[0]?.trim() || ''

    if (!contractNo || !/^\d{6}$/.test(contractNo)) {
      continue
    }

    csvProjectCount++
    const customerName = row[1]?.trim() || ''

    // この行に期限日があるタスクをカウント（インポートスクリプトと同じロジック）
    let taskCountForProject = 0

    // 日付パターンチェック関数
    const isValidDate = (dateStr: string | null): boolean => {
      if (!dateStr) return false
      const trimmed = dateStr.trim()
      if (!trimmed) return false

      // MM/DD または YYYY/MM/DD 形式のみカウント
      return /^\d{1,2}\/\d{1,2}$/.test(trimmed) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)
    }

    for (const taskDef of TASK_DEFINITIONS) {
      let plannedDate: string | null = null
      let actualDate: string | null = null

      // Extract planned date (try plannedInputCol first, then plannedCol)
      if (taskDef.plannedInputCol !== undefined && row[taskDef.plannedInputCol]) {
        const value = row[taskDef.plannedInputCol]?.trim() || null
        if (isValidDate(value)) plannedDate = value
      } else if (taskDef.confirmedCol !== undefined && row[taskDef.confirmedCol]) {
        const value = row[taskDef.confirmedCol]?.trim() || null
        if (isValidDate(value)) plannedDate = value
      } else if (taskDef.plannedCol !== undefined && row[taskDef.plannedCol]) {
        const value = row[taskDef.plannedCol]?.trim() || null
        if (isValidDate(value)) plannedDate = value
      }

      // Extract actual date
      if (taskDef.actualCol !== undefined && row[taskDef.actualCol]) {
        const value = row[taskDef.actualCol]?.trim() || null
        if (isValidDate(value)) actualDate = value
      }

      // Only count task if there's at least a planned or actual date
      if (plannedDate || actualDate) {
        taskCountForProject++
        csvTaskCount++
      }
    }

    csvProjects.push({
      contractNo,
      name: customerName,
      expectedTasks: taskCountForProject
    })
  }

  console.log(`=== CSVデータ分析 ===`)
  console.log(`CSV案件数: ${csvProjectCount}件`)
  console.log(`CSV期限日を持つタスク総数: ${csvTaskCount}件\n`)

  // データベースから全プロジェクトとタスクを取得
  const { data: dbProjects, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })

  if (projectError) {
    console.error('❌ プロジェクト取得エラー:', projectError)
    return
  }

  console.log(`=== データベース分析 ===`)
  console.log(`データベース案件数: ${dbProjects?.length || 0}件`)

  let dbTotalTasks = 0
  let dbTasksWithDueDate = 0
  let dbTasksWithoutDueDate = 0

  const projectTaskCounts: { name: string, taskCount: number, dueDateCount: number }[] = []

  for (const project of dbProjects || []) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, actual_completion_date, status')
      .eq('project_id', project.id)

    const customerName = project.customer?.names?.join('・') || '不明'
    const taskCount = tasks?.length || 0
    // due_date OR actual_completion_date があればカウント（インポートロジックと同じ）
    const dueDateCount = tasks?.filter(t => t.due_date || t.actual_completion_date).length || 0

    dbTotalTasks += taskCount
    dbTasksWithDueDate += dueDateCount
    dbTasksWithoutDueDate += (taskCount - dueDateCount)

    projectTaskCounts.push({
      name: customerName,
      taskCount,
      dueDateCount
    })
  }

  console.log(`データベースタスク総数: ${dbTotalTasks}件`)
  console.log(`期限日あり: ${dbTasksWithDueDate}件`)
  console.log(`期限日なし: ${dbTasksWithoutDueDate}件\n`)

  // 比較
  console.log('=== 比較結果 ===')
  const projectCountMatch = csvProjectCount === (dbProjects?.length || 0)
  const taskCountMatch = csvTaskCount === dbTasksWithDueDate

  console.log(`案件数: CSV ${csvProjectCount}件 vs DB ${dbProjects?.length || 0}件 ${projectCountMatch ? '✅ 一致' : '❌ 不一致'}`)
  console.log(`タスク数: CSV ${csvTaskCount}件 vs DB ${dbTasksWithDueDate}件 ${taskCountMatch ? '✅ 一致' : '❌ 不一致'}\n`)

  if (!projectCountMatch || !taskCountMatch) {
    console.log('⚠️  不一致が検出されました。詳細を確認します...\n')
  }

  // サンプル10件の詳細比較
  console.log('=== サンプル10件の詳細比較 ===\n')
  for (let i = 0; i < Math.min(10, csvProjects.length); i++) {
    const csvProject = csvProjects[i]
    const dbProject = projectTaskCounts[i]

    const match = csvProject.expectedTasks === dbProject.dueDateCount ? '✅' : '❌'
    console.log(`${match} ${csvProject.name}`)
    console.log(`   CSV期待タスク数: ${csvProject.expectedTasks}件`)
    console.log(`   DB実際タスク数: ${dbProject.dueDateCount}件`)

    if (csvProject.expectedTasks !== dbProject.dueDateCount) {
      console.log(`   ⚠️  差分: ${dbProject.dueDateCount - csvProject.expectedTasks}件`)
    }
    console.log('')
  }

  // 期限日なしタスクをチェック（due_dateもactual_completion_dateもない）
  if (dbTasksWithoutDueDate > 0) {
    console.log(`⚠️  警告: ${dbTasksWithoutDueDate}件のタスクに期限日・実績日が設定されていません`)

    const { data: tasksWithoutDueDate } = await supabase
      .from('tasks')
      .select('id, title, due_date, actual_completion_date, project_id, projects!inner(customer:customers(names))')
      .is('due_date', null)
      .is('actual_completion_date', null)
      .limit(10)

    console.log('\n期限日・実績日なしタスクのサンプル:')
    tasksWithoutDueDate?.forEach((task: any) => {
      const customerName = task.projects?.customer?.names?.join('・') || '不明'
      console.log(`  - ${customerName}様: ${task.title}`)
    })
  }

  // 最終判定
  console.log('\n=== 最終判定 ===')
  if (projectCountMatch && taskCountMatch && dbTasksWithoutDueDate === 0) {
    console.log('✅✅✅ 完全一致！全てのタスクと期日が正しくインポートされています！')
  } else if (projectCountMatch && taskCountMatch) {
    console.log('✅ 案件数とタスク数は一致していますが、一部のタスクに期限日が未設定です')
  } else {
    console.log('❌ データに不一致があります。詳細を確認してください')
  }
}

strictVerifyAllTasks().catch(console.error)
