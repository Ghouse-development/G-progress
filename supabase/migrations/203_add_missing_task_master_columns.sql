-- タスクマスタに不足しているカラムを追加
-- 2025-10-23

ALTER TABLE task_masters
ADD COLUMN IF NOT EXISTS dos TEXT,
ADD COLUMN IF NOT EXISTS donts TEXT,
ADD COLUMN IF NOT EXISTS task_category TEXT,
ADD COLUMN IF NOT EXISTS importance TEXT,
ADD COLUMN IF NOT EXISTS target TEXT,
ADD COLUMN IF NOT EXISTS what TEXT,
ADD COLUMN IF NOT EXISTS when_to_do TEXT,
ADD COLUMN IF NOT EXISTS tools TEXT,
ADD COLUMN IF NOT EXISTS required_materials TEXT,
ADD COLUMN IF NOT EXISTS storage_location TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS related_task_master_ids TEXT[];

-- コメント追加
COMMENT ON COLUMN task_masters.dos IS 'Do'\''s（推奨事項）';
COMMENT ON COLUMN task_masters.donts IS 'Don'\''ts（禁止事項）';
COMMENT ON COLUMN task_masters.task_category IS 'タスクカテゴリ（C/K/S/J）';
COMMENT ON COLUMN task_masters.importance IS '重要度（A/B/S）';
COMMENT ON COLUMN task_masters.target IS '対象';
COMMENT ON COLUMN task_masters.what IS '何を';
COMMENT ON COLUMN task_masters.when_to_do IS 'いつやるか';
COMMENT ON COLUMN task_masters.tools IS '使用ツール';
COMMENT ON COLUMN task_masters.required_materials IS '必要資料';
COMMENT ON COLUMN task_masters.storage_location IS '保管場所';
COMMENT ON COLUMN task_masters.notes IS '備考';
COMMENT ON COLUMN task_masters.duration_days IS '作業期間（日数）';
COMMENT ON COLUMN task_masters.related_task_master_ids IS '関連タスクマスタのID配列';
