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

async function deleteSampleData() {
  console.log('🔄 サンプルデータの削除を開始します...\n')

  // サンプル従業員のメールアドレス
  const sampleEmails = [
    'tanaka@example.com',
    'suzuki@example.com',
    'sato@example.com'
  ]

  // サンプル従業員を削除
  console.log('📝 サンプル従業員を削除中...')
  for (const email of sampleEmails) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('email', email)

    if (error) {
      console.error(`❌ エラー: ${email}`, error.message)
    } else {
      console.log(`✅ 削除: ${email}`)
    }
  }

  // サンプル顧客名
  const sampleCustomers = [
    ['田中太郎'],
    ['鈴木一郎'],
    ['佐藤健'],
    ['山田太郎'],
    ['佐藤花子']
  ]

  // サンプル顧客とそのプロジェクトを削除（CASCADE削除により関連データも削除される）
  console.log('\n📝 サンプル顧客とプロジェクトを削除中...')
  for (const names of sampleCustomers) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, names')
      .contains('names', names)

    if (customers && customers.length > 0) {
      for (const customer of customers) {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', customer.id)

        if (error) {
          console.error(`❌ エラー: ${customer.names.join(' ')}`, error.message)
        } else {
          console.log(`✅ 削除: ${customer.names.join(' ')}`)
        }
      }
    }
  }

  console.log('\n✅ サンプルデータの削除完了')
}

deleteSampleData().catch(console.error)
