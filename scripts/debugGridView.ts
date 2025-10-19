import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { differenceInDays } from 'date-fns'

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

async function debugGridView() {
  console.log('🔍 グリッドビュー表示をデバッグします...\n')

  // 最初のプロジェクトを取得
  const { data: projects } = await supabase
    .from('projects')
    .select('*, customer:customers(names)')
    .limit(1)

  if (!projects || projects.length === 0) {
    console.error('❌ プロジェクトが見つかりません')
    return
  }

  const project = projects[0]
  const customerName = project.customer?.names?.join('・') || '不明'

  console.log(`📋 プロジェクト: ${customerName}様`)
  console.log(`   契約日: ${project.contract_date}`)
  console.log(`   ID: ${project.id}\n`)

  // このプロジェクトのタスクを取得
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', project.id)
    .limit(10)

  if (!tasks || tasks.length === 0) {
    console.error('❌ タスクが見つかりません')
    return
  }

  console.log(`✅ ${tasks.length}件のタスクを取得しました\n`)

  console.log('=== タスクのグリッドビュー情報 ===\n')

  tasks.forEach((task, index) => {
    // ProjectDetail.tsxと同じロジックでdayFromContractを計算
    const dayFromContract = task.due_date && project.contract_date
      ? differenceInDays(new Date(task.due_date), new Date(project.contract_date))
      : 0

    // descriptionから職種を抽出
    const descriptionParts = task.description?.split(':')
    const taskPosition = descriptionParts?.[0]?.trim()

    console.log(`${index + 1}. ${task.title}`)
    console.log(`   期限: ${task.due_date}`)
    console.log(`   description: "${task.description}"`)
    console.log(`   → 抽出された職種: "${taskPosition}"`)
    console.log(`   → 契約日からの日数: ${dayFromContract}日`)
    console.log(`   → グリッドで表示される位置: 職種="${taskPosition}" / 日数=${dayFromContract}`)
    console.log('')
  })

  console.log('\n=== グリッドビューで表示されるための条件 ===')
  console.log('1. task.dayFromContract が一致すること')
  console.log('2. task.description が "職種: ..." の形式であること')
  console.log('3. 抽出された職種がグリッドの職種列に存在すること')
  console.log('\n有効な職種:')
  console.log('  営業部: 営業, 営業事務, ローン事務')
  console.log('  設計部: 意匠設計, IC, 実施設計, 構造設計, 申請設計')
  console.log('  工事部: 工事, 工事事務, 積算・発注')
  console.log('  外構事業部: 外構設計, 外構工事')
}

debugGridView().catch(console.error)
