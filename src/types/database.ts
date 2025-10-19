export type Role = 'president' | 'executive' | 'department_head' | 'leader' | 'member'

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

export type ProjectStatus = 'post_contract' | 'construction' | 'completed'

export type PaymentType =
  | '建築申込金'
  | '契約金'
  | '着工金'
  | '上棟金'
  | '最終金'
  | '追加工事金'
  | '外構'
  | '土地仲介手数料'
  | '土地手付金'
  | '土地残代金'
  | 'その他'

export type PaymentStatus = 'pending' | 'completed' | 'overdue'

export type TaskStatus = 'not_started' | 'requested' | 'delayed' | 'completed' | 'not_applicable'

export type TaskPriority = 'low' | 'medium' | 'high'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout'

export type NotificationType = 'delay' | 'payment_overdue' | 'task_assigned' | 'mention'

export interface Employee {
  id: string
  email: string
  last_name: string
  first_name: string
  department: Department
  role: Role
  branch_id?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  branch?: Branch
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

export interface Product {
  id: string
  name: string
  code?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  customer_id: string
  product_id?: string
  contract_number?: string
  contract_date: string
  floor_plan_confirmed_date?: string
  final_specification_meeting_date?: string
  construction_permission_date?: string
  construction_start_date?: string
  roof_raising_date?: string
  completion_inspection_date?: string
  handover_date?: string
  scheduled_end_date?: string
  actual_end_date?: string
  expected_completion_date?: string
  status: ProjectStatus
  progress_rate: number
  assigned_sales?: string
  assigned_design?: string
  assigned_construction?: string
  created_at: string
  updated_at: string
  version?: number // 同時編集対応用バージョン番号
  // サイドバー設計追加フィールド
  exclude_from_count?: boolean // 完工予定数カウント除外
  solar_panel?: boolean // 太陽光有無
  solar_kw?: number // 太陽光kW数
  battery?: boolean // 蓄電池有無
  ua_value?: number // UA値
  c_value?: number // C値
  total_floor_area?: number // 延床面積（坪）
  gross_profit?: number // 粗利益（税別）
  fiscal_year?: string // 年度（例: "2025"）
  product_type?: string // 商品種別
  contract_amount?: number // 契約金額（税込）
  // リレーション
  customer?: Customer
  product?: Product
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
  scheduled_amount?: number // 予定額
  actual_amount?: number // 実績額
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
  actual_completion_date?: string
  status: TaskStatus
  priority: TaskPriority
  created_at: string
  updated_at: string
  version?: number // 同時編集対応用バージョン番号
  assigned_employee?: Employee
  dos?: string
  donts?: string
  manual_url?: string
  video_url?: string
  task_master_id?: string // タスクマスタとの紐付け
}

export interface TaskMaster {
  id: string
  business_no: number
  task_order: number
  title: string
  description?: string
  phase: string // 集客、営業、契約、設計、工事、管理など
  task_category?: string // C/K/S/J
  importance?: string // A/B/S
  purpose?: string
  dos?: string
  donts?: string
  target?: string
  what?: string
  when_to_do?: string
  responsible_department?: string
  tools?: string
  required_materials?: string
  storage_location?: string
  manual_url?: string
  notes?: string
  days_from_contract?: number // 契約日からの日数（廃止予定）
  days_from_trigger?: number // トリガーからの日数
  trigger_id?: string // トリガーID
  duration_days?: number // 作業期間
  created_at: string
  updated_at: string
  trigger?: Trigger // リレーション
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

export interface Comment {
  id: string
  project_id?: string
  task_id?: string
  user_id: string
  parent_comment_id?: string
  content: string
  mentions: string[]
  created_at: string
  updated_at: string
  edited: boolean
  user?: Employee
  replies?: Comment[]
}

// サイドバー設計追加インターフェース
export interface Branch {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface FiscalYear {
  id: string
  year: string // 例: "2025"
  start_date: string // 例: "2025-08-01"
  end_date: string // 例: "2026-07-31"
  created_at: string
}

export interface Trigger {
  id: string
  name: string // 請負契約日、間取確定日、最終打合せ日、長期GO、変更契約、着工、上棟、完了検査、引き渡し
  created_at: string
  updated_at: string
}
