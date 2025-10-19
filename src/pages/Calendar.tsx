import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Task, Project, Employee, Payment, AuditLog } from '../types/database'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Download, ExternalLink, X, History } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import Papa from 'papaparse'
import jsPDF from 'jspdf'

interface TaskWithProject extends Task {
  project?: Project
}

interface PaymentWithProject extends Payment {
  project?: Project
}

type CalendarMode = 'tasks' | 'payments'

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
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 7, 1)) // 2024年8月から表示
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('tasks')
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [payments, setPayments] = useState<PaymentWithProject[]>([])
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<TaskWithProject | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithProject | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [taskAuditLogs, setTaskAuditLogs] = useState<any[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    loadCurrentUser()
    if (calendarMode === 'tasks') {
      loadTasks()
    } else {
      loadPayments()
    }
  }, [])

  useEffect(() => {
    if (calendarMode === 'tasks') {
      loadTasks()
    } else {
      loadPayments()
    }
  }, [currentMonth, calendarMode])

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

  const loadPayments = async () => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)

    console.log(`カレンダー: ${format(start, 'yyyy-MM-dd')} ～ ${format(end, 'yyyy-MM-dd')} の範囲で入金を取得します`)

    // 入金を取得（プロジェクトと顧客情報も含む）
    const { data: paymentsData, error } = await supabase
      .from('payments')
      .select(`
        *,
        project:projects(
          *,
          customer:customers(*)
        )
      `)
      .or(`scheduled_date.gte.${format(start, 'yyyy-MM-dd')},actual_date.gte.${format(start, 'yyyy-MM-dd')}`)
      .or(`scheduled_date.lte.${format(end, 'yyyy-MM-dd')},actual_date.lte.${format(end, 'yyyy-MM-dd')}`)

    if (error) {
      console.error('カレンダー: 入金の取得に失敗:', error)
      return
    }

    console.log(`カレンダー: ${paymentsData?.length || 0}件の入金を取得しました`, paymentsData)

    if (paymentsData) {
      setPayments(paymentsData as PaymentWithProject[])
    } else {
      setPayments([])
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
    ).slice(0, 2) // 最大2件（見やすさのため）
  }

  // タスク名を短縮表示
  const truncateTaskName = (name: string, maxLength: number = 15) => {
    if (name.length <= maxLength) return name
    return name.slice(0, maxLength) + '...'
  }

  // その日の全タスク数を取得
  const getTotalTasksForDay = (day: Date) => {
    return tasks.filter(task =>
      task.due_date && isSameDay(new Date(task.due_date), day)
    ).length
  }

  const getPaymentsForDay = (day: Date) => {
    return payments.filter(payment => {
      const scheduledMatch = payment.scheduled_date && isSameDay(new Date(payment.scheduled_date), day)
      const actualMatch = payment.actual_date && isSameDay(new Date(payment.actual_date), day)
      return scheduledMatch || actualMatch
    }).slice(0, 2) // 最大2件（見やすさのため）
  }

  // その日の全入金数を取得
  const getTotalPaymentsForDay = (day: Date) => {
    return payments.filter(payment => {
      const scheduledMatch = payment.scheduled_date && isSameDay(new Date(payment.scheduled_date), day)
      const actualMatch = payment.actual_date && isSameDay(new Date(payment.actual_date), day)
      return scheduledMatch || actualMatch
    }).length
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

  // タスクステータス更新
  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'not_started' | 'requested' | 'delayed' | 'completed') => {
    try {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() }

      // 完了に変更する場合、実績完了日を自動記録
      if (newStatus === 'completed') {
        updateData.actual_completion_date = format(new Date(), 'yyyy-MM-dd')
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error

      showToast('ステータスを更新しました', 'success')

      // 選択中のタスクを更新
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus, actual_completion_date: updateData.actual_completion_date })
      }

      // タスクリストを再読み込み
      loadTasks()
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      showToast('ステータスの更新に失敗しました', 'error')
    }
  }

  // タスクの変更履歴を取得
  const loadTaskAuditLogs = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:employees(id, last_name, first_name, department)
        `)
        .eq('table_name', 'tasks')
        .eq('record_id', taskId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setTaskAuditLogs(data || [])
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      setTaskAuditLogs([])
    }
  }

  // 期限日更新
  const handleUpdateDueDate = async (newDueDate: string) => {
    if (!selectedTask) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', selectedTask.id)

      if (error) throw error

      showToast('期限日を更新しました', 'success')
      setSelectedTask({ ...selectedTask, due_date: newDueDate })
      setEditingDueDate(false)
      loadTasks()
    } catch (error) {
      console.error('期限日の更新エラー:', error)
      showToast('期限日の更新に失敗しました', 'error')
    }
  }

  // CSV出力
  const exportToCSV = () => {
    const csvData = tasks.map(task => ({
      '案件': task.project?.customer?.names?.[0] || '不明',
      'タスク名': task.title,
      '期限日': task.due_date ? format(new Date(task.due_date), 'yyyy/MM/dd') : '',
      'ステータス': task.status === 'completed' ? '完了' :
        task.status === 'requested' ? '着手中' :
        task.status === 'delayed' ? '遅延' : '未着手',
      '作業内容': task.description || ''
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `カレンダー_${format(currentMonth, 'yyyyMM')}.csv`
    link.click()

    showToast('CSVを出力しました', 'success')
  }

  // PDF出力
  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica')
    doc.setFontSize(16)
    doc.text(`カレンダー ${format(currentMonth, 'yyyy年M月')}`, 20, 20)

    let y = 40
    doc.setFontSize(10)
    doc.text('期限日', 20, y)
    doc.text('案件', 50, y)
    doc.text('タスク名', 100, y)
    doc.text('ステータス', 150, y)

    y += 10
    tasks.forEach(task => {
      if (y > 280) {
        doc.addPage()
        y = 20
      }

      const statusText = task.status === 'completed' ? '完了' :
        task.status === 'requested' ? '着手中' :
        task.status === 'delayed' ? '遅延' : '未着手'

      doc.text(task.due_date ? format(new Date(task.due_date), 'MM/dd') : '', 20, y)
      doc.text(task.project?.customer?.names?.[0] || '不明', 50, y)
      doc.text(task.title.substring(0, 20), 100, y)
      doc.text(statusText, 150, y)
      y += 10
    })

    doc.save(`カレンダー_${format(currentMonth, 'yyyyMM')}.pdf`)
    showToast('PDFを出力しました', 'success')
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
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ margin: '-24px' }}>
      <div className="w-full h-full flex flex-col px-4 py-3">
        {/* ヘッダー */}
        <div className="prisma-card mb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl lg:text-2xl font-bold text-canva-purple">カレンダー</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToCSV}
                className="px-2 py-1 lg:px-3 lg:py-2 bg-white border text-xs lg:text-sm hover:bg-gray-50"
              >
                CSV出力
              </button>
              <button
                onClick={exportToPDF}
                className="px-2 py-1 lg:px-3 lg:py-2 bg-white border text-xs lg:text-sm hover:bg-gray-50"
              >
                PDF出力
              </button>
              <button
                onClick={exportToICal}
                className="px-2 py-1 lg:px-3 lg:py-2 bg-white border text-xs lg:text-sm hover:bg-gray-50"
              >
                iCal出力
              </button>
            </div>
          </div>

          {/* モード切替 */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => setCalendarMode('tasks')}
              className={`px-4 py-2 text-sm lg:text-base font-bold border-2 transition-colors shadow-sm ${
                calendarMode === 'tasks'
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
              }`}
            >
              通常カレンダー
            </button>
            <button
              onClick={() => setCalendarMode('payments')}
              className={`px-4 py-2 text-sm lg:text-base font-bold border-2 transition-colors shadow-sm ${
                calendarMode === 'payments'
                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                  : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
              }`}
            >
              入金カレンダー
            </button>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 rounded-full hover:bg-canva-purple-light hover:text-white transition"
            >
              <ChevronLeft size={20} className="lg:hidden" />
              <ChevronLeft size={24} className="hidden lg:block" />
            </button>

            <h2 className="text-2xl lg:text-3xl font-black text-canva-purple min-w-48 lg:min-w-60 text-center">
              {format(currentMonth, 'yyyy年 M月', { locale: ja })}
            </h2>

            <button
              onClick={nextMonth}
              className="p-2 rounded-full hover:bg-canva-purple-light hover:text-white transition"
            >
              <ChevronRight size={20} className="lg:hidden" />
              <ChevronRight size={24} className="hidden lg:block" />
            </button>
          </div>
        </div>

        {/* 曜日ヘッダー（常に表示） */}
        <div className="bg-white rounded-t-lg shadow-md flex-shrink-0">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={`p-1 lg:p-2 text-center text-sm lg:text-lg font-bold border-r border-gray-100 ${
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
              const dayTasks = calendarMode === 'tasks' ? getTasksForDay(day) : []
              const dayPayments = calendarMode === 'payments' ? getPaymentsForDay(day) : []
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
                    <div className={`date text-xl lg:text-3xl font-black ${
                      isToday ? 'bg-blue-500 text-white rounded-full w-10 h-10 lg:w-16 lg:h-16 flex items-center justify-center' :
                      !isCurrentMonth ? 'text-gray-400' :
                      dayOfWeek === 0 ? 'text-red-600' :
                      dayOfWeek === 6 ? 'text-blue-600' :
                      'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className={`text-xs lg:text-base font-semibold ${
                      rokuyo === '大安' ? 'text-red-600' :
                      rokuyo === '仏滅' ? 'text-gray-600' :
                      'text-gray-500'
                    }`}>
                      {rokuyo}
                    </div>
                  </div>

                  <div className="events">
                    {/* タスクモードの表示 */}
                    {calendarMode === 'tasks' && dayTasks.map((task) => {
                      const isMilestone = MILESTONE_EVENTS.some(event => task.title.includes(event))
                      const customerName = task.project?.customer?.names?.join('・') || ''
                      const displayTaskName = truncateTaskName(task.title, 12)
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          onClick={async (e) => {
                            e.stopPropagation()
                            setSelectedTask(task)
                            setShowTaskModal(true)
                            // 変更履歴を取得
                            await loadTaskAuditLogs(task.id)
                          }}
                          className={`text-base lg:text-lg px-2 py-2 rounded cursor-pointer mb-1 ${
                            isMilestone ? 'bg-red-600 text-white font-bold shadow-lg hover:bg-red-700' :
                            task.status === 'completed' ? 'bg-blue-200 text-blue-900 font-bold hover:bg-blue-300' :
                            task.status === 'requested' ? 'bg-yellow-200 text-yellow-900 font-bold hover:bg-yellow-300' :
                            'bg-gray-200 text-gray-800 font-bold hover:bg-gray-300'
                          }`}
                          title={`${task.title}${customerName ? ' - ' + customerName + '様' : ''}`}
                        >
                          {customerName && <div className="text-xs font-semibold mb-0.5">【{truncateTaskName(customerName, 8)}様】</div>}
                          <div className="leading-tight">{displayTaskName}</div>
                        </div>
                      )
                    })}
                    {calendarMode === 'tasks' && getTotalTasksForDay(day) > 2 && (
                      <div className="text-base lg:text-lg text-gray-600 dark:text-gray-400 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: その日の全タスクを表示するモーダルを開く
                        }}
                        title="クリックして全タスクを表示"
                      >
                        +{getTotalTasksForDay(day) - 2}件
                      </div>
                    )}

                    {/* 入金モードの表示 */}
                    {calendarMode === 'payments' && dayPayments.map((payment) => {
                      const isScheduled = payment.scheduled_date && isSameDay(new Date(payment.scheduled_date), day)
                      const isActual = payment.actual_date && isSameDay(new Date(payment.actual_date), day)
                      const amount = isActual ? payment.actual_amount : payment.scheduled_amount
                      const customerName = payment.project?.customer?.names?.join('・') || ''
                      return (
                        <div
                          key={payment.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPayment(payment)
                            setShowPaymentModal(true)
                          }}
                          className={`text-base lg:text-lg px-2 py-2 rounded cursor-pointer mb-1 ${
                            isActual
                              ? 'bg-green-200 text-green-900 font-bold hover:bg-green-300 border-2 border-green-400'
                              : 'bg-yellow-100 text-yellow-900 font-bold hover:bg-yellow-200 border-2 border-yellow-300'
                          }`}
                          title={`${customerName ? customerName + '様 - ' : ''}${payment.payment_type} ${amount?.toLocaleString()}円`}
                        >
                          {customerName && <div className="text-xs font-semibold mb-0.5">【{truncateTaskName(customerName, 8)}様】</div>}
                          <div className="font-bold leading-tight">{payment.payment_type}</div>
                          <div className="text-sm font-bold">{Math.floor(amount || 0).toLocaleString()}円</div>
                        </div>
                      )
                    })}
                    {calendarMode === 'payments' && getTotalPaymentsForDay(day) > 2 && (
                      <div className="text-base lg:text-lg text-gray-600 dark:text-gray-400 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: その日の全入金を表示するモーダルを開く
                        }}
                        title="クリックして全入金を表示"
                      >
                        +{getTotalPaymentsForDay(day) - 2}件
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
        <div className="prisma-card mt-2 flex-shrink-0 py-2">
          {calendarMode === 'tasks' ? (
            <div className="flex items-center justify-center gap-2 lg:gap-4 text-xs lg:text-base flex-wrap">
              <span className="font-bold text-canva-purple">凡例:</span>
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
          ) : (
            <div className="flex items-center justify-center gap-2 lg:gap-4 text-xs lg:text-base flex-wrap">
              <span className="font-bold text-canva-green">凡例:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
                <span>入金実績</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>入金予定</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* タスク詳細モーダル */}
      {showTaskModal && selectedTask && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal" style={{ maxWidth: '800px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="prisma-modal-title">{selectedTask.title}</h2>
                  {selectedTask.project?.customer?.names && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedTask.project.customer.names.join('・')}様邸
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedTask(null)
                    setShowTaskModal(false)
                    setEditingDueDate(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              {/* 責任者 */}
              {(selectedTask.assigned_employee || selectedTask.project?.sales) && (
                <div>
                  <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                    責任者
                  </label>
                  <div className="prisma-input bg-gray-50 dark:bg-gray-700">
                    {selectedTask.assigned_employee ?
                      `${selectedTask.assigned_employee.last_name} ${selectedTask.assigned_employee.first_name}（${selectedTask.assigned_employee.department}）` :
                      selectedTask.project?.sales ?
                      `${selectedTask.project.sales.last_name} ${selectedTask.project.sales.first_name}（${selectedTask.project.sales.department}）` :
                      '未設定'
                    }
                  </div>
                </div>
              )}

              {/* ステータス変更ボタン */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">ステータス</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                    className={`py-2 px-3 rounded text-base font-medium transition-all ${
                      selectedTask.status === 'not_started'
                        ? 'task-not-started'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-red-400'
                    }`}
                  >
                    未着手
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                    className={`py-2 px-3 rounded text-base font-medium transition-all ${
                      selectedTask.status === 'requested'
                        ? 'task-in-progress'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-yellow-400'
                    }`}
                  >
                    着手中
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                    className={`py-2 px-3 rounded text-base font-medium transition-all ${
                      selectedTask.status === 'delayed'
                        ? 'task-delayed'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-red-400'
                    }`}
                  >
                    遅延
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
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

              {/* 期限日 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">期限日</label>
                {editingDueDate ? (
                  <input
                    type="date"
                    value={selectedTask.due_date || ''}
                    onChange={(e) => handleUpdateDueDate(e.target.value)}
                    onBlur={() => setEditingDueDate(false)}
                    autoFocus
                    className="prisma-input"
                  />
                ) : (
                  <div
                    onClick={() => setEditingDueDate(true)}
                    className="prisma-input cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'yyyy年MM月dd日 (E)', { locale: ja }) : '未設定'}
                    </div>
                    {selectedTask.due_date && selectedTask.project?.contract_date && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        契約日から {differenceInDays(new Date(selectedTask.due_date), new Date(selectedTask.project.contract_date))}日目
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 作業内容 */}
              {selectedTask.description && (
                <div>
                  <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">作業内容</label>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-base leading-relaxed text-gray-800 dark:text-gray-200">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Do's & Don'ts */}
              {(selectedTask.dos || selectedTask.donts) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {selectedTask.dos && (
                    <div>
                      <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">Do's (推奨事項)</label>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 border-2 border-green-300 dark:border-green-700 rounded-lg text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {selectedTask.dos}
                      </div>
                    </div>
                  )}

                  {selectedTask.donts && (
                    <div>
                      <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">Don'ts (禁止事項)</label>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 border-2 border-red-300 dark:border-red-700 rounded-lg text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {selectedTask.donts}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 変更履歴 */}
              <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <History size={20} className="text-gray-600 dark:text-gray-400" />
                  <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300">変更履歴（最新5件）</label>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {taskAuditLogs.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {taskAuditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <div className="text-gray-500 dark:text-gray-500 whitespace-nowrap">
                            {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm')}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {log.action === 'update' ? '更新' : log.action === 'create' ? '作成' : log.action}
                            </div>
                            {log.changes && (
                              <div className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                                {Object.keys(log.changes).map(key => {
                                  const change = log.changes[key]
                                  return (
                                    <div key={key}>
                                      {key === 'status' ? 'ステータス' :
                                       key === 'due_date' ? '期限日' :
                                       key === 'actual_completion_date' ? '完了日' : key}
                                      : {String(change.old || '未設定')} → {String(change.new)}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            {log.user && (
                              <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                {log.user.last_name} {log.user.first_name}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-500 py-2 text-xs">
                      変更履歴がありません
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              {selectedTask.project?.id && (
                <button
                  onClick={() => {
                    navigate(`/projects/${selectedTask.project?.id}`)
                  }}
                  className="prisma-btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  案件詳細を開く
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedTask(null)
                  setShowTaskModal(false)
                  setEditingDueDate(false)
                }}
                className="prisma-btn-primary flex-1"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 入金詳細モーダル */}
      {showPaymentModal && selectedPayment && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal" style={{ maxWidth: '600px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="prisma-modal-title">入金詳細</h2>
                  {selectedPayment.project?.customer?.names && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedPayment.project.customer.names.join('・')}様邸
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedPayment(null)
                    setShowPaymentModal(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              {/* 名目 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">名目</label>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border-2 border-blue-300 dark:border-blue-700 rounded-lg text-center">
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {selectedPayment.payment_type}
                  </div>
                </div>
              </div>

              {/* 金額情報 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 予定 */}
                <div>
                  <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">予定額</label>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg text-center">
                    <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
                      {selectedPayment.scheduled_amount?.toLocaleString() || '0'}円
                    </div>
                    {selectedPayment.scheduled_date && (
                      <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {format(new Date(selectedPayment.scheduled_date), 'yyyy/MM/dd (E)', { locale: ja })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 実績 */}
                <div>
                  <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">入金実績</label>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 border-2 border-green-300 dark:border-green-700 rounded-lg text-center">
                    <div className="text-xl font-bold text-green-900 dark:text-green-100">
                      {selectedPayment.actual_amount?.toLocaleString() || '0'}円
                    </div>
                    {selectedPayment.actual_date && (
                      <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                        {format(new Date(selectedPayment.actual_date), 'yyyy/MM/dd (E)', { locale: ja })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 合計金額 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">合計金額</label>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 border-2 border-gray-400 dark:border-gray-600 rounded-lg text-center">
                  <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    {selectedPayment.amount?.toLocaleString() || '0'}円
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              {selectedPayment.project?.id && (
                <button
                  onClick={() => {
                    navigate(`/projects/${selectedPayment.project?.id}`)
                  }}
                  className="prisma-btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  案件詳細を開く
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedPayment(null)
                  setShowPaymentModal(false)
                }}
                className="prisma-btn-primary flex-1"
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
