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

async function checkAllTasks() {
  console.log('📝 全プロジェクトのタスク数を確認します...\n')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })

  if (!projects) {
    console.log('❌ プロジェクトが見つかりません')
    return
  }

  console.log(`✅ 総プロジェクト数: ${projects.length}件\n`)

  let totalTasks = 0
  const taskCounts: number[] = []

  for (const project of projects) {
    const names = (project.customer as any)?.names?.join(' ') || '不明'

    const { data: tasks, count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('project_id', project.id)

    const taskCount = count || 0
    totalTasks += taskCount
    taskCounts.push(taskCount)

    console.log(`  ${names} (${project.contract_date}): ${taskCount}件のタスク`)
  }

  console.log(`\n=== サマリー ===`)
  console.log(`総タスク数: ${totalTasks}件`)
  console.log(`平均タスク数/案件: ${(totalTasks / projects.length).toFixed(1)}件`)
  console.log(`最小タスク数: ${Math.min(...taskCounts)}件`)
  console.log(`最大タスク数: ${Math.max(...taskCounts)}件`)

  // タスク数が40件未満の案件を確認
  const projectsWithFewerTasks = projects.filter((_, index) => taskCounts[index] < 40)
  console.log(`\n⚠️  40件未満のタスクを持つ案件: ${projectsWithFewerTasks.length}件`)

  if (projectsWithFewerTasks.length > 0) {
    console.log('\nタスクが少ない案件:')
    projectsWithFewerTasks.forEach((p, index) => {
      const names = (p.customer as any)?.names?.join(' ') || '不明'
      const count = taskCounts[projects.indexOf(p)]
      console.log(`  - ${names}: ${count}件`)
    })
  }
}

checkAllTasks().catch(console.error)
