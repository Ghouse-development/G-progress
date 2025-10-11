/**
 * システム内の権限定義
 */

// アクション権限の種類
export type Permission =
  // プロジェクト関連
  | 'projects:view'
  | 'projects:create'
  | 'projects:edit'
  | 'projects:delete'
  | 'projects:view_all'  // 全部門のプロジェクトを閲覧

  // タスク関連
  | 'tasks:view'
  | 'tasks:create'
  | 'tasks:edit'
  | 'tasks:delete'
  | 'tasks:assign'
  | 'tasks:view_all'

  // 顧客関連
  | 'customers:view'
  | 'customers:create'
  | 'customers:edit'
  | 'customers:delete'

  // 従業員関連
  | 'employees:view'
  | 'employees:create'
  | 'employees:edit'
  | 'employees:delete'

  // 支払い関連
  | 'payments:view'
  | 'payments:create'
  | 'payments:edit'
  | 'payments:delete'
  | 'payments:approve'

  // レポート関連
  | 'reports:view'
  | 'reports:export'
  | 'reports:view_all_departments'

  // 監査ログ
  | 'audit_logs:view'

  // システム管理
  | 'system:manage'
  | 'system:settings'

// 役割の定義
export type Role =
  | '管理者'
  | '部長'
  | 'マネージャー'
  | '一般社員'
  | '閲覧者'

// 役割ごとの権限マッピング
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  '管理者': [
    // 全権限
    'projects:view',
    'projects:create',
    'projects:edit',
    'projects:delete',
    'projects:view_all',
    'tasks:view',
    'tasks:create',
    'tasks:edit',
    'tasks:delete',
    'tasks:assign',
    'tasks:view_all',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:delete',
    'employees:view',
    'employees:create',
    'employees:edit',
    'employees:delete',
    'payments:view',
    'payments:create',
    'payments:edit',
    'payments:delete',
    'payments:approve',
    'reports:view',
    'reports:export',
    'reports:view_all_departments',
    'audit_logs:view',
    'system:manage',
    'system:settings',
  ],

  '部長': [
    'projects:view',
    'projects:create',
    'projects:edit',
    'projects:view_all',
    'tasks:view',
    'tasks:create',
    'tasks:edit',
    'tasks:assign',
    'tasks:view_all',
    'customers:view',
    'customers:create',
    'customers:edit',
    'employees:view',
    'payments:view',
    'payments:create',
    'payments:edit',
    'payments:approve',
    'reports:view',
    'reports:export',
    'reports:view_all_departments',
    'audit_logs:view',
  ],

  'マネージャー': [
    'projects:view',
    'projects:create',
    'projects:edit',
    'tasks:view',
    'tasks:create',
    'tasks:edit',
    'tasks:assign',
    'customers:view',
    'customers:create',
    'customers:edit',
    'employees:view',
    'payments:view',
    'payments:create',
    'payments:edit',
    'reports:view',
    'reports:export',
  ],

  '一般社員': [
    'projects:view',
    'tasks:view',
    'tasks:edit',  // 自分に割り当てられたタスクのみ
    'customers:view',
    'employees:view',
    'payments:view',
    'reports:view',
  ],

  '閲覧者': [
    'projects:view',
    'tasks:view',
    'customers:view',
    'employees:view',
    'reports:view',
  ],
}

// 部門レベルの権限
export interface DepartmentAccess {
  canViewAllDepartments: boolean
  allowedDepartments: string[]
}

// ユーザーの権限コンテキスト
export interface UserPermissions {
  role: Role
  permissions: Permission[]
  departmentAccess: DepartmentAccess
  userId: string
  department: string
}

/**
 * 役割から権限リストを取得
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * 特定の権限を持っているかチェック
 */
export function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean {
  return userPermissions.permissions.includes(permission)
}

/**
 * 複数の権限のいずれかを持っているかチェック
 */
export function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean {
  return permissions.some(p => userPermissions.permissions.includes(p))
}

/**
 * 全ての権限を持っているかチェック
 */
export function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean {
  return permissions.every(p => userPermissions.permissions.includes(p))
}

/**
 * 部門へのアクセス権限をチェック
 */
export function canAccessDepartment(userPermissions: UserPermissions, department: string): boolean {
  if (userPermissions.departmentAccess.canViewAllDepartments) {
    return true
  }

  return userPermissions.departmentAccess.allowedDepartments.includes(department) ||
         userPermissions.department === department
}

/**
 * 役割に基づいて部門アクセスを判定
 */
export function getDepartmentAccessForRole(role: Role, userDepartment: string): DepartmentAccess {
  const canViewAll = ['管理者', '部長'].includes(role)

  if (canViewAll) {
    return {
      canViewAllDepartments: true,
      allowedDepartments: []
    }
  }

  // マネージャーは自部門のみ
  // 一般社員と閲覧者も自部門のみ
  return {
    canViewAllDepartments: false,
    allowedDepartments: [userDepartment]
  }
}
