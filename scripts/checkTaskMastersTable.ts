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

async function checkTable() {
  console.log('📊 task_mastersテーブルの確認中...\n')

  const { data, error } = await supabase
    .from('task_masters')
    .select('*')
    .limit(1)

  if (error) {
    console.log('❌ エラー:', error.message)
    console.log('⚠️  task_mastersテーブルが存在しません')
    return false
  } else {
    console.log('✅ task_mastersテーブルは存在します')
    const { count } = await supabase
      .from('task_masters')
      .select('*', { count: 'exact', head: true })
    console.log('データ件数:', count)
    return true
  }
}

checkTable().catch(console.error)
