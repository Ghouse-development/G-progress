/**
 * 初期データ投入スクリプト
 * Service Role Keyを使用してRLSをバイパスし、大量データを効率的に投入します
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// 環境変数読み込み
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ エラー: 環境変数が設定されていません')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅' : '❌')
  process.exit(1)
}

// Service Role Keyでクライアント作成（RLSバイパス）
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

console.log('🚀 G-progress 初期データ投入スクリプト')
console.log('================================================')
console.log('⚠️  Service Role Keyを使用（RLSバイパス）')
console.log('================================================\n')

/**
 * 従業員データ投入
 */
async function seedEmployees() {
  console.log('📝 従業員データ投入中...')

  const employees = [
    {
      email: 'admin@ghouse.jp',
      first_name: '秀樹',
      last_name: '西野',
      department: '営業',
      role: 'executive'
    },
    {
      email: 'sales1@ghouse.jp',
      first_name: '太郎',
      last_name: '山田',
      department: '営業',
      role: 'member'
    },
    {
      email: 'sales2@ghouse.jp',
      first_name: '花子',
      last_name: '佐藤',
      department: '営業',
      role: 'member'
    },
    {
      email: 'design1@ghouse.jp',
      first_name: '一郎',
      last_name: '鈴木',
      department: '意匠設計',
      role: 'member'
    },
    {
      email: 'design2@ghouse.jp',
      first_name: '次郎',
      last_name: '田中',
      department: '実施設計',
      role: 'member'
    },
    {
      email: 'const1@ghouse.jp',
      first_name: '三郎',
      last_name: '高橋',
      department: '工事',
      role: 'leader'
    },
    {
      email: 'const2@ghouse.jp',
      first_name: '四郎',
      last_name: '渡辺',
      department: '工事',
      role: 'member'
    }
  ]

  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert(employees)
    .select()

  if (error) {
    console.error('❌ エラー:', error.message)
    return false
  }

  console.log(`✅ 従業員データ投入完了: ${data.length}件\n`)
  return true
}

/**
 * 顧客データ投入
 */
async function seedCustomers() {
  console.log('📝 顧客データ投入中...')

  const customers = [
    {
      names: ['田中 太郎', '田中 花子'],
      building_site: '東京都世田谷区〇〇1-2-3',
      phone: '03-1111-2222',
      email: 'tanaka@example.com'
    },
    {
      names: ['山田 一郎'],
      building_site: '神奈川県横浜市〇〇区〇〇4-5-6',
      phone: '045-2222-3333',
      email: 'yamada@example.com'
    },
    {
      names: ['佐藤 次郎', '佐藤 美咲'],
      building_site: '千葉県千葉市〇〇区〇〇7-8-9',
      phone: '043-3333-4444',
      email: 'sato@example.com'
    }
  ]

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert(customers)
    .select()

  if (error) {
    console.error('❌ エラー:', error.message)
    return false
  }

  console.log(`✅ 顧客データ投入完了: ${data.length}件\n`)
  return true
}

/**
 * 業者データ投入
 */
async function seedVendors() {
  console.log('📝 業者データ投入中...')

  const vendors = [
    {
      name: '株式会社〇〇建材',
      category: '建材',
      contact_person: '山田太郎',
      phone: '03-1111-2222',
      email: 'yamada@kenzai.example.com'
    },
    {
      name: '株式会社△△設備',
      category: '設備',
      contact_person: '佐藤花子',
      phone: '03-2222-3333',
      email: 'sato@setsubi.example.com'
    },
    {
      name: '株式会社□□電気',
      category: '電気',
      contact_person: '鈴木一郎',
      phone: '03-3333-4444',
      email: 'suzuki@denki.example.com'
    }
  ]

  const { data, error } = await supabaseAdmin
    .from('vendors')
    .insert(vendors)
    .select()

  if (error) {
    console.error('❌ エラー:', error.message)
    return false
  }

  console.log(`✅ 業者データ投入完了: ${data.length}件\n`)
  return true
}

/**
 * メイン処理
 */
async function main() {
  console.log('開始時刻:', new Date().toLocaleString('ja-JP'))
  console.log('')

  try {
    // 既存データの確認
    const { count: empCount } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })

    if (empCount && empCount > 0) {
      console.log('⚠️  既にデータが存在します')
      console.log(`   従業員: ${empCount}件`)
      console.log('\n続行しますか？（Y/n）')
      // 実運用では readline を使用
      // process.exit(0)
    }

    // データ投入
    const results = await Promise.all([
      seedEmployees(),
      seedCustomers(),
      seedVendors()
    ])

    if (results.every(r => r === true)) {
      console.log('================================================')
      console.log('✅ 全データ投入完了')
      console.log('================================================')
    } else {
      console.log('⚠️  一部のデータ投入に失敗しました')
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
    process.exit(1)
  }

  console.log('\n終了時刻:', new Date().toLocaleString('ja-JP'))
}

// 実行
main()
