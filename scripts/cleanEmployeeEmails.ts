import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

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
const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanEmployeeEmails() {
  console.log('📧 従業員のメールアドレスをクリーンアップしています...\n')

  // 全従業員を取得
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, last_name, first_name, email')
    .order('last_name')

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  if (!employees || employees.length === 0) {
    console.log('⚠️  従業員データがありません')
    return
  }

  console.log(`📊 従業員数: ${employees.length}件\n`)

  // 適当なメールアドレスのパターン
  const dummyPatterns = [
    'example.com',
    'test.com',
    'sample.com',
    'dummy.com',
    'fake.com',
    'invalid.com',
    'temp.com',
    'placeholder.com'
  ]

  const employeesToClean = employees.filter(emp => {
    if (!emp.email) return false
    return dummyPatterns.some(pattern => emp.email.includes(pattern))
  })

  if (employeesToClean.length === 0) {
    console.log('✅ 適当なメールアドレスは見つかりませんでした')
    return
  }

  console.log(`🗑️  以下の${employeesToClean.length}件の従業員のメールアドレスを空欄にします:\n`)
  employeesToClean.forEach(emp => {
    console.log(`  - ${emp.last_name} ${emp.first_name}: ${emp.email}`)
  })

  console.log('\n処理中...\n')

  // メールアドレスを空欄（NULL）に更新
  for (const emp of employeesToClean) {
    const { error: updateError } = await supabase
      .from('employees')
      .update({ email: null })
      .eq('id', emp.id)

    if (updateError) {
      console.error(`❌ 更新失敗: ${emp.last_name} ${emp.first_name}`, updateError)
    } else {
      console.log(`✅ 更新完了: ${emp.last_name} ${emp.first_name}`)
    }
  }

  console.log(`\n🎉 ${employeesToClean.length}件のメールアドレスをクリーンアップしました！`)
}

cleanEmployeeEmails()
