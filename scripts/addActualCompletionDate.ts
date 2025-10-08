import { createClient } from '@supabase/supabase-js'

// Supabase設定
const supabaseUrl = 'https://qxftwxkpeqvlukjybnfp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTIzMTUsImV4cCI6MjA3NTM4ODMxNX0.CMvqNski6cYgG3cfkNPwtpKJQKiaWPtszP48qX8_WP8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addActualCompletionDate() {
  console.log('🔧 データベーススキーマを更新します...\n')

  // actual_completion_date カラムを追加
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_completion_date DATE;'
  })

  if (error) {
    console.error('❌ スキーマ更新に失敗:', error.message)
    console.log('\n📝 手動でSupabase管理画面から以下のSQLを実行してください:')
    console.log('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_completion_date DATE;')
    return
  }

  console.log('✅ actual_completion_date カラムを追加しました')
  console.log('✅ データベーススキーマの更新が完了しました！')
}

addActualCompletionDate().catch(console.error)
