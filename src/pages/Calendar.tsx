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
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']

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
        <div className="bg-white rounded-xl shadow-pastel-lg overflow-hidden">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b-2 border-gray-300">
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={`p-4 text-center font-bold ${
                  index === 0 ? 'text-red-600' :
                  index === 6 ? 'text-blue-600' :
                  'text-gray-800'
                } bg-pastel-blue-light`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7">
            {/* 月初の空白セル */}
            {Array.from({ length: days[0].getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="border border-gray-200 p-2 min-h-32 bg-gray-50"></div>
            ))}

            {/* 日付セル */}
            {days.map(day => {
              const dayTasks = getTasksForDay(day)
              const isToday = isSameDay(day, new Date())

              return (
                <div
                  key={day.toString()}
                  className={`border border-gray-200 p-2 min-h-32 transition-colors ${
                    isToday ? 'bg-yellow-50 border-yellow-400 border-2' : 'hover:bg-pastel-blue-light'
                  }`}
                >
                  <div className={`text-sm font-bold mb-2 ${
                    isToday ? 'text-yellow-600' :
                    day.getDay() === 0 ? 'text-red-600' :
                    day.getDay() === 6 ? 'text-blue-600' :
                    'text-gray-800'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayTasks.map(task => {
                      const isMilestone = MILESTONE_EVENTS.some(event => task.title.includes(event))
                      return (
                        <div
                          key={task.id}
                          className={`text-xs p-1 rounded truncate ${
                            isMilestone ? 'bg-red-100 text-red-800 font-bold' :
                            task.status === 'completed' ? 'bg-pastel-green-light text-pastel-green-dark' :
                            task.status === 'requested' ? 'bg-pastel-blue-light text-pastel-blue-dark' :
                            'bg-gray-100 text-gray-800'
                          }`}
                          title={`${task.title} - ${task.project?.customer?.names?.join('・') || ''}`}
                        >
                          {isMilestone && '⭐ '}
                          {task.title}
                        </div>
                      )
                    })}
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
