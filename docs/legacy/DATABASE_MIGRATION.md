# データベースマイグレーション実行ガイド

G-progressの新機能（コメント機能、ユーザー設定）を有効化するために、データベースマイグレーションを実行します。

## 実行が必要なマイグレーション

1. **コメントテーブル** (`create_comments_table.sql`)
   - プロジェクト・タスクへのコメント機能
   - @メンション機能とスレッド返信
   - 自動通知トリガー

2. **ユーザー設定テーブル** (`create_user_settings_table.sql`)
   - テーマ設定（ライト/ダークモード）
   - 通知設定
   - 表示設定（ページサイズ、デフォルトビューなど）

## 方法1: Supabaseダッシュボード（推奨）

### ステップ1: Supabaseダッシュボードにアクセス

1. ブラウザで以下のURLを開く:
   ```
   https://app.supabase.com/project/qxftwxkpeqvlukjybnfp
   ```

2. Supabaseにログイン

3. 左側メニューから **「SQL Editor」** をクリック

### ステップ2: コメントテーブルの作成

1. SQL Editorで **「New query」** をクリック

2. `supabase/migrations/create_comments_table.sql` の内容を全てコピー＆ペースト

3. **「Run」** ボタンをクリック（または Ctrl/Cmd + Enter）

4. 成功メッセージを確認:
   ```
   Success. No rows returned
   ```

### ステップ3: ユーザー設定テーブルの作成

1. SQL Editorで再度 **「New query」** をクリック

2. `supabase/migrations/create_user_settings_table.sql` の内容を全てコピー＆ペースト

3. **「Run」** ボタンをクリック

4. 成功メッセージを確認

### ステップ4: テーブル作成の確認

1. 左側メニューから **「Table Editor」** をクリック

2. テーブル一覧に以下が表示されることを確認:
   - ✅ `comments`
   - ✅ `user_settings`

3. 各テーブルをクリックして構造を確認:

   **comments テーブル:**
   - `id` (UUID, Primary Key)
   - `project_id` (UUID, 外部キー)
   - `task_id` (UUID, 外部キー)
   - `user_id` (UUID, 外部キー)
   - `parent_comment_id` (UUID, 外部キー)
   - `content` (TEXT)
   - `mentions` (UUID[])
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)
   - `edited` (BOOLEAN)

   **user_settings テーブル:**
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, 外部キー, UNIQUE)
   - `theme` (VARCHAR)
   - `email_notifications` (BOOLEAN)
   - `push_notifications` (BOOLEAN)
   - `mention_notifications` (BOOLEAN)
   - `task_reminders` (BOOLEAN)
   - `items_per_page` (INTEGER)
   - `default_view` (VARCHAR)
   - `sidebar_collapsed` (BOOLEAN)
   - `language` (VARCHAR)
   - `timezone` (VARCHAR)
   - `dashboard_widgets` (JSONB)
   - `quick_links` (JSONB)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

## 方法2: TypeScriptスクリプト（代替）

自動化スクリプトを実行する場合:

```bash
# 環境変数を設定（.envファイルに記載されている値を使用）
export VITE_SUPABASE_URL="your-supabase-url"
export VITE_SUPABASE_ANON_KEY="your-anon-key"

# スクリプト実行
npx tsx scripts/runMigrations.ts
```

**注意:** このスクリプトは、SupabaseのRPC機能が有効な場合のみ動作します。エラーが発生した場合は方法1（ダッシュボード）を使用してください。

## 方法3: Supabase CLI（上級者向け）

Supabase CLIがインストールされている場合:

```bash
# Supabase CLIでログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref qxftwxkpeqvlukjybnfp

# マイグレーション実行
supabase db push

# または個別に実行
supabase db execute --file supabase/migrations/create_comments_table.sql
supabase db execute --file supabase/migrations/create_user_settings_table.sql
```

## トラブルシューティング

### エラー: "relation already exists"

テーブルが既に存在する場合のエラーです。問題ありません。
各SQL文には `CREATE TABLE IF NOT EXISTS` が含まれているため、既存テーブルは保護されます。

### エラー: "permission denied"

RLSポリシーの権限エラーの場合:

1. Supabaseダッシュボードで **「Authentication」** → **「Policies」** を確認
2. `comments` と `user_settings` のポリシーが有効になっているか確認
3. 必要に応じて、各SQLの `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` セクションを再実行

### エラー: "function does not exist"

トリガー関数のエラーの場合:

1. SQL全体を再度実行（関数定義も含む）
2. または、関数定義部分のみを個別に実行

## 確認方法

マイグレーション完了後、アプリで以下の機能が動作することを確認:

### コメント機能のテスト

1. プロジェクト詳細ページを開く
2. コメントセクションが表示される
3. コメントを投稿できる
4. @メンションで他のユーザーをメンション可能
5. メンションされたユーザーに通知が届く

### ユーザー設定のテスト

1. アプリにログイン
2. ユーザー設定画面を開く（実装されている場合）
3. テーマ切り替え（ライト/ダーク）が動作する
4. 設定が保存され、リロード後も保持される

## マイグレーション内容の詳細

### create_comments_table.sql

- **テーブル作成**: comments
- **インデックス**: project_id, task_id, user_id, created_at, parent_comment_id
- **トリガー**: 更新日時の自動更新
- **トリガー**: メンション時の自動通知作成
- **RLSポリシー**:
  - 全従業員が自分の所属プロジェクト/タスクのコメントを閲覧可能
  - 全従業員がコメントを作成可能
  - 自分のコメントのみ更新・削除可能（管理者は全て削除可能）

### create_user_settings_table.sql

- **テーブル作成**: user_settings
- **インデックス**: user_id (UNIQUE制約付き)
- **トリガー**: 更新日時の自動更新
- **RLSポリシー**:
  - ユーザーは自分の設定のみ閲覧・更新・作成可能

## 次のステップ

マイグレーション完了後:

1. ✅ アプリを再起動（開発サーバーを再起動）
2. ✅ ブラウザキャッシュをクリア
3. ✅ 新機能をテスト
4. ✅ 本番環境へのデプロイ準備

---

**これでG-progressの全機能が有効化されます！** 🚀

データベース構造の変更が完了したら、アプリケーションは以下の新機能を完全にサポートします:
- 📝 プロジェクト・タスクへのコメント機能
- 💬 @メンション機能とスレッド返信
- 🔔 コメント通知の自動配信
- ⚙️ ユーザーごとのカスタマイズ設定
- 🎨 ダークモード対応
- 🔧 個人設定の永続化
