import { supabase } from './supabase'
import { differenceInDays, startOfMonth, endOfMonth, format } from 'date-fns'

/**
 * プロジェクト進捗統計を取得
 */
export async function getProjectProgressStats() {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')

    if (error) throw error

    const stats = {
      total: projects?.length || 0,
      preContract: projects?.filter(p => p.status === 'pre_contract').length || 0,
      postContract: projects?.filter(p => p.status === 'post_contract').length || 0,
      construction: projects?.filter(p => p.status === 'construction').length || 0,
      completed: projects?.filter(p => p.status === 'completed').length || 0,
      averageProgress: projects?.reduce((acc, p) => acc + (p.progress_rate || 0), 0) / (projects?.length || 1) || 0
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('Failed to get project progress stats:', error)
    return { data: null, error }
  }
}

/**
 * 部門別タスク完了率を取得
 */
export async function getDepartmentTaskStats() {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_employee:employees(department)
      `)

    if (error) throw error

    const departmentStats: Record<string, { total: number; completed: number; rate: number }> = {}

    tasks?.forEach((task: any) => {
      const dept = task.assigned_employee?.department || '未割当'
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, completed: 0, rate: 0 }
      }
      departmentStats[dept].total++
      if (task.status === 'completed') {
        departmentStats[dept].completed++
      }
    })

    // 完了率を計算
    Object.keys(departmentStats).forEach(dept => {
      departmentStats[dept].rate =
        (departmentStats[dept].completed / departmentStats[dept].total) * 100
    })

    return { data: departmentStats, error: null }
  } catch (error) {
    console.error('Failed to get department task stats:', error)
    return { data: null, error }
  }
}

/**
 * 遅延タスク統計を取得
 */
export async function getDelayedTasksStats() {
  try {
    const today = new Date().toISOString()

    const { data: delayedTasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(
          id,
          customer:customers(names)
        ),
        assigned_employee:employees(last_name, first_name, department)
      `)
      .lt('due_date', today)
      .in('status', ['not_started', 'requested'])

    if (error) throw error

    const stats = {
      total: delayedTasks?.length || 0,
      byDepartment: {} as Record<string, number>,
      byProject: [] as any[],
      averageDelayDays: 0
    }

    let totalDelayDays = 0

    delayedTasks?.forEach((task: any) => {
      const dept = task.assigned_employee?.department || '未割当'
      stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1

      // 遅延日数を計算
      const delayDays = differenceInDays(new Date(), new Date(task.due_date))
      totalDelayDays += delayDays

      stats.byProject.push({
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.due_date,
        delayDays,
        projectId: task.project?.id,
        customerName: task.project?.customer?.names?.[0] || '不明',
        assignedTo: task.assigned_employee
          ? `${task.assigned_employee.last_name} ${task.assigned_employee.first_name}`
          : '未割当'
      })
    })

    stats.averageDelayDays = delayedTasks?.length
      ? totalDelayDays / delayedTasks.length
      : 0

    // 遅延日数でソート
    stats.byProject.sort((a, b) => b.delayDays - a.delayDays)

    return { data: stats, error: null }
  } catch (error) {
    console.error('Failed to get delayed tasks stats:', error)
    return { data: null, error }
  }
}

/**
 * 入金状況サマリーを取得
 */
export async function getPaymentSummary() {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        project:projects(
          id,
          customer:customers(names)
        )
      `)

    if (error) throw error

    const stats = {
      totalScheduled: 0,
      totalReceived: 0,
      pending: 0,
      overdue: 0,
      byType: {} as Record<string, { scheduled: number; received: number }>,
      overduePayments: [] as any[]
    }

    const today = new Date().toISOString()

    payments?.forEach((payment: any) => {
      stats.totalScheduled += payment.amount

      if (payment.status === 'completed') {
        stats.totalReceived += payment.amount
      } else if (payment.status === 'pending') {
        stats.pending += payment.amount

        // 期限切れチェック
        if (payment.scheduled_date && payment.scheduled_date < today) {
          stats.overdue += payment.amount
          stats.overduePayments.push({
            id: payment.id,
            type: payment.payment_type,
            amount: payment.amount,
            scheduledDate: payment.scheduled_date,
            projectId: payment.project?.id,
            customerName: payment.project?.customer?.names?.[0] || '不明'
          })
        }
      }

      // タイプ別集計
      const type = payment.payment_type
      if (!stats.byType[type]) {
        stats.byType[type] = { scheduled: 0, received: 0 }
      }
      stats.byType[type].scheduled += payment.amount
      if (payment.status === 'completed') {
        stats.byType[type].received += payment.amount
      }
    })

    return { data: stats, error: null }
  } catch (error) {
    console.error('Failed to get payment summary:', error)
    return { data: null, error }
  }
}

/**
 * 月次レポートデータを取得
 */
export async function getMonthlyReport(year: number, month: number) {
  try {
    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(new Date(year, month - 1))

    // 当月の新規契約数
    const { data: newContracts, error: contractsError } = await supabase
      .from('projects')
      .select('*')
      .gte('contract_date', format(startDate, 'yyyy-MM-dd'))
      .lte('contract_date', format(endDate, 'yyyy-MM-dd'))

    if (contractsError) throw contractsError

    // 当月の完了プロジェクト数
    const { data: completedProjects, error: completedError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'completed')
      .gte('actual_end_date', format(startDate, 'yyyy-MM-dd'))
      .lte('actual_end_date', format(endDate, 'yyyy-MM-dd'))

    if (completedError) throw completedError

    // 当月のタスク完了数
    const { data: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'completed')
      .gte('actual_completion_date', format(startDate, 'yyyy-MM-dd'))
      .lte('actual_completion_date', format(endDate, 'yyyy-MM-dd'))

    if (tasksError) throw tasksError

    // 当月の入金額
    const { data: monthlyPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('actual_date', format(startDate, 'yyyy-MM-dd'))
      .lte('actual_date', format(endDate, 'yyyy-MM-dd'))

    if (paymentsError) throw paymentsError

    const totalRevenue = monthlyPayments?.reduce((sum, p) => sum + p.amount, 0) || 0

    const report = {
      year,
      month,
      newContracts: newContracts?.length || 0,
      completedProjects: completedProjects?.length || 0,
      completedTasks: completedTasks?.length || 0,
      totalRevenue,
      averageProjectDuration: 0 // TODO: 計算ロジック追加
    }

    return { data: report, error: null }
  } catch (error) {
    console.error('Failed to get monthly report:', error)
    return { data: null, error }
  }
}

/**
 * 従業員別パフォーマンス統計を取得
 */
export async function getEmployeePerformance() {
  try {
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')

    if (empError) throw empError

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')

    if (tasksError) throw tasksError

    const performance = employees?.map(emp => {
      const empTasks = tasks?.filter(t => t.assigned_to === emp.id) || []
      const completed = empTasks.filter(t => t.status === 'completed').length
      const delayed = empTasks.filter(t =>
        t.status !== 'completed' &&
        t.due_date &&
        new Date(t.due_date) < new Date()
      ).length

      return {
        id: emp.id,
        name: `${emp.last_name} ${emp.first_name}`,
        department: emp.department,
        role: emp.role,
        totalTasks: empTasks.length,
        completedTasks: completed,
        delayedTasks: delayed,
        completionRate: empTasks.length > 0 ? (completed / empTasks.length) * 100 : 0
      }
    })

    return { data: performance, error: null }
  } catch (error) {
    console.error('Failed to get employee performance:', error)
    return { data: null, error }
  }
}
