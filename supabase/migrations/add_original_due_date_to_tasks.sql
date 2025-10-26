-- タスクの当初予定日と変更履歴を管理するカラムを追加

-- 当初の予定日を保存
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS original_due_date DATE;

-- 日付変更回数を保存
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS date_change_count INTEGER DEFAULT 0;

-- 最終日付変更日時を保存
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS last_date_changed_at TIMESTAMP;

-- 既存のタスクについて、original_due_dateが未設定の場合は現在のdue_dateで初期化
UPDATE tasks
SET original_due_date = due_date::date
WHERE original_due_date IS NULL AND due_date IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN tasks.original_due_date IS '当初の予定日（最初に設定された期限日）';
COMMENT ON COLUMN tasks.date_change_count IS '期限日の変更回数';
COMMENT ON COLUMN tasks.last_date_changed_at IS '最終日付変更日時';
