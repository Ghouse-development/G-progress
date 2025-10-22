/**
 * 権限ゲートコンポーネント
 *
 * 指定された権限を持つユーザーのみにコンテンツを表示
 */

import { ReactNode } from 'react'
import { usePermissions } from '../contexts/PermissionsContext'
import { Permission } from '../types/permissions'

interface PermissionGateProps {
  children: ReactNode
  /** 必要な権限（複数指定した場合はいずれかを満たせばOK） */
  permissions?: Permission | Permission[]
  /** 全ての権限が必要な場合はtrue */
  requireAll?: boolean
  /** 権限がない場合に表示するコンテンツ */
  fallback?: ReactNode
  /** 権限がない場合に完全に非表示にする */
  hideIfDenied?: boolean
}

export function PermissionGate({
  children,
  permissions,
  requireAll = false,
  fallback,
  hideIfDenied = false
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  // ローディング中は何も表示しない
  if (loading) {
    return hideIfDenied ? null : <>{fallback}</>
  }

  // 権限指定がない場合は常に表示
  if (!permissions) {
    return <>{children}</>
  }

  // 権限チェック
  const permissionsArray = Array.isArray(permissions) ? permissions : [permissions]
  let hasAccess = false

  if (permissionsArray.length === 1) {
    hasAccess = hasPermission(permissionsArray[0])
  } else if (requireAll) {
    hasAccess = hasAllPermissions(permissionsArray)
  } else {
    hasAccess = hasAnyPermission(permissionsArray)
  }

  // 権限がある場合は子要素を表示
  if (hasAccess) {
    return <>{children}</>
  }

  // 権限がない場合
  if (hideIfDenied) {
    return null
  }

  return <>{fallback}</>
}

/**
 * ボタン用の権限ゲート
 * 権限がない場合はボタンを無効化
 */
interface PermissionButtonProps extends PermissionGateProps {
  /** ボタン要素 */
  button: ReactNode
  /** 無効化時のツールチップメッセージ */
  deniedMessage?: string
}

export function PermissionButton({
  button,
  permissions,
  requireAll = false,
  deniedMessage = 'この操作を実行する権限がありません'
}: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  // ローディング中はボタンを無効化
  if (loading) {
    return <div title="読み込み中...">{button}</div>
  }

  // 権限指定がない場合は常に有効
  if (!permissions) {
    return <>{button}</>
  }

  // 権限チェック
  const permissionsArray = Array.isArray(permissions) ? permissions : [permissions]
  let hasAccess = false

  if (permissionsArray.length === 1) {
    hasAccess = hasPermission(permissionsArray[0])
  } else if (requireAll) {
    hasAccess = hasAllPermissions(permissionsArray)
  } else {
    hasAccess = hasAnyPermission(permissionsArray)
  }

  // 権限がある場合は通常表示
  if (hasAccess) {
    return <>{button}</>
  }

  // 権限がない場合は無効化
  return (
    <div title={deniedMessage} style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
      {button}
    </div>
  )
}

/**
 * ページ全体の権限ゲート
 * 権限がない場合はアクセス拒否メッセージを表示
 */
interface PermissionPageProps {
  children: ReactNode
  permissions: Permission | Permission[]
  requireAll?: boolean
}

export function PermissionPage({
  children,
  permissions,
  requireAll = false
}: PermissionPageProps) {
  return (
    <PermissionGate
      permissions={permissions}
      requireAll={requireAll}
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center prisma-card">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              アクセスが制限されています
            </h1>
            <p className="text-base text-gray-600 mb-6">
              このページを表示する権限がありません。
              <br />
              必要な場合は、システム管理者にお問い合わせください。
            </p>
            <button
              onClick={() => window.history.back()}
              className="prisma-btn prisma-btn-primary"
            >
              前のページに戻る
            </button>
          </div>
        </div>
      }
    >
      {children}
    </PermissionGate>
  )
}

/**
 * 部門アクセスゲート
 * 指定された部門へのアクセス権を持つユーザーのみにコンテンツを表示
 */
interface DepartmentGateProps {
  children: ReactNode
  department: string
  fallback?: ReactNode
  hideIfDenied?: boolean
}

export function DepartmentGate({
  children,
  department,
  fallback,
  hideIfDenied = false
}: DepartmentGateProps) {
  const { canAccessDepartment, loading } = usePermissions()

  // ローディング中は何も表示しない
  if (loading) {
    return hideIfDenied ? null : <>{fallback}</>
  }

  // アクセス権チェック
  if (canAccessDepartment(department)) {
    return <>{children}</>
  }

  // アクセス権がない場合
  if (hideIfDenied) {
    return null
  }

  return <>{fallback}</>
}
