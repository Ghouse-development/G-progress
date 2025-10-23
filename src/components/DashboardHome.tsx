import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project, Task, Employee, Product, Payment } from '../types/database'
import { differenceInDays, format } from 'date-fns'
import { HelpCircle, Plus, X } from 'lucide-react'
import { useFilter } from '../contexts/FilterContext'
import { useToast } from '../contexts/ToastContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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
  const { selectedFiscalYear, viewMode, currentUser } = useFilter()
  const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
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

  // 部署遅延詳細モーダル用のstate
  const [showDepartmentDetailModal, setShowDepartmentDetailModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)

  // 利用可能な年度のリスト（過去5年分）
  const currentFY = getFiscalYear(new Date())
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i)

  useEffect(() => {
    loadEmployees()
    loadProducts()
  }, [])

  useEffect(() => {
    loadProjects()
  }, [viewMode, selectedFiscalYear, currentUser])

  // リアルタイム更新: projects, customers, tasks, employeesテーブルの変更を監視
  useEffect(() => {
    // Supabase Realtimeチャンネルをセットアップ（複数テーブル監視）
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE すべてのイベント
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Realtime project change:', payload)
          loadProjects() // プロジェクトデータを再読み込み
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          console.log('Realtime customer change:', payload)
          loadProjects() // 顧客データ変更時もプロジェクトを再読み込み
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Realtime task change:', payload)
          loadProjects() // タスク変更は統計に影響するため再読み込み
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log('Realtime employee change:', payload)
          loadEmployees() // 従業員データを再読み込み
        }
      )
      .subscribe()

    // クリーンアップ: コンポーネントのアンマウント時にサブスクリプション解除
    return () => {
      supabase.removeChannel(channel)
    }
  }, [viewMode, selectedFiscalYear, currentUser]) // フィルタ条件変更時にチャンネルを再作成

  const loadProjects = async () => {
    if (!selectedFiscalYear) return

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
      .eq('fiscal_year', selectedFiscalYear)

    // 担当者モードの場合、自分が担当する案件のみ
    if (viewMode === 'personal' && currentUser) {
      query = query.or(`assigned_sales.eq.${currentUser.id},assigned_design.eq.${currentUser.id},assigned_construction.eq.${currentUser.id}`)
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

        // プロジェクトに紐づく支払いをすべて取得
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .in('project_id', projectIds)

        if (paymentsData) {
          setPayments(paymentsData as Payment[])
        }
      } else {
        setTasks([])
        setPayments([])
      }
    }
  }

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('last_name')

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
      toast.warning('顧客名と建設地は必須です')
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
      toast.success('案件を作成しました')
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error('案件の作成に失敗しました')
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
  const postContractProjects = projects.filter(p => p.status === 'post_contract').length
  const constructionProjects = projects.filter(p => p.status === 'construction').length
  const completedProjects = projects.filter(p => p.status === 'completed').length

  // 遅延タスク数を計算
  const delayedTasksCount = tasks.filter(task => {
    if (!task.due_date || task.status === 'completed' || task.status === 'not_applicable') return false
    const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
    return daysOverdue > 0
  }).length

  // 年度を数値に変換
  const fiscalYear = selectedFiscalYear ? parseInt(selectedFiscalYear) : new Date().getFullYear()

  // 月別統計を計算（8月～7月の12ヶ月）
  const getMonthlyStatistics = () => {
    const months = []
    const { startDate } = getFiscalYearRange(fiscalYear)

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

      // 契約数：contract_dateが該当月の案件
      const contractCount = projects.filter(p => {
        if (!p.contract_date) return false
        const contractDate = new Date(p.contract_date)
        return contractDate >= monthStart && contractDate <= monthEnd
      }).length

      // 着工数：construction_start_dateが該当月の案件
      const constructionStartCount = projects.filter(p => {
        if (!p.construction_start_date) return false
        const constructionDate = new Date(p.construction_start_date)
        return constructionDate >= monthStart && constructionDate <= monthEnd
      }).length

      // 引き渡し数：handover_dateが該当月の案件
      const handoverCount = projects.filter(p => {
        if (!p.handover_date) return false
        const handoverDate = new Date(p.handover_date)
        return handoverDate >= monthStart && handoverDate <= monthEnd
      }).length

      // 入金予定額：scheduled_dateが該当月の支払い
      const scheduledPayments = payments.filter(payment => {
        if (!payment.scheduled_date) return false
        const paymentDate = new Date(payment.scheduled_date)
        return paymentDate >= monthStart && paymentDate <= monthEnd
      })
      const scheduledAmount = scheduledPayments.reduce((sum, payment) => sum + (payment.scheduled_amount || 0), 0)

      // 入金実績額：actual_dateが該当月の支払い
      const actualPayments = payments.filter(payment => {
        if (!payment.actual_date) return false
        const paymentDate = new Date(payment.actual_date)
        return paymentDate >= monthStart && paymentDate <= monthEnd
      })
      const actualAmount = actualPayments.reduce((sum, payment) => sum + (payment.actual_amount || 0), 0)

      // 粗利益：該当月に契約した案件の粗利益合計
      const monthProjects = projects.filter(p => {
        if (!p.contract_date) return false
        const contractDate = new Date(p.contract_date)
        return contractDate >= monthStart && contractDate <= monthEnd
      })
      const grossProfit = monthProjects.reduce((sum, p) => sum + (p.gross_profit || 0), 0)

      months.push({
        month: format(monthDate, 'M月'),
        year: monthDate.getFullYear(),
        contractCount,
        constructionStartCount,
        handoverCount,
        scheduledAmount,
        actualAmount,
        grossProfit,
        // 税別売上高（入金予定+実績を1.1で割る）
        salesExcludingTax: Math.round((scheduledAmount + actualAmount) / 1.1)
      })
    }

    return months
  }

  const monthlyStats = getMonthlyStatistics()

  // 商品構成の計算
  const getProductComposition = () => {
    const productCounts: { [key: string]: number } = {}

    projects.forEach(p => {
      const productType = p.product_type || p.product?.name || '未分類'
      productCounts[productType] = (productCounts[productType] || 0) + 1
    })

    const total = projects.length
    return Object.entries(productCounts).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
  }

  const productComposition = getProductComposition()

  // 平均坪数の計算
  const getAverageFloorArea = () => {
    const projectsWithArea = projects.filter(p => p.total_floor_area && p.total_floor_area > 0)
    if (projectsWithArea.length === 0) return 0
    const sum = projectsWithArea.reduce((acc, p) => acc + (p.total_floor_area || 0), 0)
    return Math.round((sum / projectsWithArea.length) * 10) / 10
  }

  const averageFloorArea = getAverageFloorArea()

  // 平均契約金額の計算（contract_amountフィールドが必要、なければpayments合計から推定）
  const getAverageContractAmount = () => {
    // プロジェクトごとの支払い合計を計算
    const projectAmounts = projects.map(p => {
      const projectPayments = payments.filter(payment => payment.project_id === p.id)
      const totalAmount = projectPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
      return totalAmount
    }).filter(amount => amount > 0)

    if (projectAmounts.length === 0) return 0
    const sum = projectAmounts.reduce((acc, amount) => acc + amount, 0)
    return Math.round(sum / projectAmounts.length)
  }

  const averageContractAmount = getAverageContractAmount()
  const averageContractAmountExcludingTax = Math.round(averageContractAmount / 1.1)

  // 完工予定数の計算
  const expectedCompletionCount = projects.filter(p => !p.exclude_from_count).length

  // 部署ステータス計算（担当者モードでは自分の案件のみ）
  const getDepartmentStatus = (): DepartmentStatus[] => {
    const departments = [
      { name: '営業部', positions: ['営業', '営業事務', 'ローン事務'] },
      { name: '設計部', positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'] },
      { name: '工事部', positions: ['工事', '工事事務', '積算・発注'] },
      { name: '外構事業部', positions: ['外構設計', '外構工事'] }
    ]

    // 担当者モードの場合、自分が担当している案件のIDリストを取得
    let myProjectIds: string[] = []
    if (viewMode === 'personal' && currentUser) {
      myProjectIds = projects
        .filter(p =>
          p.assigned_sales === currentUser.id ||
          p.assigned_design === currentUser.id ||
          p.assigned_construction === currentUser.id
        )
        .map(p => p.id)
    }

    return departments.map(dept => {
      // 部署のタスクを取得（担当者モードでは自分の案件のみ）
      const deptTasks = tasks.filter(task => {
        const taskPosition = task.description?.split(':')[0]?.trim()
        const isInDepartment = dept.positions.includes(taskPosition || '')

        // 管理者モードまたはタスクが自分の案件に属している場合のみ
        if (viewMode === 'company') {
          return isInDepartment
        } else {
          return isInDepartment && myProjectIds.includes(task.project_id)
        }
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

  // 部署の遅延詳細を取得（職種ごとの遅延タスク数）
  const getDepartmentDelayDetails = (departmentName: string) => {
    const departmentMap: { [key: string]: string[] } = {
      '営業部': ['営業', '営業事務', 'ローン事務'],
      '設計部': ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'],
      '工事部': ['工事', '工事事務', '積算・発注'],
      '外構事業部': ['外構設計', '外構工事']
    }

    const positions = departmentMap[departmentName] || []

    // 担当者モードの場合、自分が担当している案件のIDリストを取得
    let myProjectIds: string[] = []
    if (viewMode === 'personal' && currentUser) {
      myProjectIds = projects
        .filter(p =>
          p.assigned_sales === currentUser.id ||
          p.assigned_design === currentUser.id ||
          p.assigned_construction === currentUser.id
        )
        .map(p => p.id)
    }

    // 職種ごとの遅延タスク数をカウント
    return positions.map(position => {
      const positionDelayedTasks = tasks.filter(task => {
        // タスクが自分の案件に属しているかチェック（担当者モードの場合）
        if (viewMode === 'personal' && !myProjectIds.includes(task.project_id)) {
          return false
        }

        // タスクの職種がこの職種かチェック（descriptionから取得）
        const taskPosition = task.description?.split(':')[0]?.trim()
        if (taskPosition !== position) return false

        // 遅延しているかチェック
        if (!task.due_date) return false
        if (task.status === 'completed') return false
        const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
        return daysOverdue > 0
      })

      return {
        employeeId: position,
        employeeName: position,
        department: position,
        delayedCount: positionDelayedTasks.length
      }
    }).filter(detail => detail.delayedCount > 0) // 遅延がある職種のみ
  }

  const handleDepartmentClick = (departmentName: string) => {
    setSelectedDepartment(departmentName)
    setShowDepartmentDetailModal(true)
  }

  // 着工前/後フィルタリング
  const filteredProjects = projects.filter(project => {
    if (constructionFilter === 'all') return true
    if (constructionFilter === 'pre') {
      return project.status === 'post_contract'
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

  const getTaskStatusColor = (task: Task) => {
    // 完了: 青（透明性あり）
    if (task.status === 'not_applicable' || task.status === 'completed') {
      return 'bg-blue-100 text-blue-900 border border-blue-300'
    }

    // 期限切れチェック（遅れを最優先）
    if (task.due_date) {
      const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
      if (daysOverdue > 0) {
        return 'bg-red-400 text-white border-2 border-red-600 font-bold'
      }
    }

    // 遅れ: 赤（濃い赤）
    if (task.status === 'delayed') {
      return 'bg-red-400 text-white border-2 border-red-600 font-bold'
    }

    // 着手中: 黄色（透明性あり）
    if (task.status === 'requested') {
      return 'bg-yellow-100 text-yellow-900 border border-yellow-300'
    }

    // 未着手: グレー（透明性あり）
    return 'bg-gray-100 text-gray-900 border border-gray-300'
  }

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード - {fiscalYear}年度</h2>

        <div className="flex items-center gap-4">
          {/* 新規案件追加ボタン */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="prisma-btn prisma-btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            新規案件追加
          </button>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="prisma-card">
          <div className="flex items-center gap-1 mb-2">
            <p className="text-base text-gray-600 font-semibold">完工予定数</p>
            <span title={`${fiscalYear}年度の完工予定数（カウント除外を除く）`}>
              <HelpCircle size={16} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-3xl font-bold text-canva-purple mb-3">{expectedCompletionCount}</p>
          <p className="text-base text-gray-500 font-medium">{fiscalYear}年度</p>
        </div>

        <div className="prisma-card">
          <div className="flex items-center gap-1 mb-2">
            <p className="text-base text-gray-600 font-semibold">全案件数</p>
            <span title={`${fiscalYear}年度の全案件数`}>
              <HelpCircle size={16} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-3xl font-bold text-canva-blue mb-3">{totalProjects}</p>
          <p className="text-base text-gray-500 font-medium">全体</p>
        </div>

        <div className="prisma-card">
          <div className="flex items-center gap-1 mb-2">
            <p className="text-base text-gray-600 font-semibold">平均坪数</p>
            <span title="案件の平均延床面積（坪）">
              <HelpCircle size={16} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-3xl font-bold text-canva-pink mb-3">{averageFloorArea}</p>
          <p className="text-base text-gray-500 font-medium">坪</p>
        </div>

        <div className="prisma-card">
          <div className="flex items-center gap-1 mb-2">
            <p className="text-base text-gray-600 font-semibold">平均契約金額</p>
            <span title="案件の平均契約金額（税込）">
              <HelpCircle size={16} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-3">{(averageContractAmount / 10000).toFixed(0)}万円</p>
          <p className="text-base text-gray-500 font-medium">税別: {(averageContractAmountExcludingTax / 10000).toFixed(0)}万円</p>
        </div>
      </div>

      {/* Rechartsグラフセクション */}
      <div className="grid grid-cols-2 gap-4">
        {/* 月別契約数・着工数・引き渡し数 */}
        <div className="prisma-card">
          <h3 className="text-lg font-bold text-gray-900 mb-3">月別 契約数・着工数・引き渡し数</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="contractCount" fill="#8B5CF6" name="契約数" />
              <Bar dataKey="constructionStartCount" fill="#EC4899" name="着工数" />
              <Bar dataKey="handoverCount" fill="#10B981" name="引き渡し数" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 月別入金予定・実績 */}
        <div className="prisma-card">
          <h3 className="text-lg font-bold text-gray-900 mb-3">月別 入金予定・実績</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="scheduledAmount" fill="#3B82F6" name="予定（税込）" />
              <Bar dataKey="actualAmount" fill="#EF4444" name="実績（税込）" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 mt-2">※税別売上高は各月の合計を1.1で割った値</p>
        </div>

        {/* 月別粗利益 */}
        <div className="prisma-card">
          <h3 className="text-lg font-bold text-gray-900 mb-3">月別 粗利益高（税別）</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="grossProfit" fill="#F59E0B" name="粗利益" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 mt-2">合計粗利益: ¥{monthlyStats.reduce((sum, m) => sum + m.grossProfit, 0).toLocaleString()}</p>
        </div>

        {/* 商品構成 */}
        <div className="prisma-card">
          <h3 className="text-lg font-bold text-gray-900 mb-3">商品構成</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-2 text-base font-bold">商品</th>
                  <th className="text-right p-2 text-base font-bold">数</th>
                  <th className="text-right p-2 text-base font-bold">割合</th>
                </tr>
              </thead>
              <tbody>
                {productComposition.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-2 text-base">{item.name}</td>
                    <td className="p-2 text-right text-base font-semibold">{item.count}</td>
                    <td className="p-2 text-right text-base font-semibold">{item.percentage}%</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                  <td className="p-2 text-base">合計</td>
                  <td className="p-2 text-right text-base">{totalProjects}</td>
                  <td className="p-2 text-right text-base">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 担当者モード: 自分のタスク一覧 */}
      {viewMode === 'personal' && currentUser && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">あなたのタスク</h3>

          {(() => {
            // 自分に割り当てられたタスクを取得
            const myTasks = tasks.filter(task => task.assigned_to === currentUser.id)

            // タスクを3つのカテゴリに分類
            const delayedTasks = myTasks.filter(task => {
              if (!task.due_date || task.status === 'completed' || task.status === 'not_applicable') return false
              const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
              return daysOverdue > 0
            })

            const dueTodayTasks = myTasks.filter(task => {
              if (!task.due_date || task.status === 'completed' || task.status === 'not_applicable') return false
              const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
              return daysOverdue === 0
            })

            const inProgressTasks = myTasks.filter(task => {
              if (task.status === 'completed' || task.status === 'not_applicable') return false
              if (!task.due_date) return true
              const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
              return daysOverdue < 0 && (task.status === 'requested' || task.status === 'delayed')
            })

            return (
              <>
                {/* 遅延中のタスク */}
                {delayedTasks.length > 0 && (
                  <div className="bg-white rounded-lg border-2 border-red-400 shadow-pastel overflow-hidden">
                    <div className="p-3 bg-red-100 border-b-2 border-red-400">
                      <h4 className="text-lg font-bold text-red-900 flex items-center gap-2">
                        🚨 遅延中のタスク ({delayedTasks.length})
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {delayedTasks.map(task => {
                        const daysOverdue = task.due_date ? differenceInDays(new Date(), new Date(task.due_date)) : 0
                        const project = projects.find(p => p.id === task.project_id)

                        return (
                          <div key={task.id} className="bg-red-50 border-2 border-red-300 rounded-lg p-4 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-3 py-1 bg-red-500 text-white text-base font-bold rounded-full">
                                    {daysOverdue}日遅れ
                                  </span>
                                  <h5 className="font-bold text-lg text-gray-900">{task.title}</h5>
                                </div>
                                {project && (
                                  <p className="text-base text-gray-700 mb-1">
                                    案件: {project.customer?.names?.join('・') || '不明'}様邸
                                  </p>
                                )}
                                <p className="text-base text-gray-600">
                                  期限: {task.due_date ? format(new Date(task.due_date), 'yyyy/MM/dd') : '未設定'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    await supabase
                                      .from('tasks')
                                      .update({ status: 'completed', actual_completion_date: new Date().toISOString() })
                                      .eq('id', task.id)
                                    await loadProjects()
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white text-base font-medium rounded hover:bg-green-700 transition-colors"
                                >
                                  完了
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 今日期限のタスク */}
                {dueTodayTasks.length > 0 && (
                  <div className="bg-white rounded-lg border-2 border-yellow-400 shadow-pastel overflow-hidden">
                    <div className="p-3 bg-yellow-100 border-b-2 border-yellow-400">
                      <h4 className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                        ⏰ 今日期限のタスク ({dueTodayTasks.length})
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {dueTodayTasks.map(task => {
                        const project = projects.find(p => p.id === task.project_id)

                        return (
                          <div key={task.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h5 className="font-bold text-lg text-gray-900 mb-2">{task.title}</h5>
                                {project && (
                                  <p className="text-base text-gray-700 mb-1">
                                    案件: {project.customer?.names?.join('・') || '不明'}様邸
                                  </p>
                                )}
                                <p className="text-base text-gray-600">
                                  期限: {task.due_date ? format(new Date(task.due_date), 'yyyy/MM/dd') : '未設定'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    await supabase
                                      .from('tasks')
                                      .update({ status: 'completed', actual_completion_date: new Date().toISOString() })
                                      .eq('id', task.id)
                                    await loadProjects()
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white text-base font-medium rounded hover:bg-green-700 transition-colors"
                                >
                                  完了
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 進行中のタスク */}
                {inProgressTasks.length > 0 && (
                  <div className="bg-white rounded-lg border-2 border-blue-400 shadow-pastel overflow-hidden">
                    <div className="p-3 bg-blue-100 border-b-2 border-blue-400">
                      <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        🔄 進行中のタスク ({inProgressTasks.length})
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {inProgressTasks.map(task => {
                        const project = projects.find(p => p.id === task.project_id)

                        return (
                          <div key={task.id} className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h5 className="font-bold text-lg text-gray-900 mb-2">{task.title}</h5>
                                {project && (
                                  <p className="text-base text-gray-700 mb-1">
                                    案件: {project.customer?.names?.join('・') || '不明'}様邸
                                  </p>
                                )}
                                <p className="text-base text-gray-600">
                                  期限: {task.due_date ? format(new Date(task.due_date), 'yyyy/MM/dd') : '未設定'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    await supabase
                                      .from('tasks')
                                      .update({ status: 'completed', actual_completion_date: new Date().toISOString() })
                                      .eq('id', task.id)
                                    await loadProjects()
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white text-base font-medium rounded hover:bg-green-700 transition-colors"
                                >
                                  完了
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* タスクが1つもない場合 */}
                {delayedTasks.length === 0 && dueTodayTasks.length === 0 && inProgressTasks.length === 0 && (
                  <div className="bg-white rounded-lg border-2 border-gray-300 shadow-pastel p-8 text-center">
                    <p className="text-gray-500 text-lg">現在、割り当てられているタスクはありません</p>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* 部署ステータス表示（1行4部署） */}
      <div className="grid grid-cols-4 gap-3">
        {departmentStatuses.map(dept => (
          <div
            key={dept.department}
            onClick={() => handleDepartmentClick(dept.department)}
            className={`bg-white rounded-lg border-2 shadow-pastel p-4 cursor-pointer hover:shadow-lg transition-shadow ${
              dept.status === 'normal' ? 'border-blue-300' :
              dept.status === 'warning' ? 'border-yellow-300' :
              'border-red-300'
            }`}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">{dept.department}</h3>
            <p className={`text-center text-base font-bold ${
              dept.status === 'normal' ? 'text-blue-900' :
              dept.status === 'warning' ? 'text-yellow-900' :
              'text-red-900'
            }`}>
              {dept.status === 'normal' && '完了'}
              {dept.status === 'warning' && '着手中'}
              {dept.status === 'delayed' && '遅れ'}
            </p>
            {dept.delayedCount > 0 && (
              <p className="text-center text-base text-red-600 font-bold mt-1">
                {dept.delayedCount}件遅延
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 月別統計 */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="p-4 bg-gradient-pastel-blue border-b-2 border-pastel-blue">
          <h3 className="text-xl font-semibold text-pastel-blue-dark">月別統計（{fiscalYear}年度）</h3>
          <p className="text-base text-gray-600 mt-1">{fiscalYear}年8月 〜 {fiscalYear + 1}年7月</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left font-bold text-gray-900">月</th>
                <th className="px-4 py-3 text-right font-bold text-gray-900">契約数</th>
                <th className="px-4 py-3 text-right font-bold text-gray-900">着工数</th>
                <th className="px-4 py-3 text-right font-bold text-gray-900">引き渡し数</th>
                <th className="px-4 py-3 text-right font-bold text-gray-900">入金額</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map((stat, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {stat.year}年{stat.month}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 rounded-full font-semibold">
                      {stat.contractCount}件
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-900 rounded-full font-semibold">
                      {stat.constructionStartCount}件
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-900 rounded-full font-semibold">
                      {stat.handoverCount}件
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-900 rounded-full font-semibold">
                      ¥{(stat.scheduledAmount + stat.actualAmount).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td className="px-4 py-3 text-gray-900">合計</td>
                <td className="px-4 py-3 text-right text-blue-900">
                  {monthlyStats.reduce((sum, stat) => sum + stat.contractCount, 0)}件
                </td>
                <td className="px-4 py-3 text-right text-green-900">
                  {monthlyStats.reduce((sum, stat) => sum + stat.constructionStartCount, 0)}件
                </td>
                <td className="px-4 py-3 text-right text-purple-900">
                  {monthlyStats.reduce((sum, stat) => sum + stat.handoverCount, 0)}件
                </td>
                <td className="px-4 py-3 text-right text-yellow-900">
                  ¥{monthlyStats.reduce((sum, stat) => sum + stat.scheduledAmount + stat.actualAmount, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 管理者モード: スタッフ負荷状況 */}
      {viewMode !== 'personal' && (
        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel overflow-hidden">
          <div className="p-4 bg-gradient-pastel-blue border-b-2 border-pastel-blue">
            <h3 className="text-xl font-semibold text-pastel-blue-dark">スタッフ負荷状況</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-4">
              {employees
                .filter(emp => {
                  // タスクが割り当てられている従業員のみ表示
                  const empTasks = tasks.filter(task => task.assigned_to === emp.id)
                  return empTasks.length > 0
                })
                .map(emp => {
                  const empTasks = tasks.filter(task => task.assigned_to === emp.id)
                  const delayedTasks = empTasks.filter(task => {
                    if (!task.due_date || task.status === 'completed' || task.status === 'not_applicable') return false
                    const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
                    return daysOverdue > 0
                  })
                  const inProgressTasks = empTasks.filter(task =>
                    task.status !== 'completed' && task.status !== 'not_applicable'
                  )
                  const totalTasks = empTasks.length
                  const completedTasks = empTasks.filter(task => task.status === 'completed' || task.status === 'not_applicable').length

                  // 負荷レベル判定
                  const delayCount = delayedTasks.length
                  let loadLevel: 'normal' | 'warning' | 'danger' = 'normal'
                  if (delayCount >= 5) {
                    loadLevel = 'danger'
                  } else if (delayCount >= 2) {
                    loadLevel = 'warning'
                  }

                  return (
                    <div
                      key={emp.id}
                      className={`bg-white rounded-lg border-2 shadow-md p-4 ${
                        loadLevel === 'danger' ? 'border-red-500 bg-red-50' :
                        loadLevel === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-300 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          loadLevel === 'danger' ? 'bg-red-500' :
                          loadLevel === 'warning' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>
                          <span className="text-white font-bold text-lg">
                            {emp.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-lg text-gray-900">{emp.last_name} {emp.first_name}</div>
                          <div className="text-base text-gray-600">{emp.department}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {/* 遅延タスク数 */}
                        {delayedTasks.length > 0 && (
                          <div className="flex items-center justify-between bg-red-100 border border-red-300 rounded px-3 py-2">
                            <span className="text-base font-medium text-red-900">🚨 遅延</span>
                            <span className="text-xl font-bold text-red-900">{delayedTasks.length}</span>
                          </div>
                        )}

                        {/* 進行中タスク数 */}
                        <div className="flex items-center justify-between bg-blue-100 border border-blue-300 rounded px-3 py-2">
                          <span className="text-base font-medium text-blue-900">🔄 進行中</span>
                          <span className="text-xl font-bold text-blue-900">{inProgressTasks.length}</span>
                        </div>

                        {/* 完了率 */}
                        <div className="bg-gray-100 rounded px-3 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base font-medium text-gray-700">完了率</span>
                            <span className="text-base font-bold text-gray-900">
                              {Math.round((completedTasks / totalTasks) * 100)}%
                            </span>
                          </div>
                          <div className="bg-gray-300 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* 総タスク数 */}
                        <div className="text-center text-base text-gray-600 pt-1">
                          総タスク数: {totalTasks}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* 新規案件作成モーダル */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-canva max-w-2xl w-full">
            {/* ヘッダー */}
            <div className="modal-canva-header flex items-center justify-between">
              <h2 className="text-2xl font-bold">新規案件追加</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="modal-canva-content space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* 顧客情報 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">顧客情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      顧客名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerNames}
                      onChange={(e) => setFormData({ ...formData, customerNames: e.target.value })}
                      placeholder="例: 山田太郎・花子"
                      className="input-canva w-full"
                    />
                    <p className="text-base text-gray-500 mt-1">複数名の場合は「・」で区切ってください</p>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      建設地 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.buildingSite}
                      onChange={(e) => setFormData({ ...formData, buildingSite: e.target.value })}
                      placeholder="例: 東京都渋谷区〇〇1-2-3"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 案件情報 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">案件情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">契約日</label>
                    <input
                      type="date"
                      value={formData.contractDate}
                      onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">商品</label>
                    <select
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未設定</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">ステータス</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="post_contract">契約後</option>
                      <option value="construction">着工後</option>
                      <option value="completed">引き渡し済</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">進捗率 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progressRate}
                      onChange={(e) => setFormData({ ...formData, progressRate: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 担当者 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">担当者</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">営業</label>
                    <select
                      value={formData.assignedSales}
                      onChange={(e) => setFormData({ ...formData, assignedSales: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未設定</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">意匠設計</label>
                    <select
                      value={formData.assignedDesign}
                      onChange={(e) => setFormData({ ...formData, assignedDesign: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未設定</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">工事担当</label>
                    <select
                      value={formData.assignedConstruction}
                      onChange={(e) => setFormData({ ...formData, assignedConstruction: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未設定</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last_name} {emp.first_name} ({emp.department})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="modal-canva-footer">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="prisma-btn prisma-btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateProject}
                className="prisma-btn prisma-btn-primary flex-1"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 部署遅延詳細モーダル */}
      {showDepartmentDetailModal && selectedDepartment && (
        <div className="modal-overlay" onClick={() => setShowDepartmentDetailModal(false)}>
          <div className="modal-canva max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="modal-canva-header">
              <h2 className="text-2xl font-bold">{selectedDepartment} - 遅延詳細</h2>
              <button
                onClick={() => setShowDepartmentDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-6">
              {(() => {
                const delayDetails = getDepartmentDelayDetails(selectedDepartment)

                if (delayDetails.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-lg text-gray-600">遅延しているタスクはありません</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    <p className="text-base text-gray-600 mb-4">
                      {viewMode === 'personal' ? '自分の担当案件の遅延タスク' : '全案件の遅延タスク'}
                    </p>
                    <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
                      <table className="w-full text-base">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">職種</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">遅延件数</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {delayDetails.map((detail, index) => (
                            <tr key={detail.employeeId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 text-gray-900 font-bold">{detail.department}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-block px-3 py-1 bg-red-100 text-red-900 rounded-full font-bold">
                                  {detail.delayedCount}件
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* フッター */}
            <div className="modal-canva-footer">
              <button
                onClick={() => setShowDepartmentDetailModal(false)}
                className="prisma-btn prisma-btn-primary flex-1"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
