/**
 * 粗利益管理
 * 案件ごとの売上・原価・粗利益を管理
 */

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Percent, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Project, Customer } from '../types/database'
import { useToast } from '../contexts/ToastContext'

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
  const { showToast } = useToast()
  const [projects, setProjects] = useState<ProjectWithProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'low_margin' | 'large_diff'>('all')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('contract_date', { ascending: false })

      if (error) {
        console.error('プロジェクトデータの読み込みエラー:', error)
        showToast(`プロジェクトデータの読み込みに失敗しました: ${error.message}`, 'error')
        setLoading(false)
        return
      }

      if (projectsData) {
        // 仮の粗利益計算（実際はDBから取得または計算ロジックを実装）
        const projectsWithProfit: ProjectWithProfit[] = projectsData.map(project => {
          // 契約金額（請負金額・税別）
          const contractAmount = Math.random() * 20000000 + 30000000 // 3000万〜5000万

          // 実行予算段階（契約金額を基準に設定）
          const budgetRevenue = contractAmount * (0.95 + Math.random() * 0.1) || 0 // 契約金額の95%〜105%
          const budgetCost = budgetRevenue * (0.65 + Math.random() * 0.15) || 0 // 売上の65%〜80%
          const budgetGrossProfit = (budgetRevenue - budgetCost) || 0
          const budgetGrossProfitRate = budgetRevenue > 0 ? (budgetGrossProfit / budgetRevenue) * 100 : 0

          // 完工段階（実行予算から多少のブレを含む）
          const actualRevenue = budgetRevenue * (0.95 + Math.random() * 0.15) || 0 // 予算の95%〜110%
          const actualCost = budgetCost * (0.9 + Math.random() * 0.25) || 0 // 原価は90%〜115%（オーバーランの可能性）
          const actualGrossProfit = (actualRevenue - actualCost) || 0
          const actualGrossProfitRate = actualRevenue > 0 ? (actualGrossProfit / actualRevenue) * 100 : 0

          // 差額（完工 - 実行予算）
          const diffRevenue = (actualRevenue - budgetRevenue) || 0
          const diffCost = (actualCost - budgetCost) || 0
          const diffGrossProfit = (actualGrossProfit - budgetGrossProfit) || 0
          const diffGrossProfitRate = (actualGrossProfitRate - budgetGrossProfitRate) || 0

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
    } catch (error: any) {
      console.error('粗利益データの読み込みエラー:', error)
      showToast(`粗利益データの読み込みに失敗しました: ${error?.message || '不明なエラー'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    if (filter === 'low_margin') {
      // 粗利益率20%未満（実行予算または完工のいずれか）
      return project.budgetGrossProfitRate < 20 || project.actualGrossProfitRate < 20
    }
    if (filter === 'large_diff') {
      // 予算と完工の粗利益率の差が5%以上
      return Math.abs(project.diffGrossProfitRate) >= 5
    }
    return true
  })

  // 統計情報
  const lowMarginCount = projects.filter(p => p.budgetGrossProfitRate < 20 || p.actualGrossProfitRate < 20).length
  const lowMarginRate = projects.length > 0 ? (lowMarginCount / projects.length) * 100 : 0
  const largeDiffCount = projects.filter(p => Math.abs(p.diffGrossProfitRate) >= 5).length
  const largeDiffRate = projects.length > 0 ? (largeDiffCount / projects.length) * 100 : 0

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
    <>
      {/* ヘッダー */}
      <div className="prisma-header">
        <h1 className="prisma-header-title">粗利益管理</h1>
      </div>

      <div className="prisma-content">

      {/* コンパクトなサマリー */}
      <div className="prisma-card mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 売上 */}
          <div className="text-center">
            <p className="text-base font-bold text-gray-600 mb-1">売上（完工）</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalActualRevenue)}</p>
          </div>
          {/* 原価 */}
          <div className="text-center">
            <p className="text-base font-bold text-gray-600 mb-1">原価（完工）</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalActualCost)}</p>
          </div>
          {/* 粗利益 */}
          <div className="text-center">
            <p className="text-base font-bold text-gray-600 mb-1">粗利益（完工）</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalActualGrossProfit)}</p>
          </div>
          {/* 粗利益率 */}
          <div className="text-center">
            <p className="text-base font-bold text-gray-600 mb-1">粗利益率（完工）</p>
            <p className="text-lg font-bold text-purple-600">{totalActualGrossProfitRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* 警告サマリー（コンパクト） */}
      <div className="prisma-card mb-4">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-base font-bold text-gray-600 mb-1">粗利率20%未満</p>
            <p className="text-2xl font-bold text-orange-600">{lowMarginCount}件</p>
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <div>
            <p className="text-base font-bold text-gray-600 mb-1">予算差5%以上</p>
            <p className="text-2xl font-bold text-red-600">{largeDiffCount}件</p>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="prisma-card mb-4">
        <div className="flex items-center gap-3">
          <label className="text-base font-bold text-gray-700">フィルター:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`prisma-btn text-sm px-4 py-2 ${filter === 'all' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              全て ({projects.length})
            </button>
            <button
              onClick={() => setFilter('low_margin')}
              className={`prisma-btn text-sm px-4 py-2 ${filter === 'low_margin' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              粗利率20%未満 ({lowMarginCount})
            </button>
            <button
              onClick={() => setFilter('large_diff')}
              className={`prisma-btn text-sm px-4 py-2 ${filter === 'large_diff' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              予算差5%以上 ({largeDiffCount})
            </button>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="prisma-card" style={{ padding: 0, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
        <div style={{ overflowX: 'scroll', width: '100%' }}>
          <table className="prisma-table" style={{ minWidth: '2000px' }}>
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
              {/* 1段目ヘッダー：グループ */}
              <tr>
                <th rowSpan={2} className="px-3 py-2 text-left text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-300" style={{ minWidth: '180px' }}>
                  案件名
                </th>
                <th rowSpan={2} className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-300 bg-blue-50" style={{ minWidth: '120px' }}>
                  請負金額<br/><span className="text-xs font-normal">(税別)</span>
                </th>
                <th colSpan={4} className="px-3 py-2 text-center text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-300 bg-green-50">
                  実行予算
                </th>
                <th colSpan={4} className="px-3 py-2 text-center text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-300 bg-purple-50">
                  完工
                </th>
                <th colSpan={4} className="px-3 py-2 text-center text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-300 bg-orange-50">
                  差額
                </th>
              </tr>
              {/* 2段目ヘッダー：詳細項目 */}
              <tr>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-green-50" style={{ minWidth: '110px' }}>
                  売上
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-green-50" style={{ minWidth: '110px' }}>
                  原価
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-green-50" style={{ minWidth: '110px' }}>
                  粗利益
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-green-50" style={{ minWidth: '80px' }}>
                  粗利率
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-purple-50" style={{ minWidth: '110px' }}>
                  売上
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-purple-50" style={{ minWidth: '110px' }}>
                  原価
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-purple-50" style={{ minWidth: '110px' }}>
                  粗利益
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-purple-50" style={{ minWidth: '80px' }}>
                  粗利率
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-orange-50" style={{ minWidth: '110px' }}>
                  売上
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-orange-50" style={{ minWidth: '110px' }}>
                  原価
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-orange-50" style={{ minWidth: '110px' }}>
                  粗利益
                </th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 bg-orange-50" style={{ minWidth: '80px' }}>
                  粗利率
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <AlertCircle className="inline-block mb-2" size={32} />
                    <p className="text-lg">データがありません</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project, index) => {
                  const hasLowMargin = project.budgetGrossProfitRate < 20 || project.actualGrossProfitRate < 20
                  const hasLargeDiff = Math.abs(project.diffGrossProfitRate) >= 5

                  return (
                    <tr
                      key={project.id}
                      className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'} ${
                        hasLowMargin ? 'border-l-8 border-l-orange-400' : ''
                      } ${hasLargeDiff ? 'border-r-8 border-r-red-400' : ''}`}
                    >
                      {/* 案件名 */}
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 border border-gray-200">
                        {project.construction_address || '-'}
                      </td>
                      {/* 請負金額 */}
                      <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-gray-100 border border-gray-200 bg-blue-50 font-semibold">
                        {formatCurrency(project.contractAmount)}
                      </td>
                      {/* 実行予算 */}
                      <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-gray-100 border border-gray-200">
                        {formatCurrency(project.budgetRevenue)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-gray-100 border border-gray-200">
                        {formatCurrency(project.budgetCost)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-semibold border border-gray-200 text-gray-900">
                        {formatCurrency(project.budgetGrossProfit)}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-bold border border-gray-200 ${
                        project.budgetGrossProfitRate < 20
                          ? 'bg-orange-200 text-orange-900'
                          : 'text-gray-900'
                      }`}>
                        {project.budgetGrossProfitRate.toFixed(1)}%
                      </td>
                      {/* 完工 */}
                      <td className="px-3 py-2 text-sm text-right text-gray-900 border border-gray-200">
                        {formatCurrency(project.actualRevenue)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900 border border-gray-200">
                        {formatCurrency(project.actualCost)}
                      </td>
                      <td
                        className={`px-3 py-2 text-sm text-right font-bold border border-gray-200 ${
                          project.actualGrossProfit > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(project.actualGrossProfit)}
                      </td>
                      <td
                        className={`px-3 py-2 text-sm text-right font-bold border border-gray-200 ${
                          project.actualGrossProfitRate < 20
                            ? 'bg-orange-200 text-orange-900'
                            : project.actualGrossProfitRate > 20
                            ? 'text-green-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {project.actualGrossProfitRate.toFixed(1)}%
                      </td>
                      {/* 差額 */}
                      <td className={`px-3 py-2 text-sm text-right font-semibold border border-gray-200 ${
                        project.diffRevenue >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {project.diffRevenue >= 0 ? '+' : ''}{formatCurrency(project.diffRevenue)}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-semibold border border-gray-200 ${
                        project.diffCost <= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {project.diffCost >= 0 ? '+' : ''}{formatCurrency(project.diffCost)}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-bold border border-gray-200 ${
                        project.diffGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {project.diffGrossProfit >= 0 ? '+' : ''}{formatCurrency(project.diffGrossProfit)}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-bold border border-gray-200 ${
                        Math.abs(project.diffGrossProfitRate) >= 5
                          ? 'bg-red-200 text-red-900'
                          : project.diffGrossProfitRate >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {project.diffGrossProfitRate >= 0 ? '+' : ''}{project.diffGrossProfitRate.toFixed(1)}pt
                      </td>
                    </tr>
                  )
                })
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
    </>
  )
}
