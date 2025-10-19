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

async function checkTasksSchema() {
  console.log('🔍 tasksテーブルのスキーマを確認します...\n')

  // 1件のタスクを取得してカラムを確認
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  if (tasks && tasks.length > 0) {
    const task = tasks[0]
    console.log('✅ tasksテーブルのカラム:')
    console.log(JSON.stringify(task, null, 2))
    console.log('\n📋 カラム一覧:')
    Object.keys(task).forEach(key => {
      console.log(`  - ${key}: ${typeof task[key]}`)
    })
  }

  // task_mastersテーブルが存在するか確認
  console.log('\n🔍 task_mastersテーブルを確認...')
  const { data: taskMasters, error: tmError } = await supabase
    .from('task_masters')
    .select('*')
    .limit(1)

  if (tmError) {
    console.log('❌ task_mastersテーブルのエラー:', tmError.message)
    console.log('   → このテーブルは存在しないか、アクセスできません')
  } else {
    console.log('✅ task_mastersテーブルが存在します')
    if (taskMasters && taskMasters.length > 0) {
      console.log('   カラム:', Object.keys(taskMasters[0]))
    }
  }
}

checkTasksSchema().catch(console.error)
