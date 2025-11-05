/**
 * 職種別タスク一覧
 * タブで部署を切り替え、その部署の職種別タスクを表示
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Task, Project, Customer, Employee } from '../types/database'
import { differenceInDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useMode } from '../contexts/ModeContext'
import { useToast } from '../contexts/ToastContext'
import { generateDemoTasks, generateDemoProjects, generateDemoCustomers } from '../utils/demoData'
import { ORGANIZATION_HIERARCHY } from '../constants/organizationHierarchy'
import TaskDetailModal from '../components/TaskDetailModal'

interface TaskWithProject extends Task {
  project?: Project & { customer?: Customer }
}

// 職種の定義（organizationHierarchy.tsから取得）
const DEPARTMENTS = ORGANIZATION_HIERARCHY

// 部署名から職種を取得
const getPositionsForDepartment = (deptName: string): string[] => {
  const dept = DEPARTMENTS.find(d => d.name === deptName)
  return dept ? dept.positions : []
}

// 職種から部署名を取得
const getDepartmentForPosition = (position: string): string => {
  for (const dept of DEPARTMENTS) {
    if (dept.positions.includes(position)) {
      return dept.name
    }
  }
  return '営業部' // デフォルト
}

export default function TaskByPosition() {
  const { demoMode } = useSettings()
  const { mode } = useMode()
  const toast = useToast()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('営業部')
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const currentEmployeeId = localStorage.getItem('selectedEmployeeId') || ''

  useEffect(() => {
    loadCurrentEmployee()
    loadTasks()
  }, [demoMode, mode])

  const loadCurrentEmployee = async () => {
    const employeeId = localStorage.getItem('selectedEmployeeId')
    if (!employeeId) return

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle()

    if (error) {
      // console removed
      toast.error('従業員データの読み込みに失敗しました')
      return
    }

    if (data) {
      setCurrentEmployee(data)
      // 職種から部署を判定して初期表示を設定
      const dept = getDepartmentForPosition(data.department)
      setSelectedDepartment(dept)
    }
  }

  const loadTasks = async () => {
    setLoading(true)

    if (demoMode) {
      // デモモード：サンプルデータを使用（モード別にデータ件数を調整）
      const demoTasks = generateDemoTasks(mode as 'my_tasks' | 'branch' | 'admin')
      const demoProjects = generateDemoProjects(mode as 'my_tasks' | 'branch' | 'admin')
      const demoCustomers = generateDemoCustomers()

      const tasksWithProjects = demoTasks.map(task => {
        const project = demoProjects.find(p => p.id === task.project_id)
        const customer = project ? demoCustomers.find(c => c.id === project.customer_id) : undefined
        return {
          ...task,
          project: project ? { ...project, customer } : undefined
        }
      })

      setTasks(tasksWithProjects)
      setLoading(false)
      return
    }

    // 通常モード：Supabaseからデータを取得
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*, customer:customers(*)),
        assigned_employee:assigned_to(id, last_name, first_name, department),
        task_master:task_masters!tasks_task_master_id_fkey(
          trigger_task_id,
          days_from_trigger,
          show_in_progress,
          trigger_task:task_masters!task_masters_trigger_task_id_fkey(title)
        )
      `)
      .order('due_date', { ascending: true })

    if (tasksError) {
      // console removed
      toast.error('タスクデータの読み込みに失敗しました')
      setLoading(false)
      return
    }

    if (tasksData) {
      setTasks(tasksData as TaskWithProject[])
    }

    setLoading(false)
  }

  // 職種からタスクを抽出
  const getTasksByPosition = (position: string): TaskWithProject[] => {
    return tasks.filter(task => {
      // descriptionから職種を抽出（例: "営業: タスク内容"）
      const descParts = task.description?.split(':')
      const taskPosition = descParts?.[0]?.trim()
      return taskPosition === position
    })
  }

  // ステータス変更
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (demoMode) {
      // デモモード：ローカルステートのみ更新
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        )
      )
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, ...updates })
      }
      return
    }

    // 通常モード：Supabaseを更新
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error

      await loadTasks()
    } catch (error) {
      throw error
    }
  }

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!selectedTask) return

    const updateData: any = { status: newStatus }
    if (newStatus === 'completed' && !selectedTask.actual_completion_date) {
      updateData.actual_completion_date = format(new Date(), 'yyyy-MM-dd')
    }

    await handleUpdateTask(selectedTask.id, updateData)

    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === selectedTask.id ? { ...t, ...updateData } : t
      )
    )
    setSelectedTask({ ...selectedTask, ...updateData })
  }

  // 期限と今日の乖離日数を計算
  const getDaysFromToday = (dueDate: string | null): number | null => {
    if (!dueDate) return null
    return differenceInDays(new Date(dueDate), new Date())
  }

  // 乖離日数の表示テキスト
  const getDaysText = (days: number | null): string => {
    if (days === null) return '-'
    if (days === 0) return '今日'
    if (days > 0) return `+${days}日`
    return `${days}日`
  }

  // 乖離日数の色
  const getDaysColor = (days: number | null): string => {
    if (days === null) return 'text-gray-500'
    if (days < 0) return 'text-red-600 font-bold'
    if (days === 0) return 'text-orange-600 font-bold'
    if (days <= 3) return 'text-yellow-600'
    return 'text-gray-700'
  }

  // 選択中の部署の職種リスト
  const currentPositions = getPositionsForDepartment(selectedDepartment)

  if (loading) {
    return (
      <div className="prisma-content">
        <div className="prisma-empty">読み込み中...</div>
      </div>
    )
  }

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">職種別タスク一覧</h1>
      </div>
      <div className="prisma-content">
        <div className="prisma-card mb-4">
          <p className="text-base text-gray-600">部署ごとの職種別タスク状況</p>
        </div>

      {/* タブナビゲーション */}
      <div className="prisma-tabs">
        {DEPARTMENTS.map(dept => (
          <button
            key={dept.name}
            onClick={() => setSelectedDepartment(dept.name)}
            className={`prisma-tab ${selectedDepartment === dept.name ? 'active' : ''}`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {/* タスクテーブル */}
      <div className="bg-white rounded-lg border border-gray-300 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <colgroup>
              <col style={{ width: '120px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '100px' }} />
              <col />
            </colgroup>
            <thead className="bg-gradient-to-r from-blue-100 to-blue-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">職種</th>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">タスク名</th>
                <th className="px-6 py-4 text-center text-base font-bold text-gray-900">ステータス</th>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">期限日</th>
                <th className="px-6 py-4 text-center text-base font-bold text-gray-900">乖離日数</th>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">案件</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-base">
                    読み込み中...
                  </td>
                </tr>
              ) : currentPositions.flatMap(position => getTasksByPosition(position)).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-base">
                    タスクが登録されていません
                  </td>
                </tr>
              ) : (
                currentPositions.flatMap(position => {
                  const positionTasks = getTasksByPosition(position)
                  return positionTasks.map((task, index) => {
                    const daysFromToday = getDaysFromToday(task.due_date || null)
                    const daysText = getDaysText(daysFromToday)

                    return (
                      <tr
                        key={task.id || `${position}-${index}`}
                        className="border-b-2 border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowDetailModal(true)
                        }}
                      >
                        <td className="px-6 py-4 text-base text-gray-900 font-bold">{position}</td>
                        <td className="px-6 py-4 text-base text-gray-900 font-semibold">
                          <div className="flex items-center gap-2">
                            {task.title}
                            {task.is_date_confirmed && (
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-green-600 rounded-full border-2 border-white shadow-sm" title="日付確定">
                                確
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-md text-sm font-bold whitespace-nowrap ${
                              task.status === 'completed'
                                ? 'task-completed'
                                : task.status === 'requested'
                                ? 'task-in-progress'
                                : task.status === 'delayed'
                                ? 'task-delayed'
                                : 'task-not-started'
                            }`}
                          >
                            {task.status === 'completed'
                              ? '完了'
                              : task.status === 'requested'
                              ? '着手中'
                              : task.status === 'delayed'
                              ? '遅延'
                              : '未着手'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-base text-gray-700">
                          {task.due_date ? format(new Date(task.due_date), 'M月d日(E)', { locale: ja }) : '未設定'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-base font-bold ${getDaysColor(daysFromToday)}`}>
                            {daysText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-base text-gray-700">
                          {task.project?.customer?.names?.[0] || '-'}
                        </td>
                      </tr>
                    )
                  })
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* タスク詳細モーダル */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onUpdate={handleUpdateTask}
          currentEmployeeId={currentEmployeeId}
        />
      )}
      </div>
    </>
  )
}
