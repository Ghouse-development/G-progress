/**
 * TOP画面
 * 全機能へのアクセスポイント
 * デザイン: Prismaテーマに準拠（注文住宅事業と統一）
 */

import { Link } from 'react-router-dom'
import {
  Home,
  Building2,
  Trees,
  Key,
  Wrench,
  Briefcase,
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  Package,
  FileQuestion
} from 'lucide-react'

export default function TopPage() {
  const menuItems = [
    // 上段
    { id: 'dashboard', name: 'ダッシュボード', icon: LayoutDashboard, status: 'active', link: '/dashboard' },
    { id: 'custom-home', name: '注文住宅事業', icon: Home, status: 'active', link: '/projects' },
    { id: 'real-estate', name: '不動産事業', icon: Building2, status: 'planned', link: '#' },
    // 中段
    { id: 'garden', name: '外構事業', icon: Trees, status: 'planned', link: '#' },
    { id: 'reform', name: 'リフォーム事業', icon: Wrench, status: 'planned', link: '#' },
    { id: 'rental', name: '賃貸管理事業', icon: Key, status: 'planned', link: '#' },
    // 下段
    { id: 'btob', name: 'BtoB事業', icon: Briefcase, status: 'planned', link: '#' },
    { id: 'approval-flow', name: '承認フロー', icon: CheckSquare, status: 'active', link: '/approval-flow' },
    { id: 'employee-info', name: '従業員情報', icon: Users, status: 'active', link: '/employee-management' },
    // 最下段
    { id: 'system-management', name: 'システム管理', icon: Settings, status: 'active', link: '/settings' },
    { id: 'reserve1', name: '予備①', icon: Package, status: 'planned', link: '#' },
    { id: 'reserve2', name: '予備②', icon: FileQuestion, status: 'planned', link: '#' }
  ]

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      background: 'var(--main-bg)',
      padding: '20px'
    }}>
      {/* メニューカードグリッド - レスポンシブ対応 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        width: '100%',
        maxWidth: '1200px',
        padding: '20px 0'
      }}
      className="top-page-grid"
      >
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = item.status === 'active'

          const CardContent = (
            <div
              className={`
                prisma-card
                ${isActive ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}
              `}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
                padding: '24px',
                minHeight: '120px',
                height: '100%',
                transition: 'all 0.2s ease',
                ...(isActive && {
                  ':hover': {
                    transform: 'translateY(-4px) scale(1.02)',
                    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
                    borderColor: '#3b82f6'
                  }
                })
              }}
              onMouseEnter={(e) => {
                if (isActive) {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }
              }}
              onMouseLeave={(e) => {
                if (isActive) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = ''
                  e.currentTarget.style.borderColor = ''
                }
              }}
            >
              <Icon
                size={48}
                className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}
                style={{ flexShrink: 0 }}
                strokeWidth={2.5}
              />
              <h2 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: isActive ? '#111827' : '#6b7280',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.4',
                flex: 1
              }}>
                {item.name}
              </h2>
            </div>
          )

          return isActive ? (
            <Link key={item.id} to={item.link}>
              {CardContent}
            </Link>
          ) : (
            <div key={item.id}>
              {CardContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}
