-- Add milestone date columns to projects table
-- Note: construction_start_date already exists in the schema
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS floor_plan_confirmed_date DATE,
ADD COLUMN IF NOT EXISTS final_specification_meeting_date DATE,
ADD COLUMN IF NOT EXISTS construction_permission_date DATE,
ADD COLUMN IF NOT EXISTS roof_raising_date DATE,
ADD COLUMN IF NOT EXISTS completion_inspection_date DATE,
ADD COLUMN IF NOT EXISTS handover_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN projects.floor_plan_confirmed_date IS '間取確定日';
COMMENT ON COLUMN projects.final_specification_meeting_date IS '最終仕様打合せ日';
COMMENT ON COLUMN projects.construction_permission_date IS '着工許可日';
COMMENT ON COLUMN projects.construction_start_date IS '着工日';
COMMENT ON COLUMN projects.roof_raising_date IS '上棟日';
COMMENT ON COLUMN projects.completion_inspection_date IS '完了検査日';
COMMENT ON COLUMN projects.handover_date IS '引き渡し日';
