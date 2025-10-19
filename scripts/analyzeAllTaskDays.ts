import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { differenceInDays } from 'date-fns'

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

async function analyzeAllTaskDays() {
  console.log('📊 全プロジェクトのタスク日数を分析します...\n')

  // 全プロジェクト数
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  console.log(`プロジェクト総数: ${projectCount}件\n`)

  // 全タスク数
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  console.log(`タスク総数: ${taskCount}件\n`)

  // サンプルとして10件のプロジェクトを確認
  const { data: projects } = await supabase
    .from('projects')
    .select('*, customer:customers(names)')
    .limit(10)

  let minusCount = 0
  let plusCount = 0
  let zeroCount = 0

  for (const project of projects || []) {
    const customerName = project.customer?.names?.join('・') || '不明'

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)

    if (!tasks || tasks.length === 0) continue

    console.log(`\n📋 ${customerName}様 (契約日: ${project.contract_date})`)
    console.log(`   タスク数: ${tasks.length}件`)

    const daysList: number[] = []
    tasks.forEach(task => {
      if (task.due_date) {
        const days = differenceInDays(new Date(task.due_date), new Date(project.contract_date))
        daysList.push(days)
        if (days < 0) minusCount++
        else if (days === 0) zeroCount++
        else plusCount++
      }
    })

    daysList.sort((a, b) => a - b)
    const minDay = daysList[0]
    const maxDay = daysList[daysList.length - 1]
    const minusDays = daysList.filter(d => d < 0).length

    console.log(`   日数範囲: ${minDay}日 〜 ${maxDay}日`)
    console.log(`   マイナス日数: ${minusDays}件 / ${tasks.length}件`)

    if (minusDays > 0) {
      console.log(`   ⚠️  ${minusDays}件のタスクが契約日より前になっています！`)
    }
  }

  console.log('\n=== 全体統計 ===')
  console.log(`マイナス日数のタスク: ${minusCount}件`)
  console.log(`0日目のタスク: ${zeroCount}件`)
  console.log(`プラス日数のタスク: ${plusCount}件`)
  console.log(``)
  console.log(`⚠️  マイナス日数のタスクはグリッドビューに表示されません！`)
}

analyzeAllTaskDays().catch(console.error)
