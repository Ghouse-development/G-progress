import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowUpDown, Filter, Plus, Eye, Trash2, Table, List, Grid, FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import FileUpload from '../components/FileUpload'
import { regenerateProjectTasks } from '../utils/taskGenerator'

interface ProjectWithRelations extends Project {
  customer: Customer
  sales: Employee
  design: Employee
  construction: Employee
}

interface TaskWithEmployee extends Task {
  assigned_employee?: Employee
  dayFromContract?: number
  position?: string
  business_no?: number
}

type SortField = 'due_date' | 'status' | 'priority' | 'title' | 'dayFromContract' | 'construction_start' | 'business_no'
type FilterStatus = 'all' | 'not_started' | 'requested' | 'delayed' | 'completed'

// 部門と職種の定義
const DEPARTMENTS = [
  {
    name: '営業部',
    positions: ['営業', '営業事務', 'ローン事務']
  },
  {
    name: '設計部',
    positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計']
  },
  {
    name: '工事部',
    positions: ['工事', '工事事務', '積算・発注']
  },
  {
    name: '外構事業部',
    positions: ['外構設計', '外構工事']
  }
]

const ALL_POSITIONS = DEPARTMENTS.flatMap(d => d.positions)

// 今日が契約日から何日目かを計算
const getTodayFromContract = (contractDate: string): number => {
  return differenceInDays(new Date(), new Date(contractDate))
}

// 引き渡し日までの日数を計算（引き渡し日がない場合は365日）
const getDeliveryDays = (project: Project): number => {
  const deliveryDate = project.actual_end_date || project.scheduled_end_date
  if (deliveryDate) {
    return Math.max(100, differenceInDays(new Date(deliveryDate), new Date(project.contract_date)))
  }
  return 365 // デフォルトは365日
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [project, setProject] = useState<ProjectWithRelations | null>(null)
  const [tasks, setTasks] = useState<TaskWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])

  // フィルタ・ソート状態
  const [sortField, setSortField] = useState<SortField>('business_no')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [viewMode, setViewMode] = useState<'table' | 'list' | 'grid'>('table')

  // グリッドビュー用
  const todayRowRef = useRef<HTMLDivElement>(null)

  // ファイル管理セクションの折りたたみ
  const [showFilesSection, setShowFilesSection] = useState(false)

  // モーダル状態
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithEmployee | null>(null)
  const [editingDueDate, setEditingDueDate] = useState(false)

  // 新規タスク
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  })

  useEffect(() => {
    loadProjectData()
    loadEmployees()
  }, [id])

  // リアルタイム更新: tasksテーブルの変更を監視
  useEffect(() => {
    if (!id) return

    // Supabase Realtimeチャンネルをセットアップ
    const channel = supabase
      .channel(`project-${id}-tasks`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE すべてのイベント
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${id}` // このプロジェクトのタスクのみ
        },
        (payload) => {
          console.log('Realtime task change:', payload)
          // タスクが変更されたら、データを再読み込み（ローディング表示なし）
          loadProjectData(false)
        }
      )
      .subscribe()

    // クリーンアップ: コンポーネントのアンマウント時にサブスクリプション解除
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('last_name')

    if (!error && data) {
      setEmployees(data as Employee[])
    }
  }

  const loadProjectData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:assigned_sales(id, last_name, first_name, department),
          design:assigned_design(id, last_name, first_name, department),
          construction:assigned_construction(id, last_name, first_name, department)
        `)
        .eq('id', id)
        .single()

      if (projectError) throw projectError

      setProject(projectData as unknown as ProjectWithRelations)

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_employee:assigned_to(id, last_name, first_name, department),
          task_master:task_masters!task_master_id(business_no)
        `)
        .eq('project_id', id)

      if (tasksError) throw tasksError

      const tasksWithDays = (tasksData || []).map((task: any) => {
        const dayFromContract = task.due_date && projectData.contract_date
          ? differenceInDays(new Date(task.due_date), new Date(projectData.contract_date))
          : 0

        return {
          ...task,
          dayFromContract,
          business_no: task.task_master?.business_no || 999
        }
      })

      setTasks(tasksWithDays)
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'not_started' | 'requested' | 'delayed' | 'completed') => {
    try {
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      )

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus })
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) {
        console.error('Supabase error:', error)
        toast.error(`ステータスの更新に失敗しました: ${error.message}`)
        await loadProjectData(false)
      } else {
        toast.success('ステータスを更新しました')
        loadProjectData(false)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error(`予期しないエラーが発生しました: ${err}`)
      await loadProjectData(false)
    }
  }

  const handleUpdateDueDate = async (newDate: string) => {
    if (!selectedTask) return

    setSelectedTask({ ...selectedTask, due_date: newDate })
    setEditingDueDate(false)

    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === selectedTask.id ? { ...t, due_date: newDate } : t
      )
    )

    const { error } = await supabase
      .from('tasks')
      .update({
        due_date: newDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedTask.id)

    if (error) {
      toast.error('期限日の更新に失敗しました: ' + error.message)
      await loadProjectData(false)
    } else {
      toast.success('期限日を更新しました')
      loadProjectData(false)
    }
  }

  const handleAddTask = async () => {
    if (!project || !newTask.title || !newTask.due_date) {
      toast.warning('タスク名と期限は必須です')
      return
    }

    const taskData = {
      project_id: id,
      title: newTask.title,
      description: newTask.description || null,
      assigned_to: newTask.assigned_to || null,
      due_date: newTask.due_date,
      status: 'not_started',
      priority: newTask.priority
    }

    console.log('タスク追加データ:', taskData)

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()

    if (error) {
      console.error('タスク追加エラー:', error)
      toast.error('タスクの追加に失敗しました: ' + error.message)
    } else {
      console.log('タスク追加成功:', data)
      toast.success('タスクを追加しました')
      await loadProjectData()
      setShowTaskModal(false)
      setNewTask({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        priority: 'medium'
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('このタスクを削除してもよろしいですか？')) {
      return
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      toast.error('タスクの削除に失敗しました: ' + error.message)
    } else {
      toast.success('タスクを削除しました')
      await loadProjectData()
      if (selectedTask?.id === taskId) {
        setSelectedTask(null)
        setShowDetailModal(false)
      }
    }
  }

  // 🚀 タスク一括生成（既存タスクを削除して再生成）
  const handleRegenerateTasks = async () => {
    if (!id || !confirm('既存のすべてのタスクを削除して、タスクマスタから45個のタスクを再生成します。よろしいですか？')) {
      return
    }

    try {
      toast.info('タスクを再生成しています...')
      const result = await regenerateProjectTasks(id)

      if (result.success) {
        toast.success(`✅ ${result.tasksCount}個のタスクを再生成しました`)
        await loadProjectData()
      } else {
        toast.error('タスクの再生成に失敗しました')
        console.error(result.error)
      }
    } catch (error) {
      toast.error('タスクの再生成中にエラーが発生しました')
      console.error(error)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-200 text-gray-800'
      case 'requested': return 'bg-yellow-200 text-yellow-900'
      case 'delayed': return 'bg-red-200 text-red-900'
      case 'completed': return 'bg-blue-200 text-blue-900'
      case 'not_applicable': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-200 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_started': return '未着手'
      case 'requested': return '着手中'
      case 'delayed': return '遅延'
      case 'completed': return '完了'
      case 'not_applicable': return '対象外'
      default: return status
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return priority
    }
  }

  // グリッドビュー用ヘルパー関数
  const getTasksForPositionAndDay = (position: string, day: number): TaskWithEmployee[] => {
    return tasks.filter(task => {
      const descriptionParts = task.description?.split(':')
      const taskPosition = descriptionParts?.[0]?.trim()
      return task.dayFromContract === day && taskPosition === position
    })
  }

  const getEmployeeByPosition = (position: string): Employee | undefined => {
    return employees.find(emp => emp.department === position)
  }

  const getCompletionRateByPosition = (position: string): number => {
    const positionTasks = tasks.filter(task => {
      const descriptionParts = task.description?.split(':')
      const taskPosition = descriptionParts?.[0]?.trim()
      return taskPosition === position
    })

    if (positionTasks.length === 0) return 0

    const completedTasks = positionTasks.filter(task => task.status === 'completed')
    return Math.round((completedTasks.length / positionTasks.length) * 100)
  }

  const scrollToToday = () => {
    if (todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleCellDoubleClick = (position: string, day: number) => {
    if (!project) return
    const dueDate = format(addDays(new Date(project.contract_date), day), 'yyyy-MM-dd')
    setNewTask({
      title: '',
      description: `${position}: `,
      assigned_to: '',
      due_date: dueDate,
      priority: 'medium'
    })
    setShowTaskModal(true)
  }

  // フィルタリング
  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true
    return task.status === filterStatus
  })

  // ソート
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'due_date':
        aValue = a.due_date ? new Date(a.due_date).getTime() : 0
        bValue = b.due_date ? new Date(b.due_date).getTime() : 0
        break
      case 'construction_start':
        // 着工日順（プロジェクトの着工日からの日数でソート）
        aValue = project?.construction_start_date ? new Date(project.construction_start_date).getTime() : 0
        bValue = project?.construction_start_date ? new Date(project.construction_start_date).getTime() : 0
        break
      case 'status':
        const statusOrder = { 'not_started': 0, 'requested': 1, 'delayed': 2, 'completed': 3, 'not_applicable': 4 }
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 999
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 999
        break
      case 'priority':
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 }
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 999
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 999
        break
      case 'title':
        aValue = a.title
        bValue = b.title
        break
      case 'dayFromContract':
        aValue = a.dayFromContract || 0
        bValue = b.dayFromContract || 0
        break
      case 'business_no':
        aValue = a.business_no || 999
        bValue = b.business_no || 999
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* 戻るボタンスケルトン */}
        <div className="mb-4 h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>

        {/* プロジェクト情報カードスケルトン */}
        <div className="bg-white rounded-lg shadow-xl border-2 border-gray-300 overflow-hidden mb-2">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <div className="px-4 py-3 bg-white border-b-2 border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* ツールバースケルトン */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-2 border-2 border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex gap-1">
              <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-8 w-36 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* テーブルスケルトン */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-400">
                <tr>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border-2 border-gray-300 p-3">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="h-4 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="h-6 w-20 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
                    </td>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="h-6 w-16 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
                    </td>
                    <td className="border-2 border-gray-300 p-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">案件が見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate('/projects')}
          className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 font-bold"
        >
          ← 案件一覧に戻る
        </button>

        {/* プロジェクト情報カード */}
        <div className="bg-white rounded-lg shadow-xl border-2 border-gray-300 overflow-hidden mb-2">
          <div className="p-2 bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-gray-300">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">
                  {project.customer?.names?.join('・') || '顧客名なし'}様邸
                </h1>
                <span className="text-xs font-bold text-gray-700">
                  契約日: {format(new Date(project.contract_date), 'yyyy/MM/dd (E)', { locale: ja })}
                </span>
                <span className="text-xs font-bold text-gray-700">
                  {project.customer?.building_site || '-'}
                </span>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                project.status === 'pre_contract' ? 'bg-white text-gray-800 border-2 border-gray-300' :
                project.status === 'post_contract' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                project.status === 'construction' ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                'bg-green-100 text-green-800 border-2 border-green-300'
              }`}>
                {project.status === 'pre_contract' ? '契約前' :
                 project.status === 'post_contract' ? '契約後' :
                 project.status === 'construction' ? '着工後' : '完了'}
              </span>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-white border-b-2 border-gray-300">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-gray-700 font-bold">
                  総タスク数: <span className="text-blue-600 text-sm">{tasks.length}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-200 border border-gray-400"></span>
                  <strong>{tasks.filter(t => t.status === 'not_started').length}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400"></span>
                  <strong>{tasks.filter(t => t.status === 'requested').length}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-200 border border-red-400"></span>
                  <strong>{tasks.filter(t => t.status === 'delayed').length}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400"></span>
                  <strong>{tasks.filter(t => t.status === 'completed').length}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-gray-50">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-gray-600 font-medium">営業: </span>
                <span className="font-bold text-gray-900">
                  {project.sales ? `${project.sales.last_name} ${project.sales.first_name}` : '未割当'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">設計: </span>
                <span className="font-bold text-gray-900">
                  {project.design ? `${project.design.last_name} ${project.design.first_name}` : '未割当'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">工事: </span>
                <span className="font-bold text-gray-900">
                  {project.construction ? `${project.construction.last_name} ${project.construction.first_name}` : '未割当'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ファイル管理セクション（折りたたみ可能） */}
        <div className="bg-white rounded-lg shadow-md border-2 border-gray-300 mb-2 overflow-hidden">
          <button
            onClick={() => setShowFilesSection(!showFilesSection)}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              <span className="font-bold text-gray-900">プロジェクトファイル管理</span>
              <span className="text-xs text-gray-600">(ドキュメント、画像、PDFなど)</span>
            </div>
            {showFilesSection ? (
              <ChevronUp size={20} className="text-gray-600" />
            ) : (
              <ChevronDown size={20} className="text-gray-600" />
            )}
          </button>

          {showFilesSection && (
            <div className="p-4 border-t-2 border-gray-300">
              <FileUpload projectId={id} onUploadComplete={() => {
                toast.success('ファイルのアップロードが完了しました')
              }} />
            </div>
          )}
        </div>

        {/* ツールバー */}
        <div className="bg-white rounded-lg shadow-md p-2 mb-2 border-2 border-gray-300">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* ソート */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={18} className="text-gray-600" />
              <span className="font-bold text-xs text-gray-900">並び順:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-2 py-1 border-2 border-gray-300 rounded-lg bg-white text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="business_no">業務フロー順</option>
                <option value="dayFromContract">契約日からの日数</option>
                <option value="construction_start">着工日順</option>
                <option value="due_date">期限日順</option>
                <option value="status">ステータス順</option>
                <option value="priority">優先度順</option>
                <option value="title">タスク名順</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 bg-gray-200 text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors border-2 border-gray-400"
              >
                {sortOrder === 'asc' ? '↑ 昇順' : '↓ 降順'}
              </button>
            </div>

            {/* フィルタ */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600" />
              <span className="font-bold text-xs text-gray-900">絞り込み:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors border-2 ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white shadow-md border-blue-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                  }`}
                >
                  全て ({tasks.length})
                </button>
                <button
                  onClick={() => setFilterStatus('not_started')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors border-2 ${
                    filterStatus === 'not_started'
                      ? 'bg-gray-600 text-white shadow-md border-gray-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                  }`}
                >
                  未着手 ({tasks.filter(t => t.status === 'not_started').length})
                </button>
                <button
                  onClick={() => setFilterStatus('requested')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors border-2 ${
                    filterStatus === 'requested'
                      ? 'bg-yellow-600 text-white shadow-md border-yellow-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                  }`}
                >
                  着手中 ({tasks.filter(t => t.status === 'requested').length})
                </button>
                <button
                  onClick={() => setFilterStatus('delayed')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors border-2 ${
                    filterStatus === 'delayed'
                      ? 'bg-red-600 text-white shadow-md border-red-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                  }`}
                >
                  遅延 ({tasks.filter(t => t.status === 'delayed').length})
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors border-2 ${
                    filterStatus === 'completed'
                      ? 'bg-blue-600 text-white shadow-md border-blue-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                  }`}
                >
                  完了 ({tasks.filter(t => t.status === 'completed').length})
                </button>
              </div>
            </div>

            {/* 表示モード切り替え */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border-2 flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-md border-indigo-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                }`}
                title="テーブル表示"
              >
                <Table size={18} />
                テーブル
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border-2 flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white shadow-md border-indigo-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                }`}
                title="リスト表示"
              >
                <List size={18} />
                リスト
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border-2 flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-md border-indigo-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400'
                }`}
                title="グリッド表示（職種×日数）"
              >
                <Grid size={18} />
                グリッド
              </button>
            </div>

            {/* タスク操作ボタン */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateTasks}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-md border-2 border-purple-700 flex items-center gap-1"
                title="タスクマスタから45個のタスクを一括生成"
              >
                <RefreshCw size={18} />
                タスク一括生成
              </button>
              <button
                onClick={() => setShowTaskModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-md border-2 border-green-700 flex items-center gap-1"
              >
                <Plus size={18} />
                新規タスク追加
              </button>
            </div>
          </div>
        </div>

        {/* テーブル表示モード */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-300">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <table className="w-full border-collapse">
              {/* ヘッダー */}
              <thead className="sticky top-0 z-20 bg-gray-100 border-b-2 border-gray-400">
                <tr>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50 sticky left-0 z-30" style={{ minWidth: '60px' }}>
                    No
                  </th>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50" style={{ minWidth: '250px' }}>
                    タスク名
                  </th>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50" style={{ minWidth: '150px' }}>
                    担当者
                  </th>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50" style={{ minWidth: '130px' }}>
                    期限
                  </th>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50" style={{ minWidth: '100px' }}>
                    経過日数
                  </th>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50" style={{ minWidth: '120px' }}>
                    ステータス
                  </th>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50" style={{ minWidth: '90px' }}>
                    優先度
                  </th>
                  <th className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-blue-50 sticky right-0 z-30" style={{ minWidth: '150px' }}>
                    操作
                  </th>
                </tr>
              </thead>

              {/* ボディ */}
              <tbody>
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border-2 border-gray-300 p-8 text-center text-gray-500 font-medium">
                      タスクがありません
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task, index) => {
                    // 遅延判定：期限日が過ぎていて未完了の場合
                    const isDelayed = task.due_date &&
                      task.status !== 'completed' &&
                      new Date(task.due_date) < new Date()

                    return (
                    <tr
                      key={task.id}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task)
                        setShowDetailModal(true)
                      }}
                    >
                      {/* No */}
                      <td className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900 bg-gray-50 sticky left-0 z-10">
                        {index + 1}
                      </td>

                      {/* タスク名 */}
                      <td className="border-2 border-gray-300 p-3 text-gray-900 font-medium">
                        {task.title}
                      </td>

                      {/* 担当者 */}
                      <td className="border-2 border-gray-300 p-3 text-center text-gray-900">
                        {task.assigned_employee
                          ? `${task.assigned_employee.last_name} ${task.assigned_employee.first_name}`
                          : <span className="text-gray-500">未割当</span>
                        }
                      </td>

                      {/* 期限 */}
                      <td className="border-2 border-gray-300 p-3 text-center font-bold text-gray-900">
                        {task.due_date
                          ? format(new Date(task.due_date), 'yyyy/MM/dd (E)', { locale: ja })
                          : <span className="text-gray-500">未設定</span>
                        }
                      </td>

                      {/* 経過日数 */}
                      <td className="border-2 border-gray-300 p-3 text-center font-bold text-blue-700">
                        {task.dayFromContract || 0}日目
                      </td>

                      {/* ステータス */}
                      <td className="border-2 border-gray-300 p-3 text-center">
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm border-2 ${
                          isDelayed ? 'bg-red-200 text-red-900' : getStatusBadgeColor(task.status)
                        }`}>
                          {isDelayed ? '遅延' : getStatusText(task.status)}
                        </span>
                      </td>

                      {/* 優先度 */}
                      <td className="border-2 border-gray-300 p-3 text-center">
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm border-2 ${getPriorityBadgeColor(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </td>

                      {/* 操作 */}
                      <td className="border-2 border-gray-300 p-3 text-center bg-gray-50 sticky right-0 z-10">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTask(task)
                              setShowDetailModal(true)
                            }}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border-2 border-blue-300"
                            title="詳細表示"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTask(task.id)
                            }}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border-2 border-red-300"
                            title="削除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* リスト表示モード */}
        {viewMode === 'list' && (
          <div className="space-y-3" style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
            {sortedTasks.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 font-medium border-2 border-gray-300">
                タスクがありません
              </div>
            ) : (
              sortedTasks.map((task, index) => {
                // 遅延判定：期限日が過ぎていて未完了の場合
                const isDelayed = task.due_date &&
                  task.status !== 'completed' &&
                  new Date(task.due_date) < new Date()

                return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-md border-2 border-gray-300 p-4 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedTask(task)
                    setShowDetailModal(true)
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* 左側: タスク情報 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                        <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm border-2 ${
                          isDelayed ? 'bg-red-200 text-red-900' : getStatusBadgeColor(task.status)
                        }`}>
                          {isDelayed ? '遅延' : getStatusText(task.status)}
                        </span>
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm border-2 ${getPriorityBadgeColor(task.priority)}`}>
                          優先度: {getPriorityText(task.priority)}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">担当者: </span>
                          <span className="font-bold text-gray-900">
                            {task.assigned_employee
                              ? `${task.assigned_employee.last_name} ${task.assigned_employee.first_name}`
                              : '未割当'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">期限: </span>
                          <span className="font-bold text-gray-900">
                            {task.due_date
                              ? format(new Date(task.due_date), 'yyyy/MM/dd (E)', { locale: ja })
                              : '未設定'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">経過日数: </span>
                          <span className="font-bold text-blue-700">{task.dayFromContract || 0}日目</span>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.description}</p>
                      )}
                    </div>

                    {/* 右側: 操作ボタン */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTask(task)
                          setShowDetailModal(true)
                        }}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border-2 border-blue-300"
                        title="詳細表示"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTask(task.id)
                        }}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border-2 border-red-300"
                        title="削除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )
              })
            )}
          </div>
        )}

        {/* グリッド表示モード */}
        {viewMode === 'grid' && project && (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-300">
            {/* 今日へジャンプボタン */}
            <div className="p-3 bg-gray-50 border-b-2 border-gray-300 flex items-center justify-between">
              <div className="text-sm font-bold text-gray-700">
                グリッドビュー（縦軸:日数、横軸:職種）
              </div>
              <button
                onClick={scrollToToday}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
              >
                📍 今日へジャンプ
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <div style={{ minWidth: 'fit-content', width: '100%' }}>
                {/* 部門ヘッダー */}
                <div className="flex border-b-2 border-gray-200 sticky top-0 z-30 bg-white">
                  <div className="w-28 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center font-bold text-sm text-gray-800 bg-white">
                    日付
                  </div>
                  <div className="w-20 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center font-bold text-sm text-gray-800 bg-white">
                    日数
                  </div>
                  {DEPARTMENTS.map((dept, index) => (
                    <div
                      key={dept.name}
                      className={`text-center py-2 px-1 font-bold text-sm ${
                        index === 0 ? 'bg-blue-100 text-blue-900' :
                        index === 1 ? 'bg-green-100 text-green-900' :
                        index === 2 ? 'bg-orange-100 text-orange-900' :
                        'bg-purple-100 text-purple-900'
                      } ${index < DEPARTMENTS.length - 1 ? 'border-r-4 border-white' : ''}`}
                      style={{
                        flex: `${dept.positions.length} 1 0%`,
                        minWidth: `${dept.positions.length * 80}px`
                      }}
                    >
                      {dept.name}
                    </div>
                  ))}
                </div>

                {/* 職種ヘッダー */}
                <div className="flex border-b-2 border-gray-200 bg-white sticky z-20" style={{ top: '48px' }}>
                  <div className="w-28 flex-shrink-0 border-r-2 border-gray-200 p-2 text-center text-xs font-bold bg-gray-50">
                    日付
                  </div>
                  <div className="w-20 flex-shrink-0 border-r-2 border-gray-200 p-2 text-center text-xs font-bold bg-gray-50">
                    日
                  </div>
                  {ALL_POSITIONS.map((position) => {
                    const employee = getEmployeeByPosition(position)
                    const completionRate = getCompletionRateByPosition(position)
                    return (
                      <div
                        key={position}
                        className="border-r border-gray-200 p-2 text-center bg-white"
                        style={{ flex: '1 1 0%', minWidth: '80px' }}
                      >
                        <div className="font-bold text-xs text-gray-800 mb-1 truncate">{position}</div>
                        <div className="text-xs text-gray-600 truncate" title={employee ? `${employee.last_name} ${employee.first_name}` : '未割当'}>
                          {employee ? `${employee.last_name}` : '-'}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-green-700 whitespace-nowrap">{completionRate}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* グリッドボディ */}
                <div>
                  {Array.from({ length: getDeliveryDays(project) + 1 }, (_, index) => index).map((day) => {
                    const hasTask = tasks.some(t => t.dayFromContract === day)
                    const currentDate = addDays(new Date(project.contract_date), day)
                    const todayDay = getTodayFromContract(project.contract_date)
                    const isToday = day === todayDay
                    return (
                      <div
                        key={day}
                        ref={isToday ? todayRowRef : null}
                        className={`flex border-b border-gray-200 min-h-[60px] ${
                          day % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } ${hasTask ? 'hover:bg-blue-50' : ''}`}
                        style={isToday ? {
                          borderTop: '4px solid #dc2626',
                          backgroundColor: '#fef2f2'
                        } : {}}
                      >
                        <div className={`w-28 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center text-base font-bold flex items-center justify-center ${
                          hasTask ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                        }`}>
                          {format(currentDate, 'MM/dd (E)', { locale: ja })}
                        </div>

                        <div className={`w-20 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center text-base font-bold flex items-center justify-center ${
                          hasTask ? 'text-blue-700' : 'text-gray-600'
                        }`}>
                          {day}日
                        </div>

                        {ALL_POSITIONS.map((position) => {
                          const positionTasks = getTasksForPositionAndDay(position, day)
                          return (
                            <div
                              key={position}
                              className="border-r border-gray-200 p-2 text-center hover:bg-yellow-50 transition-colors cursor-pointer flex flex-col justify-center"
                              style={{ flex: '1 1 0%', minWidth: '80px' }}
                              onDoubleClick={() => handleCellDoubleClick(position, day)}
                              title="ダブルクリックでタスク追加"
                            >
                              {positionTasks.map((task) => {
                                // 遅延判定：期限日が過ぎていて未完了の場合
                                const isDelayed = task.due_date &&
                                  task.status !== 'completed' &&
                                  new Date(task.due_date) < new Date()

                                return (
                                  <div
                                    key={task.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedTask(task)
                                      setShowDetailModal(true)
                                    }}
                                    className={`text-sm px-2 py-1 rounded truncate cursor-pointer mb-1 ${
                                      isDelayed ? 'bg-red-200 text-red-900 font-bold' :
                                      task.status === 'completed' ? 'bg-blue-200 text-blue-900 font-bold' :
                                      task.status === 'requested' ? 'bg-yellow-200 text-yellow-900 font-semibold' :
                                      'bg-gray-200 text-gray-800'
                                    }`}
                                    title={task.title}
                                  >
                                    {task.title}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* グリッド説明 */}
            <div className="p-2 bg-blue-50 border-t-2 border-gray-300 text-xs text-gray-700">
              <div className="flex items-center gap-4">
                <span className="font-bold">使い方:</span>
                <span>• タスククリック → 詳細表示</span>
                <span>• セルダブルクリック → タスク追加</span>
                <span>• 縦軸: 契約日からの日数 / 横軸: 職種</span>
              </div>
            </div>
          </div>
        )}

        {/* タスク追加モーダル */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl border-2 border-gray-300">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b-2 border-gray-300 pb-3">新しいタスクを追加</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    タスク名 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="例: 初回面談"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    期限 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    担当者
                  </label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="">未割り当て</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.last_name} {emp.first_name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    優先度
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    詳細説明
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    rows={4}
                    placeholder="タスクの詳細説明（任意）"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setNewTask({
                      title: '',
                      description: '',
                      assigned_to: '',
                      due_date: '',
                      priority: 'medium'
                    })
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-400 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-bold"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddTask}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold border-2 border-green-700 shadow-md"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* タスク詳細モーダル */}
        {showDetailModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto border-2 border-gray-300">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-300">
                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
                <button
                  onClick={() => {
                    setSelectedTask(null)
                    setShowDetailModal(false)
                    setEditingDueDate(false)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* ステータス変更ボタン */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">ステータス</h3>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 ${
                      selectedTask.status === 'not_started'
                        ? 'bg-gray-500 text-white shadow-lg border-gray-700'
                        : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-400'
                    }`}
                  >
                    ⚫ 未着手
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 ${
                      selectedTask.status === 'requested'
                        ? 'bg-yellow-400 text-gray-900 shadow-lg border-yellow-600'
                        : 'bg-white text-yellow-900 hover:bg-yellow-50 border-yellow-400'
                    }`}
                  >
                    🟡 着手中
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 ${
                      selectedTask.status === 'delayed'
                        ? 'bg-red-500 text-white shadow-lg border-red-700'
                        : 'bg-white text-red-900 hover:bg-red-50 border-red-400'
                    }`}
                  >
                    🔴 遅延
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 ${
                      selectedTask.status === 'completed'
                        ? 'bg-blue-500 text-white shadow-lg border-blue-700'
                        : 'bg-white text-blue-900 hover:bg-blue-50 border-blue-400'
                    }`}
                  >
                    🔵 完了
                  </button>
                </div>
              </div>

              {/* 期限日カード */}
              <div className="mb-6">
                <div
                  onClick={() => setEditingDueDate(true)}
                  className="bg-gradient-to-br from-blue-100 to-blue-200 p-6 border-2 border-blue-500 shadow-md hover:shadow-lg transition-all cursor-pointer rounded-lg"
                >
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-900 mb-2">期限日</div>
                    {editingDueDate ? (
                      <input
                        type="date"
                        value={selectedTask.due_date || ''}
                        onChange={(e) => handleUpdateDueDate(e.target.value)}
                        onBlur={() => setEditingDueDate(false)}
                        autoFocus
                        className="w-full text-center text-lg font-bold border-2 border-blue-500 rounded p-2"
                      />
                    ) : (
                      <>
                        <div className="text-2xl font-black text-blue-900">
                          {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'yyyy/MM/dd (E)', { locale: ja }) : '未設定'}
                        </div>
                        <div className="text-sm text-blue-700 mt-2">
                          契約日から {selectedTask.dayFromContract || 0}日目
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* マニュアル・動画カード */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-6 border-2 border-purple-500 shadow-md rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-bold text-purple-900 mb-3">マニュアル</div>
                    {selectedTask.manual_url ? (
                      <a
                        href={selectedTask.manual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-all font-bold text-sm shadow-md rounded-lg"
                      >
                        開く
                      </a>
                    ) : (
                      <div className="text-gray-500 text-sm">未設定</div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-100 to-pink-200 p-6 border-2 border-pink-500 shadow-md rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-bold text-pink-900 mb-3">動画</div>
                    {selectedTask.video_url ? (
                      <a
                        href={selectedTask.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-all font-bold text-sm shadow-md rounded-lg"
                      >
                        再生
                      </a>
                    ) : (
                      <div className="text-gray-500 text-sm">未設定</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 作業内容 */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-300 shadow-md mb-6">
                <div className="mb-3">
                  <span className="text-lg font-bold text-blue-900">作業内容</span>
                </div>
                <div className="text-base leading-relaxed text-gray-800 bg-white p-4 rounded-lg border border-gray-300">
                  {selectedTask.description || 'なし'}
                </div>
              </div>

              {/* Do's & Don'ts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-400 shadow-md">
                  <div className="mb-3">
                    <span className="text-lg font-bold text-green-900">Do's (推奨事項)</span>
                  </div>
                  <div className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap bg-white p-4 rounded-lg max-h-48 overflow-y-auto border border-gray-300">
                    {selectedTask.dos || '設定されていません'}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border-2 border-red-400 shadow-md">
                  <div className="mb-3">
                    <span className="text-lg font-bold text-red-900">Don'ts (禁止事項)</span>
                  </div>
                  <div className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap bg-white p-4 rounded-lg max-h-48 overflow-y-auto border border-gray-300">
                    {selectedTask.donts || '設定されていません'}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-gray-300">
                <button
                  onClick={() => {
                    setSelectedTask(null)
                    setShowDetailModal(false)
                    setEditingDueDate(false)
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-bold text-lg shadow-md border-2 border-blue-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
