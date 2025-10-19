-- ==========================================
-- 権限管理と同時編集対応のためのスキーマ更新
-- ==========================================

-- 1. employeesテーブルにroleカラムを追加
-- ==========================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member'
CHECK (role IN ('department_head', 'leader', 'member'));

-- 既存の従業員にデフォルト値を設定
UPDATE employees SET role = 'member' WHERE role IS NULL;

-- 西野様を部門長に設定（例）
-- ※ 実際の西野様のメールアドレスに合わせて変更してください
UPDATE employees
SET role = 'department_head'
WHERE email LIKE '%nishino%' OR name LIKE '%西野%';

COMMENT ON COLUMN employees.role IS '従業員の役割: department_head(部門長), leader(リーダー), member(メンバー)';


-- 2. tasksテーブルに同時編集対応カラムを追加
-- ==========================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 既存のタスクにデフォルト値を設定
UPDATE tasks SET version = 1 WHERE version IS NULL;
UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL;

COMMENT ON COLUMN tasks.version IS 'バージョン番号（同時編集の競合検出用）';
COMMENT ON COLUMN tasks.updated_at IS '最終更新日時';


-- 3. 更新時に自動でupdated_atを更新するトリガー
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   NEW.version = OLD.version + 1;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 既存のトリガーを削除して再作成
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- 4. projectsテーブルにも同様のカラムを追加
-- ==========================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE projects SET version = 1 WHERE version IS NULL;
UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- 5. 確認用のクエリ
-- ==========================================

-- 従業員のrole一覧を確認
SELECT id, name, department, role
FROM employees
ORDER BY role DESC, department;

-- tasksテーブルの新しいカラムを確認
SELECT id, title, version, updated_at, created_at
FROM tasks
LIMIT 5;
