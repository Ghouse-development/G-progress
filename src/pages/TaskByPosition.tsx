/**
 * 職種別タスク一覧
 * 横軸：職種、縦軸：タスク
 * Excelライクなデザインで表示
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Task, Project, Customer } from '../types/database'
import { differenceInDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { X } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { generateDemoTasks, generateDemoProjects, generateDemoCustomers } from '../utils/demoData'

interface TaskWithProject extends Task {
  project?: Project & { customer?: Customer }
}

// 職種の定義
const DEPARTMENTS = [
  { name: '営業部', positions: ['営業', '営業事務', 'ローン事務'] },
  { name: '設計部', positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'] },
  { name: '工事部', positions: ['工事', '工事事務', '積算・発注'] },
  { name: '外構事業部', positions: ['外構設計', '外構工事'] }
]

const ALL_POSITIONS = DEPARTMENTS.flatMap(d => d.positions)

export default function TaskByPosition() {
  const { demoMode } = useSettings()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [demoMode])

  const loadTasks = async () => {
    setLoading(true)

    if (demoMode) {
      // デモモード：サンプルデータを使用
      const demoTasks = generateDemoTasks()
      const demoProjects = generateDemoProjects()
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
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, project:projects(*, customer:customers(*))')
      .order('due_date', { ascending: true })

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

    if (!error) {
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === selectedTask.id ? { ...t, ...updateData } : t
        )
      )
      setSelectedTask({ ...selectedTask, ...updateData })
    }
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

  if (loading) {
    return (
      <div className="prisma-content">
        <div className="prisma-empty">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="prisma-content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">職種別タスク一覧</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">職種ごとのタスクをExcel形式で表示</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-base font-bold text-gray-700 dark:text-gray-200">
                タスク名
              </th>
              {ALL_POSITIONS.map(position => (
                <th
                  key={position}
                  className="border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-base font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap"
                >
                  {position}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 各タスク名ごとに行を作成 */}
            {Array.from(new Set(tasks.map(t => t.title))).map((taskTitle, rowIndex) => (
              <tr key={taskTitle} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                <td className="border-2 border-gray-300 dark:border-gray-600 px-4 py-2 text-base font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {taskTitle}
                </td>
                {ALL_POSITIONS.map(position => {
                  const positionTasks = getTasksByPosition(position).filter(t => t.title === taskTitle)
                  const task = positionTasks[0] // 同じタイトルの最初のタスクを表示

                  if (!task) {
                    return (
                      <td
                        key={position}
                        className="border-2 border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-gray-400 dark:text-gray-500"
                      >
                        -
                      </td>
                    )
                  }

                  const daysFromToday = getDaysFromToday(task.due_date || null)
                  const daysText = getDaysText(daysFromToday)
                  const daysColor = getDaysColor(daysFromToday)

                  return (
                    <td
                      key={position}
                      className="border-2 border-gray-300 dark:border-gray-600 px-2 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                      onClick={() => {
                        setSelectedTask(task)
                        setShowDetailModal(true)
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {/* ステータスバッジ */}
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
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

                        {/* 期限 */}
                        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {task.due_date ? format(new Date(task.due_date), 'M/d(E)', { locale: ja }) : '-'}
                        </span>

                        {/* 乖離日数 */}
                        <span className={`text-xs font-medium whitespace-nowrap ${daysColor}`}>
                          {daysText}
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
  )
}
