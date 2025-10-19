/**
 * タスク関連のユーティリティ関数
 */

import { Task, Employee, Project } from '../types/database'
import { isAfter, isBefore, isToday, parseISO, startOfDay, endOfDay, addDays, differenceInDays } from 'date-fns'

/**
 * タスクが遅延しているかチェック
 */
export const isTaskDelayed = (task: Task): boolean => {
  // 既に完了している場合は遅延していない
  if (task.status === 'completed') {
    return false
  }

  // 期限がない場合は遅延していない
  if (!task.due_date) {
    return false
  }

  // 期限が過去の場合は遅延
  const dueDate = parseISO(task.due_date)
  const today = startOfDay(new Date())

  return isBefore(dueDate, today)
}

/**
 * タスクが今日期限かチェック
 */
export const isTaskDueToday = (task: Task): boolean => {
  if (!task.due_date) {
    return false
  }

  const dueDate = parseISO(task.due_date)
  return isToday(dueDate)
}

/**
 * タスクが今週期限かチェック
 */
export const isTaskDueThisWeek = (task: Task): boolean => {
  if (!task.due_date) {
    return false
  }

  const dueDate = parseISO(task.due_date)
  const today = new Date()
  const sevenDaysLater = addDays(today, 7)

  return isAfter(dueDate, today) && isBefore(dueDate, sevenDaysLater)
}

/**
 * 遅延日数を取得
 */
export const getDelayDays = (task: Task): number => {
  if (!isTaskDelayed(task)) {
    return 0
  }

  if (!task.due_date) {
    return 0
  }

  const dueDate = parseISO(task.due_date)
  const today = new Date()

  return differenceInDays(today, dueDate)
}

/**
 * 担当者の遅延タスクを取得
 */
export const getDelayedTasksForEmployee = (employee: Employee, allTasks: Task[]): Task[] => {
  return allTasks.filter(task =>
    task.assigned_to === employee.id && isTaskDelayed(task)
  )
}

/**
 * 担当者の今日期限のタスクを取得
 */
export const getTodayTasksForEmployee = (employee: Employee, allTasks: Task[]): Task[] => {
  return allTasks.filter(task =>
    task.assigned_to === employee.id &&
    isTaskDueToday(task) &&
    task.status !== 'completed'
  )
}

/**
 * 担当者の今週期限のタスクを取得
 */
export const getThisWeekTasksForEmployee = (employee: Employee, allTasks: Task[]): Task[] => {
  return allTasks.filter(task =>
    task.assigned_to === employee.id &&
    isTaskDueThisWeek(task) &&
    task.status !== 'completed'
  )
}

/**
 * 担当者の全タスクを取得（担当案件のみ）
 */
export const getTasksForEmployee = (employee: Employee, allTasks: Task[], myProjects: Project[]): Task[] => {
  const myProjectIds = myProjects.map(p => p.id)
  return allTasks.filter(task =>
    task.assigned_to === employee.id ||
    myProjectIds.includes(task.project_id)
  )
}

/**
 * 部門の遅延タスク数を取得
 */
export const getDelayedTaskCountByDepartment = (
  department: string,
  employees: Employee[],
  allTasks: Task[]
): number => {
  const departmentEmployees = employees.filter(e => e.department === department)
  const employeeIds = departmentEmployees.map(e => e.id)

  return allTasks.filter(task =>
    employeeIds.includes(task.assigned_to || '') && isTaskDelayed(task)
  ).length
}

/**
 * 従業員別の遅延タスク集計
 */
export interface EmployeeDelayStats {
  employee: Employee
  totalTasks: number
  delayedTasks: number
  delayedTaskList: Task[]
}

export const getDelayStatsByEmployee = (
  employees: Employee[],
  allTasks: Task[]
): EmployeeDelayStats[] => {
  return employees.map(employee => {
    const employeeTasks = allTasks.filter(task => task.assigned_to === employee.id)
    const delayedTasks = employeeTasks.filter(task => isTaskDelayed(task))

    return {
      employee,
      totalTasks: employeeTasks.length,
      delayedTasks: delayedTasks.length,
      delayedTaskList: delayedTasks,
    }
  }).filter(stat => stat.totalTasks > 0) // タスクがある従業員のみ
    .sort((a, b) => b.delayedTasks - a.delayedTasks) // 遅延タスクが多い順
}

/**
 * タスクのステータスアイコンを取得
 */
export const getTaskStatusIcon = (task: Task): string => {
  if (isTaskDelayed(task)) {
    return '🔴'
  }

  switch (task.status) {
    case 'completed':
      return '✅'
    case 'requested':
      return '🟡'
    case 'not_started':
      return '⚪'
    default:
      return '⚪'
  }
}

/**
 * タスクのステータス色クラスを取得
 */
export const getTaskStatusColorClass = (task: Task): string => {
  if (isTaskDelayed(task)) {
    return 'task-delayed'
  }

  switch (task.status) {
    case 'completed':
      return 'task-completed'
    case 'requested':
      return 'task-in-progress'
    case 'not_started':
      return 'task-not-started'
    default:
      return 'task-not-started'
  }
}
