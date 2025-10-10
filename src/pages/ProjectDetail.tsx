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
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [editingActualDate, setEditingActualDate] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    position: '営業',
    due_date: '',
    assigned_to: ''
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showGuide, setShowGuide] = useState(false) // グリッド説明の表示状態（デフォルトで非表示）
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

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'not_started' | 'requested' | 'delayed' | 'completed') => {
    try {
      // 即座にUIを更新（暗転を防ぐ）
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          status: newStatus
        })
      }

      // タスクリストも即座に更新
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      )

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)

      if (error) {
        console.error('Supabase error:', error)
        alert(`ステータスの更新に失敗しました: ${error.message}`)
        // エラーの場合は再読み込みして元に戻す
        await loadProjectData(false)
      }
      // 成功した場合はバックグラウンドで再読み込み（awaitしない、ローディング表示なし）
      else {
        loadProjectData(false)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert(`予期しないエラーが発生しました: ${err}`)
      // エラーの場合は再読み込み
      await loadProjectData(false)
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

  const handleUpdateDueDate = async (newDate: string) => {
    if (!selectedTask) return

    // 即座にUIを更新（暗転を防ぐ）
    setSelectedTask({ ...selectedTask, due_date: newDate })
    setEditingDueDate(false)

    // タスクリストも即座に更新
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === selectedTask.id ? { ...t, due_date: newDate } : t
      )
    )

    const { error } = await supabase
      .from('tasks')
      .update({
        due_date: newDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedTask.id)

    if (error) {
      alert('期限日の更新に失敗しました: ' + error.message)
      // エラーの場合は再読み込み
      await loadProjectData(false)
    } else {
      // 成功した場合はバックグラウンドで再読み込み（ローディング表示なし）
      loadProjectData(false)
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

  const loadProjectData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

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
      if (showLoading) {
        setLoading(false)
      }
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

  // セルダブルクリックでタスク追加モーダルを開く
  const handleCellDoubleClick = (position: string, day: number) => {
    if (!project) return

    // 契約日からday日後の日付を計算
    const dueDate = format(addDays(new Date(project.contract_date), day), 'yyyy-MM-dd')

    setNewTask({
      title: '',
      description: '',
      position: position,
      due_date: dueDate,
      assigned_to: ''
    })
    setShowTaskModal(true)
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
        <div className="mb-3">
          <button
            onClick={() => navigate('/projects')}
            className="mb-2 px-3 py-1.5 bg-white text-gray-700 rounded-lg shadow-sm border border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
          >
            ← 案件一覧に戻る
          </button>

          {/* コンパクトなプロジェクト情報カード */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">
                    {project.customer?.names?.join('・') || '顧客名なし'}様邸
                  </h1>
                  <span className="text-xs text-gray-600">
                    {format(new Date(project.contract_date), 'yyyy/MM/dd')}
                  </span>
                  <span className="text-xs text-gray-600">
                    {project.customer?.building_site || '-'}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  project.status === 'pre_contract' ? 'bg-white text-gray-800' :
                  project.status === 'post_contract' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'construction' ? 'bg-orange-100 text-orange-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {project.status === 'pre_contract' ? '契約前' :
                   project.status === 'post_contract' ? '契約後' :
                   project.status === 'construction' ? '着工後' : '完了'}
                </span>
              </div>
            </div>

            <div className="px-3 py-2 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">タスク: <strong>{tasks.length}</strong></span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 task-not-started rounded"></span>
                    <strong>{tasks.filter(t => t.status === 'not_started').length}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 task-in-progress rounded"></span>
                    <strong>{tasks.filter(t => t.status === 'requested').length}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 task-completed rounded"></span>
                    <strong>{tasks.filter(t => t.status === 'completed').length}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={scrollToToday}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition-all"
                  >
                    今日
                  </button>
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-all flex items-center gap-1"
                  >
                    <HelpCircle size={12} />
                    ?
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* グリッドの見方説明（コンパクト版） */}
          {showGuide && (
            <div className="bg-blue-50 border-l-2 border-blue-500 p-2 mb-2 rounded text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-blue-900 mb-1">使い方</p>
                  <ul className="text-blue-800 space-y-0.5 ml-2">
                    <li>• タスククリック → 詳細表示</li>
                    <li>• セルダブルクリック → タスク追加</li>
                    <li>• 縦軸：契約日からの日数 / 横軸：職種</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium ml-2"
                >
                  ×
                </button>
              </div>
            </div>
          )}
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
                            className="border border-gray-300 p-2 min-h-14 transition-colors duration-150 flex flex-col items-center justify-center gap-1 min-w-0 overflow-hidden cursor-pointer hover:bg-gray-100"
                            style={{ flex: '1 1 0%', minWidth: '80px' }}
                            onDoubleClick={() => handleCellDoubleClick(position, day)}
                            title="ダブルクリックでタスク追加"
                          >
                            {cellTasks.map((task) => {
                              const statusClass =
                                task.status === 'completed' ? 'task-completed' :
                                task.status === 'requested' ? 'task-in-progress' :
                                task.status === 'delayed' ? 'task-delayed' :
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[95vw] max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-4 border-blue-300">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
                <button
                  onClick={() => {
                    setSelectedTask(null)
                    setEditMode(false)
                    setEditingDueDate(false)
                    setEditingActualDate(false)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none touch-target"
                >
                  ×
                </button>
              </div>

              {/* ステータス変更ボタン - ユニバーサルデザイン */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  ステータス
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'not_started')}
                    className={`px-3 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 hover:scale-105 ${
                      selectedTask.status === 'not_started'
                        ? 'bg-gray-500 text-white shadow-lg border-gray-700'
                        : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-400 shadow-sm'
                    }`}
                  >
                    ⚫ 未着手
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'requested')}
                    className={`px-3 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 hover:scale-105 ${
                      selectedTask.status === 'requested'
                        ? 'bg-yellow-400 text-gray-900 shadow-lg border-yellow-600'
                        : 'bg-white text-yellow-900 hover:bg-yellow-50 border-yellow-400 shadow-sm'
                    }`}
                  >
                    🟡 着手中
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'delayed')}
                    className={`px-3 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 hover:scale-105 ${
                      selectedTask.status === 'delayed'
                        ? 'bg-red-500 text-white shadow-lg border-red-700'
                        : 'bg-white text-red-900 hover:bg-red-50 border-red-400 shadow-sm'
                    }`}
                  >
                    🔴 遅れ
                  </button>
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    className={`px-3 py-3 rounded-lg font-bold text-base transition-all duration-200 border-2 hover:scale-105 ${
                      selectedTask.status === 'completed'
                        ? 'bg-blue-500 text-white shadow-lg border-blue-700'
                        : 'bg-white text-blue-900 hover:bg-blue-50 border-blue-400 shadow-sm'
                    }`}
                  >
                    🔵 完了
                  </button>
                </div>
              </div>

              {/* 期限日カード */}
              <div className="mb-3">
                <div
                  onClick={() => setEditingDueDate(true)}
                  className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 border-3 border-blue-500 shadow-md hover:shadow-2xl hover:scale-105 transition-all cursor-pointer max-w-md mx-auto"
                >
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-900 mb-2">期限日</div>
                    {editingDueDate ? (
                      <input
                        type="date"
                        value={selectedTask.due_date || ''}
                        onChange={(e) => handleUpdateDueDate(e.target.value)}
                        onBlur={() => setEditingDueDate(false)}
                        autoFocus
                        className="w-full text-center text-lg font-bold border-2 border-blue-500 rounded p-2"
                      />
                    ) : (
                      <>
                        <div className="text-2xl font-black text-blue-900">
                          {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'M/d', { locale: ja }) : '未設定'}
                        </div>
                        {selectedTask.due_date && (
                          <div className="text-xs text-blue-700 mt-1">
                            {format(new Date(selectedTask.due_date), '(E)', { locale: ja })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* マニュアル・動画カード (2行目) */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* マニュアルカード */}
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 border-3 border-purple-500 shadow-md hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
                  <div className="text-center">
                    <div className="text-sm font-bold text-purple-900 mb-2">マニュアル</div>
                    {selectedTask.manual_url ? (
                      <a
                        href={selectedTask.manual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-all font-bold text-sm shadow-md hover:shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        開く
                      </a>
                    ) : (
                      <div className="text-gray-500 text-sm">未設定</div>
                    )}
                  </div>
                </div>

                {/* 動画カード */}
                <div className="bg-gradient-to-br from-pink-100 to-pink-200 p-4 border-3 border-pink-500 shadow-md hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
                  <div className="text-center">
                    <div className="text-sm font-bold text-pink-900 mb-2">動画</div>
                    {selectedTask.video_url ? (
                      <a
                        href={selectedTask.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-all font-bold text-sm shadow-md hover:shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        再生
                      </a>
                    ) : (
                      <div className="text-gray-500 text-sm">未設定</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 作業内容 */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border-3 border-blue-300 shadow-md mb-4">
                <div className="mb-2">
                  <span className="text-lg font-bold text-blue-900">作業内容</span>
                </div>
                <div className="text-base leading-relaxed text-gray-800 bg-white p-3 rounded-lg">
                  {selectedTask.description || 'なし'}
                </div>
              </div>

              {/* Do's & Don'ts 横並び */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Do's */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border-3 border-green-400 shadow-md">
                  <div className="mb-2">
                    <span className="text-lg font-bold text-green-900">Do's</span>
                  </div>
                  <div className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap bg-white p-3 rounded-lg max-h-40 overflow-y-auto">
                    {selectedTask.dos || '設定されていません'}
                  </div>
                </div>

                {/* Don'ts */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border-3 border-red-400 shadow-md">
                  <div className="mb-2">
                    <span className="text-lg font-bold text-red-900">Dont's</span>
                  </div>
                  <div className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap bg-white p-3 rounded-lg max-h-40 overflow-y-auto">
                    {selectedTask.donts || '設定されていません'}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-3 border-blue-300">
                <button
                  onClick={() => {
                    setSelectedTask(null)
                    setEditingDueDate(false)
                    setEditingActualDate(false)
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-bold text-lg shadow-lg"
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
