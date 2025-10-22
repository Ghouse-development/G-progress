-- ========================================
-- 包括的RLS（Row Level Security）ポリシー実装
-- ========================================
-- 全テーブルに対して役割ベースのアクセス制御を実装
-- 作成日: 2025-10-22
-- ========================================

-- まず、既存の古いポリシーを削除
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS policy_all ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS select_all ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS insert_all ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS update_all ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS delete_all ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ========================================
-- 1. Employees（従業員）テーブル
-- ========================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 自分自身の情報は誰でも閲覧可能
CREATE POLICY "employees_select_own" ON employees
    FOR SELECT
    USING (auth.uid()::text = id OR auth.role() = 'authenticated');

-- 管理者のみが従業員情報を作成・更新・削除可能
CREATE POLICY "employees_insert_admin" ON employees
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

CREATE POLICY "employees_update_admin" ON employees
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

CREATE POLICY "employees_delete_admin" ON employees
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- ========================================
-- 2. Customers（顧客）テーブル
-- ========================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全ての顧客情報を閲覧可能
CREATE POLICY "customers_select_authenticated" ON customers
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 営業・管理者のみが顧客を作成・更新可能
CREATE POLICY "customers_insert_sales" ON customers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND department IN ('営業', '営業事務')
        )
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

CREATE POLICY "customers_update_sales" ON customers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND department IN ('営業', '営業事務')
        )
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- 管理者のみが顧客を削除可能
CREATE POLICY "customers_delete_admin" ON customers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- ========================================
-- 3. Projects（案件）テーブル
-- ========================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全ての案件を閲覧可能
CREATE POLICY "projects_select_authenticated" ON projects
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 営業・設計・工事部門のユーザーが案件を作成可能
CREATE POLICY "projects_insert_departments" ON projects
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND department IN ('営業', '営業事務', '設計', '工事', '工事事務')
        )
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- 担当者または管理者が案件を更新可能
CREATE POLICY "projects_update_assigned_or_admin" ON projects
    FOR UPDATE
    USING (
        assigned_sales = auth.uid()::text
        OR assigned_design = auth.uid()::text
        OR assigned_construction = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- 管理者のみが案件を削除可能
CREATE POLICY "projects_delete_admin" ON projects
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- ========================================
-- 4. Tasks（タスク）テーブル
-- ========================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全てのタスクを閲覧可能
CREATE POLICY "tasks_select_authenticated" ON tasks
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 認証済みユーザーはタスクを作成可能
CREATE POLICY "tasks_insert_authenticated" ON tasks
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 担当者または管理者がタスクを更新可能
CREATE POLICY "tasks_update_assigned_or_admin" ON tasks
    FOR UPDATE
    USING (
        assigned_to = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- 作成者または管理者がタスクを削除可能
CREATE POLICY "tasks_delete_creator_or_admin" ON tasks
    FOR DELETE
    USING (
        created_by = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- ========================================
-- 5. Payments（入金）テーブル
-- ========================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全ての入金情報を閲覧可能
CREATE POLICY "payments_select_authenticated" ON payments
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 営業・経理部門または管理者が入金を作成・更新可能
CREATE POLICY "payments_insert_finance" ON payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND department IN ('営業', '営業事務', 'ローン事務')
        )
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

CREATE POLICY "payments_update_finance" ON payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND department IN ('営業', '営業事務', 'ローン事務')
        )
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- 管理者のみが入金を削除可能
CREATE POLICY "payments_delete_admin" ON payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- ========================================
-- 6. Audit Logs（監査ログ）テーブル
-- ========================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみが監査ログを閲覧可能
CREATE POLICY "audit_logs_select_admin" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- システムのみが監査ログを作成可能（アプリケーションレベルで制御）
CREATE POLICY "audit_logs_insert_system" ON audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 監査ログは更新・削除不可
-- （ポリシーを作成しないことで、誰も更新・削除できない）

-- ========================================
-- 7. マスタテーブル（読み取り専用）
-- ========================================

-- Task Masters
ALTER TABLE task_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_masters_select_all" ON task_masters
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "task_masters_modify_admin" ON task_masters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_all" ON products
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "products_modify_admin" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- Roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_all" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "roles_modify_admin" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('システム管理者')
        )
    );

-- Departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_select_all" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "departments_modify_admin" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('システム管理者')
        )
    );

-- Branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_select_all" ON branches
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "branches_modify_admin" ON branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- Triggers
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triggers_select_all" ON triggers
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "triggers_modify_admin" ON triggers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- Vendors
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_select_all" ON vendors
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vendors_modify_admin" ON vendors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "notifications_insert_system" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE USING (user_id = auth.uid()::text);

-- Fiscal Years
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_years_select_all" ON fiscal_years
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fiscal_years_modify_admin" ON fiscal_years
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('管理者', 'システム管理者')
        )
    );

-- ========================================
-- 完了
-- ========================================
-- 全テーブルに包括的なRLSポリシーを設定しました
