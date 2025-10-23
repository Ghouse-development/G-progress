-- タスクマスタに「進捗管理表に掲載するか」フィールドを追加
-- 2025-10-23

ALTER TABLE task_masters
ADD COLUMN IF NOT EXISTS show_in_progress BOOLEAN DEFAULT TRUE;

-- コメント追加
COMMENT ON COLUMN task_masters.show_in_progress IS '進捗管理表に掲載するか（TRUE: 掲載する、FALSE: 掲載しない）';

-- インデックス作成（進捗管理表用のフィルタリングに使用）
CREATE INDEX IF NOT EXISTS idx_task_masters_show_in_progress
ON task_masters(show_in_progress)
WHERE show_in_progress = TRUE;
