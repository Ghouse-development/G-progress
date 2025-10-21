-- タスクマスタの件数確認
SELECT COUNT(*) as task_master_count FROM task_masters;

-- 最初の5件を確認
SELECT id, title, phase, responsible_department, days_from_contract
FROM task_masters
ORDER BY task_order
LIMIT 5;

-- RLSポリシー確認
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'task_masters';
