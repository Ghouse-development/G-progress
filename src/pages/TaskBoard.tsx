import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Task, Employee, Payment } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, Clock, DollarSign, CheckCircle } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useSettings } from '../contexts/SettingsContext'
import { generateDemoTasks, generateDemoPayments, generateDemoProjects, generateDemoCustomers } from '../utils/demoData'
import TaskDetailModal from '../components/TaskDetailModal'

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

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error

      await loadData()
    } catch (error) {
      throw error
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
                    <th className="text-center">タスク名</th>
                    <th className="text-center">お客様</th>
                    <th className="text-center">期限</th>
                    <th className="text-center">遅延</th>
                    <th className="text-center">ステータス</th>
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
                        {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                      </td>
                      <td>
                        <span className="prisma-badge prisma-badge-red">
                          {task.due_date && `${differenceInDays(new Date(), new Date(task.due_date))}日遅れ`}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleTaskClick(task)}
                          className="task-delayed"
                        >
                          遅延
                        </button>
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
                    <th className="text-center">タスク名</th>
                    <th className="text-center">お客様</th>
                    <th className="text-center">期限</th>
                    <th className="text-center">残り</th>
                    <th className="text-center">ステータス</th>
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
                        {task.due_date ? format(new Date(task.due_date), 'M/d (E)', { locale: ja }) : '-'}
                      </td>
                      <td>
                        <span className="prisma-badge prisma-badge-yellow">
                          {task.due_date && `あと${differenceInDays(new Date(task.due_date), new Date())}日`}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleTaskClick(task)}
                          className="task-in-progress"
                        >
                          着手中
                        </button>
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
                    <th className="text-center">名目</th>
                    <th className="text-center">お客様</th>
                    <th className="text-center">金額</th>
                    <th className="text-center">予定日</th>
                    <th className="text-center">残り</th>
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
                        {payment.scheduled_date ? format(new Date(payment.scheduled_date), 'M/d (E)', { locale: ja }) : '-'}
                      </td>
                      <td>
                        <span className="prisma-badge prisma-badge-green">
                          {payment.scheduled_date && `あと${differenceInDays(new Date(payment.scheduled_date), new Date())}日`}
                        </span>
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
                    <th className="text-center">名称</th>
                    <th className="text-center">お客様</th>
                    <th className="text-center">種別</th>
                    <th className="text-center">完了日/入金日</th>
                    <th className="text-center">ステータス</th>
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
                        <span className="prisma-badge prisma-badge-blue">タスク</span>
                      </td>
                      <td>
                        {task.actual_completion_date ? format(new Date(task.actual_completion_date), 'M/d (E)', { locale: ja }) : '-'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleTaskClick(task)}
                          className="task-completed"
                        >
                          完了
                        </button>
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
                        <span className="prisma-badge prisma-badge-green">入金</span>
                      </td>
                      <td>
                        {payment.actual_date ? format(new Date(payment.actual_date), 'M/d (E)', { locale: ja }) : '-'}
                      </td>
                      <td className="font-bold text-green-700">
                        ¥{payment.actual_amount?.toLocaleString() || '-'}
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
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          onUpdate={handleUpdateTask}
          currentEmployeeId={currentEmployeeId}
        />
      )}
    </>
  )
}
