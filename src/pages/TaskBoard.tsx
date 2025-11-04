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
      <div className="prisma-content px-4" style={{ maxWidth: '1400px' }}>
        {/* 遅延タスク */}
        {delayedTasks.length > 0 && (
          <div className="prisma-card mb-4">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #FCA5A5, #EF4444)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <AlertTriangle size={20} />
                遅延（{delayedTasks.length}件）
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="prisma-table table-fixed w-full">
                <colgroup>
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3">タスク名</th>
                    <th className="text-left px-4 py-3">お客様</th>
                    <th className="text-center px-4 py-3">期限</th>
                    <th className="text-center px-4 py-3">遅延</th>
                    <th className="text-center px-4 py-3">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {delayedTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div
                          className="font-semibold text-base text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => handleTaskClick(task)}
                        >
                          {task.title}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base">{task.project ? `${task.project.customer_names[0]}様` : '-'}</td>
                      <td className="px-4 py-4">
                        <div className="text-center text-base">
                          {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-red text-base">
                            {task.due_date && `${differenceInDays(new Date(), new Date(task.due_date))}日遅れ`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="px-4 py-2 task-delayed rounded-lg text-base font-bold cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            遅延
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 期日が近いタスク */}
        {upcomingTasks.length > 0 && (
          <div className="prisma-card mb-4">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #FDE047, #EAB308)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <Clock size={20} />
                期日が近い（{upcomingTasks.length}件）
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="prisma-table table-fixed w-full">
                <colgroup>
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3">タスク名</th>
                    <th className="text-left px-4 py-3">お客様</th>
                    <th className="text-center px-4 py-3">期限</th>
                    <th className="text-center px-4 py-3">残り</th>
                    <th className="text-center px-4 py-3">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div
                          className="font-semibold text-base text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => handleTaskClick(task)}
                        >
                          {task.title}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base">{task.project ? `${task.project.customer_names[0]}様` : '-'}</td>
                      <td className="px-4 py-4">
                        <div className="text-center text-base">
                          {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-yellow text-base">
                            {task.due_date && `あと${differenceInDays(new Date(task.due_date), new Date())}日`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="px-4 py-2 task-in-progress rounded-lg text-base font-bold cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            着手中
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 入金予定 */}
        {upcomingPayments.length > 0 && (
          <div className="prisma-card mb-6">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #86EFAC, #10B981)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <DollarSign size={20} />
                入金予定（{upcomingPayments.length}件）
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="prisma-table table-fixed w-full">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3">名目</th>
                    <th className="text-left px-4 py-3">お客様</th>
                    <th className="text-left px-4 py-3">金額</th>
                    <th className="text-center px-4 py-3">予定日</th>
                    <th className="text-center px-4 py-3">残り</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingPayments.map(payment => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                    >
                      <td className="px-4 py-4 font-semibold text-base text-gray-900">{payment.payment_type}</td>
                      <td className="px-4 py-4 text-base">{payment.project ? `${payment.project.customer_names[0]}様` : '-'}</td>
                      <td className="px-4 py-4 font-bold text-base text-green-700">
                        ¥{payment.scheduled_amount?.toLocaleString() || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-center text-base">
                          {payment.scheduled_date ? format(new Date(payment.scheduled_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-green text-base">
                            {payment.scheduled_date && `あと${differenceInDays(new Date(payment.scheduled_date), new Date())}日`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 完了（7日以内） */}
        {(completedTasks.length > 0 || completedPayments.length > 0) && (
          <div className="prisma-card mb-6">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #93C5FD, #2563EB)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <CheckCircle size={20} />
                完了（{completedTasks.length + completedPayments.length}件）
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="prisma-table table-fixed w-full">
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3">名称</th>
                    <th className="text-left px-4 py-3">お客様</th>
                    <th className="text-center px-4 py-3">種別</th>
                    <th className="text-center px-4 py-3">完了日/入金日</th>
                    <th className="text-center px-4 py-3">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.map(task => (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <td className="px-4 py-4 font-semibold text-base text-gray-900">{task.title}</td>
                      <td className="px-4 py-4 text-base">{task.project ? `${task.project.customer_names[0]}様` : '-'}</td>
                      <td className="px-4 py-4">
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-blue text-base">タスク</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-center text-base">
                          {task.actual_completion_date ? format(new Date(task.actual_completion_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="px-4 py-2 task-completed rounded-lg text-base font-bold cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            完了
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {completedPayments.map(payment => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                    >
                      <td className="px-4 py-4 font-semibold text-base text-gray-900">{payment.payment_type}</td>
                      <td className="px-4 py-4 text-base">{payment.project ? `${payment.project.customer_names[0]}様` : '-'}</td>
                      <td className="px-4 py-4">
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-green text-base">入金</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-center text-base">
                          {payment.actual_date ? format(new Date(payment.actual_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-center font-bold text-base text-green-700">
                          ¥{payment.actual_amount?.toLocaleString() || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* すべて空の場合 */}
        {delayedTasks.length === 0 && upcomingTasks.length === 0 && upcomingPayments.length === 0 && completedTasks.length === 0 && completedPayments.length === 0 && (
          <div className="prisma-card">
            <div className="text-center py-12 text-sm text-gray-500">
              タスク・入金予定はありません
            </div>
          </div>
        )}
      </div>

      {/* タスク詳細モーダル */}
      {showTaskModal && selectedTask && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[800px]">
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
              {/* ステータス選択 - Prisma仕様に統一 */}
              <div>
                <label className="block text-xl font-bold text-gray-700 mb-4">
                  ステータス
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                    className={`px-6 py-4 rounded-lg font-bold text-xl transition-all border-4 ${
                      selectedTask.status === 'not_started'
                        ? 'task-not-started'
                        : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-400'
                    }`}
                  >
                    未着手
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                    className={`px-6 py-4 rounded-lg font-bold text-xl transition-all border-4 ${
                      selectedTask.status === 'requested'
                        ? 'task-in-progress'
                        : 'bg-white text-gray-900 hover:bg-yellow-50 border-gray-400'
                    }`}
                  >
                    着手中
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                    className={`px-6 py-4 rounded-lg font-bold text-xl transition-all border-4 ${
                      selectedTask.status === 'delayed'
                        ? 'task-delayed'
                        : 'bg-white text-gray-900 hover:bg-red-50 border-gray-400'
                    }`}
                  >
                    遅延
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    className={`px-6 py-4 rounded-lg font-bold text-xl transition-all border-4 ${
                      selectedTask.status === 'completed'
                        ? 'task-completed'
                        : 'bg-white text-gray-900 hover:bg-blue-50 border-gray-400'
                    }`}
                  >
                    完了
                  </button>
                </div>
              </div>

              {/* タスク情報 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-2">期限</label>
                  <p className="text-xl text-gray-900">
                    {selectedTask.due_date
                      ? format(new Date(selectedTask.due_date), 'yyyy年M月d日 (E)', { locale: ja })
                      : '未設定'}
                  </p>
                </div>

                {selectedTask.description && (
                  <div>
                    <label className="block text-xl font-bold text-gray-700 mb-2">説明</label>
                    <p className="text-xl text-gray-900">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.project && (
                  <div>
                    <label className="block text-xl font-bold text-gray-700 mb-2">案件</label>
                    <p className="text-xl text-gray-900 mb-3">
                      {selectedTask.project.customer_names.join('・')}様
                    </p>
                    <button
                      onClick={() => handleNavigateToProject(selectedTask.project!.id)}
                      className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg font-bold text-xl hover:bg-blue-200 transition-colors border-4 border-blue-600 inline-flex items-center gap-2"
                    >
                      <ExternalLink size={20} />
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
                className="px-8 py-4 bg-gray-200 text-gray-800 rounded-lg font-bold text-xl hover:bg-gray-300 transition-colors border-4 border-gray-400 flex-1"
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
