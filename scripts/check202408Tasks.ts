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

async function check202408Tasks() {
  console.log('📅 2024年8月のタスクを確認しています...\n')

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(
        *,
        customer:customers(*)
      )
    `)
    .gte('due_date', '2024-08-01')
    .lte('due_date', '2024-08-31')
    .order('due_date')
    .limit(15)

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  console.log(`✅ ${tasks?.length || 0}件のタスクが見つかりました\n`)

  if (tasks && tasks.length > 0) {
    console.log('タスク一覧（最初の15件）:')
    tasks.forEach((task: any) => {
      const customerName = task.project?.customer?.names?.join('・') || '顧客名なし'
      console.log(`  ${task.due_date} - ${customerName}様 - ${task.title} [${task.status}]`)
    })
  }
}

check202408Tasks()
