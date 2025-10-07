import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, FolderKanban, Calendar, LogOut, Menu, X } from 'lucide-react'
import './Layout.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = () => {
    // 開発モード: localStorageをクリアしてログイン画面へ
    localStorage.removeItem('auth')
    window.location.href = '/login'
  }

  const navItems = [
    { path: '/', label: 'ダッシュボード', icon: Home },
    { path: '/projects', label: '案件一覧', icon: FolderKanban },
    { path: '/calendar', label: 'カレンダー', icon: Calendar },
  ]

  return (
    <div className="layout-container">
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
          <div className="notification-bar">
            遅延案件の通知がここに表示されます
          </div>
        </header>

        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
