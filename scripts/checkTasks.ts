import { createClient } from '@supabase/supabase-js'

// Supabase設定
const supabaseUrl = 'https://qxftwxkpeqvlukjybnfp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTIzMTUsImV4cCI6MjA3NTM4ODMxNX0.CMvqNski6cYgG3cfkNPwtpKJQKiaWPtszP48qX8_WP8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTasks() {
  console.log('🔍 タスクデータを確認します...\n')

  // タスクの総数を確認
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, status, project_id')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('❌ タスクの取得に失敗:', error.message)
    return
  }

  console.log(`📊 タスク総数: ${tasks?.length || 0}件\n`)

  if (!tasks || tasks.length === 0) {
    console.log('⚠️  タスクが1件も登録されていません')
    console.log('\n💡 解決方法:')
    console.log('   npm run tsx scripts/insertSampleTasks.ts')
    console.log('   を実行してサンプルタスクを投入してください\n')
    return
  }

  // due_date がある タスクを表示
  const tasksWithDueDate = tasks.filter(t => t.due_date)
  console.log(`📅 due_date が設定されているタスク: ${tasksWithDueDate.length}件`)

  // 最新5件を表示
  console.log('\n📝 最新のタスク（最大5件）:')
  tasks.slice(0, 5).forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.title}`)
    console.log(`      期限: ${task.due_date || '未設定'}`)
    console.log(`      ステータス: ${task.status}`)
    console.log(`      プロジェクトID: ${task.project_id}`)
    console.log('')
  })

  // 今月のタスクを確認
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const startStr = startOfMonth.toISOString().split('T')[0]
  const endStr = endOfMonth.toISOString().split('T')[0]

  const { data: thisMonthTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date')
    .gte('due_date', startStr)
    .lte('due_date', endStr)

  console.log(`\n📆 今月（${now.getFullYear()}年${now.getMonth() + 1}月）のタスク: ${thisMonthTasks?.length || 0}件`)

  if (thisMonthTasks && thisMonthTasks.length > 0) {
    console.log('\n   タスク一覧:')
    thisMonthTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title} (${task.due_date})`)
    })
  }
}

checkTasks().catch(console.error)
