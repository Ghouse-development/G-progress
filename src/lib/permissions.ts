/**
 * 権限管理システム
 *
 * 役割:
 * - department_head (部門長): 自部署の全案件を編集可能、他部署は閲覧のみ
 * - leader (リーダー): 自部署の全案件を編集可能、他部署は閲覧のみ
 * - member (メンバー): 自分の担当案件のみ編集可能、他は閲覧のみ
 */

import { Employee, Project, Task } from '../types/database'

/**
 * 従業員が案件を編集できるかチェック
 */
export const canEditProject = (employee: Employee, project: Project): boolean => {
  // 部門長・リーダー: 自部署の全案件を編集可能
  if (employee.role === 'department_head' || employee.role === 'leader') {
    return isProjectInDepartment(employee, project)
  }

  // メンバー: 自分の担当案件のみ編集可能
  if (employee.role === 'member') {
    return isAssignedToProject(employee, project)
  }

  return false
}

/**
 * 従業員が案件を閲覧できるかチェック（全員が全案件を閲覧可能）
 */
export const canViewProject = (employee: Employee, project: Project): boolean => {
  return true // 全案件を閲覧可能
}

/**
 * 従業員がタスクを編集できるかチェック
 */
export const canEditTask = (employee: Employee, task: Task, project: Project): boolean => {
  // プロジェクトの編集権限があれば、タスクも編集可能
  return canEditProject(employee, project)
}

/**
 * 従業員がタスクを閲覧できるかチェック
 */
export const canViewTask = (employee: Employee, task: Task, project: Project): boolean => {
  return canViewProject(employee, project)
}

/**
 * 従業員が従業員管理機能を使用できるかチェック（部門長のみ）
 */
export const canManageEmployees = (employee: Employee): boolean => {
  return employee.role === 'department_head'
}

/**
 * 従業員がタスクマスター管理機能を使用できるかチェック（部門長のみ）
 */
export const canManageTaskMasters = (employee: Employee): boolean => {
  return employee.role === 'department_head'
}

/**
 * 案件が従業員の部署に属しているかチェック
 */
const isProjectInDepartment = (employee: Employee, project: Project): boolean => {
  // 従業員の部署を取得
  const employeeDepartment = getDepartmentGroup(employee.department)

  // 案件の担当者の部署を確認
  if (project.sales?.department && getDepartmentGroup(project.sales.department) === employeeDepartment) {
    return true
  }
  if (project.design?.department && getDepartmentGroup(project.design.department) === employeeDepartment) {
    return true
  }
  if (project.construction?.department && getDepartmentGroup(project.construction.department) === employeeDepartment) {
    return true
  }

  return false
}

/**
 * 従業員が案件の担当者かチェック
 */
const isAssignedToProject = (employee: Employee, project: Project): boolean => {
  return (
    project.assigned_sales === employee.id ||
    project.assigned_design === employee.id ||
    project.assigned_construction === employee.id
  )
}

/**
 * 職種から部門グループを取得
 *
 * 営業部: 営業、営業事務、ローン事務
 * 設計部: 意匠設計、IC、実施設計、構造設計、申請設計
 * 工事部: 工事、工事事務、発注・積算
 * 外構事業部: 外構設計、外構工事
 */
const getDepartmentGroup = (department: string): string => {
  const departmentMap: Record<string, string> = {
    '営業': '営業部',
    '営業事務': '営業部',
    'ローン事務': '営業部',
    '意匠設計': '設計部',
    'IC': '設計部',
    '実施設計': '設計部',
    '構造設計': '設計部',
    '申請設計': '設計部',
    '工事': '工事部',
    '工事事務': '工事部',
    '発注・積算': '工事部',
    '外構設計': '外構事業部',
    '外構工事': '外構事業部',
  }

  return departmentMap[department] || 'その他'
}

/**
 * 担当者が担当している案件を取得
 */
export const getMyProjects = (employee: Employee, allProjects: Project[]): Project[] => {
  return allProjects.filter(project => isAssignedToProject(employee, project))
}

/**
 * 従業員が編集可能な案件を取得
 */
export const getEditableProjects = (employee: Employee, allProjects: Project[]): Project[] => {
  return allProjects.filter(project => canEditProject(employee, project))
}

/**
 * 従業員が閲覧可能な案件を取得（全案件）
 */
export const getViewableProjects = (employee: Employee, allProjects: Project[]): Project[] => {
  return allProjects // 全案件を閲覧可能
}
