-- タスクテーブルにactual_completion_date列を追加

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS actual_completion_date DATE;

-- 列にコメントを追加
COMMENT ON COLUMN tasks.actual_completion_date IS '実際の完了日';
