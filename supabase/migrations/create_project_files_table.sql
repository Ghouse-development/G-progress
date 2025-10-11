-- プロジェクト/タスク関連ファイルテーブルの作成
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- プロジェクトまたはタスクのいずれかに紐づく必要がある
  CONSTRAINT project_or_task_required CHECK (
    (project_id IS NOT NULL AND task_id IS NULL) OR
    (project_id IS NULL AND task_id IS NOT NULL)
  )
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_task_id ON project_files(task_id);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON project_files(created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーに読み取り権限を付与
CREATE POLICY "Allow all to read project_files"
  ON project_files
  FOR SELECT
  USING (true);

-- すべてのユーザーに挿入権限を付与
CREATE POLICY "Allow all to insert project_files"
  ON project_files
  FOR INSERT
  WITH CHECK (true);

-- すべてのユーザーに削除権限を付与
CREATE POLICY "Allow all to delete project_files"
  ON project_files
  FOR DELETE
  USING (true);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_files_updated_at_trigger
  BEFORE UPDATE ON project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_project_files_updated_at();

-- Supabase Storageバケット作成用のコメント
-- Supabaseダッシュボード > Storage > Create Bucket で以下を作成:
-- - Bucket name: project-files
-- - Public bucket: true (公開URLでアクセス可能にする)
-- - File size limit: 10MB
-- - Allowed MIME types: image/*, application/pdf, application/msword, application/vnd.*, application/zip, application/x-rar-compressed
