/**
 * システム構想ツリーコンポーネント
 * G-progressの全体構想を視覚的に表示（カード形式サイトマップ）
 */

import { useState } from 'react'
import { Sparkles, X, CheckCircle, Circle, Home, BarChart, FileText, Settings, DollarSign, Users } from 'lucide-react'

export default function SystemRoadmap() {
  const [showRoadmap, setShowRoadmap] = useState(false)

  // 実装済み機能
  const implementedFeatures = [
    { name: 'トップページ', path: '/', icon: Home },
    { name: 'ダッシュボード', path: '/dashboard', icon: BarChart },
    { name: 'タスクボード', path: '/task-board', icon: FileText },
    { name: '案件一覧', path: '/projects', icon: FileText },
    { name: '案件詳細', path: '/projects/:id', icon: FileText },
    { name: '入金管理', path: '/payments', icon: DollarSign },
    { name: '粗利益管理', path: '/gross-profit', icon: BarChart },
    { name: '性能管理', path: '/performance', icon: BarChart },
    { name: 'カレンダー', path: '/calendar', icon: FileText },
    { name: '職種別タスク', path: '/tasks-by-position', icon: Users },
    { name: '遅延タスク', path: '/delayed-tasks', icon: FileText },
    { name: '組織管理', path: '/organizations', icon: Users },
    { name: '承認フロー', path: '/approval-flow', icon: Settings },
    { name: 'レポート', path: '/reports', icon: BarChart },
    { name: '監査ログ', path: '/audit-logs', icon: FileText },
    { name: 'CSVインポート', path: '/import-csv', icon: FileText },
    { name: 'タスクマスタ管理', path: '/task-masters', icon: Settings },
  ]

  // 計画中機能
  const plannedFeatures = [
    { name: 'マルチテナント対応', category: '注文住宅事業' },
    { name: '権限管理強化', category: '注文住宅事業' },
    { name: '通知機能', category: '注文住宅事業' },
  ]

  // その他の事業
  const otherBusinesses = [
    { name: '不動産賃貸事業', status: '未実装' },
    { name: '保険販売事業', status: '未実装' },
    { name: '太陽光販売事業', status: '未実装' },
    { name: 'リフォーム事業', status: '未実装' },
    { name: '外構事業', status: '未実装' },
  ]

  return (
    <>
      {/* トリガーボタン */}
      <div className="prisma-card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            システム全体構想
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-base mb-4">
            G-progressは、会社全体の基幹システムとして6つの事業を包括する総合経営管理システムを目指しています。
          </p>
          <button
            onClick={() => setShowRoadmap(true)}
            className="prisma-btn prisma-btn-primary flex items-center gap-2"
          >
            <Sparkles size={20} />
            今後の構想を見る
          </button>
        </div>
      </div>

      {/* システムロードマップモーダル */}
      {showRoadmap && (
        <div className="prisma-modal-overlay" onClick={() => setShowRoadmap(false)}>
          <div
            className="prisma-modal"
            style={{ maxWidth: '1400px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">G-progress システムサイトマップ</h2>
                <button
                  onClick={() => setShowRoadmap(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                会社全体を包括する総合経営管理システムの全体像
              </p>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content">

              {/* ルートノード */}
              <div className="mb-8 text-center">
                <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 rounded-xl shadow-2xl border-4 border-blue-800">
                  <div className="text-2xl font-bold">G-progress</div>
                  <div className="text-sm opacity-90 mt-1">総合経営管理システム</div>
                </div>
              </div>

              {/* 注文住宅事業（実装中） */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold text-lg border-2 border-green-500">
                    注文住宅事業
                  </div>
                  <span className="prisma-badge prisma-badge-green animate-pulse">実装中</span>
                </div>

                {/* 実装済み機能 */}
                <div className="mb-6">
                  <h4 className="text-base font-bold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-600" />
                    実装済み機能
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {implementedFeatures.map((feature) => (
                      <div
                        key={feature.path}
                        className="bg-white dark:bg-gray-800 border-2 border-green-400 rounded-lg p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <feature.icon size={18} className="text-green-600" />
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                            {feature.name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {feature.path}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 計画中機能 */}
                <div>
                  <h4 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Circle size={20} className="text-gray-500" />
                    計画中機能
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {plannedFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-400 rounded-lg p-4"
                      >
                        <div className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-1">
                          {feature.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {feature.category}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* その他の事業（未実装） */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Circle size={20} className="text-gray-400" />
                  その他の事業（未実装）
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherBusinesses.map((business, index) => (
                    <div
                      key={index}
                      className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 rounded-lg p-6 text-center"
                    >
                      <div className="font-bold text-gray-800 dark:text-gray-200 text-base mb-2">
                        {business.name}
                      </div>
                      <span className="prisma-badge prisma-badge-gray text-xs">
                        {business.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
