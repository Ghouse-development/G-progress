import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 3つのモード:
// - my_tasks: 担当者モード（自分のタスクのみ表示）
// - branch: 拠点モード（自分の拠点の案件を表示）
// - admin: 全社モード（全案件編集可能）
type Mode = 'my_tasks' | 'branch' | 'admin' | 'all_view' | 'staff' // all_view, staffは後方互換性のため残す

interface ModeContextType {
  mode: Mode
  setMode: (mode: Mode) => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    const savedMode = localStorage.getItem('dashboardMode')
    // 旧モード（staff, all_view）を新モード（my_tasks）に自動変換
    if (savedMode === 'staff' || savedMode === 'all_view' || !savedMode) {
      return 'my_tasks'
    }
    return savedMode as Mode
  })

  // 初回マウント時に担当者モードに設定
  useEffect(() => {
    if (!localStorage.getItem('dashboardMode')) {
      setMode('my_tasks')
      localStorage.setItem('dashboardMode', 'my_tasks')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('dashboardMode', mode)
  }, [mode])

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  )
}

export function useMode() {
  const context = useContext(ModeContext)
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider')
  }
  return context
}
