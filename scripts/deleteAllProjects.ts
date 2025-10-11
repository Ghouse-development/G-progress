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
    const value = match[2].trim().replace(/^["']|["']$/g, '')
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

async function deleteAllProjects() {
  console.log('🔄 すべてのプロジェクトとデータを削除します...\n')

  // すべてのプロジェクトを取得
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id')

  if (projectError) {
    console.error('❌ プロジェクトの取得に失敗:', projectError)
    return
  }

  console.log(`📝 ${projects?.length || 0}件のプロジェクトを削除します...`)

  // すべての顧客を取得（CASCADE削除によりプロジェクトも削除される）
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id')

  if (customerError) {
    console.error('❌ 顧客の取得に失敗:', customerError)
    return
  }

  console.log(`📝 ${customers?.length || 0}件の顧客を削除します...`)

  // すべての顧客を削除（CASCADE により関連するプロジェクトとタスクも削除される）
  const { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // すべて削除

  if (deleteError) {
    console.error('❌ 削除に失敗:', deleteError)
    return
  }

  console.log('\n✅ すべてのプロジェクトとデータを削除しました')
}

deleteAllProjects().catch(console.error)
