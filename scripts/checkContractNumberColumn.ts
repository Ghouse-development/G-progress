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

async function checkColumn() {
  console.log('🔍 contract_number列の存在を確認中...\n')

  const { data, error } = await supabase
    .from('projects')
    .select('contract_number')
    .limit(1)

  if (error) {
    console.log('❌ contract_number列が存在しません')
    console.log('エラー:', error.message)
    console.log('\n📋 次のSQLをSupabase SQL Editorで実行してください:')
    console.log('   ファイル: supabase/add_contract_number.sql')
    console.log('\n   内容:')
    console.log('   ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50);')
    console.log('   CREATE INDEX IF NOT EXISTS idx_projects_contract_number ON projects(contract_number);')
    process.exit(1)
  } else {
    console.log('✅ contract_number列は既に存在します')
    console.log('\n次のステップ: CSVを再インポートして契約番号を保存します')
  }
}

checkColumn().catch(console.error)
