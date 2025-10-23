-- system_settingsとbackup_logsテーブルを作成
-- 2025-10-23: kintone連携機能のため

-- system_settingsテーブル
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read system_settings" ON system_settings;
CREATE POLICY "Allow all authenticated users to read system_settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to update system_settings" ON system_settings;
CREATE POLICY "Allow all authenticated users to update system_settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (true);

-- backup_logsテーブル
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  total_records INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  duration_seconds INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at DESC);

ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read backup_logs" ON backup_logs;
CREATE POLICY "Allow all authenticated users to read backup_logs"
  ON backup_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow all authenticated users to insert backup_logs" ON backup_logs;
CREATE POLICY "Allow all authenticated users to insert backup_logs"
  ON backup_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- updated_at自動更新トリガー
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
