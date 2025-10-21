/**
 * 設定画面
 * - デモモード切り替え
 * - ライト/ダークモード切り替え
 */

import { useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { Sparkles, X } from 'lucide-react'

export default function Settings() {
  const { demoMode, setDemoMode, darkMode, setDarkMode } = useSettings()
  const [showRoadmap, setShowRoadmap] = useState(false)

  return (
    <div className="prisma-content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">設定</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">アプリケーションの設定を管理します</p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* デモモード設定 */}
        <div className="prisma-card">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    デモモード
                  </h3>
                  <button
                    onClick={() => setDemoMode(!demoMode)}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      demoMode
                        ? 'bg-blue-600 focus:ring-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                    }`}
                  >
                    <span
                      className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                        demoMode ? 'translate-x-10' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base mb-3">
                  デモモードを有効にすると、サンプルデータが表示されます。
                  別会社へのプレゼンテーション時に使用できます。
                  デモモードをオフにすると、Supabaseの実際のデータと同期されます。
                </p>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-base font-medium ${
                    demoMode
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {demoMode ? '有効（サンプルデータ表示中）' : '無効（本番データ表示中）'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ダークモード設定 */}
        <div className="prisma-card">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    ダークモード
                  </h3>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode
                        ? 'bg-indigo-600 focus:ring-indigo-500'
                        : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                    }`}
                  >
                    <span
                      className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                        darkMode ? 'translate-x-10' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base mb-3">
                  ダークモードを有効にすると、画面が暗い配色になります。
                  目の疲れを軽減し、夜間の作業に適しています。
                </p>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-base font-medium ${
                    darkMode
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {darkMode ? 'ダークモード' : 'ライトモード'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 設定情報 */}
        <div className="prisma-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              現在の設定状態
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300 font-medium">データソース</span>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                  {demoMode ? 'サンプルデータ' : 'Supabase（本番）'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300 font-medium">テーマ</span>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                  {darkMode ? 'ダーク' : 'ライト'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 dark:text-gray-300 font-medium">設定の保存</span>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                  LocalStorage
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* システムロードマップボタン */}
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

        {/* 注意事項 */}
        {demoMode && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200 font-medium">
                  デモモードが有効です
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                  現在表示されているデータはサンプルです。実際のデータベースには接続されていません。
                  本番データに戻すには、デモモードをオフにしてください。
                </p>
              </div>
            </div>
          </div>
        )}
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
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">案件管理</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">タスク管理</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">入金管理</div></div>
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-500 dark:bg-gray-400" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap">性能管理</div></div>
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
                                  <div className="flex items-center gap-0"><div className="h-0.5 w-6 bg-gray-400 dark:bg-gray-500" style={{ marginTop: '12px' }}></div><div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm whitespace-nowrap opacity-60">承認フロー</div></div>
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
    </div>
  )
}
