import { createClient } from '@supabase/supabase-js'

// Supabase設定
const supabaseUrl = 'https://qxftwxkpeqvlukjybnfp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTIzMTUsImV4cCI6MjA3NTM4ODMxNX0.CMvqNski6cYgG3cfkNPwtpKJQKiaWPtszP48qX8_WP8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function insertSampleData() {
  console.log('🚀 サンプルデータの投入を開始します...\n')

  // 1. 従業員データを投入
  console.log('📝 従業員データを投入中...')
  const employees = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: '田中太郎',
      department: '営業',
      role: 'manager',
      email: 'tanaka@ghouse.co.jp'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: '鈴木一郎',
      department: '実施設計',
      role: 'member',
      email: 'suzuki@ghouse.co.jp'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: '佐藤健',
      department: '工事',
      role: 'leader',
      email: 'sato@ghouse.co.jp'
    }
  ]

  const { error: empError } = await supabase
    .from('employees')
    .upsert(employees, { onConflict: 'id' })

  if (empError) {
    console.error('❌ 従業員データの投入に失敗:', empError.message)
    return
  }
  console.log('✅ 従業員データを投入しました (3件)\n')

  // 2. 顧客データを投入
  console.log('📝 顧客データを投入中...')
  const customers = [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      names: ['山本', '花子'],
      building_site: '東京都世田谷区桜新町1-1-1',
      phone: '03-1111-1111',
      email: 'yamamoto@example.com'
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      names: ['佐々木', '次郎'],
      building_site: '神奈川県横浜市青葉区美しが丘2-2-2',
      phone: '045-2222-2222',
      email: 'sasaki@example.com'
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      names: ['林', '美咲'],
      building_site: '千葉県浦安市舞浜3-3-3',
      phone: '047-3333-3333',
      email: 'hayashi@example.com'
    }
  ]

  const { error: custError } = await supabase
    .from('customers')
    .upsert(customers, { onConflict: 'id' })

  if (custError) {
    console.error('❌ 顧客データの投入に失敗:', custError.message)
    return
  }
  console.log('✅ 顧客データを投入しました (3件)\n')

  // 3. 案件データを投入
  console.log('📝 案件データを投入中...')
  const projects = [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      customer_id: 'c1111111-1111-1111-1111-111111111111',
      contract_date: '2025-03-01',
      construction_start_date: '2025-05-01',
      scheduled_end_date: '2025-11-30',
      actual_end_date: null,
      status: 'construction',
      progress_rate: 65.00,
      assigned_sales: '11111111-1111-1111-1111-111111111111',
      assigned_design: '22222222-2222-2222-2222-222222222222',
      assigned_construction: '33333333-3333-3333-3333-333333333333'
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      customer_id: 'c2222222-2222-2222-2222-222222222222',
      contract_date: '2025-08-15',
      construction_start_date: null,
      scheduled_end_date: '2026-03-31',
      actual_end_date: null,
      status: 'post_contract',
      progress_rate: 10.00,
      assigned_sales: '11111111-1111-1111-1111-111111111111',
      assigned_design: '22222222-2222-2222-2222-222222222222',
      assigned_construction: '33333333-3333-3333-3333-333333333333'
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      customer_id: 'c3333333-3333-3333-3333-333333333333',
      contract_date: '2025-10-05',
      construction_start_date: null,
      scheduled_end_date: null,
      actual_end_date: null,
      status: 'pre_contract',
      progress_rate: 0.00,
      assigned_sales: '11111111-1111-1111-1111-111111111111',
      assigned_design: null,
      assigned_construction: null
    }
  ]

  const { error: projError } = await supabase
    .from('projects')
    .upsert(projects, { onConflict: 'id' })

  if (projError) {
    console.error('❌ 案件データの投入に失敗:', projError.message)
    return
  }
  console.log('✅ 案件データを投入しました (3件)\n')

  console.log('🎉 サンプルデータの投入が完了しました！\n')
  console.log('📊 投入データサマリー:')
  console.log('   - 従業員: 3件 (営業1名、設計1名、工事1名)')
  console.log('   - 顧客: 3件')
  console.log('   - 案件: 3件 (着工後1件、契約後1件、契約前1件)')
  console.log('\n👉 http://localhost:5173/projects で確認できます')
}

insertSampleData().catch(console.error)
