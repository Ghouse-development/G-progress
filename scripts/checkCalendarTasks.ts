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
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCalendarTasks() {
  console.log('📅 カレンダー用タスクを確認しています...\n')

  // 今月のタスクを取得
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  console.log(`期間: ${startStr} ～ ${endStr}\n`)

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(
        *,
        customer:customers(*)
      )
    `)
    .gte('due_date', startStr)
    .lte('due_date', endStr)
    .order('due_date')

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  console.log(`✅ ${tasks?.length || 0}件のタスクが見つかりました\n`)

  if (tasks && tasks.length > 0) {
    console.log('タスク一覧:')
    tasks.slice(0, 10).forEach((task: any) => {
      const customerName = task.project?.customer?.names?.join('・') || '顧客名なし'
      console.log(`  ${task.due_date} - ${customerName}様 - ${task.title} [${task.status}]`)
    })
    if (tasks.length > 10) {
      console.log(`  ... 他 ${tasks.length - 10}件`)
    }
  } else {
    console.log('⚠️  今月のタスクがありません')
    console.log('\n全タスク数を確認中...')
    
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 全タスク数: ${count}件`)
  }
}

checkCalendarTasks()
