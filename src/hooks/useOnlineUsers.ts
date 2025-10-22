/**
 * オンラインユーザー追跡フック
 * 現在のページにいるユーザーをリアルタイムで追跡
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { OnlineUser } from '../types/database'

interface UseOnlineUsersOptions {
  enabled?: boolean
}

export function useOnlineUsers(options: UseOnlineUsersOptions = {}) {
  const { enabled = true } = options
  const location = useLocation()
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    const employeeId = localStorage.getItem('selectedEmployeeId')
    if (!employeeId) return

    setCurrentUserId(employeeId)
    initializeSession(employeeId)

    return () => {
      cleanup()
    }
  }, [enabled])

  // ページ変更時にオンラインユーザー情報を更新
  useEffect(() => {
    if (!enabled || !currentUserId) return

    updatePresence()
  }, [location.pathname, enabled, currentUserId])

  // 定期的にプレゼンス情報を更新（30秒ごと）
  useEffect(() => {
    if (!enabled || !currentUserId) return

    const interval = setInterval(() => {
      updatePresence()
    }, 30 * 1000) // 30秒

    return () => clearInterval(interval)
  }, [enabled, currentUserId])

  // リアルタイムでオンラインユーザーを監視
  useEffect(() => {
    if (!enabled) return

    loadOnlineUsers()

    const channel = supabase
      .channel('online-users-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_users'
        },
        () => {
          loadOnlineUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled])

  const initializeSession = async (employeeId: string) => {
    try {
      // 既存のセッションを削除（古いセッションのクリーンアップ）
      await supabase
        .from('online_users')
        .delete()
        .eq('employee_id', employeeId)
        .lt('last_activity_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

      // 新しいセッションを作成
      const { data, error } = await supabase
        .from('online_users')
        .insert([{
          employee_id: employeeId,
          page_path: location.pathname,
          last_activity_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Failed to create online session:', error)
        return
      }

      setSessionId(data.id)
    } catch (error) {
      console.error('Failed to initialize session:', error)
    }
  }

  const updatePresence = async () => {
    if (!sessionId) return

    try {
      await supabase
        .from('online_users')
        .update({
          page_path: location.pathname,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    } catch (error) {
      console.error('Failed to update presence:', error)
    }
  }

  const cleanup = async () => {
    if (!sessionId) return

    try {
      await supabase
        .from('online_users')
        .delete()
        .eq('id', sessionId)
    } catch (error) {
      console.error('Failed to cleanup session:', error)
    }
  }

  const loadOnlineUsers = async () => {
    try {
      // 5分以内にアクティビティがあったユーザーのみ取得
      const { data, error } = await supabase
        .from('online_users')
        .select('*, employee:employees(id, first_name, last_name, department)')
        .gt('last_activity_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('last_activity_at', { ascending: false })

      if (error) {
        console.error('Failed to load online users:', error)
        return
      }

      setOnlineUsers(data as OnlineUser[])
      setOnlineCount(data.length)
    } catch (error) {
      console.error('Failed to load online users:', error)
    }
  }

  const getOnlineUsersOnPage = (pagePath: string): OnlineUser[] => {
    return onlineUsers.filter(user => user.page_path === pagePath)
  }

  const getOnlineUsersOnCurrentPage = (): OnlineUser[] => {
    return getOnlineUsersOnPage(location.pathname)
  }

  return {
    onlineUsers,
    onlineCount,
    getOnlineUsersOnPage,
    getOnlineUsersOnCurrentPage,
    currentUserId
  }
}
