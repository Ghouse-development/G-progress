import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTasksBeforeContract() {
  console.log('🔍 請負契約日より前のタスクをチェックします...\n')
  console.log('=' .repeat(100))

  // Get all projects with contract dates
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_number, contract_date, customer:customers(names)')
    .not('contract_date', 'is', null)
    .order('contract_number')

  if (projectError) {
    console.error('❌ エラー:', projectError)
    return
  }

  console.log(`📊 契約日がある案件数: ${projects?.length || 0}\n`)

  let totalTasksBeforeContract = 0
  let projectsWithIssues = 0
  const allowedTasksBeforeContract = ['設計ヒアリング'] // 契約前に許可されるタスク

  for (const project of projects || []) {
    const contractDate = new Date(project.contract_date!)

    // Get all tasks for this project
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, actual_completion_date, status')
      .eq('project_id', project.id)

    if (!tasks || tasks.length === 0) continue

    // Check for tasks before contract date
    const tasksBeforeContract = tasks.filter(task => {
      // Check due_date
      if (task.due_date) {
        const dueDate = new Date(task.due_date)
        if (dueDate < contractDate && !allowedTasksBeforeContract.includes(task.title)) {
          return true
        }
      }
      // Check actual_completion_date
      if (task.actual_completion_date) {
        const actualDate = new Date(task.actual_completion_date)
        if (actualDate < contractDate && !allowedTasksBeforeContract.includes(task.title)) {
          return true
        }
      }
      return false
    })

    if (tasksBeforeContract.length > 0) {
      projectsWithIssues++
      console.log(`\n⚠️  契約番号: ${project.contract_number}`)
      console.log(`   顧客名: ${project.customer?.names?.join('・')}`)
      console.log(`   契約日: ${project.contract_date}`)
      console.log(`   契約前タスク数: ${tasksBeforeContract.length}件\n`)

      tasksBeforeContract.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title} (${task.description})`)
        if (task.due_date) {
          const dueDate = new Date(task.due_date)
          if (dueDate < contractDate) {
            const diffDays = Math.floor((contractDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            console.log(`      📅 予定日: ${task.due_date} (契約日の${diffDays}日前)`)
          }
        }
        if (task.actual_completion_date) {
          const actualDate = new Date(task.actual_completion_date)
          if (actualDate < contractDate) {
            const diffDays = Math.floor((contractDate.getTime() - actualDate.getTime()) / (1000 * 60 * 60 * 24))
            console.log(`      ✅ 実績日: ${task.actual_completion_date} (契約日の${diffDays}日前)`)
          }
        }
      })

      totalTasksBeforeContract += tasksBeforeContract.length
    }
  }

  console.log('\n' + '=' .repeat(100))
  console.log('📊 検証結果サマリー')
  console.log('=' .repeat(100))
  console.log(`\n⚠️  問題がある案件数: ${projectsWithIssues}件`)
  console.log(`⚠️  契約前タスク総数: ${totalTasksBeforeContract}件`)
  console.log(`\nℹ️  許可されている契約前タスク: ${allowedTasksBeforeContract.join(', ')}`)
  console.log()
}

checkTasksBeforeContract().catch(console.error)
