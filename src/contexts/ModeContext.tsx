import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Mode = 'staff' | 'admin'

interface ModeContextType {
  mode: Mode
  setMode: (mode: Mode) => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    // デフォルトは担当者モード
    const savedMode = localStorage.getItem('dashboardMode')
    return (savedMode === 'admin' ? 'admin' : 'staff') as Mode
  })

  // 初回マウント時に担当者モードに設定
  useEffect(() => {
    if (!localStorage.getItem('dashboardMode')) {
      setMode('staff')
      localStorage.setItem('dashboardMode', 'staff')
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
