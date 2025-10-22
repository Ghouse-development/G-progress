-- ===================================
-- マルチテナント機能の追加
-- ===================================

-- 組織（マルチテナント）テーブル
DROP TABLE IF EXISTS organizations CASCADE;
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type TEXT NOT NULL DEFAULT 'headquarter', -- 'headquarter', 'franchise'
  org_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  settings JSONB DEFAULT '{}', -- 組織固有の設定（ロゴURL、カラーテーマなど）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 既存テーブルにorganization_id追加
ALTER TABLE employees ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);

-- RLS（Row Level Security）有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分の組織のデータのみアクセス可能
CREATE POLICY "Users can only access their organization's data" ON employees
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can only access their organization's vendors" ON vendors
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can only access their organization's customers" ON customers
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can only access their organization's projects" ON projects
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can only access their organization's payments" ON payments
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can only access their organization's tasks" ON tasks
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can only access their organization's notifications" ON notifications
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can only access their organization's audit logs" ON audit_logs
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM employees
      WHERE id = auth.uid()::uuid
    )
  );

-- デフォルト組織（本社）作成
INSERT INTO organizations (id, name, org_type, org_status)
VALUES ('00000000-0000-0000-0000-000000000001', '株式会社Gハウス本社', 'headquarter', 'active')
ON CONFLICT (id) DO NOTHING;

-- 既存データにデフォルト組織を割り当て（既存データがある場合のみ）
UPDATE employees SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE vendors SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE customers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE projects SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE payments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE tasks SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE notifications SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE audit_logs SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
