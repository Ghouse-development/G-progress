import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getProjectProgressStats,
  getDepartmentTaskStats,
  getDelayedTasksStats,
  getPaymentSummary,
  getMonthlyReport,
  getEmployeePerformance
} from '../lib/analytics'
import {
  exportMonthlyReportPDF,
  exportEmployeePerformance
} from '../lib/exportUtils'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  AlertCircle,
  DollarSign,
  Users,
  Download,
  RefreshCw,
  ChevronDown
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function Reports() {
  const navigate = useNavigate()

  // 統計データの状態
  const [projectStats, setProjectStats] = useState<any>(null)
  const [departmentStats, setDepartmentStats] = useState<any>(null)
  const [delayedStats, setDelayedStats] = useState<any>(null)
  const [paymentStats, setPaymentStats] = useState<any>(null)
  const [monthlyReport, setMonthlyReport] = useState<any>(null)
  const [employeePerformance, setEmployeePerformance] = useState<any[]>([])

  // ローディング状態
  const [loading, setLoading] = useState(true)

  // エクスポートメニュー表示状態
  const [showExportMenu, setShowExportMenu] = useState(false)

  // 月次レポート用の年月選択
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)

  // データ読み込み
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [projects, departments, delayed, payments, monthly, employees] = await Promise.all([
        getProjectProgressStats(),
        getDepartmentTaskStats(),
        getDelayedTasksStats(),
        getPaymentSummary(),
        getMonthlyReport(selectedYear, selectedMonth),
        getEmployeePerformance()
      ])

      setProjectStats(projects.data)
      setDepartmentStats(departments.data)
      setDelayedStats(delayed.data)
      setPaymentStats(payments.data)
      setMonthlyReport(monthly.data)
      setEmployeePerformance(employees.data || [])
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [selectedYear, selectedMonth])

  // エクスポート処理
  const handleExportPDF = () => {
    if (monthlyReport && projectStats && departmentStats && employeePerformance) {
      exportMonthlyReportPDF(monthlyReport, projectStats, departmentStats, employeePerformance)
      setShowExportMenu(false)
    }
  }

  const handleExportEmployeeCSV = () => {
    if (employeePerformance && employeePerformance.length > 0) {
      exportEmployeePerformance(employeePerformance, 'csv')
      setShowExportMenu(false)
    }
  }

  const handleExportEmployeeExcel = () => {
    if (employeePerformance && employeePerformance.length > 0) {
      exportEmployeePerformance(employeePerformance, 'excel')
      setShowExportMenu(false)
    }
  }

  // チャート用のカラー
  const COLORS = {
    preContract: '#FCA5A5',
    postContract: '#FDE047',
    construction: '#93C5FD',
    completed: '#86EFAC',
    delayed: '#DC2626',
    pending: '#EAB308',
    received: '#2563EB'
  }

  // プロジェクトステータス用データ
  const projectChartData = projectStats
    ? [
        { name: '契約前', value: projectStats.preContract, color: COLORS.preContract },
        { name: '契約後', value: projectStats.postContract, color: COLORS.postContract },
        { name: '施工中', value: projectStats.construction, color: COLORS.construction },
        { name: '完了', value: projectStats.completed, color: COLORS.completed }
      ]
    : []

  // 部門別タスク完了率用データ
  const departmentChartData = departmentStats
    ? Object.entries(departmentStats).map(([dept, stats]: [string, any]) => ({
        name: dept,
        完了率: stats.rate.toFixed(1),
        完了: stats.completed,
        総数: stats.total
      }))
    : []

  // ローディング表示
  if (loading && !projectStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="reports-page" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            レポート・分析
          </h1>
          <p style={{ fontSize: '16px', color: '#666' }}>
            プロジェクト全体の統計情報とパフォーマンス分析
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadAllData}
            style={{
              padding: '12px 24px',
              background: 'white',
              border: '3px solid black',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={20} />
            更新
          </button>

          {/* エクスポートドロップダウン */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: '3px solid black',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={20} />
              エクスポート
              <ChevronDown size={16} />
            </button>

            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: 'white',
                border: '3px solid black',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 10,
                minWidth: '220px'
              }}>
                <button
                  onClick={handleExportPDF}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: 'none',
                    background: 'white',
                    cursor: 'pointer',
                    borderBottom: '2px solid #E5E7EB'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  📄 総合レポート (PDF)
                </button>
                <button
                  onClick={handleExportEmployeeExcel}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: 'none',
                    background: 'white',
                    cursor: 'pointer',
                    borderBottom: '2px solid #E5E7EB'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  📊 従業員データ (Excel)
                </button>
                <button
                  onClick={handleExportEmployeeCSV}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: 'none',
                    background: 'white',
                    cursor: 'pointer',
                    borderRadius: '0 0 5px 5px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  📋 従業員データ (CSV)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* 総プロジェクト数 */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '4px solid black',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: '16px', marginBottom: '8px', opacity: 0.9 }}>総プロジェクト数</p>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>
                {projectStats?.total || 0}
              </p>
            </div>
            <TrendingUp size={40} />
          </div>
          <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
            平均進捗率: {projectStats?.averageProgress.toFixed(1) || 0}%
          </p>
        </div>

        {/* 遅延タスク */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          border: '4px solid black',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: '16px', marginBottom: '8px', opacity: 0.9 }}>遅延タスク</p>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>
                {delayedStats?.total || 0}
              </p>
            </div>
            <AlertCircle size={40} />
          </div>
          <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
            平均遅延日数: {delayedStats?.averageDelayDays.toFixed(1) || 0}日
          </p>
        </div>

        {/* 入金状況 */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          border: '4px solid black',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: '16px', marginBottom: '8px', opacity: 0.9 }}>入金済み額</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold' }}>
                ¥{((paymentStats?.totalReceived || 0) / 10000).toFixed(0)}万
              </p>
            </div>
            <DollarSign size={40} />
          </div>
          <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
            未入金: ¥{((paymentStats?.pending || 0) / 10000).toFixed(0)}万円
          </p>
        </div>

        {/* 従業員数 */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          border: '4px solid black',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: '16px', marginBottom: '8px', opacity: 0.9 }}>アクティブ従業員</p>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>
                {employeePerformance?.length || 0}
              </p>
            </div>
            <Users size={40} />
          </div>
          <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
            全部門
          </p>
        </div>
      </div>

      {/* チャートセクション */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* プロジェクトステータス分布 */}
        <div style={{
          padding: '24px',
          background: 'white',
          border: '4px solid black',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            プロジェクトステータス分布
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {projectChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="black" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 部門別タスク完了率 */}
        <div style={{
          padding: '24px',
          background: 'white',
          border: '4px solid black',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            部門別タスク完了率
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: '12px' }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="完了率" fill="#2563EB" stroke="black" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 月次レポート */}
      <div style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        border: '4px solid black',
        borderRadius: '12px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            月次レポート
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: '8px 16px',
                border: '3px solid black',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'white'
              }}
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{
                padding: '8px 16px',
                border: '3px solid black',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'white'
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            padding: '16px',
            background: 'white',
            border: '3px solid black',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>新規契約</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{monthlyReport?.newContracts || 0}</p>
          </div>
          <div style={{
            padding: '16px',
            background: 'white',
            border: '3px solid black',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>完了プロジェクト</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{monthlyReport?.completedProjects || 0}</p>
          </div>
          <div style={{
            padding: '16px',
            background: 'white',
            border: '3px solid black',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>完了タスク</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{monthlyReport?.completedTasks || 0}</p>
          </div>
          <div style={{
            padding: '16px',
            background: 'white',
            border: '3px solid black',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>売上</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
              ¥{((monthlyReport?.totalRevenue || 0) / 10000).toFixed(0)}万
            </p>
          </div>
        </div>
      </div>

      {/* 遅延タスク詳細 */}
      {delayedStats && delayedStats.total > 0 && (
        <div style={{
          padding: '24px',
          background: 'white',
          border: '4px solid #DC2626',
          borderRadius: '12px',
          marginBottom: '32px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#DC2626' }}>
            遅延タスク詳細（上位10件）
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FEE2E2', borderBottom: '3px solid black' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>タスク</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>顧客</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>担当者</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>期限</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>遅延日数</th>
                </tr>
              </thead>
              <tbody>
                {delayedStats.byProject.slice(0, 10).map((task: any, idx: number) => (
                  <tr
                    key={task.taskId}
                    style={{
                      borderBottom: '2px solid #E5E7EB',
                      cursor: 'pointer',
                      background: idx % 2 === 0 ? 'white' : '#F9FAFB'
                    }}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                  >
                    <td style={{ padding: '12px', fontSize: '16px' }}>{task.taskTitle}</td>
                    <td style={{ padding: '12px', fontSize: '16px' }}>{task.customerName}</td>
                    <td style={{ padding: '12px', fontSize: '16px' }}>{task.assignedTo}</td>
                    <td style={{ padding: '12px', fontSize: '16px' }}>
                      {format(new Date(task.dueDate), 'yyyy/MM/dd', { locale: ja })}
                    </td>
                    <td style={{ padding: '12px', fontSize: '18px', fontWeight: 'bold', color: '#DC2626' }}>
                      {task.delayDays}日
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 従業員パフォーマンス */}
      <div style={{
        padding: '24px',
        background: 'white',
        border: '4px solid black',
        borderRadius: '12px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          従業員パフォーマンス（完了率順）
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F3F4F6', borderBottom: '3px solid black' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>氏名</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>部門</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>役職</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>総タスク</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>完了</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>遅延</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>完了率</th>
              </tr>
            </thead>
            <tbody>
              {employeePerformance
                .sort((a, b) => b.completionRate - a.completionRate)
                .map((emp: any, idx: number) => (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: '2px solid #E5E7EB',
                      background: idx % 2 === 0 ? 'white' : '#F9FAFB'
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: '16px', fontWeight: 'bold' }}>{emp.name}</td>
                    <td style={{ padding: '12px', fontSize: '16px' }}>{emp.department}</td>
                    <td style={{ padding: '12px', fontSize: '16px' }}>{emp.role}</td>
                    <td style={{ padding: '12px', fontSize: '16px', textAlign: 'center' }}>{emp.totalTasks}</td>
                    <td style={{ padding: '12px', fontSize: '16px', textAlign: 'center', color: '#2563EB' }}>
                      {emp.completedTasks}
                    </td>
                    <td style={{ padding: '12px', fontSize: '16px', textAlign: 'center', color: '#DC2626' }}>
                      {emp.delayedTasks}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '18px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: emp.completionRate >= 80 ? '#059669' : emp.completionRate >= 50 ? '#EAB308' : '#DC2626'
                    }}>
                      {emp.completionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
