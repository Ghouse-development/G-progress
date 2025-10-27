import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Task, Employee, Payment } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, Clock, DollarSign, CheckCircle, X, ExternalLink } from 'lucide-react'
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

export default function TaskBoard() {
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
      <div className="p-6">
        <div className="text-center text-gray-500 text-xl font-bold">読み込み中...</div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            タスクボード
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 遅延ボックス */}
            <div className="group bg-white rounded-2xl border-4 border-red-400 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 border-b-4 border-red-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                      <AlertTriangle size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">遅延</h2>
                  </div>
                  <div className="bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                    <span className="text-3xl font-bold text-white">{delayedTasks.length}</span>
                  </div>
                </div>
              </div>
              <div className="p-5 max-h-[500px] overflow-y-auto custom-scrollbar">
                {delayedTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 font-semibold text-lg">遅延タスクはありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {delayedTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="group/card p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-3 border-red-300 hover:border-red-500 hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">{task.title}</h3>
                          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-1">
                            <AlertTriangle size={14} />
                            {task.due_date && `${differenceInDays(new Date(), new Date(task.due_date))}日遅れ`}
                          </div>
                        </div>
                        {task.project && (
                          <p className="text-base text-gray-700 mb-2 font-medium">
                            {task.project.customer_names.join('・')}様
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={16} />
                          <span>期限: {task.due_date && format(new Date(task.due_date), 'M月d日 (E)', { locale: ja })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 期日が近いボックス */}
            <div className="group bg-white rounded-2xl border-4 border-yellow-400 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-5 border-b-4 border-yellow-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                      <Clock size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">期日が近い</h2>
                  </div>
                  <div className="bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                    <span className="text-3xl font-bold text-white">{upcomingTasks.length}</span>
                  </div>
                </div>
              </div>
              <div className="p-5 max-h-[500px] overflow-y-auto custom-scrollbar">
                {upcomingTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 font-semibold text-lg">期日が近いタスクはありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="group/card p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-3 border-yellow-300 hover:border-yellow-500 hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">{task.title}</h3>
                          <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-1">
                            <Clock size={14} />
                            {task.due_date && `あと${differenceInDays(new Date(task.due_date), new Date())}日`}
                          </div>
                        </div>
                        {task.project && (
                          <p className="text-base text-gray-700 mb-2 font-medium">
                            {task.project.customer_names.join('・')}様
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={16} />
                          <span>期限: {task.due_date && format(new Date(task.due_date), 'M月d日 (E)', { locale: ja })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 入金ボックス */}
            <div className="group bg-white rounded-2xl border-4 border-green-400 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-5 border-b-4 border-green-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                      <DollarSign size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">入金予定</h2>
                  </div>
                  <div className="bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                    <span className="text-3xl font-bold text-white">{upcomingPayments.length}</span>
                  </div>
                </div>
              </div>
              <div className="p-5 max-h-[500px] overflow-y-auto custom-scrollbar">
                {upcomingPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 font-semibold text-lg">入金予定はありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingPayments.map(payment => (
                      <div
                        key={payment.id}
                        onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                        className="group/card p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-3 border-green-300 hover:border-green-500 hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">{payment.payment_type}</h3>
                          <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-1">
                            <Clock size={14} />
                            {payment.scheduled_date && `あと${differenceInDays(new Date(payment.scheduled_date), new Date())}日`}
                          </div>
                        </div>
                        {payment.project && (
                          <p className="text-base text-gray-700 mb-2 font-medium">
                            {payment.project.customer_names.join('・')}様
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock size={16} />
                            <span>{payment.scheduled_date && format(new Date(payment.scheduled_date), 'M月d日 (E)', { locale: ja })}</span>
                          </div>
                          <div className="text-lg font-bold text-green-700">
                            ¥{payment.scheduled_amount?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 完了ボックス */}
            <div className="group bg-white rounded-2xl border-4 border-blue-400 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 border-b-4 border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                      <CheckCircle size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">完了</h2>
                  </div>
                  <div className="bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                    <span className="text-3xl font-bold text-white">
                      {completedTasks.length + completedPayments.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5 max-h-[500px] overflow-y-auto custom-scrollbar">
                {completedTasks.length === 0 && completedPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 font-semibold text-lg">完了したタスク・入金はありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="group/card p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-3 border-blue-300 hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">{task.title}</h3>
                          <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-1">
                            <CheckCircle size={14} />
                            完了
                          </div>
                        </div>
                        {task.project && (
                          <p className="text-base text-gray-700 mb-2 font-medium">
                            {task.project.customer_names.join('・')}様
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle size={16} />
                          <span>完了: {task.updated_at && format(new Date(task.updated_at), 'M月d日 (E)', { locale: ja })}</span>
                        </div>
                      </div>
                    ))}
                    {completedPayments.map(payment => (
                      <div
                        key={payment.id}
                        onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                        className="group/card p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-3 border-blue-300 hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">{payment.payment_type}</h3>
                          <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-1">
                            <CheckCircle size={14} />
                            入金済
                          </div>
                        </div>
                        {payment.project && (
                          <p className="text-base text-gray-700 mb-2 font-medium">
                            {payment.project.customer_names.join('・')}様
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle size={16} />
                            <span>{payment.actual_date && format(new Date(payment.actual_date), 'M月d日 (E)', { locale: ja })}</span>
                          </div>
                          <div className="text-lg font-bold text-blue-700">
                            ¥{payment.actual_amount?.toLocaleString()}
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
      </div>

      {/* タスク詳細モーダル */}
      {showTaskModal && selectedTask && (
        <div className="prisma-modal-overlay backdrop-blur-sm">
          <div className="prisma-modal animate-fadeIn" style={{ maxWidth: '700px' }}>
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 border-b-4 border-purple-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{selectedTask.title}</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
                >
                  <X size={24} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-6 p-8">
              {/* ステータス変更ボタン */}
              <div>
                <label className="block text-lg font-bold text-gray-700 mb-3">
                  ステータス変更
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                    className={`px-4 py-3 rounded-xl font-bold text-base transition-all transform hover:scale-105 ${
                      selectedTask.status === 'not_started'
                        ? 'task-not-started shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border-3 border-gray-300'
                    }`}
                  >
                    未着手
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                    className={`px-4 py-3 rounded-xl font-bold text-base transition-all transform hover:scale-105 ${
                      selectedTask.status === 'requested'
                        ? 'task-in-progress shadow-lg'
                        : 'bg-white text-yellow-700 hover:bg-yellow-50 border-3 border-yellow-300'
                    }`}
                  >
                    着手中
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                    className={`px-4 py-3 rounded-xl font-bold text-base transition-all transform hover:scale-105 ${
                      selectedTask.status === 'delayed'
                        ? 'task-delayed shadow-lg'
                        : 'bg-white text-red-700 hover:bg-red-50 border-3 border-red-300'
                    }`}
                  >
                    遅延
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    className={`px-4 py-3 rounded-xl font-bold text-base transition-all transform hover:scale-105 ${
                      selectedTask.status === 'completed'
                        ? 'task-completed shadow-lg'
                        : 'bg-white text-blue-700 hover:bg-blue-50 border-3 border-blue-300'
                    }`}
                  >
                    完了
                  </button>
                </div>
              </div>

              {/* タスク情報 */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-500 mb-1">期限</label>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedTask.due_date
                      ? format(new Date(selectedTask.due_date), 'yyyy年M月d日 (E)', { locale: ja })
                      : '未設定'}
                  </p>
                </div>

                {selectedTask.description && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <label className="block text-sm font-bold text-gray-500 mb-1">説明</label>
                    <p className="text-base text-gray-900 leading-relaxed">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.project && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                    <label className="block text-sm font-bold text-gray-500 mb-2">案件</label>
                    <p className="text-xl font-bold text-gray-900 mb-3">
                      {selectedTask.project.customer_names.join('・')}様
                    </p>
                    <button
                      onClick={() => handleNavigateToProject(selectedTask.project!.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
                    >
                      <ExternalLink size={18} />
                      案件詳細を見る
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer bg-gray-50 px-8 py-4">
              <button
                onClick={() => setShowTaskModal(false)}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-bold text-lg"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  )
}
