# 管理者ユーザー設定ガイド

**目的**: admin@ghouse.jp でログインできる管理者ユーザーを作成する

**ログイン情報**:
- **メールアドレス**: admin@ghouse.jp
- **パスワード**: Ghouse0648

---

## 📋 前提条件

- Supabaseプロジェクトが作成済み
- `schema.sql` の実行完了
- マイグレーションファイルの実行完了
- Supabase Dashboardにアクセス可能

---

## 🚀 セットアップ手順

### ステップ1: Supabase Authでユーザーを作成

1. **Supabase Dashboardにログイン**
   - URL: https://app.supabase.com/project/qxftwxkpeqvlukjybnfp

2. **Authentication → Usersに移動**
   - 左メニューから「Authentication」をクリック
   - 「Users」タブを選択

3. **新規ユーザーを作成**
   - 右上の「Add User」ボタンをクリック
   - 「Create a new user」を選択

4. **ユーザー情報を入力**
   ```
   Email: admin@ghouse.jp
   Password: Ghouse0648

   オプション設定:
   ✅ Auto Confirm User (メール確認をスキップ)
   ```

5. **ユーザーを作成**
   - 「Create User」ボタンをクリック
   - 成功メッセージが表示されます

6. **User IDをコピー**
   - 作成されたユーザーの行をクリック
   - 「User UID」をコピー（例: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`）

---

### ステップ2: employeesテーブルにレコードを追加

1. **SQL Editorを開く**
   - Supabase Dashboard → SQL Editor

2. **以下のSQLを実行**（User IDを置き換えてください）

```sql
-- システム管理者の作成
-- ⚠️ '[YOUR_AUTH_USER_ID]' を実際のUser IDに置き換えてください
INSERT INTO employees (
  id,
  email,
  first_name,
  last_name,
  department,
  role
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,  -- ⚠️ ここを置き換え
  'admin@ghouse.jp',
  '秀樹',
  '西野',
  '営業',
  'executive'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  department = EXCLUDED.department,
  role = EXCLUDED.role;
```

3. **実行ボタンをクリック**
   - RUNボタンをクリックして実行
   - "Success. No rows returned" と表示されればOK

---

### ステップ3: 確認

1. **SQLで確認**

```sql
-- 管理者ユーザーが正しく作成されたか確認
SELECT
  id,
  email,
  last_name || ' ' || first_name as full_name,
  department,
  role,
  created_at
FROM employees
WHERE email = 'admin@ghouse.jp';
```

**期待される結果**:
```
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
email: admin@ghouse.jp
full_name: 西野 秀樹
department: 営業
role: executive
created_at: 2025-10-22 12:00:00
```

2. **アプリケーションでログインテスト**
   - G-progressアプリを開く
   - ログインページで以下を入力：
     - Email: admin@ghouse.jp
     - Password: Ghouse0648
   - 「ログイン」ボタンをクリック
   - ダッシュボードにリダイレクトされればOK ✅

---

## 🔧 トラブルシューティング

### エラー: "Invalid login credentials"

**原因**: Supabase Authでユーザーが作成されていない

**解決策**:
1. Supabase Dashboard → Authentication → Usersで確認
2. admin@ghouse.jp ユーザーが存在するか確認
3. 存在しない場合は、ステップ1から再実行

---

### エラー: "User not found in employees table"

**原因**: employeesテーブルにレコードが追加されていない

**解決策**:
1. SQL Editorで確認クエリを実行：
   ```sql
   SELECT * FROM employees WHERE email = 'admin@ghouse.jp';
   ```
2. レコードが存在しない場合は、ステップ2のINSERT文を再実行
3. User IDが正しいか確認（Supabase Authで作成したUser IDと一致するか）

---

### エラー: "duplicate key value violates unique constraint"

**原因**: すでに同じメールアドレスまたはIDが存在

**解決策**:
```sql
-- 既存のレコードを確認
SELECT * FROM employees WHERE email = 'admin@ghouse.jp';

-- 必要に応じて削除
DELETE FROM employees WHERE email = 'admin@ghouse.jp';

-- 再度INSERT文を実行
```

---

## 📊 権限設定

管理者ユーザー（role: 'executive'）は以下の権限を持ちます：

- ✅ 全プロジェクトの閲覧・編集
- ✅ 全タスクの閲覧・編集
- ✅ 全従業員の管理
- ✅ マスタデータの管理
- ✅ システム設定の変更
- ✅ 監査ログの閲覧

---

## 🔐 セキュリティ推奨事項

### 本番環境では必ず以下を実施してください：

1. **強力なパスワードに変更**
   - デフォルトパスワード（Ghouse0648）は開発用
   - 本番環境では12文字以上の複雑なパスワードに変更

2. **2要素認証を有効化**
   - Supabase Dashboard → Authentication → Policies
   - Multi-Factor Authentication (MFA) を有効化

3. **パスワード変更方法**
   ```sql
   -- Supabase Authのパスワード変更はDashboardから行います
   -- Authentication → Users → admin@ghouse.jp → "Reset Password"
   ```

---

## 📝 追加のシステム管理者を作成する場合

1. Supabase Authで新しいユーザーを作成
2. 以下のSQLを実行：

```sql
INSERT INTO employees (
  id,
  email,
  first_name,
  last_name,
  department,
  role
) VALUES (
  '[NEW_USER_ID]'::uuid,
  'newadmin@ghouse.jp',
  '太郎',
  '山田',
  '営業',
  'executive'  -- または 'manager'
);
```

---

## ✅ チェックリスト

- [ ] Supabase Authでadmin@ghouse.jpユーザーを作成
- [ ] User IDをコピー
- [ ] employeesテーブルにINSERT文を実行
- [ ] 確認クエリで存在を確認
- [ ] アプリケーションでログインテスト成功
- [ ] 本番環境の場合はパスワードを変更

---

**作成日**: 2025-10-22
**最終更新**: 2025-10-22
**バージョン**: 1.0
