import { useState, useEffect, useRef } from 'react'
import { Project, Employee, Task } from '../types/database'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { Save, Eye, Trash2, AlertTriangle } from 'lucide-react'
import { format, differenceInDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ORGANIZATION_HIERARCHY } from '../constants/organizationHierarchy'

interface TaskWithEmployee extends Task {
  assigned_employee?: Employee
  dayFromContract?: number
  position?: string
  business_no?: number
  task_master?: {
    trigger_task_id?: string
    days_from_trigger?: number
    trigger_task?: {
      title: string
    }
  }
}

interface ProjectDetailFieldsProps {
  project: Project
  onUpdate: () => void
  tasks?: TaskWithEmployee[]
  employees?: Employee[]
  onTaskClick?: (task: TaskWithEmployee) => void
  onTaskDelete?: (taskId: string) => void
  onCellDoubleClick?: (position: string, day: number) => void
  scrollToToday?: () => void
  todayRowRef?: React.RefObject<HTMLDivElement>
}

export default function ProjectDetailFields({
  project,
  onUpdate,
  tasks = [],
  employees = [],
  onTaskClick,
  onTaskDelete,
  onCellDoubleClick,
  scrollToToday,
  todayRowRef
}: ProjectDetailFieldsProps) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('grid')
  const [positionSubTab, setPositionSubTab] = useState<'tasks' | 'staff'>('tasks')
  const [formData, setFormData] = useState(project)
  const [saving, setSaving] = useState(false)
  const deptHeaderRef = useRef<HTMLDivElement>(null)
  const [deptHeaderHeight, setDeptHeaderHeight] = useState(48) // デフォルト値

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update(formData)
        .eq('id', project.id)

      if (error) throw error

      showToast('案件情報を更新しました', 'success')
      onUpdate()
    } catch (error) {
      console.error('Failed to update project:', error)
      showToast('更新に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 部門ヘッダーの高さを動的に取得
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (deptHeaderRef.current) {
        const height = deptHeaderRef.current.offsetHeight
        setDeptHeaderHeight(height)
      }
    }

    // 初回とリサイズ時に高さを更新
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [activeTab]) // activeTabが変わった時も再計算

  const tabs = [
    { id: 'grid', label: 'グリッドビュー' },
    { id: 'position', label: '職種別ビュー' },
    { id: 'basic', label: '基本情報' },
    { id: 'schedule', label: 'スケジュール' },
    { id: 'payment', label: '金額' },
    { id: 'loan', label: '融資関連' },
    { id: 'demolition', label: '解体・土地' },
    { id: 'construction', label: '工事' },
    { id: 'performance', label: '性能値' }
  ]

  // 部門と職種の定義
  const DEPARTMENTS = ORGANIZATION_HIERARCHY
  const ALL_POSITIONS = DEPARTMENTS.flatMap(d => d.positions)

  // 今日が契約日から何日目かを計算
  const getTodayFromContract = (contractDate: string): number => {
    return differenceInDays(new Date(), new Date(contractDate))
  }

  // 引き渡し日までの日数を計算
  const getDeliveryDays = (tasks: TaskWithEmployee[] = []): number => {
    // 常に999日まで表示（全タスク対応）
    return 999
  }

  // グリッドビュー用ヘルパー関数
  const getTasksForPositionAndDay = (position: string, day: number): TaskWithEmployee[] => {
    return tasks.filter(task => {
      if (task.dayFromContract !== day) return false

      // descriptionの形式: "職種: タスク内容"
      const descriptionParts = task.description?.split(':')
      const taskPosition = descriptionParts?.[0]?.trim()

      // descriptionに職種が含まれている場合はそれを使用
      if (taskPosition === position) return true

      // descriptionに職種がない場合、担当者の部門を確認
      if (!taskPosition && task.assigned_employee?.department === position) return true

      return false
    })
  }

  const getEmployeeByPosition = (position: string): Employee | undefined => {
    return employees.find(emp => emp.department === position)
  }

  const getCompletionRateByPosition = (position: string): number => {
    const positionTasks = tasks.filter(task => {
      const descriptionParts = task.description?.split(':')
      const taskPosition = descriptionParts?.[0]?.trim()

      // descriptionに職種が含まれている場合
      if (taskPosition === position) return true

      // descriptionに職種がない場合、担当者の部門を確認
      if (!taskPosition && task.assigned_employee?.department === position) return true

      return false
    })
    if (positionTasks.length === 0) return 0
    const completedTasks = positionTasks.filter(task => task.status === 'completed')
    return Math.round((completedTasks.length / positionTasks.length) * 100)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'task-not-started'
      case 'requested': return 'task-in-progress'
      case 'delayed': return 'task-delayed'
      case 'completed': return 'task-completed'
      case 'not_applicable': return 'task-completed'
      default: return 'task-not-started'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_started': return '未着手'
      case 'requested': return '着手中'
      case 'delayed': return '遅延'
      case 'completed': return '完了'
      case 'not_applicable': return '対象外'
      default: return status
    }
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm">
      {/* タブヘッダー */}
      <div className="flex border-b-2 border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className={activeTab === 'grid' || activeTab === 'position' ? '' : 'p-6'}>
        {/* グリッドビュー */}
        {activeTab === 'grid' && (
          <div>
            {/* 今日へジャンプボタン */}
            <div className="p-3 bg-gray-50 border-b-2 border-gray-300 flex items-center justify-end">
              <button
                onClick={scrollToToday}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-base font-bold hover:bg-red-600 transition-colors"
              >
                📍 今日へジャンプ
              </button>
            </div>

            <div className="grid-view-container" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              <div style={{ minWidth: 'fit-content', width: '100%' }}>
                {/* 部門ヘッダー */}
                <div ref={deptHeaderRef} className="flex border-b-2 border-gray-200 sticky top-0 z-30 bg-white">
                  <div className="w-28 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center font-bold text-base text-gray-800 bg-white sticky left-0 z-40">
                    日付
                  </div>
                  <div className="w-20 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center font-bold text-base text-gray-800 bg-white sticky left-28 z-40">
                    日数
                  </div>
                  {DEPARTMENTS.map((dept, index) => (
                    <div
                      key={dept.name}
                      className={`text-center py-2 px-1 font-bold text-base ${
                        index === 0 ? 'bg-blue-100 text-blue-900' :
                        index === 1 ? 'bg-green-100 text-green-900' :
                        index === 2 ? 'bg-orange-100 text-orange-900' :
                        'bg-purple-100 text-purple-900'
                      } ${index < DEPARTMENTS.length - 1 ? 'border-r-4 border-white' : ''}`}
                      style={{
                        flex: `${dept.positions.length} 1 0%`,
                        minWidth: `${dept.positions.length * 80}px`
                      }}
                    >
                      {dept.name}
                    </div>
                  ))}
                </div>

                {/* 職種ヘッダー */}
                <div className="flex border-b-2 border-gray-200 bg-white sticky z-20" style={{ top: `${deptHeaderHeight}px` }}>
                  <div className="w-28 flex-shrink-0 border-r-2 border-gray-200 p-2 text-center text-base font-bold bg-gray-50 sticky left-0 z-40">
                    日付
                  </div>
                  <div className="w-20 flex-shrink-0 border-r-2 border-gray-200 p-2 text-center text-base font-bold bg-gray-50 sticky left-28 z-40">
                    日
                  </div>
                  {ALL_POSITIONS.map((position) => {
                    const completionRate = getCompletionRateByPosition(position)
                    return (
                      <div
                        key={position}
                        className="border-r border-gray-200 p-2 text-center bg-white"
                        style={{ flex: '1 1 0%', minWidth: '80px' }}
                      >
                        <div className="font-bold text-base text-gray-800 mb-2 truncate">{position}</div>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-base font-bold text-green-700 whitespace-nowrap">{completionRate}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* グリッドボディ */}
                <div>
                  {(() => {
                    // タスクがある日のみを抽出してソート
                    const daysWithTasks = Array.from(
                      new Set(
                        tasks
                          .map(t => t.dayFromContract)
                          .filter(d => d !== undefined && d !== null)
                      )
                    ).sort((a, b) => (a as number) - (b as number)) as number[]

                    return daysWithTasks
                  })().map((day) => {
                    const hasTask = tasks.some(t => t.dayFromContract === day)
                    const currentDate = addDays(new Date(project.contract_date), day)
                    const todayDay = getTodayFromContract(project.contract_date)
                    const isToday = day === todayDay
                    return (
                      <div
                        key={day}
                        ref={isToday ? todayRowRef : null}
                        className={`flex border-b border-gray-200 min-h-[60px] ${
                          day % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } ${hasTask ? 'hover:bg-blue-50' : ''}`}
                        style={isToday ? {
                          borderTop: '4px solid #dc2626',
                          backgroundColor: '#fef2f2'
                        } : {}}
                      >
                        <div className={`w-28 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center text-base font-bold flex items-center justify-center sticky left-0 z-10 ${
                          hasTask ? 'text-blue-700 bg-blue-50' : 'text-gray-700 bg-white'
                        } ${day % 2 === 0 ? (hasTask ? 'bg-blue-50' : 'bg-white') : (hasTask ? 'bg-blue-50' : 'bg-gray-50')}`}>
                          {format(currentDate, 'MM/dd (E)', { locale: ja })}
                        </div>

                        <div className={`w-20 flex-shrink-0 border-r-2 border-gray-200 p-3 text-center text-base font-bold flex items-center justify-center sticky left-28 z-10 ${
                          hasTask ? 'text-blue-700 bg-blue-50' : 'text-gray-600'
                        } ${day % 2 === 0 ? (hasTask ? 'bg-blue-50' : 'bg-white') : (hasTask ? 'bg-blue-50' : 'bg-gray-50')}`}>
                          {day}日
                        </div>

                        {ALL_POSITIONS.map((position) => {
                          const positionTasks = getTasksForPositionAndDay(position, day)
                          return (
                            <div
                              key={position}
                              className="border-r border-gray-200 p-2 text-center hover:bg-yellow-50 transition-colors cursor-pointer flex flex-col justify-center"
                              style={{ flex: '1 1 0%', minWidth: '80px' }}
                              onDoubleClick={() => onCellDoubleClick && onCellDoubleClick(position, day)}
                              title="ダブルクリックでタスク追加"
                            >
                              {positionTasks.map((task) => {
                                const isDelayed = task.status === 'delayed' || (
                                  task.due_date &&
                                  task.status !== 'completed' &&
                                  new Date(task.due_date) < new Date()
                                )

                                return (
                                  <div
                                    key={task.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onTaskClick && onTaskClick(task)
                                    }}
                                    className={`relative text-base px-2 py-1 rounded truncate cursor-pointer mb-1 ${
                                      isDelayed ? 'task-delayed' :
                                      task.status === 'completed' ? 'task-completed' :
                                      task.status === 'requested' ? 'task-in-progress' :
                                      'task-not-started'
                                    }`}
                                    title={`${task.title}${task.is_date_confirmed ? ' [日付確定]' : ' [予定]'}${task.comment ? '\n\nコメント: ' + task.comment : ''}`}
                                  >
                                    {task.title}
                                    {task.is_date_confirmed && (
                                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-green-600 rounded-full border-2 border-white shadow-lg">
                                        確
                                      </span>
                                    )}
                                    {task.original_due_date && task.due_date && task.original_due_date !== task.due_date && (
                                      <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-white bg-yellow-500 rounded-full border-2 border-white shadow-lg" title={`当初予定から${Math.abs(differenceInDays(new Date(task.due_date), new Date(task.original_due_date)))}日${differenceInDays(new Date(task.due_date), new Date(task.original_due_date)) > 0 ? '後ろ倒し' : '前倒し'}`}>
                                        <AlertTriangle size={12} />
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 職種別ビュー */}
        {activeTab === 'position' && (
          <div>
            {/* サブタブ */}
            <div className="flex border-b-2 border-gray-200 bg-gray-50 px-4">
              <button
                onClick={() => setPositionSubTab('tasks')}
                className={`px-6 py-3 font-bold text-base transition-colors ${
                  positionSubTab === 'tasks'
                    ? 'border-b-4 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                タスク一覧
              </button>
              <button
                onClick={() => setPositionSubTab('staff')}
                className={`px-6 py-3 font-bold text-base transition-colors ${
                  positionSubTab === 'staff'
                    ? 'border-b-4 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                担当者
              </button>
            </div>

            {/* タスク一覧タブ */}
            {positionSubTab === 'tasks' && (
              <div className="p-4" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                {tasks.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 font-medium border-2 border-gray-300">
                    タスクがありません
                  </div>
                ) : (
              <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-300">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100 border-b-2 border-gray-400 sticky top-0 z-10">
                      <tr>
                        <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900" style={{ minWidth: '100px' }}>
                          職種
                        </th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-left font-bold text-base text-gray-900" style={{ minWidth: '250px' }}>
                          タスク名
                        </th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900" style={{ minWidth: '120px' }}>
                          担当者
                        </th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900" style={{ minWidth: '110px' }}>
                          期限
                        </th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900" style={{ minWidth: '90px' }}>
                          経過日数
                        </th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900" style={{ minWidth: '100px' }}>
                          ステータス
                        </th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900" style={{ minWidth: '120px' }}>
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEPARTMENTS.map((dept) => {
                        const deptTasks = tasks.filter(task => {
                          const taskPosition = task.description?.split(':')[0]?.trim()
                          return dept.positions.includes(taskPosition || '')
                        })

                        return dept.positions.map(position => {
                          const positionTasks = deptTasks.filter(task => {
                            const taskPosition = task.description?.split(':')[0]?.trim()
                            return taskPosition === position
                          })

                          if (positionTasks.length === 0) return null

                          return positionTasks.map((task, index) => {
                            const isDelayed = task.due_date &&
                              task.status !== 'completed' &&
                              new Date(task.due_date) < new Date()

                            return (
                              <tr
                                key={task.id}
                                className="hover:bg-blue-50 transition-colors cursor-pointer"
                                onClick={() => onTaskClick && onTaskClick(task)}
                                title={`${task.title}${task.is_date_confirmed ? ' [日付確定]' : ' [予定]'}${task.comment ? '\n\nコメント: ' + task.comment : ''}`}
                              >
                                {/* 職種 */}
                                {index === 0 && (
                                  <td
                                    rowSpan={positionTasks.length}
                                    className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-base text-gray-900 bg-green-50"
                                  >
                                    {position}
                                  </td>
                                )}

                                {/* タスク名 */}
                                <td className="border-2 border-gray-300 px-4 py-3 text-base text-gray-900 font-medium">
                                  <div className="relative inline-block">
                                    {task.title}
                                    {task.is_date_confirmed && (
                                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-green-600 rounded-full border-2 border-white shadow-lg" title="日付確定">
                                        確
                                      </span>
                                    )}
                                    {task.original_due_date && task.due_date && task.original_due_date !== task.due_date && (
                                      <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-white bg-yellow-500 rounded-full border-2 border-white shadow-lg" title={`当初予定から${Math.abs(differenceInDays(new Date(task.due_date), new Date(task.original_due_date)))}日${differenceInDays(new Date(task.due_date), new Date(task.original_due_date)) > 0 ? '後ろ倒し' : '前倒し'}`}>
                                        <AlertTriangle size={12} />
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 担当者 */}
                                <td className="border-2 border-gray-300 px-4 py-3 text-center text-base text-gray-900">
                                  {task.assigned_employee
                                    ? `${task.assigned_employee.last_name} ${task.assigned_employee.first_name}`
                                    : '未割当'
                                  }
                                </td>

                                {/* 期限 */}
                                <td className="border-2 border-gray-300 px-4 py-3 text-center text-base font-bold text-gray-900">
                                  {task.due_date
                                    ? format(new Date(task.due_date), 'M/d (E)', { locale: ja })
                                    : '未設定'
                                  }
                                </td>

                                {/* 経過日数 */}
                                <td className="border-2 border-gray-300 px-4 py-3 text-center text-base font-bold text-blue-700">
                                  {task.dayFromContract || 0}日
                                </td>

                                {/* ステータス */}
                                <td className="border-2 border-gray-300 px-4 py-3 text-center">
                                  <span className={`px-3 py-1 rounded-lg font-bold text-base border-2 ${
                                    isDelayed ? 'task-delayed' : getStatusBadgeColor(task.status)
                                  }`}>
                                    {isDelayed ? '遅延' : getStatusText(task.status)}
                                  </span>
                                </td>

                                {/* 操作 */}
                                <td className="border-2 border-gray-300 px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onTaskClick && onTaskClick(task)
                                      }}
                                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border-2 border-blue-300"
                                      title="詳細表示"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onTaskDelete && onTaskDelete(task.id)
                                      }}
                                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border-2 border-red-300"
                                      title="削除"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        })
                      }).flat()}
                    </tbody>
                  </table>
                </div>
              </div>
                )}
              </div>
            )}

            {/* 担当者タブ */}
            {positionSubTab === 'staff' && (
              <div className="p-4" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-300">
                  <div className="overflow-x-auto">
                    {DEPARTMENTS.map((dept) => (
                      <div key={dept.name} className="mb-6 last:mb-0">
                        <div className={`px-4 py-3 font-bold text-lg border-b-3 ${
                          dept.name === '営業部' ? 'bg-blue-100 text-blue-900 border-blue-400' :
                          dept.name === '設計部' ? 'bg-green-100 text-green-900 border-green-400' :
                          dept.name === '工事部' ? 'bg-orange-100 text-orange-900 border-orange-400' :
                          'bg-purple-100 text-purple-900 border-purple-400'
                        }`}>
                          {dept.name}
                        </div>
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border-2 border-gray-300 px-4 py-3 text-left font-bold text-base text-gray-900 w-1/3">
                                職種
                              </th>
                              <th className="border-2 border-gray-300 px-4 py-3 text-left font-bold text-base text-gray-900 w-2/3">
                                担当者
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dept.positions.map((position) => {
                              const employee = employees.find(emp => emp.department === position)
                              return (
                                <tr key={position} className="hover:bg-blue-50 transition-colors">
                                  <td className="border-2 border-gray-300 px-4 py-3 text-base font-bold text-gray-900 bg-gray-50">
                                    {position}
                                  </td>
                                  <td className="border-2 border-gray-300 px-4 py-3 text-base text-gray-900">
                                    {employee ? `${employee.last_name} ${employee.first_name}` : '未割当'}
                                  </td>
                                </tr>
                              )
                            })}
                            {dept.positions.length === 0 && (
                              <tr>
                                <td colSpan={2} className="border-2 border-gray-300 px-4 py-3 text-center text-gray-500">
                                  職種がありません
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 基本情報 */}
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">契約番号</label>
              <input
                type="text"
                value={formData.contract_number || ''}
                onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">建設地（住所）</label>
              <input
                type="text"
                value={formData.construction_address || ''}
                onChange={e => setFormData({ ...formData, construction_address: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">地番</label>
              <input
                type="text"
                value={formData.lot_number || ''}
                onChange={e => setFormData({ ...formData, lot_number: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">階数</label>
              <input
                type="number"
                value={formData.floors || ''}
                onChange={e => setFormData({ ...formData, floors: parseInt(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">坪数（施工）</label>
              <input
                type="number"
                step="0.01"
                value={formData.construction_area || ''}
                onChange={e => setFormData({ ...formData, construction_area: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">進捗状況（問題点・アクションプラン）</label>
              <textarea
                value={formData.progress_status || ''}
                onChange={e => setFormData({ ...formData, progress_status: e.target.value })}
                rows={3}
                className="prisma-input resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">備考（お客様個別情報・注意点）</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="prisma-input resize-none"
              />
            </div>
          </div>
        )}

        {/* スケジュール */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">設計ヒアリング</label>
              <input
                type="date"
                value={formData.design_hearing_date || ''}
                onChange={e => setFormData({ ...formData, design_hearing_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">プラン確定</label>
              <input
                type="date"
                value={formData.plan_finalized_date || ''}
                onChange={e => setFormData({ ...formData, plan_finalized_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">資金計画書送付</label>
              <input
                type="date"
                value={formData.plan_financial_sent_date || ''}
                onChange={e => setFormData({ ...formData, plan_financial_sent_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">構造GO</label>
              <input
                type="date"
                value={formData.structure_go_date || ''}
                onChange={e => setFormData({ ...formData, structure_go_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">申請GO</label>
              <input
                type="date"
                value={formData.application_go_date || ''}
                onChange={e => setFormData({ ...formData, application_go_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最終打合</label>
              <input
                type="date"
                value={formData.final_meeting_date || ''}
                onChange={e => setFormData({ ...formData, final_meeting_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">図面UP</label>
              <input
                type="date"
                value={formData.drawing_upload_date || ''}
                onChange={e => setFormData({ ...formData, drawing_upload_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">着工許可</label>
              <input
                type="date"
                value={formData.construction_permit_date || ''}
                onChange={e => setFormData({ ...formData, construction_permit_date: e.target.value })}
                className="prisma-input"
              />
            </div>
          </div>
        )}

        {/* 融資関連 */}
        {activeTab === 'loan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="long_term_loan"
                checked={formData.long_term_loan || false}
                onChange={e => setFormData({ ...formData, long_term_loan: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="long_term_loan" className="text-sm font-medium text-gray-700">
                長期融資
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="flat_loan"
                checked={formData.flat_loan || false}
                onChange={e => setFormData({ ...formData, flat_loan: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="flat_loan" className="text-sm font-medium text-gray-700">
                フラット融資
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">銀行名</label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">補助金種別</label>
              <input
                type="text"
                value={formData.subsidy_type || ''}
                onChange={e => setFormData({ ...formData, subsidy_type: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">長期要件</label>
              <textarea
                value={formData.long_term_requirements || ''}
                onChange={e => setFormData({ ...formData, long_term_requirements: e.target.value })}
                rows={2}
                className="prisma-input resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">GX要件</label>
              <textarea
                value={formData.gx_requirements || ''}
                onChange={e => setFormData({ ...formData, gx_requirements: e.target.value })}
                rows={2}
                className="prisma-input resize-none"
              />
            </div>
          </div>
        )}

        {/* 解体・土地 */}
        {activeTab === 'demolition' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="demolition"
                checked={formData.demolition || false}
                onChange={e => setFormData({ ...formData, demolition: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="demolition" className="text-sm font-medium text-gray-700">
                解体工事あり
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">解体業者</label>
              <input
                type="text"
                value={formData.demolition_contractor || ''}
                onChange={e => setFormData({ ...formData, demolition_contractor: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">解体開始日</label>
              <input
                type="date"
                value={formData.demolition_start_date || ''}
                onChange={e => setFormData({ ...formData, demolition_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">解体完了日</label>
              <input
                type="date"
                value={formData.demolition_completion_date || ''}
                onChange={e => setFormData({ ...formData, demolition_completion_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">土地決済</label>
              <input
                type="date"
                value={formData.land_settlement_date || ''}
                onChange={e => setFormData({ ...formData, land_settlement_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="subdivision"
                checked={formData.subdivision || false}
                onChange={e => setFormData({ ...formData, subdivision: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="subdivision" className="text-sm font-medium text-gray-700">
                分筆あり
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">分筆完了日</label>
              <input
                type="date"
                value={formData.subdivision_completion_date || ''}
                onChange={e => setFormData({ ...formData, subdivision_completion_date: e.target.value })}
                className="prisma-input"
              />
            </div>
          </div>
        )}

        {/* 工事 */}
        {activeTab === 'construction' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">基礎着工日</label>
              <input
                type="date"
                value={formData.foundation_start_date || ''}
                onChange={e => setFormData({ ...formData, foundation_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">上棟日</label>
              <input
                type="date"
                value={formData.roof_raising_date || ''}
                onChange={e => setFormData({ ...formData, roof_raising_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">中間検査</label>
              <input
                type="date"
                value={formData.interim_inspection_date || ''}
                onChange={e => setFormData({ ...formData, interim_inspection_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">完了検査</label>
              <input
                type="date"
                value={formData.completion_inspection_date || ''}
                onChange={e => setFormData({ ...formData, completion_inspection_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">引渡日</label>
              <input
                type="date"
                value={formData.handover_date || ''}
                onChange={e => setFormData({ ...formData, handover_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">外構工事開始日</label>
              <input
                type="date"
                value={formData.exterior_work_start_date || ''}
                onChange={e => setFormData({ ...formData, exterior_work_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">外構工事完了日</label>
              <input
                type="date"
                value={formData.exterior_work_completion_date || ''}
                onChange={e => setFormData({ ...formData, exterior_work_completion_date: e.target.value })}
                className="prisma-input"
              />
            </div>
          </div>
        )}

        {/* 金額 */}
        {activeTab === 'payment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">契約金額</label>
              <input
                type="number"
                value={formData.contract_amount || ''}
                onChange={e => setFormData({ ...formData, contract_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">申込金日付</label>
              <input
                type="date"
                value={formData.application_fee_date || ''}
                onChange={e => setFormData({ ...formData, application_fee_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">申込金金額</label>
              <input
                type="number"
                value={formData.application_fee_amount || ''}
                onChange={e => setFormData({ ...formData, application_fee_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">着工金日付</label>
              <input
                type="date"
                value={formData.construction_start_payment_date || ''}
                onChange={e => setFormData({ ...formData, construction_start_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">着工金金額</label>
              <input
                type="number"
                value={formData.construction_start_payment_amount || ''}
                onChange={e => setFormData({ ...formData, construction_start_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">上棟金日付</label>
              <input
                type="date"
                value={formData.roof_raising_payment_date || ''}
                onChange={e => setFormData({ ...formData, roof_raising_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">上棟金金額</label>
              <input
                type="number"
                value={formData.roof_raising_payment_amount || ''}
                onChange={e => setFormData({ ...formData, roof_raising_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最終金日付</label>
              <input
                type="date"
                value={formData.final_payment_date || ''}
                onChange={e => setFormData({ ...formData, final_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最終金金額</label>
              <input
                type="number"
                value={formData.final_payment_amount || ''}
                onChange={e => setFormData({ ...formData, final_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
          </div>
        )}

        {/* 性能値 */}
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">C値</label>
              <input
                type="number"
                step="0.01"
                value={formData.c_value || ''}
                onChange={e => setFormData({ ...formData, c_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">UA値</label>
              <input
                type="number"
                step="0.01"
                value={formData.ua_value || ''}
                onChange={e => setFormData({ ...formData, ua_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ηAC値</label>
              <input
                type="number"
                step="0.01"
                value={formData.eta_ac_value || ''}
                onChange={e => setFormData({ ...formData, eta_ac_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="zeh_certified"
                checked={formData.zeh_certified || false}
                onChange={e => setFormData({ ...formData, zeh_certified: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="zeh_certified" className="text-sm font-medium text-gray-700">
                ZEH認証
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 保存ボタン（グリッドビューと職種別ビューでは非表示） */}
      {activeTab !== 'grid' && activeTab !== 'position' && (
        <div className="border-t-2 border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="prisma-btn prisma-btn-primary"
          >
            <Save size={16} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      )}
    </div>
  )
}
