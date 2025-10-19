/**
 * 新ダッシュボード
 *
 * 要件に基づいた各種グラフ・統計を表示
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project, Payment, Task, Employee } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useMode } from '../contexts/ModeContext'
import { useFiscalYear } from '../contexts/FiscalYearContext'
import { useSettings } from '../contexts/SettingsContext'
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

export default function NewDashboard() {
  const { mode } = useMode()
  const { selectedYear } = useFiscalYear()
  const { demoMode } = useSettings()
  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // 統計データ
  const [expectedCompletionCount, setExpectedCompletionCount] = useState(0)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [delayedTaskCount, setDelayedTaskCount] = useState(0)
  const [productComposition, setProductComposition] = useState<any[]>([])
  const [avgFloorArea, setAvgFloorArea] = useState(0)
  const [avgContractAmount, setAvgContractAmount] = useState(0)
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)

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

    localStorage.setItem(`target_revenue_${selectedYear}`, revenue.toString())
    localStorage.setItem(`target_units_${selectedYear}`, units.toString())
    localStorage.setItem(`target_gross_profit_${selectedYear}`, grossProfit.toString())

    setTargetRevenue(revenue)
    setTargetUnits(units)
    setTargetGrossProfit(grossProfit)
    setShowSettingsModal(false)
  }

  const openSettingsModal = () => {
    setEditTargetRevenue(targetRevenue.toString())
    setEditTargetUnits(targetUnits.toString())
    setEditTargetGrossProfit(targetGrossProfit.toString())
    setShowSettingsModal(true)
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
      calculateStats(demoProjects, demoPayments, demoTasks)
      setLoading(false)
      return
    }

    // 通常モード：Supabaseからデータを取得
    // 現在の従業員を取得
    const employeeId = localStorage.getItem('selectedEmployeeId')
    if (employeeId) {
      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()
      setCurrentEmployee(employee)
    }

    // 年度のプロジェクトを取得
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, customer:customers(*), product:products(*)')
      .eq('fiscal_year', selectedYear)

    // モードに応じたフィルタリング（後で実装）
    const filteredProjects = projectsData || []
    setProjects(filteredProjects)

    // 入金データを取得
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .in('project_id', filteredProjects.map(p => p.id))
    setPayments(paymentsData || [])

    // タスクデータを取得
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .in('project_id', filteredProjects.map(p => p.id))
    setTasks(tasksData || [])

    // 統計を計算
    calculateStats(filteredProjects, paymentsData || [], tasksData || [])

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

    // 商品構成
    const productCounts: { [key: string]: number } = {}
    projects.forEach(p => {
      const productType = p.product_type || '不明'
      productCounts[productType] = (productCounts[productType] || 0) + 1
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
        {/* === 目標と実績を上下で比較しやすいレイアウト（3列グリッド） ===  */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {/* 第1列：売上高 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 目標売上高 */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">目標売上高（税別）</h2>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                {targetRevenue.toLocaleString()}円
              </div>
            </div>

            {/* 予定売上高 */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">予定売上高（税別）</h2>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                {Math.floor(totalScheduledPayment / 1.1).toLocaleString()}円
              </div>
              {targetRevenue > 0 && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                  達成率: {(((totalScheduledPayment / 1.1) / targetRevenue) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          {/* 第2列：粗利益高 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 目標粗利益高 */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">目標粗利益高（税別）</h2>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                {targetGrossProfit.toLocaleString()}円
              </div>
            </div>

            {/* 粗利益高 */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">粗利益高（税別）</h2>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                {totalGrossProfit.toLocaleString()}円
              </div>
              {targetGrossProfit > 0 && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                  達成率: {((totalGrossProfit / targetGrossProfit) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          {/* 第3列：完工棟数 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 目標完工棟数 */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">目標完工棟数</h2>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{targetUnits}棟</div>
            </div>

            {/* 完工棟数 */}
            <div className="prisma-card">
              <h2 className="prisma-card-title">完工棟数</h2>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{expectedCompletionCount}棟</div>
              {targetUnits > 0 && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                  達成率: {((expectedCompletionCount / targetUnits) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === 入金実績エリア ===  */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* 入金予定 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">入金予定（税込）</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
              {totalScheduledPayment.toLocaleString()}円
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              税別: {Math.floor(totalScheduledPayment / 1.1).toLocaleString()}円
            </div>
          </div>

          {/* 入金実績 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">入金実績（税込）</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
              {totalActualPayment.toLocaleString()}円
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              税別: {Math.floor(totalActualPayment / 1.1).toLocaleString()}円
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
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{avgContractAmount.toLocaleString()}円</div>
            <div className="prisma-text-sm prisma-text-secondary" style={{ marginTop: '4px' }}>（税別: {(avgContractAmount / 1.1).toLocaleString()}円）</div>
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
            <h2 className="prisma-card-title">引き渡し数（四半期別）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { quarter: 'Q1 (8-10月)', handover: monthlyStats.slice(0, 3).reduce((sum, s) => sum + s.handover, 0) },
                { quarter: 'Q2 (11-1月)', handover: monthlyStats.slice(3, 6).reduce((sum, s) => sum + s.handover, 0) },
                { quarter: 'Q3 (2-4月)', handover: monthlyStats.slice(6, 9).reduce((sum, s) => sum + s.handover, 0) },
                { quarter: 'Q4 (5-7月)', handover: monthlyStats.slice(9, 12).reduce((sum, s) => sum + s.handover, 0) }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
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
                <Tooltip formatter={(value: number) => value.toLocaleString() + '円'} />
                <Legend />
                <Bar dataKey="scheduledPayment" fill="#2563eb" name="予定（税込）" />
                <Bar dataKey="actualPayment" fill="#dc2626" name="実績（税込）" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計（予定）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                  {monthlyStats.reduce((sum, s) => sum + s.scheduledPayment, 0).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計（実績）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                  {monthlyStats.reduce((sum, s) => sum + s.actualPayment, 0).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月（予定）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                  {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1].scheduledPayment.toLocaleString() : '0'}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月（実績）</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                  {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1].actualPayment.toLocaleString() : '0'}円
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
                <Tooltip formatter={(value: number) => value.toLocaleString() + '円'} />
                <Legend />
                <Bar dataKey="grossProfit" fill="#000000" name="粗利益高" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb', display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>年度累計</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.reduce((sum, s) => sum + s.grossProfit, 0).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>当月</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1].grossProfit.toLocaleString() : '0'}円
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === 目標値設定モーダル === */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-canva max-w-md w-full">
            {/* ヘッダー */}
            <div className="modal-canva-header">
              <h2 className="text-2xl font-bold">目標値設定 ({selectedYear}年度)</h2>
            </div>

            {/* コンテンツ */}
            <div className="modal-canva-content space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">
                  目標売上高（税別）
                </label>
                <input
                  type="number"
                  value={editTargetRevenue}
                  onChange={(e) => setEditTargetRevenue(e.target.value)}
                  placeholder="例: 500000000"
                  className="input-canva w-full"
                />
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">
                  目標粗利益高（税別）
                </label>
                <input
                  type="number"
                  value={editTargetGrossProfit}
                  onChange={(e) => setEditTargetGrossProfit(e.target.value)}
                  placeholder="例: 100000000"
                  className="input-canva w-full"
                />
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">
                  目標完工棟数
                </label>
                <input
                  type="number"
                  value={editTargetUnits}
                  onChange={(e) => setEditTargetUnits(e.target.value)}
                  placeholder="例: 250"
                  className="input-canva w-full"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="modal-canva-footer">
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
