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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkContractDates() {
  console.log('🔍 契約日の確認中...\n')

  const { data, error } = await supabase
    .from('projects')
    .select('id, contract_number, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })
    .limit(20)

  if (error) {
    console.log('❌ エラー:', error.message)
    process.exit(1)
  } else {
    console.log('=== 最新20件の契約日確認 ===\n')

    data.forEach((project: any, index: number) => {
      const customerName = project.customer?.names?.join('・') || '不明'
      const contractNo = project.contract_number || '未設定'
      const contractDate = project.contract_date || '未設定'

      console.log(`${index + 1}. ${customerName}様`)
      console.log(`   契約No: ${contractNo}`)
      console.log(`   契約日: ${contractDate}`)
      console.log()
    })
  }
}

checkContractDates().catch(console.error)
