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

async function countEmployees() {
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })

  console.log('📊 総従業員数:', count, '人\n')

  const { data: deptCounts } = await supabase
    .from('employees')
    .select('department')

  if (deptCounts) {
    const counts: Record<string, number> = {}
    deptCounts.forEach((emp: any) => {
      counts[emp.department] = (counts[emp.department] || 0) + 1
    })

    console.log('部門別内訳:')
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([dept, count]) => {
      console.log(`  - ${dept}: ${count}人`)
    })
  }
}

countEmployees().catch(console.error)
