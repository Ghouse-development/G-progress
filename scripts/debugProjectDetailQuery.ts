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

async function debugProjectDetailQuery() {
  console.log('🔍 ProjectDetail.tsxと同じクエリでタスクを取得します...\n')

  // まず、すべてのプロジェクトを取得
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select(`
      *,
      customer:customers(*)
    `)
    .limit(5) // 最初の5件だけテスト

  if (projectsError) {
    console.error('❌ プロジェクトの取得エラー:', projectsError)
    return
  }

  console.log(`✅ ${projects?.length || 0}件のプロジェクトを取得しました\n`)

  // 各プロジェクトについて、ProjectDetail.tsxと同じクエリでタスクを取得
  for (const project of projects || []) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📋 プロジェクト: ${project.customer?.names?.join('・')}様`)
    console.log(`   ID: ${project.id}`)
    console.log(`   契約日: ${project.contract_date}`)

    // ProjectDetail.tsxと全く同じクエリ
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_employee:assigned_to(id, last_name, first_name, department)
      `)
      .eq('project_id', project.id)

    if (tasksError) {
      console.error('   ❌ タスク取得エラー:', tasksError.message)
      continue
    }

    console.log(`   📊 タスク数: ${tasksData?.length || 0}件`)

    if (tasksData && tasksData.length > 0) {
      console.log('\n   タスク一覧（最初の10件）:')
      tasksData.slice(0, 10).forEach((task: any, index: number) => {
        console.log(`   ${index + 1}. ${task.title}`)
        console.log(`      - 期限: ${task.due_date}`)
        console.log(`      - ステータス: ${task.status}`)
        console.log(`      - 担当者: ${task.assigned_employee ? `${task.assigned_employee.last_name} ${task.assigned_employee.first_name}` : '未割当'}`)
      })

      if (tasksData.length > 10) {
        console.log(`   ... 他${tasksData.length - 10}件`)
      }
    } else {
      console.log('   ⚠️  このプロジェクトにはタスクがありません')

      // タスクマスタからタスクが生成されているか確認
      const { data: directTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)

      console.log(`   🔍 シンプルクエリでの確認: ${directTasks?.length || 0}件`)

      if (directTasks && directTasks.length > 0) {
        console.log('   ⚠️  シンプルクエリではタスクが見つかりました！')
        console.log('   → JOINが問題の可能性があります')

        // 最初のタスクの詳細を確認
        const task = directTasks[0]
        console.log('\n   最初のタスクの詳細:')
        console.log(`   - ID: ${task.id}`)
        console.log(`   - タイトル: ${task.title}`)
        console.log(`   - assigned_to: ${task.assigned_to}`)
        console.log(`   - task_master_id: ${task.task_master_id}`)
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

debugProjectDetailQuery().catch(console.error)
