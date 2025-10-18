import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteAllTasks() {
  console.log('🗑️  全タスクを削除します...\n')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

  if (error) {
    console.error('❌ エラー:', error)
  } else {
    console.log('✅ 全タスクを削除しました')
  }
}

deleteAllTasks().catch(console.error)
