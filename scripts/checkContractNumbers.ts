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

async function checkContractNumbers() {
  console.log('🔍 契約番号の保存状況を確認中...\n')

  const { data, error } = await supabase
    .from('projects')
    .select('id, contract_number, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })
    .limit(10)

  if (error) {
    console.log('❌ contract_number列が存在しません:', error.message)
    console.log('\n📋 次のSQLをSupabase SQL Editorで実行してください:')
    console.log('   ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50);')
    console.log('   CREATE INDEX IF NOT EXISTS idx_projects_contract_number ON projects(contract_number);')
    process.exit(1)
  } else {
    console.log('✅ contract_number列は存在します\n')
    console.log('=== 最新10件の契約番号確認 ===\n')

    let withNumberCount = 0
    let withoutNumberCount = 0

    data.forEach((project: any, index: number) => {
      const customerName = project.customer?.names?.join('・') || '不明'
      const contractNo = project.contract_number || '未設定'
      const hasNumber = project.contract_number ? '✅' : '❌'

      if (project.contract_number) withNumberCount++
      else withoutNumberCount++

      console.log(`${index + 1}. ${hasNumber} ${customerName}様 - 契約No: ${contractNo}`)
    })

    console.log(`\n✅ 契約番号あり: ${withNumberCount}件`)
    console.log(`❌ 契約番号なし: ${withoutNumberCount}件`)

    if (withoutNumberCount > 0) {
      console.log('\n⚠️  契約番号が設定されていないプロジェクトがあります')
      console.log('   SQLマイグレーションを実行してから、再度インポートしてください')
    } else {
      console.log('\n🎉 全てのプロジェクトに契約番号が設定されています！')
    }
  }
}

checkContractNumbers().catch(console.error)
