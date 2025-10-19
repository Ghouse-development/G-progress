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

async function checkEmployeeEmails() {
  console.log('📧 従業員のメールアドレスを確認しています...\n')

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, last_name, first_name, email, department')
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
  console.log('メールアドレス一覧（最初の30件）:\n')

  employees.slice(0, 30).forEach((emp, index) => {
    const email = emp.email || '(空欄)'
    console.log(`${index + 1}. ${emp.last_name} ${emp.first_name} (${emp.department}): ${email}`)
  })

  if (employees.length > 30) {
    console.log(`\n... 他 ${employees.length - 30}件`)
  }

  // メールアドレスがあるもの/ないものの集計
  const withEmail = employees.filter(e => e.email).length
  const withoutEmail = employees.filter(e => !e.email).length

  console.log(`\n📈 集計:`)
  console.log(`  メールアドレスあり: ${withEmail}件`)
  console.log(`  メールアドレスなし: ${withoutEmail}件`)

  // メールアドレスのドメイン集計
  const domains = new Map<string, number>()
  employees.forEach(emp => {
    if (emp.email) {
      const domain = emp.email.split('@')[1] || 'unknown'
      domains.set(domain, (domains.get(domain) || 0) + 1)
    }
  })

  if (domains.size > 0) {
    console.log(`\n📧 ドメイン別集計:`)
    Array.from(domains.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, count]) => {
        console.log(`  @${domain}: ${count}件`)
      })
  }
}

checkEmployeeEmails()
