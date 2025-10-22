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
  organization_id?: string // マルチテナント対応
  avatar_url?: string
  created_at: string
  updated_at: string
  branch?: Branch
  organization?: Organization
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
  organization_id?: string // マルチテナント対応
  created_at: string
  updated_at: string
  organization?: Organization
}

export interface Product {
  id: string
  name: string
  category?: string // 規格住宅、注文住宅、リノベーション等
  description?: string
  base_price?: number // 基本価格（参考値）
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  org_type: 'headquarter' | 'franchise'
  org_status: 'active' | 'inactive' | 'suspended'
  settings?: Record<string, any> // JSON設定（ロゴURL、カラーテーマなど）
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  customer_id: string
  organization_id?: string // マルチテナント対応

  // 基本情報
  contract_number?: string
  customer_names?: string[]
  construction_address?: string
  product_id?: string
  sales_staff_id?: string
  design_staff_id?: string
  ic_staff_id?: string
  construction_staff_id?: string
  exterior_staff_id?: string
  implementation_designer?: string
  design_office?: string
  floors?: number
  construction_area?: number // 坪数(施工)

  // スケジュール
  contract_date: string
  design_hearing_date?: string
  plan_finalized_date?: string
  plan_financial_sent_date?: string
  structure_go_date?: string
  application_go_date?: string
  structure_1st_cb_date?: string
  structure_2nd_cb_date?: string
  meeting_available_date?: string
  weekday_web_meeting_campaign?: boolean
  benefits_content?: string
  original_kitchen?: boolean
  original_iron_stairs?: boolean
  ic_benefits_count?: number
  meeting_count?: number
  youtube_recommended?: boolean
  final_meeting_date?: string
  meeting_document_delivery_date?: string
  pre_change_contract_meeting_date?: string
  drawing_upload_date?: string
  structure_drawing_upload_date?: string
  construction_permit_date?: string

  // 融資関連
  long_term_loan?: boolean
  flat_loan?: boolean
  flat_design_notice_required_date?: string
  building_permit_required?: boolean
  building_permit_required_date?: string
  interim_inspection_cert_required?: boolean
  interim_inspection_cert_required_date?: string
  completion_inspection_cert_required?: boolean
  completion_inspection_cert_required_date?: string

  // 解体・土地関連
  demolition?: boolean
  demolition_contractor?: string
  demolition_subsidy?: boolean
  shizume_toufuda?: boolean
  buried_cultural_property_area?: string
  demolition_start_date?: string
  demolition_completion_date?: string
  change_contract_date?: string
  land_settlement_date?: string
  subdivision?: boolean
  subdivision_completion_date?: string
  new_water_connection?: boolean

  // 工事スケジュール
  initial_contract_construction_start_date?: string
  change_contract_construction_start_date?: string
  pre_construction_work?: string
  ground_reinforcement?: boolean
  ground_reinforcement_date?: string
  foundation_start_date?: string
  execution_budget_completion_date?: string
  roof_raising_date?: string
  interim_inspection_date?: string
  pre_completion_inspection_work?: string
  completion_inspection_date?: string
  handover_date?: string
  owner_desired_key_delivery_date?: string
  exterior_work_start_date?: string
  exterior_work_completion_date?: string

  // 進捗・備考
  progress_status?: string
  notes?: string

  // 補助金・融資詳細
  subsidy_type?: string
  long_term_requirements?: string
  gx_requirements?: string
  bank_name?: string
  pre_application_approved?: boolean
  main_application_approved?: boolean

  // 金額
  contract_amount?: number
  application_fee_date?: string
  application_fee_amount?: number
  contract_payment_date?: string
  contract_payment_amount?: number
  construction_start_payment_date?: string
  construction_start_payment_amount?: number
  roof_raising_payment_date?: string
  roof_raising_payment_amount?: number
  final_payment_date?: string
  final_payment_amount?: number
  fire_insurance_amount?: number
  fire_insurance_commission?: number
  fixture_work_commission?: boolean
  fixture_work_commission_amount?: number
  title_registration_commission?: number
  judicial_scrivener_commission?: number

  // 性能値
  c_value?: number
  ua_value?: number
  eta_ac_value?: number
  reduction_rate_no_renewable?: number
  bei_no_renewable?: number
  reduction_rate_renewable_self?: number
  bei_renewable_self?: number
  reduction_rate_renewable_sell?: number
  bei_renewable_sell?: number
  gx_requirements_met?: boolean
  zeh_certified?: boolean

  // 既存フィールド
  floor_plan_confirmed_date?: string
  final_specification_meeting_date?: string
  construction_permission_date?: string
  construction_start_date?: string
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
  version?: number

  // サイドバー設計追加フィールド
  exclude_from_count?: boolean
  solar_panel?: boolean
  solar_kw?: number
  battery?: boolean
  bels?: boolean
  primary_energy_1?: number
  primary_energy_2?: number
  primary_energy_3?: number
  total_floor_area?: number
  gross_profit?: number
  fiscal_year?: string
  product_type?: string

  // リレーション
  customer?: Customer
  product?: Product
  organization?: Organization
  sales?: Employee
  design?: Employee
  construction?: Employee
  sales_staff?: Employee
  design_staff?: Employee
  ic_staff?: Employee
  construction_staff?: Employee
  exterior_staff?: Employee
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
  organization_id?: string // マルチテナント対応
  created_at: string
  updated_at: string
  organization?: Organization
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
  organization_id?: string // マルチテナント対応
  created_at: string
  updated_at: string
  version?: number // 同時編集対応用バージョン番号
  assigned_employee?: Employee
  dos?: string
  donts?: string
  manual_url?: string
  video_url?: string
  task_master_id?: string // タスクマスタとの紐付け
  organization?: Organization
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
  related_task_master_ids?: string[] // 関連タスクマスタのID配列
  created_at: string
  updated_at: string
  trigger?: Trigger // リレーション
  related_tasks?: TaskMaster[] // 関連タスクマスタ（リレーション）
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
  organization_id?: string // マルチテナント対応
  created_at: string
  user?: Employee
  organization?: Organization
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

// 権限管理
export type PermissionCategory = 'project' | 'payment' | 'employee' | 'master' | 'system'

export interface Permission {
  id: string
  name: string // read_projects, write_projects, delete_projects など
  description?: string
  category: PermissionCategory
  created_at: string
}

export interface RolePermission {
  id: string
  role: Role | 'franchise_user' | 'franchise_admin'
  permission_id: string
  created_at: string
  permission?: Permission
}

// リアルタイム同時編集
export type ResourceType = 'project' | 'task' | 'payment' | 'employee' | 'customer'

export interface OnlineUser {
  id: string
  employee_id: string
  page_path: string
  editing_resource_type?: ResourceType
  editing_resource_id?: string
  last_activity_at: string
  created_at: string
  employee?: Employee
}

export interface EditLock {
  id: string
  resource_type: ResourceType
  resource_id: string
  locked_by: string
  locked_at: string
  expires_at: string
  employee?: Employee
}
