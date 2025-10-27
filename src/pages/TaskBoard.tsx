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
      <div className="prisma-content px-6">
        {/* 遅延タスク */}
        {delayedTasks.length > 0 && (
          <div className="prisma-card mb-6">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #FCA5A5, #EF4444)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <AlertTriangle size={20} />
                遅延（{delayedTasks.length}件）
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="prisma-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>タスク名</th>
                    <th style={{ width: '20%' }}>お客様</th>
                    <th style={{ width: '15%' }}>期限</th>
                    <th style={{ width: '15%' }}>遅延</th>
                    <th style={{ width: '15%' }}>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {delayedTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td>
                        <div
                          className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => handleTaskClick(task)}
                        >
                          {task.title}
                        </div>
                      </td>
                      <td>{task.project ? `${task.project.customer_names[0]}様` : '-'}</td>
                      <td>
                        <div className="text-center">
                          {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-red">
                            {task.due_date && `${differenceInDays(new Date(), new Date(task.due_date))}日遅れ`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="px-3 py-1.5 task-delayed rounded-lg text-base font-bold cursor-pointer hover:opacity-80 transition-opacity"
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
          <div className="prisma-card mb-6">
            <div className="prisma-card-header" style={{ background: 'linear-gradient(to right, #FDE047, #EAB308)' }}>
              <h2 className="prisma-card-title flex items-center gap-2 text-white">
                <Clock size={20} />
                期日が近い（{upcomingTasks.length}件）
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="prisma-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>タスク名</th>
                    <th style={{ width: '20%' }}>お客様</th>
                    <th style={{ width: '15%' }}>期限</th>
                    <th style={{ width: '15%' }}>残り</th>
                    <th style={{ width: '15%' }}>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td>
                        <div
                          className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => handleTaskClick(task)}
                        >
                          {task.title}
                        </div>
                      </td>
                      <td>{task.project ? `${task.project.customer_names[0]}様` : '-'}</td>
                      <td>
                        <div className="text-center">
                          {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-yellow">
                            {task.due_date && `あと${differenceInDays(new Date(task.due_date), new Date())}日`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="px-3 py-1.5 task-in-progress rounded-lg text-base font-bold cursor-pointer hover:opacity-80 transition-opacity"
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
              <table className="prisma-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>名目</th>
                    <th style={{ width: '20%' }}>お客様</th>
                    <th style={{ width: '20%' }}>金額</th>
                    <th style={{ width: '15%' }}>予定日</th>
                    <th style={{ width: '20%' }}>残り</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingPayments.map(payment => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => payment.project_id && handleNavigateToProject(payment.project_id)}
                    >
                      <td className="font-semibold text-gray-900">{payment.payment_type}</td>
                      <td>{payment.project ? `${payment.project.customer_names[0]}様` : '-'}</td>
                      <td className="font-bold text-green-700">
                        ¥{payment.scheduled_amount?.toLocaleString() || '-'}
                      </td>
                      <td>
                        <div className="text-center">
                          {payment.scheduled_date ? format(new Date(payment.scheduled_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-green">
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
              <table className="prisma-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>名称</th>
                    <th style={{ width: '20%' }}>お客様</th>
                    <th style={{ width: '15%' }}>種別</th>
                    <th style={{ width: '20%' }}>完了日/入金日</th>
                    <th style={{ width: '15%' }}>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.map(task => (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <td className="font-semibold text-gray-900">{task.title}</td>
                      <td>{task.project ? `${task.project.customer_names[0]}様` : '-'}</td>
                      <td>
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-blue">タスク</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          {task.actual_completion_date ? format(new Date(task.actual_completion_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="px-3 py-1.5 task-completed rounded-lg text-base font-bold cursor-pointer hover:opacity-80 transition-opacity"
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
                      <td className="font-semibold text-gray-900">{payment.payment_type}</td>
                      <td>{payment.project ? `${payment.project.customer_names[0]}様` : '-'}</td>
                      <td>
                        <div className="text-center">
                          <span className="prisma-badge prisma-badge-green">入金</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          {payment.actual_date ? format(new Date(payment.actual_date), 'M/d (E)', { locale: ja }) : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="text-center font-bold text-green-700">
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
            <div className="text-center py-12 text-base text-gray-500">
              タスク・入金予定はありません
            </div>
          </div>
        )}
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
