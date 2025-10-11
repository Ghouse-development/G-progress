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
    // セッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadEmployee(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 認証状態変更のリスナー
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadEmployee(session.user.id)
      } else {
        setEmployee(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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
