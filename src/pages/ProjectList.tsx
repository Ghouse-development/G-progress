import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProjects } from '../lib/api'
import { Project, Customer, Employee } from '../types/database'
import { format, differenceInDays } from 'date-fns'

interface ProjectWithRelations extends Project {
  customer: Customer
  sales: Employee
  design: Employee
  construction: Employee
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
      const data = await fetchProjects()
      setProjects(data as ProjectWithRelations[])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pre_contract':
        return 'bg-gray-100 text-gray-800'
      case 'post_contract':
        return 'bg-blue-100 text-blue-800'
      case 'construction':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateRemainingDays = (completionDate: string | null | undefined) => {
    if (!completionDate) return null
    return differenceInDays(new Date(completionDate), new Date())
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return format(new Date(date), 'yyyy/MM/dd')
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
      <h1 className="text-3xl font-bold mb-6">案件一覧</h1>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  お客様氏名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  建築地
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  契約日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  着工日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  完了予定日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  進捗率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  残り日数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  営業担当
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => {
                const remainingDays = calculateRemainingDays(project.scheduled_end_date)
                const isOverdue = remainingDays !== null && remainingDays < 0

                return (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.customer?.names?.join('・') || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.customer?.building_site || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(project.contract_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(project.construction_start_date || null)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(project.scheduled_end_date || null)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${project.progress_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{project.progress_rate}%</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      {remainingDays !== null ? `${remainingDays}日` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.sales?.name || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            案件データがありません
          </div>
        )}
      </div>
    </div>
  )
}