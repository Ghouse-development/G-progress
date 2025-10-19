/**
 * 設定コンテキスト
 * - デモモード
 * - ダークモード
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SettingsContextType {
  demoMode: boolean
  setDemoMode: (value: boolean) => void
  darkMode: boolean
  setDarkMode: (value: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('demoMode')
    return saved === 'true'
  })

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })

  // デモモードをlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('demoMode', demoMode.toString())
  }, [demoMode])

  // ダークモードをlocalStorageに保存 & bodyクラスを更新
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString())
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <SettingsContext.Provider value={{ demoMode, setDemoMode, darkMode, setDarkMode }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
