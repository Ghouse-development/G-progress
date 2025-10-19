-- ========================================
-- サイドバー設計に伴うデータベーススキーマ拡張
-- 実装日: 2025-10-19
-- ========================================

-- ----------------------------------------
-- 1. 拠点マスタテーブル作成
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE branches IS '拠点マスタ';
COMMENT ON COLUMN branches.name IS '拠点名';

-- ----------------------------------------
-- 2. 年度マスタテーブル作成
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year VARCHAR(10) NOT NULL UNIQUE, -- 例: "2025"
  start_date DATE NOT NULL, -- 例: 2025-08-01
  end_date DATE NOT NULL, -- 例: 2026-07-31
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE fiscal_years IS '年度マスタ（8月～翌7月）';
COMMENT ON COLUMN fiscal_years.year IS '年度（例: 2025）';
COMMENT ON COLUMN fiscal_years.start_date IS '年度開始日（8月1日）';
COMMENT ON COLUMN fiscal_years.end_date IS '年度終了日（翌7月31日）';

-- ----------------------------------------
-- 3. employeesテーブル拡張
-- ----------------------------------------
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

COMMENT ON COLUMN employees.branch_id IS '所属拠点ID';

-- ----------------------------------------
-- 4. projectsテーブル拡張
-- ----------------------------------------
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS expected_completion_date DATE,
ADD COLUMN IF NOT EXISTS exclude_from_count BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS solar_panel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS solar_kw DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS battery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ua_value DECIMAL(10, 3),
ADD COLUMN IF NOT EXISTS c_value DECIMAL(10, 3),
ADD COLUMN IF NOT EXISTS total_floor_area DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS gross_profit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS fiscal_year VARCHAR(10),
ADD COLUMN IF NOT EXISTS product_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS contract_amount DECIMAL(15, 2);

COMMENT ON COLUMN projects.exclude_from_count IS '完工予定数カウントから除外するフラグ';
COMMENT ON COLUMN projects.solar_panel IS '太陽光パネル有無';
COMMENT ON COLUMN projects.solar_kw IS '太陽光パネルkW数';
COMMENT ON COLUMN projects.battery IS '蓄電池有無';
COMMENT ON COLUMN projects.ua_value IS 'UA値（外皮平均熱貫流率）';
COMMENT ON COLUMN projects.c_value IS 'C値（相当隙間面積）';
COMMENT ON COLUMN projects.total_floor_area IS '延床面積（坪）';
COMMENT ON COLUMN projects.gross_profit IS '粗利益（税別）';
COMMENT ON COLUMN projects.fiscal_year IS '年度（例: 2025）';
COMMENT ON COLUMN projects.product_type IS '商品種別';

-- ----------------------------------------
-- 5. paymentsテーブル拡張
-- ----------------------------------------
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS actual_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS actual_amount DECIMAL(15, 2);

COMMENT ON COLUMN payments.payment_type IS '名目（建築申込金、契約金、着工金など）';
COMMENT ON COLUMN payments.scheduled_date IS '入金予定日';
COMMENT ON COLUMN payments.actual_date IS '入金実績日';
COMMENT ON COLUMN payments.scheduled_amount IS '予定額';
COMMENT ON COLUMN payments.actual_amount IS '実績額';

-- payment_typeの制約追加（既存の制約を削除してから追加）
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payment_type_check;

ALTER TABLE payments
ADD CONSTRAINT payment_type_check
CHECK (payment_type IN (
  '建築申込金',
  '契約金',
  '着工金',
  '上棟金',
  '最終金',
  '追加工事金',
  '外構',
  '土地仲介手数料',
  '土地手付金',
  '土地残代金',
  'その他'
));

-- ----------------------------------------
-- 6. 初期データ投入（年度マスタ）
-- ----------------------------------------
INSERT INTO fiscal_years (year, start_date, end_date) VALUES
('2023', '2023-08-01', '2024-07-31'),
('2024', '2024-08-01', '2025-07-31'),
('2025', '2025-08-01', '2026-07-31')
ON CONFLICT (year) DO NOTHING;

-- ----------------------------------------
-- 7. 初期データ投入（拠点マスタ）
-- ----------------------------------------
INSERT INTO branches (name) VALUES
('本社'),
('福岡支店'),
('東京支店')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------
-- 8. projectsテーブルにfiscal_yearを自動設定する関数
-- ----------------------------------------
CREATE OR REPLACE FUNCTION set_fiscal_year()
RETURNS TRIGGER AS $$
BEGIN
  -- expected_completion_dateから年度を計算
  -- 8月～12月 → 当年度、1月～7月 → 前年度
  IF NEW.expected_completion_date IS NOT NULL THEN
    IF EXTRACT(MONTH FROM NEW.expected_completion_date) >= 8 THEN
      NEW.fiscal_year := EXTRACT(YEAR FROM NEW.expected_completion_date)::VARCHAR;
    ELSE
      NEW.fiscal_year := (EXTRACT(YEAR FROM NEW.expected_completion_date) - 1)::VARCHAR;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS set_fiscal_year_trigger ON projects;
CREATE TRIGGER set_fiscal_year_trigger
BEFORE INSERT OR UPDATE OF expected_completion_date ON projects
FOR EACH ROW
EXECUTE FUNCTION set_fiscal_year();

-- ----------------------------------------
-- 9. RLS (Row Level Security) ポリシー更新
-- ----------------------------------------
-- branchesテーブルのRLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON branches;
CREATE POLICY "Enable read access for all users"
ON branches FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON branches;
CREATE POLICY "Enable insert for authenticated users only"
ON branches FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON branches;
CREATE POLICY "Enable update for authenticated users only"
ON branches FOR UPDATE
USING (true);

-- fiscal_yearsテーブルのRLS
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON fiscal_years;
CREATE POLICY "Enable read access for all users"
ON fiscal_years FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON fiscal_years;
CREATE POLICY "Enable insert for authenticated users only"
ON fiscal_years FOR INSERT
WITH CHECK (true);

-- ----------------------------------------
-- 10. インデックス作成
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_fiscal_year ON projects(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_projects_expected_completion_date ON projects(expected_completion_date);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_scheduled_date ON payments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_payments_actual_date ON payments(actual_date);

-- ========================================
-- 完了
-- ========================================
