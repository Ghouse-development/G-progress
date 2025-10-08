import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, FolderKanban, Calendar, LogOut, Menu, X, Search } from 'lucide-react'
import GlobalSearch from './GlobalSearch'
import './Layout.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Ctrl+K or Cmd+K でグローバル検索を開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
  ]

  const handleSearchClick = () => {
    setSearchOpen(true)
  }

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

          {/* 検索ボタン */}
          <button
            onClick={handleSearchClick}
            className="nav-item"
            title={sidebarCollapsed ? '検索 (Ctrl+K)' : '検索'}
          >
            <Search size={20} />
            {!sidebarCollapsed && <span>検索</span>}
            {!sidebarCollapsed && (
              <kbd className="ml-auto text-xs px-1.5 py-0.5 bg-gray-700 rounded">Ctrl+K</kbd>
            )}
          </button>
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

      {/* グローバル検索モーダル */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
