/**
 * 統合設定画面
 * - 基本設定（デモモード、ダークモード）
 * - kintone連携設定
 * - システム構想ツリー
 */

import { useState, useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { supabase } from '../lib/supabase'
import { KintoneClient, projectToKintoneRecord } from '../lib/kintone'
import { useToast } from '../contexts/ToastContext'
import SystemRoadmap from '../components/SystemRoadmap'
import { Settings as SettingsIcon, Database, TestTube, PlayCircle, Clock, CheckCircle, Palette, Cpu } from 'lucide-react'

interface KintoneSettings {
  domain: string
  apiToken: string
  appId: string
  autoBackupEnabled: boolean
  lastBackupAt?: string
}

type TabType = 'basic' | 'kintone' | 'system'

export default function Settings() {
  const { demoMode, setDemoMode, darkMode, setDarkMode } = useSettings()
  const toast = useToast()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [kintoneSettings, setKintoneSettings] = useState<KintoneSettings>({
    domain: '',
    apiToken: '',
    appId: '',
    autoBackupEnabled: false
  })
  const [testing, setTesting] = useState(false)
  const [backing, setBacking] = useState(false)
  const [backupLogs, setBackupLogs] = useState<any[]>([])

  useEffect(() => {
    loadKintoneSettings()
    loadBackupLogs()
  }, [])

  const loadKintoneSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'kintone_config')
        .maybeSingle()

      if (error) {
        console.error('Failed to load kintone settings:', error)
        showToast('Kintone設定の読み込みに失敗しました', 'error')
        return
      }

      if (data?.value) {
        setKintoneSettings(data.value)
      }
    } catch (error) {
      console.error('Failed to load kintone settings:', error)
      showToast('予期しないエラーが発生しました', 'error')
    }
  }

  const loadBackupLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Failed to load backup logs:', error)
        showToast('バックアップログの読み込みに失敗しました', 'error')
        return
      }

      if (data) {
        setBackupLogs(data)
      }
    } catch (error) {
      console.error('Failed to load backup logs:', error)
      showToast('予期しないエラーが発生しました', 'error')
    }
  }

  const saveKintoneSettings = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'kintone_config',
          value: kintoneSettings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      showToast('設定を保存しました', 'success')
    } catch (error) {
      console.error('Failed to save settings:', error)
      showToast('設定の保存に失敗しました', 'error')
    }
  }

  const testConnection = async () => {
    if (!kintoneSettings.domain || !kintoneSettings.apiToken || !kintoneSettings.appId) {
      showToast('すべての項目を入力してください', 'error')
      return
    }

    setTesting(true)
    try {
      const client = new KintoneClient(kintoneSettings.domain, kintoneSettings.apiToken)
      const result = await client.testConnection(kintoneSettings.appId)

      if (result.success) {
        showToast('✅ kintone接続テスト成功', 'success')
      } else {
        showToast(`❌ 接続テスト失敗: ${result.error}`, 'error')
      }
    } catch (error) {
      showToast('接続テストでエラーが発生しました', 'error')
    } finally {
      setTesting(false)
    }
  }

  const runBackup = async () => {
    if (!kintoneSettings.domain || !kintoneSettings.apiToken || !kintoneSettings.appId) {
      showToast('kintone設定を保存してください', 'error')
      return
    }

    setBacking(true)
    const startTime = new Date()

    try {
      const { data: projects, error: fetchError } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:employees!sales_staff_id(*),
          design:employees!design_staff_id(*),
          construction:employees!construction_staff_id(*)
        `)

      if (fetchError) throw fetchError

      const client = new KintoneClient(kintoneSettings.domain, kintoneSettings.apiToken)

      let successCount = 0
      let errorCount = 0

      for (const project of projects || []) {
        try {
          const kintoneRecord = projectToKintoneRecord(project)
          await client.createRecord(kintoneSettings.appId, kintoneRecord)
          successCount++
        } catch (error) {
          console.error(`Failed to backup project ${project.id}:`, error)
          errorCount++
        }
      }

      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

      await supabase.from('backup_logs').insert({
        status: errorCount > 0 ? 'partial' : 'success',
        total_records: projects?.length || 0,
        success_count: successCount,
        error_count: errorCount,
        duration_seconds: duration,
        created_at: new Date().toISOString()
      })

      setKintoneSettings({ ...kintoneSettings, lastBackupAt: new Date().toISOString() })
      await saveKintoneSettings()
      await loadBackupLogs()

      showToast(
        `✅ バックアップ完了: ${successCount}件成功 ${errorCount > 0 ? `(${errorCount}件失敗)` : ''}`,
        errorCount > 0 ? 'warning' : 'success'
      )
    } catch (error) {
      console.error('Backup failed:', error)
      showToast('バックアップに失敗しました', 'error')

      await supabase.from('backup_logs').insert({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        created_at: new Date().toISOString()
      })
    } finally {
      setBacking(false)
    }
  }

  return (
    <div className="prisma-content">
      <div className="prisma-header">
        <h1 className="prisma-header-title">設定</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">アプリケーションの設定を管理します</p>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="flex gap-2 border-b-3 border-gray-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-base transition-all ${
              activeTab === 'basic'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Palette size={20} />
            基本設定
          </button>
          <button
            onClick={() => setActiveTab('kintone')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-base transition-all ${
              activeTab === 'kintone'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database size={20} />
            kintone連携
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-base transition-all ${
              activeTab === 'system'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cpu size={20} />
            システム構想
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* 基本設定タブ */}
        {activeTab === 'basic' && (
          <>
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
                        onClick={() => {
                          try {
                            setDemoMode(!demoMode)
                          } catch (error) {
                            console.error('デモモード切替エラー:', error)
                            toast.error('デモモードの切替に失敗しました')
                          }
                        }}
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
                        onClick={() => {
                          try {
                            setDarkMode(!darkMode)
                          } catch (error) {
                            console.error('ダークモード切替エラー:', error)
                            toast.error('ダークモードの切替に失敗しました')
                          }
                        }}
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
          </>
        )}

        {/* kintone連携タブ */}
        {activeTab === 'kintone' && (
          <>
            {/* kintone連携設定 */}
            <div className="prisma-card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Database size={20} />
                  kintone連携設定
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      kintoneドメイン
                    </label>
                    <input
                      type="text"
                      value={kintoneSettings.domain}
                      onChange={(e) => setKintoneSettings({ ...kintoneSettings, domain: e.target.value })}
                      placeholder="例: yourcompany.cybozu.com"
                      className="prisma-input"
                    />
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      https:// は不要です。ドメイン名のみを入力してください
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      APIトークン
                    </label>
                    <input
                      type="password"
                      value={kintoneSettings.apiToken}
                      onChange={(e) => setKintoneSettings({ ...kintoneSettings, apiToken: e.target.value })}
                      placeholder="APIトークンを入力"
                      className="prisma-input"
                    />
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      kintoneアプリの設定から生成したAPIトークンを入力
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      アプリID
                    </label>
                    <input
                      type="text"
                      value={kintoneSettings.appId}
                      onChange={(e) => setKintoneSettings({ ...kintoneSettings, appId: e.target.value })}
                      placeholder="例: 123"
                      className="prisma-input"
                    />
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      バックアップ先のkintoneアプリのID
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={saveKintoneSettings}
                      className="prisma-btn prisma-btn-primary"
                    >
                      設定を保存
                    </button>
                    <button
                      onClick={testConnection}
                      disabled={testing}
                      className="prisma-btn prisma-btn-secondary flex items-center gap-2"
                    >
                      <TestTube size={16} />
                      {testing ? '接続テスト中...' : '接続テスト'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* バックアップ実行 */}
            <div className="prisma-card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <PlayCircle size={20} />
                  手動バックアップ
                </h3>
                <p className="text-base text-gray-700 dark:text-gray-300 mb-4">
                  現在のすべての案件データをkintoneにバックアップします。
                </p>
                {kintoneSettings.lastBackupAt && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    最終バックアップ: {new Date(kintoneSettings.lastBackupAt).toLocaleString('ja-JP')}
                  </p>
                )}
                <button
                  onClick={runBackup}
                  disabled={backing}
                  className="prisma-btn prisma-btn-primary flex items-center gap-2"
                >
                  <Database size={16} />
                  {backing ? 'バックアップ中...' : 'いますぐバックアップを実行'}
                </button>
              </div>
            </div>

            {/* バックアップ履歴 */}
            <div className="prisma-card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Clock size={20} />
                  バックアップ履歴
                </h3>

                {backupLogs.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">バックアップ履歴はありません</p>
                ) : (
                  <div className="space-y-3">
                    {backupLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle
                            size={20}
                            className={
                              log.status === 'success'
                                ? 'text-green-600'
                                : log.status === 'partial'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }
                          />
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {new Date(log.created_at).toLocaleString('ja-JP')}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {log.success_count || 0}件成功
                              {log.error_count > 0 && ` / ${log.error_count}件失敗`}
                              {log.duration_seconds && ` (${log.duration_seconds}秒)`}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-bold ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : log.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {log.status === 'success'
                            ? '成功'
                            : log.status === 'partial'
                            ? '一部成功'
                            : 'エラー'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* システム構想タブ */}
        {activeTab === 'system' && (
          <SystemRoadmap />
        )}
      </div>
    </div>
  )
}
