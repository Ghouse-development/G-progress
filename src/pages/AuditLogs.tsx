import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePermissions } from '../contexts/PermissionsContext'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Shield, Search, RefreshCw, Download } from 'lucide-react'
import { exportToCSV, exportToExcel } from '../lib/exportUtils'

interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string
  old_values: any
  new_values: any
  created_at: string
  employee?: {
    last_name: string
    first_name: string
    department: string
  }
}

export default function AuditLogs() {
  const { hasPermission, userPermissions } = usePermissions()
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
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Shield size={64} style={{ margin: '0 auto 16px', color: '#DC2626' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          アクセス権限がありません
        </h2>
        <p style={{ color: '#666' }}>
          監査ログを閲覧する権限がありません。管理者にお問い合わせください。
        </p>
      </div>
    )
  }

  // 監査ログを読み込み
  const loadAuditLogs = async () => {
    setLoading(true)
    try {
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
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [])

  // フィルタリング
  const filteredLogs = logs.filter(log => {
    // アクションフィルター
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false
    }

    // テーブルフィルター
    if (filterTable !== 'all' && log.table_name !== filterTable) {
      return false
    }

    // 検索クエリ
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const userName = log.employee
        ? `${log.employee.last_name} ${log.employee.first_name}`.toLowerCase()
        : ''
      const action = log.action.toLowerCase()
      const tableName = log.table_name.toLowerCase()

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
  const uniqueTables = Array.from(new Set(logs.map(log => log.table_name)))

  // アクション名の日本語化
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      'INSERT': '作成',
      'UPDATE': '更新',
      'DELETE': '削除'
    }
    return labels[action] || action
  }

  // テーブル名の日本語化
  const getTableLabel = (table: string): string => {
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
      'アクション': getActionLabel(log.action),
      'テーブル': getTableLabel(log.table_name),
      'レコードID': log.record_id
    }))

    if (exportFormat === 'csv') {
      exportToCSV(exportData, '監査ログ')
    } else {
      exportToExcel(exportData, '監査ログ', '監査ログ')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={48} style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: '18px' }}>監査ログを読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={36} />
            監査ログ
          </h1>
          <p style={{ fontSize: '16px', color: '#666' }}>
            システム内の全ての操作履歴を表示（{userPermissions?.role}）
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadAuditLogs}
            style={{
              padding: '12px 24px',
              background: 'white',
              border: '3px solid black',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={20} />
            更新
          </button>

          <button
            onClick={() => handleExport('excel')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: '3px solid black',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download size={20} />
            エクスポート
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div style={{
        background: 'white',
        border: '3px solid black',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {/* 検索 */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
              検索
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ユーザー、アクション、テーブルで検索"
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  border: '2px solid black',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>

          {/* アクションフィルター */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
              アクション
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid black',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              <option value="all">全て</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{getActionLabel(action)}</option>
              ))}
            </select>
          </div>

          {/* テーブルフィルター */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
              テーブル
            </label>
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid black',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              <option value="all">全て</option>
              {uniqueTables.map(table => (
                <option key={table} value={table}>{getTableLabel(table)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
          {filteredLogs.length}件の結果を表示中
        </div>
      </div>

      {/* 監査ログテーブル */}
      <div style={{
        background: 'white',
        border: '3px solid black',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F3F4F6', borderBottom: '3px solid black' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>日時</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>ユーザー</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>部門</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>アクション</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>テーブル</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>レコードID</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log, idx) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '2px solid #E5E7EB',
                    background: idx % 2 === 0 ? 'white' : '#F9FAFB'
                  }}
                >
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                    {log.employee ? `${log.employee.last_name} ${log.employee.first_name}` : '不明'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {log.employee?.department || '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background:
                        log.action === 'INSERT' ? '#D1FAE5' :
                        log.action === 'UPDATE' ? '#FEF3C7' :
                        log.action === 'DELETE' ? '#FEE2E2' :
                        '#E5E7EB',
                      color:
                        log.action === 'INSERT' ? '#065F46' :
                        log.action === 'UPDATE' ? '#92400E' :
                        log.action === 'DELETE' ? '#991B1B' :
                        '#1F2937'
                    }}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {getTableLabel(log.table_name)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace', color: '#666' }}>
                    {log.record_id.substring(0, 8)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div style={{
            padding: '16px',
            borderTop: '2px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                border: '2px solid black',
                borderRadius: '6px',
                background: currentPage === 1 ? '#E5E7EB' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              前へ
            </button>

            <span style={{ padding: '0 16px', fontSize: '14px', fontWeight: 'bold' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 16px',
                border: '2px solid black',
                borderRadius: '6px',
                background: currentPage === totalPages ? '#E5E7EB' : 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
