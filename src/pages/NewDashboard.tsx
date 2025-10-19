/**
 * 新ダッシュボード
 *
 * 要件に基づいた各種グラフ・統計を表示
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project, Payment, Task, Employee } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMode } from '../contexts/ModeContext'

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
  const [selectedYear, setSelectedYear] = useState<string>('2025')
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

  useEffect(() => {
    loadData()
  }, [selectedYear, mode])

  const loadData = async () => {
    setLoading(true)

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

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">ダッシュボード</h1>
      </div>
      <div className="prisma-content">
        {/* === 数値サマリーエリア（グリッドレイアウト） ===  */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* 完工予定数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">完工予定数</h2>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{expectedCompletionCount}件</div>
          </div>

          {/* 遅れタスク数 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">遅れタスク数</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>{delayedTaskCount}件</div>
            <button className="prisma-btn prisma-btn-primary prisma-mt-2">
              詳細を見る
            </button>
          </div>

          {/* 粗利益高サマリー */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">粗利益高（税別）</h2>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
              {totalGrossProfit.toLocaleString()}円
            </div>
          </div>
        </div>

        {/* === 入金・平均値エリア（2列グリッド） ===  */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* 入金サマリー */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">入金サマリー</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div>
                <div className="prisma-text-sm prisma-text-secondary">予定売上高（税別）</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                  {(totalScheduledPayment / 1.1).toLocaleString()}円
                </div>
              </div>
              <div>
                <div className="prisma-text-sm prisma-text-secondary">実績（税込）</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                  {totalActualPayment.toLocaleString()}円
                </div>
              </div>
            </div>
          </div>

          {/* 平均値 */}
          <div className="prisma-card">
            <h2 className="prisma-card-title">平均値</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div>
                <div className="prisma-text-sm prisma-text-secondary">平均坪数</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{avgFloorArea.toFixed(2)}坪</div>
              </div>
              <div>
                <div className="prisma-text-sm prisma-text-secondary">平均契約金額</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{avgContractAmount.toLocaleString()}円</div>
                <div className="prisma-text-sm prisma-text-secondary">（税別: {(avgContractAmount / 1.1).toLocaleString()}円）</div>
              </div>
            </div>
          </div>
        </div>

        {/* === 商品構成テーブル（全幅） ===  */}
        <div className="prisma-card" style={{ marginBottom: '16px' }}>
          <h2 className="prisma-card-title">商品構成</h2>
          <table className="prisma-table">
            <thead>
              <tr>
                <th>商品種別</th>
                <th style={{ textAlign: 'right' }}>件数</th>
                <th style={{ textAlign: 'right' }}>割合</th>
              </tr>
            </thead>
            <tbody>
              {productComposition.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'right' }}>{item.count}件</td>
                  <td style={{ textAlign: 'right' }}>{item.percentage}%</td>
                </tr>
              ))}
              <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                <td>合計</td>
                <td style={{ textAlign: 'right' }}>
                  {productComposition.reduce((sum, item) => sum + item.count, 0)}件
                </td>
                <td style={{ textAlign: 'right' }}>100.0%</td>
              </tr>
            </tbody>
          </table>
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
                <Bar dataKey="contracts" fill="#000000" name="契約数" />
              </BarChart>
            </ResponsiveContainer>
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
          </div>
        </div>
      </div>
    </>
  )
}
