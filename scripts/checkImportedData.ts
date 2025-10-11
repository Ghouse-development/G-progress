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

async function checkImport() {
  // プロジェクト数を確認
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })
    .limit(10)

  console.log('✅ 最新10件のプロジェクト:')
  projects?.forEach(p => {
    const customer = (p.customer as any)
    const names = customer?.names?.join(' ') || '不明'
    console.log(`  - ${names} (契約日: ${p.contract_date})`)
  })

  // タスク数を確認
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  console.log(`\n✅ 総タスク数: ${taskCount}件`)

  // 顧客数を確認
  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  console.log(`✅ 総顧客数: ${customerCount}件`)

  // プロジェクト数を確認
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  console.log(`✅ 総プロジェクト数: ${projectCount}件`)
}

checkImport().catch(console.error)
