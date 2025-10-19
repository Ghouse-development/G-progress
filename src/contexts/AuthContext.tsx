import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { Employee } from '../types/database'

interface AuthContextType {
  user: User | null
  employee: Employee | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, employeeData: Partial<Employee>) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 開発モード：佐古祐太さんでデフォルトログイン
    const loadDefaultEmployee = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', '4e2b13ad-198c-4be0-a563-9e5b90f20261') // 佐古祐太さんのID
          .single()

        if (!error && data) {
          setEmployee(data as Employee)
          // ダミーユーザーオブジェクトを作成
          setUser({ id: data.id, email: data.email } as User)
          localStorage.setItem('auth', 'true')
          localStorage.setItem('selectedEmployeeId', data.id)
          localStorage.setItem('currentUserId', data.id)
        }
      } catch (error) {
        console.error('従業員情報の取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDefaultEmployee()
  }, [])

  const loadEmployee = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', userId)
        .single()

      if (!error && data) {
        setEmployee(data as Employee)
      }
    } catch (error) {
      console.error('従業員情報の取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setEmployee(null)
    setSession(null)
  }

  const signUp = async (email: string, password: string, employeeData: Partial<Employee>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) return { error }

    // 従業員レコードを作成
    if (data.user) {
      const { error: empError } = await supabase.from('employees').insert([
        {
          ...employeeData,
          auth_user_id: data.user.id,
          email: email,
        },
      ])

      if (empError) {
        console.error('従業員レコード作成エラー:', empError)
        return { error: empError }
      }
    }

    return { error: null }
  }

  const value = {
    user,
    employee,
    session,
    loading,
    signIn,
    signOut,
    signUp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
