import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Task, Employee, Customer, Product } from '../types/database'
import { differenceInDays, format } from 'date-fns'
import { HelpCircle, Plus, X } from 'lucide-react'
import { useMode } from '../contexts/ModeContext'

// 年度計算関数（8月1日～翌年7月31日）
const getFiscalYear = (date: Date): number => {
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return month >= 8 ? year : year - 1
}

// 年度の開始日と終了日を取得
const getFiscalYearRange = (fiscalYear: number) => {
  const startDate = new Date(fiscalYear, 7, 1) // 8月1日
  const endDate = new Date(fiscalYear + 1, 6, 31, 23, 59, 59) // 翌年7月31日
  return { startDate, endDate }
}

interface DepartmentStatus {
  department: string
  status: 'normal' | 'warning' | 'delayed'
  delayedCount: number
  totalTasks: number
}

export default function DashboardHome() {
  const navigate = useNavigate()
  const { mode, setMode } = useMode()
  const [fiscalYear, setFiscalYear] = useState<number>(getFiscalYear(new Date()))
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [constructionFilter, setConstructionFilter] = useState<'all' | 'pre' | 'post'>('all')

  // 新規案件追加用のstate
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [formData, setFormData] = useState({
    customerNames: '',
    buildingSite: '',
    contractDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'post_contract' as Project['status'],
    progressRate: 0,
    productId: '',
    assignedSales: '',
    assignedDesign: '',
    assignedConstruction: ''
  })

  // 利用可能な年度のリスト（過去5年分）
  const currentFY = getFiscalYear(new Date())
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i)

  useEffect(() => {
    loadCurrentUser()
    loadEmployees()
    loadProducts()
  }, [])

  useEffect(() => {
    loadProjects()
  }, [mode, fiscalYear, currentUserId])

  const loadCurrentUser = async () => {
    // 開発モード: localStorageまたはデフォルトユーザーIDを使用
    const savedUserId = localStorage.getItem('currentUserId')
    if (savedUserId) {
      setCurrentUserId(savedUserId)
      return
    }

    // Supabase認証を試みる（本番用）
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('email', user.email)
          .single()

        if (employee) {
          setCurrentUserId(employee.id)
          return
        }
      }
    } catch (error) {
      console.log('Supabase auth not configured, using default user')
    }

    // デフォルト: ユーザーID '1' を使用（開発モード）
    setCurrentUserId('1')
    localStorage.setItem('currentUserId', '1')
  }

  const loadProjects = async () => {
    const { startDate, endDate } = getFiscalYearRange(fiscalYear)

    let query = supabase
      .from('projects')
      .select(`
        *,
        customer:customers(*),
        product:products(*),
        sales:assigned_sales(id, name, department),
        design:assigned_design(id, name, department),
        construction:assigned_construction(id, name, department)
      `)
      .gte('contract_date', startDate.toISOString())
      .lte('contract_date', endDate.toISOString())

    // 担当者モードの場合、自分が担当する案件のみ
    if (mode === 'staff' && currentUserId) {
      query = query.or(`assigned_sales.eq.${currentUserId},assigned_design.eq.${currentUserId},assigned_construction.eq.${currentUserId}`)
    }

    const { data, error } = await query

    if (!error && data) {
      setProjects(data as Project[])

      // プロジェクトに紐づくタスクをすべて取得
      const projectIds = data.map(p => p.id)
      if (projectIds.length > 0) {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds)

        if (tasksData) {
          setTasks(tasksData as Task[])
        }
      } else {
        setTasks([])
      }
    }
  }

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name')

    if (data) {
      setEmployees(data as Employee[])
    }
  }

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name')

    if (data) {
      setProducts(data as Product[])
    }
  }

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
          product_id: formData.productId || null,
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

  // フォームリセット
  const resetForm = () => {
    setFormData({
      customerNames: '',
      buildingSite: '',
      contractDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'post_contract',
      progressRate: 0,
      productId: '',
      assignedSales: '',
      assignedDesign: '',
      assignedConstruction: ''
    })
  }

  // 統計計算
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'construction' || p.status === 'post_contract').length
  const averageProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progress_rate, 0) / projects.length)
    : 0
  const delayedProjects = projects.filter(p => p.progress_rate < 50 && p.status !== 'completed').length

  // 部署ステータス計算
  const getDepartmentStatus = (): DepartmentStatus[] => {
    const departments = [
      { name: '営業部', positions: ['営業', '営業事務', 'ローン事務'] },
      { name: '設計部', positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'] },
      { name: '工事部', positions: ['工事', '工事事務', '積算・発注'] },
      { name: '外構事業部', positions: ['外構設計', '外構工事'] }
    ]

    return departments.map(dept => {
      const deptTasks = tasks.filter(task => {
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
      let status: 'normal' | 'warning' | 'delayed' = 'normal'
      if (delayedCount === 0) {
        status = 'normal'
      } else if (delayedCount <= 2) {
        status = 'warning'
      } else {
        status = 'delayed'
      }

      return {
        department: dept.name,
        status,
        delayedCount,
        totalTasks: deptTasks.length
      }
    })
  }

  const departmentStatuses = getDepartmentStatus()

  // 着工前/後フィルタリング
  const filteredProjects = projects.filter(project => {
    if (constructionFilter === 'all') return true
    if (constructionFilter === 'pre') {
      return project.status === 'pre_contract' || project.status === 'post_contract'
    }
    if (constructionFilter === 'post') {
      return project.status === 'construction' || project.status === 'completed'
    }
    return true
  })

  // 全タスクの一意なタイトルリストを取得（管理者モード用）
  const getAllUniqueTasks = () => {
    const uniqueTitles = Array.from(new Set(tasks.map(t => t.title)))
    return uniqueTitles.sort() // アルファベット順にソート
  }

  const uniqueTaskTitles = getAllUniqueTasks()

  // 特定の案件・特定のタスクタイトルのタスクを取得
  const getProjectTaskByTitle = (projectId: string, taskTitle: string): Task | null => {
    const task = tasks.find(t =>
      t.project_id === projectId &&
      t.title === taskTitle
    )
    return task || null
  }

  // タスクの状態を色で表現（案件詳細の4項目に合わせる）
  const getTaskStatusIcon = (task: Task) => {
    // 完了: 🔵
    if (task.status === 'not_applicable' || task.status === 'completed') return '🔵'

    // 遅れ: 🔴
    if (task.status === 'delayed') return '🔴'

    // 着手中: 🟡
    if (task.status === 'requested') return '🟡'

    // 未着手: ⚫
    return '⚫'
  }

  const getTaskStatusColor = (task: Task) => {
    // 完了: 青（透明性あり）
    if (task.status === 'not_applicable' || task.status === 'completed') {
      return 'bg-blue-100 text-blue-900 border border-blue-300'
    }

    // 遅れ: 赤（透明性あり）
    if (task.status === 'delayed') {
      return 'bg-red-100 text-red-900 border border-red-300'
    }

    // 着手中: 黄色（透明性あり）
    if (task.status === 'requested') {
      return 'bg-yellow-100 text-yellow-900 border border-yellow-300'
    }

    // 未着手: グレー（透明性あり）
    return 'bg-gray-100 text-gray-900 border border-gray-300'
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー: モード切替と年度選択 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>

        <div className="flex items-center gap-4">
          {/* 新規案件追加ボタン */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            新規案件追加
          </button>
          {/* 年度選択 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-lg font-bold text-gray-900 flex items-center gap-1">
                年度
                <span title="当社では8月1日〜翌年7月31日を1年度としています">
                  <HelpCircle size={16} className="text-gray-400 cursor-help" />
                </span>
                :
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="px-6 py-3 border-3 border-blue-500 rounded-lg bg-white text-gray-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg hover:shadow-xl transition-all"
                title="当社では8月1日〜翌年7月31日を1年度としています"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}年度 ({year}/8/1 - {year + 1}/7/31)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* モード切替 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-pastel-blue-light rounded-lg p-1 border-2 border-pastel-blue">
              <button
                onClick={() => setMode('staff')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === 'staff'
                    ? 'bg-gradient-pastel-blue text-pastel-blue-dark shadow-pastel'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="あなたが担当する案件のみを表示します"
              >
                担当者モード
              </button>
              <button
                onClick={() => setMode('admin')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === 'admin'
                    ? 'bg-gradient-pastel-blue text-pastel-blue-dark shadow-pastel'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="全社の案件を俯瞰的に確認できます"
              >
                管理者モード
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">全社進捗率</p>
            <span title="全案件の平均進捗率を表示しています">
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-blue-dark">{averageProgress}%</p>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-pastel-blue h-2 rounded-full transition-all duration-300"
              style={{ width: `${averageProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-orange shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">遅延案件数</p>
            <span title="進捗率が50%未満の案件数を表示しています">
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-orange-dark">{delayedProjects}</p>
          <p className="text-xs text-gray-500 mt-2">進捗50%未満</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-green shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">進行中案件</p>
            <span title="契約後または着工後の案件数を表示しています">
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-green-dark">{activeProjects}</p>
          <p className="text-xs text-gray-500 mt-2">契約後・着工後</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">総案件数</p>
            <span title={`${fiscalYear}年度の総案件数を表示しています`}>
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-blue-dark">{totalProjects}</p>
          <p className="text-xs text-gray-500 mt-2">{fiscalYear}年度</p>
        </div>
      </div>

      {/* 部署ステータス表示（1行4部署） */}
      <div className="grid grid-cols-4 gap-3">
        {departmentStatuses.map(dept => (
          <div
            key={dept.department}
            className={`bg-white rounded-lg border-2 shadow-pastel p-3 ${
              dept.status === 'normal' ? 'border-blue-300' :
              dept.status === 'warning' ? 'border-yellow-300' :
              'border-red-300'
            }`}
          >
            <h3 className="text-xs font-semibold text-gray-800 mb-2 text-center">{dept.department}</h3>
            <div className="flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full shadow-md flex items-center justify-center ${
                dept.status === 'normal' ? 'bg-blue-100 border-2 border-blue-500' :
                dept.status === 'warning' ? 'bg-yellow-100 border-2 border-yellow-500' :
                'bg-red-100 border-2 border-red-500'
              }`}>
                <span className={`text-2xl font-bold ${
                  dept.status === 'normal' ? 'text-blue-900' :
                  dept.status === 'warning' ? 'text-yellow-900' :
                  'text-red-900'
                }`}>
                  {dept.status === 'normal' ? '✓' :
                   dept.status === 'warning' ? '!' :
                   '×'}
                </span>
              </div>
            </div>
            <p className={`text-center mt-2 text-xs font-bold ${
              dept.status === 'normal' ? 'text-blue-900' :
              dept.status === 'warning' ? 'text-yellow-900' :
              'text-red-900'
            }`}>
              {dept.status === 'normal' && '完了'}
              {dept.status === 'warning' && '着手中'}
              {dept.status === 'delayed' && '遅れ'}
            </p>
            {dept.delayedCount > 0 && (
              <p className="text-center text-xs text-red-600 font-semibold">
                {dept.delayedCount}件遅延
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 管理者モード: 進捗マトリクス表示 */}
      {mode === 'admin' && (
        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="p-4 bg-gradient-pastel-blue border-b-2 border-pastel-blue">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-pastel-blue-dark">全案件進捗マトリクス</h3>

              {/* フィルタボタン */}
              <div className="flex gap-2">
                <button
                  onClick={() => setConstructionFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    constructionFilter === 'all'
                      ? 'bg-white text-pastel-blue-dark shadow-pastel'
                      : 'bg-pastel-blue-light text-gray-700 hover:bg-white'
                  }`}
                >
                  全て ({projects.length})
                </button>
                <button
                  onClick={() => setConstructionFilter('pre')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    constructionFilter === 'pre'
                      ? 'bg-white text-pastel-blue-dark shadow-pastel'
                      : 'bg-pastel-blue-light text-gray-700 hover:bg-white'
                  }`}
                >
                  着工前 ({projects.filter(p => p.status === 'pre_contract' || p.status === 'post_contract').length})
                </button>
                <button
                  onClick={() => setConstructionFilter('post')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    constructionFilter === 'post'
                      ? 'bg-white text-pastel-blue-dark shadow-pastel'
                      : 'bg-pastel-blue-light text-gray-700 hover:bg-white'
                  }`}
                >
                  着工後 ({projects.filter(p => p.status === 'construction' || p.status === 'completed').length})
                </button>
              </div>
            </div>
          </div>

          {/* マトリクステーブル：横軸は全タスク（個別のタスクタイトル） */}
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '600px', position: 'relative' }}>
            <table className="text-xs border-collapse" style={{ minWidth: '100%', position: 'relative' }}>
              <thead className="sticky top-0 z-30 bg-white">
                <tr>
                  <th className="border-2 border-gray-300 p-2 text-left font-bold text-gray-800 sticky left-0 shadow-md" style={{ minWidth: '180px', width: '180px', backgroundColor: '#DBEAFE', zIndex: 50 }}>
                    案件名
                  </th>
                  <th className="border-2 border-gray-300 p-2 text-center font-bold text-gray-800 sticky shadow-md" style={{ minWidth: '100px', width: '100px', left: '180px', backgroundColor: '#DBEAFE', zIndex: 50 }}>
                    営業担当
                  </th>
                  <th className="border-2 border-gray-300 p-2 text-center font-bold text-gray-800 sticky shadow-md" style={{ minWidth: '100px', width: '100px', left: '280px', backgroundColor: '#DBEAFE', zIndex: 50 }}>
                    設計担当
                  </th>
                  <th className="border-2 border-gray-300 p-2 text-center font-bold text-gray-800 sticky shadow-md" style={{ minWidth: '100px', width: '100px', left: '380px', backgroundColor: '#DBEAFE', zIndex: 50 }}>
                    工事担当
                  </th>
                  {uniqueTaskTitles.map(taskTitle => (
                    <th
                      key={taskTitle}
                      className="border-2 border-gray-300 p-1 bg-pastel-blue-light text-center font-bold text-gray-800"
                      style={{ minWidth: '120px' }}
                      title={taskTitle}
                    >
                      <div className="text-xs leading-tight">
                        {taskTitle.length > 15 ? taskTitle.substring(0, 15) + '...' : taskTitle}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={uniqueTaskTitles.length + 4} className="border-2 border-gray-300 p-8 text-center text-gray-500">
                      該当する案件がありません
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project: any) => (
                    <tr key={project.id} className="hover:bg-pastel-blue-light transition-colors">
                      <td className="border-2 border-gray-300 p-4 sticky left-0 shadow-md" style={{ width: '180px', backgroundColor: '#EFF6FF', zIndex: 10 }}>
                        <div className="font-black text-xl text-blue-900 mb-2 tracking-tight" style={{ fontWeight: 900 }} title={`${project.customer?.names?.join('・') || '顧客名なし'}様邸`}>
                          {project.customer?.names?.join('・') || '顧客名なし'}様
                        </div>
                        {project.product && (
                          <div className="text-blue-700 text-sm font-bold mb-1">
                            {project.product.name}
                          </div>
                        )}
                        <div className="text-gray-600 text-sm font-medium">
                          契約: {format(new Date(project.contract_date), 'MM/dd')}
                        </div>
                      </td>
                      <td className="border-2 border-gray-300 p-2 sticky shadow-md text-center" style={{ width: '100px', left: '180px', backgroundColor: '#EFF6FF', zIndex: 10 }}>
                        {project.sales ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-blue-500"></div>
                            <div className="text-xs font-bold text-gray-900 truncate" title={project.sales.name}>
                              {project.sales.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-gray-400">-</div>
                        )}
                      </td>
                      <td className="border-2 border-gray-300 p-2 sticky shadow-md text-center" style={{ width: '100px', left: '280px', backgroundColor: '#EFF6FF', zIndex: 10 }}>
                        {project.design ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-green-500"></div>
                            <div className="text-xs font-bold text-gray-900 truncate" title={project.design.name}>
                              {project.design.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-gray-400">-</div>
                        )}
                      </td>
                      <td className="border-2 border-gray-300 p-2 sticky shadow-md text-center" style={{ width: '100px', left: '380px', backgroundColor: '#EFF6FF', zIndex: 10 }}>
                        {project.construction ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                            <div className="text-xs font-bold text-gray-900 truncate" title={project.construction.name}>
                              {project.construction.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-gray-400">-</div>
                        )}
                      </td>
                      {uniqueTaskTitles.map(taskTitle => {
                        const task = getProjectTaskByTitle(project.id, taskTitle)

                        return (
                          <td key={taskTitle} className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                            {task ? (
                              <div
                                className={`px-3 py-2 rounded-xl text-center text-base font-bold shadow-sm hover:shadow-md transition-all cursor-pointer ${getTaskStatusColor(task)}`}
                                title={`${task.title}\n期限: ${task.due_date ? format(new Date(task.due_date), 'MM/dd') : '未設定'}\nステータス: ${
                                  task.status === 'completed' || task.status === 'not_applicable' ? '完了' :
                                  task.status === 'delayed' ? '遅れ' :
                                  task.status === 'requested' ? '着手中' :
                                  '未着手'
                                }`}
                              >
                                {task.due_date ? format(new Date(task.due_date), 'MM/dd') : '-'}
                              </div>
                            ) : (
                              <div className="h-10 flex items-center justify-center text-gray-400">
                                -
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">商品</label>
                      <select
                        value={formData.productId}
                        onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">未設定</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
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
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
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
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
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
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
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
    </div>
  )
}
