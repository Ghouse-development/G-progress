import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowUpDown, Plus, Eye, Trash2, Table, List, Grid, RefreshCw, X, Lock, Users, AlertTriangle } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { regenerateProjectTasks } from '../utils/taskGenerator'
import { useRealtimeEditing } from '../hooks/useRealtimeEditing'
import { useAuditLog } from '../hooks/useAuditLog'
import { useNotifications } from '../hooks/useNotifications'
import { ORGANIZATION_HIERARCHY } from '../constants/organizationHierarchy'
import ProjectDetailFields from '../components/ProjectDetailFields'

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
  task_master?: {
    trigger_task_id?: string
    days_from_trigger?: number
    trigger_task?: {
      title: string
    }
  }
}

type SortField = 'due_date' | 'status' | 'priority' | 'title' | 'dayFromContract' | 'construction_start' | 'business_no'
type FilterStatus = 'all' | 'not_started' | 'requested' | 'delayed' | 'completed'

// 部門と職種の定義（organizationHierarchy.tsから取得）
const DEPARTMENTS = ORGANIZATION_HIERARCHY
const ALL_POSITIONS = DEPARTMENTS.flatMap(d => d.positions)

// 今日が契約日から何日目かを計算
const getTodayFromContract = (contractDate: string): number => {
  return differenceInDays(new Date(), new Date(contractDate))
}

// 引き渡し日までの日数を計算（常に999日を表示）
const getDeliveryDays = (project: Project, tasks: TaskWithEmployee[] = []): number => {
  // 常に999日まで表示（全タスク対応）
  return 999
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { logCreate, logUpdate, logDelete } = useAuditLog()
  const { notifyTaskAssignment, notifyTaskCompletion } = useNotifications()
  const [project, setProject] = useState<ProjectWithRelations | null>(null)
  const [tasks, setTasks] = useState<TaskWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])

  // フィルタ・ソート状態
  const [sortField, setSortField] = useState<SortField>('business_no')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // グリッドビュー用
  const todayRowRef = useRef<HTMLDivElement>(null)

  // 現在のユーザーID
  const currentEmployeeId = localStorage.getItem('selectedEmployeeId') || ''

  // モーダル状態
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithEmployee | null>(null)
  const [editingDueDate, setEditingDueDate] = useState(false)

  // リアルタイム編集機能（選択されたタスク用）
  const taskEditLock = useRealtimeEditing({
    resourceType: 'task',
    resourceId: selectedTask?.id || '',
    employeeId: currentEmployeeId,
    enabled: !!selectedTask?.id
  })

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
          // Realtime task change received

          // リアルタイムイベントから変更内容を取得して、即座に反映（楽観的更新）
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedTask = payload.new as any

            // タスクリストを更新（画面リロードなし）
            setTasks(prevTasks => {
              const existingTask = prevTasks.find(t => t.id === updatedTask.id)
              if (existingTask) {
                // dayFromContractを計算
                const dayFromContract = updatedTask.due_date && project?.contract_date
                  ? differenceInDays(new Date(updatedTask.due_date), new Date(project.contract_date))
                  : 0

                return prevTasks.map(t =>
                  t.id === updatedTask.id
                    ? { ...t, ...updatedTask, dayFromContract }
                    : t
                )
              }
              return prevTasks
            })

            // 選択中のタスクも更新
            if (selectedTask && selectedTask.id === updatedTask.id) {
              setSelectedTask(prev => prev ? { ...prev, ...updatedTask } : null)
            }
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            // 新規追加・削除の場合のみ再読み込み（頻度が低い）
            loadProjectData(false)
          }
        }
      )
      .subscribe()

    // クリーンアップ: コンポーネントのアンマウント時にサブスクリプション解除
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, project, selectedTask])

  const loadEmployees = async () => {
    try {
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
    } catch (error) {
      console.error('予期しないエラー:', error)
      toast.error('予期しないエラーが発生しました')
    }
  }

  const loadProjectData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

      // 従業員データも同時に再読み込み（担当者変更を反映するため）
      await loadEmployees()

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:employees!projects_assigned_sales_fkey(id, last_name, first_name, department),
          design:employees!projects_assigned_design_fkey(id, last_name, first_name, department),
          construction:employees!projects_assigned_construction_fkey(id, last_name, first_name, department)
        `)
        .eq('id', id)
        .single()

      if (projectError) throw projectError

      setProject(projectData as unknown as ProjectWithRelations)

      const { data: tasksData, error: tasksError} = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_employee:assigned_to(id, last_name, first_name, department),
          task_master:task_master_id(business_no, task_order, trigger_task_id, days_from_trigger, trigger_task:trigger_task_id(title))
        `)
        .eq('project_id', id)

      if (tasksError) throw tasksError

      const tasksWithDays = (tasksData || []).map((task: any) => {
        const dayFromContract = task.due_date && projectData?.contract_date
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
      // Failed to fetch project
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'not_started' | 'requested' | 'delayed' | 'completed') => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId)
      const oldStatus = taskToUpdate?.status

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
        toast.error(`ステータスの更新に失敗しました: ${error.message}`)
        await loadProjectData(false)
      } else {
        // 監査ログ記録
        const statusText = {
          'not_started': '未着手',
          'requested': '着手中',
          'delayed': '遅延',
          'completed': '完了'
        }
        await logUpdate(
          'tasks',
          taskId,
          { status: oldStatus, task_title: taskToUpdate?.title },
          { status: newStatus, task_title: taskToUpdate?.title },
          `タスク「${taskToUpdate?.title}」のステータスを「${statusText[oldStatus as keyof typeof statusText] || oldStatus}」→「${statusText[newStatus]}」に変更しました`
        )

        // タスク完了通知（完了ステータスに変更された場合）
        if (newStatus === 'completed' && oldStatus !== 'completed') {
          const completedByEmployee = employees.find(e => e.id === currentEmployeeId)
          if (completedByEmployee && project?.assigned_sales) {
            await notifyTaskCompletion(
              project.assigned_sales,
              taskToUpdate?.title || '',
              project.customer?.names?.join('・') || '',
              `${completedByEmployee.last_name} ${completedByEmployee.first_name}`,
              taskId
            )
          }
        }

        toast.success('ステータスを更新しました')
        loadProjectData(false)
      }
    } catch (err) {
      toast.error(`予期しないエラーが発生しました: ${err}`)
      await loadProjectData(false)
    }
  }

  const handleUpdateDueDate = async (newDate: string) => {
    if (!selectedTask) return

    const oldDate = selectedTask.due_date

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
      // 監査ログ記録
      await logUpdate(
        'tasks',
        selectedTask.id,
        { due_date: oldDate, task_title: selectedTask.title },
        { due_date: newDate, task_title: selectedTask.title },
        `タスク「${selectedTask.title}」の期限日を${oldDate ? format(new Date(oldDate), 'yyyy/MM/dd', { locale: ja }) : '未設定'}→${format(new Date(newDate), 'yyyy/MM/dd', { locale: ja })}に変更しました`
      )

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

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()

    if (error) {
      toast.error('タスクの追加に失敗しました: ' + error.message)
    } else {

      // 監査ログ記録
      if (data && data[0]) {
        const assignedEmployee = employees.find(e => e.id === newTask.assigned_to)
        await logCreate(
          'tasks',
          data[0].id,
          {
            title: newTask.title,
            project_name: project.customer?.names?.join('・') || '不明',
            assigned_to: assignedEmployee ? `${assignedEmployee.last_name} ${assignedEmployee.first_name}` : '未割当',
            due_date: newTask.due_date,
            priority: newTask.priority
          },
          `案件「${project.customer?.names?.join('・')}様邸」にタスク「${newTask.title}」を追加しました`
        )

        // タスク割り当て通知（担当者が割り当てられた場合）
        if (newTask.assigned_to) {
          await notifyTaskAssignment(
            newTask.assigned_to,
            newTask.title,
            project.customer?.names?.join('・') || '',
            data[0].id
          )
        }
      }

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

    const taskToDelete = tasks.find(t => t.id === taskId)

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      toast.error('タスクの削除に失敗しました: ' + error.message)
    } else {
      // 監査ログ記録
      if (taskToDelete) {
        await logDelete(
          'tasks',
          taskId,
          {
            title: taskToDelete.title,
            project_name: project?.customer?.names?.join('・') || '不明',
            status: taskToDelete.status,
            due_date: taskToDelete.due_date
          },
          `案件「${project?.customer?.names?.join('・')}様邸」のタスク「${taskToDelete.title}」を削除しました`
        )
      }

      toast.success('タスクを削除しました')
      await loadProjectData()
      if (selectedTask?.id === taskId) {
        closeTaskDetail()
      }
    }
  }

  // 🚀 タスク一括生成（既存タスクを削除して再生成）
  const handleRegenerateTasks = async () => {
    if (!id || !confirm('既存のすべてのタスクを削除して、タスクマスタから45個のタスクを再生成します。よろしいですか？')) {
      return
    }

    try {
      const oldTaskCount = tasks.length
      toast.info('タスクを再生成しています...')
      const result = await regenerateProjectTasks(id)

      if (result.success) {
        // 監査ログ記録
        await logCreate(
          'tasks',
          id || '',
          {
            project_name: project?.customer?.names?.join('・') || '不明',
            old_task_count: oldTaskCount,
            new_task_count: result.tasksCount
          },
          `案件「${project?.customer?.names?.join('・')}様邸」のタスクを一括再生成しました（${oldTaskCount}個→${result.tasksCount}個）`
        )

        toast.success(`✅ ${result.tasksCount}個のタスクを再生成しました`)
        await loadProjectData()
      } else {
        toast.error('タスクの再生成に失敗しました')
      }
    } catch (error) {
      toast.error('タスクの再生成中にエラーが発生しました')
    }
  }

  // タスク詳細モーダルを開く（編集ロック取得）
  const openTaskDetail = async (task: TaskWithEmployee) => {
    setSelectedTask(task)
    setShowDetailModal(true)

    try {
      // 編集ロックを取得
      const lockAcquired = await taskEditLock.acquireLock()
      if (!lockAcquired && taskEditLock.lockedBy !== currentEmployeeId) {
        toast.warning(`${taskEditLock.lockedByName || '他のユーザー'}が編集中です。閲覧のみ可能です。`)
      }
    } catch (error) {
      console.error('ロック取得に失敗:', error)
      toast.warning('編集ロックの取得に失敗しましたが、閲覧は可能です')
    }
  }

  // タスク詳細モーダルを閉じる（編集ロック解放）
  const closeTaskDetail = async () => {
    try {
      // 編集ロックを解放
      if (taskEditLock.lockedBy === currentEmployeeId) {
        await taskEditLock.releaseLock()
      }
    } catch (error) {
      console.error('ロック解放に失敗:', error)
      toast.warning('編集ロックの解放に失敗しましたが、モーダルを閉じます')
    } finally {
      setSelectedTask(null)
      setShowDetailModal(false)
      setEditingDueDate(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    // index.cssのデザインコードに統一
    switch (status) {
      case 'not_started': return 'task-not-started'
      case 'requested': return 'task-in-progress'
      case 'delayed': return 'task-delayed'
      case 'completed': return 'task-completed'
      case 'not_applicable': return 'task-completed' // 対象外も完了扱い
      default: return 'task-not-started'
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
        // 契約日からの日数でソート（dayFromContractと同じ）
        aValue = a.dayFromContract || 0
        bValue = b.dayFromContract || 0
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
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden mb-2">
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
        <div className="bg-white rounded-lg shadow-md p-4 mb-2 border border-gray-300">
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
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-300">
          <div className="overflow-x-scroll">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-400">
                <tr>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                  <th className="border border-gray-300 p-3">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="border border-gray-300 p-3">
                      <div className="h-4 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="h-6 w-20 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="h-6 w-16 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
                    </td>
                    <td className="border border-gray-300 p-3">
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
      <div className="container mx-auto p-2">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate('/projects')}
          className="mb-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-bold text-base"
        >
          ← 案件一覧に戻る
        </button>

        {/* 統合カード：プロジェクト情報 + ツールバー */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden mb-2">
          {/* プロジェクト情報（1行） */}
          <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-300">
            <div className="flex items-center gap-3 flex-wrap text-base">
              <h1 className="text-lg font-bold text-gray-900">
                {project.customer?.names?.join('・') || '顧客名なし'}様邸
              </h1>
              <span className="font-bold text-gray-700">
                契約日: {format(new Date(project.contract_date), 'yyyy/MM/dd (E)', { locale: ja })}
              </span>
              <span className="text-gray-700">
                {project.customer?.building_site || '-'}
              </span>
              <span className={`px-3 py-2 rounded-lg font-bold ${
                project.status === 'post_contract' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                project.status === 'construction' ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                'bg-green-100 text-green-800 border-2 border-green-300'
              }`}>
                {project.status === 'post_contract' ? '契約後' :
                 project.status === 'construction' ? '着工後' : '引き渡し済'}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">営業:</span>
              <span className="font-bold text-gray-900">
                {project.sales ? `${project.sales.last_name} ${project.sales.first_name}` : '未割当'}
              </span>
              <span className="text-gray-600">設計:</span>
              <span className="font-bold text-gray-900">
                {project.design ? `${project.design.last_name} ${project.design.first_name}` : '未割当'}
              </span>
              <span className="text-gray-600">工事:</span>
              <span className="font-bold text-gray-900">
                {project.construction ? `${project.construction.last_name} ${project.construction.first_name}` : '未割当'}
              </span>
            </div>
          </div>

          {/* ツールバー */}
          <div className="px-3 py-2 bg-white">
            <div className="flex items-center justify-between gap-3">
              {/* 左側：ソート */}
              <div className="flex items-center gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-base text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="business_no">業務フロー順</option>
                  <option value="dayFromContract">契約日からの日数</option>
                  <option value="due_date">期限日順</option>
                  <option value="status">ステータス順</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-200 transition-colors"
                  title={sortOrder === 'asc' ? '昇順' : '降順'}
                >
                  <ArrowUpDown size={16} />
                </button>
              </div>

              {/* 右側：フィルタとアクション */}
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-base text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全て ({tasks.length})</option>
                  <option value="not_started">未着手 ({tasks.filter(t => t.status === 'not_started').length})</option>
                  <option value="requested">着手中 ({tasks.filter(t => t.status === 'requested').length})</option>
                  <option value="delayed">遅延 ({tasks.filter(t => t.status === 'delayed').length})</option>
                  <option value="completed">完了 ({tasks.filter(t => t.status === 'completed').length})</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* プロジェクト詳細編集フィールド */}
        <ProjectDetailFields
          project={project}
          onUpdate={loadProjectData}
          tasks={tasks}
          employees={employees}
          onTaskClick={openTaskDetail}
          onTaskDelete={handleDeleteTask}
          onCellDoubleClick={handleCellDoubleClick}
          scrollToToday={scrollToToday}
          todayRowRef={todayRowRef}
        />


        {/* タスク追加モーダル */}
        {showTaskModal && (
          <div className="prisma-modal-overlay">
            <div className="prisma-modal max-w-[600px]">
              {/* ヘッダー */}
              <div className="prisma-modal-header">
                <div className="flex items-center justify-between">
                  <h2 className="prisma-modal-title">新しいタスクを追加</h2>
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
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* コンテンツ */}
              <div className="prisma-modal-content space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    タスク名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="prisma-input"
                    placeholder="例: 初回面談"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    期限 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="prisma-input"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    担当者
                  </label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="prisma-input"
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
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    優先度
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="prisma-input"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    詳細説明
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="prisma-input"
                    rows={3}
                    placeholder="タスクの詳細説明（任意）"
                  />
                </div>
              </div>

              {/* フッター */}
              <div className="prisma-modal-footer">
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
                  className="prisma-btn prisma-btn-secondary flex-1"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddTask}
                  className="prisma-btn prisma-btn-primary flex-1"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* タスク詳細モーダル */}
        {showDetailModal && selectedTask && (
          <div className="prisma-modal-overlay">
            <div className="prisma-modal max-w-[800px]">
              {/* ヘッダー */}
              <div className="prisma-modal-header">
                <div className="flex items-center justify-between">
                  <h2 className="prisma-modal-title">{selectedTask.title}</h2>
                  <button
                    onClick={closeTaskDetail}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 編集ロック状態表示 */}
                {taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId && (
                  <div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-center gap-2">
                    <Lock size={20} className="text-yellow-700" />
                    <div className="flex-1">
                      <p className="text-base font-bold text-yellow-900">
                        {taskEditLock.lockedByName}が編集中です
                      </p>
                      <p className="text-base text-yellow-700">閲覧のみ可能です。編集はできません。</p>
                    </div>
                  </div>
                )}

                {/* オンラインユーザー表示 */}
                {taskEditLock.onlineUsers.length > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg flex items-center gap-2">
                    <Users size={18} className="text-blue-700" />
                    <p className="text-base text-blue-900">
                      他に{taskEditLock.onlineUsers.length}人が閲覧中
                    </p>
                  </div>
                )}
              </div>

              {/* コンテンツ */}
              <div className="prisma-modal-content space-y-4">
                {/* ステータス変更ボタン */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                      disabled={taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId}
                      className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                        selectedTask.status === 'not_started'
                          ? 'task-not-started'
                          : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      未着手
                    </button>
                    <button
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                      disabled={taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId}
                      className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                        selectedTask.status === 'requested'
                          ? 'task-in-progress'
                          : 'bg-white text-yellow-900 hover:bg-yellow-50 border-2 border-yellow-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      着手中
                    </button>
                    <button
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                      disabled={taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId}
                      className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                        selectedTask.status === 'delayed'
                          ? 'task-delayed'
                          : 'bg-white text-red-900 hover:bg-red-50 border-2 border-red-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      遅延
                    </button>
                    <button
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                      disabled={taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId}
                      className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                        selectedTask.status === 'completed'
                          ? 'task-completed'
                          : 'bg-white text-blue-900 hover:bg-blue-50 border-2 border-blue-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      完了
                    </button>
                  </div>
                </div>

                {/* 期限日 */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    期限日
                  </label>
                  {editingDueDate ? (
                    <div>
                      <input
                        type="date"
                        value={selectedTask.due_date || ''}
                        onChange={(e) => handleUpdateDueDate(e.target.value)}
                        onBlur={(e) => {
                          // ボタンクリック時はonBlurをスキップ
                          if (e.relatedTarget?.classList.contains('date-shortcut-btn')) {
                            return
                          }
                          setEditingDueDate(false)
                        }}
                        autoFocus
                        className="prisma-input"
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <button
                          type="button"
                          className="date-shortcut-btn px-4 py-2 text-base border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-bold"
                          onClick={() => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            handleUpdateDueDate(format(today, 'yyyy-MM-dd'))
                          }}
                        >
                          今日
                        </button>
                        <button
                          type="button"
                          className="date-shortcut-btn px-4 py-2 text-base border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-bold"
                          onClick={() => {
                            const tomorrow = new Date()
                            tomorrow.setDate(tomorrow.getDate() + 1)
                            tomorrow.setHours(0, 0, 0, 0)
                            handleUpdateDueDate(format(tomorrow, 'yyyy-MM-dd'))
                          }}
                        >
                          明日
                        </button>
                        <button
                          type="button"
                          className="date-shortcut-btn px-4 py-2 text-base border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-bold"
                          onClick={() => {
                            const nextWeek = new Date()
                            nextWeek.setDate(nextWeek.getDate() + 7)
                            nextWeek.setHours(0, 0, 0, 0)
                            handleUpdateDueDate(format(nextWeek, 'yyyy-MM-dd'))
                          }}
                        >
                          1週間後
                        </button>
                        <button
                          type="button"
                          className="date-shortcut-btn px-4 py-2 text-base border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-bold"
                          onClick={() => {
                            const nextMonth = new Date()
                            nextMonth.setMonth(nextMonth.getMonth() + 1)
                            nextMonth.setHours(0, 0, 0, 0)
                            handleUpdateDueDate(format(nextMonth, 'yyyy-MM-dd'))
                          }}
                        >
                          1ヶ月後
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prisma-input bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1" onClick={() => setEditingDueDate(true)}>
                          <div className="font-medium text-gray-900">
                            {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'yyyy年MM月dd日 (E)', { locale: ja }) : '未設定'}
                          </div>
                          <div className="text-base text-gray-600 mt-1">
                            契約日から {selectedTask.dayFromContract || 0}日目
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId) {
                                toast.warning('他のユーザーが編集中です')
                                return
                              }
                              try {
                                const { error } = await supabase
                                  .from('tasks')
                                  .update({
                                    is_date_confirmed: false,
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('id', selectedTask.id)
                                if (error) throw error
                                toast.success('日付を予定に変更しました')
                                setSelectedTask({ ...selectedTask, is_date_confirmed: false })
                                // tasksステートも更新してグリッド表示に反映
                                setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, is_date_confirmed: false } : t))
                              } catch (error) {
                                console.error('日付ステータス更新エラー:', error)
                                toast.error('日付ステータスの更新に失敗しました')
                              }
                            }}
                            disabled={taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId}
                            className={`px-4 py-2 rounded-lg font-bold text-base border-2 transition-all ${
                              !selectedTask.is_date_confirmed
                                ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            予定
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId) {
                                toast.warning('他のユーザーが編集中です')
                                return
                              }
                              try {
                                const { error } = await supabase
                                  .from('tasks')
                                  .update({
                                    is_date_confirmed: true,
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('id', selectedTask.id)
                                if (error) throw error
                                toast.success('日付を確定しました')
                                setSelectedTask({ ...selectedTask, is_date_confirmed: true })
                                // tasksステートも更新してグリッド表示に反映
                                setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, is_date_confirmed: true } : t))
                              } catch (error) {
                                console.error('日付ステータス更新エラー:', error)
                                toast.error('日付ステータスの更新に失敗しました')
                              }
                            }}
                            disabled={taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId}
                            className={`px-4 py-2 rounded-lg font-bold text-base border-2 transition-all flex items-center gap-2 ${
                              selectedTask.is_date_confirmed
                                ? 'bg-green-600 text-white border-green-700 shadow-lg'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {selectedTask.is_date_confirmed && (
                              <span className="inline-flex items-center justify-center w-6 h-6 text-sm font-bold text-white bg-green-600 rounded-full border-2 border-white">
                                確
                              </span>
                            )}
                            確定
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 予定からのずれ表示 */}
                {selectedTask.original_due_date && selectedTask.due_date &&
                 selectedTask.original_due_date !== selectedTask.due_date && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      予定からのずれ
                    </label>
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                      <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <div className="font-bold text-yellow-900 text-base mb-1">
                          {(() => {
                            const daysDiff = differenceInDays(
                              new Date(selectedTask.due_date),
                              new Date(selectedTask.original_due_date)
                            )
                            const absDays = Math.abs(daysDiff)
                            return daysDiff > 0
                              ? `${absDays}日後ろ倒し`
                              : `${absDays}日前倒し`
                          })()}
                        </div>
                        <div className="text-base text-yellow-800">
                          当初予定: {format(new Date(selectedTask.original_due_date), 'yyyy年M月d日 (E)', { locale: ja })}
                          {' → '}
                          現在: {format(new Date(selectedTask.due_date), 'yyyy年M月d日 (E)', { locale: ja })}
                        </div>
                        {selectedTask.date_change_count !== undefined && selectedTask.date_change_count > 0 && (
                          <div className="text-base text-yellow-700 mt-1">
                            変更回数: {selectedTask.date_change_count}回
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* トリガーからの日にち設定（読み取り専用） */}
                {selectedTask.task_master?.trigger_task_id && selectedTask.task_master?.days_from_trigger !== undefined && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      トリガー設定
                    </label>
                    <div className="prisma-input bg-gray-50">
                      <div className="font-medium text-gray-900">
                        {selectedTask.task_master.trigger_task?.title || 'トリガータスク'}
                        {' '}
                        {selectedTask.task_master.days_from_trigger > 0 && `から ${selectedTask.task_master.days_from_trigger}日後`}
                        {selectedTask.task_master.days_from_trigger < 0 && `から ${Math.abs(selectedTask.task_master.days_from_trigger)}日前`}
                        {selectedTask.task_master.days_from_trigger === 0 && '完了時'}
                      </div>
                      <div className="text-base text-gray-600 mt-1">
                        このタスクは上記タスクの完了を起点として期限が設定されます
                      </div>
                    </div>
                  </div>
                )}

                {/* コメント */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    コメント（遅延理由・進捗状況など）
                  </label>
                  <textarea
                    value={selectedTask.comment || ''}
                    onChange={async (e) => {
                      const newComment = e.target.value
                      try {
                        const { error } = await supabase
                          .from('tasks')
                          .update({
                            comment: newComment,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', selectedTask.id)

                        if (error) throw error

                        setSelectedTask({ ...selectedTask, comment: newComment })
                      } catch (error) {
                        console.error('コメント更新エラー:', error)
                        toast.error('コメントの更新に失敗しました')
                      }
                    }}
                    disabled={taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId}
                    className="prisma-textarea"
                    placeholder="タスクに関するコメントを入力してください"
                    rows={3}
                  />
                </div>

                {/* 作業内容 */}
                {selectedTask.description && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      作業内容
                    </label>
                    <div className="prisma-textarea bg-gray-50 min-h-[80px]">
                      {selectedTask.description}
                    </div>
                  </div>
                )}

                {/* Do's & Don'ts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {selectedTask.dos && (
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Do's（推奨事項）
                      </label>
                      <div className="prisma-textarea bg-gray-50 whitespace-pre-wrap min-h-[120px] max-h-[200px] overflow-y-auto">
                        {selectedTask.dos}
                      </div>
                    </div>
                  )}

                  {selectedTask.donts && (
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Don'ts（禁止事項）
                      </label>
                      <div className="prisma-textarea bg-gray-50 whitespace-pre-wrap min-h-[120px] max-h-[200px] overflow-y-auto">
                        {selectedTask.donts}
                      </div>
                    </div>
                  )}
                </div>

                {/* マニュアル・動画 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
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
                      <div className="text-gray-500 text-base">未設定</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
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
                      <div className="text-gray-500 text-base">未設定</div>
                    )}
                  </div>
                </div>
              </div>

              {/* フッター */}
              <div className="prisma-modal-footer">
                <button
                  onClick={closeTaskDetail}
                  className="prisma-btn prisma-btn-secondary"
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
