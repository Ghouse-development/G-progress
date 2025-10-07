import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project } from '../types/database'

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

export default function DashboardHome() {
  const [mode, setMode] = useState<'staff' | 'admin'>('staff')
  const [fiscalYear, setFiscalYear] = useState<number>(getFiscalYear(new Date()))
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // 利用可能な年度のリスト（過去5年分）
  const currentFY = getFiscalYear(new Date())
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i)

  useEffect(() => {
    loadCurrentUser()
    loadProjects()
  }, [mode, fiscalYear])

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single()

      if (employee) {
        setCurrentUserId(employee.id)
      }
    }
  }

  const loadProjects = async () => {
    const { startDate, endDate } = getFiscalYearRange(fiscalYear)

    let query = supabase
      .from('projects')
      .select('*, customer:customers(*)')
      .gte('contract_date', startDate.toISOString())
      .lte('contract_date', endDate.toISOString())

    // 担当者モードの場合、自分が担当する案件のみ
    if (mode === 'staff' && currentUserId) {
      query = query.or(`assigned_sales.eq.${currentUserId},assigned_design.eq.${currentUserId},assigned_construction.eq.${currentUserId}`)
    }

    const { data, error } = await query

    if (!error && data) {
      setProjects(data as Project[])
    }
  }

  // 統計計算
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'construction' || p.status === 'post_contract').length
  const averageProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progress_rate, 0) / projects.length)
    : 0
  const delayedProjects = projects.filter(p => p.progress_rate < 50 && p.status !== 'completed').length

  return (
    <div className="space-y-6">
      {/* ヘッダー: モード切替と年度選択 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-black">ダッシュボード</h2>

        <div className="flex items-center gap-4">
          {/* 年度選択 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">年度:</label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="px-3 py-2 border border-pastel-blue rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}年度 ({year}/8/1 - {year + 1}/7/31)
                </option>
              ))}
            </select>
          </div>

          {/* モード切替 */}
          <div className="flex items-center gap-2 bg-pastel-blue-light rounded-lg p-1 border-2 border-pastel-blue">
            <button
              onClick={() => setMode('staff')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                mode === 'staff'
                  ? 'bg-gradient-pastel-blue text-pastel-blue-dark shadow-pastel'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👤 担当者モード
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                mode === 'admin'
                  ? 'bg-gradient-pastel-blue text-pastel-blue-dark shadow-pastel'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👨‍💼 管理者モード
            </button>
          </div>
        </div>
      </div>

      {/* モード表示インジケーター */}
      <div className={`px-4 py-2 rounded-lg border-2 ${
        mode === 'admin'
          ? 'bg-pastel-orange-light border-pastel-orange'
          : 'bg-pastel-blue-light border-pastel-blue'
      }`}>
        <p className="text-sm">
          {mode === 'admin' ? (
            <span className="font-medium text-pastel-orange-dark">
              📊 管理者モード: 全社の案件（{totalProjects}件）を表示中
            </span>
          ) : (
            <span className="font-medium text-pastel-blue-dark">
              📋 担当者モード: あなたが担当する案件（{totalProjects}件）を表示中
            </span>
          )}
        </p>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-4">
          <p className="text-xs text-gray-600 mb-1">全社進捗率</p>
          <p className="text-2xl font-bold text-pastel-blue-dark">{averageProgress}%</p>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-pastel-blue h-2 rounded-full transition-all duration-300"
              style={{ width: `${averageProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-orange shadow-pastel p-4">
          <p className="text-xs text-gray-600 mb-1">遅延案件数</p>
          <p className="text-2xl font-bold text-pastel-orange-dark">{delayedProjects}</p>
          <p className="text-xs text-gray-500 mt-2">進捗50%未満</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-green shadow-pastel p-4">
          <p className="text-xs text-gray-600 mb-1">進行中案件</p>
          <p className="text-2xl font-bold text-pastel-green-dark">{activeProjects}</p>
          <p className="text-xs text-gray-500 mt-2">契約後・着工後</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-4">
          <p className="text-xs text-gray-600 mb-1">総案件数</p>
          <p className="text-2xl font-bold text-pastel-blue-dark">{totalProjects}</p>
          <p className="text-xs text-gray-500 mt-2">{fiscalYear}年度</p>
        </div>
      </div>

      {/* 信号表示 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">営業部門</h3>
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-pastel-green shadow-pastel flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
          </div>
          <p className="text-center mt-3 text-xs text-gray-600 font-medium">正常稼働中</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-green shadow-pastel p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">設計部門</h3>
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-pastel-orange shadow-pastel flex items-center justify-center">
              <span className="text-2xl">!</span>
            </div>
          </div>
          <p className="text-center mt-3 text-xs text-gray-600 font-medium">注意が必要</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-orange shadow-pastel p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">工事部門</h3>
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-pastel-green shadow-pastel flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
          </div>
          <p className="text-center mt-3 text-xs text-gray-600 font-medium">正常稼働中</p>
        </div>
      </div>

      {/* グラフエリア（プレースホルダー） */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">案件状態分布</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-sm">📊 グラフを表示予定</p>
            <p className="text-xs mt-2">(recharts実装予定)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
