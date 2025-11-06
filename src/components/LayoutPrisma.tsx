/**
 * Prisma Studio風レイアウト
 */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Users } from 'lucide-react'
import { useMode } from '../contexts/ModeContext'
import { useFiscalYear } from '../contexts/FiscalYearContext'
import { useSettings } from '../contexts/SettingsContext'
import { useOnlineUsers } from '../hooks/useOnlineUsers'
import { useAuditLog } from '../hooks/useAuditLog'
import { supabase } from '../lib/supabase'
import { FiscalYear, Employee } from '../types/database'
import '../styles/prisma-theme.css'

export default function LayoutPrisma({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { mode, setMode } = useMode()
  const { selectedYear, setSelectedYear } = useFiscalYear()
  const { demoMode } = useSettings()
  const { onlineCount } = useOnlineUsers()
  const { logLogout } = useAuditLog()
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadFiscalYears()
    loadCurrentEmployee()
  }, [])

  const loadFiscalYears = async () => {
    const { data } = await supabase
      .from('fiscal_years')
      .select('*')
      .order('year', { ascending: false })

    if (data) {
      setFiscalYears(data)
    }
  }

  const loadCurrentEmployee = async () => {
    const employeeId = localStorage.getItem('selectedEmployeeId')
    if (!employeeId) return

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (data) {
      setCurrentEmployee(data)
    }
  }

  const handleLogout = async () => {
    // 監査ログ記録
    if (currentEmployee) {
      await logLogout(`${currentEmployee.last_name} ${currentEmployee.first_name}`)
    }

    localStorage.removeItem('auth')
    localStorage.removeItem('selectedEmployeeId')
    window.location.href = '/login'
  }

  const isAdmin = currentEmployee?.role === 'department_head' ||
                   currentEmployee?.role === 'president' ||
                   currentEmployee?.role === 'executive'

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className={`prisma-layout ${demoMode ? 'demo-mode-active' : ''}`}>
      {/* ハンバーガーメニューボタン（モバイルのみ表示） */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="prisma-hamburger"
        aria-label="メニュー"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* モバイルオーバーレイ */}
      <div
        className={`prisma-mobile-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      {/* サイドバー */}
      <aside className={`prisma-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* ロゴ */}
        <div className="prisma-sidebar-header">
          <div className="flex items-center justify-center w-full">
            <Link to="/" className="prisma-sidebar-logo no-underline">
              G-progress
            </Link>
          </div>
          {/* オンラインユーザー数 */}
          <div className="flex items-center justify-center gap-1 mt-1 text-sm text-gray-400">
            <Users size={12} />
            <span className="text-sm">{onlineCount}人</span>
          </div>
        </div>

        {/* モード切替 */}
        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">表示モード</div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="prisma-select mx-2 w-[calc(100%-16px)]"
          >
            <option value="my_tasks">担当者モード</option>
            <option value="branch">拠点モード</option>
            <option value="admin">全社モード</option>
          </select>
        </div>

        {/* 年度選択 */}
        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">年度</div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="prisma-select mx-2 w-[calc(100%-16px)]"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.year}>
                {fy.year}年度
              </option>
            ))}
          </select>
        </div>

        {/* メニュー */}
        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">注文住宅事業</div>
          <Link to="/dashboard" className={`prisma-sidebar-item ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeSidebar}>
            ダッシュボード
          </Link>
          <Link to="/task-board" className={`prisma-sidebar-item ${location.pathname === '/task-board' ? 'active' : ''}`} onClick={closeSidebar}>
            タスクボード
          </Link>
          <Link to="/projects" className={`prisma-sidebar-item ${location.pathname.startsWith('/projects') ? 'active' : ''}`} onClick={closeSidebar}>
            案件一覧
          </Link>
          <Link to="/payments" className={`prisma-sidebar-item ${location.pathname === '/payments' ? 'active' : ''}`} onClick={closeSidebar}>
            入金管理
          </Link>
          <Link to="/gross-profit" className={`prisma-sidebar-item ${location.pathname === '/gross-profit' ? 'active' : ''}`} onClick={closeSidebar}>
            粗利益管理
          </Link>
          <Link to="/performance" className={`prisma-sidebar-item ${location.pathname === '/performance' ? 'active' : ''}`} onClick={closeSidebar}>
            性能管理
          </Link>
          <Link to="/calendar" className={`prisma-sidebar-item ${location.pathname === '/calendar' ? 'active' : ''}`} onClick={closeSidebar}>
            カレンダー
          </Link>
        </div>

        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">マスタ管理</div>
          <Link to="/master/products" className={`prisma-sidebar-item ${location.pathname === '/master/products' ? 'active' : ''}`} onClick={closeSidebar}>
            商品マスタ
          </Link>
          <Link to="/master/tasks" className={`prisma-sidebar-item ${location.pathname === '/master/tasks' ? 'active' : ''}`} onClick={closeSidebar}>
            タスクマスタ
          </Link>
          <Link to="/audit-logs" className={`prisma-sidebar-item ${location.pathname === '/audit-logs' ? 'active' : ''}`} onClick={closeSidebar}>
            履歴ログ
          </Link>
          <Link to="/settings" className={`prisma-sidebar-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={closeSidebar}>
            設定
          </Link>
        </div>

        {/* ログアウト */}
        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="prisma-btn prisma-btn-secondary w-full"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="prisma-main">
        {children}
      </main>

      {/* デモモードインジケーター */}
      {demoMode && (
        <div className="prisma-demo-indicator">
          <span className="prisma-demo-indicator-text">
            デモモード
          </span>
        </div>
      )}
    </div>
  )
}
