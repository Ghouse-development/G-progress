import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePermissions } from '../contexts/PermissionsContext'
import { useSettings } from '../contexts/SettingsContext'
import { useToast } from '../contexts/ToastContext'
import { generateDemoAuditLogs } from '../utils/demoData'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Shield, Search, RefreshCw, Download } from 'lucide-react'
import { exportToCSV, exportToExcel } from '../lib/exportUtils'

interface AuditLog {
  id: string
  user_id?: string
  action: string
  table_name?: string
  record_id?: string
  old_values?: any
  new_values?: any
  changes?: any
  created_at: string
  employee?: {
    last_name: string
    first_name: string
    department: string
  }
}

export default function AuditLogs() {
  const { hasPermission, userPermissions } = usePermissions()
  const { demoMode } = useSettings()
  const { showToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterTable, setFilterTable] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 50

  // 権限チェック
  if (!hasPermission('audit_logs:view')) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield size={64} className="text-red-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          アクセス権限がありません
        </h2>
        <p className="text-gray-600">
          監査ログを閲覧する権限がありません。管理者にお問い合わせください。
        </p>
      </div>
    )
  }

  // 監査ログを読み込み
  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      // デモモードの場合はサンプルデータを使用
      if (demoMode) {
        const demoLogs = generateDemoAuditLogs()
        setLogs(demoLogs as any)
        setLoading(false)
        return
      }

      // 通常モード：Supabaseからデータを取得
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          employee:employees(last_name, first_name, department)
        `)
        .order('created_at', { ascending: false })
        .limit(500)  // 最新500件

      const { data, error } = await query

      if (error) throw error

      setLogs(data || [])
    } catch (error) {
      // console removed
      showToast('監査ログの読み込みに失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [demoMode])

  // フィルタリング
  const filteredLogs = logs.filter(log => {
    // アクションフィルター
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false
    }

    // テーブルフィルター
    if (filterTable !== 'all' && log.table_name && log.table_name !== filterTable) {
      return false
    }

    // 検索クエリ
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const userName = log.employee
        ? `${log.employee.last_name} ${log.employee.first_name}`.toLowerCase()
        : ''
      const action = log.action.toLowerCase()
      const tableName = log.table_name?.toLowerCase() || ''

      return userName.includes(query) || action.includes(query) || tableName.includes(query)
    }

    return true
  })

  // ページネーション
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  )

  // ユニークなアクションとテーブルのリストを取得
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)))
  const uniqueTables = Array.from(new Set(logs.map(log => log.table_name).filter(Boolean)))

  // アクション名の日本語化
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      'INSERT': '作成',
      'UPDATE': '更新',
      'DELETE': '削除',
      'create': '作成',
      'update': '更新',
      'delete': '削除',
      'login': 'ログイン',
      'logout': 'ログアウト'
    }
    return labels[action] || action
  }

  // テーブル名の日本語化
  const getTableLabel = (table?: string): string => {
    if (!table) return '-'
    const labels: Record<string, string> = {
      'projects': 'プロジェクト',
      'tasks': 'タスク',
      'customers': '顧客',
      'employees': '従業員',
      'payments': '支払い',
      'vendors': '業者'
    }
    return labels[table] || table
  }

  // エクスポート
  const handleExport = (exportFormat: 'csv' | 'excel') => {
    const exportData = filteredLogs.map(log => ({
      '日時': format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja }),
      'ユーザー': log.employee ? `${log.employee.last_name} ${log.employee.first_name}` : '不明',
      '部門': log.employee?.department || '',
      '案件': log.changes?.project_name || '-',
      'アクション': getActionLabel(log.action),
      '変更内容': log.changes?.description || (log.old_values || log.new_values ? 'データを変更' : '-')
    }))

    if (exportFormat === 'csv') {
      exportToCSV(exportData, '監査ログ')
    } else {
      exportToExcel(exportData, '監査ログ', '監査ログ')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-lg text-gray-900">監査ログを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <Shield size={36} />
            監査ログ
          </h1>
          <p className="text-gray-600">
            システム内の全ての操作履歴を表示（{userPermissions?.role}）
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadAuditLogs}
            className="prisma-btn prisma-btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={20} />
            更新
          </button>

          <button
            onClick={() => handleExport('excel')}
            className="prisma-btn prisma-btn-primary flex items-center gap-2"
          >
            <Download size={20} />
            エクスポート
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="prisma-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索 */}
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              検索
            </label>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ユーザー、アクション、テーブルで検索"
                className="prisma-input pl-10"
              />
            </div>
          </div>

          {/* アクションフィルター */}
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              アクション
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="prisma-select"
            >
              <option value="all">全て</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{getActionLabel(action)}</option>
              ))}
            </select>
          </div>

          {/* テーブルフィルター */}
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              テーブル
            </label>
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="prisma-select"
            >
              <option value="all">全て</option>
              {uniqueTables.map(table => (
                <option key={table} value={table}>{getTableLabel(table)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-base text-gray-600">
          {filteredLogs.length}件の結果を表示中
        </div>
      </div>

      {/* 監査ログテーブル */}
      <div className="prisma-card p-0 overflow-hidden">
        <div className="prisma-table-container">
          <table className="prisma-table">
            <colgroup>
              <col style={{ width: '180px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '150px' }} />
              <col />
            </colgroup>
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-center text-base font-semibold text-gray-900">日時</th>
                <th className="px-4 py-3 text-center text-base font-semibold text-gray-900">ユーザー</th>
                <th className="px-4 py-3 text-center text-base font-semibold text-gray-900">部門</th>
                <th className="px-4 py-3 text-center text-base font-semibold text-gray-900">案件</th>
                <th className="px-4 py-3 text-center text-base font-semibold text-gray-900">アクション</th>
                <th className="px-4 py-3 text-center text-base font-semibold text-gray-900 min-w-[300px]">変更内容</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedLogs.map((log, idx) => (
                <tr
                  key={log.id}
                  className={idx % 2 === 0 ? '' : 'bg-gray-50'}
                >
                  <td className="px-3 py-3 text-base text-gray-900">
                    {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                  </td>
                  <td className="px-3 py-3 text-base font-bold text-gray-900">
                    {log.employee ? `${log.employee.last_name} ${log.employee.first_name}` : '不明'}
                  </td>
                  <td className="px-3 py-3 text-base text-gray-900">
                    {log.employee?.department || '-'}
                  </td>
                  <td className="px-3 py-3 text-base font-bold text-gray-900">
                    {log.changes?.project_name || '-'}
                  </td>
                  <td className="px-3 py-3 text-base">
                    <span className={`px-3 py-1 rounded-md text-sm font-bold ${
                      (log.action === 'INSERT' || log.action === 'create') ? 'bg-green-100 text-green-800' :
                      (log.action === 'UPDATE' || log.action === 'update') ? 'bg-yellow-100 text-yellow-800' :
                      (log.action === 'DELETE' || log.action === 'delete') ? 'bg-red-100 text-red-800' :
                      (log.action === 'login') ? 'bg-blue-100 text-blue-800' :
                      (log.action === 'logout') ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-base text-gray-900 leading-relaxed">
                    {log.changes?.description || (log.old_values || log.new_values ? 'データを変更' : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t-2 border-gray-200 flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="prisma-btn prisma-btn-secondary"
            >
              前へ
            </button>

            <span className="px-4 text-base font-bold text-gray-900">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="prisma-btn prisma-btn-secondary"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
