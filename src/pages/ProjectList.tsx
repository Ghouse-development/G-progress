import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ArrowUpDown, Filter } from 'lucide-react'

interface ProjectWithRelations extends Project {
  customer: Customer
  sales: Employee
  design: Employee
  construction: Employee
  tasks?: Task[]
}

// 部署のタスク遅延状態
interface DepartmentStatus {
  department: '営業部' | '設計部' | '工事部' | '外構事業部'
  status: 'ontrack' | 'warning' | 'delayed'
  delayedTasks: number
  totalTasks: number
}

type SortField = 'contract_date' | 'progress_rate' | 'delayed_tasks' | 'customer_name'
type FilterStatus = 'all' | 'delayed' | 'normal'

export default function ProjectList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('contract_date')
  const [sortAscending, setSortAscending] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)

      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:assigned_sales(id, name, department),
          design:assigned_design(id, name, department),
          construction:assigned_construction(id, name, department)
        `)
        .order('contract_date', { ascending: false })

      if (projectsData) {
        // 各案件のタスクを取得
        const projectsWithTasks = await Promise.all(
          projectsData.map(async (project) => {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('*')
              .eq('project_id', project.id)

            return {
              ...project,
              tasks: tasks || []
            } as ProjectWithRelations
          })
        )

        setProjects(projectsWithTasks)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDepartmentStatus = (project: ProjectWithRelations): DepartmentStatus[] => {
    const departments = [
      { name: '営業部' as const, positions: ['営業', '営業事務', 'ローン事務'] },
      { name: '設計部' as const, positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'] },
      { name: '工事部' as const, positions: ['工事', '工事事務', '積算・発注'] },
      { name: '外構事業部' as const, positions: ['外構設計', '外構工事'] }
    ]

    return departments.map(dept => {
      const deptTasks = (project.tasks || []).filter(task => {
        const taskPosition = task.description?.split(':')[0]?.trim()
        return dept.positions.includes(taskPosition || '')
      })

      const delayedTasks = deptTasks.filter(task => {
        if (!task.due_date) return false
        if (task.status === 'completed') return false
        const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
        return daysOverdue > 0
      })

      const delayedCount = delayedTasks.length
      const totalCount = deptTasks.length

      let status: 'ontrack' | 'warning' | 'delayed' = 'ontrack'
      if (delayedCount === 0) {
        status = 'ontrack'
      } else if (delayedCount <= 2) {
        status = 'warning'
      } else {
        status = 'delayed'
      }

      return {
        department: dept.name,
        status,
        delayedTasks: delayedCount,
        totalTasks: totalCount
      }
    })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ontrack': return 'bg-blue-500'
      case 'warning': return 'bg-yellow-500'
      case 'delayed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pre_contract': return '契約前'
      case 'post_contract': return '契約後'
      case 'construction': return '着工後'
      case 'completed': return '完了'
      default: return status
    }
  }

  // ソート＆フィルタ処理
  const getSortedAndFilteredProjects = () => {
    let filtered = [...projects]

    // フィルタ
    if (filterStatus === 'delayed') {
      filtered = filtered.filter(project => {
        const deptStatuses = getDepartmentStatus(project)
        return deptStatuses.some(dept => dept.status === 'delayed' || dept.status === 'warning')
      })
    } else if (filterStatus === 'normal') {
      filtered = filtered.filter(project => {
        const deptStatuses = getDepartmentStatus(project)
        return deptStatuses.every(dept => dept.status === 'ontrack')
      })
    }

    // ソート
    filtered.sort((a, b) => {
      let compareValue = 0

      switch (sortField) {
        case 'contract_date':
          compareValue = new Date(a.contract_date).getTime() - new Date(b.contract_date).getTime()
          break
        case 'progress_rate':
          compareValue = a.progress_rate - b.progress_rate
          break
        case 'delayed_tasks':
          const aDelayed = getDepartmentStatus(a).reduce((sum, dept) => sum + dept.delayedTasks, 0)
          const bDelayed = getDepartmentStatus(b).reduce((sum, dept) => sum + dept.delayedTasks, 0)
          compareValue = aDelayed - bDelayed
          break
        case 'customer_name':
          const aName = a.customer?.names?.join('') || ''
          const bName = b.customer?.names?.join('') || ''
          compareValue = aName.localeCompare(bName, 'ja')
          break
      }

      return sortAscending ? compareValue : -compareValue
    })

    return filtered
  }

  const displayProjects = getSortedAndFilteredProjects()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-3">案件一覧</h1>

        {/* ソート＆フィルタツールバー */}
        <div className="bg-white rounded-lg shadow-pastel p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* ソート */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown size={20} className="text-gray-600" />
                <span className="font-bold text-gray-900">並び順:</span>
              </div>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 border border-pastel-blue rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
              >
                <option value="contract_date">契約日順</option>
                <option value="progress_rate">進捗率順</option>
                <option value="delayed_tasks">遅延件数順</option>
                <option value="customer_name">顧客名順</option>
              </select>
              <button
                onClick={() => setSortAscending(!sortAscending)}
                className="px-3 py-2 bg-pastel-blue-light text-pastel-blue-dark rounded-lg hover:bg-pastel-blue transition-colors font-medium"
              >
                {sortAscending ? '昇順 ↑' : '降順 ↓'}
              </button>
            </div>

            {/* フィルタ */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-600" />
                <span className="font-bold text-gray-900">絞り込み:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-pastel-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全て ({projects.length})
                </button>
                <button
                  onClick={() => setFilterStatus('delayed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'delayed'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  遅延あり
                </button>
                <button
                  onClick={() => setFilterStatus('normal')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'normal'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  計画通り
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 凡例 */}
        <div className="bg-white rounded-lg shadow-pastel p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="font-bold text-gray-900">部署ステータス:</div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-700">計画通り</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-700">要注意（1-2件遅延）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-700">遅れあり（3件以上遅延）</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayProjects.map((project) => {
          const deptStatuses = getDepartmentStatus(project)

          return (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="bg-white rounded-xl shadow-pastel-lg hover:shadow-pastel cursor-pointer transition-all duration-200 overflow-hidden border-2 border-gray-200 hover:border-pastel-blue"
            >
              {/* ヘッダー */}
              <div className="bg-gradient-pastel-blue p-4">
                <h3 className="text-xl font-bold text-pastel-blue-dark mb-1">
                  {project.customer?.names?.join('・') || '顧客名なし'}様邸
                </h3>
                <p className="text-sm text-blue-800">
                  📍 {project.customer?.building_site || '-'}
                </p>
              </div>

              {/* 部署ステータス（1行4列） */}
              <div className="p-3 bg-pastel-blue-light">
                <div className="flex gap-2 justify-between">
                  {deptStatuses.map((dept) => (
                    <div
                      key={dept.department}
                      className="flex flex-col items-center bg-white rounded-lg p-2 shadow-sm flex-1"
                    >
                      <div className={`w-6 h-6 rounded-full ${getStatusBadgeColor(dept.status)}`}></div>
                      <div className="text-xs font-bold text-gray-800 mt-1 text-center">{dept.department.replace('部', '')}</div>
                      {dept.delayedTasks > 0 && (
                        <div className="text-xs text-red-600 text-center">
                          {dept.delayedTasks}件
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 詳細情報 */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">契約日:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {format(new Date(project.contract_date), 'yyyy/MM/dd')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">ステータス:</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    project.status === 'pre_contract' ? 'bg-gray-100 text-gray-800' :
                    project.status === 'post_contract' ? 'bg-pastel-blue text-pastel-blue-dark' :
                    project.status === 'construction' ? 'bg-pastel-orange text-pastel-orange-dark' :
                    'bg-pastel-green text-pastel-green-dark'
                  }`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">進捗率:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-pastel-blue h-2 rounded-full"
                        style={{ width: `${project.progress_rate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-pastel-blue-dark">{project.progress_rate}%</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {displayProjects.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-pastel">
          {filterStatus === 'all'
            ? '案件データがありません'
            : `絞り込み条件に一致する案件がありません（全${projects.length}件中0件）`}
        </div>
      )}
    </div>
  )
}
