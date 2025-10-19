# Supabase認証ユーザー作成手順

## 問題の原因

- データベースには94人の従業員データが存在
- しかしSupabase Authにユーザーが1人も登録されていない
- `employees.auth_user_id`が全員「未設定」

## 解決方法

### 開発環境（すぐに使える）

ログイン画面の **「クイックログイン（認証なし）」ボタン** をクリック

### 本番環境用のユーザー作成

#### 手順1: Supabaseダッシュボードでユーザー作成

1. **Supabaseダッシュボードにアクセス**
   ```
   https://app.supabase.com/project/qxftwxkpeqvlukjybnfp
   ```

2. **Authenticationページを開く**
   - 左メニュー > `Authentication` > `Users`

3. **ユーザーを追加**
   - `Add user` ボタンをクリック
   - `Create new user` を選択

4. **ユーザー情報を入力**
   - **Email**: `nishino.hideki@ghouse.co.jp` （西野秀樹様）
   - **Password**: `Ghouse0648` （または任意のパスワード）
   - **Auto Confirm User**: ✓ チェックを入れる（重要！）

5. **Create user** をクリック

6. **ユーザーIDをコピー**
   - 作成されたユーザーの `id` をコピー（例: `a1b2c3d4-...`）

#### 手順2: 従業員テーブルとリンク

**方法A: Supabase SQL Editorで実行**

```sql
-- 西野秀樹様のauth_user_idを更新
UPDATE employees
SET auth_user_id = '【手順1でコピーしたユーザーID】'
WHERE email = 'nishino.hideki@ghouse.co.jp';
```

**方法B: スクリプトで実行**

```bash
# スクリプトを作成して実行（開発中）
npx tsx scripts/linkAuthUser.ts
```

#### 手順3: ログイン確認

1. http://localhost:5174/login にアクセス
2. 以下の情報でログイン
   - Email: `nishino.hideki@ghouse.co.jp`
   - Password: `Ghouse0648`

## 全従業員のユーザー作成（オプション）

全94人のユーザーを一括作成する場合:

```bash
# 一括作成スクリプト（準備中）
npx tsx scripts/createAllAuthUsers.ts
```

**注意**: これにはSupabase Service Role Keyが必要です。

## メール確認を無効化する方法（推奨）

開発環境では、メール確認を無効にすることをお勧めします:

1. Supabaseダッシュボード > `Authentication` > `Settings`
2. `Email Auth` セクションを開く
3. **Enable email confirmations**: OFF に設定
4. `Save` をクリック

これで、新規ユーザー作成時に自動的に確認済みになります。

## トラブルシューティング

### エラー: "Invalid login credentials"

→ ユーザーが作成されていないか、パスワードが間違っています

### エラー: "Email not confirmed"

→ Supabaseダッシュボードで `Auto Confirm User` にチェックを入れ忘れています

### ログイン後に従業員情報が表示されない

→ `employees.auth_user_id` が正しくリンクされていません。手順2を確認してください。

## 参考情報

- Supabaseプロジェクト: https://app.supabase.com/project/qxftwxkpeqvlukjybnfp
- 従業員数: 94人
- 現在のauth_user_id設定: 0人（全員未設定）
