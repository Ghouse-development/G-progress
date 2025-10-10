import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Employee, Task } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ArrowUpDown, Filter, Edit2, Trash2, X } from 'lucide-react'

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

type SortField = 'contract_date' | 'construction_start_date' | 'progress_rate' | 'delayed_tasks' | 'customer_name'
type FilterStatus = 'not_started' | 'requested' | 'delayed' | 'completed'

export default function ProjectList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('contract_date')
  const [sortAscending, setSortAscending] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus | 'all'>('all')

  // モーダル管理
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithRelations | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  // 従業員データ
  const [employees, setEmployees] = useState<Employee[]>([])

  // フォームデータ
  const [formData, setFormData] = useState({
    // 顧客情報
    customerNames: '',
    buildingSite: '',
    // 案件情報
    contractDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'post_contract' as Project['status'],
    progressRate: 0,
    assignedSales: '',
    assignedDesign: '',
    assignedConstruction: ''
  })

  useEffect(() => {
    loadProjects()
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('last_name')

    if (data) {
      setEmployees(data as Employee[])
    }
  }

  const loadProjects = async () => {
    try {
      setLoading(true)

      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:assigned_sales(id, last_name, first_name, department),
          design:assigned_design(id, last_name, first_name, department),
          construction:assigned_construction(id, last_name, first_name, department)
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
    if (filterStatus === 'not_started') {
      // 未着手タスクのみがある案件
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'not_started')
      })
    } else if (filterStatus === 'requested') {
      // 着手中タスクがある案件
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'requested')
      })
    } else if (filterStatus === 'delayed') {
      // 遅れタスクがある案件
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'delayed')
      })
    } else if (filterStatus === 'completed') {
      // 完了済みタスクがある案件
      filtered = filtered.filter(project => {
        const tasks = project.tasks || []
        return tasks.some(task => task.status === 'completed')
      })
    }

    // ソート
    filtered.sort((a, b) => {
      let compareValue = 0

      switch (sortField) {
        case 'contract_date':
          compareValue = new Date(a.contract_date).getTime() - new Date(b.contract_date).getTime()
          break
        case 'construction_start_date':
          const aDate = a.construction_start_date ? new Date(a.construction_start_date).getTime() : 0
          const bDate = b.construction_start_date ? new Date(b.construction_start_date).getTime() : 0
          compareValue = aDate - bDate
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

  // 案件作成
  const handleCreateProject = async () => {
    if (!formData.customerNames.trim() || !formData.buildingSite.trim()) {
      alert('顧客名と建設地は必須です')
      return
    }

    try {
      // 1. 顧客を作成
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          names: formData.customerNames.split('・').map(n => n.trim()),
          building_site: formData.buildingSite
        })
        .select()
        .single()

      if (customerError) throw customerError

      // 2. 案件を作成
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          customer_id: customer.id,
          contract_date: formData.contractDate,
          status: formData.status,
          progress_rate: formData.progressRate,
          assigned_sales: formData.assignedSales || null,
          assigned_design: formData.assignedDesign || null,
          assigned_construction: formData.assignedConstruction || null
        })

      if (projectError) throw projectError

      // リロード
      await loadProjects()
      setShowCreateModal(false)
      resetForm()
      alert('案件を作成しました')
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('案件の作成に失敗しました')
    }
  }

  // 案件編集
  const handleEditProject = async () => {
    if (!editingProject || !formData.customerNames.trim() || !formData.buildingSite.trim()) {
      alert('顧客名と建設地は必須です')
      return
    }

    try {
      // 1. 顧客情報を更新
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          names: formData.customerNames.split('・').map(n => n.trim()),
          building_site: formData.buildingSite
        })
        .eq('id', editingProject.customer_id)

      if (customerError) throw customerError

      // 2. 案件情報を更新
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          contract_date: formData.contractDate,
          status: formData.status,
          progress_rate: formData.progressRate,
          assigned_sales: formData.assignedSales || null,
          assigned_design: formData.assignedDesign || null,
          assigned_construction: formData.assignedConstruction || null
        })
        .eq('id', editingProject.id)

      if (projectError) throw projectError

      // リロード
      await loadProjects()
      setShowEditModal(false)
      setEditingProject(null)
      resetForm()
      alert('案件を更新しました')
    } catch (error) {
      console.error('Failed to update project:', error)
      alert('案件の更新に失敗しました')
    }
  }

  // 案件削除
  const handleDeleteProject = async () => {
    if (!deletingProjectId) return

    try {
      // 案件を削除（カスケード削除でタスクも削除される想定）
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingProjectId)

      if (error) throw error

      // リロード
      await loadProjects()
      setShowDeleteDialog(false)
      setDeletingProjectId(null)
      alert('案件を削除しました')
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('案件の削除に失敗しました')
    }
  }

  // フォームリセット
  const resetForm = () => {
    setFormData({
      customerNames: '',
      buildingSite: '',
      contractDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'post_contract',
      progressRate: 0,
      assignedSales: '',
      assignedDesign: '',
      assignedConstruction: ''
    })
  }

  // 編集モーダルを開く
  const openEditModal = (project: ProjectWithRelations) => {
    setEditingProject(project)
    setFormData({
      customerNames: project.customer?.names?.join('・') || '',
      buildingSite: project.customer?.building_site || '',
      contractDate: project.contract_date,
      status: project.status,
      progressRate: project.progress_rate,
      assignedSales: project.assigned_sales || '',
      assignedDesign: project.assigned_design || '',
      assignedConstruction: project.assigned_construction || ''
    })
    setShowEditModal(true)
  }

  // 削除確認ダイアログを開く
  const openDeleteDialog = (projectId: string) => {
    setDeletingProjectId(projectId)
    setShowDeleteDialog(true)
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
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">案件一覧</h1>
        </div>

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
                <option value="construction_start_date">着工日順</option>
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
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全て ({projects.length})
                </button>
                <button
                  onClick={() => setFilterStatus('not_started')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'not_started'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⚫ 未着手
                </button>
                <button
                  onClick={() => setFilterStatus('requested')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'requested'
                      ? 'bg-yellow-400 text-gray-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🟡 着手中
                </button>
                <button
                  onClick={() => setFilterStatus('delayed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'delayed'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔴 遅れ
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'completed'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔵 完了済
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-pastel-blue-dark mb-1">
                      {project.customer?.names?.join('・') || '顧客名なし'}様邸
                    </h3>
                    <p className="text-sm text-blue-800">
                      {project.customer?.building_site || '-'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(project)
                      }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      title="編集"
                    >
                      <Edit2 size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteDialog(project.id)
                      }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
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

      {/* 新規案件作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">新規案件追加</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* 顧客情報 */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">顧客情報</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        顧客名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customerNames}
                        onChange={(e) => setFormData({ ...formData, customerNames: e.target.value })}
                        placeholder="例: 山田太郎・花子"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">複数名の場合は「・」で区切ってください</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        建設地 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.buildingSite}
                        onChange={(e) => setFormData({ ...formData, buildingSite: e.target.value })}
                        placeholder="例: 東京都渋谷区〇〇1-2-3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 案件情報 */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">案件情報</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">契約日</label>
                      <input
                        type="date"
                        value={formData.contractDate}
                        onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pre_contract">契約前</option>
                        <option value="post_contract">契約後</option>
                        <option value="construction">着工後</option>
                        <option value="completed">完了</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">進捗率 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.progressRate}
                        onChange={(e) => setFormData({ ...formData, progressRate: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 担当者 */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">担当者</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">営業担当</label>
                      <select
                        value={formData.assignedSales}
                        onChange={(e) => setFormData({ ...formData, assignedSales: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">未設定</option>
                        {employees.filter(e => ['営業', '営業事務', 'ローン事務'].includes(e.department)).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">設計担当</label>
                      <select
                        value={formData.assignedDesign}
                        onChange={(e) => setFormData({ ...formData, assignedDesign: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">未設定</option>
                        {employees.filter(e => ['実施設計', '意匠設計', '申請設計', '構造設計', 'IC'].includes(e.department)).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">工事担当</label>
                      <select
                        value={formData.assignedConstruction}
                        onChange={(e) => setFormData({ ...formData, assignedConstruction: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">未設定</option>
                        {employees.filter(e => ['工事', '発注・積算', '工事事務'].includes(e.department)).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateProject}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 案件編集モーダル */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">案件編集</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* 顧客情報 */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">顧客情報</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        顧客名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customerNames}
                        onChange={(e) => setFormData({ ...formData, customerNames: e.target.value })}
                        placeholder="例: 山田太郎・花子"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">複数名の場合は「・」で区切ってください</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        建設地 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.buildingSite}
                        onChange={(e) => setFormData({ ...formData, buildingSite: e.target.value })}
                        placeholder="例: 東京都渋谷区〇〇1-2-3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 案件情報 */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">案件情報</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">契約日</label>
                      <input
                        type="date"
                        value={formData.contractDate}
                        onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pre_contract">契約前</option>
                        <option value="post_contract">契約後</option>
                        <option value="construction">着工後</option>
                        <option value="completed">完了</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">進捗率 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.progressRate}
                        onChange={(e) => setFormData({ ...formData, progressRate: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 担当者 */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">担当者</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">営業担当</label>
                      <select
                        value={formData.assignedSales}
                        onChange={(e) => setFormData({ ...formData, assignedSales: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">未設定</option>
                        {employees.filter(e => ['営業', '営業事務', 'ローン事務'].includes(e.department)).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">設計担当</label>
                      <select
                        value={formData.assignedDesign}
                        onChange={(e) => setFormData({ ...formData, assignedDesign: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">未設定</option>
                        {employees.filter(e => ['実施設計', '意匠設計', '申請設計', '構造設計', 'IC'].includes(e.department)).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">工事担当</label>
                      <select
                        value={formData.assignedConstruction}
                        onChange={(e) => setFormData({ ...formData, assignedConstruction: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">未設定</option>
                        {employees.filter(e => ['工事', '発注・積算', '工事事務'].includes(e.department)).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleEditProject}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">案件を削除しますか？</h3>
            <p className="text-gray-600 mb-6">
              この操作は取り消せません。案件に紐づくタスクも削除される可能性があります。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeletingProjectId(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteProject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
