-- データベーススキーマ定義: G-progress

-- 従業員テーブル
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL, -- 営業、営業事務、ローン事務、実施設計、意匠設計、申請設計、構造設計、IC、工事、発注・積算、工事事務、システム開発部、商品企画部、広告マーケティング部、CS推進部、不動産事業部、外構事業部、経営管理部、経営企画部、その他
  role TEXT NOT NULL DEFAULT 'member', -- member, leader, manager, executive
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 業者テーブル
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 設計事務所、構造事務所、水道業者、解体業者、司法書士、土地家屋調査士、その他
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顧客テーブル
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  names TEXT[] NOT NULL, -- 複数の氏名を配列で保存
  building_site TEXT NOT NULL, -- 建築地
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 案件テーブル
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  contract_date DATE NOT NULL, -- 契約日
  construction_start_date DATE, -- 着工日
  scheduled_end_date DATE, -- 完了予定日
  actual_end_date DATE, -- 実際の完了日
  status TEXT NOT NULL DEFAULT 'pre_contract', -- pre_contract, post_contract, construction, completed
  progress_rate DECIMAL(5,2) DEFAULT 0.00,
  assigned_sales UUID REFERENCES employees(id), -- 営業担当
  assigned_design UUID REFERENCES employees(id), -- 設計担当
  assigned_construction UUID REFERENCES employees(id), -- 工事担当
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 入金テーブル
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL, -- contract, construction_start, roof_raising, final
  amount DECIMAL(12,2) NOT NULL,
  scheduled_date DATE,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, overdue
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- タスク（イベント）テーブル
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES employees(id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, requested, completed, not_applicable
  priority TEXT DEFAULT 'medium', -- low, medium, high
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添付ファイルテーブル
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 監査ログテーブル
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES employees(id),
  action TEXT NOT NULL, -- create, update, delete, login, logout
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知テーブル
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES employees(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- delay, payment_overdue, task_assigned
  related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- RLS (Row Level Security) 有効化
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（基本的な例）
-- 全従業員が全てのデータを閲覧可能
CREATE POLICY "Allow all authenticated users to read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to read audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to read their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 更新時にupdated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $triggerfunction$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$triggerfunction$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
