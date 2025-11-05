import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Task, Employee, Project } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, User, Home, Calendar, Clock, MessageSquare } from 'lucide-react'

interface DelayedTaskWithDetails extends Task {
  assigned_employee?: Employee
  project?: Project
}

export default function DelayedTasks() {
  const [delayedTasks, setDelayedTasks] = useState<DelayedTaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDelayedTasks()
  }, [])

  const loadDelayedTasks = async () => {
    try {
      setLoading(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 遅延タスクを取得（期限日が今日より前で、未完了のタスク）
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_employee:employees!tasks_assigned_to_fkey(*),
          project:projects(*)
        `)
        .lt('due_date', today.toISOString())
        .in('status', ['not_started', 'requested', 'delayed'])
        .order('due_date', { ascending: true })

      if (error) throw error

      setDelayedTasks(tasks || [])
    } catch (error) {
      // console removed
    } finally {
      setLoading(false)
    }
  }

  // 遅延日数を計算
  const getDelayDays = (dueDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return differenceInDays(today, new Date(dueDate))
  }

  // ステータスに応じた背景色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-red-50'
      case 'requested':
        return 'bg-yellow-50'
      case 'delayed':
        return 'bg-red-100'
      default:
        return 'bg-gray-50'
    }
  }

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">遅延タスク</h1>
        <div className="prisma-header-actions">
          <AlertTriangle className="text-red-600" size={24} />
        </div>
      </div>
      <div className="prisma-content">
        <div className="prisma-card mb-4">
          <p className="text-base text-gray-600">
            期限日を過ぎている未完了のタスクを表示しています
          </p>
        </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-base font-bold text-gray-700">総遅延タスク数</div>
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-red-600">{delayedTasks.length}件</div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-base font-bold text-gray-700">未着手</div>
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {delayedTasks.filter(t => t.status === 'not_started').length}件
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-base font-bold text-gray-700">着手中</div>
                <Clock className="text-orange-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {delayedTasks.filter(t => t.status === 'requested').length}件
              </div>
            </div>
          </div>

          {/* 遅延タスク一覧 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : delayedTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <AlertTriangle className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-xl text-gray-600">遅延タスクはありません</p>
              <p className="text-base text-gray-500 mt-2">すべてのタスクが予定通りです</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border-2 border-gray-300 shadow-md overflow-hidden">
              <table className="w-full border-collapse">
                <colgroup>
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '100px' }} />
                  <col />
                </colgroup>
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900">
                      担当者
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900">
                      邸名（案件名）
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900">
                      タスク名
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900">
                      予定日
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900">
                      遅れ
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900">
                      コメント
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {delayedTasks.map((task) => {
                    const delayDays = task.due_date ? getDelayDays(task.due_date) : 0
                    return (
                      <tr
                        key={task.id}
                        className={`hover:bg-blue-50 transition-colors ${getStatusColor(task.status)}`}
                      >
                        {/* 担当者 */}
                        <td className="border border-gray-300 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-600" />
                            <span className="text-base font-medium text-gray-900">
                              {task.assigned_employee
                                ? `${task.assigned_employee.last_name} ${task.assigned_employee.first_name}`
                                : '未割当'}
                            </span>
                          </div>
                        </td>

                        {/* 邸名（案件名） */}
                        <td className="border border-gray-300 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Home size={16} className="text-gray-600" />
                            <span className="text-base font-medium text-gray-900">
                              {task.project?.customer_names?.[0] ? `${task.project.customer_names[0]}邸` : task.project?.construction_address || '不明'}
                            </span>
                          </div>
                        </td>

                        {/* タスク名 */}
                        <td className="border border-gray-300 px-4 py-3">
                          <span className="text-base font-medium text-gray-900">
                            {task.title}
                          </span>
                        </td>

                        {/* 予定日 */}
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar size={16} className="text-gray-600" />
                            <span className="text-base font-bold text-gray-900">
                              {task.due_date
                                ? format(new Date(task.due_date), 'yyyy/MM/dd (E)', { locale: ja })
                                : '未設定'}
                            </span>
                          </div>
                        </td>

                        {/* 遅れ */}
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Clock size={16} className="text-red-600" />
                            <span className="text-base font-bold text-red-600">
                              {delayDays}日遅れ
                            </span>
                          </div>
                        </td>

                        {/* コメント */}
                        <td className="border border-gray-300 px-4 py-3">
                          <div className="flex items-start gap-2">
                            <MessageSquare size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
                            <span className="text-base text-gray-700 whitespace-pre-wrap">
                              {task.comment || '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  )
}
