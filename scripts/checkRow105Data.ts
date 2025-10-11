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
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY)

async function checkRow105Data() {
  console.log('📝 行105以降のデータを確認します...\n')

  // 行105以降の顧客名
  const row105Names = ['山本　名央', '山本名央', '平山 嘉飛', '平山嘉飛']

  for (const name of row105Names) {
    const nameParts = name.split(/\s+/)
    const { data } = await supabase
      .from('customers')
      .select('id, names')
      .contains('names', nameParts)

    if (data && data.length > 0) {
      console.log(`✅ "${name}" が見つかりました:`, data[0].names)
    } else {
      console.log(`❌ "${name}" が見つかりません`)
    }
  }

  // すべての顧客名を表示
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('names')
    .order('created_at', { ascending: true })

  console.log('\n📊 インポートされた顧客一覧:')
  allCustomers?.forEach((c, i) => {
    console.log(`${i + 1}. ${c.names.join(' ')}`)
  })
}

checkRow105Data().catch(console.error)
