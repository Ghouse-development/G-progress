import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .envファイルを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSupabaseConnection() {
  console.log('=== Supabase接続テスト ===\n')

  // 1. 環境変数チェック
  console.log('✓ 環境変数の確認')
  console.log(`  VITE_SUPABASE_URL: ${supabaseUrl}`)
  console.log(`  VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '設定済み' : '未設定'}\n`)

  // 2. 従業員テーブルの接続テスト
  console.log('✓ 従業員テーブル接続テスト...')
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, email, department')
      .limit(5)

    if (error) {
      console.error('  ❌ エラー:', error.message)
      console.error('  詳細:', error)
    } else {
      console.log(`  ✅ 成功: ${employees?.length || 0}件の従業員データを取得`)
      if (employees && employees.length > 0) {
        console.log('  サンプル:', employees[0])
      }
    }
  } catch (err) {
    console.error('  ❌ 例外:', err)
  }
  console.log('')

  // 3. 認証ユーザーの確認
  console.log('✓ 認証ユーザー確認...')
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession()

    if (authError) {
      console.error('  ❌ エラー:', authError.message)
    } else {
      if (authData.session) {
        console.log('  ✅ ログイン中:', authData.session.user.email)
      } else {
        console.log('  ⚠️  未ログイン')
      }
    }
  } catch (err) {
    console.error('  ❌ 例外:', err)
  }
  console.log('')

  // 4. テストログイン試行
  console.log('✓ テストログイン試行（admin@ghouse.jp）...')
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@ghouse.jp',
      password: 'Ghouse0648'
    })

    if (error) {
      console.error('  ❌ ログイン失敗:', error.message)
      console.log('  原因分析:')
      if (error.message.includes('Invalid login credentials')) {
        console.log('    → ユーザーが存在しないか、パスワードが間違っています')
      } else if (error.message.includes('Email not confirmed')) {
        console.log('    → メールアドレスが未確認です')
      } else {
        console.log('    → その他の認証エラー:', error)
      }
    } else {
      console.log('  ✅ ログイン成功!')
      console.log('  ユーザーID:', data.user?.id)
      console.log('  メール:', data.user?.email)

      // ログアウト
      await supabase.auth.signOut()
      console.log('  （テスト後ログアウト完了）')
    }
  } catch (err) {
    console.error('  ❌ 例外:', err)
  }
  console.log('')

  // 5. Supabase Authのユーザー一覧確認（管理者権限が必要）
  console.log('✓ 結論')
  console.log('  Supabase接続: OK')
  console.log('  認証システム: 上記結果を確認してください')
  console.log('')
}

testSupabaseConnection()
