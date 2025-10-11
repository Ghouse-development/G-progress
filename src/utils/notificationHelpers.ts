import { supabase } from '../lib/supabase'
import { NotificationType } from '../types/database'

interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type: NotificationType
  relatedProjectId?: string
  relatedTaskId?: string
}

/**
 * 通知を作成する
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        related_project_id: params.relatedProjectId,
        related_task_id: params.relatedTaskId,
        read: false
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Failed to create notification:', error)
    return { success: false, error }
  }
}

/**
 * タスク割当通知を作成
 */
export async function createTaskAssignedNotification(
  assignedUserId: string,
  taskTitle: string,
  projectId: string,
  taskId: string,
  customerName: string
) {
  return createNotification({
    userId: assignedUserId,
    title: '新しいタスクが割り当てられました',
    message: `${customerName} 様の案件で「${taskTitle}」が割り当てられました`,
    type: 'task_assigned',
    relatedProjectId: projectId,
    relatedTaskId: taskId
  })
}

/**
 * タスク遅延通知を作成
 */
export async function createTaskDelayNotification(
  assignedUserId: string,
  taskTitle: string,
  projectId: string,
  taskId: string,
  customerName: string,
  dueDate: string
) {
  return createNotification({
    userId: assignedUserId,
    title: 'タスクの期限が過ぎています',
    message: `${customerName} 様の案件で「${taskTitle}」の期限（${dueDate}）が過ぎています`,
    type: 'delay',
    relatedProjectId: projectId,
    relatedTaskId: taskId
  })
}

/**
 * 支払い遅延通知を作成（プロジェクト担当者に通知）
 */
export async function createPaymentOverdueNotification(
  assignedUserId: string,
  paymentType: string,
  projectId: string,
  customerName: string,
  scheduledDate: string
) {
  const paymentTypeNames: Record<string, string> = {
    contract: '契約金',
    construction_start: '着工金',
    roof_raising: '上棟金',
    final: '最終金'
  }

  return createNotification({
    userId: assignedUserId,
    title: '入金の予定日が過ぎています',
    message: `${customerName} 様の${paymentTypeNames[paymentType] || paymentType}の入金予定日（${scheduledDate}）が過ぎています`,
    type: 'payment_overdue',
    relatedProjectId: projectId
  })
}

/**
 * 複数のユーザーに一斉通知を作成
 */
export async function createBulkNotifications(
  userIds: string[],
  title: string,
  message: string,
  type: NotificationType,
  relatedProjectId?: string,
  relatedTaskId?: string
) {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      related_project_id: relatedProjectId,
      related_task_id: relatedTaskId,
      read: false
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Failed to create bulk notifications:', error)
    return { success: false, error }
  }
}

/**
 * 遅延タスクをチェックして通知を作成（バッチ処理用）
 */
export async function checkAndNotifyDelayedTasks() {
  try {
    // 期限切れで未完了のタスクを取得
    const { data: delayedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        assigned_to,
        project_id,
        project:projects(
          id,
          customer:customers(names)
        )
      `)
      .lt('due_date', new Date().toISOString())
      .in('status', ['not_started', 'requested'])
      .not('assigned_to', 'is', null)

    if (tasksError) throw tasksError

    // 各遅延タスクについて通知を作成
    for (const task of delayedTasks || []) {
      const project = Array.isArray(task.project) ? task.project[0] : task.project
      if (!project || !task.assigned_to) continue

      const customer = Array.isArray(project.customer) ? project.customer[0] : project.customer
      if (!customer) continue

      const customerName = Array.isArray(customer.names)
        ? customer.names[0]
        : customer.names

      await createTaskDelayNotification(
        task.assigned_to,
        task.title,
        task.project_id,
        task.id,
        customerName,
        new Date(task.due_date).toLocaleDateString('ja-JP')
      )
    }

    return { success: true, count: delayedTasks?.length || 0 }
  } catch (error) {
    console.error('Failed to check delayed tasks:', error)
    return { success: false, error }
  }
}

/**
 * 支払い遅延をチェックして通知を作成（バッチ処理用）
 */
export async function checkAndNotifyOverduePayments() {
  try {
    // 予定日を過ぎて未払いの支払いを取得
    const { data: overduePayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_type,
        scheduled_date,
        project_id,
        project:projects(
          id,
          assigned_sales,
          customer:customers(names)
        )
      `)
      .lt('scheduled_date', new Date().toISOString())
      .eq('status', 'pending')

    if (paymentsError) throw paymentsError

    // 各遅延支払いについて通知を作成
    for (const payment of overduePayments || []) {
      const project = Array.isArray(payment.project) ? payment.project[0] : payment.project
      if (!project || !project.assigned_sales) continue

      const customer = Array.isArray(project.customer) ? project.customer[0] : project.customer
      if (!customer) continue

      const customerName = Array.isArray(customer.names)
        ? customer.names[0]
        : customer.names

      await createPaymentOverdueNotification(
        project.assigned_sales,
        payment.payment_type,
        payment.project_id,
        customerName,
        new Date(payment.scheduled_date).toLocaleDateString('ja-JP')
      )
    }

    return { success: true, count: overduePayments?.length || 0 }
  } catch (error) {
    console.error('Failed to check overdue payments:', error)
    return { success: false, error }
  }
}
