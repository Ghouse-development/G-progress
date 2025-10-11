-- タスクマスタテーブルを作成（業務フローのテンプレート）
CREATE TABLE IF NOT EXISTS task_masters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 基本情報
  business_no INTEGER NOT NULL, -- 業務No（1〜56）
  task_order INTEGER NOT NULL, -- 作業順序
  title TEXT NOT NULL, -- タスク名
  description TEXT, -- 説明

  -- 分類
  phase TEXT NOT NULL, -- フェーズ（集客、営業、契約、設計、工事、管理など）
  task_category TEXT, -- C（契約）/K（工程）/S（資金）/J（情報）
  importance TEXT, -- A/B/S

  -- 詳細情報
  purpose TEXT, -- 目的
  dos TEXT, -- Dos（意識してやるべきこと）
  donts TEXT, -- Don'ts（やってはならないこと）

  -- 作業詳細
  target TEXT, -- 誰に
  what TEXT, -- 何を
  when_to_do TEXT, -- いつまでに（期限・頻度）

  -- リソース
  responsible_department TEXT, -- 担当部門
  tools TEXT, -- 使用するツール
  required_materials TEXT, -- 必要資料・物
  storage_location TEXT, -- 資料保存場所
  manual_url TEXT, -- マニュアル・ガイドブックURL
  notes TEXT, -- 備考

  -- 工期計算用
  days_from_contract INTEGER, -- 契約日からの日数（null = 手動設定）
  duration_days INTEGER, -- 作業期間（日数）

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_task_masters_business_no ON task_masters(business_no);
CREATE INDEX idx_task_masters_phase ON task_masters(phase);
CREATE INDEX idx_task_masters_responsible ON task_masters(responsible_department);

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

COMMENT ON TABLE task_masters IS 'タスクマスタ - 業務フローのテンプレート';
