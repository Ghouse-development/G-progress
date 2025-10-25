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
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">実行予算</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalBudgetRevenue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">完工</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalActualRevenue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">差額</p>
                <p className={`text-xl font-bold ${totalDiffRevenue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">実行予算</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalBudgetCost)}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">完工</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalActualCost)}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">差額</p>
                <p className={`text-xl font-bold ${totalDiffCost <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">実行予算</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalBudgetGrossProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">完工</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalActualGrossProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">差額</p>
                <p className={`text-xl font-bold ${totalDiffGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">実行予算</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalBudgetGrossProfitRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">完工</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalActualGrossProfitRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">差額</p>
                <p className={`text-xl font-bold ${totalDiffGrossProfitRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalDiffGrossProfitRate >= 0 ? '+' : ''}{totalDiffGrossProfitRate.toFixed(1)}pt
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 警告カード */}
      <div className="grid grid-cols-2 gap-4">
        {/* 粗利率20%未満の物件 */}
        <div className="prisma-card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-3 border-yellow-400 dark:border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">⚠️ 粗利益率20%未満</p>
              <p className="text-base text-gray-700 dark:text-gray-300">
                実行予算または完工時点で粗利益率が20%を下回る物件
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{lowMarginCount}</p>
              <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                {lowMarginRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* 予算と完工の差が大きい物件 */}
        <div className="prisma-card bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-3 border-red-400 dark:border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">🚨 予算との差異大</p>
              <p className="text-base text-gray-700 dark:text-gray-300">
                予算と完工の粗利益率の差が5%以上ある物件
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-red-600 dark:text-red-400">{largeDiffCount}</p>
              <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                {largeDiffRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="prisma-card">
        <div className="flex items-center gap-4">
          <label className="text-lg font-bold text-gray-900 dark:text-gray-100">表示フィルター:</label>
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`prisma-btn text-base px-6 py-3 ${filter === 'all' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              全て ({projects.length}件)
            </button>
            <button
              onClick={() => setFilter('low_margin')}
              className={`prisma-btn text-base px-6 py-3 ${filter === 'low_margin' ? 'prisma-btn-primary' : 'prisma-btn-secondary'} ${lowMarginCount > 0 ? 'border-3 border-orange-400' : ''}`}
            >
              ⚠️ 粗利率20%未満 ({lowMarginCount}件 / {lowMarginRate.toFixed(1)}%)
            </button>
            <button
              onClick={() => setFilter('large_diff')}
              className={`prisma-btn text-base px-6 py-3 ${filter === 'large_diff' ? 'prisma-btn-primary' : 'prisma-btn-secondary'} ${largeDiffCount > 0 ? 'border-3 border-red-400' : ''}`}
            >
              🚨 予算差5%以上 ({largeDiffCount}件 / {largeDiffRate.toFixed(1)}%)
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
                <th rowSpan={2} className="px-4 py-4 text-left text-lg font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600" style={{ minWidth: '200px' }}>
                  案件名
                </th>
                <th rowSpan={2} className="px-4 py-4 text-right text-lg font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-blue-100 dark:bg-blue-900/30" style={{ minWidth: '140px' }}>
                  請負金額<br/><span className="text-sm font-normal">(税別)</span>
                </th>
                <th colSpan={4} className="px-4 py-3 text-center text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-green-100 dark:bg-green-900/30">
                  実行予算
                </th>
                <th colSpan={4} className="px-4 py-3 text-center text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-purple-100 dark:bg-purple-900/30">
                  完工
                </th>
                <th colSpan={4} className="px-4 py-3 text-center text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-orange-100 dark:bg-orange-900/30">
                  差額
                </th>
              </tr>
              {/* 2段目ヘッダー：詳細項目 */}
              <tr>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '130px' }}>
                  売上
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '130px' }}>
                  原価
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '130px' }}>
                  粗利益
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '90px' }}>
                  粗利率
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '130px' }}>
                  売上
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '130px' }}>
                  原価
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '130px' }}>
                  粗利益
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20" style={{ minWidth: '90px' }}>
                  粗利率
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '130px' }}>
                  売上
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '130px' }}>
                  原価
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '130px' }}>
                  粗利益
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20" style={{ minWidth: '90px' }}>
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
                      <td className="px-4 py-4 text-base font-medium text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600">
                        {project.construction_address || '-'}
                      </td>
                      {/* 請負金額 */}
                      <td className="px-4 py-4 text-base text-right text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 font-semibold">
                        {formatCurrency(project.contractAmount)}
                      </td>
                      {/* 実行予算 */}
                      <td className="px-4 py-4 text-base text-right text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600">
                        {formatCurrency(project.budgetRevenue)}
                      </td>
                      <td className="px-4 py-4 text-base text-right text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600">
                        {formatCurrency(project.budgetCost)}
                      </td>
                      <td className="px-4 py-4 text-base text-right font-semibold border-3 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                        {formatCurrency(project.budgetGrossProfit)}
                      </td>
                      <td className={`px-4 py-4 text-base text-right font-bold border-3 border-gray-300 dark:border-gray-600 ${
                        project.budgetGrossProfitRate < 20
                          ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {project.budgetGrossProfitRate.toFixed(1)}%
                      </td>
                      {/* 完工 */}
                      <td className="px-4 py-4 text-base text-right text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600">
                        {formatCurrency(project.actualRevenue)}
                      </td>
                      <td className="px-4 py-4 text-base text-right text-gray-900 dark:text-gray-100 border-3 border-gray-300 dark:border-gray-600">
                        {formatCurrency(project.actualCost)}
                      </td>
                      <td
                        className={`px-4 py-4 text-base text-right font-bold border-3 border-gray-300 dark:border-gray-600 ${
                          project.actualGrossProfit > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatCurrency(project.actualGrossProfit)}
                      </td>
                      <td
                        className={`px-4 py-4 text-base text-right font-bold border-3 border-gray-300 dark:border-gray-600 ${
                          project.actualGrossProfitRate < 20
                            ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100'
                            : project.actualGrossProfitRate > 20
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {project.actualGrossProfitRate.toFixed(1)}%
                      </td>
                      {/* 差額 */}
                      <td className={`px-4 py-4 text-base text-right font-semibold border-3 border-gray-300 dark:border-gray-600 ${
                        project.diffRevenue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {project.diffRevenue >= 0 ? '+' : ''}{formatCurrency(project.diffRevenue)}
                      </td>
                      <td className={`px-4 py-4 text-base text-right font-semibold border-3 border-gray-300 dark:border-gray-600 ${
                        project.diffCost <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {project.diffCost >= 0 ? '+' : ''}{formatCurrency(project.diffCost)}
                      </td>
                      <td className={`px-4 py-4 text-base text-right font-bold border-3 border-gray-300 dark:border-gray-600 ${
                        project.diffGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {project.diffGrossProfit >= 0 ? '+' : ''}{formatCurrency(project.diffGrossProfit)}
                      </td>
                      <td className={`px-4 py-4 text-base text-right font-bold border-3 border-gray-300 dark:border-gray-600 ${
                        Math.abs(project.diffGrossProfitRate) >= 5
                          ? 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100'
                          : project.diffGrossProfitRate >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
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
  )
}
