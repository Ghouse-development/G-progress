-- ===================================
-- リアルタイム同時編集機能の追加
-- ===================================

-- オンラインユーザー追跡テーブル
CREATE TABLE IF NOT EXISTS online_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL, -- 現在閲覧中のページパス
  editing_resource_type TEXT, -- 'project', 'task', 'payment' など
  editing_resource_id UUID, -- 編集中のリソースID
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 編集ロックテーブル（楽観的ロック）
CREATE TABLE IF NOT EXISTS edit_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL, -- 'project', 'task', 'payment' など
  resource_id UUID NOT NULL,
  locked_by UUID REFERENCES employees(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes', -- 5分で自動解放
  UNIQUE(resource_type, resource_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_online_users_employee ON online_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_online_users_page ON online_users(page_path);
CREATE INDEX IF NOT EXISTS idx_edit_locks_resource ON edit_locks(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_edit_locks_expires ON edit_locks(expires_at);

-- RLS有効化
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_locks ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 同じ組織内のユーザーのみ閲覧可能
CREATE POLICY "Users can see their organization's online users" ON online_users
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE organization_id = (
        SELECT organization_id FROM employees WHERE id = auth.uid()::uuid
      )
    )
  );

CREATE POLICY "Users can see their organization's edit locks" ON edit_locks
  FOR ALL USING (
    locked_by IN (
      SELECT id FROM employees
      WHERE organization_id = (
        SELECT organization_id FROM employees WHERE id = auth.uid()::uuid
      )
    )
  );

-- 期限切れロックの自動削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM edit_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 5分ごとに期限切れロックを削除（pg_cron拡張が必要）
-- SELECT cron.schedule('cleanup-expired-locks', '*/5 * * * *', 'SELECT cleanup_expired_locks()');

-- プロジェクトテーブルにバージョン管理カラム追加（楽観的ロック用）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- バージョン更新トリガー関数
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- バージョン更新トリガー
DROP TRIGGER IF EXISTS projects_version_trigger ON projects;
CREATE TRIGGER projects_version_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS tasks_version_trigger ON tasks;
CREATE TRIGGER tasks_version_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS payments_version_trigger ON payments;
CREATE TRIGGER payments_version_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- リアルタイムパブリケーション有効化（Supabase Realtime用）
-- これらのテーブルの変更をリアルタイムでクライアントに通知
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE online_users;
ALTER PUBLICATION supabase_realtime ADD TABLE edit_locks;
