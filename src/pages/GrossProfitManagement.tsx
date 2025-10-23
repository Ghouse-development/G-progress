/**
 * 粗利益管理
 * 案件ごとの売上・原価・粗利益を管理
 */

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Percent, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Project, Customer } from '../types/database'

interface ProjectWithProfit extends Project {
  customer?: Customer
  // 契約段階
  contractAmount: number // 請負金額（税別）
  // 実行予算段階
  budgetRevenue: number // 売上
  budgetCost: number // 原価
  budgetGrossProfit: number // 粗利益
  budgetGrossProfitRate: number // 粗利益率
  // 完工段階
  actualRevenue: number // 売上
  actualCost: number // 原価
  actualGrossProfit: number // 粗利益
  actualGrossProfitRate: number // 粗利益率
  // 差額（完工 - 実行予算）
  diffRevenue: number // 売上差額
  diffCost: number // 原価差額
  diffGrossProfit: number // 粗利益差額
  diffGrossProfitRate: number // 粗利益率差額
}

export default function GrossProfitManagement() {
  const [projects, setProjects] = useState<ProjectWithProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('contract_date', { ascending: false })

      if (projectsData) {
        // 仮の粗利益計算（実際はDBから取得または計算ロジックを実装）
        const projectsWithProfit: ProjectWithProfit[] = projectsData.map(project => {
          // 契約金額（請負金額・税別）
          const contractAmount = Math.random() * 20000000 + 30000000 // 3000万〜5000万

          // 実行予算段階（契約金額を基準に設定）
          const budgetRevenue = contractAmount * (0.95 + Math.random() * 0.1) // 契約金額の95%〜105%
          const budgetCost = budgetRevenue * (0.65 + Math.random() * 0.15) // 売上の65%〜80%
          const budgetGrossProfit = budgetRevenue - budgetCost
          const budgetGrossProfitRate = (budgetGrossProfit / budgetRevenue) * 100

          // 完工段階（実行予算から多少のブレを含む）
          const actualRevenue = budgetRevenue * (0.95 + Math.random() * 0.15) // 予算の95%〜110%
          const actualCost = budgetCost * (0.9 + Math.random() * 0.25) // 原価は90%〜115%（オーバーランの可能性）
          const actualGrossProfit = actualRevenue - actualCost
          const actualGrossProfitRate = (actualGrossProfit / actualRevenue) * 100

          // 差額（完工 - 実行予算）
          const diffRevenue = actualRevenue - budgetRevenue
          const diffCost = actualCost - budgetCost
          const diffGrossProfit = actualGrossProfit - budgetGrossProfit
          const diffGrossProfitRate = actualGrossProfitRate - budgetGrossProfitRate

          return {
            ...project,
            contractAmount,
            budgetRevenue,
            budgetCost,
            budgetGrossProfit,
            budgetGrossProfitRate,
            actualRevenue,
            actualCost,
            actualGrossProfit,
            actualGrossProfitRate,
            diffRevenue,
            diffCost,
            diffGrossProfit,
            diffGrossProfitRate
          }
        })

        setProjects(projectsWithProfit)
      }
    } catch (error) {
      console.error('粗利益データの読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    if (filter === 'positive') return project.actualGrossProfit > 0
    if (filter === 'negative') return project.actualGrossProfit <= 0
    return true
  })

  // 実行予算の集計
  const totalBudgetRevenue = filteredProjects.reduce((sum, p) => sum + p.budgetRevenue, 0)
  const totalBudgetCost = filteredProjects.reduce((sum, p) => sum + p.budgetCost, 0)
  const totalBudgetGrossProfit = totalBudgetRevenue - totalBudgetCost
  const totalBudgetGrossProfitRate = totalBudgetRevenue > 0 ? (totalBudgetGrossProfit / totalBudgetRevenue) * 100 : 0

  // 完工の集計
  const totalActualRevenue = filteredProjects.reduce((sum, p) => sum + p.actualRevenue, 0)
  const totalActualCost = filteredProjects.reduce((sum, p) => sum + p.actualCost, 0)
  const totalActualGrossProfit = totalActualRevenue - totalActualCost
  const totalActualGrossProfitRate = totalActualRevenue > 0 ? (totalActualGrossProfit / totalActualRevenue) * 100 : 0

  // 差額の集計
  const totalDiffRevenue = totalActualRevenue - totalBudgetRevenue
  const totalDiffCost = totalActualCost - totalBudgetCost
  const totalDiffGrossProfit = totalActualGrossProfit - totalBudgetGrossProfit
  const totalDiffGrossProfitRate = totalActualGrossProfitRate - totalBudgetGrossProfitRate

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">粗利益管理</h2>
        <span className="prisma-badge prisma-badge-blue">注文住宅事業</span>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4">
        {/* 売上 */}
        <div className="prisma-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="text-center">
            <DollarSign className="text-blue-600 dark:text-blue-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">売上</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">実行予算</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalBudgetRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">完工</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalActualRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">差額</p>
                <p className={`text-base font-bold ${totalDiffRevenue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalDiffRevenue >= 0 ? '+' : ''}{formatCurrency(totalDiffRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 原価 */}
        <div className="prisma-card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <div className="text-center">
            <TrendingUp className="text-orange-600 dark:text-orange-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">原価</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">実行予算</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalBudgetCost)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">完工</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalActualCost)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">差額</p>
                <p className={`text-base font-bold ${totalDiffCost <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalDiffCost >= 0 ? '+' : ''}{formatCurrency(totalDiffCost)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 粗利益 */}
        <div className="prisma-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="text-center">
            <TrendingUp className="text-green-600 dark:text-green-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">粗利益</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">実行予算</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalBudgetGrossProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">完工</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalActualGrossProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">差額</p>
                <p className={`text-base font-bold ${totalDiffGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalDiffGrossProfit >= 0 ? '+' : ''}{formatCurrency(totalDiffGrossProfit)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 粗利益率 */}
        <div className="prisma-card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="text-center">
            <Percent className="text-purple-600 dark:text-purple-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">粗利益率</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">実行予算</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {totalBudgetGrossProfitRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">完工</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {totalActualGrossProfitRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">差額</p>
                <p className={`text-base font-bold ${totalDiffGrossProfitRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalDiffGrossProfitRate >= 0 ? '+' : ''}{totalDiffGrossProfitRate.toFixed(1)}pt
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="prisma-card">
        <div className="flex items-center gap-4">
          <label className="text-base font-semibold text-gray-700 dark:text-gray-300">表示:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`prisma-btn ${filter === 'all' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              全て ({projects.length})
            </button>
            <button
              onClick={() => setFilter('positive')}
              className={`prisma-btn ${filter === 'positive' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              黒字 ({projects.filter(p => p.actualGrossProfit > 0).length})
            </button>
            <button
              onClick={() => setFilter('negative')}
              className={`prisma-btn ${filter === 'negative' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              赤字 ({projects.filter(p => p.actualGrossProfit <= 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="prisma-card" style={{ padding: 0, overflow: 'visible' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '2000px' }}>
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
              {/* 1段目ヘッダー：グループ */}
              <tr>
                <th rowSpan={2} className="px-4 py-3 text-left text-base font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600" style={{ minWidth: '150px' }}>
                  案件名
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left text-base font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600" style={{ minWidth: '120px' }}>
                  顧客名
                </th>
                <th rowSpan={2} className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-900/30" style={{ minWidth: '130px' }}>
                  請負金額<br/><span className="text-xs font-normal">(税別)</span>
                </th>
                <th colSpan={4} className="px-4 py-2 text-center text-base font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-green-100 dark:bg-green-900/30">
                  実行予算
                </th>
                <th colSpan={4} className="px-4 py-2 text-center text-base font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-purple-100 dark:bg-purple-900/30">
                  完工
                </th>
                <th colSpan={4} className="px-4 py-2 text-center text-base font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-orange-100 dark:bg-orange-900/30">
                  差額
                </th>
              </tr>
              {/* 2段目ヘッダー：詳細項目 */}
              <tr>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '120px' }}>
                  売上
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '120px' }}>
                  原価
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '120px' }}>
                  粗利益
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '80px' }}>
                  粗利率
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '120px' }}>
                  売上
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '120px' }}>
                  原価
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '120px' }}>
                  粗利益
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '80px' }}>
                  粗利率
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '120px' }}>
                  売上
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '120px' }}>
                  原価
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '120px' }}>
                  粗利益
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '80px' }}>
                  粗利率
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <AlertCircle className="inline-block mb-2" size={32} />
                    <p className="text-base">データがありません</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project, index) => (
                  <tr
                    key={project.id}
                    className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}
                  >
                    {/* 案件名 */}
                    <td className="px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600">
                      {project.construction_address || '-'}
                    </td>
                    {/* 顧客名 */}
                    <td className="px-4 py-3 text-base text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600">
                      {Array.isArray(project.customer?.names) && project.customer.names.length > 0
                        ? project.customer.names[0]
                        : '-'}
                    </td>
                    {/* 請負金額 */}
                    <td className="px-3 py-3 text-sm text-right text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 font-semibold">
                      {formatCurrency(project.contractAmount)}
                    </td>
                    {/* 実行予算 */}
                    <td className="px-3 py-3 text-sm text-right text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600">
                      {formatCurrency(project.budgetRevenue)}
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600">
                      {formatCurrency(project.budgetCost)}
                    </td>
                    <td className="px-3 py-3 text-sm text-right font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {formatCurrency(project.budgetGrossProfit)}
                    </td>
                    <td className="px-3 py-3 text-sm text-right font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {project.budgetGrossProfitRate.toFixed(1)}%
                    </td>
                    {/* 完工 */}
                    <td className="px-3 py-3 text-sm text-right text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600">
                      {formatCurrency(project.actualRevenue)}
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600">
                      {formatCurrency(project.actualCost)}
                    </td>
                    <td
                      className={`px-3 py-3 text-sm text-right font-bold border-2 border-gray-300 dark:border-gray-600 ${
                        project.actualGrossProfit > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(project.actualGrossProfit)}
                    </td>
                    <td
                      className={`px-3 py-3 text-sm text-right font-bold border-2 border-gray-300 dark:border-gray-600 ${
                        project.actualGrossProfitRate > 20
                          ? 'text-green-600 dark:text-green-400'
                          : project.actualGrossProfitRate > 10
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {project.actualGrossProfitRate.toFixed(1)}%
                    </td>
                    {/* 差額 */}
                    <td className={`px-3 py-3 text-sm text-right font-semibold border-2 border-gray-300 dark:border-gray-600 ${
                      project.diffRevenue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {project.diffRevenue >= 0 ? '+' : ''}{formatCurrency(project.diffRevenue)}
                    </td>
                    <td className={`px-3 py-3 text-sm text-right font-semibold border-2 border-gray-300 dark:border-gray-600 ${
                      project.diffCost <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {project.diffCost >= 0 ? '+' : ''}{formatCurrency(project.diffCost)}
                    </td>
                    <td className={`px-3 py-3 text-sm text-right font-bold border-2 border-gray-300 dark:border-gray-600 ${
                      project.diffGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {project.diffGrossProfit >= 0 ? '+' : ''}{formatCurrency(project.diffGrossProfit)}
                    </td>
                    <td className={`px-3 py-3 text-sm text-right font-bold border-2 border-gray-300 dark:border-gray-600 ${
                      project.diffGrossProfitRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {project.diffGrossProfitRate >= 0 ? '+' : ''}{project.diffGrossProfitRate.toFixed(1)}pt
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 注意書き */}
      <div className="prisma-card bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" size={20} />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-1">開発中の機能</p>
            <p>
              現在表示されている粗利益データはサンプルです。
              実際の売上・原価データと連携する機能は今後実装予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
