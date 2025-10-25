/**
 * 監査ログ自動記録フック
 * CRUD操作を自動的に記録し、audit_logsテーブルに保存
 */

import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../contexts/SettingsContext'

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import'

interface AuditLogData {
  action: AuditAction
  table_name: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  description?: string
}

export function useAuditLog() {
  const { demoMode } = useSettings()

  /**
   * 監査ログを記録
   */
  const log = useCallback(async (data: AuditLogData) => {
    // デモモードでは監査ログを記録しない
    if (demoMode) {
      return
    }

    try {
      const employeeId = localStorage.getItem('selectedEmployeeId')
      if (!employeeId || employeeId.trim() === '') {
        console.warn('No employee ID found, skipping audit log')
        return
      }

      // UUID形式の簡易チェック
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(employeeId)) {
        console.warn('Invalid employee ID format, skipping audit log:', employeeId)
        return
      }

      // 変更内容を記述文に含める
      let description = data.description || ''
      if (!description) {
        description = generateDescription(data)
      }

      // record_idが空文字列の場合はundefinedにする（nullとして扱われる）
      const recordId = data.record_id && data.record_id.trim() !== '' ? data.record_id : undefined

      const { error } = await supabase.from('audit_logs').insert({
        employee_id: employeeId,
        action: data.action,
        table_name: data.table_name,
        record_id: recordId,
        old_values: data.old_values,
        new_values: data.new_values,
        description
      })

      if (error) {
        console.error('Failed to create audit log:', error)
        console.error('Audit log data:', {
          employee_id: employeeId,
          action: data.action,
          table_name: data.table_name,
          record_id: recordId
        })
      }
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // 監査ログの失敗は業務操作をブロックしない
    }
  }, [demoMode])

  /**
   * 作成操作を記録
   */
  const logCreate = useCallback(async (
    tableName: string,
    recordId: string,
    newValues: Record<string, any>,
    description?: string
  ) => {
    await log({
      action: 'create',
      table_name: tableName,
      record_id: recordId,
      new_values: newValues,
      description
    })
  }, [log])

  /**
   * 更新操作を記録
   */
  const logUpdate = useCallback(async (
    tableName: string,
    recordId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    description?: string
  ) => {
    await log({
      action: 'update',
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      description
    })
  }, [log])

  /**
   * 削除操作を記録
   */
  const logDelete = useCallback(async (
    tableName: string,
    recordId: string,
    oldValues: Record<string, any>,
    description?: string
  ) => {
    await log({
      action: 'delete',
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      description
    })
  }, [log])

  /**
   * ログイン操作を記録
   */
  const logLogin = useCallback(async (employeeName: string) => {
    await log({
      action: 'login',
      table_name: 'employees',
      description: `${employeeName}がログインしました`
    })
  }, [log])

  /**
   * ログアウト操作を記録
   */
  const logLogout = useCallback(async (employeeName: string) => {
    await log({
      action: 'logout',
      table_name: 'employees',
      description: `${employeeName}がログアウトしました`
    })
  }, [log])

  /**
   * エクスポート操作を記録
   */
  const logExport = useCallback(async (
    exportType: string,
    recordId: string,
    metadata?: Record<string, any>,
    description?: string
  ) => {
    await log({
      action: 'export',
      table_name: exportType,
      record_id: recordId || undefined,
      new_values: metadata,
      description: description || `${exportType}をエクスポートしました`
    })
  }, [log])

  /**
   * インポート操作を記録
   */
  const logImport = useCallback(async (
    importType: string,
    recordCount: number,
    description?: string
  ) => {
    await log({
      action: 'import',
      table_name: importType,
      description: description || `${importType}を${recordCount}件インポートしました`
    })
  }, [log])

  return {
    log,
    logCreate,
    logUpdate,
    logDelete,
    logLogin,
    logLogout,
    logExport,
    logImport
  }
}

/**
 * 監査ログの説明文を自動生成
 */
function generateDescription(data: AuditLogData): string {
  const { action, table_name, old_values, new_values } = data

  const tableNameJp = getTableNameJapanese(table_name)

  switch (action) {
    case 'create':
      return `${tableNameJp}を作成しました`
    case 'update':
      return `${tableNameJp}を更新しました${getChangeSummary(old_values, new_values)}`
    case 'delete':
      return `${tableNameJp}を削除しました`
    case 'login':
      return 'ログインしました'
    case 'logout':
      return 'ログアウトしました'
    case 'export':
      return `${tableNameJp}をエクスポートしました`
    case 'import':
      return `${tableNameJp}をインポートしました`
    default:
      return `${tableNameJp}に対する操作を実行しました`
  }
}

/**
 * テーブル名を日本語に変換
 */
function getTableNameJapanese(tableName: string): string {
  const tableNameMap: Record<string, string> = {
    projects: '案件',
    tasks: 'タスク',
    payments: '入金',
    employees: '従業員',
    customers: '顧客',
    vendors: '業者',
    products: '商品',
    notifications: '通知',
    organizations: '組織',
    fiscal_years: '年度',
    audit_logs: '監査ログ'
  }
  return tableNameMap[tableName] || tableName
}

/**
 * 変更内容のサマリーを生成
 */
function getChangeSummary(
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): string {
  if (!oldValues || !newValues) return ''

  const changes: string[] = []
  const importantFields = ['name', 'status', 'amount', 'scheduled_amount', 'actual_amount', 'due_date', 'actual_completion_date']

  for (const field of importantFields) {
    if (field in oldValues && field in newValues && oldValues[field] !== newValues[field]) {
      const fieldNameJp = getFieldNameJapanese(field)
      changes.push(`${fieldNameJp}: ${oldValues[field]} → ${newValues[field]}`)
    }
  }

  if (changes.length === 0) return ''
  if (changes.length <= 2) return ` (${changes.join(', ')})`
  return ` (${changes.length}項目を変更)`
}

/**
 * フィールド名を日本語に変換
 */
function getFieldNameJapanese(field: string): string {
  const fieldNameMap: Record<string, string> = {
    name: '名前',
    status: 'ステータス',
    amount: '金額',
    scheduled_amount: '予定金額',
    actual_amount: '実績金額',
    due_date: '期限',
    actual_completion_date: '完了日',
    description: '説明',
    contract_date: '契約日',
    construction_start_date: '着工日',
    handover_date: '引き渡し日'
  }
  return fieldNameMap[field] || field
}
