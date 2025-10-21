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
            <div className="prisma-modal-content">
              {/* ルートノード */}
              <div className="flex flex-col items-center mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl shadow-2xl border-4 border-black">
                  <div className="text-2xl font-bold text-center">G-progress</div>
                  <div className="text-base opacity-90 text-center mt-1">総合経営管理システム</div>
                </div>

                {/* 縦の接続線 */}
                <div className="w-1 h-12 bg-gray-400 dark:bg-gray-500"></div>

                {/* 分岐点 */}
                <div className="w-full max-w-5xl relative">
                  {/* 横の接続線 */}
                  <div className="h-1 bg-gray-400 dark:bg-gray-500 absolute top-0 left-0 right-0"></div>

                  {/* 6つの縦線 */}
                  <div className="grid grid-cols-6 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex justify-center">
                        <div className="w-1 h-12 bg-gray-400 dark:bg-gray-500"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6事業部門カード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 注文住宅事業 - 実装中 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border-4 border-green-500 shadow-2xl p-6 transform hover:scale-105 transition-transform">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">注文住宅事業</h3>
                    <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full animate-pulse">
                      実装中
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <span className="text-green-500 text-xl">✓</span>
                        実装済み
                      </div>
                      <div className="space-y-1 ml-7">
                        <div className="text-sm text-green-700 dark:text-green-300">• 案件管理</div>
                        <div className="text-sm text-green-700 dark:text-green-300">• タスク管理</div>
                        <div className="text-sm text-green-700 dark:text-green-300">• 入金管理</div>
                        <div className="text-sm text-green-700 dark:text-green-300">• 性能管理</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                      <div className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <span className="text-gray-400 text-xl">○</span>
                        計画中
                      </div>
                      <div className="space-y-1 ml-7">
                        <div className="text-sm text-gray-500 dark:text-gray-400">• 承認フロー</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">• ミスロス報告</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">• 発注・積算</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">• オプション管理</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">• キャンペーン情報</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 不動産事業 */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border-3 border-gray-300 dark:border-gray-600 shadow-lg p-6 opacity-80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">不動産事業</h3>
                    <span className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-full">
                      予定
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>• 物件管理</div>
                    <div>• 契約管理</div>
                    <div>• 顧客管理</div>
                    <div>• 売買履歴管理</div>
                  </div>
                </div>

                {/* 外構事業 */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border-3 border-gray-300 dark:border-gray-600 shadow-lg p-6 opacity-80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">外構事業</h3>
                    <span className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-full">
                      予定
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>• 外構設計管理</div>
                    <div>• 工事進捗管理</div>
                    <div>• 見積・発注管理</div>
                    <div>• 業者管理</div>
                  </div>
                </div>

                {/* 賃貸管理事業 */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border-3 border-gray-300 dark:border-gray-600 shadow-lg p-6 opacity-80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">賃貸管理事業</h3>
                    <span className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-full">
                      予定
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>• 物件管理</div>
                    <div>• 入居者管理</div>
                    <div>• 契約更新管理</div>
                    <div>• 収支管理</div>
                  </div>
                </div>

                {/* リフォーム事業 */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border-3 border-gray-300 dark:border-gray-600 shadow-lg p-6 opacity-80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">リフォーム事業</h3>
                    <span className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-full">
                      予定
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>• 案件管理</div>
                    <div>• 施工管理</div>
                    <div>• 見積管理</div>
                    <div>• 顧客履歴管理</div>
                  </div>
                </div>

                {/* BtoB事業 */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border-3 border-gray-300 dark:border-gray-600 shadow-lg p-6 opacity-80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">BtoB事業</h3>
                    <span className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-full">
                      予定
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>• 企業間取引管理</div>
                    <div>• 商談管理</div>
                    <div>• 契約管理</div>
                    <div>• パートナー管理</div>
                  </div>
                </div>
              </div>

              {/* フェーズ情報 */}
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border-2 border-gray-300 dark:border-gray-600">
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
