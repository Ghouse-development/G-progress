-- employeesテーブルにauth_user_idカラムを追加
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- auth_user_idにインデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);

-- auth_user_idをユニークにする（1ユーザー1従業員レコード）
ALTER TABLE employees ADD CONSTRAINT unique_auth_user_id UNIQUE (auth_user_id);

-- RLSポリシーを更新：ユーザーは自分の従業員レコードのみ参照可能
DROP POLICY IF EXISTS "Users can view their own employee record" ON employees;
CREATE POLICY "Users can view their own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 管理者は全従業員レコードを参照・更新可能
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all employees" ON employees;
CREATE POLICY "Admins can update all employees"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- コメント
COMMENT ON COLUMN employees.auth_user_id IS 'Supabase Auth User ID（認証システムとの紐付け）';
