import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function countAllTasks() {
  console.log('📊 データベース内の全タスク数を確認します...\n')

  // Use count instead of fetching all records
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  console.log(`✅ 総タスク数: ${count}件\n`)

  // Count projects with tasks
  const { data: distinctProjects, error: distinctError } = await supabase
    .rpc('count_projects_with_tasks')
    .catch(() => null)

  // If RPC doesn't exist, count manually
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('project_id')

  const projectIds = new Set(allTasks?.map(t => t.project_id))
  console.log(`✅ タスクがある案件数: ${projectIds.size}件`)

  // Sample a few projects to verify
  const { data: sampleProjects, error: sampleError } = await supabase
    .from('projects')
    .select('contract_number, customer:customers(names)')
    .in('contract_number', ['107924', '114524', '118124', '120624', '102925'])

  if (sampleProjects) {
    console.log('\n📋 サンプル案件のタスク数チェック:\n')

    for (const project of sampleProjects) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id')
        .eq('contract_number', project.contract_number)
        .limit(1)
        .single()

      if (projectData) {
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectData.id)

        console.log(`   契約番号 ${project.contract_number} (${project.customer?.names?.join('・')}): ${taskCount}件`)
      }
    }
  }
}

countAllTasks().catch(console.error)
