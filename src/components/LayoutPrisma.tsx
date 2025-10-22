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
import AIAssistant from './AIAssistant'
import NotificationBell from './NotificationBell'
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
          <div className="flex items-center justify-between w-full">
            <Link to="/" className="prisma-sidebar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
              G-progress
            </Link>
            {/* 通知ベル */}
            <NotificationBell />
          </div>
          {/* オンラインユーザー数 */}
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
            <Users size={14} />
            <span>{onlineCount}人がオンライン</span>
          </div>
        </div>

        {/* モード切替 */}
        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">表示モード</div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="prisma-select"
            style={{ margin: '0 12px', width: 'calc(100% - 24px)' }}
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
            className="prisma-select"
            style={{ margin: '0 12px', width: 'calc(100% - 24px)' }}
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
          <div className="prisma-sidebar-section-title">全社共通</div>
          <Link to="/employee-management" className={`prisma-sidebar-item ${location.pathname === '/employee-management' ? 'active' : ''}`} onClick={closeSidebar}>
            従業員管理
          </Link>
          <Link to="/approval-flow" className={`prisma-sidebar-item ${location.pathname === '/approval-flow' ? 'active' : ''}`} onClick={closeSidebar}>
            承認フロー
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

        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">システム管理</div>
          <Link to="/organizations" className={`prisma-sidebar-item ${location.pathname === '/organizations' ? 'active' : ''}`} onClick={closeSidebar}>
            組織管理
          </Link>
        </div>

        {/* ログアウト */}
        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <button
            onClick={handleLogout}
            className="prisma-btn prisma-btn-secondary"
            style={{ width: '100%' }}
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

      {/* AIアシスタント */}
      <AIAssistant />
    </div>
  )
}
