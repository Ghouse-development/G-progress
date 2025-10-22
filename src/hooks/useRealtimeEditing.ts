/**
 * リアルタイム同時編集フック
 * 編集ロックと他ユーザーの編集状況を管理
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ResourceType, OnlineUser, EditLock } from '../types/database'
import { useToast } from '../contexts/ToastContext'

interface UseRealtimeEditingOptions {
  resourceType: ResourceType
  resourceId: string
  employeeId: string
  enabled?: boolean
}

interface UseRealtimeEditingReturn {
  isLocked: boolean
  lockedBy: string | null
  lockedByName: string | null
  onlineUsers: OnlineUser[]
  acquireLock: () => Promise<boolean>
  releaseLock: () => Promise<void>
  refreshLock: () => Promise<void>
}

export function useRealtimeEditing({
  resourceType,
  resourceId,
  employeeId,
  enabled = true
}: UseRealtimeEditingOptions): UseRealtimeEditingReturn {
  const [isLocked, setIsLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockedByName, setLockedByName] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const { warning } = useToast()

  // ロック状態の監視
  useEffect(() => {
    if (!enabled || !resourceId) return

    checkLockStatus()

    // Realtime サブスクリプション
    const channel = supabase
      .channel(`edit-lock:${resourceType}:${resourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'edit_locks',
          filter: `resource_type=eq.${resourceType} and resource_id=eq.${resourceId}`
        },
        () => {
          checkLockStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resourceType, resourceId, enabled])

  // オンラインユーザーの監視
  useEffect(() => {
    if (!enabled || !resourceId) return

    checkOnlineUsers()

    const channel = supabase
      .channel(`online-users:${resourceType}:${resourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_users',
          filter: `editing_resource_type=eq.${resourceType} and editing_resource_id=eq.${resourceId}`
        },
        () => {
          checkOnlineUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resourceType, resourceId, enabled])

  // 定期的にロックを更新（5分のタイムアウトを防ぐ）
  useEffect(() => {
    if (!enabled || !isLocked || lockedBy !== employeeId) return

    const interval = setInterval(() => {
      refreshLock()
    }, 2 * 60 * 1000) // 2分ごと

    return () => clearInterval(interval)
  }, [isLocked, lockedBy, employeeId, enabled])

  const checkLockStatus = async () => {
    const { data, error } = await supabase
      .from('edit_locks')
      .select('*, employee:employees(id, first_name, last_name)')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Lock status check error:', error)
      return
    }

    if (data) {
      setIsLocked(true)
      setLockedBy(data.locked_by)
      const emp = data.employee as any
      setLockedByName(emp ? `${emp.last_name} ${emp.first_name}` : '不明なユーザー')
    } else {
      setIsLocked(false)
      setLockedBy(null)
      setLockedByName(null)
    }
  }

  const checkOnlineUsers = async () => {
    const { data } = await supabase
      .from('online_users')
      .select('*, employee:employees(id, first_name, last_name)')
      .eq('editing_resource_type', resourceType)
      .eq('editing_resource_id', resourceId)
      .neq('employee_id', employeeId)
      .gt('last_activity_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5分以内のアクティビティ

    if (data) {
      setOnlineUsers(data as OnlineUser[])
    }
  }

  const acquireLock = async (): Promise<boolean> => {
    try {
      // 既存のロックをチェック
      const { data: existingLock } = await supabase
        .from('edit_locks')
        .select('locked_by, expires_at')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (existingLock && existingLock.locked_by !== employeeId) {
        warning('他のユーザーが編集中です')
        return false
      }

      // ロックを取得または更新
      const { error } = await supabase
        .from('edit_locks')
        .upsert({
          resource_type: resourceType,
          resource_id: resourceId,
          locked_by: employeeId,
          locked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分後
        }, {
          onConflict: 'resource_type,resource_id'
        })

      if (error) {
        console.error('Lock acquisition error:', error)
        return false
      }

      setIsLocked(true)
      setLockedBy(employeeId)
      return true
    } catch (error) {
      console.error('Lock acquisition error:', error)
      return false
    }
  }

  const releaseLock = async (): Promise<void> => {
    if (lockedBy !== employeeId) return

    await supabase
      .from('edit_locks')
      .delete()
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('locked_by', employeeId)

    setIsLocked(false)
    setLockedBy(null)
    setLockedByName(null)
  }

  const refreshLock = async (): Promise<void> => {
    if (lockedBy !== employeeId) return

    await supabase
      .from('edit_locks')
      .update({
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('locked_by', employeeId)
  }

  return {
    isLocked,
    lockedBy,
    lockedByName,
    onlineUsers,
    acquireLock,
    releaseLock,
    refreshLock
  }
}
