-- タスクマスタに関連タスク機能を追加

-- 1. task_mastersテーブルに関連タスクマスタIDの配列を追加
ALTER TABLE task_masters
ADD COLUMN IF NOT EXISTS related_task_master_ids UUID[] DEFAULT '{}';

-- 2. インデックス作成（GINインデックスで配列検索を高速化）
CREATE INDEX IF NOT EXISTS idx_task_masters_related_tasks
ON task_masters USING GIN (related_task_master_ids);

-- 3. コメント追加
COMMENT ON COLUMN task_masters.related_task_master_ids IS '関連タスクマスタのID配列（前後の関連タスク）';
