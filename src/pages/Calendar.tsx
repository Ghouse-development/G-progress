import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Task, Project, Employee } from '../types/database'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

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

// 六曜を計算する関数（簡易版）
const ROKUYO = ['大安', '赤口', '先勝', '友引', '先負', '仏滅']
const getRokuyo = (date: Date): string => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  // 簡易計算: (月 + 日) % 6
  const index = (month + day) % 6
  return ROKUYO[index]
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<TaskWithProject | null>(null)
  const { showToast } = useToast()

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

  // ドラッグ&ドロップハンドラー
  const handleDragStart = (task: TaskWithProject) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (day: Date) => {
    if (!draggedTask) return

    const newDueDate = format(day, 'yyyy-MM-dd')

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', draggedTask.id)

      if (error) throw error

      showToast('タスクの期限を変更しました', 'success')
      loadTasks() // カレンダーを再読み込み
    } catch (error) {
      console.error('タスクの期限変更エラー:', error)
      showToast('タスクの期限変更に失敗しました', 'error')
    }

    setDraggedTask(null)
  }

  // iCalエクスポート
  const exportToICal = () => {
    const icalLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//G-progress//Calendar//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:G-progress カレンダー',
      'X-WR-TIMEZONE:Asia/Tokyo'
    ]

    tasks.forEach(task => {
      if (!task.due_date) return

      const dtstart = format(new Date(task.due_date), "yyyyMMdd'T'HHmmss")
      const dtend = format(new Date(task.due_date), "yyyyMMdd'T'235959")
      const dtstamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'")
      const uid = `${task.id}@g-progress.local`
      const summary = task.title
      const description = task.description || ''
      const location = task.project?.customer?.names ? task.project.customer.names.join('・') + '様' : ''

      icalLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
        `LOCATION:${location}`,
        `STATUS:${task.status === 'completed' ? 'COMPLETED' : task.status === 'requested' ? 'IN-PROCESS' : 'NEEDS-ACTION'}`,
        'END:VEVENT'
      )
    })

    icalLines.push('END:VCALENDAR')

    const icalContent = icalLines.join('\r\n')
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `g-progress-calendar-${format(new Date(), 'yyyyMMdd')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('カレンダーをエクスポートしました', 'success')
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
    <div className="h-full w-full bg-gray-50 flex flex-col overflow-hidden" style={{ margin: '-24px' }}>
      <div className="w-full h-full flex flex-col px-4 py-3">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow p-3 mb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">カレンダー</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToICal}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg border-2 border-black font-bold text-sm flex items-center gap-2 hover:opacity-90 transition"
              >
                <Download size={16} />
                iCalエクスポート
              </button>
              <div className="text-xs text-gray-600">
                {currentUser && `${currentUser.last_name} ${currentUser.first_name} (${currentUser.department})`}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <ChevronLeft size={20} />
            </button>

            <h2 className="text-3xl font-black text-gray-900 min-w-60 text-center">
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

        {/* 曜日ヘッダー（常に表示） */}
        <div className="bg-white rounded-t-lg shadow-md flex-shrink-0">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={`p-2 text-center text-lg font-bold border-r border-gray-100 ${
                  index === 5 ? 'text-blue-700 bg-blue-50' : // 土曜
                  index === 6 ? 'text-red-700 bg-red-50' : // 日曜
                  'text-gray-900 bg-gray-100'
                }`}
                style={index === 6 ? { borderRight: 'none' } : {}}
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
              const rokuyo = getRokuyo(day)

              return (
                <div
                  key={day.toString()}
                  className={`calendar-day transition-colors border-r border-b border-gray-100 ${
                    isToday ? 'border-2 border-blue-500 bg-blue-50' :
                    !isCurrentMonth ? 'bg-gray-50' :
                    dayOfWeek === 0 ? 'bg-red-50' : // 日曜
                    dayOfWeek === 6 ? 'bg-blue-50' : // 土曜
                    'bg-white hover:bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(day)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className={`date text-5xl font-black ${
                      isToday ? 'bg-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center' :
                      !isCurrentMonth ? 'text-gray-400' :
                      dayOfWeek === 0 ? 'text-red-600' :
                      dayOfWeek === 6 ? 'text-blue-600' :
                      'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className={`text-sm font-semibold ${
                      rokuyo === '大安' ? 'text-red-600' :
                      rokuyo === '仏滅' ? 'text-gray-600' :
                      'text-gray-500'
                    }`}>
                      {rokuyo}
                    </div>
                  </div>

                  <div className="events">
                    {dayTasks.map((task) => {
                      const isMilestone = MILESTONE_EVENTS.some(event => task.title.includes(event))
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          className={`text-sm px-2 py-1 rounded truncate cursor-move ${
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
