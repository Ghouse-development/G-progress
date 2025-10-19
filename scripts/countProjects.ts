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
  console.error('Error: Environment variables not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function countProjects() {
  console.log('Counting projects...\n')

  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`Total projects: ${count}`)
  }
}

countProjects().catch(console.error)
