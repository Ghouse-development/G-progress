-- ==========================================
-- タスクマスタ表示問題の修正
-- ==========================================
-- 実行方法: Supabase Dashboard > SQL Editor で実行
-- ==========================================

-- STEP 1: 現状確認
SELECT '=== タスクマスタ件数確認 ===' AS info;
SELECT COUNT(*) as task_master_count FROM task_masters;

SELECT '=== 最初の3件 ===' AS info;
SELECT id, title, phase, responsible_department, days_from_contract
FROM task_masters
ORDER BY task_order
LIMIT 3;

-- STEP 2: RLS状態確認
SELECT '=== RLS設定状態 ===' AS info;
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'task_masters';

-- STEP 3: RLSポリシー確認
SELECT '=== 現在のRLSポリシー ===' AS info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'task_masters';

-- STEP 4: RLSポリシーを修正（全ユーザーがアクセス可能に）
-- 既存ポリシーを削除
DROP POLICY IF EXISTS "全従業員がタスクマスタを閲覧可能" ON task_masters;
DROP POLICY IF EXISTS "管理者のみがタスクマスタを編集可能" ON task_masters;
DROP POLICY IF EXISTS "Allow all authenticated users to read task_masters" ON task_masters;

-- 新しいポリシーを作成
CREATE POLICY "Allow all to read task_masters"
  ON task_masters
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert task_masters"
  ON task_masters
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update task_masters"
  ON task_masters
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow all to delete task_masters"
  ON task_masters
  FOR DELETE
  USING (true);

-- STEP 5: RLSを有効化
ALTER TABLE task_masters ENABLE ROW LEVEL SECURITY;

-- STEP 6: 確認
SELECT '=== 修正後のポリシー ===' AS info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'task_masters';

SELECT '=== データ確認 ===' AS info;
SELECT COUNT(*) as final_count FROM task_masters;
