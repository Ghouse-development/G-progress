-- ==========================================
-- 包括的拡張マイグレーション
-- ==========================================
-- 作成日: 2025-10-20
-- 目的: 商品マスタ、マルチテナント、案件詳細フィールドの追加
-- ==========================================

-- ==========================================
-- 1. 商品マスタテーブル (products)
-- ==========================================
-- テーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- カラム追加（既存の場合はスキップ）
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price DECIMAL(15,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 商品マスタのUNIQUE制約追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
  END IF;
END $$;

-- 商品マスタのインデックス
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);

-- 商品マスタのRLS有効化
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 商品マスタのポリシー
DROP POLICY IF EXISTS "全従業員が商品マスタを閲覧可能" ON products;
CREATE POLICY "全従業員が商品マスタを閲覧可能" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "管理者のみが商品マスタを編集可能" ON products;
CREATE POLICY "管理者のみが商品マスタを編集可能" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('president', 'executive', 'department_head')
    )
  );

-- 初期商品データ投入
INSERT INTO products (name, category, description, display_order) VALUES
  ('LIFE Limited', '規格住宅', 'LIFE Limitedシリーズ', 1),
  ('LIFE+ Limited', '規格住宅', 'LIFE+ Limitedシリーズ', 2)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 2. 組織テーブル (organizations) - フランチャイズ対応
-- ==========================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('headquarters', 'franchise')),
  parent_organization_id UUID REFERENCES organizations(id),
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  contract_start_date DATE,
  contract_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 組織テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);

-- 組織テーブルのRLS有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 組織テーブルのポリシー
DROP POLICY IF EXISTS "全従業員が組織を閲覧可能" ON organizations;
CREATE POLICY "全従業員が組織を閲覧可能" ON organizations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "管理者のみが組織を編集可能" ON organizations;
CREATE POLICY "管理者のみが組織を編集可能" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('president', 'executive', 'department_head')
    )
  );

-- 初期組織データ
INSERT INTO organizations (name, type, parent_organization_id) VALUES
  ('株式会社Gハウス本社', 'headquarters', NULL)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 3. projectsテーブルの大幅拡張
-- ==========================================

-- 基本情報
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_names TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sales_staff_id UUID REFERENCES employees(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_staff_id UUID REFERENCES employees(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ic_staff_id UUID REFERENCES employees(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_staff_id UUID REFERENCES employees(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS exterior_staff_id UUID REFERENCES employees(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_designer VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_office VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS floors INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_area DECIMAL(10,2);

-- スケジュール
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_hearing_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS plan_finalized_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS plan_financial_sent_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS structure_go_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS application_go_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS structure_1st_cb_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS structure_2nd_cb_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meeting_available_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS weekday_web_meeting_campaign BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS benefits_content TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_kitchen BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_iron_stairs BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ic_benefits_count INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meeting_count INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS youtube_recommended BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_meeting_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meeting_document_delivery_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pre_change_contract_meeting_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drawing_upload_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS structure_drawing_upload_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_permit_date DATE;

-- 融資関連
ALTER TABLE projects ADD COLUMN IF NOT EXISTS long_term_loan BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flat_loan BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flat_design_notice_required_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS building_permit_required BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS building_permit_required_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS interim_inspection_cert_required BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS interim_inspection_cert_required_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion_inspection_cert_required BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion_inspection_cert_required_date DATE;

-- 解体・土地関連
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demolition BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demolition_contractor VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demolition_subsidy BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shizume_toufuda BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS buried_cultural_property_area VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demolition_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demolition_completion_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS change_contract_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_settlement_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subdivision BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subdivision_completion_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS new_water_connection BOOLEAN DEFAULT false;

-- 工事スケジュール
ALTER TABLE projects ADD COLUMN IF NOT EXISTS initial_contract_construction_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS change_contract_construction_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pre_construction_work TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ground_reinforcement BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ground_reinforcement_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS foundation_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS execution_budget_completion_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS roof_raising_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS interim_inspection_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pre_completion_inspection_work TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion_inspection_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS handover_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_desired_key_delivery_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS exterior_work_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS exterior_work_completion_date DATE;

-- 進捗・備考
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_status TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- 補助金・融資詳細
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subsidy_type VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS long_term_requirements TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gx_requirements TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pre_application_approved BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS main_application_approved BOOLEAN DEFAULT false;

-- 金額
ALTER TABLE projects ADD COLUMN IF NOT EXISTS application_fee_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS application_fee_amount DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_payment_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_payment_amount DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_start_payment_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_start_payment_amount DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS roof_raising_payment_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS roof_raising_payment_amount DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_payment_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_payment_amount DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fire_insurance_amount DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fire_insurance_commission DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fixture_work_commission BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fixture_work_commission_amount DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS title_registration_commission DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS judicial_scrivener_commission DECIMAL(15,2);

-- 性能値
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eta_ac_value DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reduction_rate_no_renewable DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bei_no_renewable DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reduction_rate_renewable_self DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bei_renewable_self DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reduction_rate_renewable_sell DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bei_renewable_sell DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gx_requirements_met BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS zeh_certified BOOLEAN DEFAULT false;

-- マルチテナント対応
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_projects_contract_number ON projects(contract_number);
CREATE INDEX IF NOT EXISTS idx_projects_product_id ON projects(product_id);
CREATE INDEX IF NOT EXISTS idx_projects_sales_staff_id ON projects(sales_staff_id);
CREATE INDEX IF NOT EXISTS idx_projects_design_staff_id ON projects(design_staff_id);
CREATE INDEX IF NOT EXISTS idx_projects_construction_staff_id ON projects(construction_staff_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_handover_date ON projects(handover_date);

-- ==========================================
-- 4. 他テーブルへのorganization_id追加
-- ==========================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_organization_id ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);

-- ==========================================
-- 5. トリガー追加
-- ==========================================
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at();

-- ==========================================
-- 完了
-- ==========================================
-- このSQLを実行後、以下の機能が有効になります：
-- ✅ 商品マスタ管理
-- ✅ マルチテナント対応（フランチャイズ）
-- ✅ 案件詳細フィールド（100+カラム）
-- ✅ ダッシュボードの商品構成表示
-- ==========================================
