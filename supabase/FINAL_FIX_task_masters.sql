-- ========================================
-- タスクマスタテーブル完全修正SQL
-- 一度の実行ですべての問題を解決
-- ========================================

-- 既存のテーブルを削除して再作成（データは失われます！）
DROP TABLE IF EXISTS task_masters CASCADE;

-- タスクマスタテーブルを作成
CREATE TABLE task_masters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 基本情報
  business_no INTEGER NOT NULL DEFAULT 0,
  task_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,

  -- 分類
  phase TEXT NOT NULL DEFAULT '内定',
  task_category TEXT,
  importance TEXT,

  -- 詳細情報
  purpose TEXT,
  dos TEXT,
  donts TEXT,

  -- 作業詳細
  target TEXT,
  what TEXT,
  when_to_do TEXT,

  -- リソース
  responsible_department TEXT,
  tools TEXT,
  required_materials TEXT,
  storage_location TEXT,
  manual_url TEXT,
  notes TEXT,

  -- 工期計算用
  days_from_contract INTEGER DEFAULT 0,
  duration_days INTEGER,

  -- トリガー機能
  is_trigger_task BOOLEAN DEFAULT FALSE,
  trigger_task_id UUID REFERENCES task_masters(id) ON DELETE SET NULL,
  days_from_trigger INTEGER DEFAULT 0,

  -- 関連タスク
  related_task_master_ids TEXT[],

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_task_masters_business_no ON task_masters(business_no);
CREATE INDEX idx_task_masters_phase ON task_masters(phase);
CREATE INDEX idx_task_masters_responsible ON task_masters(responsible_department);
CREATE INDEX idx_task_masters_is_trigger ON task_masters(is_trigger_task) WHERE is_trigger_task = TRUE;
CREATE INDEX idx_task_masters_trigger_task_id ON task_masters(trigger_task_id);

-- 更新日時自動更新のトリガー
CREATE OR REPLACE FUNCTION update_task_masters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_masters_updated_at_trigger
  BEFORE UPDATE ON task_masters
  FOR EACH ROW
  EXECUTE FUNCTION update_task_masters_updated_at();

-- コメント追加
COMMENT ON TABLE task_masters IS 'タスクマスタ - 業務フローのテンプレート';
COMMENT ON COLUMN task_masters.dos IS 'Do''s（推奨事項）';
COMMENT ON COLUMN task_masters.donts IS 'Don''ts（禁止事項）';
COMMENT ON COLUMN task_masters.is_trigger_task IS 'トリガータスクの有無';
COMMENT ON COLUMN task_masters.trigger_task_id IS 'トリガータスクID';
COMMENT ON COLUMN task_masters.days_from_trigger IS 'トリガーからの日数';
