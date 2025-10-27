import { useState, useEffect, useRef } from 'react'
import { Project, Employee, Task, Branch } from '../types/database'
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
  onEmployeeUpdate?: () => void
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
  onEmployeeUpdate,
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

  // 担当者フィルター用
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

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

  // 拠点データを取得
  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')

      if (error) {
        console.error('Failed to fetch branches:', error)
      } else if (data) {
        setBranches(data)
      }
    }

    fetchBranches()
  }, [])

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
            className={`px-6 py-3 font-semibold text-base whitespace-nowrap transition-colors ${
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
              <div className="p-6" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                {tasks.length === 0 ? (
                  <div className="prisma-card text-center text-gray-500 font-medium">
                    タスクがありません
                  </div>
                ) : (
                  <div className="space-y-6">
                    {DEPARTMENTS.map((dept, deptIndex) => {
                      const deptTasks = tasks.filter(task => {
                        const taskPosition = task.description?.split(':')[0]?.trim()
                        return dept.positions.includes(taskPosition || '')
                      })

                      if (deptTasks.length === 0) return null

                      return (
                        <div key={dept.name} className="prisma-card">
                          {/* 部門ヘッダー */}
                          <div className={`px-6 py-4 font-bold text-xl ${
                            deptIndex === 0 ? 'bg-blue-100 text-blue-900' :
                            deptIndex === 1 ? 'bg-green-100 text-green-900' :
                            deptIndex === 2 ? 'bg-orange-100 text-orange-900' :
                            'bg-purple-100 text-purple-900'
                          } rounded-t-lg`}>
                            {dept.name}
                          </div>

                          {/* 職種別タスクカード */}
                          <div className="p-6 space-y-4">
                            {dept.positions.map(position => {
                              const positionTasks = deptTasks.filter(task => {
                                const taskPosition = task.description?.split(':')[0]?.trim()
                                return taskPosition === position
                              })

                              if (positionTasks.length === 0) return null

                              return (
                                <div key={position} className="space-y-3">
                                  {/* 職種ラベル */}
                                  <div className="px-4 py-2 bg-gray-100 rounded-lg">
                                    <span className="font-bold text-lg text-gray-900">{position}</span>
                                    <span className="ml-3 text-base text-gray-600">（{positionTasks.length}件）</span>
                                  </div>

                                  {/* タスクカード一覧 */}
                                  <div className="grid grid-cols-1 gap-3">
                                    {positionTasks.map(task => {
                                      const isDelayed = task.due_date &&
                                        task.status !== 'completed' &&
                                        new Date(task.due_date) < new Date()

                                      return (
                                        <div
                                          key={task.id}
                                          onClick={() => onTaskClick && onTaskClick(task)}
                                          className="p-4 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                                        >
                                          <div className="flex items-start justify-between gap-4">
                                            {/* 左側：タスク情報 */}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-2">
                                                <h4 className="text-lg font-bold text-gray-900">{task.title}</h4>
                                                {task.is_date_confirmed && (
                                                  <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-bold text-white bg-green-600 rounded-full" title="日付確定">
                                                    確定
                                                  </span>
                                                )}
                                                {task.original_due_date && task.due_date && task.original_due_date !== task.due_date && (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-bold text-white bg-yellow-500 rounded-full" title={`当初予定から${Math.abs(differenceInDays(new Date(task.due_date), new Date(task.original_due_date)))}日${differenceInDays(new Date(task.due_date), new Date(task.original_due_date)) > 0 ? '後ろ倒し' : '前倒し'}`}>
                                                    <AlertTriangle size={14} />
                                                    変更
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex flex-wrap items-center gap-3 text-base text-gray-600">
                                                <span>
                                                  担当：{task.assigned_employee
                                                    ? `${task.assigned_employee.last_name} ${task.assigned_employee.first_name}`
                                                    : '未割当'
                                                  }
                                                </span>
                                                <span>•</span>
                                                <span>
                                                  期限：{task.due_date
                                                    ? format(new Date(task.due_date), 'M/d (E)', { locale: ja })
                                                    : '未設定'
                                                  }
                                                </span>
                                                <span>•</span>
                                                <span className="font-bold text-blue-700">
                                                  {task.dayFromContract || 0}日目
                                                </span>
                                              </div>
                                            </div>

                                            {/* 右側：ステータス＋操作ボタン */}
                                            <div className="flex items-center gap-3">
                                              <span className={`px-4 py-2 rounded-lg font-bold text-base whitespace-nowrap ${
                                                isDelayed ? 'task-delayed' : getStatusBadgeColor(task.status)
                                              }`}>
                                                {isDelayed ? '遅延' : getStatusText(task.status)}
                                              </span>

                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    onTaskClick && onTaskClick(task)
                                                  }}
                                                  className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                  title="詳細表示"
                                                >
                                                  <Eye size={18} />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    onTaskDelete && onTaskDelete(task.id)
                                                  }}
                                                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                  title="削除"
                                                >
                                                  <Trash2 size={18} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 担当者タブ */}
            {positionSubTab === 'staff' && (
              <div className="p-4" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                {/* 拠点選択（細い罫線） */}
                <div className="mb-3 flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-300">
                  <label className="text-base font-bold text-gray-700 whitespace-nowrap">
                    拠点:
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="prisma-select flex-1"
                    style={{ maxWidth: '300px' }}
                  >
                    <option value="all">すべての拠点</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2列グリッドレイアウト（罫線を細く） */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {DEPARTMENTS.map((dept) => (
                    <div key={dept.name} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-300">
                      {/* 部門ヘッダー（罫線なし） */}
                      <div className={`px-3 py-2 font-bold text-base ${
                        dept.name === '営業部' ? 'bg-blue-100 text-blue-900' :
                        dept.name === '設計部' ? 'bg-green-100 text-green-900' :
                        dept.name === '工事部' ? 'bg-orange-100 text-orange-900' :
                        'bg-purple-100 text-purple-900'
                      }`}>
                        {dept.name}
                      </div>
                      {/* 職種リスト（罫線なし・シャドウのみ） */}
                      <div className="p-3 space-y-2">
                        {dept.positions.map((position) => {
                          const employee = employees.find(emp => emp.department === position)
                          return (
                            <div key={position} className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                              <div className="text-base font-bold text-gray-900 mb-1">{position}</div>
                              <select
                                value={employee?.id || ''}
                                onChange={async (e) => {
                                  const newEmployeeId = e.target.value

                                  try {
                                    // 空文字が選択された場合（未割当）
                                    if (!newEmployeeId) {
                                      if (employee) {
                                        await supabase
                                          .from('employees')
                                          .update({ department: 'その他' })
                                          .eq('id', employee.id)

                                        showToast('担当者を解除しました', 'success')
                                        if (onEmployeeUpdate) {
                                          onEmployeeUpdate()
                                        }
                                      }
                                      return
                                    }

                                    // 新しい従業員を取得（既に他のポジションに割り当てられているか確認）
                                    const newEmployee = employees.find(emp => emp.id === newEmployeeId)

                                    // 現在このポジションに割り当てられている従業員をクリア
                                    if (employee && employee.id !== newEmployeeId) {
                                      await supabase
                                        .from('employees')
                                        .update({ department: 'その他' })
                                        .eq('id', employee.id)
                                    }

                                    // 新しい担当者のdepartmentを更新
                                    const { error } = await supabase
                                      .from('employees')
                                      .update({ department: position })
                                      .eq('id', newEmployeeId)

                                    if (error) throw error

                                    showToast('担当者を設定しました', 'success')
                                    // 従業員データのみを再読み込み（ページ遷移を防ぐ）
                                    if (onEmployeeUpdate) {
                                      onEmployeeUpdate()
                                    }
                                  } catch (error) {
                                    console.error('Failed to update employee:', error)
                                    showToast('設定に失敗しました', 'error')
                                  }
                                }}
                                className="prisma-select w-full"
                              >
                                <option value="">未割当</option>
                                {employees
                                  .filter(emp => selectedBranchId === 'all' || emp.branch_id === selectedBranchId)
                                  .map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.last_name} {emp.first_name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 基本情報 */}
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">契約番号</label>
              <input
                type="text"
                value={formData.contract_number || ''}
                onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">建設地（住所）</label>
              <input
                type="text"
                value={formData.construction_address || ''}
                onChange={e => setFormData({ ...formData, construction_address: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">地番</label>
              <input
                type="text"
                value={formData.lot_number || ''}
                onChange={e => setFormData({ ...formData, lot_number: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">階数</label>
              <input
                type="number"
                value={formData.floors || ''}
                onChange={e => setFormData({ ...formData, floors: parseInt(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">坪数（施工）</label>
              <input
                type="number"
                step="0.01"
                value={formData.construction_area || ''}
                onChange={e => setFormData({ ...formData, construction_area: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-base font-semibold text-gray-700 mb-2">進捗状況（問題点・アクションプラン）</label>
              <textarea
                value={formData.progress_status || ''}
                onChange={e => setFormData({ ...formData, progress_status: e.target.value })}
                rows={3}
                className="prisma-input resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-base font-semibold text-gray-700 mb-2">備考（お客様個別情報・注意点）</label>
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
              <label className="block text-base font-semibold text-gray-700 mb-2">設計ヒアリング</label>
              <input
                type="date"
                value={formData.design_hearing_date || ''}
                onChange={e => setFormData({ ...formData, design_hearing_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">プラン確定</label>
              <input
                type="date"
                value={formData.plan_finalized_date || ''}
                onChange={e => setFormData({ ...formData, plan_finalized_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">資金計画書送付</label>
              <input
                type="date"
                value={formData.plan_financial_sent_date || ''}
                onChange={e => setFormData({ ...formData, plan_financial_sent_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">構造GO</label>
              <input
                type="date"
                value={formData.structure_go_date || ''}
                onChange={e => setFormData({ ...formData, structure_go_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">申請GO</label>
              <input
                type="date"
                value={formData.application_go_date || ''}
                onChange={e => setFormData({ ...formData, application_go_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">最終打合</label>
              <input
                type="date"
                value={formData.final_meeting_date || ''}
                onChange={e => setFormData({ ...formData, final_meeting_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">図面UP</label>
              <input
                type="date"
                value={formData.drawing_upload_date || ''}
                onChange={e => setFormData({ ...formData, drawing_upload_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">着工許可</label>
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
              <label htmlFor="long_term_loan" className="text-base font-medium text-gray-700">
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
              <label htmlFor="flat_loan" className="text-base font-medium text-gray-700">
                フラット融資
              </label>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">銀行名</label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">補助金種別</label>
              <input
                type="text"
                value={formData.subsidy_type || ''}
                onChange={e => setFormData({ ...formData, subsidy_type: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-base font-semibold text-gray-700 mb-2">長期要件</label>
              <textarea
                value={formData.long_term_requirements || ''}
                onChange={e => setFormData({ ...formData, long_term_requirements: e.target.value })}
                rows={2}
                className="prisma-input resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-base font-semibold text-gray-700 mb-2">GX要件</label>
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
              <label htmlFor="demolition" className="text-base font-medium text-gray-700">
                解体工事あり
              </label>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">解体業者</label>
              <input
                type="text"
                value={formData.demolition_contractor || ''}
                onChange={e => setFormData({ ...formData, demolition_contractor: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">解体開始日</label>
              <input
                type="date"
                value={formData.demolition_start_date || ''}
                onChange={e => setFormData({ ...formData, demolition_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">解体完了日</label>
              <input
                type="date"
                value={formData.demolition_completion_date || ''}
                onChange={e => setFormData({ ...formData, demolition_completion_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">土地決済</label>
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
              <label htmlFor="subdivision" className="text-base font-medium text-gray-700">
                分筆あり
              </label>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">分筆完了日</label>
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
              <label className="block text-base font-semibold text-gray-700 mb-2">基礎着工日</label>
              <input
                type="date"
                value={formData.foundation_start_date || ''}
                onChange={e => setFormData({ ...formData, foundation_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">上棟日</label>
              <input
                type="date"
                value={formData.roof_raising_date || ''}
                onChange={e => setFormData({ ...formData, roof_raising_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">中間検査</label>
              <input
                type="date"
                value={formData.interim_inspection_date || ''}
                onChange={e => setFormData({ ...formData, interim_inspection_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">完了検査</label>
              <input
                type="date"
                value={formData.completion_inspection_date || ''}
                onChange={e => setFormData({ ...formData, completion_inspection_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">引渡日</label>
              <input
                type="date"
                value={formData.handover_date || ''}
                onChange={e => setFormData({ ...formData, handover_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">外構工事開始日</label>
              <input
                type="date"
                value={formData.exterior_work_start_date || ''}
                onChange={e => setFormData({ ...formData, exterior_work_start_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">外構工事完了日</label>
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
              <label className="block text-base font-semibold text-gray-700 mb-2">契約金額</label>
              <input
                type="number"
                value={formData.contract_amount || ''}
                onChange={e => setFormData({ ...formData, contract_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">申込金日付</label>
              <input
                type="date"
                value={formData.application_fee_date || ''}
                onChange={e => setFormData({ ...formData, application_fee_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">申込金金額</label>
              <input
                type="number"
                value={formData.application_fee_amount || ''}
                onChange={e => setFormData({ ...formData, application_fee_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">着工金日付</label>
              <input
                type="date"
                value={formData.construction_start_payment_date || ''}
                onChange={e => setFormData({ ...formData, construction_start_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">着工金金額</label>
              <input
                type="number"
                value={formData.construction_start_payment_amount || ''}
                onChange={e => setFormData({ ...formData, construction_start_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">上棟金日付</label>
              <input
                type="date"
                value={formData.roof_raising_payment_date || ''}
                onChange={e => setFormData({ ...formData, roof_raising_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">上棟金金額</label>
              <input
                type="number"
                value={formData.roof_raising_payment_amount || ''}
                onChange={e => setFormData({ ...formData, roof_raising_payment_amount: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
                placeholder="¥"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">最終金日付</label>
              <input
                type="date"
                value={formData.final_payment_date || ''}
                onChange={e => setFormData({ ...formData, final_payment_date: e.target.value })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">最終金金額</label>
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
              <label className="block text-base font-semibold text-gray-700 mb-2">C値</label>
              <input
                type="number"
                step="0.01"
                value={formData.c_value || ''}
                onChange={e => setFormData({ ...formData, c_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">UA値</label>
              <input
                type="number"
                step="0.01"
                value={formData.ua_value || ''}
                onChange={e => setFormData({ ...formData, ua_value: parseFloat(e.target.value) || undefined })}
                className="prisma-input"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">ηAC値</label>
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
              <label htmlFor="zeh_certified" className="text-base font-medium text-gray-700">
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
