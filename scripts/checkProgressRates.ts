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

async function checkProgressRates() {
  console.log('📊 全プロジェクトの進捗率を確認します...\n')

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id,
      contract_date,
      status,
      customer:customers(names)
    `)
    .order('contract_date', { ascending: false })

  if (!projects) {
    console.log('❌ プロジェクトが見つかりません')
    return
  }

  console.log(`✅ 総プロジェクト数: ${projects.length}件\n`)

  let totalTasksAllProjects = 0
  let totalCompletedAllProjects = 0

  for (const project of projects) {
    const names = (project.customer as any)?.names?.join(' ') || '不明'

    // タスクの統計を取得
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', project.id)

    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
    const inProgressTasks = tasks?.filter(t => t.status === 'requested').length || 0
    const notStartedTasks = tasks?.filter(t => t.status === 'not_started').length || 0

    const progressRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    totalTasksAllProjects += totalTasks
    totalCompletedAllProjects += completedTasks

    console.log(`📋 ${names}`)
    console.log(`   契約日: ${project.contract_date}`)
    console.log(`   ステータス: ${project.status}`)
    console.log(`   総タスク数: ${totalTasks}件`)
    console.log(`   完了: ${completedTasks}件 | 着手中: ${inProgressTasks}件 | 未着手: ${notStartedTasks}件`)
    console.log(`   進捗率: ${progressRate}%`)
    console.log('')
  }

  const overallProgressRate = totalTasksAllProjects > 0
    ? Math.round((totalCompletedAllProjects / totalTasksAllProjects) * 100)
    : 0

  console.log('=== 全体サマリー ===')
  console.log(`総プロジェクト数: ${projects.length}件`)
  console.log(`総タスク数: ${totalTasksAllProjects}件`)
  console.log(`完了タスク数: ${totalCompletedAllProjects}件`)
  console.log(`全体進捗率: ${overallProgressRate}%`)
}

checkProgressRates().catch(console.error)
