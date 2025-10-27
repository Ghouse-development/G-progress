import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { FiscalYear, Branch, Employee } from '../types/database'

// モードの型定義
export type ViewMode = 'personal' | 'branch' | 'company'

interface FilterContextType {
  // 初期化状態
  isInitializing: boolean

  // 年度選択
  fiscalYears: FiscalYear[]
  selectedFiscalYear: string | null // 例: "2025"
  setSelectedFiscalYear: (year: string | null) => void

  // モード切替
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // 拠点選択（拠点モード時のみ使用）
  branches: Branch[]
  selectedBranchId: string | null
  setSelectedBranchId: (branchId: string | null) => void

  // 現在のユーザー
  currentUser: Employee | null
  setCurrentUser: (user: Employee | null) => void

  // フィルタリングされたプロジェクトIDリスト（各ページで使用）
  getFilteredProjects: () => Promise<string[]>
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true)
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('company')
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)

  // 初期化: 年度マスタと拠点マスタを取得
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadFiscalYears(),
        loadBranches(),
        loadCurrentUser()
      ])
      setIsInitializing(false)
    }
    initialize()
  }, [])

  const loadFiscalYears = async () => {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .order('year', { ascending: false })

    if (!error && data) {
      setFiscalYears(data)
      // デフォルトで最新年度を選択
      if (data.length > 0) {
        setSelectedFiscalYear(data[0].year)
      }
    }
  }

  const loadBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data) {
      setBranches(data)
    }
  }

  const loadCurrentUser = async () => {
    // 開発モード: localStorageまたはデフォルトユーザーIDを使用
    const userId = localStorage.getItem('currentUserId') || '1'

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        branch:branches(*)
      `)
      .eq('id', userId)
      .single()

    if (!error && data) {
      setCurrentUser(data as Employee)

      // ユーザーに拠点が設定されている場合、拠点モードのデフォルトとして設定
      if (data.branch_id) {
        setSelectedBranchId(data.branch_id)
      }
    }
  }

  // フィルタリングされたプロジェクトIDリストを取得
  const getFilteredProjects = async (): Promise<string[]> => {
    let query = supabase
      .from('projects')
      .select('id, assigned_sales, assigned_design, assigned_construction')

    // 年度フィルタ
    if (selectedFiscalYear) {
      query = query.eq('fiscal_year', selectedFiscalYear)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('プロジェクトフィルタエラー:', error)
      return []
    }

    // モードによるフィルタリング
    let filteredProjects = data

    if (viewMode === 'personal' && currentUser) {
      // 担当者モード: 自分が担当している案件のみ
      filteredProjects = data.filter(project =>
        project.assigned_sales === currentUser.id ||
        project.assigned_design === currentUser.id ||
        project.assigned_construction === currentUser.id
      )
    } else if (viewMode === 'branch' && selectedBranchId && currentUser) {
      // 拠点モード: 同じ拠点の従業員が担当している案件
      // まず、同じ拠点の従業員IDリストを取得
      const { data: branchEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('branch_id', selectedBranchId)

      if (branchEmployees) {
        const employeeIds = branchEmployees.map(emp => emp.id)
        filteredProjects = data.filter(project =>
          (project.assigned_sales && employeeIds.includes(project.assigned_sales)) ||
          (project.assigned_design && employeeIds.includes(project.assigned_design)) ||
          (project.assigned_construction && employeeIds.includes(project.assigned_construction))
        )
      }
    }
    // 全社モードの場合はフィルタリングなし

    return filteredProjects.map(p => p.id)
  }

  // 初期化中はローディング画面を表示
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <FilterContext.Provider
      value={{
        isInitializing,
        fiscalYears,
        selectedFiscalYear,
        setSelectedFiscalYear,
        viewMode,
        setViewMode,
        branches,
        selectedBranchId,
        setSelectedBranchId,
        currentUser,
        setCurrentUser,
        getFilteredProjects
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider')
  }
  return context
}
