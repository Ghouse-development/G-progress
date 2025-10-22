/**
 * 権限チェックフック
 * Supabaseのhas_permission関数を使用して権限を確認
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Employee } from '../types/database'

export type PermissionName =
  // プロジェクト関連
  | 'read_projects'
  | 'write_projects'
  | 'delete_projects'
  // 入金関連
  | 'read_payments'
  | 'write_payments'
  | 'delete_payments'
  // 従業員関連
  | 'read_employees'
  | 'write_employees'
  | 'delete_employees'
  // マスタ関連
  | 'read_masters'
  | 'write_masters'
  | 'delete_masters'
  // システム関連
  | 'read_system'
  | 'write_system'
  | 'delete_system'

/**
 * 権限チェックフック
 */
export function usePermissions() {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [permissions, setPermissions] = useState<Record<PermissionName, boolean>>({} as any)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentEmployee()
  }, [])

  const loadCurrentEmployee = async () => {
    try {
      setLoading(true)
      const employeeId = localStorage.getItem('selectedEmployeeId')

      if (!employeeId) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      if (error) {
        console.error('Failed to load employee:', error)
        setLoading(false)
        return
      }

      setCurrentEmployee(data)

      // 全権限をチェック
      await checkAllPermissions(employeeId)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAllPermissions = async (employeeId: string) => {
    const permissionNames: PermissionName[] = [
      'read_projects',
      'write_projects',
      'delete_projects',
      'read_payments',
      'write_payments',
      'delete_payments',
      'read_employees',
      'write_employees',
      'delete_employees',
      'read_masters',
      'write_masters',
      'delete_masters',
      'read_system',
      'write_system',
      'delete_system'
    ]

    const results: Record<PermissionName, boolean> = {} as any

    for (const permissionName of permissionNames) {
      const hasPermission = await checkPermission(employeeId, permissionName)
      results[permissionName] = hasPermission
    }

    setPermissions(results)
  }

  const checkPermission = async (employeeId: string, permissionName: PermissionName): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_permission', {
        user_id: employeeId,
        permission_name: permissionName
      })

      if (error) {
        console.error(`Failed to check permission ${permissionName}:`, error)
        return false
      }

      return data === true
    } catch (error) {
      console.error(`Failed to check permission ${permissionName}:`, error)
      return false
    }
  }

  const hasPermission = (permissionName: PermissionName): boolean => {
    return permissions[permissionName] === true
  }

  const hasRole = (role: Employee['role']): boolean => {
    return currentEmployee?.role === role
  }

  const isAdmin = (): boolean => {
    return currentEmployee?.role === 'president' ||
           currentEmployee?.role === 'executive' ||
           currentEmployee?.role === 'department_head'
  }

  return {
    currentEmployee,
    permissions,
    loading,
    hasPermission,
    hasRole,
    isAdmin,
    reload: loadCurrentEmployee
  }
}

/**
 * 簡易的な権限チェック（ロールベース）
 * Supabaseの権限システムが設定されていない場合のフォールバック
 */
export function useSimplePermissions() {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentEmployee()
  }, [])

  const loadCurrentEmployee = async () => {
    try {
      setLoading(true)
      const employeeId = localStorage.getItem('selectedEmployeeId')

      if (!employeeId) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      if (error) {
        console.error('Failed to load employee:', error)
        setLoading(false)
        return
      }

      setCurrentEmployee(data)
    } catch (error) {
      console.error('Failed to load employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const canRead = (resource: 'projects' | 'payments' | 'employees' | 'masters' | 'system'): boolean => {
    if (!currentEmployee) return false

    // 全員が読み取り可能（基本）
    return true
  }

  const canWrite = (resource: 'projects' | 'payments' | 'employees' | 'masters' | 'system'): boolean => {
    if (!currentEmployee) return false

    const role = currentEmployee.role

    // 社長、役員、部門長は全て書き込み可能
    if (role === 'president' || role === 'executive' || role === 'department_head') {
      return true
    }

    // リーダーは案件と入金の書き込み可能
    if (role === 'leader') {
      return resource === 'projects' || resource === 'payments'
    }

    // メンバーは案件のみ書き込み可能
    if (role === 'member') {
      return resource === 'projects'
    }

    // フランチャイズユーザー・管理者は自組織のデータのみ書き込み可能
    if (role === 'franchise_user' || role === 'franchise_admin') {
      return resource === 'projects' || resource === 'payments'
    }

    return false
  }

  const canDelete = (resource: 'projects' | 'payments' | 'employees' | 'masters' | 'system'): boolean => {
    if (!currentEmployee) return false

    const role = currentEmployee.role

    // 社長、役員のみ削除可能
    if (role === 'president' || role === 'executive') {
      return true
    }

    // 部門長は案件と入金の削除可能
    if (role === 'department_head') {
      return resource === 'projects' || resource === 'payments'
    }

    return false
  }

  const isAdmin = (): boolean => {
    return currentEmployee?.role === 'president' ||
           currentEmployee?.role === 'executive' ||
           currentEmployee?.role === 'department_head'
  }

  return {
    currentEmployee,
    loading,
    canRead,
    canWrite,
    canDelete,
    isAdmin,
    reload: loadCurrentEmployee
  }
}
