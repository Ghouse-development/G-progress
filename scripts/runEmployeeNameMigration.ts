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
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY が必要です')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔄 従業員テーブルのマイグレーションを開始します...\n')

  try {
    // Step 1: Add columns
    console.log('📝 Step 1: last_name と first_name カラムを追加...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;
      `
    })

    // If RPC doesn't work, we'll use a different approach
    // We'll manually check and update the schema via a workaround

    // Step 2: Fetch all employees with the 'name' field
    console.log('📝 Step 2: 既存の name データを取得...')
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, email')

    if (fetchError) {
      console.error('❌ 従業員データの取得に失敗:', fetchError)
      process.exit(1)
    }

    if (!employees || employees.length === 0) {
      console.log('⚠️  従業員データが見つかりません')
      return
    }

    console.log(`✅ ${employees.length}件の従業員データを取得しました`)

    // Step 3: Update each employee with split names
    console.log('📝 Step 3: name を last_name と first_name に分割して更新...')
    let successCount = 0
    let errorCount = 0

    for (const employee of employees) {
      const fullName = (employee as any).name as string
      if (!fullName) {
        console.log(`⚠️  スキップ: ID ${employee.id} - 名前が空です`)
        continue
      }

      // Split name on first space
      const parts = fullName.trim().split(/\s+/)
      const lastName = parts[0] || fullName
      const firstName = parts.slice(1).join(' ') || ''

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          last_name: lastName,
          first_name: firstName
        })
        .eq('id', employee.id)

      if (updateError) {
        console.error(`❌ 更新失敗: ${fullName} (${employee.email})`, updateError.message)
        errorCount++
      } else {
        console.log(`✅ 更新: ${fullName} → 姓:${lastName}, 名:${firstName}`)
        successCount++
      }
    }

    console.log('\n=== マイグレーション完了 ===')
    console.log(`✅ 成功: ${successCount}件`)
    console.log(`❌ エラー: ${errorCount}件`)
    console.log(`📊 合計: ${employees.length}件`)

  } catch (error: any) {
    console.error('❌ マイグレーション中にエラーが発生:', error.message)
    process.exit(1)
  }
}

// 実行
runMigration().catch(console.error)
