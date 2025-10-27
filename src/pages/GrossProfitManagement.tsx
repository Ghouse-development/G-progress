/**
 * 粗利益管理
 * 案件ごとの売上・原価・粗利益を管理
 */

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Percent, AlertCircle, TrendingDown, Eye, EyeOff } from 'lucide-react'
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
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({})

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
  const largeDiffCount = projects.filter(p => Math.abs(p.diffGrossProfitRate) >= 5).length

  // 完工の集計
  const totalActualRevenue = filteredProjects.reduce((sum, p) => sum + p.actualRevenue, 0)
  const totalActualCost = filteredProjects.reduce((sum, p) => sum + p.actualCost, 0)
  const totalActualGrossProfit = totalActualRevenue - totalActualCost
  const totalActualGrossProfitRate = totalActualRevenue > 0 ? (totalActualGrossProfit / totalActualRevenue) * 100 : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0
    }).format(value)
  }

  const toggleDetails = (projectId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">読み込み中...</p>
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

      {/* 統合サマリーカード */}
      <div className="prisma-card mb-6">
        {/* 主要指標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 売上 */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-300">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-blue-600" size={28} />
              <p className="text-base font-bold text-blue-900">売上（完工）</p>
            </div>
            <p className="text-2xl font-black text-blue-900">{formatCurrency(totalActualRevenue)}</p>
          </div>

          {/* 原価 */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-300">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="text-orange-600" size={28} />
              <p className="text-base font-bold text-orange-900">原価（完工）</p>
            </div>
            <p className="text-2xl font-black text-orange-900">{formatCurrency(totalActualCost)}</p>
          </div>

          {/* 粗利益 */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-300">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-600" size={28} />
              <p className="text-base font-bold text-green-900">粗利益（完工）</p>
            </div>
            <p className="text-2xl font-black text-green-900">{formatCurrency(totalActualGrossProfit)}</p>
          </div>

          {/* 粗利益率 */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-300">
            <div className="flex items-center gap-3 mb-2">
              <Percent className="text-purple-600" size={28} />
              <p className="text-base font-bold text-purple-900">粗利益率（完工）</p>
            </div>
            <p className="text-2xl font-black text-purple-900">{totalActualGrossProfitRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* 警告サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b-2 border-gray-300">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-2 border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-yellow-900 mb-1">粗利率20%未満</p>
                <p className="text-3xl font-black text-yellow-900">{lowMarginCount}件</p>
              </div>
              <AlertCircle className="text-yellow-600" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border-2 border-red-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-red-900 mb-1">予算差5%以上</p>
                <p className="text-3xl font-black text-red-900">{largeDiffCount}件</p>
              </div>
              <AlertCircle className="text-red-600" size={40} />
            </div>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-base font-bold text-gray-700">フィルター:</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 rounded-xl font-bold border-2 transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              全て ({projects.length})
            </button>
            <button
              onClick={() => setFilter('low_margin')}
              className={`px-6 py-3 rounded-xl font-bold border-2 transition-all ${
                filter === 'low_margin'
                  ? 'bg-yellow-500 text-white border-yellow-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'
              }`}
            >
              粗利率20%未満 ({lowMarginCount})
            </button>
            <button
              onClick={() => setFilter('large_diff')}
              className={`px-6 py-3 rounded-xl font-bold border-2 transition-all ${
                filter === 'large_diff'
                  ? 'bg-red-500 text-white border-red-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
              }`}
            >
              予算差5%以上 ({largeDiffCount})
            </button>
          </div>
        </div>
      </div>

      {/* 案件カード一覧 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-2 prisma-card text-center py-12">
            <AlertCircle className="inline-block mb-2 text-gray-400" size={48} />
            <p className="text-xl text-gray-600">該当する案件がありません</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const hasLowMargin = project.budgetGrossProfitRate < 20 || project.actualGrossProfitRate < 20
            const hasLargeDiff = Math.abs(project.diffGrossProfitRate) >= 5
            const isExpanded = showDetails[project.id] || false

            return (
              <div
                key={project.id}
                className={`rounded-xl border-2 shadow-lg overflow-hidden ${
                  hasLowMargin && hasLargeDiff
                    ? 'border-red-500 bg-red-50'
                    : hasLowMargin
                    ? 'border-yellow-500 bg-yellow-50'
                    : hasLargeDiff
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {/* カードヘッダー */}
                <div className={`p-6 ${hasLowMargin || hasLargeDiff ? 'bg-gradient-to-r from-white to-transparent' : 'bg-gray-50'}`}>
                  <h3 className="text-xl font-black text-gray-900 mb-2">
                    {project.construction_address || '案件名未設定'}
                  </h3>
                  <p className="text-base text-gray-600">
                    請負金額: <span className="font-bold text-blue-900">{formatCurrency(project.contractAmount)}</span>
                  </p>
                </div>

                {/* 完工実績（メイン情報） */}
                <div className="p-6 bg-white">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* 粗利益 */}
                    <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-lg p-4 border border-green-300">
                      <p className="text-sm font-bold text-green-900 mb-1">粗利益</p>
                      <p className={`text-2xl font-black ${project.actualGrossProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(project.actualGrossProfit)}
                      </p>
                    </div>

                    {/* 粗利益率 */}
                    <div className={`rounded-lg p-4 border ${
                      project.actualGrossProfitRate < 20
                        ? 'bg-gradient-to-br from-orange-200 to-orange-100 border-orange-400'
                        : 'bg-gradient-to-br from-purple-100 to-purple-50 border-purple-300'
                    }`}>
                      <p className="text-sm font-bold text-gray-900 mb-1">粗利益率</p>
                      <p className={`text-2xl font-black ${
                        project.actualGrossProfitRate < 20 ? 'text-orange-900' : 'text-purple-900'
                      }`}>
                        {project.actualGrossProfitRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* 予算差 */}
                  <div className={`rounded-lg p-4 border ${
                    Math.abs(project.diffGrossProfitRate) >= 5
                      ? 'bg-gradient-to-br from-red-100 to-red-50 border-red-300'
                      : project.diffGrossProfitRate >= 0
                      ? 'bg-gradient-to-br from-green-100 to-green-50 border-green-300'
                      : 'bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-300'
                  }`}>
                    <p className="text-sm font-bold text-gray-900 mb-2">予算との差額</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-700">粗利益差</p>
                        <p className={`text-lg font-bold ${project.diffGrossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {project.diffGrossProfit >= 0 ? '+' : ''}{formatCurrency(project.diffGrossProfit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700">粗利率差</p>
                        <p className={`text-lg font-bold ${
                          Math.abs(project.diffGrossProfitRate) >= 5
                            ? 'text-red-900'
                            : project.diffGrossProfitRate >= 0
                            ? 'text-green-700'
                            : 'text-yellow-700'
                        }`}>
                          {project.diffGrossProfitRate >= 0 ? '+' : ''}{project.diffGrossProfitRate.toFixed(1)}pt
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 詳細表示切り替えボタン */}
                  <button
                    onClick={() => toggleDetails(project.id)}
                    className="mt-4 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 flex items-center justify-center gap-2 transition-all border border-gray-300"
                  >
                    {isExpanded ? (
                      <>
                        <EyeOff size={20} />
                        詳細を隠す
                      </>
                    ) : (
                      <>
                        <Eye size={20} />
                        詳細を表示
                      </>
                    )}
                  </button>

                  {/* 詳細情報（折りたたみ） */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {/* 実行予算 */}
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <p className="text-sm font-bold text-green-900 mb-2">実行予算</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-700">売上</p>
                            <p className="font-bold text-gray-900">{formatCurrency(project.budgetRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">原価</p>
                            <p className="font-bold text-gray-900">{formatCurrency(project.budgetCost)}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">粗利率</p>
                            <p className="font-bold text-gray-900">{project.budgetGrossProfitRate.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* 完工実績 */}
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <p className="text-sm font-bold text-purple-900 mb-2">完工実績</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-700">売上</p>
                            <p className="font-bold text-gray-900">{formatCurrency(project.actualRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">原価</p>
                            <p className="font-bold text-gray-900">{formatCurrency(project.actualCost)}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">粗利率</p>
                            <p className="font-bold text-gray-900">{project.actualGrossProfitRate.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 注意書き */}
      <div className="prisma-card bg-yellow-50 border-2 border-yellow-300 mt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
          <div className="text-base text-yellow-800">
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
