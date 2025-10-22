-- ===================================
-- 権限管理システムの追加
-- ===================================

-- 権限テーブル
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- read_projects, write_projects, delete_projects など
  description TEXT,
  category TEXT NOT NULL, -- 'project', 'payment', 'employee', 'master', 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ロール権限紐付けテーブル
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL, -- member, leader, manager, department_head, president, executive, franchise_user, franchise_admin
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- RLS有効化
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 全員が権限情報を読み取れる
CREATE POLICY "Everyone can read permissions" ON permissions
  FOR SELECT USING (true);

CREATE POLICY "Everyone can read role permissions" ON role_permissions
  FOR SELECT USING (true);

-- 基本権限の登録
INSERT INTO permissions (name, description, category) VALUES
-- プロジェクト関連
('read_projects', '案件の閲覧', 'project'),
('write_projects', '案件の作成・編集', 'project'),
('delete_projects', '案件の削除', 'project'),
('export_projects', '案件のエクスポート', 'project'),

-- 入金管理関連
('read_payments', '入金情報の閲覧', 'payment'),
('write_payments', '入金情報の作成・編集', 'payment'),
('delete_payments', '入金情報の削除', 'payment'),
('approve_payments', '入金の承認', 'payment'),

-- 従業員管理関連
('read_employees', '従業員情報の閲覧', 'employee'),
('write_employees', '従業員情報の作成・編集', 'employee'),
('delete_employees', '従業員情報の削除', 'employee'),

-- マスタ管理関連
('read_masters', 'マスタ情報の閲覧', 'master'),
('write_masters', 'マスタ情報の作成・編集', 'master'),
('delete_masters', 'マスタ情報の削除', 'master'),

-- システム管理関連
('read_audit_logs', '監査ログの閲覧', 'system'),
('manage_system', 'システム設定の管理', 'system'),
('manage_organizations', '組織の管理', 'system')
ON CONFLICT (name) DO NOTHING;

-- ロール別権限の割り当て

-- メンバー（一般社員）
INSERT INTO role_permissions (role, permission_id)
SELECT 'member', id FROM permissions WHERE name IN (
  'read_projects',
  'read_payments',
  'read_employees',
  'read_masters'
) ON CONFLICT DO NOTHING;

-- リーダー
INSERT INTO role_permissions (role, permission_id)
SELECT 'leader', id FROM permissions WHERE name IN (
  'read_projects',
  'write_projects',
  'read_payments',
  'write_payments',
  'read_employees',
  'read_masters'
) ON CONFLICT DO NOTHING;

-- マネージャー
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions WHERE name IN (
  'read_projects',
  'write_projects',
  'delete_projects',
  'export_projects',
  'read_payments',
  'write_payments',
  'approve_payments',
  'read_employees',
  'write_employees',
  'read_masters',
  'write_masters'
) ON CONFLICT DO NOTHING;

-- 部門長
INSERT INTO role_permissions (role, permission_id)
SELECT 'department_head', id FROM permissions WHERE name IN (
  'read_projects',
  'write_projects',
  'delete_projects',
  'export_projects',
  'read_payments',
  'write_payments',
  'delete_payments',
  'approve_payments',
  'read_employees',
  'write_employees',
  'delete_employees',
  'read_masters',
  'write_masters',
  'delete_masters',
  'read_audit_logs'
) ON CONFLICT DO NOTHING;

-- 社長・役員（全権限）
INSERT INTO role_permissions (role, permission_id)
SELECT 'president', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'executive', id FROM permissions
ON CONFLICT DO NOTHING;

-- フランチャイズユーザー（限定権限）
INSERT INTO role_permissions (role, permission_id)
SELECT 'franchise_user', id FROM permissions WHERE name IN (
  'read_projects',
  'read_payments',
  'read_employees',
  'read_masters'
) ON CONFLICT DO NOTHING;

-- フランチャイズ管理者
INSERT INTO role_permissions (role, permission_id)
SELECT 'franchise_admin', id FROM permissions WHERE name IN (
  'read_projects',
  'write_projects',
  'export_projects',
  'read_payments',
  'write_payments',
  'read_employees',
  'write_employees',
  'read_masters',
  'write_masters'
) ON CONFLICT DO NOTHING;

-- 権限チェック関数
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_perm BOOLEAN;
BEGIN
  -- ユーザーのロールを取得
  SELECT role INTO user_role FROM employees WHERE id = user_id;

  -- そのロールが指定された権限を持っているかチェック
  SELECT EXISTS(
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = user_role AND p.name = permission_name
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
