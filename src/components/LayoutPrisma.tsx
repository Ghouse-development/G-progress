/**
 * Prisma Studio風レイアウト
 */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMode } from '../contexts/ModeContext'
import { supabase } from '../lib/supabase'
import { FiscalYear, Employee } from '../types/database'
import '../styles/prisma-theme.css'

export default function LayoutPrisma({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { mode, setMode } = useMode()
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('2025')
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)

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

  const handleLogout = () => {
    localStorage.removeItem('auth')
    localStorage.removeItem('selectedEmployeeId')
    window.location.href = '/login'
  }

  const isAdmin = currentEmployee?.role === 'department_head' ||
                   currentEmployee?.role === 'president' ||
                   currentEmployee?.role === 'executive'

  return (
    <div className="prisma-layout">
      {/* サイドバー */}
      <aside className="prisma-sidebar">
        {/* ロゴ */}
        <div className="prisma-sidebar-header">
          <div className="prisma-sidebar-logo">G-progress</div>
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
            {isAdmin && <option value="admin">全社モード</option>}
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
          <div className="prisma-sidebar-section-title">メイン</div>
          <Link to="/" className={`prisma-sidebar-item ${location.pathname === '/' ? 'active' : ''}`}>
            ダッシュボード
          </Link>
        </div>

        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">案件管理</div>
          <Link to="/projects" className={`prisma-sidebar-item ${location.pathname.startsWith('/projects') ? 'active' : ''}`}>
            案件一覧
          </Link>
          <Link to="/payments" className={`prisma-sidebar-item ${location.pathname === '/payments' ? 'active' : ''}`}>
            入金管理
          </Link>
          <Link to="/performance" className={`prisma-sidebar-item ${location.pathname === '/performance' ? 'active' : ''}`}>
            性能管理
          </Link>
          <Link to="/calendar" className={`prisma-sidebar-item ${location.pathname === '/calendar' ? 'active' : ''}`}>
            カレンダー
          </Link>
        </div>

        <div className="prisma-sidebar-section">
          <div className="prisma-sidebar-section-title">マスタ管理</div>
          <Link to="/master/projects" className={`prisma-sidebar-item ${location.pathname === '/master/projects' ? 'active' : ''}`}>
            案件マスタ
          </Link>
          <Link to="/master/tasks" className={`prisma-sidebar-item ${location.pathname === '/master/tasks' ? 'active' : ''}`}>
            タスクマスタ
          </Link>
          <Link to="/master/employees" className={`prisma-sidebar-item ${location.pathname === '/master/employees' ? 'active' : ''}`}>
            従業員マスタ
          </Link>
          <Link to="/audit-logs" className={`prisma-sidebar-item ${location.pathname === '/audit-logs' ? 'active' : ''}`}>
            履歴ログ
          </Link>
          <Link to="/settings" className={`prisma-sidebar-item ${location.pathname === '/settings' ? 'active' : ''}`}>
            設定
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
    </div>
  )
}
