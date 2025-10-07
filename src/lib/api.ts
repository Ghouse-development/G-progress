import { supabase } from './supabase'
import { Project, Employee, Customer } from '../types/database'

// 案件一覧を取得（顧客情報と担当者情報を含む）
export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      customer:customers(*),
      sales:assigned_sales(id, name, department),
      design:assigned_design(id, name, department),
      construction:assigned_construction(id, name, department)
    `)
    .order('construction_start_date', { ascending: false, nullsFirst: false })
    .order('contract_date', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }

  return data as unknown as (Project & {
    customer: Customer
    sales: Employee
    design: Employee
    construction: Employee
  })[]
}

// 案件の入金状況を取得
export async function fetchPaymentsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .order('scheduled_date', { ascending: true })

  if (error) {
    console.error('Error fetching payments:', error)
    return []
  }

  return data
}

// 案件のタスクを取得
export async function fetchTasksByProject(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_employee:assigned_to(id, name, department)
    `)
    .eq('project_id', projectId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }

  return data
}
