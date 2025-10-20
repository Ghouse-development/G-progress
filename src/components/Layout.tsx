import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFilter } from '../contexts/FilterContext'
import './Layout.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const {
    fiscalYears,
    selectedFiscalYear,
    setSelectedFiscalYear,
    viewMode,
    setViewMode,
    currentUser
  } = useFilter()

  // モバイルではデフォルトでサイドバーを閉じる
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768)

  // ウィンドウリサイズ時にサイドバーの状態を更新
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    // 開発モード: localStorageをクリアしてログイン画面へ
    localStorage.removeItem('auth')
    window.location.href = '/login'
  }

  // 管理者権限チェック
  const isAdmin = currentUser?.role === 'department_head' || currentUser?.role === 'president' || currentUser?.role === 'executive'

  return (
    <div className="layout-container">
      {/* モバイル用オーバーレイ（サイドバーが開いているときに背景をクリックで閉じる） */}
      {!sidebarCollapsed && window.innerWidth <= 768 && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998,
          }}
        />
      )}

      <aside className={`layout-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {!sidebarCollapsed && (
          <>
            {/* ロゴ */}
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold text-gray-900">G-progress</h1>
            </div>

            {/* ⓪ モード切替 */}
            <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="text-xs font-bold text-gray-700 mb-2">⓪ 表示モード</div>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'personal' | 'branch' | 'company')}
                className="w-full p-2 border-2 border-gray-300 text-sm bg-white font-bold rounded-lg shadow-sm hover:border-blue-500 transition-colors"
              >
                <option value="personal">👤 担当者モード</option>
                <option value="branch">🏢 拠点モード</option>
                {isAdmin && <option value="company">🌐 全社モード</option>}
              </select>
            </div>

            {/* ① 年度選択 */}
            <div className="p-3 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="text-xs font-bold text-gray-700 mb-2">① 年度選択</div>
              <select
                value={selectedFiscalYear || ''}
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
                className="w-full p-2 border-2 border-gray-300 text-sm bg-white font-bold rounded-lg shadow-sm hover:border-purple-500 transition-colors"
              >
                {fiscalYears.map((fy) => (
                  <option key={fy.id} value={fy.year}>
                    {fy.year}年度（{fy.start_date.substring(0, 7)}～{fy.end_date.substring(0, 7)}完工）
                  </option>
                ))}
              </select>
            </div>

            {/* ② ダッシュボード */}
            <nav className="p-2">
              <Link
                to="/"
                className={`block p-2 text-sm font-bold ${
                  location.pathname === '/' ? 'bg-black text-white' : 'text-gray-900 hover:bg-gray-50'
                }`}
              >
                ダッシュボード
              </Link>
            </nav>

            {/* 区切り */}
            <div className="border-t my-2"></div>

            {/* ③④⑤⑥ 案件管理系 */}
            <nav className="p-2">
              <Link
                to="/projects"
                className={`block p-2 text-sm ${
                  location.pathname.startsWith('/projects') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                案件管理
              </Link>
              <Link
                to="/payments"
                className={`block p-2 text-sm ${
                  location.pathname === '/payments' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                入金管理
              </Link>
              <Link
                to="/performance"
                className={`block p-2 text-sm ${
                  location.pathname === '/performance' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                性能管理
              </Link>
              <Link
                to="/calendar"
                className={`block p-2 text-sm ${
                  location.pathname === '/calendar' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                カレンダー
              </Link>
            </nav>

            {/* 区切り */}
            <div className="border-t my-2"></div>

            {/* ⑦⑧⑨⑩⑪ マスタ・設定系 */}
            <nav className="p-2">
              <Link
                to="/master/projects"
                className={`block p-2 text-sm ${
                  location.pathname === '/master/projects' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                案件マスタ
              </Link>
              <Link
                to="/master/products"
                className={`block p-2 text-sm ${
                  location.pathname === '/master/products' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                商品マスタ
              </Link>
              <Link
                to="/master/tasks"
                className={`block p-2 text-sm ${
                  location.pathname === '/master/tasks' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                タスクマスタ
              </Link>
              <Link
                to="/master/employees"
                className={`block p-2 text-sm ${
                  location.pathname === '/master/employees' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                従業員マスタ
              </Link>
              <Link
                to="/audit-logs"
                className={`block p-2 text-sm ${
                  location.pathname === '/audit-logs' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                履歴ログ
              </Link>
              <Link
                to="/settings"
                className={`block p-2 text-sm ${
                  location.pathname === '/settings' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                設定
              </Link>
            </nav>

            {/* ログアウト */}
            <div className="mt-auto p-3 border-t">
              <button
                onClick={handleLogout}
                className="w-full p-2 text-sm bg-white border text-gray-700 hover:bg-gray-50"
              >
                ログアウト
              </button>
            </div>
          </>
        )}
      </aside>

      {/* サイドバー切り替えボタン */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed top-4 left-4 z-50 p-2 bg-white border"
        title={sidebarCollapsed ? 'サイドバーを表示' : 'サイドバーを隠す'}
      >
        {sidebarCollapsed ? '☰' : '×'}
      </button>

      <div className="layout-main">
        {/* シンプルなメインコンテンツ（ヘッダーなし） */}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
