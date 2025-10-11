import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// 環境変数から接続情報を取得
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('🔄 データベースマイグレーションを開始します...\n')

  try {
    // コメントテーブルのマイグレーション
    console.log('📝 コメントテーブルを作成中...')
    const commentsSql = readFileSync(
      join(__dirname, '../supabase/migrations/create_comments_table.sql'),
      'utf-8'
    )

    const { error: commentsError } = await supabase.rpc('exec_sql', {
      sql_query: commentsSql
    })

    if (commentsError) {
      console.error('❌ コメントテーブル作成エラー:', commentsError)
    } else {
      console.log('✅ コメントテーブルを作成しました')
    }

    // ユーザー設定テーブルのマイグレーション
    console.log('\n📝 ユーザー設定テーブルを作成中...')
    const userSettingsSql = readFileSync(
      join(__dirname, '../supabase/migrations/create_user_settings_table.sql'),
      'utf-8'
    )

    const { error: settingsError } = await supabase.rpc('exec_sql', {
      sql_query: userSettingsSql
    })

    if (settingsError) {
      console.error('❌ ユーザー設定テーブル作成エラー:', settingsError)
    } else {
      console.log('✅ ユーザー設定テーブルを作成しました')
    }

    console.log('\n🎉 マイグレーションが完了しました！')

  } catch (error) {
    console.error('❌ マイグレーション実行エラー:', error)
    process.exit(1)
  }
}

// 手動実行用の代替手順を表示
console.log(`
⚠️  注意: このスクリプトはSupabaseのRPC機能が必要です。
エラーが発生した場合は、以下の手順で手動実行してください:

1. Supabaseダッシュボードを開く
   https://app.supabase.com/project/qxftwxkpeqvlukjybnfp

2. 左メニューから「SQL Editor」を選択

3. 以下のファイルの内容を順番に実行:
   - supabase/migrations/create_comments_table.sql
   - supabase/migrations/create_user_settings_table.sql

4. 各SQLを貼り付けて「Run」ボタンをクリック

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

自動実行を試みます...
`)

runMigrations()
