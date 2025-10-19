import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

// 管理者権限が必要なので、SERVICE_ROLE_KEYを使用する必要があります
// 注意: このスクリプトはSupabaseダッシュボードで手動実行する方が安全です

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAuthUser() {
  console.log('=== Supabase Authユーザー作成 ===\n')

  if (!supabaseServiceKey) {
    console.log('⚠️  警告: SUPABASE_SERVICE_ROLE_KEYが設定されていません')
    console.log('')
    console.log('このスクリプトでは通常のサインアップを試みますが、')
    console.log('Supabaseでメール確認が有効になっている場合は失敗します。')
    console.log('')
    console.log('【推奨される方法】')
    console.log('Supabaseダッシュボードで手動でユーザーを作成:')
    console.log('1. https://app.supabase.com/project/qxftwxkpeqvlukjybnfp にアクセス')
    console.log('2. 左メニュー > Authentication > Users')
    console.log('3. "Add user" > "Create new user" をクリック')
    console.log('4. 以下の情報を入力:')
    console.log('   - Email: admin@ghouse.jp')
    console.log('   - Password: Ghouse0648')
    console.log('   - Auto Confirm User: チェックを入れる')
    console.log('5. "Create user" をクリック')
    console.log('')
  }

  // サインアップを試行
  console.log('サインアップを試行中...')
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@ghouse.jp',
    password: 'Ghouse0648',
    options: {
      emailRedirectTo: undefined,
    }
  })

  if (error) {
    console.error('❌ エラー:', error.message)

    if (error.message.includes('already registered')) {
      console.log('\n✅ このメールアドレスは既に登録されています')
      console.log('メール確認が必要な可能性があります。')
      console.log('\nSupabaseダッシュボードで確認してください:')
      console.log('https://app.supabase.com/project/qxftwxkpeqvlukjybnfp/auth/users')
    }
  } else if (data.user) {
    console.log('✅ ユーザー作成成功!')
    console.log('ユーザーID:', data.user.id)
    console.log('メール:', data.user.email)

    if (data.user.identities && data.user.identities.length === 0) {
      console.log('\n⚠️  メール確認が必要です')
      console.log('確認メールをチェックするか、Supabaseダッシュボードで手動確認してください')
    }
  }
}

createAuthUser()
