export type Role = 'member' | 'leader' | 'manager' | 'executive'

export type Department =
  | '営業'
  | '営業事務'
  | 'ローン事務'
  | '実施設計'
  | '意匠設計'
  | '申請設計'
  | '構造設計'
  | 'IC'
  | '工事'
  | '発注・積算'
  | '工事事務'
  | '外構設計'
  | '外構工事'
  | 'システム開発部'
  | '商品企画部'
  | '広告マーケティング部'
  | 'CS推進部'
  | '不動産事業部'
  | '外構事業部'
  | '経営管理部'
  | '経営企画部'
  | 'その他'

export type VendorCategory =
  | '設計事務所'
  | '構造事務所'
  | '水道業者'
  | '解体業者'
  | '司法書士'
  | '土地家屋調査士'
  | 'その他'

export type ProjectStatus = 'pre_contract' | 'post_contract' | 'construction' | 'completed'

export type PaymentType = 'contract' | 'construction_start' | 'roof_raising' | 'final'

export type PaymentStatus = 'pending' | 'completed' | 'overdue'

export type TaskStatus = 'not_started' | 'requested' | 'completed' | 'not_applicable'

export type TaskPriority = 'low' | 'medium' | 'high'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout'

export type NotificationType = 'delay' | 'payment_overdue' | 'task_assigned'

export interface Employee {
  id: string
  email: string
  name: string
  department: Department
  role: Role
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  name: string
  category: VendorCategory
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  names: string[]
  building_site: string
  phone?: string
  email?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  customer_id: string
  contract_date: string
  construction_start_date?: string
  scheduled_end_date?: string
  actual_end_date?: string
  status: ProjectStatus
  progress_rate: number
  assigned_sales?: string
  assigned_design?: string
  assigned_construction?: string
  created_at: string
  updated_at: string
  customer?: Customer
  sales?: Employee
  design?: Employee
  construction?: Employee
}

export interface Payment {
  id: string
  project_id: string
  payment_type: PaymentType
  amount: number
  scheduled_date?: string
  actual_date?: string
  status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  assigned_to?: string
  due_date?: string
  status: TaskStatus
  priority: TaskPriority
  created_at: string
  updated_at: string
  assigned_employee?: Employee
  dos?: string
  donts?: string
  manual_url?: string
  video_url?: string
}

export interface Attachment {
  id: string
  project_id: string
  task_id?: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  uploaded_by?: string
  created_at: string
  uploader?: Employee
}

export interface AuditLog {
  id: string
  user_id?: string
  action: AuditAction
  table_name?: string
  record_id?: string
  changes?: Record<string, any>
  ip_address?: string
  created_at: string
  user?: Employee
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  related_project_id?: string
  related_task_id?: string
  read: boolean
  created_at: string
  project?: Project
  task?: Task
}
