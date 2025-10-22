/**
 * 通知機能フック
 * ユーザーへの通知を作成・管理
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Notification } from '../types/database'
import { useSettings } from '../contexts/SettingsContext'

type NotificationType = 'info' | 'warning' | 'error' | 'success'

interface CreateNotificationParams {
  employeeId: string
  type: NotificationType
  title: string
  message: string
  relatedTable?: string
  relatedRecordId?: string
}

export function useNotifications() {
  const { demoMode } = useSettings()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const currentEmployeeId = localStorage.getItem('selectedEmployeeId')

  /**
   * 現在のユーザーの通知を読み込む
   */
  const loadNotifications = useCallback(async () => {
    if (!currentEmployeeId || demoMode) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('employee_id', currentEmployeeId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [currentEmployeeId, demoMode])

  /**
   * 通知を既読にする
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    if (demoMode) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      await loadNotifications()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [demoMode, loadNotifications])

  /**
   * すべての通知を既読にする
   */
  const markAllAsRead = useCallback(async () => {
    if (!currentEmployeeId || demoMode) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('employee_id', currentEmployeeId)
        .eq('is_read', false)

      if (error) throw error

      await loadNotifications()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [currentEmployeeId, demoMode, loadNotifications])

  /**
   * 通知を削除
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (demoMode) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      await loadNotifications()
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }, [demoMode, loadNotifications])

  /**
   * 新しい通知を作成
   */
  const createNotification = useCallback(async (params: CreateNotificationParams) => {
    if (demoMode) return

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          employee_id: params.employeeId,
          type: params.type,
          title: params.title,
          message: params.message,
          related_table: params.relatedTable,
          related_record_id: params.relatedRecordId,
          is_read: false
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to create notification:', error)
    }
  }, [demoMode])

  /**
   * 複数ユーザーに通知を送信
   */
  const createBulkNotifications = useCallback(async (
    employeeIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    relatedTable?: string,
    relatedRecordId?: string
  ) => {
    if (demoMode) return

    try {
      const notifications = employeeIds.map(employeeId => ({
        employee_id: employeeId,
        type,
        title,
        message,
        related_table: relatedTable,
        related_record_id: relatedRecordId,
        is_read: false
      }))

      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) throw error
    } catch (error) {
      console.error('Failed to create bulk notifications:', error)
    }
  }, [demoMode])

  /**
   * タスク割り当て通知
   */
  const notifyTaskAssignment = useCallback(async (
    assigneeId: string,
    taskDescription: string,
    projectName: string,
    taskId: string
  ) => {
    await createNotification({
      employeeId: assigneeId,
      type: 'info',
      title: '新しいタスクが割り当てられました',
      message: `${projectName}の「${taskDescription}」があなたに割り当てられました`,
      relatedTable: 'tasks',
      relatedRecordId: taskId
    })
  }, [createNotification])

  /**
   * タスク期限通知（期限3日前）
   */
  const notifyTaskDeadline = useCallback(async (
    assigneeId: string,
    taskDescription: string,
    projectName: string,
    dueDate: string,
    taskId: string
  ) => {
    await createNotification({
      employeeId: assigneeId,
      type: 'warning',
      title: 'タスク期限が近づいています',
      message: `${projectName}の「${taskDescription}」の期限は${dueDate}です`,
      relatedTable: 'tasks',
      relatedRecordId: taskId
    })
  }, [createNotification])

  /**
   * タスク遅延通知（期限超過）
   */
  const notifyTaskOverdue = useCallback(async (
    assigneeId: string,
    taskDescription: string,
    projectName: string,
    taskId: string
  ) => {
    await createNotification({
      employeeId: assigneeId,
      type: 'error',
      title: 'タスクが期限を過ぎています',
      message: `${projectName}の「${taskDescription}」が期限を過ぎています`,
      relatedTable: 'tasks',
      relatedRecordId: taskId
    })
  }, [createNotification])

  /**
   * タスク完了通知
   */
  const notifyTaskCompletion = useCallback(async (
    managerId: string,
    taskDescription: string,
    projectName: string,
    completedBy: string,
    taskId: string
  ) => {
    await createNotification({
      employeeId: managerId,
      type: 'success',
      title: 'タスクが完了しました',
      message: `${completedBy}が${projectName}の「${taskDescription}」を完了しました`,
      relatedTable: 'tasks',
      relatedRecordId: taskId
    })
  }, [createNotification])

  /**
   * 入金確認通知
   */
  const notifyPaymentReceived = useCallback(async (
    managerId: string,
    projectName: string,
    amount: number,
    paymentType: string,
    paymentId: string
  ) => {
    await createNotification({
      employeeId: managerId,
      type: 'success',
      title: '入金が確認されました',
      message: `${projectName}の${paymentType}（${amount.toLocaleString()}円）が入金されました`,
      relatedTable: 'payments',
      relatedRecordId: paymentId
    })
  }, [createNotification])

  /**
   * 入金遅延通知
   */
  const notifyPaymentOverdue = useCallback(async (
    managerId: string,
    projectName: string,
    amount: number,
    paymentType: string,
    scheduledDate: string,
    paymentId: string
  ) => {
    await createNotification({
      employeeId: managerId,
      type: 'error',
      title: '入金予定日を過ぎています',
      message: `${projectName}の${paymentType}（${amount.toLocaleString()}円）の入金予定日（${scheduledDate}）を過ぎています`,
      relatedTable: 'payments',
      relatedRecordId: paymentId
    })
  }, [createNotification])

  /**
   * プロジェクト作成通知
   */
  const notifyProjectCreated = useCallback(async (
    teamMemberIds: string[],
    projectName: string,
    projectId: string
  ) => {
    await createBulkNotifications(
      teamMemberIds,
      'info',
      '新しいプロジェクトが開始されました',
      `${projectName}が開始されました。あなたはチームメンバーに割り当てられています`,
      'projects',
      projectId
    )
  }, [createBulkNotifications])

  // コンポーネントマウント時に通知を読み込む
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // リアルタイム更新を購読
  useEffect(() => {
    if (!currentEmployeeId || demoMode) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `employee_id=eq.${currentEmployeeId}`
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentEmployeeId, demoMode, loadNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    createBulkNotifications,
    // Helper functions for common notification types
    notifyTaskAssignment,
    notifyTaskDeadline,
    notifyTaskOverdue,
    notifyTaskCompletion,
    notifyPaymentReceived,
    notifyPaymentOverdue,
    notifyProjectCreated
  }
}
