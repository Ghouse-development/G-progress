import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Home, FolderKanban, Calendar, LogOut } from 'lucide-react'
import './Layout.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const navItems = [
    { path: '/', label: 'ダッシュボード', icon: Home },
    { path: '/projects', label: '案件一覧', icon: FolderKanban },
    { path: '/calendar', label: 'カレンダー', icon: Calendar },
  ]

  return (
    <div className="layout-container">
      <aside className="layout-sidebar">
        <div className="layout-logo">
          <h1 className="layout-title">G-progress</h1>
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
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="layout-footer">
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            <LogOut size={20} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

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
