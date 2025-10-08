import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'

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
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    position: '営業',
    due_date: '',
    assigned_to: ''
  })
  const [employees, setEmployees] = useState<Employee[]>([])

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
    <div className="min-h-screen bg-pastel-blue-light">
      <div className="container mx-auto p-6">
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
                <div className="w-6 h-6 task-completed rounded"></div>
                <span className="text-sm text-gray-700">✓ 完了</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 task-in-progress rounded"></div>
                <span className="text-sm text-gray-700">● 作業中</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 task-not-started rounded"></div>
                <span className="text-sm text-gray-700">○ 未着手</span>
              </div>
            </div>
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
        <div className="bg-white shadow-pastel-lg rounded-xl overflow-hidden border-2 border-gray-300" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <div className="overflow-x-auto overflow-y-auto h-full">
            <div className="inline-block min-w-full">
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
                    className={`text-center py-3 px-1 font-bold text-base ${
                      index === 0 ? 'bg-gradient-pastel-blue text-pastel-blue-dark' :
                      index === 1 ? 'bg-gradient-pastel-green text-pastel-green-dark' :
                      index === 2 ? 'bg-gradient-pastel-orange text-pastel-orange-dark' :
                      'bg-pastel-teal text-gray-800'
                    } ${index < DEPARTMENTS.length - 1 ? 'border-r-4 border-white' : ''}`}
                    style={{ width: `${dept.positions.length * 130}px` }}
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
                  return (
                    <div
                      key={position}
                      className="border-r-2 border-gray-300 p-2 text-center bg-white"
                      style={{ width: '130px' }}
                    >
                      <div className="font-bold text-xs text-gray-800 mb-1">{position}</div>
                      <div className="text-xs text-gray-600 mb-1 truncate" title={employee ? employee.name : '未割当'}>
                        {employee ? employee.name : '未割当'}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-gradient-pastel-green h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-pastel-green-dark">{completionRate}%</span>
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
                            className="border border-gray-300 p-2 min-h-14 transition-colors duration-150 flex flex-col items-center justify-center gap-1"
                            style={{ width: '130px' }}
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
                                  className={`text-xs rounded-lg px-2 py-1.5 truncate cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${statusClass}`}
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
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none touch-target"
                >
                  ×
                </button>
              </div>

              {/* ステータス */}
              <div className="mb-4">
                <span className={`inline-block px-4 py-2 rounded-full text-base font-bold shadow-pastel ${
                  selectedTask.status === 'completed' ? 'bg-gradient-pastel-green text-pastel-green-dark' :
                  selectedTask.status === 'requested' ? 'bg-gradient-pastel-blue text-pastel-blue-dark' :
                  'bg-pastel-blue-light text-gray-800'
                }`}>
                  {selectedTask.status === 'completed' ? '✓ 完了' :
                   selectedTask.status === 'requested' ? '● 進行中' : '○ 未着手'}
                </span>
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
