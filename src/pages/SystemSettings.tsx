import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { KintoneClient, projectToKintoneRecord } from '../lib/kintone'
import { useToast } from '../contexts/ToastContext'
import { Settings, Database, TestTube, PlayCircle, Clock, CheckCircle } from 'lucide-react'

interface KintoneSettings {
  domain: string
  apiToken: string
  appId: string
  autoBackupEnabled: boolean
  lastBackupAt?: string
}

export default function SystemSettings() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [settings, setSettings] = useState<KintoneSettings>({
    domain: '',
    apiToken: '',
    appId: '',
    autoBackupEnabled: false
  })
  const [testing, setTesting] = useState(false)
  const [backing, setBacking] = useState(false)
  const [backupLogs, setBackupLogs] = useState<any[]>([])

  useEffect(() => {
    loadSettings()
    loadBackupLogs()
  }, [])

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'kintone_config')
        .single()

      if (data?.value) {
        setSettings(data.value)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadBackupLogs = async () => {
    try {
      const { data } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setBackupLogs(data)
      }
    } catch (error) {
      console.error('Failed to load backup logs:', error)
    }
  }

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'kintone_config',
          value: settings,
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
    if (!settings.domain || !settings.apiToken || !settings.appId) {
      showToast('すべての項目を入力してください', 'error')
      return
    }

    setTesting(true)
    try {
      const client = new KintoneClient(settings.domain, settings.apiToken)
      const result = await client.testConnection(settings.appId)

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
    if (!settings.domain || !settings.apiToken || !settings.appId) {
      showToast('kintone設定を保存してください', 'error')
      return
    }

    setBacking(true)
    const startTime = new Date()

    try {
      // 1. プロジェクトデータを取得
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

      // 2. kintoneクライアントを作成
      const client = new KintoneClient(settings.domain, settings.apiToken)

      // 3. kintoneレコードに変換してバックアップ
      let successCount = 0
      let errorCount = 0

      for (const project of projects || []) {
        try {
          const kintoneRecord = projectToKintoneRecord(project)
          await client.createRecord(settings.appId, kintoneRecord)
          successCount++
        } catch (error) {
          console.error(`Failed to backup project ${project.id}:`, error)
          errorCount++
        }
      }

      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

      // 4. バックアップログを保存
      await supabase.from('backup_logs').insert({
        status: errorCount > 0 ? 'partial' : 'success',
        total_records: projects?.length || 0,
        success_count: successCount,
        error_count: errorCount,
        duration_seconds: duration,
        created_at: new Date().toISOString()
      })

      // 5. 最終バックアップ日時を更新
      setSettings({ ...settings, lastBackupAt: new Date().toISOString() })
      await saveSettings()

      // 6. ログを再読み込み
      await loadBackupLogs()

      showToast(
        `✅ バックアップ完了: ${successCount}件成功 ${errorCount > 0 ? `(${errorCount}件失敗)` : ''}`,
        errorCount > 0 ? 'warning' : 'success'
      )
    } catch (error) {
      console.error('Backup failed:', error)
      showToast('バックアップに失敗しました', 'error')

      // エラーログを保存
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-5xl">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">システム設定</h1>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="prisma-btn-secondary"
          >
            ← 案件一覧に戻る
          </button>
        </div>

        {/* kintone連携設定 */}
        <div className="bg-white rounded-lg border-3 border-gray-300 shadow-lg mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <Database size={24} className="text-white" />
              <h2 className="text-xl font-bold text-white">kintone連携設定</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                kintoneドメイン
              </label>
              <input
                type="text"
                value={settings.domain}
                onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
                placeholder="例: yourcompany.cybozu.com"
                className="prisma-input"
              />
              <p className="mt-1 text-sm text-gray-600">
                https:// は不要です。ドメイン名のみを入力してください
              </p>
            </div>

            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                APIトークン
              </label>
              <input
                type="password"
                value={settings.apiToken}
                onChange={(e) => setSettings({ ...settings, apiToken: e.target.value })}
                placeholder="APIトークンを入力"
                className="prisma-input"
              />
              <p className="mt-1 text-sm text-gray-600">
                kintoneアプリの設定から生成したAPIトークンを入力
              </p>
            </div>

            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                アプリID
              </label>
              <input
                type="text"
                value={settings.appId}
                onChange={(e) => setSettings({ ...settings, appId: e.target.value })}
                placeholder="例: 123"
                className="prisma-input"
              />
              <p className="mt-1 text-sm text-gray-600">
                バックアップ先のkintoneアプリのID
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={saveSettings}
                className="prisma-btn"
              >
                設定を保存
              </button>
              <button
                onClick={testConnection}
                disabled={testing}
                className="prisma-btn-secondary flex items-center gap-2"
              >
                <TestTube size={16} />
                {testing ? '接続テスト中...' : '接続テスト'}
              </button>
            </div>
          </div>
        </div>

        {/* バックアップ実行 */}
        <div className="bg-white rounded-lg border-3 border-gray-300 shadow-lg mb-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <PlayCircle size={24} className="text-white" />
              <h2 className="text-xl font-bold text-white">手動バックアップ</h2>
            </div>
          </div>

          <div className="p-6">
            <p className="text-base text-gray-700 mb-4">
              現在のすべての案件データをkintoneにバックアップします。
            </p>
            {settings.lastBackupAt && (
              <p className="text-sm text-gray-600 mb-4">
                最終バックアップ: {new Date(settings.lastBackupAt).toLocaleString('ja-JP')}
              </p>
            )}
            <button
              onClick={runBackup}
              disabled={backing}
              className="prisma-btn flex items-center gap-2"
            >
              <Database size={16} />
              {backing ? 'バックアップ中...' : 'いますぐバックアップを実行'}
            </button>
          </div>
        </div>

        {/* バックアップ履歴 */}
        <div className="bg-white rounded-lg border-3 border-gray-300 shadow-lg">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-white" />
              <h2 className="text-xl font-bold text-white">バックアップ履歴</h2>
            </div>
          </div>

          <div className="p-6">
            {backupLogs.length === 0 ? (
              <p className="text-gray-600">バックアップ履歴はありません</p>
            ) : (
              <div className="space-y-3">
                {backupLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
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
                        <p className="font-bold text-gray-900">
                          {new Date(log.created_at).toLocaleString('ja-JP')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {log.success_count || 0}件成功
                          {log.error_count > 0 && ` / ${log.error_count}件失敗`}
                          {log.duration_seconds && ` (${log.duration_seconds}秒)`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-bold ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
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
      </div>
    </div>
  )
}
