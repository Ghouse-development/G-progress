import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// .envファイルを読み込んでパース
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

async function checkTaskDescriptions() {
  console.log('🔍 タスクのdescriptionフィールドを確認します...\n')

  // サンプルとして最初の3プロジェクトのタスクを確認
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, customer:customers(names)')
    .limit(3)

  if (projectsError) {
    console.error('❌ プロジェクトの取得エラー:', projectsError)
    return
  }

  for (const project of projects || []) {
    const customerName = project.customer?.names?.join('・') || '不明'
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📋 プロジェクト: ${customerName}様`)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, status')
      .eq('project_id', project.id)
      .limit(10)

    console.log(`\nタスク数: ${tasks?.length || 0}件（最初の10件表示）\n`)

    if (tasks && tasks.length > 0) {
      tasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title}`)
        console.log(`   description: ${task.description || '(null)'}`)
        console.log(`   due_date: ${task.due_date}`)
        console.log(`   status: ${task.status}`)

        // descriptionから職種を抽出してみる
        if (task.description) {
          const descriptionParts = task.description.split(':')
          const taskPosition = descriptionParts?.[0]?.trim()
          console.log(`   → 抽出された職種: "${taskPosition}"`)
        } else {
          console.log(`   ⚠️  descriptionがnullです`)
        }
        console.log('')
      })
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n=== 結論 ===')
  console.log('グリッドビューは以下のようにタスクをフィルタリングします：')
  console.log('')
  console.log('const getTasksForPositionAndDay = (position: string, day: number) => {')
  console.log('  return tasks.filter(task => {')
  console.log('    const descriptionParts = task.description?.split(":")')
  console.log('    const taskPosition = descriptionParts?.[0]?.trim()')
  console.log('    return task.dayFromContract === day && taskPosition === position')
  console.log('  })')
  console.log('}')
  console.log('')
  console.log('CSVからインポートしたタスクのdescriptionが「職種: ...」形式でない場合、')
  console.log('グリッドビューに表示されません。')
}

checkTaskDescriptions().catch(console.error)
