import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays } from 'date-fns'

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

export default function ProjectList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [loading, setLoading] = useState(true)

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
        {projects.map((project) => {
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

              {/* 部署ステータス */}
              <div className="p-4 bg-pastel-blue-light">
                <div className="grid grid-cols-2 gap-2">
                  {deptStatuses.map((dept) => (
                    <div
                      key={dept.department}
                      className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm"
                    >
                      <div className={`w-4 h-4 rounded ${getStatusBadgeColor(dept.status)}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">{dept.department}</div>
                        {dept.delayedTasks > 0 && (
                          <div className="text-xs text-red-600">
                            {dept.delayedTasks}件遅延
                          </div>
                        )}
                      </div>
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

      {projects.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-pastel">
          案件データがありません
        </div>
      )}
    </div>
  )
}
