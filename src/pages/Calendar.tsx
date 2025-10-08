import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Task, Project, Employee } from '../types/database'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TaskWithProject extends Task {
  project?: Project
}

// マイルストーンイベントの種類
const MILESTONE_EVENTS = [
  '契約日',
  '間取確定日',
  '仕様確定日',
  '変更契約日',
  '着工日',
  '上棟日',
  '上棟立会日',
  '完了検査日',
  '施主立会日',
  '引き渡し日'
]

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadTasks()
    }
  }, [currentMonth, currentUser])

  const loadCurrentUser = async () => {
    // 開発モード: 仮のユーザーIDを使用
    const userId = localStorage.getItem('currentUserId') || '1'

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setCurrentUser(data as Employee)
    }
    setLoading(false)
  }

  const loadTasks = async () => {
    if (!currentUser) return

    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)

    // タスクを取得
    const { data: tasksData } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*)
      `)
      .gte('due_date', format(start, 'yyyy-MM-dd'))
      .lte('due_date', format(end, 'yyyy-MM-dd'))

    if (tasksData) {
      // 担当者のタスクまたはマイルストーンタスクをフィルタリング
      const filteredTasks = tasksData.filter((task: any) => {
        // マイルストーンタスクは全て表示
        if (MILESTONE_EVENTS.some(event => task.title.includes(event))) {
          return true
        }

        // 担当部門のタスクのみ表示
        const taskDept = task.description?.split(':')[0]?.trim()
        return taskDept === currentUser.department
      })

      setTasks(filteredTasks as TaskWithProject[])
    }
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task =>
      task.due_date && isSameDay(new Date(task.due_date), day)
    )
  }

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">読み込み中...</div>
      </div>
    )
  }

  const days = getDaysInMonth()
  const weekdays = ['月', '火', '水', '木', '金', '土', '日']

  return (
    <div className="min-h-screen bg-pastel-blue-light p-6">
      <div className="container mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl shadow-pastel-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">カレンダー</h1>
            <div className="text-sm text-gray-600">
              {currentUser && `${currentUser.name} (${currentUser.department})`}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-pastel-blue-light transition"
            >
              <ChevronLeft size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-900">
              {format(currentMonth, 'yyyy年 M月', { locale: ja })}
            </h2>

            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-pastel-blue-light transition"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* カレンダーグリッド */}
        <div className="bg-white rounded-xl shadow-pastel-lg overflow-hidden border-4 border-gray-400">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b-4 border-gray-400">
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={`p-3 text-center font-bold border-r-2 border-gray-300 last:border-r-0 ${
                  index === 5 ? 'text-blue-600 bg-blue-50' :
                  index === 6 ? 'text-red-600 bg-red-50' :
                  'text-gray-800 bg-pastel-blue-light'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 border-collapse">
            {/* 月初の空白セル（月曜始まり対応） */}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="border-2 border-gray-300 p-3 min-h-28 bg-gray-100"
              ></div>
            ))}

            {/* 日付セル */}
            {days.map(day => {
              const dayTasks = getTasksForDay(day)
              const isToday = isSameDay(day, new Date())
              const dayOfWeek = (day.getDay() + 6) % 7 // 月曜=0, 日曜=6

              return (
                <div
                  key={day.toString()}
                  className={`border-2 border-gray-300 p-3 min-h-28 transition-colors ${
                    isToday ? 'bg-yellow-100 border-yellow-500 border-4' :
                    dayOfWeek === 5 ? 'bg-blue-50' :
                    dayOfWeek === 6 ? 'bg-red-50' :
                    'bg-white hover:bg-pastel-blue-light'
                  }`}
                >
                  <div className={`text-base font-bold mb-2 ${
                    isToday ? 'text-yellow-700' :
                    dayOfWeek === 6 ? 'text-red-600' :
                    dayOfWeek === 5 ? 'text-blue-600' :
                    'text-gray-800'
                  }`}>
                    {format(day, 'd')}日
                  </div>

                  <div className="space-y-1">
                    {dayTasks.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center">-</div>
                    ) : (
                      dayTasks.map(task => {
                        const isMilestone = MILESTONE_EVENTS.some(event => task.title.includes(event))
                        return (
                          <div
                            key={task.id}
                            className={`text-xs p-1.5 rounded border ${
                              isMilestone ? 'bg-red-200 text-red-900 font-bold border-red-400' :
                              task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-400' :
                              task.status === 'requested' ? 'bg-blue-100 text-blue-800 border-blue-400' :
                              'bg-gray-100 text-gray-800 border-gray-400'
                            }`}
                            title={`${task.title} - ${task.project?.customer?.names?.join('・') || ''}`}
                          >
                            {isMilestone && '⭐ '}
                            <div className="truncate">{task.title}</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div className="bg-white rounded-xl shadow-pastel-lg p-6 mt-6">
          <h3 className="font-bold text-gray-900 mb-3">凡例</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-sm">⭐ マイルストーンイベント（全セクション共通）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-pastel-green-light border border-pastel-green rounded"></div>
              <span className="text-sm">完了タスク</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-pastel-blue-light border border-pastel-blue rounded"></div>
              <span className="text-sm">進行中タスク</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span className="text-sm">未着手タスク</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
