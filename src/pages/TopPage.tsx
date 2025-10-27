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
    <div className="flex-1 flex items-center justify-center overflow-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* メニューカードグリッド - レスポンシブ対応 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-[1200px] py-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = item.status === 'active'

          const CardContent = (
            <div
              className={`
                prisma-card
                flex flex-row items-center gap-4
                p-6 min-h-[120px] h-full
                transition-all duration-200 ease-in-out
                ${isActive ? 'cursor-pointer hover:transform hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:border-blue-500' : 'opacity-40 cursor-not-allowed'}
              `}
            >
              <Icon
                size={48}
                className={`flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                strokeWidth={2.5}
              />
              <h2 className={`text-lg font-bold whitespace-nowrap overflow-hidden text-ellipsis leading-relaxed flex-1 ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
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
