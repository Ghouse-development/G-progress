import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
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
  const { showToast } = useToast()

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
      showToast('レポートデータの読み込みに失敗しました', 'error')
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
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">レポート・分析</h1>
        <div className="prisma-header-actions">
          <button
            onClick={loadAllData}
            className="prisma-btn prisma-btn-secondary prisma-btn-sm"
          >
            <RefreshCw size={18} />
          </button>

          {/* エクスポートドロップダウン */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="prisma-btn prisma-btn-primary prisma-btn-sm"
            >
              <Download size={18} />
              エクスポート
            </button>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white border-3 border-black rounded-lg shadow-lg z-10 min-w-[220px]">
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-3 text-left text-base font-semibold border-b-2 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  総合レポート (PDF)
                </button>
                <button
                  onClick={handleExportEmployeeExcel}
                  className="w-full px-4 py-3 text-left text-base font-semibold border-b-2 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  従業員データ (Excel)
                </button>
                <button
                  onClick={handleExportEmployeeCSV}
                  className="w-full px-4 py-3 text-left text-base font-semibold hover:bg-gray-50 transition-colors rounded-b-lg"
                >
                  従業員データ (CSV)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="prisma-content">
        <div className="prisma-card mb-4">
          <p className="text-sm text-gray-600">
            プロジェクト全体の統計情報とパフォーマンス分析
          </p>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 総プロジェクト数 */}
        <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-700 border-4 border-black rounded-xl text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-base mb-2 opacity-90">総プロジェクト数</p>
              <p className="text-5xl font-bold">
                {projectStats?.total || 0}
              </p>
            </div>
            <TrendingUp size={40} />
          </div>
          <p className="text-sm mt-3 opacity-80">
            平均進捗率: {projectStats?.averageProgress.toFixed(1) || 0}%
          </p>
        </div>

        {/* 遅延タスク */}
        <div className="p-6 bg-gradient-to-br from-pink-400 to-red-500 border-4 border-black rounded-xl text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-base mb-2 opacity-90">遅延タスク</p>
              <p className="text-5xl font-bold">
                {delayedStats?.total || 0}
              </p>
            </div>
            <AlertCircle size={40} />
          </div>
          <p className="text-sm mt-3 opacity-80">
            平均遅延日数: {delayedStats?.averageDelayDays.toFixed(1) || 0}日
          </p>
        </div>

        {/* 入金状況 */}
        <div className="p-6 bg-gradient-to-br from-cyan-400 to-cyan-600 border-4 border-black rounded-xl text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-base mb-2 opacity-90">入金済み額</p>
              <p className="text-4xl font-bold">
                ¥{((paymentStats?.totalReceived || 0) / 10000).toFixed(0)}万
              </p>
            </div>
            <DollarSign size={40} />
          </div>
          <p className="text-sm mt-3 opacity-80">
            未入金: ¥{((paymentStats?.pending || 0) / 10000).toFixed(0)}万円
          </p>
        </div>

        {/* 従業員数 */}
        <div className="p-6 bg-gradient-to-br from-pink-500 to-yellow-400 border-4 border-black rounded-xl text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-base mb-2 opacity-90">アクティブ従業員</p>
              <p className="text-5xl font-bold">
                {employeePerformance?.length || 0}
              </p>
            </div>
            <Users size={40} />
          </div>
          <p className="text-sm mt-3 opacity-80">
            全部門
          </p>
        </div>
      </div>

      {/* チャートセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* プロジェクトステータス分布 */}
        <div className="prisma-card">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">
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
        <div className="prisma-card">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">
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
      <div className="p-6 bg-gradient-to-br from-orange-100 to-orange-300 border-4 border-black rounded-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-gray-900">
            月次レポート
          </h2>
          <div className="flex gap-3 items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="prisma-select"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="prisma-select"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border-3 border-black rounded-lg">
            <p className="text-sm text-gray-600 mb-2">新規契約</p>
            <p className="text-3xl font-bold text-gray-900">{monthlyReport?.newContracts || 0}</p>
          </div>
          <div className="p-4 bg-white border-3 border-black rounded-lg">
            <p className="text-sm text-gray-600 mb-2">完了プロジェクト</p>
            <p className="text-3xl font-bold text-gray-900">{monthlyReport?.completedProjects || 0}</p>
          </div>
          <div className="p-4 bg-white border-3 border-black rounded-lg">
            <p className="text-sm text-gray-600 mb-2">完了タスク</p>
            <p className="text-3xl font-bold text-gray-900">{monthlyReport?.completedTasks || 0}</p>
          </div>
          <div className="p-4 bg-white border-3 border-black rounded-lg">
            <p className="text-sm text-gray-600 mb-2">売上</p>
            <p className="text-2xl font-bold text-gray-900">
              ¥{((monthlyReport?.totalRevenue || 0) / 10000).toFixed(0)}万
            </p>
          </div>
        </div>
      </div>

      {/* 遅延タスク詳細 */}
      {delayedStats && delayedStats.total > 0 && (
        <div className="prisma-card border-4 border-red-600">
          <h2 className="text-2xl font-bold text-red-600 mb-5">
            遅延タスク詳細（上位10件）
          </h2>
          <div className="prisma-table-container">
            <table className="prisma-table">
              <thead>
                <tr className="bg-red-100">
                  <th className="px-3 py-3 text-left text-base font-bold text-gray-900">タスク</th>
                  <th className="px-3 py-3 text-left text-base font-bold text-gray-900">顧客</th>
                  <th className="px-3 py-3 text-left text-base font-bold text-gray-900">担当者</th>
                  <th className="px-3 py-3 text-left text-base font-bold text-gray-900">期限</th>
                  <th className="px-3 py-3 text-left text-base font-bold text-gray-900">遅延日数</th>
                </tr>
              </thead>
              <tbody>
                {delayedStats.byProject.slice(0, 10).map((task: any, idx: number) => (
                  <tr
                    key={task.taskId}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                  >
                    <td className="px-3 py-3 text-base text-gray-900">{task.taskTitle}</td>
                    <td className="px-3 py-3 text-base text-gray-900">{task.customerName}</td>
                    <td className="px-3 py-3 text-base text-gray-900">{task.assignedTo}</td>
                    <td className="px-3 py-3 text-base text-gray-900">
                      {format(new Date(task.dueDate), 'yyyy/MM/dd', { locale: ja })}
                    </td>
                    <td className="px-3 py-3 text-lg font-bold text-red-600">
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
      <div className="prisma-card">
        <h2 className="text-2xl font-bold text-gray-900 mb-5">
          従業員パフォーマンス（完了率順）
        </h2>
        <div className="prisma-table-container">
          <table className="prisma-table">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-3 text-left text-base font-bold text-gray-900">氏名</th>
                <th className="px-3 py-3 text-left text-base font-bold text-gray-900">部門</th>
                <th className="px-3 py-3 text-left text-base font-bold text-gray-900">役職</th>
                <th className="px-3 py-3 text-center text-base font-bold text-gray-900">総タスク</th>
                <th className="px-3 py-3 text-center text-base font-bold text-gray-900">完了</th>
                <th className="px-3 py-3 text-center text-base font-bold text-gray-900">遅延</th>
                <th className="px-3 py-3 text-center text-base font-bold text-gray-900">完了率</th>
              </tr>
            </thead>
            <tbody>
              {employeePerformance
                .sort((a, b) => b.completionRate - a.completionRate)
                .map((emp: any, idx: number) => (
                  <tr
                    key={emp.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-3 py-3 text-base font-bold text-gray-900">{emp.name}</td>
                    <td className="px-3 py-3 text-base text-gray-900">{emp.department}</td>
                    <td className="px-3 py-3 text-base text-gray-900">{emp.role}</td>
                    <td className="px-3 py-3 text-base text-center text-gray-900">{emp.totalTasks}</td>
                    <td className="px-3 py-3 text-base text-center text-blue-600">
                      {emp.completedTasks}
                    </td>
                    <td className="px-3 py-3 text-base text-center text-red-600">
                      {emp.delayedTasks}
                    </td>
                    <td className={`px-3 py-3 text-lg text-center font-bold ${
                      emp.completionRate >= 80 ? 'text-green-600' :
                      emp.completionRate >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {emp.completionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  )
}
