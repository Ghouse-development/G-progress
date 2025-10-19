import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function deletePayments() {
  console.log('全ての入金データを削除します...')

  const { error } = await supabase
    .from('payments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // 全削除

  if (error) {
    console.error('削除エラー:', error.message)
  } else {
    console.log('✓ 全ての入金データを削除しました')
  }
}

deletePayments().catch(console.error)
