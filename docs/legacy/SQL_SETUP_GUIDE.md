# G-progress データベースセットアップガイド

## 概要

このガイドでは、G-progressの新機能（マルチテナント、権限管理、リアルタイム同時編集）を有効にするために必要なデータベースマイグレーションの実行手順を説明します。

## 前提条件

- Supabaseプロジェクトへのアクセス権限
- Supabase SQLエディタへのアクセス
- 管理者権限

## ⚠️ 重要な注意事項

1. **本番環境での実行前に、必ずバックアップを取得してください**
2. **マイグレーションは順番に実行する必要があります**（001 → 002 → 003）
3. **既存データがある場合、自動的にデフォルト組織に割り当てられます**
4. **実行前にSupabase Dashboard > SQL Editorで構文エラーがないか確認してください**

---

## マイグレーション実行手順

### ステップ1: Supabase Dashboardにアクセス

1. ブラウザで以下のURLを開く：
   ```
   https://app.supabase.com/project/qxftwxkpeqvlukjybnfp
   ```

2. 左サイドバーから「SQL Editor」をクリック

### ステップ2: マイグレーションファイルの実行

以下の順番で、各SQLファイルの内容をSQL Editorにコピー&ペーストして実行してください。

---

## マイグレーション1: マルチテナント機能

### ファイル
`supabase/migrations/001_add_multitenancy.sql`

### 内容
- **organizationsテーブルの作成**: 本社とフランチャイズを管理
- **organization_id列の追加**: 既存の全テーブルに組織IDを追加
- **RLS（Row Level Security）の有効化**: データ分離の実装
- **デフォルト組織の作成**: 既存データ用の本社組織

### 実行方法

1. `supabase/migrations/001_add_multitenancy.sql` ファイルを開く
2. 全ての内容をコピー
3. Supabase SQL Editorに貼り付け
4. 「Run」ボタンをクリック
5. エラーがないことを確認

### 期待される結果

```
Success. No rows returned
```

または

```
INSERT 0 1  (デフォルト組織の作成)
```

### 作成されるテーブル
- `organizations` (組織マスタ)

### 追加される列
- `employees.organization_id`
- `vendors.organization_id`
- `customers.organization_id`
- `projects.organization_id`
- `payments.organization_id`
- `tasks.organization_id`
- `notifications.organization_id`
- `audit_logs.organization_id`

### 作成されるインデックス
- `idx_employees_org`
- `idx_vendors_org`
- `idx_customers_org`
- `idx_projects_org`
- `idx_payments_org`
- `idx_tasks_org`
- `idx_notifications_org`
- `idx_audit_logs_org`

---

## マイグレーション2: 権限管理機能

### ファイル
`supabase/migrations/002_add_permissions.sql`

### 内容
- **permissionsテーブルの作成**: 権限の定義
- **role_permissionsテーブルの作成**: ロールと権限の紐付け
- **has_permission関数の作成**: 権限チェック用関数
- **デフォルト権限の作成**: 15個の基本権限
- **ロール別権限の割り当て**: 7つのロール用の権限設定

### 実行方法

1. `supabase/migrations/002_add_permissions.sql` ファイルを開く
2. 全ての内容をコピー
3. Supabase SQL Editorに貼り付け
4. 「Run」ボタンをクリック
5. エラーがないことを確認

### 期待される結果

```
INSERT 0 15  (権限の作成)
INSERT 0 XX  (ロール別権限の作成)
```

### 作成されるテーブル
- `permissions` (権限マスタ)
- `role_permissions` (ロール別権限)

### 作成される関数
- `has_permission(user_id UUID, permission_name TEXT)` - 権限チェック関数

### 作成される権限

#### プロジェクト関連
- `read_projects` - 案件の閲覧
- `write_projects` - 案件の作成・編集
- `delete_projects` - 案件の削除

#### 入金関連
- `read_payments` - 入金情報の閲覧
- `write_payments` - 入金情報の作成・編集
- `delete_payments` - 入金情報の削除

#### 従業員関連
- `read_employees` - 従業員情報の閲覧
- `write_employees` - 従業員情報の作成・編集
- `delete_employees` - 従業員情報の削除

#### マスタ関連
- `read_masters` - マスタデータの閲覧
- `write_masters` - マスタデータの作成・編集
- `delete_masters` - マスタデータの削除

#### システム関連
- `read_system` - システム設定の閲覧
- `write_system` - システム設定の変更
- `delete_system` - システム設定の削除

### ロール別権限

| ロール | 権限 |
|--------|------|
| **president（社長）** | 全権限 |
| **executive（役員）** | 全権限 |
| **department_head（部門長）** | read/write（全カテゴリ）、delete（project, payment） |
| **leader（リーダー）** | read（全カテゴリ）、write（project, payment） |
| **member（メンバー）** | read（全カテゴリ）、write_projects |
| **franchise_user（フランチャイズユーザー）** | read（project, payment）、write（project, payment） |
| **franchise_admin（フランチャイズ管理者）** | read（全カテゴリ）、write（project, payment, employee） |

---

## マイグレーション3: リアルタイム同時編集機能

### ファイル
`supabase/migrations/003_add_realtime.sql`

### 内容
- **online_usersテーブルの作成**: オンラインユーザーの追跡
- **edit_locksテーブルの作成**: 編集ロックの管理
- **versionカラムの追加**: 楽観的ロックのためのバージョン管理
- **Realtimeパブリケーションの有効化**: リアルタイム更新の有効化
- **RLSポリシーの設定**: データアクセス制御

### 実行方法

1. `supabase/migrations/003_add_realtime.sql` ファイルを開く
2. 全ての内容をコピー
3. Supabase SQL Editorに貼り付け
4. 「Run」ボタンをクリック
5. エラーがないことを確認

### 期待される結果

```
Success. No rows returned
```

### 作成されるテーブル
- `online_users` (オンラインユーザー)
- `edit_locks` (編集ロック)

### 追加される列
- `projects.version`
- `tasks.version`

### 作成されるトリガー
- `increment_version` - バージョン番号の自動インクリメント
- `projects_version_trigger`
- `tasks_version_trigger`

### Realtime有効化
以下のテーブルでリアルタイム更新が有効化されます：
- `projects`
- `tasks`
- `online_users`
- `edit_locks`

---

## トラブルシューティング

### エラー1: 外部キー制約エラー

**エラーメッセージ例**:
```
ERROR: relation "organizations" does not exist
```

**原因**: マイグレーションの実行順序が間違っている

**解決方法**:
1. 必ず001 → 002 → 003の順に実行してください
2. 既に実行済みのマイグレーションは再実行しないでください

### エラー2: カラム既存エラー

**エラーメッセージ例**:
```
ERROR: column "organization_id" of relation "employees" already exists
```

**原因**: 既にマイグレーションが実行されている

**解決方法**:
このエラーは無視して次のマイグレーションに進んでください

### エラー3: RLSポリシーエラー

**エラーメッセージ例**:
```
ERROR: policy "..." for table "..." already exists
```

**原因**: RLSポリシーが既に存在する

**解決方法**:
このエラーは無視して次のマイグレーションに進んでください

---

## 検証手順

マイグレーション実行後、以下の手順で正しく適用されたか確認してください。

### 1. テーブルの存在確認

SQL Editorで以下を実行：

```sql
-- 新しいテーブルが作成されているか確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations',
    'permissions',
    'role_permissions',
    'online_users',
    'edit_locks'
  );
```

**期待される結果**: 5行返される

### 2. organization_id列の確認

```sql
-- 既存テーブルにorganization_id列が追加されているか確認
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
ORDER BY table_name;
```

**期待される結果**: 8行以上返される（employees, projects, tasks など）

### 3. デフォルト組織の確認

```sql
-- デフォルト組織が作成されているか確認
SELECT id, name, org_type, org_status
FROM organizations
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**期待される結果**: 「株式会社Gハウス本社」が1行返される

### 4. 権限の確認

```sql
-- 権限が作成されているか確認
SELECT COUNT(*) as permission_count FROM permissions;
```

**期待される結果**: 15

### 5. ロール別権限の確認

```sql
-- ロール別権限が作成されているか確認
SELECT role, COUNT(*) as permission_count
FROM role_permissions
GROUP BY role
ORDER BY role;
```

**期待される結果**: 7つのロールが表示される

### 6. Realtimeの確認

```sql
-- Realtimeパブリケーションが有効か確認
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('projects', 'tasks', 'online_users', 'edit_locks');
```

**期待される結果**: 4行返される

---

## ロールバック手順（万が一の場合）

⚠️ **警告**: ロールバックすると作成されたデータも削除されます。本番環境では慎重に実行してください。

### マイグレーション3のロールバック

```sql
-- Realtimeパブリケーションから削除
ALTER PUBLICATION supabase_realtime DROP TABLE projects;
ALTER PUBLICATION supabase_realtime DROP TABLE tasks;
ALTER PUBLICATION supabase_realtime DROP TABLE online_users;
ALTER PUBLICATION supabase_realtime DROP TABLE edit_locks;

-- トリガーの削除
DROP TRIGGER IF EXISTS projects_version_trigger ON projects;
DROP TRIGGER IF EXISTS tasks_version_trigger ON tasks;
DROP FUNCTION IF EXISTS increment_version();

-- バージョン列の削除
ALTER TABLE projects DROP COLUMN IF EXISTS version;
ALTER TABLE tasks DROP COLUMN IF EXISTS version;

-- テーブルの削除
DROP TABLE IF EXISTS edit_locks CASCADE;
DROP TABLE IF EXISTS online_users CASCADE;
```

### マイグレーション2のロールバック

```sql
-- 関数の削除
DROP FUNCTION IF EXISTS has_permission(UUID, TEXT);

-- テーブルの削除
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
```

### マイグレーション1のロールバック

```sql
-- RLSポリシーの削除
DROP POLICY IF EXISTS "Users can only access their organization's data" ON employees;
DROP POLICY IF EXISTS "Users can only access their organization's vendors" ON vendors;
DROP POLICY IF EXISTS "Users can only access their organization's customers" ON customers;
DROP POLICY IF EXISTS "Users can only access their organization's projects" ON projects;
DROP POLICY IF EXISTS "Users can only access their organization's payments" ON payments;
DROP POLICY IF EXISTS "Users can only access their organization's tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only access their organization's notifications" ON notifications;
DROP POLICY IF EXISTS "Users can only access their organization's audit logs" ON audit_logs;

-- RLSの無効化
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- インデックスの削除
DROP INDEX IF EXISTS idx_employees_org;
DROP INDEX IF EXISTS idx_vendors_org;
DROP INDEX IF EXISTS idx_customers_org;
DROP INDEX IF EXISTS idx_projects_org;
DROP INDEX IF EXISTS idx_payments_org;
DROP INDEX IF EXISTS idx_tasks_org;
DROP INDEX IF EXISTS idx_notifications_org;
DROP INDEX IF EXISTS idx_audit_logs_org;

-- organization_id列の削除
ALTER TABLE employees DROP COLUMN IF EXISTS organization_id;
ALTER TABLE vendors DROP COLUMN IF EXISTS organization_id;
ALTER TABLE customers DROP COLUMN IF EXISTS organization_id;
ALTER TABLE projects DROP COLUMN IF EXISTS organization_id;
ALTER TABLE payments DROP COLUMN IF EXISTS organization_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS organization_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS organization_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS organization_id;

-- organizationsテーブルの削除
DROP TABLE IF EXISTS organizations CASCADE;
```

---

## まとめ

これらのマイグレーションを正しく実行すると、以下の機能が利用可能になります：

✅ **マルチテナント機能**
- 組織管理画面で本社・フランチャイズを管理
- データは組織ごとに完全に分離
- RLSによる自動フィルタリング

✅ **権限管理機能**
- ロール別の詳細な権限設定
- 7つのロールと15の権限
- `has_permission()`関数で権限チェック

✅ **リアルタイム同時編集機能**
- タスク編集時の衝突防止
- 編集ロック（5分自動解除）
- オンラインユーザーの表示
- リアルタイム更新通知

---

## サポート

問題が発生した場合は、以下の情報を添えてお問い合わせください：

1. 実行したマイグレーションファイル名
2. エラーメッセージの全文
3. Supabaseプロジェクトのバージョン
4. 実行した手順

---

**最終更新日**: 2025年10月22日
