import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function listEmployees() {
  console.log('=== 従業員一覧 ===\n')

  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('エラー:', error)
    return
  }

  console.log(`合計: ${employees?.length || 0}件\n`)

  employees?.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.name}`)
    console.log(`   ID: ${emp.id}`)
    console.log(`   メール: ${emp.email}`)
    console.log(`   部門: ${emp.department}`)
    console.log(`   Auth ID: ${emp.auth_user_id || '未設定'}`)
    console.log('')
  })
}

listEmployees()
