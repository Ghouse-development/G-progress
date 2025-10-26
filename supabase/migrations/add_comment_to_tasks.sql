-- タスクにコメント欄を追加

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS comment TEXT;

COMMENT ON COLUMN tasks.comment IS 'タスクに対するコメント（遅延理由、進捗状況など）';
