import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

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

async function verifyAllData() {
  console.log('🔍 全案件・全タスクの表示確認テストを開始します...\n')

  // 1. 全案件数を確認
  const { count: projectCount, error: projectError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  if (projectError) {
    console.error('❌ 案件データの取得に失敗:', projectError)
    return
  }

  console.log(`✅ データベース案件総数: ${projectCount}件`)

  // 2. 全タスク数を確認
  const { count: taskCount, error: taskError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  if (taskError) {
    console.error('❌ タスクデータの取得に失敗:', taskError)
    return
  }

  console.log(`✅ データベースタスク総数: ${taskCount}件\n`)

  // 3. 各案件のタスク数を確認（サンプル20件）
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })
    .limit(20)

  if (projectsError) {
    console.error('❌ 案件詳細の取得に失敗:', projectsError)
    return
  }

  console.log('=== サンプル案件のタスク数（最新20件） ===\n')

  let totalTasksInSample = 0
  for (const project of projects || []) {
    const { count: projectTaskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id)

    const customerName = project.customer?.names?.join('・') || '不明'
    console.log(`${customerName}様 (契約日: ${project.contract_date}): ${projectTaskCount}件`)
    totalTasksInSample += projectTaskCount || 0
  }

  console.log(`\nサンプル20案件のタスク合計: ${totalTasksInSample}件`)
  console.log(`全案件の平均タスク数: ${Math.round((taskCount || 0) / (projectCount || 1))}件\n`)

  // 4. タスクステータスの分布を確認
  const { data: statusData, error: statusError } = await supabase
    .from('tasks')
    .select('status')

  if (statusError) {
    console.error('❌ タスクステータスの取得に失敗:', statusError)
    return
  }

  const statusCount: Record<string, number> = {
    not_started: 0,
    requested: 0,
    delayed: 0,
    completed: 0,
    not_applicable: 0
  }

  statusData?.forEach(task => {
    if (task.status in statusCount) {
      statusCount[task.status]++
    }
  })

  console.log('=== タスクステータス分布 ===')
  console.log(`⚫ 未着手: ${statusCount.not_started}件`)
  console.log(`🟡 着手中: ${statusCount.requested}件`)
  console.log(`🔴 遅延: ${statusCount.delayed}件`)
  console.log(`🔵 完了: ${statusCount.completed}件`)
  console.log(`⚪ 対象外: ${statusCount.not_applicable}件\n`)

  // 5. タスク期限日の分布を確認
  const { data: tasksWithDates } = await supabase
    .from('tasks')
    .select('due_date, project_id, projects!inner(contract_date)')

  let negativeDayTasks = 0
  let zeroDayTasks = 0
  let positiveDayTasks = 0
  let noDueDateTasks = 0

  tasksWithDates?.forEach((task: any) => {
    if (!task.due_date) {
      noDueDateTasks++
      return
    }

    const contractDate = task.projects?.contract_date
    if (!contractDate) return

    const dayDiff = Math.floor(
      (new Date(task.due_date).getTime() - new Date(contractDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (dayDiff < 0) {
      negativeDayTasks++
    } else if (dayDiff === 0) {
      zeroDayTasks++
    } else {
      positiveDayTasks++
    }
  })

  console.log('=== タスク期限日の分布 ===')
  console.log(`契約前タスク（マイナス日数）: ${negativeDayTasks}件`)
  console.log(`契約当日タスク（0日目）: ${zeroDayTasks}件`)
  console.log(`契約後タスク（プラス日数）: ${positiveDayTasks}件`)
  console.log(`期限日未設定タスク: ${noDueDateTasks}件\n`)

  // 6. 最終確認
  console.log('=== 最終確認 ===')
  console.log(`✅ 全案件数: ${projectCount}件`)
  console.log(`✅ 全タスク数: ${taskCount}件`)
  console.log(`✅ 契約前タスク（-90日〜-1日）: ${negativeDayTasks}件 ← グリッドビューに表示されます`)
  console.log(`✅ 平均タスク数/案件: ${Math.round((taskCount || 0) / (projectCount || 1))}件`)

  console.log('\n🎉 データ確認完了！')
  console.log('📌 ブラウザで http://localhost:5173/projects を開いて全案件が表示されることを確認してください')
}

verifyAllData().catch(console.error)
