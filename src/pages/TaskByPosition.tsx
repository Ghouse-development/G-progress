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
      console.error('従業員データ読み込みエラー:', error)
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
      console.error('タスクデータ読み込みエラー:', tasksError)
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
  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!selectedTask) return

    if (demoMode) {
      // デモモード：ローカルステートのみ更新
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === selectedTask.id ? { ...t, status: newStatus } : t
        )
      )
      setSelectedTask({ ...selectedTask, status: newStatus })
      return
    }

    // 通常モード：Supabaseを更新
    const updateData: any = { status: newStatus }
    if (newStatus === 'completed' && !selectedTask.actual_completion_date) {
      updateData.actual_completion_date = format(new Date(), 'yyyy-MM-dd')
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', selectedTask.id)

    if (error) {
      console.error('ステータス更新エラー:', error)
      toast.error(`ステータスの更新に失敗しました: ${error.message}`)
      return
    }

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
          <p className="text-sm text-gray-600">部署ごとの職種別タスク状況</p>
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
      <div className="prisma-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="prisma-table-container" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="prisma-table">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300" style={{ minWidth: '200px' }}>
                  タスク名
                </th>
                {currentPositions.map(position => (
                  <th
                    key={position}
                    className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-300 whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    {position}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {Array.from(new Set(tasks.map(t => t.title))).map((taskTitle, rowIndex) => (
                <tr key={taskTitle} className={rowIndex % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-200">
                    {taskTitle}
                  </td>
                  {currentPositions.map(position => {
                    const positionTasks = getTasksByPosition(position).filter(t => t.title === taskTitle)
                    const task = positionTasks[0]

                    if (!task) {
                      return (
                        <td
                          key={position}
                          className="px-2 py-2 text-center text-gray-400 border-b border-gray-200"
                        >
                          -
                        </td>
                      )
                    }

                    const daysFromToday = getDaysFromToday(task.due_date || null)
                    const daysText = getDaysText(daysFromToday)

                    return (
                      <td
                        key={position}
                        className="px-2 py-2 border-b border-gray-200 cursor-pointer group hover:bg-blue-50 transition-colors"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowDetailModal(true)
                        }}
                        title={`期限: ${task.due_date ? format(new Date(task.due_date), 'M月d日(E)', { locale: ja }) : '未設定'}\n乖離: ${daysText}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap ${
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
                          {task.is_date_confirmed && (
                            <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-green-600 rounded-full border-2 border-white shadow-lg" title="日付確定">
                              確
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* タスク詳細モーダル */}
      {showDetailModal && selectedTask && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal" style={{ maxWidth: '800px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">{selectedTask.title}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              {/* ステータス変更ボタン */}
              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ステータス
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleStatusChange('not_started')}
                    className={`py-2 px-3 rounded text-base font-medium transition-all ${
                      selectedTask.status === 'not_started'
                        ? 'task-not-started'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-red-400'
                    }`}
                  >
                    未着手
                  </button>
                  <button
                    onClick={() => handleStatusChange('requested')}
                    className={`py-2 px-3 rounded text-base font-medium transition-all ${
                      selectedTask.status === 'requested'
                        ? 'task-in-progress'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-yellow-400'
                    }`}
                  >
                    着手中
                  </button>
                  <button
                    onClick={() => handleStatusChange('delayed')}
                    className={`py-2 px-3 rounded text-base font-medium transition-all ${
                      selectedTask.status === 'delayed'
                        ? 'task-delayed'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-orange-400'
                    }`}
                  >
                    遅延
                  </button>
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className={`py-2 px-3 rounded text-base font-medium transition-all ${
                      selectedTask.status === 'completed'
                        ? 'task-completed'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    完了
                  </button>
                </div>
              </div>

              {/* タスク情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    期限日
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {selectedTask.due_date
                      ? format(new Date(selectedTask.due_date), 'yyyy年M月d日 (E)', { locale: ja })
                      : '未設定'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    乖離日数
                  </label>
                  <p className={`text-base font-bold ${getDaysColor(getDaysFromToday(selectedTask.due_date || null))}`}>
                    {getDaysText(getDaysFromToday(selectedTask.due_date || null))}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  プロジェクト
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {selectedTask.project?.customer?.names?.[0] || selectedTask.project?.contract_number || '不明'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  説明
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {selectedTask.description || 'なし'}
                </p>
              </div>

              {selectedTask.dos && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Do's（やるべきこと）
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedTask.dos}
                  </p>
                </div>
              )}

              {selectedTask.donts && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Don'ts（やってはいけないこと）
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedTask.donts}
                  </p>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => setShowDetailModal(false)}
                className="prisma-btn prisma-btn-secondary"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
