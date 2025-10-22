-- ========================================
-- パフォーマンス最適化インデックス
-- ========================================
-- 頻繁に検索されるカラムにインデックスを追加
-- 作成日: 2025-10-22
-- ========================================

-- ========================================
-- 1. Employees（従業員）テーブル
-- ========================================
-- メールアドレスでの検索（ログイン時）
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- 部門・拠点での検索
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);

-- 役職での検索
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- 複合インデックス: 部門 + 拠点
CREATE INDEX IF NOT EXISTS idx_employees_dept_branch ON employees(department, branch_id);

-- ========================================
-- 2. Customers（顧客）テーブル
-- ========================================
-- 顧客名での検索（JSONB配列）
CREATE INDEX IF NOT EXISTS idx_customers_names ON customers USING GIN (names);

-- 電話番号での検索
CREATE INDEX IF NOT EXISTS idx_customers_phone1 ON customers(phone1);
CREATE INDEX IF NOT EXISTS idx_customers_phone2 ON customers(phone2);

-- メールアドレスでの検索
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 郵便番号での検索
CREATE INDEX IF NOT EXISTS idx_customers_postal_code ON customers(postal_code);

-- 作成日での並び替え
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- ========================================
-- 3. Projects（案件）テーブル
-- ========================================
-- 顧客IDでの検索（外部キー）
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);

-- 担当者での検索
CREATE INDEX IF NOT EXISTS idx_projects_assigned_sales ON projects(assigned_sales);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_design ON projects(assigned_design);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_construction ON projects(assigned_construction);

-- 年度での検索
CREATE INDEX IF NOT EXISTS idx_projects_fiscal_year ON projects(fiscal_year);

-- ステータスでの検索
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 契約日での並び替え
CREATE INDEX IF NOT EXISTS idx_projects_contract_date ON projects(contract_date DESC);

-- 着工日・完了日での検索
CREATE INDEX IF NOT EXISTS idx_projects_construction_start ON projects(construction_start_date);
CREATE INDEX IF NOT EXISTS idx_projects_construction_end ON projects(construction_end_date);

-- 複合インデックス: 年度 + ステータス
CREATE INDEX IF NOT EXISTS idx_projects_year_status ON projects(fiscal_year, status);

-- 複合インデックス: 年度 + 担当営業
CREATE INDEX IF NOT EXISTS idx_projects_year_sales ON projects(fiscal_year, assigned_sales);

-- 工事住所での全文検索
CREATE INDEX IF NOT EXISTS idx_projects_address_fulltext ON projects USING GIN (to_tsvector('japanese', construction_address));

-- ========================================
-- 4. Tasks（タスク）テーブル
-- ========================================
-- プロジェクトIDでの検索（外部キー）
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- 担当者での検索
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- ステータスでの検索
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- 期限日での並び替え
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- 実際の完了日での検索
CREATE INDEX IF NOT EXISTS idx_tasks_actual_completion ON tasks(actual_completion_date);

-- 契約日からの経過日数での検索
CREATE INDEX IF NOT EXISTS idx_tasks_day_from_contract ON tasks(day_from_contract);

-- 複合インデックス: プロジェクト + ステータス
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);

-- 複合インデックス: 担当者 + 期限日
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_due ON tasks(assigned_to, due_date);

-- タスク名での全文検索
CREATE INDEX IF NOT EXISTS idx_tasks_title_fulltext ON tasks USING GIN (to_tsvector('japanese', title));

-- ========================================
-- 5. Payments（入金）テーブル
-- ========================================
-- プロジェクトIDでの検索（外部キー）
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);

-- 名目での検索
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);

-- 予定日・実際の入金日での検索
CREATE INDEX IF NOT EXISTS idx_payments_scheduled_date ON payments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_payments_actual_date ON payments(actual_date);

-- 複合インデックス: プロジェクト + 名目
CREATE INDEX IF NOT EXISTS idx_payments_project_type ON payments(project_id, payment_type);

-- 複合インデックス: 予定日の月（入金管理画面での検索）
CREATE INDEX IF NOT EXISTS idx_payments_scheduled_month ON payments(DATE_TRUNC('month', scheduled_date));
CREATE INDEX IF NOT EXISTS idx_payments_actual_month ON payments(DATE_TRUNC('month', actual_date));

-- ========================================
-- 6. Audit Logs（監査ログ）テーブル
-- ========================================
-- ユーザーIDでの検索
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- テーブル名での検索
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- アクションタイプでの検索
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 作成日での並び替え
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 複合インデックス: テーブル + アクション
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action ON audit_logs(table_name, action);

-- 複合インデックス: ユーザー + 作成日
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- ========================================
-- 7. Task Masters（タスクマスタ）テーブル
-- ========================================
-- タスク順序での並び替え
CREATE INDEX IF NOT EXISTS idx_task_masters_order ON task_masters(task_order);

-- 職種での検索
CREATE INDEX IF NOT EXISTS idx_task_masters_position ON task_masters(position);

-- タスクタイトルでの検索
CREATE INDEX IF NOT EXISTS idx_task_masters_title ON task_masters(task_title);

-- 複合インデックス: 職種 + タスク順序
CREATE INDEX IF NOT EXISTS idx_task_masters_position_order ON task_masters(position, task_order);

-- ========================================
-- 8. Notifications（通知）テーブル
-- ========================================
-- ユーザーIDでの検索
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 既読・未読での検索
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 通知タイプでの検索
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 関連プロジェクト・タスクでの検索
CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(related_project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_task ON notifications(related_task_id);

-- 作成日での並び替え
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 複合インデックス: ユーザー + 既読 + 作成日
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);

-- ========================================
-- 9. マスタテーブル
-- ========================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Branches
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

-- Roles
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Departments
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

-- Triggers
CREATE INDEX IF NOT EXISTS idx_triggers_name ON triggers(name);
CREATE INDEX IF NOT EXISTS idx_triggers_trigger_type ON triggers(trigger_type);

-- Fiscal Years
CREATE INDEX IF NOT EXISTS idx_fiscal_years_year ON fiscal_years(year DESC);

-- ========================================
-- 統計情報の更新
-- ========================================
-- PostgreSQLのクエリプランナーが正確な統計情報を使用できるようにする
ANALYZE employees;
ANALYZE customers;
ANALYZE projects;
ANALYZE tasks;
ANALYZE payments;
ANALYZE audit_logs;
ANALYZE task_masters;
ANALYZE notifications;
ANALYZE products;
ANALYZE branches;
ANALYZE roles;
ANALYZE departments;
ANALYZE vendors;
ANALYZE triggers;
ANALYZE fiscal_years;

-- ========================================
-- 完了
-- ========================================
-- パフォーマンス最適化インデックスを作成しました
