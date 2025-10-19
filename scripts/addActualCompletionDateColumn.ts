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

async function addActualCompletionDateColumn() {
  console.log('🔄 tasksテーブルにactual_completion_date列を追加します...\n')

  const sql = `
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS actual_completion_date DATE;
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ エラー:', error.message)
      console.log('\n⚠️  注意: このスクリプトはデータベースに直接SQLを実行する権限が必要です。')
      console.log('手動でSupabaseダッシュボードのSQL Editorから以下のSQLを実行してください：')
      console.log('\n' + sql)
      return
    }

    console.log('✅ actual_completion_date列を追加しました！')
  } catch (error: any) {
    console.error('❌ エラー:', error.message)
    console.log('\n⚠️  このスクリプトは動作しない可能性があります。')
    console.log('手動でSupabaseダッシュボード (https://app.supabase.com) にアクセスし、')
    console.log('SQL Editorから以下のSQLを実行してください：\n')
    console.log('ALTER TABLE tasks')
    console.log('ADD COLUMN IF NOT EXISTS actual_completion_date DATE;')
  }
}

addActualCompletionDateColumn().catch(console.error)
