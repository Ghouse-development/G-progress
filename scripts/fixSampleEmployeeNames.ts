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

async function fixSampleEmployees() {
  console.log('🔄 サンプル従業員の名前を修正します...\n')

  const fixes = [
    { email: 'tanaka@example.com', lastName: '田中', firstName: '太郎' },
    { email: 'suzuki@example.com', lastName: '鈴木', firstName: '一郎' },
    { email: 'sato@example.com', lastName: '佐藤', firstName: '健' }
  ]

  for (const fix of fixes) {
    const { error } = await supabase
      .from('employees')
      .update({
        last_name: fix.lastName,
        first_name: fix.firstName
      })
      .eq('email', fix.email)

    if (error) {
      console.error(`❌ エラー: ${fix.email}`, error.message)
    } else {
      console.log(`✅ 修正: ${fix.email} → ${fix.lastName} ${fix.firstName}`)
    }
  }

  console.log('\n✅ サンプル従業員の名前修正完了')
}

fixSampleEmployees().catch(console.error)
