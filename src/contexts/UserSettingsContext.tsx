import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export interface UserSettings {
  id: string
  user_id: string
  theme: 'light' | 'dark'
  email_notifications: boolean
  push_notifications: boolean
  mention_notifications: boolean
  task_reminders: boolean
  items_per_page: number
  default_view: 'grid' | 'list' | 'calendar'
  sidebar_collapsed: boolean
  language: string
  timezone: string
  dashboard_widgets: any[]
  quick_links: any[]
  created_at: string
  updated_at: string
}

interface UserSettingsContextType {
  settings: UserSettings | null
  loading: boolean
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  refreshSettings: () => Promise<void>
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined)

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUserSettings = async () => {
    try {
      setLoading(true)

      // 現在のユーザーを取得（開発モード対応）
      const devAuth = localStorage.getItem('auth')
      let userId = localStorage.getItem('currentUserId') || '1'

      if (devAuth === 'true') {
        // 開発モード: ローカルストレージから取得
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('id', userId)
          .single()

        if (employee) {
          userId = employee.id
        }
      } else {
        // 本番モード: セッションから取得
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setSettings(null)
          setLoading(false)
          return
        }

        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('email', session.user.email)
          .single()

        if (employee) {
          userId = employee.id
        }
      }

      // ユーザー設定を取得
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = Not found
        setSettings(null)
        setLoading(false)
        return
      }

      if (!data) {
        // 設定が存在しない場合はデフォルト設定を作成
        const defaultSettings = {
          user_id: userId,
          theme: 'light' as const,
          email_notifications: true,
          push_notifications: true,
          mention_notifications: true,
          task_reminders: true,
          items_per_page: 50,
          default_view: 'grid' as const,
          sidebar_collapsed: false,
          language: 'ja',
          timezone: 'Asia/Tokyo',
          dashboard_widgets: [],
          quick_links: []
        }

        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert([defaultSettings])
          .select()
          .single()

        if (insertError) {
          setSettings(null)
        } else {
          setSettings(newSettings)
        }
      } else {
        setSettings(data)
      }
    } catch (error) {
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error

      setSettings(data)
    } catch (error) {
      throw error
    }
  }

  const refreshSettings = async () => {
    await loadUserSettings()
  }

  useEffect(() => {
    loadUserSettings()
  }, [])

  return (
    <UserSettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext)
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider')
  }
  return context
}
