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
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY)

async function checkTasks() {
  console.log('📝 各プロジェクトのタスクを確認します...\n')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })
    .limit(3)

  for (const project of projects || []) {
    const names = (project.customer as any)?.names?.join(' ') || '不明'
    console.log(`\n📊 ${names}様のタスク (契約日: ${project.contract_date}):`)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, due_date, status')
      .eq('project_id', project.id)
      .order('due_date')

    console.log(`  総タスク数: ${tasks?.length || 0}件`)

    if (tasks && tasks.length > 0) {
      console.log('  タスク一覧:')
      tasks.forEach(t => {
        const status = t.status === 'completed' ? '✅' : t.status === 'requested' ? '🟡' : '⭕'
        console.log(`    ${status} ${t.title}: ${t.due_date || '日付なし'}`)
      })
    }
  }
}

checkTasks().catch(console.error)
