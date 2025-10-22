# SQL エラー解決ガイド

G-progressのSQL実行時によくあるエラーと解決方法

---

## ❌ エラー: "relation already exists"

### エラーメッセージ
```
ERROR: 42P07: relation "employees" already exists
ERROR: 42P07: relation "projects" already exists
```

### 原因
テーブルが既に存在する状態で再度 `CREATE TABLE` を実行しようとしています。

### 解決方法

#### 方法1: schema.sqlを使用（推奨）

`schema.sql` は既に `DROP TABLE IF EXISTS` を含んでいるため、そのまま実行すれば既存テーブルを削除してから再作成します。

```sql
-- schema.sqlの先頭に以下が含まれています
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
```

**実行手順**:
1. Supabase Dashboard → SQL Editor
2. `supabase/schema.sql` の内容を全てコピー
3. 貼り付けて実行
4. 成功 ✅

#### 方法2: 手動で削除してから実行

個別のマイグレーションファイルでエラーが出る場合：

```sql
-- 該当するテーブルを削除
DROP TABLE IF EXISTS [テーブル名] CASCADE;

-- その後、マイグレーションファイルを実行
```

**例**:
```sql
-- employeesテーブルのエラーの場合
DROP TABLE IF EXISTS employees CASCADE;

-- その後、該当するマイグレーションを実行
```

---

## ❌ エラー: "foreign key constraint"

### エラーメッセージ
```
ERROR: 42830: insert or update on table "projects" violates foreign key constraint
DETAIL: Key (customer_id)=(xxx) is not present in table "customers"
```

### 原因
外部キー制約違反。参照先のレコードが存在しません。

### 解決方法

#### ステップ1: 参照先テーブルを確認
```sql
-- customersテーブルにレコードが存在するか確認
SELECT * FROM customers WHERE id = 'xxx';
```

#### ステップ2: 参照先レコードを作成
```sql
-- 存在しない場合は作成
INSERT INTO customers (id, names, building_site)
VALUES ('xxx', ARRAY['顧客名'], '東京都〇〇区');
```

#### ステップ3: 元のINSERTを再実行
```sql
-- これで成功するはず
INSERT INTO projects (...) VALUES (...);
```

---

## ❌ エラー: "permission denied"

### エラーメッセージ
```
ERROR: 42501: permission denied for table employees
```

### 原因
RLS (Row Level Security) が有効で、ポリシーが正しく設定されていません。

### 解決方法

#### 方法1: authenticated ユーザーとして実行

Supabase SQL Editorは通常 `postgres` ユーザーとして実行されるため、RLSの影響を受けません。
もしエラーが出る場合は、RLSポリシーを確認してください。

```sql
-- RLSが有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'employees';

-- ポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'employees';
```

#### 方法2: RLSを一時的に無効化（開発環境のみ）

**⚠️ 本番環境では絶対に実行しないでください**

```sql
-- RLSを無効化（開発環境のみ）
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- データ投入

-- RLSを再度有効化
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
```

---

## ❌ エラー: "duplicate key value violates unique constraint"

### エラーメッセージ
```
ERROR: 23505: duplicate key value violates unique constraint "employees_email_key"
DETAIL: Key (email)=(admin@ghouse.jp) already exists
```

### 原因
UNIQUE制約違反。同じ値が既に存在します。

### 解決方法

#### 方法1: ON CONFLICT を使用（推奨）

```sql
-- 既存レコードがあれば更新、なければ挿入
INSERT INTO employees (id, email, first_name, last_name, department, role)
VALUES ('xxx', 'admin@ghouse.jp', '秀樹', '西野', '営業', 'executive')
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  department = EXCLUDED.department,
  role = EXCLUDED.role;
```

#### 方法2: 既存レコードを削除してから挿入

```sql
-- 既存レコードを削除
DELETE FROM employees WHERE email = 'admin@ghouse.jp';

-- 再度挿入
INSERT INTO employees (...) VALUES (...);
```

---

## ❌ エラー: "column does not exist"

### エラーメッセージ
```
ERROR: 42703: column "auth_user_id" does not exist
```

### 原因
カラムが存在しません。マイグレーションが実行されていない可能性があります。

### 解決方法

#### ステップ1: マイグレーションの実行順序を確認

`docs/SQL_EXECUTION_CHECKLIST.md` を参照して、すべてのマイグレーションが順番通りに実行されているか確認してください。

#### ステップ2: 不足しているマイグレーションを実行

```sql
-- 例: auth_user_idカラムを追加
-- migrations/002_add_auth_user_id.sql を実行
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
```

---

## ❌ エラー: "syntax error at or near"

### エラーメッセージ
```
ERROR: 42601: syntax error at or near ")"
LINE 5: );
```

### 原因
SQL構文エラー。タイポやカンマの欠落など。

### 解決方法

#### ステップ1: SQLを確認

エラーが出た行の前後を確認してください：
- カンマ忘れ
- 括弧の不一致
- キーワードのタイポ

#### ステップ2: シンプルなクエリで試す

```sql
-- まず基本的なクエリで確認
SELECT * FROM employees LIMIT 1;

-- 動作したら、段階的に複雑なクエリに変更
```

---

## 🔍 一般的なトラブルシューティング

### データベースの状態を確認

```sql
-- 全テーブルを表示
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- テーブルの構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

-- インデックスを確認
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'employees';

-- RLSポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'employees';
```

### データベースをリセット（最終手段）

**⚠️ 警告: すべてのデータが削除されます**

```sql
-- すべてのテーブルを削除（CASCADE で依存関係も削除）
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- その後、schema.sqlから再実行
```

---

## 📞 サポート

上記で解決しない場合：

1. エラーメッセージ全文をコピー
2. 実行したSQLをコピー
3. Supabase Logsを確認（Dashboard → Logs）
4. 開発者に連絡

---

**関連ドキュメント**:
- SQL実行チェックリスト: `docs/SQL_EXECUTION_CHECKLIST.md`
- 管理者ユーザー設定: `docs/ADMIN_USER_SETUP.md`
- デプロイ手順: `DEPLOYMENT.md`

---

**最終更新**: 2025-10-22
**バージョン**: 1.0
