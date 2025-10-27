import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowUpDown, Filter, Edit2, Trash2, X, Plus, FileDown, FileText } from 'lucide-react'
import Papa from 'papaparse'
import { useToast } from '../contexts/ToastContext'
import { useMode } from '../contexts/ModeContext'
import { useFiscalYear } from '../contexts/FiscalYearContext'
import { useSettings } from '../contexts/SettingsContext'
import { useSimplePermissions } from '../hooks/usePermissions'
import { useAuditLog } from '../hooks/useAuditLog'
import { SkeletonTable } from '../components/ui/Skeleton'
import { generateProjectTasks } from '../utils/taskGenerator'
import { generateDemoProjects, generateDemoEmployees, generateDemoCustomers, generateDemoTasks } from '../utils/demoData'
import { ORGANIZATION_HIERARCHY } from '../constants/organizationHierarchy'

interface ProjectWithRelations extends Project {
  customer?: Customer
  sales?: Employee
  design?: Employee
  ic?: Employee
  construction?: Employee
  exterior?: Employee
  tasks?: Task[]
}

// 部署のタスク遅延状態
interface DepartmentStatus {
  department: '営業部' | '設計部' | '工事部' | '外構事業部'
  status: 'ontrack' | 'warning' | 'delayed'
  delayedTasks: number
  totalTasks: number
}

type SortField = 'contract_date' | 'construction_start_date' | 'progress_rate' | 'delayed_tasks' | 'customer_name'
type FilterStatus = 'not_started' | 'requested' | 'delayed' | 'completed'

export default function ProjectList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { mode, setMode } = useMode()
  const { selectedYear } = useFiscalYear()
  const { demoMode } = useSettings()
  const { canWrite, canDelete } = useSimplePermissions()
  const { logCreate, logUpdate, logDelete } = useAuditLog()
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('construction_start_date')
  const [sortAscending, setSortAscending] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus | 'all'>('all')
  const [constructionFilter, setConstructionFilter] = useState<'all' | 'pre' | 'post'>('all')
  const [viewMode, setViewMode] = useState<'matrix'>('matrix')

  // モーダル管理
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithRelations | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTaskProject, setSelectedTaskProject] = useState<ProjectWithRelations | null>(null)
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [taskAuditLogs, setTaskAuditLogs] = useState<any[]>([])
  const [taskComments, setTaskComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')

  // 従業員データ
  const [employees, setEmployees] = useState<Employee[]>([])
  const [taskMasters, setTaskMasters] = useState<any[]>([])

  // フォームデータ
  const [formData, setFormData] = useState({
    contractNumber: '',
    customerNames: '',
    buildingSite: '',
    contractDate: format(new Date(), 'yyyy-MM-dd'),
    floorPlanConfirmedDate: '',
    finalSpecificationMeetingDate: '',
    constructionPermissionDate: '',
    constructionStartDate: '',
    roofRaisingDate: '',
    completionInspectionDate: '',
    handoverDate: '',
    status: 'post_contract' as Project['status'],
    progressRate: 0,
    assignedSales: '',
    assignedDesign: '',
    assignedConstruction: ''
  })

  useEffect(() => {
    loadCurrentUser()
    loadEmployees()
    loadTaskMasters()
  }, []) //初回のみ読み込み

  useEffect(() => {
    loadProjects()
  }, [mode, currentUserId, selectedYear]) // モード、ユーザーID、年度が変更されたら再読み込み

  // リアルタイム更新: projects, customers, tasksテーブルの変更を監視
  useEffect(() => {
    // Supabase Realtimeチャンネルをセットアップ（複数テーブル監視）
    const channel = supabase
      .channel('project-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE すべてのイベント
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          // Realtime project change
          loadProjects() // プロジェクトデータを再読み込み（ローディング表示なし）
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          // Realtime customer change
          loadProjects() // 顧客データ変更時もプロジェクトを再読み込み
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          // Realtime task change
          loadProjects() // タスク変更は部門ステータスに影響するため再読み込み
        }
      )
      .subscribe()

    // クリーンアップ: コンポーネントのアンマウント時にサブスクリプション解除
    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // 初回のみチャンネルをセットアップ

  const loadCurrentUser = async () => {
    const savedUserId = localStorage.getItem('currentUserId')
    if (savedUserId) {
      setCurrentUserId(savedUserId)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('email', user.email)
          .single()

        if (employee) {
          setCurrentUserId(employee.id)
          return
        }
      }
    } catch (error) {
      // Supabase auth not configured, using default user
    }

    setCurrentUserId('1')
    localStorage.setItem('currentUserId', '1')
  }

  const loadEmployees = async () => {
    // デモモードの場合はサンプルデータを使用
    if (demoMode) {
      setEmployees(generateDemoEmployees())
      return
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('last_name')

    if (error) {
      console.error('従業員の読み込みに失敗:', error)
      toast.error('従業員情報の読み込みに失敗しました')
      return
    }

    if (data) {
      setEmployees(data as Employee[])
    }
  }

  const loadTaskMasters = async () => {
    const { data, error } = await supabase
      .from('task_masters')
      .select('*')
      .eq('show_in_progress', true)
      .order('task_order', { ascending: true })

    if (error) {
      console.error('タスクマスタの読み込みに失敗:', error)
      toast.error('タスクマスタの読み込みに失敗しました')
      return
    }

    if (data) {
      setTaskMasters(data)
    }
  }

  const loadProjects = async () => {
    try {
      setLoading(true)

      // デモモードの場合はサンプルデータを使用
      if (demoMode) {
        const demoProjects = generateDemoProjects(mode as 'my_tasks' | 'branch' | 'admin')
        const demoCustomers = generateDemoCustomers()
        const demoEmployees = generateDemoEmployees()
        const demoTasks = generateDemoTasks(mode as 'my_tasks' | 'branch' | 'admin')

        // プロジェクトにリレーションデータを結合
        const projectsWithRelations: ProjectWithRelations[] = demoProjects.map(project => {
          const customer = demoCustomers.find(c => c.id === project.customer_id) || undefined
          const sales = demoEmployees.find(e => e.id === project.sales_staff_id) || demoEmployees.find(e => e.department === '営業') || undefined
          const design = demoEmployees.find(e => e.id === project.design_staff_id) || demoEmployees.find(e => e.department === '意匠設計') || undefined
          const ic = demoEmployees.find(e => e.id === project.ic_staff_id) || demoEmployees.find(e => e.department === 'IC') || undefined
          const construction = demoEmployees.find(e => e.id === project.construction_staff_id) || demoEmployees.find(e => e.department === '工事') || undefined
          const exterior = demoEmployees.find(e => e.id === project.exterior_staff_id) || demoEmployees.find(e => e.department === '外構工事') || undefined
          const tasks = demoTasks.filter(t => t.project_id === project.id)

          return {
            ...project,
            customer,
            sales,
            design,
            ic,
            construction,
            exterior,
            tasks
          }
        })

        setProjects(projectsWithRelations)
        setAllTasks(demoTasks)
        setLoading(false)
        return
      }

      // 通常モード：Supabaseからデータを取得
      // 担当者モードの場合、自分が担当する案件のみ
      let query = supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:employees!projects_sales_staff_id_fkey(id, last_name, first_name, department),
          design:employees!projects_design_staff_id_fkey(id, last_name, first_name, department),
          ic:employees!projects_ic_staff_id_fkey(id, last_name, first_name, department),
          construction:employees!projects_construction_staff_id_fkey(id, last_name, first_name, department),
          exterior:employees!projects_exterior_staff_id_fkey(id, last_name, first_name, department)
        `)

      // 年度フィルタ（fiscal_yearがnullの場合も含める）
      if (selectedYear) {
        query = query.or(`fiscal_year.eq.${selectedYear},fiscal_year.is.null`)
      }

      if (mode === 'staff' && currentUserId) {
        query = query.or(`sales_staff_id.eq.${currentUserId},design_staff_id.eq.${currentUserId},ic_staff_id.eq.${currentUserId},construction_staff_id.eq.${currentUserId},exterior_staff_id.eq.${currentUserId}`)
      }

      const { data: projectsData, error: projectsError } = await query.order('contract_date', { ascending: false })

      if (projectsError) {
        console.error('案件の取得に失敗:', projectsError)
        toast.error('案件データの読み込みに失敗しました')
        return
      }

      if (projectsData) {
        const projectsWithTasks = await Promise.all(
          projectsData.map(async (project) => {
            const { data: tasks, error: tasksError } = await supabase
              .from('tasks')
              .select(`
                *,
                task_master:task_masters!tasks_task_master_id_fkey(show_in_progress)
              `)
              .eq('project_id', project.id)

            if (tasksError) {
              console.error('タスクの取得に失敗:', tasksError)
            }

            // show_in_progressがtrueのタスクのみ表示（案件一覧の進捗用）
            const filteredTasks = (tasks || []).filter((task: any) =>
              task.task_master?.show_in_progress === true
            )

            return {
              ...project,
              tasks: filteredTasks
            } as ProjectWithRelations
          })
        )

        setProjects(projectsWithTasks)

        // 全タスクを取得（進捗マトリクス用）
        const projectIds = projectsData.map(p => p.id)
        if (projectIds.length > 0) {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select(`
              *,
              task_master:task_masters!tasks_task_master_id_fkey(show_in_progress)
            `)
            .in('project_id', projectIds)

          if (tasksError) {
            console.error('全タスクの取得に失敗:', tasksError)
          }

          if (tasksData) {
            // show_in_progressがtrueのタスクのみ表示
            const filteredTasks = (tasksData || []).filter((task: any) =>
              task.task_master?.show_in_progress === true
            )
            setAllTasks(filteredTasks as Task[])
          }
        } else {
          setAllTasks([])
        }
      }
    } catch (error) {
      console.error('予期しないエラー:', error)
      toast.error('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // タスクステータス更新
  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'not_started' | 'requested' | 'delayed' | 'completed') => {
    try {
      const updateData: any = { status: newStatus }

      // 完了に変更する場合、実績完了日を自動記録
      if (newStatus === 'completed') {
        updateData.actual_completion_date = format(new Date(), 'yyyy-MM-dd')
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error

      toast.success('ステータスを更新しました')

      // selectedTaskを更新
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus, actual_completion_date: updateData.actual_completion_date })
      }

      // プロジェクトリストを再読み込み
      loadProjects()
    } catch (error) {
      // Failed to update task status
      toast.error('ステータスの更新に失敗しました')
    }
  }

  // タスクの変更履歴を取得
  const loadTaskAuditLogs = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:employees(id, last_name, first_name, department)
        `)
        .eq('table_name', 'tasks')
        .eq('record_id', taskId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setTaskAuditLogs(data || [])
    } catch (error) {
      // Failed to load audit logs
      setTaskAuditLogs([])
    }
  }

  // タスクのコメントを取得
  const loadTaskComments = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:employees(id, last_name, first_name, department)
        `)
        .eq('task_id', taskId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTaskComments(data || [])
    } catch (error) {
      // Failed to load comments
      setTaskComments([])
    }
  }

  // コメント追加
  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return

    try {
      const currentUserId = localStorage.getItem('currentUserId') || '1'

      const { error } = await supabase
        .from('comments')
        .insert({
          task_id: selectedTask.id,
          user_id: currentUserId,
          content: newComment,
          mentions: []
        })

      if (error) throw error

      toast.success('コメントを追加しました')
      setNewComment('')
      await loadTaskComments(selectedTask.id)
    } catch (error) {
      // Failed to add comment
      toast.error('コメントの追加に失敗しました')
    }
  }

  // 期限日更新
  const handleUpdateDueDate = async (newDueDate: string) => {
    if (!selectedTask) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', selectedTask.id)

      if (error) throw error

      toast.success('期限日を更新しました')
      setSelectedTask({ ...selectedTask, due_date: newDueDate })
      setEditingDueDate(false)
      loadProjects()
    } catch (error) {
      // Failed to update due date
      toast.error('期限日の更新に失敗しました')
    }
  }

  // 部署名から職種を取得するヘルパー関数
  const getPositionsForDepartment = (deptName: string): string[] => {
    const dept = ORGANIZATION_HIERARCHY.find(d => d.name === deptName)
    return dept ? dept.positions : []
  }

  const getDepartmentStatus = (project: ProjectWithRelations): DepartmentStatus[] => {
    return ORGANIZATION_HIERARCHY.map(dept => {
      const deptTasks = (project.tasks || []).filter(task => {
        const taskPosition = task.description?.split(':')[0]?.trim()
        return dept.positions.includes(taskPosition || '')
      })

      const delayedTasks = deptTasks.filter(task => {
        if (!task.due_date) return false
        if (task.status === 'completed') return false
        const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
        return daysOverdue > 0
      })

      const delayedCount = delayedTasks.length
      const totalCount = deptTasks.length

      let status: 'ontrack' | 'warning' | 'delayed' = 'ontrack'
      if (delayedCount === 0) {
        status = 'ontrack'
      } else if (delayedCount <= 2) {
        status = 'warning'
      } else {
        status = 'delayed'
      }

      return {
        department: dept.name as DepartmentStatus['department'],
        status,
        delayedTasks: delayedCount,
        totalTasks: totalCount
      }
    })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ontrack': return 'bg-blue-500'
      case 'warning': return 'bg-yellow-500'
      case 'delayed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'post_contract': return '契約後'
      case 'construction': return '着工後'
      case 'completed': return '引き渡し済'
      default: return status
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'post_contract': return 'bg-blue-200 text-blue-900'
      case 'construction': return 'bg-orange-200 text-orange-900'
      case 'completed': return 'bg-green-200 text-green-900'
      default: return 'bg-gray-200 text-gray-800'
    }
  }

  // ソート＆フィルタ処理
  const getSortedAndFilteredProjects = () => {
    let filtered = [...projects]

    if (filterStatus === 'not_started') {
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'not_started')
      })
    } else if (filterStatus === 'requested') {
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'requested')
      })
    } else if (filterStatus === 'delayed') {
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'delayed')
      })
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'completed')
      })
    }

    filtered.sort((a, b) => {
      let compareValue = 0

      switch (sortField) {
        case 'contract_date':
          compareValue = new Date(a.contract_date).getTime() - new Date(b.contract_date).getTime()
          break
        case 'construction_start_date':
          const aDate = a.construction_start_date ? new Date(a.construction_start_date).getTime() : 0
          const bDate = b.construction_start_date ? new Date(b.construction_start_date).getTime() : 0
          compareValue = aDate - bDate
          break
        case 'progress_rate':
          compareValue = a.progress_rate - b.progress_rate
          break
        case 'delayed_tasks':
          const aDelayed = getDepartmentStatus(a).reduce((sum, dept) => sum + dept.delayedTasks, 0)
          const bDelayed = getDepartmentStatus(b).reduce((sum, dept) => sum + dept.delayedTasks, 0)
          compareValue = aDelayed - bDelayed
          break
        case 'customer_name':
          const aName = a.customer?.names?.join('') || ''
          const bName = b.customer?.names?.join('') || ''
          compareValue = aName.localeCompare(bName, 'ja')
          break
      }

      return sortAscending ? compareValue : -compareValue
    })

    return filtered
  }

  const displayProjects = getSortedAndFilteredProjects()

  // 進捗マトリクス用のヘルパー関数（タスクマスタ順）
  const getAllUniqueTasks = () => {
    // タスクマスタの順番でタスクタイトルを返す
    return taskMasters.map(tm => tm.title)
  }

  const getProjectTaskByTitle = (projectId: string, taskTitle: string): Task | null => {
    const task = allTasks.find(t =>
      t.project_id === projectId &&
      t.title === taskTitle
    )
    return task || null
  }

  const getTaskStatusColor = (task: Task) => {
    if (task.status === 'not_applicable' || task.status === 'completed') {
      return 'bg-blue-100 text-blue-900 border border-blue-300'
    }

    if (task.due_date) {
      const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
      if (daysOverdue > 0) {
        return 'bg-red-400 text-white border-2 border-red-600 font-bold'
      }
    }

    if (task.status === 'delayed') {
      return 'bg-red-400 text-white border-2 border-red-600 font-bold'
    }

    if (task.status === 'requested') {
      return 'bg-yellow-100 text-yellow-900 border border-yellow-300'
    }

    return 'bg-gray-100 text-gray-900 border border-gray-300'
  }

  const uniqueTaskTitles = getAllUniqueTasks()

  // 着工前/後フィルタリング
  const filteredProjectsForMatrix = displayProjects.filter(project => {
    if (constructionFilter === 'all') return true
    if (constructionFilter === 'pre') {
      return project.status === 'post_contract'
    }
    if (constructionFilter === 'post') {
      return project.status === 'construction' || project.status === 'completed'
    }
    return true
  })

  // 案件作成
  const handleCreateProject = async () => {
    if (!formData.customerNames.trim() || !formData.buildingSite.trim()) {
      toast.warning('顧客名と建設地は必須です')
      return
    }

    // 契約番号の重複チェック
    if (formData.contractNumber.trim()) {
      const { data: existingProjects, error: checkError } = await supabase
        .from('projects')
        .select('id, contract_number')
        .eq('contract_number', formData.contractNumber.trim())
        .limit(1)

      if (checkError) {
        console.error('契約番号の確認に失敗:', checkError)
        toast.error('契約番号の確認に失敗しました')
        return
      }

      if (existingProjects && existingProjects.length > 0) {
        toast.warning(`契約番号「${formData.contractNumber}」は既に使用されています`)
        return
      }
    }

    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          names: formData.customerNames.split('・').map(n => n.trim()),
          building_site: formData.buildingSite
        })
        .select()
        .single()

      if (customerError) {
        console.error('顧客の作成に失敗:', customerError)
        toast.error('顧客の作成に失敗しました')
        return
      }

      const { data: project, error: projectError} = await supabase
        .from('projects')
        .insert({
          customer_id: customer.id,
          contract_number: formData.contractNumber.trim() || null,
          contract_date: formData.contractDate,
          floor_plan_confirmed_date: formData.floorPlanConfirmedDate || null,
          final_specification_meeting_date: formData.finalSpecificationMeetingDate || null,
          construction_permission_date: formData.constructionPermissionDate || null,
          construction_start_date: formData.constructionStartDate || null,
          roof_raising_date: formData.roofRaisingDate || null,
          completion_inspection_date: formData.completionInspectionDate || null,
          handover_date: formData.handoverDate || null,
          status: formData.status,
          progress_rate: formData.progressRate,
          sales_staff_id: formData.assignedSales.trim() || null,
          design_staff_id: formData.assignedDesign.trim() || null,
          construction_staff_id: formData.assignedConstruction.trim() || null
        })
        .select()
        .single()

      if (projectError) {
        console.error('案件の作成に失敗:', projectError)
        toast.error('案件の作成に失敗しました')
        return
      }

      // 🚀 タスクマスタから45個のタスクを自動生成
      const taskResult = await generateProjectTasks(
        project.id,
        formData.contractDate,
        formData.assignedSales || undefined,
        formData.assignedDesign || undefined,
        formData.assignedConstruction || undefined
      )

      // タスク自動生成完了

      // 監査ログを記録
      await logCreate(
        'projects',
        project.id,
        {
          customer_names: customer.names.join('・'),
          building_site: customer.building_site,
          contract_date: project.contract_date,
          status: project.status
        },
        `案件「${customer.names.join('・')}様邸」を作成しました`
      )

      await loadProjects()
      setShowCreateModal(false)
      resetForm()
      toast.success(`案件を作成しました（${taskResult.tasksCount || 0}個のタスクを自動生成）`)
    } catch (error) {
      console.error('予期しないエラー:', error)
      toast.error('案件の作成に失敗しました')
    }
  }

  // 案件編集
  const handleEditProject = async () => {
    if (!editingProject || !formData.customerNames.trim() || !formData.buildingSite.trim()) {
      toast.warning('顧客名と建設地は必須です')
      return
    }

    try {
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          names: formData.customerNames.split('・').map(n => n.trim()),
          building_site: formData.buildingSite
        })
        .eq('id', editingProject.customer_id)

      if (customerError) {
        console.error('顧客の更新に失敗:', customerError)
        toast.error('顧客の更新に失敗しました')
        return
      }

      const { error: projectError } = await supabase
        .from('projects')
        .update({
          contract_date: formData.contractDate,
          floor_plan_confirmed_date: formData.floorPlanConfirmedDate || null,
          final_specification_meeting_date: formData.finalSpecificationMeetingDate || null,
          construction_permission_date: formData.constructionPermissionDate || null,
          construction_start_date: formData.constructionStartDate || null,
          roof_raising_date: formData.roofRaisingDate || null,
          completion_inspection_date: formData.completionInspectionDate || null,
          handover_date: formData.handoverDate || null,
          status: formData.status,
          progress_rate: formData.progressRate,
          sales_staff_id: formData.assignedSales.trim() || null,
          design_staff_id: formData.assignedDesign.trim() || null,
          construction_staff_id: formData.assignedConstruction.trim() || null
        })
        .eq('id', editingProject.id)

      if (projectError) {
        console.error('案件の更新に失敗:', projectError)
        toast.error('案件の更新に失敗しました')
        return
      }

      // 監査ログを記録
      await logUpdate(
        'projects',
        editingProject.id,
        {
          customer_names: editingProject.customer?.names?.join('・'),
          status: editingProject.status,
          progress_rate: editingProject.progress_rate
        },
        {
          customer_names: formData.customerNames,
          status: formData.status,
          progress_rate: formData.progressRate
        },
        `案件「${formData.customerNames}様邸」を更新しました`
      )

      await loadProjects()
      setShowEditModal(false)
      setEditingProject(null)
      resetForm()
      toast.success('案件を更新しました')
    } catch (error) {
      console.error('予期しないエラー:', error)
      toast.error('案件の更新に失敗しました')
    }
  }

  // 案件削除
  const handleDeleteProject = async () => {
    if (!deletingProjectId) return

    try {
      // 削除前にプロジェクト情報を取得
      const projectToDelete = projects.find(p => p.id === deletingProjectId)

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingProjectId)

      if (error) {
        console.error('案件の削除に失敗:', error)
        toast.error('案件の削除に失敗しました')
        return
      }

      // 監査ログを記録
      if (projectToDelete) {
        await logDelete(
          'projects',
          deletingProjectId,
          {
            customer_names: projectToDelete.customer?.names?.join('・'),
            contract_date: projectToDelete.contract_date,
            status: projectToDelete.status
          },
          `案件「${projectToDelete.customer?.names?.join('・')}様邸」を削除しました`
        )
      }

      await loadProjects()
      setShowDeleteDialog(false)
      setDeletingProjectId(null)
      toast.success('案件を削除しました')
    } catch (error) {
      console.error('予期しないエラー:', error)
      toast.error('案件の削除に失敗しました')
    }
  }

  // CSV出力
  const exportToCSV = () => {
    try {
      const sortedProjects = getSortedAndFilteredProjects()

      const csvData = sortedProjects.map((project: ProjectWithRelations) => {
        const customerName = project.customer?.names?.join('・') || '不明'
        const contractDate = project.contract_date ? format(new Date(project.contract_date), 'yyyy/MM/dd') : '-'

        const statusLabels: Record<string, string> = {
          pre_contract: '契約前',
          post_contract: '契約後',
          construction: '施工中',
          completed: '完了'
        }
        const statusLabel = statusLabels[project.status] || project.status

        const progressRate = project.progress_rate ? `${project.progress_rate}%` : '0%'

        const delayedTasks = project.tasks?.filter((t: Task) => {
          if (t.status === 'completed') return false
          if (!t.due_date) return false
          return differenceInDays(new Date(), new Date(t.due_date)) > 0
        }).length || 0

        const deptStatuses = getDepartmentStatus(project)
        const salesStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '営業部')?.status || 'ontrack'
        const designStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '設計部')?.status || 'ontrack'
        const constructionStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '工事部')?.status || 'ontrack'
        const exteriorStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '外構事業部')?.status || 'ontrack'

        const statusLabelsIcon: Record<string, string> = {
          ontrack: '○',
          warning: '△',
          delayed: '×'
        }

        return {
          '案件名': customerName,
          '契約日': contractDate,
          'ステータス': statusLabel,
          '進捗率': progressRate,
          '遅延タスク数': delayedTasks,
          '営業部': statusLabelsIcon[salesStatus],
          '設計部': statusLabelsIcon[designStatus],
          '工事部': statusLabelsIcon[constructionStatus],
          '外構事業部': statusLabelsIcon[exteriorStatus]
        }
      })

      const csv = Papa.unparse(csvData)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const filename = `全案件進捗マトリクス_${selectedYear}年度_${format(new Date(), 'yyyyMMdd')}.csv`
      link.download = filename
      link.click()

      toast.success('CSVを出力しました')
    } catch (error) {
      console.error('CSV出力エラー:', error)
      toast.error('CSV出力に失敗しました')
    }
  }

  // PDF出力
  const exportToPDF = async () => {
    try {
      // 動的インポート
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // 日本語フォント設定
      doc.addFont('https://cdn.jsdelivr.net/npm/ipafont@1.0.2/ipag.ttf', 'IPAGothic', 'normal')
      doc.setFont('IPAGothic')

      // タイトル
      doc.setFontSize(18)
      doc.text('全案件進捗マトリクス', 14, 15)

      // 日付
      doc.setFontSize(10)
      doc.text(`出力日: ${format(new Date(), 'yyyy年M月d日 (E)', { locale: ja })}`, 14, 22)
      doc.text(`年度: ${selectedYear}年度`, 14, 27)

      // テーブルデータを作成
      const sortedProjects = getSortedAndFilteredProjects()
      const tableData = sortedProjects.map((project: ProjectWithRelations) => {
        const customerName = project.customer?.names?.join('・') || '不明'
        const contractDate = project.contract_date ? format(new Date(project.contract_date), 'yyyy/MM/dd', { locale: ja }) : '-'

        // ステータスラベル
        const statusLabels: Record<string, string> = {
          pre_contract: '契約前',
          post_contract: '契約後',
          construction: '施工中',
          completed: '完了'
        }
        const statusLabel = statusLabels[project.status] || project.status

        // 進捗率
        const progressRate = project.progress_rate ? `${project.progress_rate}%` : '0%'

        // 遅延タスク数
        const delayedTasks = project.tasks?.filter((t: Task) => {
          if (t.status === 'completed') return false
          if (!t.due_date) return false
          return differenceInDays(new Date(), new Date(t.due_date)) > 0
        }).length || 0

        // 部署別ステータス
        const deptStatuses = getDepartmentStatus(project)
        const salesStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '営業部')?.status || 'ontrack'
        const designStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '設計部')?.status || 'ontrack'
        const constructionStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '工事部')?.status || 'ontrack'
        const exteriorStatus = deptStatuses.find((d: DepartmentStatus) => d.department === '外構事業部')?.status || 'ontrack'

        const statusIcons: Record<string, string> = {
          ontrack: '○',
          warning: '△',
          delayed: '×'
        }

        return [
          customerName,
          contractDate,
          statusLabel,
          progressRate,
          delayedTasks.toString(),
          statusIcons[salesStatus],
          statusIcons[designStatus],
          statusIcons[constructionStatus],
          statusIcons[exteriorStatus]
        ]
      })

      // テーブル作成
      autoTable(doc, {
        startY: 32,
        head: [[
          '案件名',
          '契約日',
          'ステータス',
          '進捗率',
          '遅延',
          '営業部',
          '設計部',
          '工事部',
          '外構'
        ]],
        body: tableData,
        styles: {
          font: 'IPAGothic',
          fontSize: 9,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 50 },  // 案件名
          1: { cellWidth: 25 },  // 契約日
          2: { cellWidth: 20 },  // ステータス
          3: { cellWidth: 18 },  // 進捗率
          4: { cellWidth: 15 },  // 遅延
          5: { cellWidth: 18 },  // 営業部
          6: { cellWidth: 18 },  // 設計部
          7: { cellWidth: 18 },  // 工事部
          8: { cellWidth: 18 }   // 外構
        },
        margin: { top: 32, left: 14, right: 14 }
      })

      // PDF保存
      const filename = `全案件進捗マトリクス_${selectedYear}年度_${format(new Date(), 'yyyyMMdd')}.pdf`
      doc.save(filename)

      toast.success('PDFを出力しました')
    } catch (error) {
      console.error('PDF出力エラー:', error)
      toast.error('PDF出力に失敗しました')
    }
  }

  // フォームリセット
  const resetForm = () => {
    setFormData({
      contractNumber: '',
      customerNames: '',
      buildingSite: '',
      contractDate: format(new Date(), 'yyyy-MM-dd'),
      floorPlanConfirmedDate: '',
      finalSpecificationMeetingDate: '',
      constructionPermissionDate: '',
      constructionStartDate: '',
      roofRaisingDate: '',
      completionInspectionDate: '',
      handoverDate: '',
      status: 'post_contract',
      progressRate: 0,
      assignedSales: '',
      assignedDesign: '',
      assignedConstruction: ''
    })
  }

  // 編集モーダルを開く
  const openEditModal = (project: ProjectWithRelations) => {
    setEditingProject(project)
    setFormData({
      contractNumber: project.contract_number || '',
      customerNames: project.customer?.names?.join('・') || '',
      buildingSite: project.customer?.building_site || '',
      contractDate: project.contract_date,
      floorPlanConfirmedDate: project.floor_plan_confirmed_date || '',
      finalSpecificationMeetingDate: project.final_specification_meeting_date || '',
      constructionPermissionDate: project.construction_permission_date || '',
      constructionStartDate: project.construction_start_date || '',
      roofRaisingDate: project.roof_raising_date || '',
      completionInspectionDate: project.completion_inspection_date || '',
      handoverDate: project.handover_date || '',
      status: project.status,
      progressRate: project.progress_rate,
      assignedSales: project.assigned_sales || '',
      assignedDesign: project.assigned_design || '',
      assignedConstruction: project.assigned_construction || ''
    })
    setShowEditModal(true)
  }

  // 削除確認ダイアログを開く
  const openDeleteDialog = (projectId: string) => {
    setDeletingProjectId(projectId)
    setShowDeleteDialog(true)
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* ヘッダースケルトン */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-12 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          {/* ツールバースケルトン */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        {/* テーブルスケルトン */}
        <SkeletonTable rows={10} columns={14} />
      </div>
    )
  }

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">案件一覧</h1>
        <div className="prisma-header-actions">
          <button
            onClick={exportToCSV}
            className="prisma-btn prisma-btn-secondary prisma-btn-sm"
            title="全案件進捗マトリクスをCSV出力"
          >
            <FileText size={16} />
            CSV出力
          </button>
          <button
            onClick={exportToPDF}
            className="prisma-btn prisma-btn-secondary prisma-btn-sm"
            title="全案件進捗マトリクスをPDF出力"
          >
            <FileDown size={16} />
            PDF出力
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="prisma-btn prisma-btn-primary prisma-btn-sm"
          >
            <Plus size={16} />
            新規案件追加
          </button>
        </div>
      </div>

      <div className="prisma-content p-3 pb-0">
        {/* 進捗マトリクス表示 */}
        <div className="prisma-card overflow-hidden mb-0">
          {/* マトリクスヘッダー */}
          <div className="prisma-card-header p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* 左側：タイトルと並び順・絞込 */}
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="prisma-card-title text-lg mb-0">全案件進捗マトリクス</h3>

                {/* 並び順 */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown size={16} className="text-gray-600" />
                  <span className="text-gray-700 text-base">並び:</span>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="prisma-select w-auto"
                  >
                    <option value="contract_date">契約日順</option>
                    <option value="construction_start_date">着工日順</option>
                    <option value="progress_rate">進捗率順</option>
                    <option value="delayed_tasks">遅延件数順</option>
                    <option value="customer_name">顧客名順</option>
                  </select>
                  <button
                    onClick={() => setSortAscending(!sortAscending)}
                    className="prisma-btn prisma-btn-secondary prisma-btn-sm"
                  >
                    {sortAscending ? '昇順 ↑' : '降順 ↓'}
                  </button>
                </div>

                {/* 絞込 */}
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-600" />
                  <span className="text-gray-700 text-base">絞込:</span>
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`prisma-btn prisma-btn-sm ${
                      filterStatus === 'all' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                    }`}
                  >
                    全て ({projects.length})
                  </button>
                </div>
              </div>

              {/* 右側：着工フィルタ */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setConstructionFilter('pre')}
                  className={`prisma-btn ${
                    constructionFilter === 'pre' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  } text-base px-4 py-2.5 min-h-[44px]`}
                >
                  着工前 ({displayProjects.filter(p => p.status === 'post_contract').length})
                </button>
                <button
                  onClick={() => setConstructionFilter('post')}
                  className={`prisma-btn ${
                    constructionFilter === 'post' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  } text-base px-4 py-2.5 min-h-[44px]`}
                >
                  着工後 ({displayProjects.filter(p => p.status === 'construction' || p.status === 'completed').length})
                </button>
              </div>
            </div>
          </div>

          {/* マトリクステーブル */}
          <div className="prisma-table-container" style={{
            maxHeight: 'calc(100vh - 400px)',
            maxWidth: '100%',
            overflowX: 'auto',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'auto', // Firefox: スクロールバーを常時表示
            msOverflowStyle: 'scrollbar' // IE/Edge: スクロールバーを常時表示
          }}>
            <style>{`
              .prisma-table-container::-webkit-scrollbar {
                height: 12px;
                width: 12px;
              }
              .prisma-table-container::-webkit-scrollbar-track {
                background: #f1f1f1;
              }
              .prisma-table-container::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 6px;
              }
              .prisma-table-container::-webkit-scrollbar-thumb:hover {
                background: #555;
              }
            `}</style>
            <table className="prisma-table" style={{ minWidth: 'max-content', width: 'max-content', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead className="bg-gray-100">
                <tr>
                  <th className="bg-gray-100 border border-gray-200 border-r-2 border-r-gray-400 text-left font-semibold shadow-sm" style={{ position: 'sticky', top: 0, left: 0, zIndex: 50, minWidth: '200px', width: '200px', padding: '12px 8px', fontSize: '13px' }}>
                    案件名
                  </th>
                  <th className="bg-gray-100 border border-gray-200 border-r-2 border-r-gray-400 text-center font-semibold shadow-sm" style={{ position: 'sticky', top: 0, left: '200px', zIndex: 50, minWidth: '110px', width: '110px', padding: '12px 8px', fontSize: '13px' }}>
                    営業
                  </th>
                  <th className="bg-gray-100 border border-gray-200 border-r-2 border-r-gray-400 text-center font-semibold shadow-sm" style={{ position: 'sticky', top: 0, left: '310px', zIndex: 50, minWidth: '110px', width: '110px', padding: '12px 8px', fontSize: '13px' }}>
                    意匠設計
                  </th>
                  <th className="bg-gray-100 border border-gray-200 border-r-2 border-r-gray-400 text-center font-semibold shadow-sm" style={{ position: 'sticky', top: 0, left: '420px', zIndex: 50, minWidth: '110px', width: '110px', padding: '12px 8px', fontSize: '13px' }}>
                    IC
                  </th>
                  <th className="bg-gray-100 border border-gray-200 border-r-2 border-r-gray-400 text-center font-semibold shadow-sm" style={{ position: 'sticky', top: 0, left: '530px', zIndex: 50, minWidth: '110px', width: '110px', padding: '12px 8px', fontSize: '13px' }}>
                    工事
                  </th>
                  <th className="bg-gray-100 border border-gray-200 border-r-4 border-r-gray-700 text-center font-semibold shadow-md" style={{ position: 'sticky', top: 0, left: '640px', zIndex: 50, minWidth: '110px', width: '110px', padding: '12px 8px', fontSize: '13px' }}>
                    外構プランナー
                  </th>
                  {uniqueTaskTitles.map(taskTitle => (
                    <th
                      key={taskTitle}
                      className="bg-gray-100 border border-gray-200 text-center font-semibold"
                      style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '120px', padding: '12px 8px', fontSize: '13px' }}
                      title={taskTitle}
                    >
                      <div style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.3' }}>
                        {taskTitle}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProjectsForMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={uniqueTaskTitles.length + 6} className="border-2 border-gray-300 p-8 text-center text-gray-500">
                      該当する案件がありません
                    </td>
                  </tr>
                ) : (
                  filteredProjectsForMatrix.map((project: any) => (
                    <tr
                      key={project.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td
                        className="bg-white border border-gray-100 border-r-2 border-r-gray-400 px-3 py-3 text-base cursor-pointer hover:bg-blue-50 shadow-sm"
                        style={{ position: 'sticky', left: 0, zIndex: 20, width: '200px' }}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="font-semibold text-gray-900 mb-1" title={`${project.customer?.names?.join('・') || '顧客名なし'}様邸`}>
                          {project.customer?.names?.join('・') || '顧客名なし'}様
                        </div>
                        {project.product && (
                          <div className="text-base text-gray-600 font-medium">
                            {project.product.name}
                          </div>
                        )}
                      </td>
                      <td className="bg-white border border-gray-100 border-r-2 border-r-gray-400 px-3 py-3 text-center text-base shadow-sm" style={{ position: 'sticky', left: '200px', zIndex: 20, width: '110px' }}>
                        {project.sales ? (
                          <div className="font-semibold text-gray-900" title={`${project.sales.last_name} ${project.sales.first_name}`}>
                            {project.sales.last_name}
                          </div>
                        ) : (
                          <div className="font-semibold text-gray-400">-</div>
                        )}
                      </td>
                      <td className="bg-white border border-gray-100 border-r-2 border-r-gray-400 px-3 py-3 text-center text-base shadow-sm" style={{ position: 'sticky', left: '310px', zIndex: 20, width: '110px' }}>
                        {project.design ? (
                          <div className="font-semibold text-gray-900" title={`${project.design.last_name} ${project.design.first_name}`}>
                            {project.design.last_name}
                          </div>
                        ) : (
                          <div className="font-semibold text-gray-400">-</div>
                        )}
                      </td>
                      <td className="bg-white border border-gray-100 border-r-2 border-r-gray-400 px-3 py-3 text-center text-base shadow-sm" style={{ position: 'sticky', left: '420px', zIndex: 20, width: '110px' }}>
                        {project.ic ? (
                          <div className="font-semibold text-gray-900" title={`${project.ic.last_name} ${project.ic.first_name}`}>
                            {project.ic.last_name}
                          </div>
                        ) : (
                          <div className="font-semibold text-gray-400">-</div>
                        )}
                      </td>
                      <td className="bg-white border border-gray-100 border-r-2 border-r-gray-400 px-3 py-3 text-center text-base shadow-sm" style={{ position: 'sticky', left: '530px', zIndex: 20, width: '110px' }}>
                        {project.construction ? (
                          <div className="font-semibold text-gray-900" title={`${project.construction.last_name} ${project.construction.first_name}`}>
                            {project.construction.last_name}
                          </div>
                        ) : (
                          <div className="font-semibold text-gray-400">-</div>
                        )}
                      </td>
                      <td className="bg-white border border-gray-100 border-r-4 border-r-gray-700 px-3 py-3 text-center text-base shadow-md" style={{ position: 'sticky', left: '640px', zIndex: 20, width: '110px' }}>
                        {project.exterior ? (
                          <div className="font-semibold text-gray-900" title={`${project.exterior.last_name} ${project.exterior.first_name}`}>
                            {project.exterior.last_name}
                          </div>
                        ) : (
                          <div className="font-semibold text-gray-400">-</div>
                        )}
                      </td>
                      {uniqueTaskTitles.map(taskTitle => {
                        const task = getProjectTaskByTitle(project.id, taskTitle)

                        const daysOverdue = task?.due_date && task.status !== 'completed' && task.status !== 'not_applicable'
                          ? differenceInDays(new Date(), new Date(task.due_date))
                          : 0

                        // デザインコード統一：index.cssの定義に合わせる
                        let cellStyle: React.CSSProperties = {
                          padding: '8px 12px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }

                        if (task) {
                          if (task.status === 'completed' || task.status === 'not_applicable') {
                            // 完了：青
                            cellStyle = { ...cellStyle, background: '#93C5FD', color: '#1E3A8A', border: '3px solid #2563EB', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)' }
                          } else if (daysOverdue > 0 || task.status === 'delayed') {
                            // 遅延：赤
                            cellStyle = { ...cellStyle, background: '#FCA5A5', color: '#7F1D1D', border: '3px solid #DC2626', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)' }
                          } else if (task.status === 'requested') {
                            // 着手中：黄色
                            cellStyle = { ...cellStyle, background: '#FDE047', color: '#713F12', border: '3px solid #EAB308', boxShadow: '0 2px 4px rgba(234, 179, 8, 0.3)' }
                          } else {
                            // 未着手：グレー
                            cellStyle = { ...cellStyle, background: '#D1D5DB', color: '#1F2937', border: '3px solid #6B7280', boxShadow: '0 2px 4px rgba(107, 114, 128, 0.3)' }
                          }
                        }

                        return (
                          <td key={taskTitle} style={{ border: '1px solid #f3f4f6', padding: '4px', minWidth: '120px' }}>
                            {task ? (
                              <div
                                style={cellStyle}
                                title={`${task.title}\n期限: ${task.due_date ? format(new Date(task.due_date), 'MM/dd') : '未設定'}\nステータス: ${
                                  task.status === 'completed' || task.status === 'not_applicable' ? '完了' :
                                  task.status === 'delayed' ? '遅れ' :
                                  task.status === 'requested' ? '着手中' :
                                  '未着手'
                                }${daysOverdue > 0 ? `\n遅延: ${daysOverdue}日` : ''}`}
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  setSelectedTask(task)
                                  setSelectedTaskProject(project)
                                  setShowTaskDetailModal(true)
                                  // 変更履歴とコメントを取得
                                  await loadTaskAuditLogs(task.id)
                                  await loadTaskComments(task.id)
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                {daysOverdue > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px' }}>{daysOverdue}日遅れ</span>
                                    <span style={{ fontSize: '14px' }}>{task.due_date ? format(new Date(task.due_date), 'MM/dd') : '-'}</span>
                                  </div>
                                ) : (
                                  <>{task.due_date ? format(new Date(task.due_date), 'MM/dd') : '-'}</>
                                )}
                              </div>
                            ) : (
                              <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                -
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 新規案件作成モーダル */}
      {showCreateModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-2xl w-full">
            {/* ヘッダー */}
            <div className="prisma-modal-header flex items-center justify-between">
              <h2 className="prisma-modal-title">新規案件追加</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">顧客情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      顧客名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerNames}
                      onChange={(e) => setFormData({ ...formData, customerNames: e.target.value })}
                      placeholder="例: 山田太郎・花子"
                      className="prisma-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      建設地 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.buildingSite}
                      onChange={(e) => setFormData({ ...formData, buildingSite: e.target.value })}
                      placeholder="例: 東京都渋谷区〇〇1-2-3"
                      className="prisma-input w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">案件情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">契約番号</label>
                    <input
                      type="text"
                      value={formData.contractNumber}
                      onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                      placeholder="例: 2024-001"
                      className="prisma-input w-full"
                    />
                    <p className="text-base text-gray-500 mt-1">※ 契約番号は重複できません</p>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">契約日</label>
                    <input
                      type="date"
                      value={formData.contractDate}
                      onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                      className="prisma-input w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">間取確定日</label>
                      <input
                        type="date"
                        value={formData.floorPlanConfirmedDate}
                        onChange={(e) => setFormData({ ...formData, floorPlanConfirmedDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">最終仕様打合せ日</label>
                      <input
                        type="date"
                        value={formData.finalSpecificationMeetingDate}
                        onChange={(e) => setFormData({ ...formData, finalSpecificationMeetingDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">着工許可日</label>
                      <input
                        type="date"
                        value={formData.constructionPermissionDate}
                        onChange={(e) => setFormData({ ...formData, constructionPermissionDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">着工日</label>
                      <input
                        type="date"
                        value={formData.constructionStartDate}
                        onChange={(e) => setFormData({ ...formData, constructionStartDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">上棟日</label>
                      <input
                        type="date"
                        value={formData.roofRaisingDate}
                        onChange={(e) => setFormData({ ...formData, roofRaisingDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">完了検査日</label>
                      <input
                        type="date"
                        value={formData.completionInspectionDate}
                        onChange={(e) => setFormData({ ...formData, completionInspectionDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">引き渡し日</label>
                    <input
                      type="date"
                      value={formData.handoverDate}
                      onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
                      className="prisma-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">ステータス</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                      className="prisma-select w-full"
                    >
                      <option value="post_contract">契約後</option>
                      <option value="construction">着工後</option>
                      <option value="completed">引き渡し済</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">進捗率 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progressRate}
                      onChange={(e) => setFormData({ ...formData, progressRate: parseInt(e.target.value) || 0 })}
                      className="prisma-input w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">担当者</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">営業</label>
                    <select
                      value={formData.assignedSales}
                      onChange={(e) => setFormData({ ...formData, assignedSales: e.target.value })}
                      className="prisma-select w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => getPositionsForDepartment('営業部').includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">意匠設計</label>
                    <select
                      value={formData.assignedDesign}
                      onChange={(e) => setFormData({ ...formData, assignedDesign: e.target.value })}
                      className="prisma-select w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => getPositionsForDepartment('設計部').includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">工事担当</label>
                    <select
                      value={formData.assignedConstruction}
                      onChange={(e) => setFormData({ ...formData, assignedConstruction: e.target.value })}
                      className="prisma-select w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => getPositionsForDepartment('工事部').includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="prisma-btn prisma-btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateProject}
                className="prisma-btn prisma-btn-primary flex-1"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 案件編集モーダル */}
      {showEditModal && editingProject && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-2xl w-full">
            {/* ヘッダー */}
            <div className="prisma-modal-header flex items-center justify-between">
              <h2 className="prisma-modal-title">案件編集</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingProject(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">顧客情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      顧客名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerNames}
                      onChange={(e) => setFormData({ ...formData, customerNames: e.target.value })}
                      className="prisma-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      建設地 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.buildingSite}
                      onChange={(e) => setFormData({ ...formData, buildingSite: e.target.value })}
                      className="prisma-input w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">案件情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">契約日</label>
                    <input
                      type="date"
                      value={formData.contractDate}
                      onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                      className="prisma-input w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">間取確定日</label>
                      <input
                        type="date"
                        value={formData.floorPlanConfirmedDate}
                        onChange={(e) => setFormData({ ...formData, floorPlanConfirmedDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">最終仕様打合せ日</label>
                      <input
                        type="date"
                        value={formData.finalSpecificationMeetingDate}
                        onChange={(e) => setFormData({ ...formData, finalSpecificationMeetingDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">着工許可日</label>
                      <input
                        type="date"
                        value={formData.constructionPermissionDate}
                        onChange={(e) => setFormData({ ...formData, constructionPermissionDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">着工日</label>
                      <input
                        type="date"
                        value={formData.constructionStartDate}
                        onChange={(e) => setFormData({ ...formData, constructionStartDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">上棟日</label>
                      <input
                        type="date"
                        value={formData.roofRaisingDate}
                        onChange={(e) => setFormData({ ...formData, roofRaisingDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">完了検査日</label>
                      <input
                        type="date"
                        value={formData.completionInspectionDate}
                        onChange={(e) => setFormData({ ...formData, completionInspectionDate: e.target.value })}
                        className="prisma-input w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">引き渡し日</label>
                    <input
                      type="date"
                      value={formData.handoverDate}
                      onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
                      className="prisma-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">ステータス</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                      className="prisma-select w-full"
                    >
                      <option value="post_contract">契約後</option>
                      <option value="construction">着工後</option>
                      <option value="completed">引き渡し済</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">進捗率 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progressRate}
                      onChange={(e) => setFormData({ ...formData, progressRate: parseInt(e.target.value) || 0 })}
                      className="prisma-input w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">担当者</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">営業</label>
                    <select
                      value={formData.assignedSales}
                      onChange={(e) => setFormData({ ...formData, assignedSales: e.target.value })}
                      className="prisma-select w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => getPositionsForDepartment('営業部').includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">意匠設計</label>
                    <select
                      value={formData.assignedDesign}
                      onChange={(e) => setFormData({ ...formData, assignedDesign: e.target.value })}
                      className="prisma-select w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => getPositionsForDepartment('設計部').includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">工事担当</label>
                    <select
                      value={formData.assignedConstruction}
                      onChange={(e) => setFormData({ ...formData, assignedConstruction: e.target.value })}
                      className="prisma-select w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => getPositionsForDepartment('工事部').includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingProject(null)
                  resetForm()
                }}
                className="prisma-btn prisma-btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditProject}
                className="prisma-btn prisma-btn-primary flex-1"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-md w-full">
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <h3 className="prisma-modal-title">案件を削除しますか？</h3>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content">
              <p className="text-base text-gray-700">
                この操作は取り消せません。案件に紐づくタスクも削除される可能性があります。
              </p>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeletingProjectId(null)
                }}
                className="prisma-btn prisma-btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteProject}
                className="prisma-btn prisma-btn-danger flex-1"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タスク詳細モーダル */}
      {showTaskDetailModal && selectedTask && selectedTaskProject && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal" style={{ maxWidth: '800px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">{selectedTask.title}</h2>
                <button
                  onClick={() => {
                    setShowTaskDetailModal(false)
                    setSelectedTask(null)
                    setSelectedTaskProject(null)
                    setEditingDueDate(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              {/* 責任者 */}
              {selectedTask.assigned_employee && (
                <div>
                  <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                    責任者
                  </label>
                  <div className="prisma-input bg-gray-50 dark:bg-gray-700">
                    {selectedTask.assigned_employee.last_name} {selectedTask.assigned_employee.first_name}（{selectedTask.assigned_employee.department}）
                  </div>
                </div>
              )}

              {/* ステータス変更ボタン */}
              <div>
                <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  ステータス
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                    className={`px-3 py-2 rounded-lg font-bold text-base transition-all ${
                      selectedTask.status === 'not_started'
                        ? 'task-not-started'
                        : 'bg-white text-gray-900 hover:bg-gray-50 border-2 border-gray-300'
                    }`}
                  >
                    未着手
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                    className={`px-3 py-2 rounded-lg font-bold text-base transition-all ${
                      selectedTask.status === 'requested'
                        ? 'task-in-progress'
                        : 'bg-white text-yellow-900 hover:bg-yellow-50 border-2 border-yellow-300'
                    }`}
                  >
                    着手中
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                    className={`px-3 py-2 rounded-lg font-bold text-base transition-all ${
                      selectedTask.status === 'delayed'
                        ? 'task-delayed'
                        : 'bg-white text-red-900 hover:bg-red-50 border-2 border-red-300'
                    }`}
                  >
                    遅延
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    className={`px-3 py-2 rounded-lg font-bold text-base transition-all ${
                      selectedTask.status === 'completed'
                        ? 'task-completed'
                        : 'bg-white text-blue-900 hover:bg-blue-50 border-2 border-blue-300'
                    }`}
                  >
                    完了
                  </button>
                </div>
              </div>

              {/* 期限日 */}
              <div>
                <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  期限日
                </label>
                {editingDueDate ? (
                  <input
                    type="date"
                    value={selectedTask.due_date || ''}
                    onChange={(e) => handleUpdateDueDate(e.target.value)}
                    onBlur={() => setEditingDueDate(false)}
                    autoFocus
                    className="prisma-input"
                  />
                ) : (
                  <div
                    onClick={() => setEditingDueDate(true)}
                    className="prisma-input cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'yyyy年MM月dd日 (E)', { locale: ja }) : '未設定'}
                    </div>
                    {selectedTask.due_date && selectedTaskProject.contract_date && (
                      <div className="text-base text-gray-600 dark:text-gray-400 mt-1">
                        契約日から {differenceInDays(new Date(selectedTask.due_date), new Date(selectedTaskProject.contract_date))}日目
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 作業内容 */}
              {selectedTask.description && (
                <div>
                  <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                    作業内容
                  </label>
                  <div className="prisma-input bg-gray-50 dark:bg-gray-700 whitespace-pre-wrap" style={{ minHeight: '60px' }}>
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Do's & Don'ts */}
              {(selectedTask.dos || selectedTask.donts) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {selectedTask.dos && (
                    <div>
                      <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                        Do's（推奨事項）
                      </label>
                      <div className="prisma-input bg-gray-50 dark:bg-gray-700 whitespace-pre-wrap" style={{ minHeight: '100px', maxHeight: '200px', overflowY: 'auto' }}>
                        {selectedTask.dos}
                      </div>
                    </div>
                  )}

                  {selectedTask.donts && (
                    <div>
                      <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                        Don'ts（禁止事項）
                      </label>
                      <div className="prisma-input bg-gray-50 dark:bg-gray-700 whitespace-pre-wrap" style={{ minHeight: '100px', maxHeight: '200px', overflowY: 'auto' }}>
                        {selectedTask.donts}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* コメント */}
              <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-2">
                  コメント
                </label>
                <div className="space-y-3">
                  {/* コメント入力 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="コメントを入力..."
                      className="prisma-input flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment()
                        }
                      }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="prisma-btn prisma-btn-primary"
                    >
                      送信
                    </button>
                  </div>

                  {/* コメント一覧 */}
                  <div className="prisma-input bg-gray-50 dark:bg-gray-800" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {taskComments.length > 0 ? (
                      <div className="space-y-3">
                        {taskComments.map((comment) => (
                          <div key={comment.id} className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="font-medium text-base text-gray-900 dark:text-gray-100">
                                {comment.user?.last_name} {comment.user?.first_name}
                              </div>
                              <div className="text-base text-gray-500 dark:text-gray-500 whitespace-nowrap">
                                {format(new Date(comment.created_at), 'MM/dd HH:mm')}
                              </div>
                            </div>
                            <div className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {comment.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-500 py-4 text-base">
                        コメントがありません
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 変更履歴 */}
              <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-2">
                  変更履歴（最新5件）
                </label>
                <div className="prisma-input bg-gray-50 dark:bg-gray-800" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {taskAuditLogs.length > 0 ? (
                    <div className="space-y-2">
                      {taskAuditLogs.map((log) => (
                        <div key={log.id} className="pb-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                                {log.action === 'update' ? '更新' : log.action === 'create' ? '作成' : log.action}
                              </div>
                              {log.changes && (
                                <div className="text-base text-gray-600 dark:text-gray-400 mt-0.5">
                                  {Object.keys(log.changes).map(key => {
                                    const change = log.changes[key]
                                    return (
                                      <div key={key}>
                                        {key === 'status' ? 'ステータス' :
                                         key === 'due_date' ? '期限日' :
                                         key === 'actual_completion_date' ? '完了日' : key}
                                        : {String(change.old || '未設定')} → {String(change.new)}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="text-base text-gray-500 dark:text-gray-500 whitespace-nowrap">
                              {format(new Date(log.created_at), 'MM/dd HH:mm')}
                            </div>
                          </div>
                          {log.user && (
                            <div className="text-base text-gray-500 dark:text-gray-400 mt-1">
                              {log.user.last_name} {log.user.first_name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-500 py-4 text-base">
                      変更履歴がありません
                    </div>
                  )}
                </div>
              </div>

              {/* マニュアル・動画 */}
              <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-2">
                  マニュアル・動画
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                      マニュアル
                    </label>
                    {selectedTask.manual_url ? (
                      <a
                        href={selectedTask.manual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="prisma-btn prisma-btn-secondary w-full"
                      >
                        開く
                      </a>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-base">未設定</div>
                    )}
                  </div>

                  <div>
                    <label className="block prisma-text-base font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                      動画
                    </label>
                    {selectedTask.video_url ? (
                      <a
                        href={selectedTask.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="prisma-btn prisma-btn-secondary w-full"
                      >
                        再生
                      </a>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-base">未設定</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="prisma-modal-footer">
              <button
                onClick={() => {
                  setShowTaskDetailModal(false)
                  setSelectedTask(null)
                  setSelectedTaskProject(null)
                  setEditingDueDate(false)
                }}
                className="prisma-btn prisma-btn-secondary"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
