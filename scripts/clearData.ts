import { createClient } from '@supabase/supabase-js'

// Supabase設定
const supabaseUrl = 'https://qxftwxkpeqvlukjybnfp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTIzMTUsImV4cCI6MjA3NTM4ODMxNX0.CMvqNski6cYgG3cfkNPwtpKJQKiaWPtszP48qX8_WP8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearData() {
  console.log('🗑️  既存データを削除します...\n')

  // 案件削除（外部キー制約により、これで関連データも削除される）
  console.log('📝 案件データを削除中...')
  const { error: projError } = await supabase
    .from('projects')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (projError) {
    console.error('❌ 案件データの削除に失敗:', projError.message)
  } else {
    console.log('✅ 案件データを削除しました')
  }

  // 顧客削除
  console.log('📝 顧客データを削除中...')
  const { error: custError } = await supabase
    .from('customers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (custError) {
    console.error('❌ 顧客データの削除に失敗:', custError.message)
  } else {
    console.log('✅ 顧客データを削除しました')
  }

  // 従業員削除
  console.log('📝 従業員データを削除中...')
  const { error: empError } = await supabase
    .from('employees')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (empError) {
    console.error('❌ 従業員データの削除に失敗:', empError.message)
  } else {
    console.log('✅ 従業員データを削除しました')
  }

  console.log('\n🎉 データの削除が完了しました！')
}

clearData().catch(console.error)
