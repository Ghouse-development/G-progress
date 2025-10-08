import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Task, Project, Employee } from '../types/database'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
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
    // 開発モード: localStorageまたはデフォルトユーザーIDを使用
    const userId = localStorage.getItem('currentUserId') || '1'

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setCurrentUser(data as Employee)
      } else {
        // エラー時はデフォルトユーザーを設定
        console.log('Could not load user, using default')
      }
    } catch (error) {
      console.log('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async () => {
    if (!currentUser) return

    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)

    // タスクを取得（プロジェクトと顧客情報も含む）
    const { data: tasksData, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(
          *,
          customer:customers(*)
        )
      `)
      .gte('due_date', format(start, 'yyyy-MM-dd'))
      .lte('due_date', format(end, 'yyyy-MM-dd'))

    if (error) {
      console.error('Error loading tasks:', error)
      return
    }

    if (tasksData) {
      console.log(`カレンダー: ${tasksData.length}件のタスクを取得しました`)

      // 全てのタスクを表示（フィルタなし）
      // マイルストーンと担当者のタスクを区別して表示
      const allTasks = tasksData.map((task: any) => ({
        ...task,
        isMilestone: MILESTONE_EVENTS.some(event => task.title.includes(event))
      }))

      setTasks(allTasks as TaskWithProject[])
    }
  }

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // 月曜始まり
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task =>
      task.due_date && isSameDay(new Date(task.due_date), day)
    ).slice(0, 3) // 最大3件（1画面に収めるため）
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

  const days = getCalendarDays()
  const weekdays = ['月', '火', '水', '木', '金', '土', '日']

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">カレンダー</h1>
            <div className="text-sm text-gray-600">
              {currentUser && `${currentUser.name} (${currentUser.department})`}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <ChevronLeft size={20} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 min-w-48 text-center">
              {format(currentMonth, 'yyyy年 M月', { locale: ja })}
            </h2>

            <button
              onClick={nextMonth}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* カレンダーグリッド (7×6) */}
        <div className="bg-white rounded-lg shadow p-4">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-semibold border ${
                  index === 5 ? 'text-blue-600' : // 土曜
                  index === 6 ? 'text-red-600' : // 日曜
                  'text-gray-700'
                } bg-gray-50`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド：全ての日を1つのグリッドに配置 */}
          <div className="calendar-grid">
            {days.map(day => {
              const dayTasks = getTasksForDay(day)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const dayOfWeek = (day.getDay() + 6) % 7 // 月曜=0, 日曜=6

              return (
                <div
                  key={day.toString()}
                  className={`calendar-day transition-colors ${
                    isToday ? 'border-2 border-blue-500 bg-blue-50' :
                    !isCurrentMonth ? 'bg-gray-50' :
                    dayOfWeek === 6 ? 'bg-red-50' : // 日曜
                    dayOfWeek === 5 ? 'bg-blue-50' : // 土曜
                    'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`date font-medium ${
                    isToday ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center ml-auto' :
                    !isCurrentMonth ? 'text-gray-400' :
                    dayOfWeek === 6 ? 'text-red-600' :
                    dayOfWeek === 5 ? 'text-blue-600' :
                    'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  <div className="events">
                    {dayTasks.map((task) => {
                      const isMilestone = MILESTONE_EVENTS.some(event => task.title.includes(event))
                      return (
                        <div
                          key={task.id}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${
                            isMilestone ? 'bg-red-500 text-white font-semibold' :
                            task.status === 'completed' ? 'bg-blue-100 text-blue-900' :
                            task.status === 'requested' ? 'bg-yellow-100 text-yellow-900' :
                            'bg-gray-100 text-gray-700'
                          }`}
                          title={`${task.title}${task.project?.customer?.names ? ' - ' + task.project.customer.names.join('・') + '様' : ''}`}
                        >
                          {isMilestone && '⭐ '}
                          {task.title}
                        </div>
                      )
                    })}
                    {tasks.filter(task =>
                      task.due_date && isSameDay(new Date(task.due_date), day)
                    ).length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{tasks.filter(task =>
                          task.due_date && isSameDay(new Date(task.due_date), day)
                        ).length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">凡例</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>⭐ マイルストーン</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>完了タスク</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>着手中タスク</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>未着手タスク</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
