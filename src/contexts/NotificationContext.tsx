import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Notification } from '../types/database'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // 通知一覧を取得
  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          project:projects(
            id,
            customer_id,
            contract_date,
            status,
            customer:customers(id, names, building_site)
          ),
          task:tasks(
            id,
            title,
            description,
            status,
            due_date
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50) // 最新50件のみ取得

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込み
  useEffect(() => {
    loadNotifications()

    // リアルタイム更新を購読
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          // 新規通知が追加された場合は即座に再読み込み
          if (payload.eventType === 'INSERT') {
            loadNotifications()
          } else if (payload.eventType === 'UPDATE') {
            // 更新の場合は該当通知のみ更新
            setNotifications(prev =>
              prev.map(n =>
                n.id === payload.new.id
                  ? { ...n, ...(payload.new as Notification) }
                  : n
              )
            )
          } else if (payload.eventType === 'DELETE') {
            // 削除の場合は該当通知を除外
            setNotifications(prev =>
              prev.filter(n => n.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // 未読通知数を計算
  const unreadCount = notifications.filter(n => !n.read).length

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      // ローカル状態を更新
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
    } catch (error) {
      throw error
    }
  }

  // 全通知を既読にする
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id)

      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) throw error

      // ローカル状態を更新
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      )
    } catch (error) {
      throw error
    }
  }

  // 通知を削除
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      // ローカル状態を更新
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      )
    } catch (error) {
      throw error
    }
  }

  // 手動再読み込み
  const refreshNotifications = async () => {
    await loadNotifications()
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
