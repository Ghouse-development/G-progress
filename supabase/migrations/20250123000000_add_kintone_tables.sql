-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- バックアップログテーブル
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL, -- success, partial, error
  total_records INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  duration_seconds INTEGER,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全ユーザーが読み書き可能）
CREATE POLICY "Allow all authenticated users to read system_settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to write system_settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read backup_logs"
  ON backup_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to write backup_logs"
  ON backup_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
