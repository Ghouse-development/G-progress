import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, FolderKanban, Calendar, BarChart3, Shield, LogOut, Menu, X, Package, Users, Upload } from 'lucide-react'
import { useMode } from '../contexts/ModeContext'
import { usePermissions } from '../contexts/PermissionsContext'
import GlobalSearch from './GlobalSearch'
import NotificationCenter from './NotificationCenter'
import './Layout.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { mode } = useMode()
  const { hasPermission } = usePermissions()
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

  const navItems = [
    { path: '/', label: 'ダッシュボード', icon: Home },
    { path: '/projects', label: '案件一覧', icon: FolderKanban },
    { path: '/calendar', label: 'カレンダー', icon: Calendar },
    { path: '/reports', label: 'レポート・分析', icon: BarChart3 },
  ]

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
        <div className="layout-logo">
          <h1 className="layout-title">{!sidebarCollapsed && 'G-progress'}</h1>
        </div>

        <nav className="layout-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}

          {/* 監査ログ（権限のあるユーザーのみ） */}
          {hasPermission('audit_logs:view') && (
            <Link
              to="/audit-logs"
              className={`nav-item ${location.pathname === '/audit-logs' ? 'nav-item-active' : ''}`}
              title={sidebarCollapsed ? '監査ログ' : ''}
            >
              <Shield size={20} />
              {!sidebarCollapsed && <span>監査ログ</span>}
            </Link>
          )}

          {/* マスタ管理（管理者モードのみ） */}
          {mode === 'admin' && (
            <>
              <Link
                to="/import-csv"
                className={`nav-item ${location.pathname === '/import-csv' ? 'nav-item-active' : ''}`}
                title={sidebarCollapsed ? 'CSVインポート' : ''}
              >
                <Upload size={20} />
                {!sidebarCollapsed && <span>CSVインポート</span>}
              </Link>

              <Link
                to="/master/products"
                className={`nav-item ${location.pathname === '/master/products' ? 'nav-item-active' : ''}`}
                title={sidebarCollapsed ? '商品マスタ管理' : ''}
              >
                <Package size={20} />
                {!sidebarCollapsed && <span>商品マスタ管理</span>}
              </Link>

              <Link
                to="/master/employees"
                className={`nav-item ${location.pathname === '/master/employees' ? 'nav-item-active' : ''}`}
                title={sidebarCollapsed ? '従業員マスタ管理' : ''}
              >
                <Users size={20} />
                {!sidebarCollapsed && <span>従業員マスタ管理</span>}
              </Link>
            </>
          )}
        </nav>

        <div className="layout-footer">
          <button
            onClick={handleLogout}
            className="logout-button"
            title={sidebarCollapsed ? 'ログアウト' : ''}
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span>ログアウト</span>}
          </button>
        </div>
      </aside>

      {/* サイドバー切り替えボタン */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`sidebar-toggle-button ${sidebarCollapsed ? 'sidebar-toggle-collapsed' : ''}`}
        title={sidebarCollapsed ? 'サイドバーを表示' : 'サイドバーを隠す'}
      >
        {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
      </button>

      <div className="layout-main">
        <header className="layout-header">
          <div className="flex items-center justify-between p-4 bg-white border-b-2 border-gray-300">
            <div className="flex-1 mr-4">
              {/* Left side - could add breadcrumbs or page title here */}
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <GlobalSearch />
            </div>
          </div>
        </header>

        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
