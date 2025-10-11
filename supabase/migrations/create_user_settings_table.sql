-- ユーザー設定テーブルの作成
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,

  -- テーマ設定
  theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),

  -- 通知設定
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  mention_notifications BOOLEAN DEFAULT TRUE,
  task_reminders BOOLEAN DEFAULT TRUE,

  -- 表示設定
  items_per_page INTEGER DEFAULT 50 CHECK (items_per_page BETWEEN 10 AND 200),
  default_view VARCHAR(20) DEFAULT 'grid' CHECK (default_view IN ('grid', 'list', 'calendar')),
  sidebar_collapsed BOOLEAN DEFAULT FALSE,

  -- 言語・地域
  language VARCHAR(10) DEFAULT 'ja',
  timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',

  -- カスタマイズ
  dashboard_widgets JSONB DEFAULT '[]'::jsonb,
  quick_links JSONB DEFAULT '[]'::jsonb,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- RLSポリシー
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の設定のみ閲覧・更新可能
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE user_settings IS 'ユーザーごとのカスタマイズ設定';
COMMENT ON COLUMN user_settings.dashboard_widgets IS 'ダッシュボードウィジェット設定 (JSON配列)';
COMMENT ON COLUMN user_settings.quick_links IS 'クイックリンク設定 (JSON配列)';
