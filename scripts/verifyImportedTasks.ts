import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyImportedTasks() {
  console.log('🔍 インポートされたタスクを検証します...\n')
  console.log('=' .repeat(100))

  // Get a sample project with tasks
  const { data: projectsList, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_number, contract_date, customer:customers(names)')
    .eq('contract_number', '114524')
    .limit(1)

  const projects = projectsList?.[0]

  if (projectError || !projects) {
    console.error('❌ プロジェクト取得エラー:', projectError)
    return
  }

  console.log(`\n📌 サンプル案件: 契約番号 ${projects.contract_number}`)
  console.log(`   顧客名: ${projects.customer?.names?.join('・')}`)
  console.log(`   契約日: ${projects.contract_date}`)
  console.log()

  // Get tasks for this project
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projects.id)
    .order('due_date')

  if (tasksError) {
    console.error('❌ タスク取得エラー:', tasksError)
    return
  }

  console.log(`📋 登録タスク数: ${tasks?.length || 0}件\n`)
  console.log('=' .repeat(100))
  console.log('タスク一覧')
  console.log('=' .repeat(100))

  tasks?.forEach((task, index) => {
    console.log(`\n${index + 1}. ${task.title}`)
    console.log(`   説明: ${task.description}`)
    console.log(`   期限（予定日）: ${task.due_date || '(なし)'}`)
    console.log(`   実績日: ${task.actual_completion_date || '(なし)'}`)
    console.log(`   ステータス: ${task.status}`)
  })

  // Check total tasks across all projects
  console.log('\n\n' + '=' .repeat(100))
  console.log('全案件のタスク集計')
  console.log('=' .repeat(100))

  const { data: allTasks, error: allTasksError } = await supabase
    .from('tasks')
    .select('project_id')

  if (allTasksError) {
    console.error('❌ 全タスク取得エラー:', allTasksError)
    return
  }

  console.log(`\n✅ 総タスク数: ${allTasks?.length || 0}件`)

  // Count projects with tasks
  const projectsWithTasks = new Set(allTasks?.map(t => t.project_id))
  console.log(`✅ タスクがある案件数: ${projectsWithTasks.size}件`)

  // Get projects without tasks
  const { data: allProjects, error: allProjectsError } = await supabase
    .from('projects')
    .select('id, contract_number, customer:customers(names)')

  if (allProjectsError) {
    console.error('❌ 全案件取得エラー:', allProjectsError)
    return
  }

  const projectsWithoutTasks = allProjects?.filter(p => !projectsWithTasks.has(p.id))

  console.log(`⚠️  タスクがない案件数: ${projectsWithoutTasks?.length || 0}件`)

  if (projectsWithoutTasks && projectsWithoutTasks.length > 0) {
    console.log('\nタスクがない案件:')
    projectsWithoutTasks.forEach(p => {
      console.log(`   - 契約番号: ${p.contract_number}, 顧客: ${p.customer?.names?.join('・')}`)
    })
  }

  // Sample another project for comparison
  console.log('\n\n' + '=' .repeat(100))
  console.log('別の案件サンプル確認')
  console.log('=' .repeat(100))

  const { data: project2List } = await supabase
    .from('projects')
    .select('id, contract_number, contract_date, customer:customers(names)')
    .eq('contract_number', '107924')
    .limit(1)

  const project2 = project2List?.[0]

  if (project2) {
    console.log(`\n📌 案件2: 契約番号 ${project2.contract_number}`)
    console.log(`   顧客名: ${project2.customer?.names?.join('・')}`)
    console.log(`   契約日: ${project2.contract_date}`)

    const { data: tasks2 } = await supabase
      .from('tasks')
      .select('title, due_date, actual_completion_date, status')
      .eq('project_id', project2.id)
      .order('due_date')

    console.log(`\n📋 登録タスク数: ${tasks2?.length || 0}件`)

    tasks2?.slice(0, 10).forEach((task, index) => {
      console.log(`\n${index + 1}. ${task.title}`)
      console.log(`   予定日: ${task.due_date || '(なし)'} | 実績日: ${task.actual_completion_date || '(なし)'} | ${task.status}`)
    })
  }
}

verifyImportedTasks().catch(console.error)
