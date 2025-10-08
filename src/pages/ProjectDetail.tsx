import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { HelpCircle } from 'lucide-react'

interface ProjectWithRelations extends Project {
  customer: Customer
  sales: Employee
  design: Employee
  construction: Employee
}

interface TaskWithPosition extends Task {
  position?: string
  dayFromContract?: number
}

// 部門と職種の定義
const DEPARTMENTS = [
  {
    name: '営業部',
    positions: ['営業', '営業事務', 'ローン事務']
  },
  {
    name: '設計部',
    positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計']
  },
  {
    name: '工事部',
    positions: ['工事', '工事事務', '積算・発注']
  },
  {
    name: '外構事業部',
    positions: ['外構設計', '外構工事']
  }
]

const ALL_POSITIONS = DEPARTMENTS.flatMap(d => d.positions)

// 職種の説明マップ（初心者向け）
const POSITION_DESCRIPTIONS: Record<string, string> = {
  '営業': '顧客との窓口を担当。契約から引き渡しまでサポート。',
  '営業事務': '営業のサポート業務。書類作成や顧客対応。',
  'ローン事務': '住宅ローンの手続きをサポート。',
  '意匠設計': '建物の外観・内装のデザインを担当。',
  'IC': 'インテリアコーディネーター。室内装飾の専門家。',
  '実施設計': '施工に必要な詳細図面を作成。',
  '構造設計': '建物の骨組み（構造）を設計。安全性を確保。',
  '申請設計': '建築確認申請などの手続きを担当。',
  '工事': '現場での施工管理を担当。',
  '工事事務': '工事に関する事務作業。発注や書類管理。',
  '積算・発注': '材料の数量計算と業者への発注を担当。',
  '外構設計': '庭や駐車場などの外回りを設計。',
  '外構工事': '外構の施工を担当。'
}

// 今日が契約日から何日目かを計算
const getTodayFromContract = (contractDate: string): number => {
  return differenceInDays(new Date(), new Date(contractDate))
}

// 年度を計算（8月1日～翌年7月31日）
const getFiscalYear = (date: Date): number => {
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  return month >= 8 ? year : year - 1
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectWithRelations | null>(null)
  const [tasks, setTasks] = useState<TaskWithPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithPosition | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedDueDate, setEditedDueDate] = useState('')
  const [editedActualDate, setEditedActualDate] = useState('')
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    position: '営業',
    due_date: '',
    assigned_to: ''
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showGuide, setShowGuide] = useState(true) // グリッド説明の表示状態
  const todayRowRef = useRef<HTMLDivElement>(null) // 今日の行への参照

  useEffect(() => {
    loadProjectData()
    loadEmployees()
  }, [id])

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name')

    if (!error && data) {
      setEmployees(data as Employee[])
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'not_started' | 'requested' | 'completed') => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (!error) {
      // Update local state
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus })
      }
      alert('ステータスを更新しました')
    } else {
      alert('ステータスの更新に失敗しました')
    }
  }

  const handleUpdateTaskDates = async () => {
    if (!selectedTask) return

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (editedDueDate) {
      updateData.due_date = editedDueDate
    }

    if (editedActualDate) {
      updateData.actual_completion_date = editedActualDate
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', selectedTask.id)

    if (!error) {
      await loadProjectData()
      setEditMode(false)
      setSelectedTask(null)
      alert('日付を更新しました')
    } else {
      alert('日付の更新に失敗しました: ' + error.message)
    }
  }

  const handleAddTask = async () => {
    if (!project || !newTask.title || !newTask.due_date) {
      alert('タスク名と期限は必須です')
      return
    }

    const taskData = {
      project_id: id,
      title: newTask.title,
      description: `${newTask.position}: ${newTask.description || newTask.title}`,
      assigned_to: newTask.assigned_to || null,
      due_date: newTask.due_date,
      status: 'not_started',
      priority: 'medium'
    }

    const { error } = await supabase
      .from('tasks')
      .insert([taskData])

    if (error) {
      alert('タスクの追加に失敗しました: ' + error.message)
    } else {
      await loadProjectData()
      setShowTaskModal(false)
      setNewTask({
        title: '',
        description: '',
        position: '営業',
        due_date: '',
        assigned_to: ''
      })
    }
  }

  const loadProjectData = async () => {
    try {
      setLoading(true)

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:assigned_sales(id, name, department),
          design:assigned_design(id, name, department),
          construction:assigned_construction(id, name, department)
        `)
        .eq('id', id)
        .single()

      if (projectError) throw projectError

      setProject(projectData as unknown as ProjectWithRelations)

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)

      if (tasksError) throw tasksError

      const tasksWithDays = (tasksData || []).map((task: Task) => {
        const dayFromContract = task.due_date && projectData.contract_date
          ? differenceInDays(new Date(task.due_date), new Date(projectData.contract_date))
          : 0

        return {
          ...task,
          dayFromContract
        }
      })

      setTasks(tasksWithDays)
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTasksForPositionAndDay = (position: string, day: number): TaskWithPosition[] => {
    return tasks.filter(task => {
      const descriptionParts = task.description?.split(':')
      const taskPosition = descriptionParts?.[0]?.trim()

      return task.dayFromContract === day && taskPosition === position
    })
  }

  // 職種ごとの担当者を取得
  const getEmployeeByPosition = (position: string): Employee | undefined => {
    return employees.find(emp => emp.department === position)
  }

  // 職種ごとの完遂率を計算
  const getCompletionRateByPosition = (position: string): number => {
    const positionTasks = tasks.filter(task => {
      const descriptionParts = task.description?.split(':')
      const taskPosition = descriptionParts?.[0]?.trim()
      return taskPosition === position
    })

    if (positionTasks.length === 0) return 0

    const completedTasks = positionTasks.filter(task => task.status === 'completed')
    return Math.round((completedTasks.length / positionTasks.length) * 100)
  }

  // 今日の行へスクロール
  const scrollToToday = () => {
    if (todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">案件が見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-blue-light no-x-scroll pc-fit">
      <div className="container mx-auto p-6 no-x-scroll">
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-pastel border border-pastel-blue hover:bg-pastel-blue-light transition-all duration-200 font-medium"
          >
            ← 案件一覧に戻る
          </button>

          {/* タスクステータス凡例 */}
          <div className="bg-white rounded-xl shadow-pastel p-4 mb-4 border-2 border-gray-200">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="font-bold text-gray-900">タスクステータス:</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 task-not-started rounded"></div>
                <span className="text-sm text-gray-700">○ 未着手（赤）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 task-in-progress rounded"></div>
                <span className="text-sm text-gray-700">● 着手中（黄）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 task-completed rounded"></div>
                <span className="text-sm text-gray-700">✓ 完了（青）</span>
              </div>
            </div>
          </div>

          {/* グリッドの見方説明（初心者向け） */}
          {showGuide && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-lg shadow-pastel">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <HelpCircle className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-sm text-blue-900 font-bold mb-2">📘 タスク管理グリッドの見方</p>
                    <ul className="text-xs text-blue-800 space-y-1.5 ml-2">
                      <li>• <strong>縦軸（日付）:</strong> 契約日から何日目かを表示（0日目〜365日目）</li>
                      <li>• <strong>横軸（職種）:</strong> 営業、設計、工事など13種類の職種</li>
                      <li>• <strong>セル内のタスク:</strong> クリックすると詳細情報が見れます</li>
                      <li>• <strong>赤い太線:</strong> 今日の位置を示しています</li>
                      <li>• <strong>職種名にマウスを乗せると:</strong> 詳しい説明が表示されます</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2"
                >
                  ✕ 閉じる
                </button>
              </div>
            </div>
          )}

          {/* 今日へジャンプボタン */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={scrollToToday}
              className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-pastel hover:bg-red-600 transition-all duration-200 font-bold text-sm flex items-center gap-2"
            >
              📍 今日の位置へジャンプ
            </button>
            {!showGuide && (
              <button
                onClick={() => setShowGuide(true)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg shadow-pastel hover:bg-blue-200 transition-all duration-200 font-medium text-sm flex items-center gap-2"
              >
                <HelpCircle size={16} />
                グリッドの見方を表示
              </button>
            )}
          </div>

          {/* プロジェクト情報カード */}
          <div className="bg-white rounded-xl shadow-pastel-lg border-2 border-gray-300 overflow-hidden">
            <div className="bg-gradient-pastel-blue p-6 text-pastel-blue-dark">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-3">
                    {project.customer?.names?.join('・') || '顧客名なし'}様邸
                  </h1>
                  <div className="flex flex-wrap items-center gap-6 text-xl text-blue-800">
                    <span>📅 {format(new Date(project.contract_date), 'yyyy/MM/dd')}</span>
                    <span>📍 {project.customer?.building_site || '-'}</span>
                  </div>
                </div>
                <span className={`px-5 py-3 rounded-full text-lg font-bold shadow-pastel ${
                  project.status === 'pre_contract' ? 'bg-white text-gray-800' :
                  project.status === 'post_contract' ? 'bg-pastel-blue text-pastel-blue-dark' :
                  project.status === 'construction' ? 'bg-pastel-orange text-pastel-orange-dark' :
                  'bg-pastel-green text-pastel-green-dark'
                }`}>
                  {project.status === 'pre_contract' ? '契約前' :
                   project.status === 'post_contract' ? '契約後' :
                   project.status === 'construction' ? '着工後' : '完了'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-gray-300">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="compact-text font-semibold text-gray-700">タスク:</span>
                    <span className="text-lg font-bold text-gray-900">{tasks.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="compact-text text-pastel-green-dark">✓</span>
                    <span className="text-sm font-bold text-pastel-green-dark">{tasks.filter(t => t.status === 'completed').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="compact-text text-pastel-blue-dark">●</span>
                    <span className="text-sm font-bold text-pastel-blue-dark">{tasks.filter(t => t.status === 'requested').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="compact-text text-gray-600">○</span>
                    <span className="text-sm font-bold text-gray-600">{tasks.filter(t => t.status === 'not_started').length}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="px-4 py-2 bg-gradient-pastel-blue text-pastel-blue-dark rounded-lg hover:shadow-pastel-lg transition-all duration-200 font-bold compact-text shadow-pastel touch-target"
                >
                  ➕ タスク追加
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* タスク管理グリッド */}
        <div className="bg-white shadow-pastel-lg rounded-xl border-2 border-gray-300" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <div className="overflow-x-auto overflow-y-auto rounded-xl" style={{ scrollbarWidth: 'thin', maxHeight: 'calc(100vh - 350px)' }}>
            <div className="inline-block" style={{ minWidth: '100%' }}>
              {/* 部門ヘッダー */}
              <div className="flex border-b-2 border-gray-300 sticky top-0 z-30 bg-white">
                <div className="w-28 flex-shrink-0 border-r-2 border-gray-300 p-4 text-center font-bold text-base text-gray-800 bg-white">
                  日付
                </div>
                <div className="w-24 flex-shrink-0 border-r-2 border-gray-300 p-4 text-center font-bold text-base text-gray-800 bg-white">
                  経過日数
                </div>
                {DEPARTMENTS.map((dept, index) => (
                  <div
                    key={dept.name}
                    className={`text-center py-3 px-1 font-bold text-base min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${
                      index === 0 ? 'bg-gradient-pastel-blue text-pastel-blue-dark' :
                      index === 1 ? 'bg-gradient-pastel-green text-pastel-green-dark' :
                      index === 2 ? 'bg-gradient-pastel-orange text-pastel-orange-dark' :
                      'bg-pastel-teal text-gray-800'
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

              {/* 職種ヘッダー（担当者名と完遂率付き） */}
              <div className="flex border-b-2 border-gray-300 bg-white sticky z-20 shadow-pastel" style={{ top: '60px' }}>
                <div className="w-28 flex-shrink-0 border-r-2 border-gray-300 p-4 text-center font-bold text-base bg-pastel-blue-light text-gray-800">
                  日付
                </div>
                <div className="w-24 flex-shrink-0 border-r-2 border-gray-300 p-4 text-center font-bold text-base bg-pastel-blue-light text-gray-800">
                  日
                </div>
                {ALL_POSITIONS.map((position) => {
                  const employee = getEmployeeByPosition(position)
                  const completionRate = getCompletionRateByPosition(position)
                  const positionDescription = POSITION_DESCRIPTIONS[position] || position
                  return (
                    <div
                      key={position}
                      className="border-r-2 border-gray-300 p-2 text-center bg-white min-w-0 overflow-hidden"
                      style={{ flex: '1 1 0%', minWidth: '80px' }}
                      title={positionDescription}
                    >
                      <div className="font-bold text-xs text-gray-800 mb-1 truncate cursor-help">{position}</div>
                      <div className="text-xs text-gray-600 mb-1 truncate" title={employee ? employee.name : '未割当'}>
                        {employee ? employee.name : '未割当'}
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-0">
                          <div
                            className="bg-gradient-pastel-green h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-pastel-green-dark whitespace-nowrap">{completionRate}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* グリッドボディ */}
              <div>
                {Array.from({ length: 366 }, (_, index) => index).map((day) => {
                  const hasTask = tasks.some(t => t.dayFromContract === day)
                  const currentDate = project ? addDays(new Date(project.contract_date), day) : new Date()
                  const todayDay = project ? getTodayFromContract(project.contract_date) : -1
                  const isToday = day === todayDay
                  const fiscalYear = getFiscalYear(currentDate) // 年度計算（data属性に保存、表示なし）
                  return (
                    <div
                      key={day}
                      ref={isToday ? todayRowRef : null}
                      data-fiscal-year={fiscalYear}
                      className={`flex border-b border-gray-300 transition-colors duration-150 ${
                        day % 2 === 0 ? 'bg-white' : 'bg-pastel-blue-light'
                      } ${hasTask ? 'hover:bg-pastel-green-light' : 'hover:bg-pastel-blue-light'}`}
                      style={isToday ? {
                        borderTop: '6px solid #dc2626',
                        backgroundColor: '#fef2f2'
                      } : {}}
                    >
                      <div className={`w-28 flex-shrink-0 border-r-2 border-gray-300 p-4 text-center text-sm font-bold ${
                        hasTask ? 'text-pastel-blue-dark bg-pastel-blue-light' : 'text-gray-700 bg-white'
                      }`}>
                        {format(currentDate, 'MM/dd (E)', { locale: ja })}
                      </div>

                      <div className={`w-24 flex-shrink-0 border-r-2 border-gray-300 p-4 text-center text-sm font-bold ${
                        hasTask ? 'text-pastel-blue-dark bg-pastel-blue-light' : 'text-gray-600 bg-white'
                      }`}>
                        {day}
                      </div>

                      {ALL_POSITIONS.map((position) => {
                        const cellTasks = getTasksForPositionAndDay(position, day)
                        return (
                          <div
                            key={`${day}-${position}`}
                            className="border border-gray-300 p-2 min-h-14 transition-colors duration-150 flex flex-col items-center justify-center gap-1 min-w-0 overflow-hidden"
                            style={{ flex: '1 1 0%', minWidth: '80px' }}
                          >
                            {cellTasks.map((task) => {
                              const statusClass =
                                task.status === 'completed' ? 'task-completed' :
                                task.status === 'requested' ? 'task-in-progress' :
                                'task-not-started'

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => setSelectedTask(task)}
                                  className={`text-xs rounded-lg px-2 py-1.5 truncate cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 min-w-0 max-w-full ${statusClass}`}
                                  title={task.title}
                                >
                                  {task.title}
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

        {/* タスク追加モーダル */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-pastel-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">新しいタスクを追加</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タスク名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full border border-pastel-blue rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
                    placeholder="例: 初回面談"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    職種 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTask.position}
                    onChange={(e) => setNewTask({ ...newTask, position: e.target.value })}
                    className="w-full border border-pastel-blue rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
                  >
                    {ALL_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    期限 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full border border-pastel-blue rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    担当者
                  </label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full border border-pastel-blue rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
                  >
                    <option value="">未割り当て</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    詳細
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full border border-pastel-blue rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
                    rows={3}
                    placeholder="タスクの詳細説明（任意）"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setNewTask({
                      title: '',
                      description: '',
                      position: '営業',
                      due_date: '',
                      assigned_to: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-pastel-blue-light transition-colors duration-200 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddTask}
                  className="flex-1 px-4 py-2 bg-gradient-pastel-blue text-pastel-blue-dark rounded-lg hover:shadow-pastel-lg transition-colors duration-200 font-medium"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* タスク詳細モーダル（CSS強化版） */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-pastel-lg p-4 sm:p-6 w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-pastel-blue">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
                <button
                  onClick={() => {
                    setSelectedTask(null)
                    setEditMode(false)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none touch-target"
                >
                  ×
                </button>
              </div>

              {/* ステータス変更ボタン */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3">ステータス</h3>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                    className={`px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 ${
                      selectedTask.status === 'not_started'
                        ? 'bg-red-500 shadow-lg scale-105'
                        : 'bg-red-300 hover:bg-red-400'
                    }`}
                  >
                    ○ 未着手
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                    className={`px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 ${
                      selectedTask.status === 'requested'
                        ? 'bg-yellow-500 shadow-lg scale-105'
                        : 'bg-yellow-300 hover:bg-yellow-400'
                    }`}
                  >
                    ● 着手中
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    className={`px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 ${
                      selectedTask.status === 'completed'
                        ? 'bg-blue-500 shadow-lg scale-105'
                        : 'bg-blue-300 hover:bg-blue-400'
                    }`}
                  >
                    ✓ 完了
                  </button>
                </div>
              </div>

              {/* 日付管理セクション */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">日付管理</h3>
                  {!editMode && (
                    <button
                      onClick={() => {
                        setEditMode(true)
                        setEditedDueDate(selectedTask.due_date || '')
                        setEditedActualDate(selectedTask.actual_completion_date || '')
                      }}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                    >
                      編集
                    </button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        期限日
                      </label>
                      <input
                        type="date"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        実際の完了日
                      </label>
                      <input
                        type="date"
                        value={editedActualDate}
                        onChange={(e) => setEditedActualDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleUpdateTaskDates}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false)
                          setEditedDueDate('')
                          setEditedActualDate('')
                        }}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-semibold">期限日:</span>
                      <span className="font-bold text-gray-900">
                        {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'yyyy/MM/dd (E)', { locale: ja }) : '未設定'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-semibold">実際の完了日:</span>
                      <span className="font-bold text-gray-900">
                        {selectedTask.actual_completion_date ? format(new Date(selectedTask.actual_completion_date), 'yyyy/MM/dd (E)', { locale: ja }) : '未設定'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 作業内容 */}
              <div className="modal-section bg-pastel-blue-light border-pastel-blue">
                <div className="modal-section-header text-pastel-blue-dark">
                  <span className="text-xl">📋</span>
                  <span>作業内容</span>
                </div>
                <div className="modal-section-content">
                  {selectedTask.description || 'なし'}
                </div>
              </div>

              {/* Do's */}
              <div className="modal-section bg-pastel-green-light border-pastel-green">
                <div className="modal-section-header text-pastel-green-dark">
                  <span className="text-xl">✓</span>
                  <span>Do's（やるべきこと）</span>
                </div>
                <div className="modal-section-content whitespace-pre-wrap">
                  {selectedTask.dos || '設定されていません'}
                </div>
              </div>

              {/* Don'ts */}
              <div className="modal-section bg-red-50 border-red-300">
                <div className="modal-section-header text-red-600">
                  <span className="text-xl">✗</span>
                  <span>Don'ts（やってはいけないこと）</span>
                </div>
                <div className="modal-section-content whitespace-pre-wrap">
                  {selectedTask.donts || '設定されていません'}
                </div>
              </div>

              {/* マニュアル */}
              <div className="modal-section bg-pastel-purple border-gray-300">
                <div className="modal-section-header text-gray-700">
                  <span className="text-xl">📄</span>
                  <span>マニュアル</span>
                </div>
                <div className="modal-section-content">
                  {selectedTask.manual_url ? (
                    <a
                      href={selectedTask.manual_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium touch-target"
                    >
                      <span>📎</span>
                      <span>マニュアルを開く</span>
                    </a>
                  ) : (
                    <p className="text-gray-500">設定されていません</p>
                  )}
                </div>
              </div>

              {/* 動画 */}
              <div className="modal-section bg-pastel-pink border-gray-300">
                <div className="modal-section-header text-gray-700">
                  <span className="text-xl">🎥</span>
                  <span>動画</span>
                </div>
                <div className="modal-section-content">
                  {selectedTask.video_url ? (
                    <a
                      href={selectedTask.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium touch-target"
                    >
                      <span>▶</span>
                      <span>動画を見る</span>
                    </a>
                  ) : (
                    <p className="text-gray-500">設定されていません</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-pastel-blue">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-full px-4 py-3 bg-gradient-pastel-blue text-pastel-blue-dark rounded-lg hover:shadow-pastel-lg transition-all duration-200 font-bold text-base touch-target"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
