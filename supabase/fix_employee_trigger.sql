-- ==========================================
-- employeesテーブルのトリガーエラー修正
-- ==========================================
-- 問題: update_updated_at_column()関数がNEW.versionを更新しようとするが、
--       employeesテーブルにはversionフィールドがない
-- 解決: テーブルごとに適切なトリガー関数を使用する
-- ==========================================

-- 1. employeesテーブル用の単純なupdated_at更新関数を作成
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. tasks/projectsテーブル用のバージョン管理付き関数（既存の関数を上書き）
CREATE OR REPLACE FUNCTION update_with_version()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   -- versionフィールドが存在する場合のみインクリメント
   IF TG_TABLE_NAME IN ('tasks', 'projects') THEN
     NEW.version = COALESCE(OLD.version, 0) + 1;
   END IF;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. vendorsテーブル用の単純な関数
CREATE OR REPLACE FUNCTION update_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. customersテーブル用の単純な関数
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. paymentsテーブル用の単純な関数
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. 既存のトリガーを削除して再作成

-- employeesテーブル
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at();

-- vendorsテーブル
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_vendors_updated_at();

-- customersテーブル
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

-- paymentsテーブル
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at();

-- tasksテーブル（バージョン管理付き）
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_with_version();

-- projectsテーブル（バージョン管理付き）
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_with_version();

-- 7. 確認
SELECT
  t.trigger_name,
  t.event_object_table AS table_name,
  p.proname AS function_name
FROM information_schema.triggers t
JOIN pg_proc p ON p.oid = (
  SELECT tgfoid
  FROM pg_trigger
  WHERE tgname = t.trigger_name
)
WHERE t.trigger_schema = 'public'
  AND t.trigger_name LIKE '%updated_at%'
ORDER BY t.event_object_table;
