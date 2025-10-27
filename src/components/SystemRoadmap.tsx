/**
 * システム構想ツリーコンポーネント
 * G-progressの全体構想を視覚的に表示
 */

import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'

export default function SystemRoadmap() {
  const [showRoadmap, setShowRoadmap] = useState(false)

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
                <h2 className="prisma-modal-title">G-progress システム構想ツリー</h2>
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
            <div className="prisma-modal-content overflow-x-auto">
              {/* 横型ツリー構造 */}
              <div className="inline-block min-w-full">
                <div className="flex items-start gap-0" style={{ minWidth: 'max-content' }}>

                  {/* ルートノード */}
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl shadow-xl border-3 border-black whitespace-nowrap">
                      <div className="text-xl font-bold">G-progress</div>
                      <div className="text-sm opacity-90 mt-1">総合経営管理システム</div>
                    </div>
                  </div>

                  {/* 主接続線 */}
                  <div className="flex items-center">
                    <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                  </div>

                  {/* 6事業への分岐 */}
                  <div className="flex flex-col justify-center relative">
                    {/* 縦の幹線 */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-600 dark:bg-gray-400" style={{ left: '0px' }}></div>

                      {/* 注文住宅事業 - 実装中（詳細展開あり） */}
                      <div className="flex items-start gap-0 relative">
                        {/* 横線 */}
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400 mt-6"></div>

                        {/* 注文住宅カード */}
                        <div className="flex items-start gap-0">
                          <div className="prisma-card border-3 border-green-500 shadow-xl" style={{ minWidth: '280px' }}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">注文住宅事業</h3>
                              <span className="prisma-badge prisma-badge-green animate-pulse">実装中</span>
                            </div>
                          </div>

                          {/* 注文住宅の詳細展開 */}
                          <div className="flex items-center">
                            <div className="h-0.5 w-8 bg-gray-600 dark:bg-gray-400"></div>
                          </div>

                          <div className="flex flex-col gap-0 relative">
                            {/* 縦幹線 */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-600 dark:bg-gray-400"></div>

                            {/* 実装済み */}
                            <div className="flex items-start gap-0 relative">
                              <div className="h-0.5 w-8 bg-gray-600 dark:bg-gray-400" style={{ marginTop: '16px' }}></div>
                              <div className="flex flex-col gap-0 relative">
                                <div className="prisma-card border-2 border-green-400 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '180px' }}>
                                  <div className="font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                                    <span className="text-green-500">✓</span> 実装済み
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400"></div>
                                </div>
                                <div className="flex flex-col gap-0 relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-500 dark:bg-gray-400"></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">トップページ (/)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">ダッシュボード (/dashboard)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">タスクボード (/task-board)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">案件一覧 (/projects)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">案件詳細 (/projects/:id)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">入金管理 (/payments)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">粗利益管理 (/gross-profit)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">性能管理 (/performance)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">カレンダー (/calendar)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">職種別タスク (/tasks-by-position)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">遅延タスク (/delayed-tasks)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">組織管理 (/organizations)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">承認フロー (/approval-flow)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">レポート (/reports)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">監査ログ (/audit-logs)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">CSVインポート (/import-csv)</div></div>
                                </div>
                              </div>
                            </div>

                            {/* 計画中 */}
                            <div className="flex items-start gap-0 relative mt-4">
                              <div className="h-0.5 w-8 bg-gray-600 dark:bg-gray-400" style={{ marginTop: '16px' }}></div>
                              <div className="flex flex-col gap-0 relative">
                                <div className="prisma-card border-2 border-gray-400 bg-gray-50 dark:bg-gray-800" style={{ minWidth: '180px' }}>
                                  <div className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <span className="text-gray-400">○</span> 計画中
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="h-0.5 w-6 bg-gray-400 dark:bg-gray-500"></div>
                                </div>
                                <div className="flex flex-col gap-0 relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500"></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-400 dark:bg-gray-500" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap opacity-60">ミスロス報告</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-400 dark:bg-gray-500" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap opacity-60">発注・積算</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-400 dark:bg-gray-500" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap opacity-60">オプション管理</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-400 dark:bg-gray-500" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap opacity-60">キャンペーン情報</div></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 不動産事業 */}
                      <div className="flex items-center gap-0 mt-4">
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                        <div className="prisma-card opacity-70" style={{ minWidth: '280px' }}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">不動産事業</h3>
                            <span className="prisma-badge prisma-badge-gray">予定</span>
                          </div>
                        </div>
                      </div>

                      {/* 外構事業 */}
                      <div className="flex items-center gap-0 mt-4">
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                        <div className="prisma-card opacity-70" style={{ minWidth: '280px' }}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">外構事業</h3>
                            <span className="prisma-badge prisma-badge-gray">予定</span>
                          </div>
                        </div>
                      </div>

                      {/* 賃貸管理事業 */}
                      <div className="flex items-center gap-0 mt-4">
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                        <div className="prisma-card opacity-70" style={{ minWidth: '280px' }}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">賃貸管理事業</h3>
                            <span className="prisma-badge prisma-badge-gray">予定</span>
                          </div>
                        </div>
                      </div>

                      {/* リフォーム事業 */}
                      <div className="flex items-center gap-0 mt-4">
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                        <div className="prisma-card opacity-70" style={{ minWidth: '280px' }}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">リフォーム事業</h3>
                            <span className="prisma-badge prisma-badge-gray">予定</span>
                          </div>
                        </div>
                      </div>

                      {/* BtoB事業 */}
                      <div className="flex items-center gap-0 mt-4">
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                        <div className="prisma-card opacity-70" style={{ minWidth: '280px' }}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">BtoB事業</h3>
                            <span className="prisma-badge prisma-badge-gray">予定</span>
                          </div>
                        </div>
                      </div>

                      {/* マスタ管理 */}
                      <div className="flex items-center gap-0 mt-4">
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                        <div className="flex items-start gap-0">
                          <div className="prisma-card border-3 border-green-500 shadow-xl" style={{ minWidth: '280px' }}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">マスタ管理</h3>
                              <span className="prisma-badge prisma-badge-green animate-pulse">実装中</span>
                            </div>
                          </div>

                          {/* マスタ管理の詳細展開 */}
                          <div className="flex items-center">
                            <div className="h-0.5 w-8 bg-gray-600 dark:bg-gray-400"></div>
                          </div>

                          <div className="flex flex-col gap-0 relative">
                            {/* 縦幹線 */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-600 dark:bg-gray-400"></div>

                            {/* 実装済み */}
                            <div className="flex items-start gap-0 relative">
                              <div className="h-0.5 w-8 bg-gray-600 dark:bg-gray-400" style={{ marginTop: '16px' }}></div>
                              <div className="flex flex-col gap-0 relative">
                                <div className="prisma-card border-2 border-green-400 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '180px' }}>
                                  <div className="font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                                    <span className="text-green-500">✓</span> 実装済み
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400"></div>
                                </div>
                                <div className="flex flex-col gap-0 relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-500 dark:bg-gray-400"></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">商品マスタ (/master/products)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">タスクマスタ (/master/tasks)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">従業員マスタ (/master/employees)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">部門マスタ (/master/departments)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">役割マスタ (/master/roles)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">拠点マスタ (/master/branches)</div></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 全社共通 */}
                      <div className="flex items-center gap-0 mt-4">
                        <div className="h-0.5 w-12 bg-gray-600 dark:bg-gray-400"></div>
                        <div className="flex items-start gap-0">
                          <div className="prisma-card border-3 border-purple-500 shadow-xl" style={{ minWidth: '280px' }}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">全社共通</h3>
                              <span className="prisma-badge prisma-badge-green animate-pulse">実装中</span>
                            </div>
                          </div>

                          {/* 全社共通の詳細展開 */}
                          <div className="flex items-center">
                            <div className="h-0.5 w-8 bg-gray-600 dark:bg-gray-400"></div>
                          </div>

                          <div className="flex flex-col gap-0 relative">
                            {/* 縦幹線 */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-600 dark:bg-gray-400"></div>

                            {/* 実装済み */}
                            <div className="flex items-start gap-0 relative">
                              <div className="h-0.5 w-8 bg-gray-600 dark:bg-gray-400" style={{ marginTop: '16px' }}></div>
                              <div className="flex flex-col gap-0 relative">
                                <div className="prisma-card border-2 border-green-400 bg-green-50 dark:bg-green-900/20" style={{ minWidth: '180px' }}>
                                  <div className="font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                                    <span className="text-green-500">✓</span> 実装済み
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400"></div>
                                </div>
                                <div className="flex flex-col gap-0 relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-500 dark:bg-gray-400"></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">従業員管理 (/employee-management)</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">設定 (/settings)</div></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              {/* フェーズ情報 */}
              <div className="mt-8 prisma-card bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    現在のフェーズ
                  </div>
                  <div className="text-base text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">第1フェーズ:</span> 注文住宅事業の基盤機能構築中
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    他の事業部門は順次展開予定
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => setShowRoadmap(false)}
                className="prisma-btn prisma-btn-secondary"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
