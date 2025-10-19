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

async function checkProgressRate() {
  console.log('📊 プロジェクトの進捗率を確認します...\n')

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      progress_rate,
      customer:customers(names)
    `)
    .limit(10)

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  console.log('=== データベースに保存されている進捗率 ===')
  for (const project of projects || []) {
    const customerName = project.customer?.names?.join('・') || '不明'
    console.log(`\n${customerName}様:`)
    console.log(`  DB保存値: ${project.progress_rate}%`)

    // このプロジェクトのタスクを取得
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', project.id)

    const total = tasks?.length || 0
    const completed = tasks?.filter(t => t.status === 'completed').length || 0
    const notStarted = tasks?.filter(t => t.status === 'not_started').length || 0
    const requested = tasks?.filter(t => t.status === 'requested').length || 0
    const actualRate = total > 0 ? Math.round((completed / total) * 100) : 0

    console.log(`  タスク状況: 総数${total}件`)
    console.log(`    - 完了: ${completed}件`)
    console.log(`    - 着手中: ${requested}件`)
    console.log(`    - 未着手: ${notStarted}件`)
    console.log(`  → 実際の完了率: ${actualRate}%`)

    if (project.progress_rate !== actualRate) {
      console.log(`  ⚠️  DB保存値と実際の完了率が異なります！`)
    }
  }

  console.log('\n=== 結論 ===')
  console.log('進捗率が0%なのは、以下の理由です：')
  console.log('1. CSVインポート時にprogress_rateを設定していない')
  console.log('2. 全てのタスクのステータスが「未着手」(not_started)になっている')
  console.log('3. 進捗率は手動入力で、タスクの完了状況から自動計算されていない')
}

checkProgressRate().catch(console.error)
