import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ArrowUpDown, Filter, Edit2, Trash2, X, Plus } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useMode } from '../contexts/ModeContext'
import { SkeletonTable } from '../components/ui/Skeleton'
import { generateProjectTasks } from '../utils/taskGenerator'

interface ProjectWithRelations extends Project {
  customer: Customer
  sales: Employee
  design: Employee
  construction: Employee
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

  // 従業員データ
  const [employees, setEmployees] = useState<Employee[]>([])

  // フォームデータ
  const [formData, setFormData] = useState({
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
  }, []) //初回のみ読み込み

  useEffect(() => {
    loadProjects()
  }, [mode, currentUserId]) // モードまたはユーザーIDが変更されたら再読み込み

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
          console.log('Realtime project change:', payload)
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
          console.log('Realtime customer change:', payload)
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
          console.log('Realtime task change:', payload)
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
      console.log('Supabase auth not configured, using default user')
    }

    setCurrentUserId('1')
    localStorage.setItem('currentUserId', '1')
  }

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('last_name')

    if (data) {
      setEmployees(data as Employee[])
    }
  }

  const loadProjects = async () => {
    try {
      setLoading(true)

      // 担当者モードの場合、自分が担当する案件のみ
      let query = supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:assigned_sales(id, last_name, first_name, department),
          design:assigned_design(id, last_name, first_name, department),
          construction:assigned_construction(id, last_name, first_name, department)
        `)

      if (mode === 'staff' && currentUserId) {
        query = query.or(`assigned_sales.eq.${currentUserId},assigned_design.eq.${currentUserId},assigned_construction.eq.${currentUserId}`)
      }

      const { data: projectsData } = await query.order('contract_date', { ascending: false })

      if (projectsData) {
        const projectsWithTasks = await Promise.all(
          projectsData.map(async (project) => {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('*')
              .eq('project_id', project.id)

            return {
              ...project,
              tasks: tasks || []
            } as ProjectWithRelations
          })
        )

        setProjects(projectsWithTasks)

        // 全タスクを取得（進捗マトリクス用）
        const projectIds = projectsData.map(p => p.id)
        if (projectIds.length > 0) {
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', projectIds)

          if (tasksData) {
            setAllTasks(tasksData as Task[])
          }
        } else {
          setAllTasks([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDepartmentStatus = (project: ProjectWithRelations): DepartmentStatus[] => {
    const departments = [
      { name: '営業部' as const, positions: ['営業', '営業事務', 'ローン事務'] },
      { name: '設計部' as const, positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'] },
      { name: '工事部' as const, positions: ['工事', '工事事務', '積算・発注'] },
      { name: '外構事業部' as const, positions: ['外構設計', '外構工事'] }
    ]

    return departments.map(dept => {
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
        department: dept.name,
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

  // 進捗マトリクス用のヘルパー関数
  const getAllUniqueTasks = () => {
    const uniqueTitles = Array.from(new Set(allTasks.map(t => t.title)))
    return uniqueTitles.sort()
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

    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          names: formData.customerNames.split('・').map(n => n.trim()),
          building_site: formData.buildingSite
        })
        .select()
        .single()

      if (customerError) throw customerError

      const { data: project, error: projectError} = await supabase
        .from('projects')
        .insert({
          customer_id: customer.id,
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
          assigned_sales: formData.assignedSales || null,
          assigned_design: formData.assignedDesign || null,
          assigned_construction: formData.assignedConstruction || null
        })
        .select()
        .single()

      if (projectError) throw projectError

      // 🚀 タスクマスタから45個のタスクを自動生成
      const taskResult = await generateProjectTasks(
        project.id,
        formData.contractDate,
        formData.assignedSales || undefined,
        formData.assignedDesign || undefined,
        formData.assignedConstruction || undefined
      )

      if (taskResult.success) {
        console.log(`✅ ${taskResult.tasksCount}個のタスクを自動生成しました`)
      } else {
        console.error('⚠️ タスク自動生成に失敗しました:', taskResult.error)
      }

      await loadProjects()
      setShowCreateModal(false)
      resetForm()
      toast.success(`案件を作成しました（${taskResult.tasksCount || 0}個のタスクを自動生成）`)
    } catch (error) {
      console.error('Failed to create project:', error)
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

      if (customerError) throw customerError

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
          assigned_sales: formData.assignedSales || null,
          assigned_design: formData.assignedDesign || null,
          assigned_construction: formData.assignedConstruction || null
        })
        .eq('id', editingProject.id)

      if (projectError) throw projectError

      await loadProjects()
      setShowEditModal(false)
      setEditingProject(null)
      resetForm()
      toast.success('案件を更新しました')
    } catch (error) {
      console.error('Failed to update project:', error)
      toast.error('案件の更新に失敗しました')
    }
  }

  // 案件削除
  const handleDeleteProject = async () => {
    if (!deletingProjectId) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingProjectId)

      if (error) throw error

      await loadProjects()
      setShowDeleteDialog(false)
      setDeletingProjectId(null)
      toast.success('案件を削除しました')
    } catch (error) {
      console.error('Failed to delete project:', error)
      toast.error('案件の削除に失敗しました')
    }
  }

  // フォームリセット
  const resetForm = () => {
    setFormData({
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
            onClick={() => setShowCreateModal(true)}
            className="prisma-btn prisma-btn-primary prisma-btn-sm"
          >
            <Plus size={16} />
            新規案件追加
          </button>
        </div>
      </div>

      <div className="prisma-content" style={{ padding: '12px' }}>
        {/* ツールバーカード */}
        <div className="prisma-card" style={{ marginBottom: '12px', padding: '12px' }}>

          <div className="flex items-center justify-between gap-3">
            {/* ソート */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-gray-600" />
              <span className="text-gray-700 text-sm">並び:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="prisma-select"
                style={{ width: 'auto' }}
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

            {/* フィルタ */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-600" />
              <span className="text-gray-700 text-sm">絞込:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`prisma-btn prisma-btn-sm ${
                    filterStatus === 'all' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  }`}
                >
                  全て ({projects.length})
                </button>
                <button
                  onClick={() => setFilterStatus('delayed')}
                  className={`prisma-btn prisma-btn-sm ${
                    filterStatus === 'delayed' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  }`}
                  style={filterStatus === 'delayed' ? { background: '#ef4444' } : {}}
                >
                  遅れ
                </button>
                <button
                  onClick={() => setFilterStatus('requested')}
                  className={`prisma-btn prisma-btn-sm ${
                    filterStatus === 'requested' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  }`}
                  style={filterStatus === 'requested' ? { background: '#eab308' } : {}}
                >
                  着手中
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`prisma-btn prisma-btn-sm ${
                    filterStatus === 'completed' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  }`}
                >
                  完了
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 進捗マトリクス表示 */}
        <div className="prisma-card" style={{ height: 'calc(100vh - 180px)', minHeight: '600px', overflow: 'hidden', padding: 0 }}>
          {/* マトリクスヘッダー */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-gray-900">全案件進捗マトリクス</h3>
                <div className="flex items-center gap-2">
                  <span className="prisma-badge prisma-badge-blue">{filteredProjectsForMatrix.length}案件</span>
                  <span className="prisma-badge prisma-badge-green">{uniqueTaskTitles.length}種類</span>
                  <span className="prisma-badge prisma-badge-gray">計{allTasks.length}</span>
                </div>
              </div>

              {/* フィルタボタン */}
              <div className="flex gap-1">
                <button
                  onClick={() => setConstructionFilter('all')}
                  className={`prisma-btn prisma-btn-sm ${
                    constructionFilter === 'all' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  }`}
                >
                  全て ({displayProjects.length})
                </button>
                <button
                  onClick={() => setConstructionFilter('pre')}
                  className={`prisma-btn prisma-btn-sm ${
                    constructionFilter === 'pre' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  }`}
                >
                  着工前 ({displayProjects.filter(p => p.status === 'post_contract').length})
                </button>
                <button
                  onClick={() => setConstructionFilter('post')}
                  className={`prisma-btn prisma-btn-sm ${
                    constructionFilter === 'post' ? 'prisma-btn-primary' : 'prisma-btn-secondary'
                  }`}
                >
                  着工後 ({displayProjects.filter(p => p.status === 'construction' || p.status === 'completed').length})
                </button>
              </div>
            </div>
          </div>

          {/* マトリクステーブル */}
          <div style={{
            height: 'calc(100vh - 420px)',
            minHeight: '500px',
            maxHeight: 'calc(100vh - 420px)',
            position: 'relative',
            overflowX: 'scroll',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <table className="prisma-table" style={{ minWidth: '2000px', width: 'max-content', position: 'relative', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead className="sticky top-0 z-30" style={{ background: '#f3f4f6' }}>
                <tr>
                  <th className="sticky" style={{ minWidth: '140px', width: '140px', left: '0', backgroundColor: '#f3f4f6', zIndex: 50, border: '1px solid #e5e7eb', borderRight: '2px solid #d1d5db', padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    契約No / 契約日
                  </th>
                  <th className="sticky" style={{ minWidth: '200px', width: '200px', left: '140px', backgroundColor: '#f3f4f6', zIndex: 50, border: '1px solid #e5e7eb', borderRight: '2px solid #d1d5db', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    案件名
                  </th>
                  <th className="sticky" style={{ minWidth: '110px', width: '110px', left: '340px', backgroundColor: '#f3f4f6', zIndex: 50, border: '1px solid #e5e7eb', borderRight: '2px solid #d1d5db', padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    営業担当
                  </th>
                  <th className="sticky" style={{ minWidth: '110px', width: '110px', left: '450px', backgroundColor: '#f3f4f6', zIndex: 50, border: '1px solid #e5e7eb', borderRight: '2px solid #d1d5db', padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    設計担当
                  </th>
                  <th className="sticky" style={{ minWidth: '110px', width: '110px', left: '560px', backgroundColor: '#f3f4f6', zIndex: 50, border: '1px solid #e5e7eb', borderRight: '2px solid #9ca3af', padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    工事担当
                  </th>
                  {uniqueTaskTitles.map(taskTitle => (
                    <th
                      key={taskTitle}
                      style={{ minWidth: '120px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}
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
                    <td colSpan={uniqueTaskTitles.length + 5} className="border-2 border-gray-300 p-8 text-center text-gray-500">
                      該当する案件がありません
                    </td>
                  </tr>
                ) : (
                  filteredProjectsForMatrix.map((project: any) => (
                    <tr
                      key={project.id}
                      style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <td className="sticky" style={{ width: '140px', left: '0', backgroundColor: 'white', zIndex: 10, border: '1px solid #f3f4f6', borderRight: '2px solid #d1d5db', padding: '12px 8px', textAlign: 'center', fontSize: '14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          No.{project.contract_number || '-'}
                        </div>
                        <div style={{ fontWeight: 600, color: '#111827', marginTop: '4px' }}>
                          {format(new Date(project.contract_date), 'MM/dd')}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {format(new Date(project.contract_date), 'yyyy')}
                        </div>
                      </td>
                      <td className="sticky" style={{ width: '200px', left: '140px', backgroundColor: 'white', zIndex: 10, border: '1px solid #f3f4f6', borderRight: '2px solid #d1d5db', padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }} title={`${project.customer?.names?.join('・') || '顧客名なし'}様邸`}>
                          {project.customer?.names?.join('・') || '顧客名なし'}様
                        </div>
                        {project.product && (
                          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                            {project.product.name}
                          </div>
                        )}
                      </td>
                      <td className="sticky" style={{ width: '110px', left: '340px', backgroundColor: 'white', zIndex: 10, border: '1px solid #f3f4f6', borderRight: '2px solid #d1d5db', padding: '12px 8px', textAlign: 'center', fontSize: '14px' }}>
                        {project.sales ? (
                          <div style={{ fontWeight: 600, color: '#111827' }} title={`${project.sales.last_name} ${project.sales.first_name}`}>
                            {project.sales.last_name}
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600, color: '#9ca3af' }}>-</div>
                        )}
                      </td>
                      <td className="sticky" style={{ width: '110px', left: '450px', backgroundColor: 'white', zIndex: 10, border: '1px solid #f3f4f6', borderRight: '2px solid #d1d5db', padding: '12px 8px', textAlign: 'center', fontSize: '14px' }}>
                        {project.design ? (
                          <div style={{ fontWeight: 600, color: '#111827' }} title={`${project.design.last_name} ${project.design.first_name}`}>
                            {project.design.last_name}
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600, color: '#9ca3af' }}>-</div>
                        )}
                      </td>
                      <td className="sticky" style={{ width: '110px', left: '560px', backgroundColor: 'white', zIndex: 10, border: '1px solid #f3f4f6', borderRight: '2px solid #9ca3af', padding: '12px 8px', textAlign: 'center', fontSize: '14px' }}>
                        {project.construction ? (
                          <div style={{ fontWeight: 600, color: '#111827' }} title={`${project.construction.last_name} ${project.construction.first_name}`}>
                            {project.construction.last_name}
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600, color: '#9ca3af' }}>-</div>
                        )}
                      </td>
                      {uniqueTaskTitles.map(taskTitle => {
                        const task = getProjectTaskByTitle(project.id, taskTitle)

                        const daysOverdue = task?.due_date && task.status !== 'completed' && task.status !== 'not_applicable'
                          ? differenceInDays(new Date(), new Date(task.due_date))
                          : 0

                        // Prismaカラースキーム
                        let cellStyle: React.CSSProperties = {
                          padding: '8px 12px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }

                        if (task) {
                          if (task.status === 'completed' || task.status === 'not_applicable') {
                            cellStyle = { ...cellStyle, background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }
                          } else if (daysOverdue > 0 || task.status === 'delayed') {
                            cellStyle = { ...cellStyle, background: '#fca5a5', color: '#7f1d1d', border: '2px solid #dc2626' }
                          } else if (task.status === 'requested') {
                            cellStyle = { ...cellStyle, background: '#fde047', color: '#713f12', border: '1px solid #eab308' }
                          } else {
                            cellStyle = { ...cellStyle, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/projects/${project.id}`)
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
        <div className="modal-overlay">
          <div className="modal-canva max-w-2xl w-full">
            {/* ヘッダー */}
            <div className="modal-canva-header flex items-center justify-between">
              <h2 className="text-2xl font-bold">新規案件追加</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="modal-canva-content space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">顧客情報</h3>
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
                      className="input-canva w-full"
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
                      className="input-canva w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">案件情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">契約日</label>
                    <input
                      type="date"
                      value={formData.contractDate}
                      onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                      className="input-canva w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">間取確定日</label>
                      <input
                        type="date"
                        value={formData.floorPlanConfirmedDate}
                        onChange={(e) => setFormData({ ...formData, floorPlanConfirmedDate: e.target.value })}
                        className="input-canva w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">最終仕様打合せ日</label>
                      <input
                        type="date"
                        value={formData.finalSpecificationMeetingDate}
                        onChange={(e) => setFormData({ ...formData, finalSpecificationMeetingDate: e.target.value })}
                        className="input-canva w-full"
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
                        className="input-canva w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">着工日</label>
                      <input
                        type="date"
                        value={formData.constructionStartDate}
                        onChange={(e) => setFormData({ ...formData, constructionStartDate: e.target.value })}
                        className="input-canva w-full"
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
                        className="input-canva w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">完了検査日</label>
                      <input
                        type="date"
                        value={formData.completionInspectionDate}
                        onChange={(e) => setFormData({ ...formData, completionInspectionDate: e.target.value })}
                        className="input-canva w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">引き渡し日</label>
                    <input
                      type="date"
                      value={formData.handoverDate}
                      onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
                      className="input-canva w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">ステータス</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                      className="input-canva w-full"
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
                      className="input-canva w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">担当者</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">営業担当</label>
                    <select
                      value={formData.assignedSales}
                      onChange={(e) => setFormData({ ...formData, assignedSales: e.target.value })}
                      className="input-canva w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => ['営業', '営業事務', 'ローン事務'].includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">設計担当</label>
                    <select
                      value={formData.assignedDesign}
                      onChange={(e) => setFormData({ ...formData, assignedDesign: e.target.value })}
                      className="input-canva w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => ['実施設計', '意匠設計', '申請設計', '構造設計', 'IC'].includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">工事担当</label>
                    <select
                      value={formData.assignedConstruction}
                      onChange={(e) => setFormData({ ...formData, assignedConstruction: e.target.value })}
                      className="input-canva w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => ['工事', '発注・積算', '工事事務'].includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="modal-canva-footer">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="btn-canva-outline flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateProject}
                className="btn-canva-primary flex-1"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 案件編集モーダル */}
      {showEditModal && editingProject && (
        <div className="modal-overlay">
          <div className="modal-canva max-w-2xl w-full">
            {/* ヘッダー */}
            <div className="modal-canva-header flex items-center justify-between">
              <h2 className="text-2xl font-bold">案件編集</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingProject(null)
                  resetForm()
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="modal-canva-content space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">顧客情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      顧客名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerNames}
                      onChange={(e) => setFormData({ ...formData, customerNames: e.target.value })}
                      className="input-canva w-full"
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
                      className="input-canva w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">案件情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">契約日</label>
                    <input
                      type="date"
                      value={formData.contractDate}
                      onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                      className="input-canva w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">間取確定日</label>
                      <input
                        type="date"
                        value={formData.floorPlanConfirmedDate}
                        onChange={(e) => setFormData({ ...formData, floorPlanConfirmedDate: e.target.value })}
                        className="input-canva w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">最終仕様打合せ日</label>
                      <input
                        type="date"
                        value={formData.finalSpecificationMeetingDate}
                        onChange={(e) => setFormData({ ...formData, finalSpecificationMeetingDate: e.target.value })}
                        className="input-canva w-full"
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
                        className="input-canva w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">着工日</label>
                      <input
                        type="date"
                        value={formData.constructionStartDate}
                        onChange={(e) => setFormData({ ...formData, constructionStartDate: e.target.value })}
                        className="input-canva w-full"
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
                        className="input-canva w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">完了検査日</label>
                      <input
                        type="date"
                        value={formData.completionInspectionDate}
                        onChange={(e) => setFormData({ ...formData, completionInspectionDate: e.target.value })}
                        className="input-canva w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">引き渡し日</label>
                    <input
                      type="date"
                      value={formData.handoverDate}
                      onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
                      className="input-canva w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">ステータス</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                      className="input-canva w-full"
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
                      className="input-canva w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">担当者</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">営業担当</label>
                    <select
                      value={formData.assignedSales}
                      onChange={(e) => setFormData({ ...formData, assignedSales: e.target.value })}
                      className="input-canva w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => ['営業', '営業事務', 'ローン事務'].includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">設計担当</label>
                    <select
                      value={formData.assignedDesign}
                      onChange={(e) => setFormData({ ...formData, assignedDesign: e.target.value })}
                      className="input-canva w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => ['実施設計', '意匠設計', '申請設計', '構造設計', 'IC'].includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">工事担当</label>
                    <select
                      value={formData.assignedConstruction}
                      onChange={(e) => setFormData({ ...formData, assignedConstruction: e.target.value })}
                      className="input-canva w-full"
                    >
                      <option value="">未設定</option>
                      {employees.filter(e => ['工事', '発注・積算', '工事事務'].includes(e.department)).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="modal-canva-footer">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingProject(null)
                  resetForm()
                }}
                className="btn-canva-outline flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditProject}
                className="btn-canva-primary flex-1"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="modal-overlay">
          <div className="modal-canva max-w-md w-full">
            {/* ヘッダー */}
            <div className="modal-canva-header">
              <h3 className="text-2xl font-bold">案件を削除しますか？</h3>
            </div>

            {/* コンテンツ */}
            <div className="modal-canva-content">
              <p className="text-gray-600">
                この操作は取り消せません。案件に紐づくタスクも削除される可能性があります。
              </p>
            </div>

            {/* フッター */}
            <div className="modal-canva-footer">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeletingProjectId(null)
                }}
                className="btn-canva-outline flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteProject}
                className="btn-canva-danger flex-1"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
