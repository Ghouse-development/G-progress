import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Employee } from '../types/database'

// ビューモード定義
export type ViewMode = 'personal' | 'branch' | 'company'

// 年度定義（8月開始）
export interface FiscalYear {
  year: number // 例: 2025年度 = 2025
  startDate: string // 例: '2025-08-01'
  endDate: string // 例: '2026-07-31'
  label: string // 例: '2025年度'
}

interface ViewModeContextType {
  // モード関連
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // 年度関連
  fiscalYear: FiscalYear
  setFiscalYear: (year: FiscalYear) => void
  availableFiscalYears: FiscalYear[]

  // 現在のユーザー
  currentEmployee: Employee | null

  // フィルタリング用ヘルパー
  canViewProject: (projectEmployeeId: string, projectBranchId: string | null) => boolean
  canEditProject: (projectEmployeeId: string) => boolean
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined)

// 年度計算ヘルパー
function generateFiscalYear(year: number): FiscalYear {
  return {
    year,
    startDate: `${year}-08-01`,
    endDate: `${year + 1}-07-31`,
    label: `${year}年度`
  }
}

// 現在の年度を取得
function getCurrentFiscalYear(): FiscalYear {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  // 8月以降なら当年度、7月以前なら前年度
  const fiscalYear = currentMonth >= 8 ? currentYear : currentYear - 1
  return generateFiscalYear(fiscalYear)
}

// 利用可能な年度リストを生成（過去3年 + 現在 + 未来2年）
function generateAvailableFiscalYears(): FiscalYear[] {
  const current = getCurrentFiscalYear()
  const years: FiscalYear[] = []

  for (let i = -3; i <= 2; i++) {
    years.push(generateFiscalYear(current.year + i))
  }

  return years.reverse() // 新しい年度から表示
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('personal')
  const [fiscalYear, setFiscalYear] = useState<FiscalYear>(getCurrentFiscalYear())
  const [availableFiscalYears] = useState<FiscalYear[]>(generateAvailableFiscalYears())
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)

  // 現在のユーザー情報を取得
  useEffect(() => {
    const loadCurrentEmployee = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: employee } = await supabase
          .from('employees')
          .select('*')
          .eq('id', user.id)
          .single()

        if (employee) {
          setCurrentEmployee(employee as Employee)

          // 役割に応じて初期モードを設定
          if (['president', 'executive', 'department_head'].includes(employee.role)) {
            setViewMode('company') // 管理者は全社モードから開始
          }
        }
      } catch (error) {
        console.error('Failed to load current employee:', error)
      }
    }

    loadCurrentEmployee()
  }, [])

  // 案件を表示できるかチェック
  const canViewProject = (projectEmployeeId: string, projectBranchId: string | null): boolean => {
    if (!currentEmployee) return false

    switch (viewMode) {
      case 'personal':
        // 自分が担当の案件のみ
        return projectEmployeeId === currentEmployee.id

      case 'branch':
        // 同じ拠点の案件
        return projectBranchId === currentEmployee.branch_id

      case 'company':
        // 全案件
        return true

      default:
        return false
    }
  }

  // 案件を編集できるかチェック
  const canEditProject = (projectEmployeeId: string): boolean => {
    if (!currentEmployee) return false

    // 管理者は全案件編集可能
    if (['president', 'executive', 'department_head'].includes(currentEmployee.role)) {
      return true
    }

    // 一般ユーザーは自分の案件のみ編集可能
    return projectEmployeeId === currentEmployee.id
  }

  const value: ViewModeContextType = {
    viewMode,
    setViewMode,
    fiscalYear,
    setFiscalYear,
    availableFiscalYears,
    currentEmployee,
    canViewProject,
    canEditProject
  }

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const context = useContext(ViewModeContext)
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider')
  }
  return context
}
