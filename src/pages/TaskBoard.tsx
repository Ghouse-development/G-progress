import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Task, Employee, Payment } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, Clock, DollarSign, CheckCircle, X, ExternalLink } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useSettings } from '../contexts/SettingsContext'
import { generateDemoTasks, generateDemoPayments, generateDemoProjects, generateDemoCustomers } from '../utils/demoData'

interface TaskWithEmployee extends Task {
  assigned_employee?: Employee
  project?: {
    id: string
    customer_names: string[]
  }
}

interface PaymentWithProject extends Payment {
  project?: {
    id: string
    customer_names: string[]
  }
}

export default function TaskBoard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { demoMode } = useSettings()
  const [tasks, setTasks] = useState<TaskWithEmployee[]>([])
  const [payments, setPayments] = useState<PaymentWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithEmployee | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const currentEmployeeId = localStorage.getItem('selectedEmployeeId') || ''

  useEffect(() => {
    loadData()
  }, [demoMode])

  const loadData = async () => {
    try {
      setLoading(true)

      if (demoMode) {
        // デモモード：サンプルデータを使用
        const demoTasks = generateDemoTasks('admin')
        const demoPayments = generateDemoPayments('admin')
        const demoProjects = generateDemoProjects('admin')
        const demoCustomers = generateDemoCustomers()

        // タスクにプロジェクト情報を紐付け
        const tasksWithProjects = demoTasks.map(task => {
          const project = demoProjects.find(p => p.id === task.project_id)
          const customer = project ? demoCustomers.find(c => c.id === project.customer_id) : null
          return {
            ...task,
            project: project ? {
              id: project.id,
              customer_names: customer?.names || []
            } : undefined
          }
        })

        // 入金にプロジェクト情報を紐付け
        const paymentsWithProjects = demoPayments.map(payment => {
          const project = demoProjects.find(p => p.id === payment.project_id)
          const customer = project ? demoCustomers.find(c => c.id === project.customer_id) : null
          return {
            ...payment,
            project: project ? {
              id: project.id,
              customer_names: customer?.names || []
            } : undefined
          }
        })

        setTasks(tasksWithProjects as TaskWithEmployee[])
        setPayments(paymentsWithProjects as PaymentWithProject[])
        setLoading(false)
        return
      }

      // 通常モード：Supabaseからデータを取得
      // タスク取得
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_employee:employees(id, first_name, last_name, department),
          project:projects(id, customer_names)
        `)
        .eq('assigned_to', currentEmployeeId)
        .order('due_date', { ascending: true })

      if (tasksError) throw tasksError

      // 入金取得
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          project:projects(id, customer_names)
        `)
        .order('scheduled_date', { ascending: true })

      if (paymentsError) throw paymentsError

      setTasks(tasksData || [])
      setPayments(paymentsData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      showToast('データの読み込みに失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 遅延タスク（期限切れで未完了）
  const delayedTasks = tasks.filter(task => {
    if (task.status === 'completed') return false
    if (!task.due_date) return false
    return new Date(task.due_date) < new Date()
  })

  // 期日が近いタスク（7日以内で未完了）
  const upcomingTasks = tasks.filter(task => {
    if (task.status === 'completed') return false
    if (!task.due_date) return false
    const daysUntilDue = differenceInDays(new Date(task.due_date), new Date())
    return daysUntilDue >= 0 && daysUntilDue <= 7
  })

  // 入金予定（31日以内で未完了）
  const upcomingPayments = payments.filter(payment => {
    if (payment.status === 'completed') return false
    if (!payment.scheduled_date) return false
    const daysUntil = differenceInDays(new Date(payment.scheduled_date), new Date())
    return daysUntil >= 0 && daysUntil <= 31
  })

  // 完了したタスク・入金（7日以内）
  const completedTasks = tasks.filter(task => {
    if (task.status !== 'completed') return false
    if (!task.updated_at) return false
    const daysSinceCompleted = differenceInDays(new Date(), new Date(task.updated_at))
    return daysSinceCompleted <= 7
  })

  const completedPayments = payments.filter(payment => {
    if (payment.status !== 'completed') return false
    if (!payment.updated_at) return false
    const daysSinceCompleted = differenceInDays(new Date(), new Date(payment.updated_at))
    return daysSinceCompleted <= 7
  })

  const handleTaskClick = (task: TaskWithEmployee) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'not_started' | 'requested' | 'delayed' | 'completed') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      showToast('ステータスを更新しました', 'success')
      loadData()
      setShowTaskModal(false)
    } catch (error) {
      console.error('Failed to update task status:', error)
      showToast('更新に失敗しました', 'error')
    }
  }

  const handleNavigateToProject = (projectId: string) => {
    navigate(`/projects/${projectId}`)
  }

  if (loading) {
    return (
      <div className="prisma-content">
        <div className="prisma-empty">読み込み中...</div>
      </div>
    )
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="prisma-header">
        <h1 className="prisma-header-title">タスクボード</h1>
      </div>

      {/* メインコンテンツ */}
      <div className="prisma-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 遅延ボックス */}
          <div className="prisma-card">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #FCA5A5, #EF4444)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <AlertTriangle size={20} />
                遅延（{delayedTasks.length}件）
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {delayedTasks.length === 0 ? (
                <div className="text-center py-8 text-base text-gray-500">遅延タスクはありません</div>
              ) : (
                <div className="space-y-2">
                  {delayedTasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-white border-2 border-red-200 rounded-lg p-3 hover:border-red-400 hover:shadow-md cursor-pointer transition-all"
                    >
                      {/* 1行目：タスク名 + ステータスボタン */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="text-base font-bold text-gray-900 flex-1 mr-3"
                          onClick={() => handleTaskClick(task)}
                        >
                          {task.title}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateTaskStatus(task.id, 'completed')
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-bold whitespace-nowrap transition-colors flex items-center gap-1"
                          title="完了にする"
                        >
                          <CheckCircle size={16} />
                          完了
                        </button>
                      </div>
                      {/* 2行目：お客様 + 予定日 + 遅延日数 */}
                      <div className="flex items-center justify-between text-base">
                        <span className="text-gray-700 font-semibold">
                          {task.project ? `${task.project.customer_names[0]}様` : '-'}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">
                            {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                          </span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                            {task.due_date && `${differenceInDays(new Date(), new Date(task.due_date))}日遅れ`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 期日が近いボックス */}
          <div className="prisma-card">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #FDE047, #EAB308)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <Clock size={20} />
                期日が近い（{upcomingTasks.length}件）
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-8 text-base text-gray-500">期日が近いタスクはありません</div>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-white border-2 border-yellow-200 rounded-lg p-3 hover:border-yellow-400 hover:shadow-md cursor-pointer transition-all"
                    >
                      {/* 1行目：タスク名 + ステータスボタン */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="text-base font-bold text-gray-900 flex-1 mr-3"
                          onClick={() => handleTaskClick(task)}
                        >
                          {task.title}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateTaskStatus(task.id, 'completed')
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-bold whitespace-nowrap transition-colors flex items-center gap-1"
                          title="完了にする"
                        >
                          <CheckCircle size={16} />
                          完了
                        </button>
                      </div>
                      {/* 2行目：お客様 + 予定日 + 残り日数 */}
                      <div className="flex items-center justify-between text-base">
                        <span className="text-gray-700 font-semibold">
                          {task.project ? `${task.project.customer_names[0]}様` : '-'}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">
                            {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                          </span>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">
                            {task.due_date && `あと${differenceInDays(new Date(task.due_date), new Date())}日`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 入金ボックス */}
          <div className="prisma-card">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #86EFAC, #10B981)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <DollarSign size={20} />
                入金予定（{upcomingPayments.length}件）
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {upcomingPayments.length === 0 ? (
                <div className="text-center py-8 text-base text-gray-500">入金予定はありません</div>
              ) : (
                <div className="space-y-2">
                  {upcomingPayments.map(payment => (
                    <div
                      key={payment.id}
                      onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                      className="bg-white border-2 border-green-200 rounded-lg p-3 hover:border-green-400 hover:shadow-md cursor-pointer transition-all"
                    >
                      {/* 1行目：名目 + 金額 */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-bold text-gray-900">{payment.payment_type}</span>
                        <span className="text-base font-bold text-green-700">
                          ¥{payment.scheduled_amount?.toLocaleString() || '-'}
                        </span>
                      </div>
                      {/* 2行目：お客様 + 予定日 + 残り日数 */}
                      <div className="flex items-center justify-between text-base">
                        <span className="text-gray-700 font-semibold">
                          {payment.project ? `${payment.project.customer_names[0]}様` : '-'}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">
                            {payment.scheduled_date ? format(new Date(payment.scheduled_date), 'M/d (E)', { locale: ja }) : '-'}
                          </span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                            {payment.scheduled_date && `あと${differenceInDays(new Date(payment.scheduled_date), new Date())}日`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 完了ボックス */}
          <div className="prisma-card">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #93C5FD, #2563EB)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <CheckCircle size={20} />
                完了（{completedTasks.length + completedPayments.length}件）
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {completedTasks.length === 0 && completedPayments.length === 0 ? (
                <div className="text-center py-8 text-base text-gray-500">完了したタスク・入金はありません</div>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="bg-white border-2 border-blue-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                    >
                      {/* 1行目：タスク名 + ステータス */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-base font-bold text-gray-900 flex-1 mr-3">
                          {task.title}
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold whitespace-nowrap">
                          完了
                        </span>
                      </div>
                      {/* 2行目：お客様 + 完了日 */}
                      <div className="flex items-center justify-between text-base">
                        <span className="text-gray-700 font-semibold">
                          {task.project ? `${task.project.customer_names[0]}様` : '-'}
                        </span>
                        <span className="text-gray-600">
                          {task.actual_completion_date ? format(new Date(task.actual_completion_date), 'M/d (E)', { locale: ja }) : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {completedPayments.map(payment => (
                    <div
                      key={payment.id}
                      onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                      className="bg-white border-2 border-blue-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                    >
                      {/* 1行目：名目 + 金額 */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-bold text-gray-900">{payment.payment_type}</span>
                        <span className="text-base font-bold text-green-700">
                          ¥{payment.actual_amount?.toLocaleString() || '-'}
                        </span>
                      </div>
                      {/* 2行目：お客様 + 入金日 + ステータス */}
                      <div className="flex items-center justify-between text-base">
                        <span className="text-gray-700 font-semibold">
                          {payment.project ? `${payment.project.customer_names[0]}様` : '-'}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">
                            {payment.actual_date ? format(new Date(payment.actual_date), 'M/d (E)', { locale: ja }) : '-'}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                            入金済
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* タスク詳細モーダル */}
      {showTaskModal && selectedTask && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[600px]">
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">{selectedTask.title}</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              {/* ステータス変更ボタン */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  ステータス変更
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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

              {/* タスク情報 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-1">期限</label>
                  <p className="text-base text-gray-900">
                    {selectedTask.due_date
                      ? format(new Date(selectedTask.due_date), 'yyyy年M月d日 (E)', { locale: ja })
                      : '未設定'}
                  </p>
                </div>

                {selectedTask.description && (
                  <div>
                    <label className="block text-base font-bold text-gray-700 mb-1">説明</label>
                    <p className="text-base text-gray-900">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.project && (
                  <div>
                    <label className="block text-base font-bold text-gray-700 mb-1">案件</label>
                    <p className="text-base text-gray-900 mb-2">
                      {selectedTask.project.customer_names.join('・')}様
                    </p>
                    <button
                      onClick={() => handleNavigateToProject(selectedTask.project!.id)}
                      className="prisma-btn prisma-btn-secondary text-base inline-flex items-center gap-2"
                    >
                      <ExternalLink size={16} />
                      案件詳細を見る
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => setShowTaskModal(false)}
                className="prisma-btn prisma-btn-secondary flex-1"
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
