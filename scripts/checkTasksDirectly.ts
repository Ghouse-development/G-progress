import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

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

async function checkTasksDirectly() {
  console.log('🔍 タスクテーブルを直接確認します...\n')

  // 全タスク数をカウント
  const { count: totalCount, error: countError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ カウントエラー:', countError)
    return
  }

  console.log(`📊 総タスク数: ${totalCount}件\n`)

  // 最初の10件のタスクを取得
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .limit(10)

  if (tasksError) {
    console.error('❌ タスク取得エラー:', tasksError)
    return
  }

  console.log('=== 最初の10件のタスク ===\n')
  tasks?.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title}`)
    console.log(`   ID: ${task.id}`)
    console.log(`   project_id: ${task.project_id}`)
    console.log(`   description: ${task.description || '(null)'}`)
    console.log(`   due_date: ${task.due_date}`)
    console.log(`   status: ${task.status}`)
    console.log(`   actual_completion_date: ${task.actual_completion_date || '(null)'}`)
    console.log('')
  })

  // ステータス別のカウント
  const { data: statusCounts } = await supabase
    .from('tasks')
    .select('status')

  const completedCount = statusCounts?.filter(t => t.status === 'completed').length || 0
  const notStartedCount = statusCounts?.filter(t => t.status === 'not_started').length || 0

  console.log('\n=== ステータス別タスク数 ===')
  console.log(`完了: ${completedCount}件`)
  console.log(`未着手: ${notStartedCount}件`)
  console.log('')

  // プロジェクトごとのタスク数
  console.log('\n=== プロジェクトごとのタスク数（最初の5件） ===')
  const { data: projects } = await supabase
    .from('projects')
    .select('id, customer:customers(names)')
    .limit(5)

  for (const project of projects || []) {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id)

    const customerName = project.customer?.names?.join('・') || '不明'
    console.log(`${customerName}様: ${count}件`)
  }
}

checkTasksDirectly().catch(console.error)
