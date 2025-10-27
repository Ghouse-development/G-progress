import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Task, Employee, Payment } from '../types/database'
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, Clock, DollarSign, CheckCircle, X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

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

export default function TaskStatus() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<TaskWithEmployee[]>([])
  const [payments, setPayments] = useState<PaymentWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithEmployee | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const currentEmployeeId = localStorage.getItem('selectedEmployeeId') || ''

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

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
    return isBefore(new Date(task.due_date), new Date())
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
      <div className="p-6">
        <div className="text-center text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">タスク状況</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 遅延ボックス */}
          <div className="bg-white rounded-lg border-4 border-red-500 shadow-xl overflow-hidden">
            <div className="bg-red-100 px-6 py-4 border-b-4 border-red-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={28} className="text-red-700" />
                <h2 className="text-2xl font-bold text-red-900">遅延</h2>
              </div>
              <span className="text-3xl font-bold text-red-700">{delayedTasks.length}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {delayedTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-base">遅延タスクはありません</p>
              ) : (
                <div className="space-y-3">
                  {delayedTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="p-4 bg-red-50 rounded-lg border-3 border-red-300 hover:bg-red-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-900">{task.title}</h3>
                        <span className="text-sm font-bold text-red-700">
                          {task.due_date && `${differenceInDays(new Date(), new Date(task.due_date))}日遅れ`}
                        </span>
                      </div>
                      {task.project && (
                        <p className="text-sm text-gray-600 mb-1">
                          案件: {task.project.customer_names.join('・')}様
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        期限: {task.due_date && format(new Date(task.due_date), 'M月d日 (E)', { locale: ja })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 期日が近いボックス */}
          <div className="bg-white rounded-lg border-4 border-yellow-500 shadow-xl overflow-hidden">
            <div className="bg-yellow-100 px-6 py-4 border-b-4 border-yellow-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={28} className="text-yellow-700" />
                <h2 className="text-2xl font-bold text-yellow-900">期日が近い（7日以内）</h2>
              </div>
              <span className="text-3xl font-bold text-yellow-700">{upcomingTasks.length}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {upcomingTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-base">期日が近いタスクはありません</p>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="p-4 bg-yellow-50 rounded-lg border-3 border-yellow-300 hover:bg-yellow-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-900">{task.title}</h3>
                        <span className="text-sm font-bold text-yellow-700">
                          {task.due_date && `あと${differenceInDays(new Date(task.due_date), new Date())}日`}
                        </span>
                      </div>
                      {task.project && (
                        <p className="text-sm text-gray-600 mb-1">
                          案件: {task.project.customer_names.join('・')}様
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        期限: {task.due_date && format(new Date(task.due_date), 'M月d日 (E)', { locale: ja })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 入金ボックス */}
          <div className="bg-white rounded-lg border-4 border-green-500 shadow-xl overflow-hidden">
            <div className="bg-green-100 px-6 py-4 border-b-4 border-green-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign size={28} className="text-green-700" />
                <h2 className="text-2xl font-bold text-green-900">入金予定（31日以内）</h2>
              </div>
              <span className="text-3xl font-bold text-green-700">{upcomingPayments.length}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {upcomingPayments.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-base">入金予定はありません</p>
              ) : (
                <div className="space-y-3">
                  {upcomingPayments.map(payment => (
                    <div
                      key={payment.id}
                      onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                      className="p-4 bg-green-50 rounded-lg border-3 border-green-300 hover:bg-green-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-900">{payment.payment_type}</h3>
                        <span className="text-sm font-bold text-green-700">
                          {payment.scheduled_date && `あと${differenceInDays(new Date(payment.scheduled_date), new Date())}日`}
                        </span>
                      </div>
                      {payment.project && (
                        <p className="text-sm text-gray-600 mb-1">
                          案件: {payment.project.customer_names.join('・')}様
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mb-1">
                        予定日: {payment.scheduled_date && format(new Date(payment.scheduled_date), 'M月d日 (E)', { locale: ja })}
                      </p>
                      <p className="text-sm font-bold text-green-700">
                        {payment.scheduled_amount?.toLocaleString()}円
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 完了ボックス */}
          <div className="bg-white rounded-lg border-4 border-blue-500 shadow-xl overflow-hidden">
            <div className="bg-blue-100 px-6 py-4 border-b-4 border-blue-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle size={28} className="text-blue-700" />
                <h2 className="text-2xl font-bold text-blue-900">完了（7日以内）</h2>
              </div>
              <span className="text-3xl font-bold text-blue-700">
                {completedTasks.length + completedPayments.length}
              </span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {completedTasks.length === 0 && completedPayments.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-base">完了したタスク・入金はありません</p>
              ) : (
                <div className="space-y-3">
                  {completedTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="p-4 bg-blue-50 rounded-lg border-3 border-blue-300 hover:bg-blue-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-900">{task.title}</h3>
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                          完了
                        </span>
                      </div>
                      {task.project && (
                        <p className="text-sm text-gray-600 mb-1">
                          案件: {task.project.customer_names.join('・')}様
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        完了日: {task.updated_at && format(new Date(task.updated_at), 'M月d日 (E)', { locale: ja })}
                      </p>
                    </div>
                  ))}
                  {completedPayments.map(payment => (
                    <div
                      key={payment.id}
                      onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                      className="p-4 bg-blue-50 rounded-lg border-3 border-blue-300 hover:bg-blue-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-900">{payment.payment_type}</h3>
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                          入金済
                        </span>
                      </div>
                      {payment.project && (
                        <p className="text-sm text-gray-600 mb-1">
                          案件: {payment.project.customer_names.join('・')}様
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mb-1">
                        入金日: {payment.actual_date && format(new Date(payment.actual_date), 'M月d日 (E)', { locale: ja })}
                      </p>
                      <p className="text-sm font-bold text-blue-700">
                        {payment.actual_amount?.toLocaleString()}円
                      </p>
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
      <div className="prisma-modal" style={{ maxWidth: '600px' }}>
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
            <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
              ステータス
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                  selectedTask.status === 'not_started'
                    ? 'task-not-started'
                    : 'bg-white text-gray-900 hover:bg-gray-50 border-2 border-gray-300'
                }`}
              >
                未着手
              </button>
              <button
                onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                  selectedTask.status === 'requested'
                    ? 'task-in-progress'
                    : 'bg-white text-yellow-900 hover:bg-yellow-50 border-2 border-yellow-300'
                }`}
              >
                着手中
              </button>
              <button
                onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                  selectedTask.status === 'delayed'
                    ? 'task-delayed'
                    : 'bg-white text-red-900 hover:bg-red-50 border-2 border-red-300'
                }`}
              >
                遅れ
              </button>
              <button
                onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
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
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-bold text-gray-700">期限</label>
              <p className="text-base text-gray-900">
                {selectedTask.due_date
                  ? format(new Date(selectedTask.due_date), 'yyyy年M月d日 (E)', { locale: ja })
                  : '未設定'}
              </p>
            </div>

            {selectedTask.description && (
              <div>
                <label className="block text-sm font-bold text-gray-700">説明</label>
                <p className="text-base text-gray-900">{selectedTask.description}</p>
              </div>
            )}

            {selectedTask.project && (
              <div>
                <label className="block text-sm font-bold text-gray-700">案件</label>
                <p className="text-base text-gray-900">
                  {selectedTask.project.customer_names.join('・')}様
                </p>
                <button
                  onClick={() => handleNavigateToProject(selectedTask.project!.id)}
                  className="mt-2 prisma-btn prisma-btn-secondary text-sm"
                >
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
