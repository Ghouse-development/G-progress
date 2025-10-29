import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import {
  Permission,
  Role,
  UserPermissions,
  getPermissionsForRole,
  getDepartmentAccessForRole,
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  canAccessDepartment as checkDepartmentAccess
} from '../types/permissions'

interface PermissionsContextType {
  userPermissions: UserPermissions | null
  loading: boolean
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  canAccessDepartment: (department: string) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUserPermissions = async () => {
    try {
      setLoading(true)

      // 現在のユーザーセッションを取得
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // 開発モード: ローカルストレージから取得
        const devAuth = localStorage.getItem('auth')
        if (devAuth === 'true') {
          // デフォルト管理者権限（開発用）
          const devPermissions: UserPermissions = {
            role: '管理者',
            permissions: getPermissionsForRole('管理者'),
            departmentAccess: getDepartmentAccessForRole('管理者', '営業'),
            userId: 'dev-user',
            department: '営業'
          }
          setUserPermissions(devPermissions)
          setLoading(false)
          return
        }

        setUserPermissions(null)
        setLoading(false)
        return
      }

      // 従業員情報を取得
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, role, department')
        .eq('email', session.user.email)
        .single()

      if (error || !employee) {
        setUserPermissions(null)
        setLoading(false)
        return
      }

      const role = employee.role as Role
      const permissions = getPermissionsForRole(role)
      const departmentAccess = getDepartmentAccessForRole(role, employee.department)

      const userPerms: UserPermissions = {
        role,
        permissions,
        departmentAccess,
        userId: employee.id,
        department: employee.department
      }

      setUserPermissions(userPerms)
    } catch (error) {
      setUserPermissions(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserPermissions()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserPermissions()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ヘルパー関数
  const hasPermission = (permission: Permission): boolean => {
    if (!userPermissions) return false
    return checkPermission(userPermissions, permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false
    return checkAnyPermission(userPermissions, permissions)
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false
    return checkAllPermissions(userPermissions, permissions)
  }

  const canAccessDepartment = (department: string): boolean => {
    if (!userPermissions) return false
    return checkDepartmentAccess(userPermissions, department)
  }

  const refreshPermissions = async () => {
    await loadUserPermissions()
  }

  const value: PermissionsContextType = {
    userPermissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessDepartment,
    refreshPermissions
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}
