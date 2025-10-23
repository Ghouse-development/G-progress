-- tasksテーブルにtask_master_idカラムを追加
-- 2025-10-23: task_mastersテーブルとのリレーション構築

-- task_master_idカラムを追加（外部キー制約付き）
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS task_master_id UUID REFERENCES task_masters(id) ON DELETE SET NULL;

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_tasks_task_master_id ON tasks(task_master_id);

-- コメント追加
COMMENT ON COLUMN tasks.task_master_id IS 'タスクマスタとの紐付け（このタスクの元となったタスクマスタのID）';
