/**
 * 設定画面
 * - デモモード切り替え
 * - ライト/ダークモード切り替え
 */

import { useSettings } from '../contexts/SettingsContext'

export default function Settings() {
  const { demoMode, setDemoMode, darkMode, setDarkMode } = useSettings()

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
    </div>
  )
}
