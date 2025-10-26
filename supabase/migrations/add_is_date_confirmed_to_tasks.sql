-- tasksテーブルにis_date_confirmedフィールドを追加
-- 日付が確定しているかどうかを示すフラグ（予定 or 確定）

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_date_confirmed BOOLEAN DEFAULT FALSE;

-- 既存のタスクは全て「予定」として扱う
UPDATE tasks
SET is_date_confirmed = FALSE
WHERE is_date_confirmed IS NULL;

-- コメント追加
COMMENT ON COLUMN tasks.is_date_confirmed IS '日付確定フラグ（FALSE: 予定、TRUE: 確定）';
