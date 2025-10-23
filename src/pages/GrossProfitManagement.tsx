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
  revenue: number // 売上
  cost: number // 原価
  grossProfit: number // 粗利益
  grossProfitRate: number // 粗利益率
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
          const revenue = Math.random() * 50000000 + 30000000 // 仮の売上: 3000万〜8000万
          const cost = revenue * (0.6 + Math.random() * 0.2) // 仮の原価: 売上の60%〜80%
          const grossProfit = revenue - cost
          const grossProfitRate = (grossProfit / revenue) * 100

          return {
            ...project,
            revenue,
            cost,
            grossProfit,
            grossProfitRate
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
    if (filter === 'positive') return project.grossProfit > 0
    if (filter === 'negative') return project.grossProfit <= 0
    return true
  })

  const totalRevenue = filteredProjects.reduce((sum, p) => sum + p.revenue, 0)
  const totalCost = filteredProjects.reduce((sum, p) => sum + p.cost, 0)
  const totalGrossProfit = totalRevenue - totalCost
  const totalGrossProfitRate = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0

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
        <div className="prisma-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="text-center">
            <DollarSign className="text-blue-600 dark:text-blue-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">売上</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>

        <div className="prisma-card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <div className="text-center">
            <TrendingUp className="text-red-600 dark:text-red-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">原価</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        <div className="prisma-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="text-center">
            <TrendingUp className="text-green-600 dark:text-green-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">粗利益</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalGrossProfit)}
            </p>
          </div>
        </div>

        <div className="prisma-card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="text-center">
            <Percent className="text-purple-600 dark:text-purple-400 mx-auto mb-2" size={32} />
            <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">粗利益率</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {totalGrossProfitRate.toFixed(1)}%
            </p>
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
              黒字 ({projects.filter(p => p.grossProfit > 0).length})
            </button>
            <button
              onClick={() => setFilter('negative')}
              className={`prisma-btn ${filter === 'negative' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              赤字 ({projects.filter(p => p.grossProfit <= 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="prisma-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="prisma-table-container" style={{ overflowX: 'auto' }}>
          <table className="prisma-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '1200px' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-base font-bold text-gray-900 dark:text-gray-100">
                  案件名
                </th>
                <th className="px-4 py-3 text-left text-base font-bold text-gray-900 dark:text-gray-100">
                  顧客名
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100">
                  売上
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100">
                  原価
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100">
                  粗利益
                </th>
                <th className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-100">
                  粗利益率
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
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
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {project.construction_address || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {Array.isArray(project.customer?.names) && project.customer.names.length > 0
                        ? project.customer.names[0]
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(project.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(project.cost)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-bold ${
                        project.grossProfit > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(project.grossProfit)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-bold ${
                        project.grossProfitRate > 20
                          ? 'text-green-600 dark:text-green-400'
                          : project.grossProfitRate > 10
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {project.grossProfitRate.toFixed(1)}%
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
