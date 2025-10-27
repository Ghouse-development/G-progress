/**
 * 通知ベルコンポーネント
 * ヘッダーに表示される通知アイコンとドロップダウン
 */

import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check, Trash2 } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓'
      case 'warning':
        return '⚠'
      case 'error':
        return '✕'
      default:
        return 'ℹ'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-900'
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900'
      case 'error':
        return 'bg-red-100 border-red-500 text-red-900'
      default:
        return 'bg-blue-100 border-blue-500 text-blue-900'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ベルアイコンボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="通知"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ドロップダウン */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border-2 border-gray-200 z-50"
          style={{ maxHeight: '500px', overflowY: 'auto' }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">通知</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-base text-blue-600 hover:text-blue-800 font-medium"
                  title="すべて既読にする"
                >
                  すべて既読
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 通知リスト */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 text-center text-gray-500">読み込み中...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">通知はありません</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 通知アイコン */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* 通知内容 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900 mb-1">
                        {notification.title}
                      </p>
                      <p className="text-base text-gray-700 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-base text-gray-500">
                        {format(new Date(notification.created_at), 'M月d日 HH:mm', {
                          locale: ja
                        })}
                      </p>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex-shrink-0 flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="既読にする"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* フッター */}
          {notifications.length > 0 && (
            <div className="p-3 border-t-2 border-gray-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false)
                  // TODO: 通知一覧ページに遷移
                }}
                className="text-base text-blue-600 hover:text-blue-800 font-medium"
              >
                すべての通知を見る
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
