/**
 * 統合設定画面
 * - 基本設定（デモモード、ダークモード）
 * - kintone連携設定
 * - システム構想ツリー
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../contexts/SettingsContext'
import { supabase } from '../lib/supabase'
import { KintoneClient, projectToKintoneRecord } from '../lib/kintone'
import { useToast } from '../contexts/ToastContext'
import SystemRoadmap from '../components/SystemRoadmap'
import { Settings as SettingsIcon, Database, TestTube, PlayCircle, Clock, CheckCircle, Palette, Cpu, MessageSquare, Cloud } from 'lucide-react'

interface KintoneSettings {
  domain: string
  apiToken: string
  appId: string
  autoBackupEnabled: boolean
  lastBackupAt?: string
}

interface LineSettings {
  channelId: string
  channelSecret: string
  channelAccessToken: string
  webhookUrl: string
  enabled: boolean
  messageRetentionDays: number
  autoReplyEnabled: boolean
  lastSyncAt?: string
}

type TabType = 'basic' | 'kintone' | 'line' | 'system' | 'aws'

export default function Settings() {
  const { demoMode, setDemoMode, darkMode, setDarkMode } = useSettings()
  const toast = useToast()
  const { showToast } = useToast()

  // タブURLパラメータ管理
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as TabType
  const validTabs: TabType[] = ['basic', 'kintone', 'line', 'system', 'aws']
  const initialTab = validTabs.includes(tabParam) ? tabParam : 'basic'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // タブ変更時にURLパラメータを更新
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab)
    setSearchParams({ tab: newTab })
  }
  const [kintoneSettings, setKintoneSettings] = useState<KintoneSettings>({
    domain: '',
    apiToken: '',
    appId: '',
    autoBackupEnabled: false
  })
  const [lineSettings, setLineSettings] = useState<LineSettings>({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
    webhookUrl: '',
    enabled: false,
    messageRetentionDays: 365,
    autoReplyEnabled: false
  })
  const [testing, setTesting] = useState(false)
  const [backing, setBacking] = useState(false)
  const [backupLogs, setBackupLogs] = useState<any[]>([])

  useEffect(() => {
    loadKintoneSettings()
    loadLineSettings()
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
        showToast('Kintone設定の読み込みに失敗しました', 'error')
        return
      }

      if (data?.value) {
        setKintoneSettings(data.value)
      }
    } catch (error) {
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
        showToast('バックアップログの読み込みに失敗しました', 'error')
        return
      }

      if (data) {
        setBackupLogs(data)
      }
    } catch (error) {
      showToast('予期しないエラーが発生しました', 'error')
    }
  }

  const loadLineSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'line_config')
        .maybeSingle()

      if (error) {
        showToast('LINE設定の読み込みに失敗しました', 'error')
        return
      }

      if (data?.value) {
        setLineSettings(data.value)
      }
    } catch (error) {
      showToast('予期しないエラーが発生しました', 'error')
    }
  }

  const saveLineSettings = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'line_config',
          value: lineSettings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      showToast('LINE設定を保存しました', 'success')
    } catch (error) {
      showToast('LINE設定の保存に失敗しました', 'error')
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
        <div className="flex gap-2 border-b-2 border-gray-300">
          <button
            onClick={() => handleTabChange('basic')}
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
            onClick={() => handleTabChange('kintone')}
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
            onClick={() => handleTabChange('line')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-base transition-all ${
              activeTab === 'line'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare size={20} />
            LINE連携
          </button>
          <button
            onClick={() => handleTabChange('system')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-base transition-all ${
              activeTab === 'system'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cpu size={20} />
            システム構想
          </button>
          <button
            onClick={() => handleTabChange('aws')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-base transition-all ${
              activeTab === 'aws'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cloud size={20} />
            AWS移行
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
                    <p className="text-base text-yellow-700 dark:text-yellow-200 font-medium">
                      デモモードが有効です
                    </p>
                    <p className="text-base text-yellow-600 dark:text-yellow-300 mt-1 font-bold">
                      サンプルデータ表示中（実際のDBには未接続）
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
                    <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
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
                    <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
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
                  <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
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
                            <p className="text-base text-gray-600 dark:text-gray-400">
                              {log.success_count || 0}件成功
                              {log.error_count > 0 && ` / ${log.error_count}件失敗`}
                              {log.duration_seconds && ` (${log.duration_seconds}秒)`}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-base font-bold ${
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

        {/* LINE連携タブ */}
        {activeTab === 'line' && (
          <>
            {/* LINE連携概要 */}
            <div className="prisma-card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MessageSquare size={24} />
                  LINE連携について（将来実装予定）
                </h3>
                <p className="text-base text-gray-700 dark:text-gray-300 mb-4">
                  この機能は、顧客とのLINEでのやり取りをG-progressに自動保存し、一元管理するための設定です。
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-green-300 dark:border-green-700">
                  <h4 className="font-bold text-base text-gray-800 dark:text-gray-100 mb-2">実装予定の機能</h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                      顧客からのLINEメッセージを自動受信・保存
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                      画像・ファイルの添付データも保存
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                      プロジェクト詳細画面でLINE履歴を時系列表示
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                      重要なメッセージをタスクに変換
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                      担当者変更時の引き継ぎが容易に
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* LINE API設定 */}
            <div className="prisma-card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MessageSquare size={20} />
                  LINE API設定
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      チャネルID
                    </label>
                    <input
                      type="text"
                      value={lineSettings.channelId}
                      onChange={(e) => setLineSettings({ ...lineSettings, channelId: e.target.value })}
                      placeholder="例: 1234567890"
                      className="prisma-input"
                    />
                    <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                      LINE Developers ConsoleのMessaging APIチャネルIDを入力
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      チャネルシークレット
                    </label>
                    <input
                      type="password"
                      value={lineSettings.channelSecret}
                      onChange={(e) => setLineSettings({ ...lineSettings, channelSecret: e.target.value })}
                      placeholder="チャネルシークレットを入力"
                      className="prisma-input"
                    />
                    <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                      Webhook検証に使用されるシークレットキー
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      チャネルアクセストークン
                    </label>
                    <input
                      type="password"
                      value={lineSettings.channelAccessToken}
                      onChange={(e) => setLineSettings({ ...lineSettings, channelAccessToken: e.target.value })}
                      placeholder="チャネルアクセストークンを入力"
                      className="prisma-input"
                    />
                    <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                      LINE APIへのアクセスに使用する長期トークン
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Webhook URL（参考）
                    </label>
                    <input
                      type="text"
                      value={lineSettings.webhookUrl || 'https://your-domain.com/api/line/webhook'}
                      onChange={(e) => setLineSettings({ ...lineSettings, webhookUrl: e.target.value })}
                      placeholder="https://your-domain.com/api/line/webhook"
                      className="prisma-input"
                    />
                    <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                      LINE Developersコンソールに設定するWebhook URL（実装時に自動生成）
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={saveLineSettings}
                      className="prisma-btn prisma-btn-primary"
                    >
                      設定を保存
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 動作設定 */}
            <div className="prisma-card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  動作設定
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-bold text-base text-gray-800 dark:text-gray-100">LINE連携を有効化</p>
                      <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                        ONにすると、LINEメッセージの受信を開始します
                      </p>
                    </div>
                    <button
                      onClick={() => setLineSettings({ ...lineSettings, enabled: !lineSettings.enabled })}
                      className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        lineSettings.enabled
                          ? 'bg-green-600 focus:ring-green-500'
                          : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                          lineSettings.enabled ? 'translate-x-10' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-bold text-base text-gray-800 dark:text-gray-100">自動返信機能</p>
                      <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                        営業時間外などに自動返信メッセージを送信（実装予定）
                      </p>
                    </div>
                    <button
                      onClick={() => setLineSettings({ ...lineSettings, autoReplyEnabled: !lineSettings.autoReplyEnabled })}
                      className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        lineSettings.autoReplyEnabled
                          ? 'bg-blue-600 focus:ring-blue-500'
                          : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                          lineSettings.autoReplyEnabled ? 'translate-x-10' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-2">
                      メッセージ保存期間（日数）
                    </label>
                    <input
                      type="number"
                      value={lineSettings.messageRetentionDays}
                      onChange={(e) => setLineSettings({ ...lineSettings, messageRetentionDays: parseInt(e.target.value) || 365 })}
                      min="30"
                      max="3650"
                      className="prisma-input w-32"
                    />
                    <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                      この期間を超えたメッセージは自動的にアーカイブされます（30〜3650日）
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 設定状態 */}
            <div className="prisma-card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  現在の設定状態
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">連携ステータス</span>
                    <span className={`px-3 py-1 rounded-lg text-base font-bold ${
                      lineSettings.enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {lineSettings.enabled ? '有効' : '無効'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">チャネルID</span>
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">
                      {lineSettings.channelId || '未設定'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">自動返信</span>
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">
                      {lineSettings.autoReplyEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">メッセージ保存期間</span>
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">
                      {lineSettings.messageRetentionDays}日間
                    </span>
                  </div>
                  {lineSettings.lastSyncAt && (
                    <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">最終同期日時</span>
                      <span className="text-gray-900 dark:text-gray-100 font-semibold">
                        {new Date(lineSettings.lastSyncAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-base text-blue-700 dark:text-blue-200 font-medium">
                    LINE連携は将来実装予定の機能です
                  </p>
                  <p className="text-base text-blue-600 dark:text-blue-300 mt-1">
                    現時点では設定情報の保存のみ可能です。実装時にこの設定情報が使用されます。
                    LINE Messaging APIの取得方法については、実装時に詳細な手順書を提供します。
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* システム構想タブ */}
        {activeTab === 'system' && (
          <SystemRoadmap />
        )}

        {/* AWS移行タブ - Prisma仕様に統一 */}
        {activeTab === 'aws' && (
          <div className="space-y-8 p-4">
            {/* 現状 */}
            <div className="bg-white rounded-lg border-4 border-blue-500 shadow-lg p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-3xl font-bold text-gray-900">現在の運用</h2>
              </div>
              <div className="bg-green-50 border-4 border-green-500 rounded-lg p-8">
                <p className="text-3xl font-bold text-green-900 mb-4">Supabase（PostgreSQL）で運用中</p>
                <p className="text-xl text-green-800">✅ 現在の規模では最適　✅ 高パフォーマンス　✅ コスト効率◎</p>
              </div>
            </div>

            {/* 移行タイミング */}
            <div className="bg-white rounded-lg border-4 border-purple-500 shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">AWS移行を検討するタイミング</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 border-4 border-gray-300 rounded-lg p-8">
                  <div className="text-5xl font-black text-blue-600 mb-3">1,000人</div>
                  <div className="text-2xl font-bold text-gray-700">ユーザー数</div>
                </div>
                <div className="bg-gray-50 border-4 border-gray-300 rounded-lg p-8">
                  <div className="text-5xl font-black text-blue-600 mb-3">20店舗</div>
                  <div className="text-2xl font-bold text-gray-700">FC展開</div>
                </div>
                <div className="bg-gray-50 border-4 border-gray-300 rounded-lg p-8">
                  <div className="text-5xl font-black text-blue-600 mb-3">10万件/月</div>
                  <div className="text-2xl font-bold text-gray-700">トランザクション</div>
                </div>
                <div className="bg-gray-50 border-4 border-gray-300 rounded-lg p-8">
                  <div className="text-5xl font-black text-blue-600 mb-3">$500/月</div>
                  <div className="text-2xl font-bold text-gray-700">Supabase料金</div>
                </div>
              </div>
            </div>

            {/* 移行手順 */}
            <div className="bg-white rounded-lg border-4 border-orange-500 shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">移行の流れ（3〜5ヶ月）</h2>
              <div className="space-y-6">
                {/* Phase 1 */}
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center border-4 border-blue-800">
                    <span className="text-3xl font-black text-white">1</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-6">
                      <div className="text-2xl font-black text-blue-900 mb-3">準備期間（1〜2ヶ月）</div>
                      <div className="text-xl text-blue-800">AWS環境構築・スキーマ移行・アプリ調整</div>
                    </div>
                  </div>
                </div>

                {/* Phase 2 */}
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center border-4 border-yellow-800">
                    <span className="text-3xl font-black text-white">2</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-yellow-50 border-4 border-yellow-300 rounded-lg p-6">
                      <div className="text-2xl font-black text-yellow-900 mb-3">レプリケーション（2週間〜1ヶ月）</div>
                      <div className="text-xl text-yellow-800">Supabase ⇔ AWS自動同期・データ整合性チェック</div>
                    </div>
                  </div>
                </div>

                {/* Phase 3 */}
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-20 h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-red-800">
                    <span className="text-3xl font-black text-white">3</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-red-50 border-4 border-red-300 rounded-lg p-6">
                      <div className="text-2xl font-black text-red-900 mb-3">カットオーバー（5分）</div>
                      <div className="text-xl text-red-800 font-bold">⚠️ ダウンタイム0秒・DNS切替のみ</div>
                    </div>
                  </div>
                </div>

                {/* Phase 4 */}
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-20 h-20 bg-green-600 rounded-full flex items-center justify-center border-4 border-green-800">
                    <span className="text-3xl font-black text-white">4</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-green-50 border-4 border-green-300 rounded-lg p-6">
                      <div className="text-2xl font-black text-green-900 mb-3">安定化（1ヶ月）</div>
                      <div className="text-xl text-green-800">24時間監視・パフォーマンスチェック</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 保証内容 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-4 border-green-500 shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">基幹システムとしての保証</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <CheckCircle size={40} className="text-green-600 flex-shrink-0" />
                  <span className="text-2xl font-bold text-gray-900">ダウンタイム0秒（Blue-Green デプロイ）</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={40} className="text-green-600 flex-shrink-0" />
                  <span className="text-2xl font-bold text-gray-900">データ完全性保証（継続的レプリケーション）</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={40} className="text-green-600 flex-shrink-0" />
                  <span className="text-2xl font-bold text-gray-900">60秒以内ロールバック可能（1週間保証）</span>
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-red-50 rounded-lg border-4 border-red-500 shadow-lg p-8">
              <h2 className="text-3xl font-black text-red-900 mb-6">重要</h2>
              <ul className="space-y-4 text-xl text-red-800">
                <li className="flex items-start gap-3">
                  <span className="text-3xl">•</span>
                  <span className="font-bold">移行中もシステムは通常通り稼働</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-3xl">•</span>
                  <span className="font-bold">コストは月$128増（年間$1,536増）</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-3xl">•</span>
                  <span className="font-bold">現時点では移行不要（条件達成時に再検討）</span>
                </li>
              </ul>
            </div>

            {/* 詳細情報リンク */}
            <div className="text-center py-8">
              <a
                href="https://github.com/Ghouse-development/G-progress/blob/master/docs/%E8%A6%81%E4%BB%B6%E5%AE%9A%E7%BE%A9%E6%9B%B8_%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E6%A7%8B%E6%83%B3%E3%83%84%E3%83%AA%E3%83%BC.md#16-%E3%82%A4%E3%83%B3%E3%83%95%E3%83%A9%E3%82%B9%E3%83%88%E3%83%A9%E3%82%AF%E3%83%81%E3%83%A3%E6%88%A6%E7%95%A5aws%E7%A7%BB%E8%A1%8C%E8%A8%88%E7%94%BB"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-xl hover:bg-blue-700 transition-colors border-4 border-blue-800 inline-flex items-center gap-3 shadow-lg"
              >
                <Database size={32} />
                詳細な技術仕様を見る
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
