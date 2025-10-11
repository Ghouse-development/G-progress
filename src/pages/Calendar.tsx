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
    loadTasks() // 初回ロード時にタスクも取得
  }, [])

  useEffect(() => {
    loadTasks() // 月が変更されたらタスクを再取得
  }, [currentMonth])

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
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)

    console.log(`カレンダー: ${format(start, 'yyyy-MM-dd')} ～ ${format(end, 'yyyy-MM-dd')} の範囲でタスクを取得します`)

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
      console.error('カレンダー: タスクの取得に失敗:', error)
      return
    }

    console.log(`カレンダー: ${tasksData?.length || 0}件のタスクを取得しました`, tasksData)

    if (tasksData) {
      // 全てのタスクを表示（フィルタなし）
      // マイルストーンと担当者のタスクを区別して表示
      const allTasks = tasksData.map((task: any) => ({
        ...task,
        isMilestone: MILESTONE_EVENTS.some(event => task.title.includes(event))
      }))

      setTasks(allTasks as TaskWithProject[])
    } else {
      setTasks([])
    }
  }

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // 日曜始まり
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

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
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full px-4 py-3">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow p-3 mb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">カレンダー</h1>
            <div className="text-xs text-gray-600">
              {currentUser && `${currentUser.last_name} ${currentUser.first_name} (${currentUser.department})`}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousMonth}
              className="p-1 rounded-full hover:bg-gray-100 transition"
            >
              <ChevronLeft size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 min-w-40 text-center">
              {format(currentMonth, 'yyyy年 M月', { locale: ja })}
            </h2>

            <button
              onClick={nextMonth}
              className="p-1 rounded-full hover:bg-gray-100 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* 曜日ヘッダー（常に表示） */}
        <div className="bg-white rounded-t-lg shadow-md flex-shrink-0 sticky top-0 z-10">
          <div className="grid grid-cols-7 border-b-4 border-gray-800" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={`p-3 text-center text-lg font-black border-2 ${
                  index === 0 ? 'text-red-700 bg-red-100 border-red-300' : // 日曜
                  index === 6 ? 'text-blue-700 bg-blue-100 border-blue-300' : // 土曜
                  'text-gray-900 bg-gray-200 border-gray-300'
                }`}
                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* カレンダーグリッド */}
        <div className="bg-white rounded-b-lg shadow-md flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto"  style={{ scrollbarWidth: 'thin' }}>

          {/* カレンダーグリッド：全ての日を1つのグリッドに配置 */}
          <div className="calendar-grid flex-1" style={{ minHeight: 0 }}>
            {days.map(day => {
              const dayTasks = getTasksForDay(day)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const dayOfWeek = day.getDay() // 日曜=0, 月曜=1, ..., 土曜=6

              return (
                <div
                  key={day.toString()}
                  className={`calendar-day transition-colors ${
                    isToday ? 'border-2 border-blue-500 bg-blue-50' :
                    !isCurrentMonth ? 'bg-gray-50' :
                    dayOfWeek === 0 ? 'bg-red-50' : // 日曜
                    dayOfWeek === 6 ? 'bg-blue-50' : // 土曜
                    'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`date text-lg font-bold ${
                    isToday ? 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center ml-auto' :
                    !isCurrentMonth ? 'text-gray-400' :
                    dayOfWeek === 0 ? 'text-red-600' :
                    dayOfWeek === 6 ? 'text-blue-600' :
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
                          className={`text-sm px-2 py-1 rounded truncate cursor-pointer ${
                            isMilestone ? 'bg-red-600 text-white font-bold shadow-lg' :
                            task.status === 'completed' ? 'bg-blue-200 text-blue-900 font-semibold' :
                            task.status === 'requested' ? 'bg-yellow-200 text-yellow-900 font-semibold' :
                            'bg-gray-200 text-gray-800 font-medium'
                          }`}
                          title={`${task.title}${task.project?.customer?.names ? ' - ' + task.project.customer.names.join('・') + '様' : ''}`}
                        >
                          {task.title}
                        </div>
                      )
                    })}
                    {tasks.filter(task =>
                      task.due_date && isSameDay(new Date(task.due_date), day)
                    ).length > 3 && (
                      <div className="text-sm text-gray-600 font-semibold">
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
        </div>

        {/* 凡例 */}
        <div className="bg-white rounded-lg shadow p-2 mt-2 flex-shrink-0">
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="font-bold text-gray-900">凡例:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span>マイルストーン</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-200 border border-blue-300 rounded"></div>
              <span>完了</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-200 border border-yellow-300 rounded"></div>
              <span>着手中</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded"></div>
              <span>未着手</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
