import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// .envファイルを読み込む
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

async function deleteSampleData() {
  console.log('🗑️  サンプルデータを削除しています...\n')

  try {
    // 1. サンプル従業員を削除（メールアドレスに"sample"や"test"が含まれるもの）
    console.log('📋 従業員データを確認中...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, email, last_name, first_name')
      .or('email.ilike.%sample%,email.ilike.%test%,email.ilike.%example%')

    if (empError) {
      console.error('❌ 従業員データの取得に失敗:', empError)
    } else if (employees && employees.length > 0) {
      console.log(`\n削除する従業員 (${employees.length}件):`)
      employees.forEach(emp => {
        console.log(`  - ${emp.last_name} ${emp.first_name} (${emp.email})`)
      })

      const { error: deleteEmpError } = await supabase
        .from('employees')
        .delete()
        .or('email.ilike.%sample%,email.ilike.%test%,email.ilike.%example%')

      if (deleteEmpError) {
        console.error('❌ 従業員の削除に失敗:', deleteEmpError)
      } else {
        console.log(`✅ ${employees.length}件の従業員を削除しました\n`)
      }
    } else {
      console.log('✅ 削除対象の従業員はありません\n')
    }

    // 2. サンプル顧客を削除
    console.log('📋 顧客データを確認中...')
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id, names')
      .or('names.cs.{"サンプル"},names.cs.{"テスト"},names.cs.{"田中"}')

    if (custError) {
      console.error('❌ 顧客データの取得に失敗:', custError)
    } else if (customers && customers.length > 0) {
      console.log(`\n削除する顧客 (${customers.length}件):`)
      customers.forEach(cust => {
        console.log(`  - ${cust.names?.join('・') || '名前なし'}`)
      })

      const { error: deleteCustError } = await supabase
        .from('customers')
        .delete()
        .or('names.cs.{"サンプル"},names.cs.{"テスト"},names.cs.{"田中"}')

      if (deleteCustError) {
        console.error('❌ 顧客の削除に失敗:', deleteCustError)
      } else {
        console.log(`✅ ${customers.length}件の顧客を削除しました\n`)
      }
    } else {
      console.log('✅ 削除対象の顧客はありません\n')
    }

    // 3. サンプル案件を削除（created_atが古い順に全削除）
    console.log('📋 案件データを確認中...')
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select(`
        id,
        contract_date,
        customer:customers(names)
      `)
      .order('created_at', { ascending: true })

    if (projError) {
      console.error('❌ 案件データの取得に失敗:', projError)
    } else if (projects && projects.length > 0) {
      console.log(`\n削除する案件 (${projects.length}件):`)
      projects.forEach((proj: any) => {
        const customerName = proj.customer?.names?.join('・') || '顧客名なし'
        console.log(`  - ${customerName}様邸 (契約日: ${proj.contract_date})`)
      })

      // 案件に紐づくタスクを先に削除
      const projectIds = projects.map((p: any) => p.id)
      const { error: deleteTasksError } = await supabase
        .from('tasks')
        .delete()
        .in('project_id', projectIds)

      if (deleteTasksError) {
        console.error('❌ タスクの削除に失敗:', deleteTasksError)
      } else {
        console.log('✅ 案件に紐づくタスクを削除しました')
      }

      // 案件を削除
      const { error: deleteProjError } = await supabase
        .from('projects')
        .delete()
        .in('id', projectIds)

      if (deleteProjError) {
        console.error('❌ 案件の削除に失敗:', deleteProjError)
      } else {
        console.log(`✅ ${projects.length}件の案件を削除しました\n`)
      }
    } else {
      console.log('✅ 削除対象の案件はありません\n')
    }

    console.log('🎉 サンプルデータの削除が完了しました！')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

deleteSampleData()
