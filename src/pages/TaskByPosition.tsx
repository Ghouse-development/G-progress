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
      // console removed
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
      {showDetailModal && selectedTask && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[800px]">
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
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                      selectedTask.status === 'not_started'
                        ? 'task-not-started'
                        : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    未着手
                  </button>
                  <button
                    onClick={() => handleStatusChange('requested')}
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                      selectedTask.status === 'requested'
                        ? 'task-in-progress'
                        : 'bg-white text-yellow-900 hover:bg-yellow-50 border-2 border-yellow-300'
                    }`}
                  >
                    着手中
                  </button>
                  <button
                    onClick={() => handleStatusChange('delayed')}
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                      selectedTask.status === 'delayed'
                        ? 'task-delayed'
                        : 'bg-white text-red-900 hover:bg-red-50 border-2 border-red-300'
                    }`}
                  >
                    遅延
                  </button>
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                    期限日
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {selectedTask.due_date
                      ? format(new Date(selectedTask.due_date), 'yyyy年M月d日 (E)', { locale: ja })
                      : '未設定'}
                  </p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                    乖離日数
                  </label>
                  <p className={`text-base font-bold ${getDaysColor(getDaysFromToday(selectedTask.due_date || null))}`}>
                    {getDaysText(getDaysFromToday(selectedTask.due_date || null))}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                  プロジェクト
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {selectedTask.project?.customer?.names?.[0] || selectedTask.project?.contract_number || '不明'}
                </p>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                  説明
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {selectedTask.description || 'なし'}
                </p>
              </div>

              {selectedTask.dos && (
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Do's（やるべきこと）
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedTask.dos}
                  </p>
                </div>
              )}

              {selectedTask.donts && (
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
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
