-- ==========================================
-- 要件定義書に基づくスキーマ拡張
-- ==========================================
-- 作成日: 2025-10-20
-- 目的: ダッシュボード、入金管理、性能管理、年度選択、モード切替機能に必要なカラムを追加
-- ==========================================

-- ==========================================
-- 1. 年度マスタテーブル (fiscal_years)
-- ==========================================
CREATE TABLE IF NOT EXISTS fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year VARCHAR(10) NOT NULL UNIQUE, -- 例: "2025" (2025年8月～2026年7月)
  start_date DATE NOT NULL, -- 例: 2025-08-01
  end_date DATE NOT NULL, -- 例: 2026-07-31
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 年度マスタのインデックス
CREATE INDEX IF NOT EXISTS idx_fiscal_years_year ON fiscal_years(year);

-- 年度マスタのRLS有効化
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;

-- 全従業員が年度マスタを閲覧可能
CREATE POLICY "全従業員が年度マスタを閲覧可能" ON fiscal_years
  FOR SELECT USING (true);

-- 管理者のみが年度マスタを作成・更新・削除可能
CREATE POLICY "管理者のみが年度マスタを編集可能" ON fiscal_years
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('president', 'executive', 'department_head')
    )
  );

-- ==========================================
-- 2. 拠点マスタテーブル (branches)
-- ==========================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 例: "本社", "横浜支店", "大阪支店"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 拠点マスタのインデックス
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);

-- 拠点マスタのRLS有効化
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 全従業員が拠点マスタを閲覧可能
CREATE POLICY "全従業員が拠点マスタを閲覧可能" ON branches
  FOR SELECT USING (true);

-- 管理者のみが拠点マスタを作成・更新・削除可能
CREATE POLICY "管理者のみが拠点マスタを編集可能" ON branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('president', 'executive', 'department_head')
    )
  );

-- ==========================================
-- 3. employeesテーブルの拡張
-- ==========================================
-- 拠点IDを追加
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- 拠点IDのインデックス
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);

-- ==========================================
-- 4. projectsテーブルの拡張
-- ==========================================
-- 完工予定数カウント除外フラグ
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS exclude_from_count BOOLEAN DEFAULT false;

-- 太陽光関連
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS solar_panel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS solar_kw DECIMAL(10, 2);

-- 蓄電池
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS battery BOOLEAN DEFAULT false;

-- UA値・C値
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS ua_value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS c_value DECIMAL(10, 2);

-- 坪数
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_floor_area DECIMAL(10, 2);

-- 粗利益
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS gross_profit DECIMAL(15, 2);

-- 年度
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS fiscal_year VARCHAR(10) REFERENCES fiscal_years(year);

-- 商品種別
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS product_type VARCHAR(100);

-- projectsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_projects_fiscal_year ON projects(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_projects_exclude_from_count ON projects(exclude_from_count);
CREATE INDEX IF NOT EXISTS idx_projects_product_type ON projects(product_type);

-- ==========================================
-- 5. paymentsテーブルの拡張
-- ==========================================
-- 名目（契約金、着工金、上棟金、最終金など）
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(100);

-- 予定日・実績日
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS actual_date DATE;

-- 予定額・実績額
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS scheduled_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS actual_amount DECIMAL(15, 2);

-- paymentsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_scheduled_date ON payments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_payments_actual_date ON payments(actual_date);

-- ==========================================
-- 6. トリガーの追加（updated_at自動更新）
-- ==========================================
-- fiscal_yearsテーブルのトリガー
DROP TRIGGER IF EXISTS update_fiscal_years_updated_at ON fiscal_years;
CREATE TRIGGER update_fiscal_years_updated_at
BEFORE UPDATE ON fiscal_years
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at(); -- 単純なupdated_at更新関数を再利用

-- branchesテーブルのトリガー
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at(); -- 単純なupdated_at更新関数を再利用

-- ==========================================
-- 7. サンプルデータ投入
-- ==========================================
-- 年度マスタのサンプルデータ
INSERT INTO fiscal_years (year, start_date, end_date) VALUES
  ('2023', '2023-08-01', '2024-07-31'),
  ('2024', '2024-08-01', '2025-07-31'),
  ('2025', '2025-08-01', '2026-07-31'),
  ('2026', '2026-08-01', '2027-07-31')
ON CONFLICT (year) DO NOTHING;

-- 拠点マスタのサンプルデータ
INSERT INTO branches (name) VALUES
  ('本社'),
  ('横浜支店'),
  ('大阪支店')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 完了
-- ==========================================
-- このSQLを実行後、以下の機能が有効になります：
-- ✅ 年度選択機能（fiscal_years）
-- ✅ 拠点モード（branches, employees.branch_id）
-- ✅ ダッシュボードのグラフ表示（projects拡張）
-- ✅ 入金管理（payments拡張）
-- ✅ 性能管理（projects拡張）
-- ==========================================
