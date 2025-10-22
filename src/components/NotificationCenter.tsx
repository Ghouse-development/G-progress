import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, Trash2, AlertCircle, DollarSign, ClipboardList } from 'lucide-react'
import { useNotifications } from '../contexts/NotificationContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function NotificationCenter() {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // 外側クリックでパネルを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 通知タイプに応じたアイコンを返す
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'delay':
        return <AlertCircle size={20} className="text-red-600" />
      case 'payment_overdue':
        return <DollarSign size={20} className="text-yellow-600" />
      case 'task_assigned':
        return <ClipboardList size={20} className="text-blue-600" />
      default:
        return <Bell size={20} className="text-gray-600" />
    }
  }

  // 通知タイプに応じた背景色を返す
  const getNotificationBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-gray-50'

    switch (type) {
      case 'delay':
        return 'bg-red-50'
      case 'payment_overdue':
        return 'bg-yellow-50'
      case 'task_assigned':
        return 'bg-blue-50'
      default:
        return 'bg-white'
    }
  }

  // 通知クリック時の処理
  const handleNotificationClick = async (notification: any) => {
    // 未読の場合は既読にする
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // 関連ページに遷移
    if (notification.related_project_id) {
      navigate(`/projects/${notification.related_project_id}`)
      setIsOpen(false)
    }
  }

  // 削除ボタンクリック時の処理
  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    await deleteNotification(notificationId)
  }

  // 既読ボタンクリック時の処理
  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    await markAsRead(notificationId)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* ベルアイコンボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="通知センター"
      >
        <Bell size={24} className="text-gray-700" />

        {/* 未読バッジ */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知パネル */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-2xl border-2 border-gray-300 z-50 max-h-[600px] flex flex-col">
          {/* ヘッダー */}
          <div className="p-4 border-b-2 border-gray-300 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-blue-600" />
              <h3 className="font-bold text-gray-900 text-lg">通知センター</h3>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadCount}件未読
                </span>
              )}
            </div>

            {/* 全て既読ボタン */}
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="全て既読にする"
              >
                <CheckCheck size={16} />
                全て既読
              </button>
            )}
          </div>

          {/* 通知リスト */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              // ローディング状態
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-lg p-3 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              // 通知なし
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">通知はありません</p>
                <p className="text-sm text-gray-500 mt-1">新しい通知が届くとここに表示されます</p>
              </div>
            ) : (
              // 通知一覧
              <div className="divide-y-2 divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 cursor-pointer hover:shadow-md transition-all ${getNotificationBgColor(
                      notification.type,
                      notification.read
                    )} ${!notification.read ? 'border-l-4 border-blue-600' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* アイコン */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* コンテンツ */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm mb-1">
                          {notification.title}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          {notification.message}
                        </div>

                        {/* メタ情報 */}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {format(new Date(notification.created_at), 'M月d日 HH:mm', { locale: ja })}
                          </span>
                          {notification.project && notification.project.customer && (
                            <>
                              <span>•</span>
                              <span className="truncate">
                                {Array.isArray(notification.project.customer.names)
                                  ? notification.project.customer.names[0]
                                  : notification.project.customer.names} 様
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* アクション */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* 既読ボタン */}
                        {!notification.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, notification.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="既読にする"
                          >
                            <Check size={16} />
                          </button>
                        )}

                        {/* 削除ボタン */}
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* フッター */}
          {notifications.length > 0 && (
            <div className="p-3 border-t-2 border-gray-300 bg-gray-50 text-center">
              <p className="text-xs text-gray-600">
                最新{notifications.length}件を表示中
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
