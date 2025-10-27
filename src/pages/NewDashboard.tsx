/**
 * 新ダッシュボード
 *
 * 要件に基づいた各種グラフ・統計を表示
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project, Payment, Task, Employee, Branch } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { differenceInDays } from 'date-fns'
import { useMode } from '../contexts/ModeContext'
import { useFiscalYear } from '../contexts/FiscalYearContext'
import { useSettings } from '../contexts/SettingsContext'
import { useToast } from '../contexts/ToastContext'
import { generateDemoProjects, generateDemoPayments, generateDemoTasks, generateDemoEmployees } from '../utils/demoData'
import { Settings } from 'lucide-react'

interface MonthlyStats {
  month: string
  contracts: number
  changeContracts: number
  construction: number
  handover: number
  scheduledPayment: number
  actualPayment: number
  grossProfit: number
}

interface BranchStats {
  branchId: string
  branchName: string
  employeeCount: number
  contractCount: number
  revenue: number
  grossProfit: number
  grossProfitRate: number
  ongoingProjects: number
  contractsPerEmployee: number
  revenuePerEmployee: number
}

export default function NewDashboard() {
  const { mode } = useMode()
  const { selectedYear } = useFiscalYear()
  const { demoMode } = useSettings()
  const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchStats, setBranchStats] = useState<BranchStats[]>([])
  const [loading, setLoading] = useState(true)

  // 統計データ
  const [expectedCompletionCount, setExpectedCompletionCount] = useState(0)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [delayedTaskCount, setDelayedTaskCount] = useState(0)
  const [productComposition, setProductComposition] = useState<any[]>([])
  const [avgFloorArea, setAvgFloorArea] = useState(0)
  const [avgContractAmount, setAvgContractAmount] = useState(0)
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)

  // 平均日数統計
  const [avgDaysContractToPermission, setAvgDaysContractToPermission] = useState(0)
  const [avgDaysConstructionToInspection, setAvgDaysConstructionToInspection] = useState(0)
  const [avgDaysContractToHandover, setAvgDaysContractToHandover] = useState(0)
  const [countContractToPermission, setCountContractToPermission] = useState(0)
  const [countConstructionToInspection, setCountConstructionToInspection] = useState(0)
  const [countContractToHandover, setCountContractToHandover] = useState(0)

  // 目標値
  const [targetRevenue, setTargetRevenue] = useState(0)
  const [targetUnits, setTargetUnits] = useState(0)
  const [targetGrossProfit, setTargetGrossProfit] = useState(0)

  // モーダル管理
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editTargetRevenue, setEditTargetRevenue] = useState('')
  const [editTargetUnits, setEditTargetUnits] = useState('')
  const [editTargetGrossProfit, setEditTargetGrossProfit] = useState('')

  useEffect(() => {
    loadData()
    loadTargets()
    loadBranches()
  }, [selectedYear, mode, demoMode])

  const loadTargets = () => {
    if (demoMode) {
      // デモモード：デフォルト目標値を設定
      setTargetRevenue(7500000000) // 75億円
      setTargetUnits(250) // 250棟
      setTargetGrossProfit(1500000000) // 15億円（粗利率20%想定）
      return
    }

    // 通常モード：LocalStorageから読み込み
    const savedTargetRevenue = localStorage.getItem(`target_revenue_${selectedYear}`)
    const savedTargetUnits = localStorage.getItem(`target_units_${selectedYear}`)
    const savedTargetGrossProfit = localStorage.getItem(`target_gross_profit_${selectedYear}`)

    setTargetRevenue(savedTargetRevenue ? parseFloat(savedTargetRevenue) : 0)
    setTargetUnits(savedTargetUnits ? parseInt(savedTargetUnits) : 0)
    setTargetGrossProfit(savedTargetGrossProfit ? parseFloat(savedTargetGrossProfit) : 0)
  }

  const saveTargets = () => {
    const revenue = parseFloat(editTargetRevenue) || 0
    const units = parseInt(editTargetUnits) || 0
    const grossProfit = parseFloat(editTargetGrossProfit) || 0

    try {
      localStorage.setItem(`target_revenue_${selectedYear}`, revenue.toString())
      localStorage.setItem(`target_units_${selectedYear}`, units.toString())
      localStorage.setItem(`target_gross_profit_${selectedYear}`, grossProfit.toString())

      setTargetRevenue(revenue)
      setTargetUnits(units)
      setTargetGrossProfit(grossProfit)
      setShowSettingsModal(false)
    } catch (error) {
      console.error('目標値の保存エラー:', error)
      toast.error('目標値の保存に失敗しました')
    }
  }

  const openSettingsModal = () => {
    setEditTargetRevenue(targetRevenue.toString())
    setEditTargetUnits(targetUnits.toString())
    setEditTargetGrossProfit(targetGrossProfit.toString())
    setShowSettingsModal(true)
  }

  const loadBranches = async () => {
    // 固定の拠点リスト
    setBranches([
      { id: '1', name: '本部', created_at: '', updated_at: '' },
      { id: '2', name: '豊中', created_at: '', updated_at: '' },
      { id: '3', name: '奈良', created_at: '', updated_at: '' },
      { id: '4', name: '京都', created_at: '', updated_at: '' },
      { id: '5', name: '西宮', created_at: '', updated_at: '' }
    ])
  }

  const calculateBranchStats = (projects: Project[], payments: Payment[], employees: Employee[]) => {
    const stats: BranchStats[] = branches.map(branch => {
      // 拠点ごとのプロジェクトを抽出（営業担当者の拠点で判定）
      const branchProjects = projects.filter(p => {
        // sales_staffリレーションから拠点を取得
        if (p.sales_staff && p.sales_staff.branch_id === branch.id) {
          return true
        }
        // sales_staffがない場合、sales（旧フィールド）で判定
        if (p.sales && p.sales.branch_id === branch.id) {
          return true
        }
        return false
      })

      // 拠点の従業員数
      const branchEmployees = employees.filter(emp => emp.branch_id === branch.id)
      const employeeCount = branchEmployees.length

      // 契約数
      const contractCount = branchProjects.length

      // 進行中案件数（完了以外）
      const ongoingProjects = branchProjects.filter(p => p.status !== 'completed').length

      // 売上高（契約金額の合計）
      const revenue = branchProjects.reduce((sum, p) => sum + (p.contract_amount || 0), 0)

      // 粗利益（gross_profitフィールドがあればそれを使用、なければ契約金額の20%と仮定）
      const grossProfit = branchProjects.reduce((sum, p) => {
        if (p.gross_profit !== undefined && p.gross_profit !== null) {
          return sum + p.gross_profit
        }
        // gross_profitがない場合は契約金額の20%と仮定
        return sum + (p.contract_amount || 0) * 0.2
      }, 0)

      // 粗利益率
      const grossProfitRate = revenue > 0 ? (grossProfit / revenue) * 100 : 0

      // 1人あたり指標
      const contractsPerEmployee = employeeCount > 0 ? contractCount / employeeCount : 0
      const revenuePerEmployee = employeeCount > 0 ? revenue / employeeCount : 0

      return {
        branchId: branch.id,
        branchName: branch.name,
        employeeCount,
        contractCount,
        revenue,
        grossProfit,
        grossProfitRate,
        ongoingProjects,
        contractsPerEmployee,
        revenuePerEmployee
      }
    })

    setBranchStats(stats)
  }

  const loadData = async () => {
    setLoading(true)

    // デモモードの場合はサンプルデータを使用
    if (demoMode) {
      const demoProjects = generateDemoProjects(mode as 'my_tasks' | 'branch' | 'admin')
      const demoPayments = generateDemoPayments(mode as 'my_tasks' | 'branch' | 'admin')
      const demoTasks = generateDemoTasks(mode as 'my_tasks' | 'branch' | 'admin')
      const demoEmployees = generateDemoEmployees()

      setProjects(demoProjects)
      setPayments(demoPayments)
      setTasks(demoTasks)
      setCurrentEmployee(demoEmployees[0]) // 最初の従業員をカレントユーザーとして使用

      // 統計を計算
      setEmployees(demoEmployees)
      calculateStats(demoProjects, demoPayments, demoTasks)
      calculateBranchStats(demoProjects, demoPayments, demoEmployees)
      setLoading(false)
      return
    }

    // 通常モード：Supabaseからデータを取得
    // 現在の従業員を取得
    const employeeId = localStorage.getItem('selectedEmployeeId')
    if (employeeId) {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .maybeSingle()

      if (employeeError) {
        console.error('従業員データ読み込みエラー:', employeeError)
        toast.error('従業員データの読み込みに失敗しました')
        return
      }

      setCurrentEmployee(employee)
    }

    // 年度のプロジェクトを取得
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*, customer:customers(*), product:products(*)')
      .eq('fiscal_year', selectedYear)

    if (projectsError) {
      console.error('プロジェクトデータ読み込みエラー:', projectsError)
      toast.error('プロジェクトデータの読み込みに失敗しました')
      setLoading(false)
      return
    }

    // モードに応じたフィルタリング（後で実装）
    const filteredProjects = projectsData || []
    setProjects(filteredProjects)

    // 入金データを取得
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .in('project_id', filteredProjects.map(p => p.id))

    if (paymentsError) {
      console.error('入金データ読み込みエラー:', paymentsError)
      toast.error('入金データの読み込みに失敗しました')
    }

    setPayments(paymentsData || [])

    // タスクデータを取得
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('project_id', filteredProjects.map(p => p.id))

    if (tasksError) {
      console.error('タスクデータ読み込みエラー:', tasksError)
      toast.error('タスクデータの読み込みに失敗しました')
    }

    setTasks(tasksData || [])

    // 従業員データを取得
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('*')

    if (employeesError) {
      console.error('従業員データ読み込みエラー:', employeesError)
    }

    setEmployees(employeesData || [])

    // 統計を計算
    calculateStats(filteredProjects, paymentsData || [], tasksData || [])
    calculateBranchStats(filteredProjects, paymentsData || [], employeesData || [])

    setLoading(false)
  }

  const calculateStats = (projects: Project[], payments: Payment[], tasks: Task[]) => {
    // 完工予定数（カウント除外フラグがfalseのもの）
    const completionCount = projects.filter(p => !p.exclude_from_count).length
    setExpectedCompletionCount(completionCount)

    // 月次統計を計算（8月～7月）
    const months = ['8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月', '7月']
    const stats: MonthlyStats[] = months.map((month, index) => {
      const monthNum = index >= 5 ? index - 4 : index + 8
      const year = parseInt(selectedYear) + (index >= 5 ? 1 : 0)

      // その月のプロジェクトをフィルタ
      const monthProjects = projects.filter(p => {
        const contractDate = new Date(p.contract_date)
        return contractDate.getMonth() + 1 === monthNum && contractDate.getFullYear() === year
      })

      // 契約数
      const contracts = monthProjects.length

      // 変更契約数（仮：実装が必要）
      const changeContracts = 0

      // 着工数
      const construction = projects.filter(p => {
        if (!p.construction_start_date) return false
        const startDate = new Date(p.construction_start_date)
        return startDate.getMonth() + 1 === monthNum && startDate.getFullYear() === year
      }).length

      // 引き渡し数
      const handover = projects.filter(p => {
        if (!p.handover_date) return false
        const handoverDate = new Date(p.handover_date)
        return handoverDate.getMonth() + 1 === monthNum && handoverDate.getFullYear() === year
      }).length

      // 入金予定・実績
      const monthPayments = payments.filter(pay => {
        if (pay.scheduled_date) {
          const schedDate = new Date(pay.scheduled_date)
          if (schedDate.getMonth() + 1 === monthNum && schedDate.getFullYear() === year) return true
        }
        if (pay.actual_date) {
          const actDate = new Date(pay.actual_date)
          if (actDate.getMonth() + 1 === monthNum && actDate.getFullYear() === year) return true
        }
        return false
      })

      const scheduledPayment = monthPayments.reduce((sum, p) => sum + (p.scheduled_amount || 0), 0)
      const actualPayment = monthPayments.reduce((sum, p) => sum + (p.actual_amount || 0), 0)

      // 粗利益高（税別）
      const grossProfit = monthProjects.reduce((sum, p) => sum + (p.gross_profit || 0), 0)

      return {
        month,
        contracts,
        changeContracts,
        construction,
        handover,
        scheduledPayment,
        actualPayment,
        grossProfit
      }
    })
    setMonthlyStats(stats)

    // 遅延タスク数
    const today = new Date()
    const delayedTasks = tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false
      return new Date(t.due_date) < today
    })
    setDelayedTaskCount(delayedTasks.length)

    // 商品構成（商品マスタから取得）
    const productCounts: { [key: string]: number } = {}
    projects.forEach(p => {
      const productName = p.product?.name || p.product_type || '不明'
      productCounts[productName] = (productCounts[productName] || 0) + 1
    })
    const total = projects.length
    const composition = Object.entries(productCounts).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
    }))
    setProductComposition(composition)

    // 平均坪数
    const totalFloorArea = projects.reduce((sum, p) => sum + (p.total_floor_area || 0), 0)
    setAvgFloorArea(projects.length > 0 ? totalFloorArea / projects.length : 0)

    // 平均契約金額
    const totalContractAmount = projects.reduce((sum, p) => sum + (p.contract_amount || 0), 0)
    setAvgContractAmount(projects.length > 0 ? totalContractAmount / projects.length : 0)

    // 契約～着工許可までの平均日数
    const projectsWithPermission = projects.filter(p => p.contract_date && p.construction_permission_date)
    const totalDaysToPermission = projectsWithPermission.reduce((sum, p) => {
      const days = differenceInDays(new Date(p.construction_permission_date!), new Date(p.contract_date))
      return sum + days
    }, 0)
    setAvgDaysContractToPermission(projectsWithPermission.length > 0 ? totalDaysToPermission / projectsWithPermission.length : 0)
    setCountContractToPermission(projectsWithPermission.length)

    // 着工～完了検査までの平均日数
    const projectsWithInspection = projects.filter(p => p.construction_start_date && p.completion_inspection_date)
    const totalDaysToInspection = projectsWithInspection.reduce((sum, p) => {
      const days = differenceInDays(new Date(p.completion_inspection_date!), new Date(p.construction_start_date!))
      return sum + days
    }, 0)
    setAvgDaysConstructionToInspection(projectsWithInspection.length > 0 ? totalDaysToInspection / projectsWithInspection.length : 0)
    setCountConstructionToInspection(projectsWithInspection.length)

    // 契約～引き渡しまでの平均日数
    const projectsWithHandover = projects.filter(p => p.contract_date && p.handover_date)
    const totalDaysToHandover = projectsWithHandover.reduce((sum, p) => {
      const days = differenceInDays(new Date(p.handover_date!), new Date(p.contract_date))
      return sum + days
    }, 0)
    setAvgDaysContractToHandover(projectsWithHandover.length > 0 ? totalDaysToHandover / projectsWithHandover.length : 0)
    setCountContractToHandover(projectsWithHandover.length)
  }

  if (loading) {
    return (
      <div className="prisma-content">
        <div className="prisma-empty">読み込み中...</div>
      </div>
    )
  }

  const totalScheduledPayment = monthlyStats.reduce((sum, s) => sum + s.scheduledPayment, 0)
  const totalActualPayment = monthlyStats.reduce((sum, s) => sum + s.actualPayment, 0)
  const totalGrossProfit = monthlyStats.reduce((sum, s) => sum + s.grossProfit, 0)
  const totalChangeContracts = monthlyStats.reduce((sum, s) => sum + s.changeContracts, 0)

  // 円グラフのカラーパレット
  const PIE_COLORS = ['#000000', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db']

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">ダッシュボード</h1>
        <div className="prisma-header-actions">
          <button
            onClick={openSettingsModal}
            className="prisma-btn prisma-btn-secondary prisma-btn-sm"
            title="目標値設定"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      <div className="prisma-content">
        {/* === 目標と実績サマリー（1枚のカードに統合） ===  */}
        <div className="prisma-card" style={{ marginBottom: '16px' }}>
          <h2 className="prisma-card-title flex items-center justify-between">
            <span>年度目標と実績サマリー</span>
            <span className="text-sm font-normal text-gray-500">{selectedYear}年度</span>
          </h2>
          <div className="mt-4">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b-3 border-gray-300">
                  <th className="px-4 py-3 text-left text-base font-bold text-gray-700">項目</th>
                  <th className="px-4 py-3 text-right text-base font-bold text-gray-700">目標</th>
                  <th className="px-4 py-3 text-right text-base font-bold text-gray-700">実績／予想</th>
                  <th className="px-4 py-3 text-right text-base font-bold text-gray-700">達成率</th>
                </tr>
              </thead>
              <tbody>
                {/* 売上高 */}
                <tr className="border-b-2 border-gray-200">
                  <td className="px-4 py-4 text-base font-bold text-gray-900">売上高（税別）</td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-gray-900">
                    {targetRevenue.toLocaleString()}円
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-blue-600">
                    {Math.floor(totalScheduledPayment / 1.1).toLocaleString()}円
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-bold">
                    <span className={`px-3 py-1 rounded ${
                      targetRevenue > 0 && ((totalScheduledPayment / 1.1) / targetRevenue) >= 1
                        ? 'bg-green-100 text-green-700'
                        : targetRevenue > 0 && ((totalScheduledPayment / 1.1) / targetRevenue) >= 0.8
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {targetRevenue > 0 ? Math.floor(((totalScheduledPayment / 1.1) / targetRevenue) * 100) : 0}%
                    </span>
                  </td>
                </tr>
                {/* 粗利益 */}
                <tr className="border-b-2 border-gray-200">
                  <td className="px-4 py-4 text-base font-bold text-gray-900">粗利益（税別）</td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-gray-900">
                    {targetGrossProfit.toLocaleString()}円
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-blue-600">
                    {Math.floor(totalGrossProfit).toLocaleString()}円
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-bold">
                    <span className={`px-3 py-1 rounded ${
                      targetGrossProfit > 0 && (totalGrossProfit / targetGrossProfit) >= 1
                        ? 'bg-green-100 text-green-700'
                        : targetGrossProfit > 0 && (totalGrossProfit / targetGrossProfit) >= 0.8
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {targetGrossProfit > 0 ? Math.floor((totalGrossProfit / targetGrossProfit) * 100) : 0}%
                    </span>
                  </td>
                </tr>
                {/* 完工棟数 */}
                <tr>
                  <td className="px-4 py-4 text-base font-bold text-gray-900">完工棟数</td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-gray-900">
                    {targetUnits}棟
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-blue-600">
                    {expectedCompletionCount}棟
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-bold">
                    <span className={`px-3 py-1 rounded ${
                      targetUnits > 0 && (expectedCompletionCount / targetUnits) >= 1
                        ? 'bg-green-100 text-green-700'
                        : targetUnits > 0 && (expectedCompletionCount / targetUnits) >= 0.8
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {targetUnits > 0 ? Math.floor((expectedCompletionCount / targetUnits) * 100) : 0}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* === 入金状況サマリー（1枚のカードに統合） ===  */}
        <div className="prisma-card" style={{ marginBottom: '16px' }}>
          <h2 className="prisma-card-title">入金状況</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 入金予定 */}
            <div>
              <div className="text-sm font-bold text-gray-600 mb-2">入金予定</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.floor(totalScheduledPayment).toLocaleString()}円
                <span className="text-sm font-normal text-gray-500 ml-2">（税込）</span>
              </div>
              <div className="text-base text-gray-600 mt-1">
                税別: {Math.floor(totalScheduledPayment / 1.1).toLocaleString()}円
              </div>
            </div>

            {/* 入金実績 */}
            <div>
              <div className="text-sm font-bold text-gray-600 mb-2">入金実績</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.floor(totalActualPayment).toLocaleString()}円
                <span className="text-sm font-normal text-gray-500 ml-2">（税込）</span>
              </div>
              <div className="text-base text-gray-600 mt-1">
                税別: {Math.floor(totalActualPayment / 1.1).toLocaleString()}円
              </div>
            </div>
          </div>
        </div>

        {/* === その他サマリーエリア ===  */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* 変更契約完了数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">変更契約完了数</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{totalChangeContracts}件</div>
          </div>

          {/* 遅れタスク数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">遅れタスク数</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{delayedTaskCount}件</div>
            {delayedTaskCount > 0 && (
              <div style={{ fontSize: '14px', color: '#ef4444', marginTop: '8px' }}>
                期限超過タスクがあります
              </div>
            )}
          </div>

          {/* 平均坪数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">平均坪数</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{avgFloorArea.toFixed(2)}坪</div>
          </div>

          {/* 平均契約金額 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">平均契約金額</h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{Math.floor(avgContractAmount).toLocaleString()}円</div>
            <div className="prisma-text-sm prisma-text-secondary" style={{ marginTop: '4px' }}>（税別: {Math.floor(avgContractAmount / 1.1).toLocaleString()}円）</div>
          </div>
        </div>

        {/* === 平均日数統計エリア === */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* 契約～着工許可までの平均日数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">契約～着工許可</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#2563EB' }}>
              {countContractToPermission > 0 ? Math.round(avgDaysContractToPermission) : '-'}日
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              平均日数 (N={countContractToPermission})
            </div>
          </div>

          {/* 着工～完了検査までの平均日数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">着工～完了検査</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#2563EB' }}>
              {countConstructionToInspection > 0 ? Math.round(avgDaysConstructionToInspection) : '-'}日
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              平均日数 (N={countConstructionToInspection})
            </div>
          </div>

          {/* 契約～引き渡しまでの平均日数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">契約～引き渡し</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#2563EB' }}>
              {countContractToHandover > 0 ? Math.round(avgDaysContractToHandover) : '-'}日
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              平均日数 (N={countContractToHandover})
            </div>
          </div>
        </div>

        {/* === 商品構成（円グラフ） ===  */}
        <div className="prisma-card" style={{ marginBottom: '16px' }}>
          <h2 className="prisma-card-title">商品構成</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '32px', marginTop: '16px' }}>
            {/* 円グラフ */}
            <ResponsiveContainer width={300} height={300}>
              <PieChart>
                <Pie
                  data={productComposition}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.count}件 (${entry.percentage}%)`}
                  labelLine={true}
                >
                  {productComposition.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}件`} />
              </PieChart>
            </ResponsiveContainer>

            {/* 凡例 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {productComposition.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: PIE_COLORS[index % PIE_COLORS.length], borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.name}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>{item.count}件 ({item.percentage}%)</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px' }}></div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>合計</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {productComposition.reduce((sum, item) => sum + item.count, 0)}件 (100.0%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === グラフエリア（2列グリッドレイアウト） === */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '16px' }}>
          {/* 請負契約数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">請負契約数</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="contracts" fill="#000000" name="請負契約数" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.reduce((sum, s) => sum + s.contracts, 0)}件
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1].contracts : 0}件
                </div>
              </div>
            </div>
          </div>

          {/* 変更契約数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">変更契約数</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="changeContracts" fill="#4b5563" name="変更契約数" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.reduce((sum, s) => sum + s.changeContracts, 0)}件
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1].changeContracts : 0}件
                </div>
              </div>
            </div>
          </div>

          {/* 着工数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">着工数</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="construction" fill="#000000" name="着工数" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.reduce((sum, s) => sum + s.construction, 0)}件
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1].construction : 0}件
                </div>
              </div>
            </div>
          </div>

          {/* 引き渡し数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">引き渡し数</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="handover" fill="#000000" name="引き渡し数" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Q1 (8-10月)</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {monthlyStats.slice(0, 3).reduce((sum, s) => sum + s.handover, 0)}棟
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Q2 (11-1月)</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {monthlyStats.slice(3, 6).reduce((sum, s) => sum + s.handover, 0)}棟
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Q3 (2-4月)</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {monthlyStats.slice(6, 9).reduce((sum, s) => sum + s.handover, 0)}棟
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Q4 (5-7月)</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {monthlyStats.slice(9, 12).reduce((sum, s) => sum + s.handover, 0)}棟
                </div>
              </div>
              <div style={{ textAlign: 'center', width: '100%', paddingTop: '8px', borderTop: '1px solid #d1d5db' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.reduce((sum, s) => sum + s.handover, 0)}棟
                </div>
              </div>
            </div>
          </div>

          {/* 入金予定・実績 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">入金予定・実績（月次推移）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => Math.floor(value).toLocaleString() + '円'} />
                <Legend />
                <Bar dataKey="scheduledPayment" fill="#2563eb" name="予定（税込）" />
                <Bar dataKey="actualPayment" fill="#dc2626" name="実績（税込）" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計（予定）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                  {Math.floor(monthlyStats.reduce((sum, s) => sum + s.scheduledPayment, 0)).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計（実績）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                  {Math.floor(monthlyStats.reduce((sum, s) => sum + s.actualPayment, 0)).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月（予定）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                  {monthlyStats.length > 0 ? Math.floor(monthlyStats[monthlyStats.length - 1].scheduledPayment).toLocaleString() : '0'}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月（実績）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                  {monthlyStats.length > 0 ? Math.floor(monthlyStats[monthlyStats.length - 1].actualPayment).toLocaleString() : '0'}円
                </div>
              </div>
            </div>
          </div>

          {/* 粗利益高 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">粗利益高（月次推移）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => Math.floor(value).toLocaleString() + '円'} />
                <Legend />
                <Bar dataKey="grossProfit" fill="#000000" name="粗利益高" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {Math.floor(monthlyStats.reduce((sum, s) => sum + s.grossProfit, 0)).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.length > 0 ? Math.floor(monthlyStats[monthlyStats.length - 1].grossProfit).toLocaleString() : '0'}円
                </div>
              </div>
            </div>
          </div>

          {/* 拠点別経営状況 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">拠点別経営状況（独立採算確認）</h2>

            {/* 全社サマリー */}
            <div className="mt-4 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📊 全社サマリー</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-3 border-blue-400">
                  <div className="text-sm text-gray-600 mb-1">総従業員数</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {branchStats.reduce((sum, s) => sum + s.employeeCount, 0)}人
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-3 border-green-400">
                  <div className="text-sm text-gray-600 mb-1">総契約数</div>
                  <div className="text-2xl font-bold text-green-900">
                    {branchStats.reduce((sum, s) => sum + s.contractCount, 0)}棟
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-3 border-purple-400">
                  <div className="text-sm text-gray-600 mb-1">進行中案件</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {branchStats.reduce((sum, s) => sum + s.ongoingProjects, 0)}件
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-3 border-yellow-400">
                  <div className="text-sm text-gray-600 mb-1">総売上高</div>
                  <div className="text-xl font-bold text-yellow-900">
                    ¥{Math.floor(branchStats.reduce((sum, s) => sum + s.revenue, 0) / 100000000).toLocaleString()}億
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border-3 border-emerald-400">
                  <div className="text-sm text-gray-600 mb-1">総粗利益</div>
                  <div className="text-xl font-bold text-emerald-900">
                    ¥{Math.floor(branchStats.reduce((sum, s) => sum + s.grossProfit, 0) / 10000000).toLocaleString()}千万
                  </div>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg border-3 border-rose-400">
                  <div className="text-sm text-gray-600 mb-1">全社粗利率</div>
                  <div className="text-2xl font-bold text-rose-900">
                    {branchStats.reduce((sum, s) => sum + s.revenue, 0) > 0
                      ? ((branchStats.reduce((sum, s) => sum + s.grossProfit, 0) / branchStats.reduce((sum, s) => sum + s.revenue, 0)) * 100).toFixed(1)
                      : '0.0'}%
                  </div>
                </div>
              </div>
            </div>

            {/* 各拠点カード */}
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🏢 各拠点の状況</h3>
              {branchStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">拠点データがありません</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {branchStats.map(stat => (
                    <div key={stat.branchId} className="bg-white rounded-lg border-4 border-gray-300 shadow-lg overflow-hidden">
                      {/* 拠点名ヘッダー */}
                      <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-5 py-4 border-b-4 border-gray-300">
                        <h4 className="text-xl font-bold text-gray-900">{stat.branchName}</h4>
                      </div>

                      {/* 指標 */}
                      <div className="p-5 space-y-3">
                        {/* 従業員数 */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <span className="text-sm font-bold text-gray-700">従業員数</span>
                          <span className="text-lg font-bold text-blue-900">{stat.employeeCount}人</span>
                        </div>

                        {/* 契約数 */}
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200">
                          <span className="text-sm font-bold text-gray-700">契約数</span>
                          <span className="text-lg font-bold text-green-900">{stat.contractCount}棟</span>
                        </div>

                        {/* 進行中案件 */}
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <span className="text-sm font-bold text-gray-700">進行中案件</span>
                          <span className="text-lg font-bold text-purple-900">{stat.ongoingProjects}件</span>
                        </div>

                        {/* 売上高 */}
                        <div className="p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                          <div className="text-sm font-bold text-gray-700 mb-1">売上高</div>
                          <div className="text-xl font-bold text-yellow-900">
                            ¥{Math.floor(stat.revenue / 10000).toLocaleString()}万
                          </div>
                        </div>

                        {/* 粗利益 */}
                        <div className="p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                          <div className="text-sm font-bold text-gray-700 mb-1">粗利益</div>
                          <div className="text-xl font-bold text-emerald-900">
                            ¥{Math.floor(stat.grossProfit / 10000).toLocaleString()}万
                          </div>
                        </div>

                        {/* 粗利益率 */}
                        <div className={`p-3 rounded-lg border-3 ${
                          stat.grossProfitRate >= 15 ? 'bg-green-50 border-green-400' :
                          stat.grossProfitRate >= 10 ? 'bg-yellow-50 border-yellow-400' :
                          'bg-red-50 border-red-400'
                        }`}>
                          <div className="text-sm font-bold text-gray-700 mb-1">粗利益率</div>
                          <div className={`text-2xl font-bold ${
                            stat.grossProfitRate >= 15 ? 'text-green-900' :
                            stat.grossProfitRate >= 10 ? 'text-yellow-900' :
                            'text-red-900'
                          }`}>
                            {stat.grossProfitRate.toFixed(1)}%
                          </div>
                        </div>

                        {/* 1人あたり指標 */}
                        <div className="pt-3 border-t-2 border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-600">1人あたり契約数</span>
                            <span className="text-base font-bold text-gray-900">
                              {stat.contractsPerEmployee.toFixed(1)}棟/人
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">1人あたり売上</span>
                            <span className="text-base font-bold text-gray-900">
                              ¥{Math.floor(stat.revenuePerEmployee / 10000).toLocaleString()}万/人
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>粗利益率の目安：</strong>
                  <span className="text-green-600 font-bold ml-2">15%以上（良好）</span>
                  <span className="text-yellow-600 font-bold ml-2">10-15%（標準）</span>
                  <span className="text-red-600 font-bold ml-2">10%未満（要改善）</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === 目標値設定モーダル === */}
      {showSettingsModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal" style={{ maxWidth: '600px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <h2 className="prisma-modal-title">目標値設定 ({selectedYear}年度)</h2>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  目標売上高（税別）
                </label>
                <input
                  type="number"
                  value={editTargetRevenue}
                  onChange={(e) => setEditTargetRevenue(e.target.value)}
                  placeholder="例: 500000000"
                  className="prisma-input"
                />
              </div>

              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  目標粗利益高（税別）
                </label>
                <input
                  type="number"
                  value={editTargetGrossProfit}
                  onChange={(e) => setEditTargetGrossProfit(e.target.value)}
                  placeholder="例: 100000000"
                  className="prisma-input"
                />
              </div>

              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  目標完工棟数
                </label>
                <input
                  type="number"
                  value={editTargetUnits}
                  onChange={(e) => setEditTargetUnits(e.target.value)}
                  placeholder="例: 250"
                  className="prisma-input"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="prisma-btn prisma-btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={saveTargets}
                className="prisma-btn prisma-btn-primary flex-1"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
