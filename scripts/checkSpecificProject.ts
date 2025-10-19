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

async function checkProject() {
  console.log('📝 新木海斗様のプロジェクトとタスクを確認します...\n')

  // 顧客を検索
  const { data: customer } = await supabase
    .from('customers')
    .select('id, names')
    .contains('names', ['新木（しんき）海斗'])
    .single()

  if (!customer) {
    console.log('❌ 顧客が見つかりません')
    return
  }

  console.log(`✅ 顧客ID: ${customer.id}`)
  console.log(`✅ 顧客名: ${customer.names.join(' ')}\n`)

  // プロジェクトを検索
  const { data: projects } = await supabase
    .from('projects')
    .select('id, contract_date')
    .eq('customer_id', customer.id)

  console.log(`✅ プロジェクト数: ${projects?.length || 0}件\n`)

  if (projects && projects.length > 0) {
    for (const project of projects) {
      console.log(`📊 プロジェクトID: ${project.id}`)
      console.log(`📊 契約日: ${project.contract_date}\n`)

      // タスクを取得
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, due_date, status')
        .eq('project_id', project.id)
        .order('title')

      console.log(`✅ タスク数: ${tasks?.length || 0}件\n`)

      if (tasks && tasks.length > 0) {
        console.log('タスク一覧:')
        tasks.forEach((t, index) => {
          console.log(`  ${index + 1}. ${t.title}: ${t.due_date || '日付なし'}`)
        })
      } else {
        console.log('⚠️ タスクが見つかりません！')
      }
    }
  }
}

checkProject().catch(console.error)
