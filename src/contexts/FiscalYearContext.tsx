import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface FiscalYearContextType {
  selectedYear: string
  setSelectedYear: (year: string) => void
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined)

export function FiscalYearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const savedYear = localStorage.getItem('selectedFiscalYear')
    return savedYear || '2025'
  })

  useEffect(() => {
    localStorage.setItem('selectedFiscalYear', selectedYear)
  }, [selectedYear])

  return (
    <FiscalYearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </FiscalYearContext.Provider>
  )
}

export function useFiscalYear() {
  const context = useContext(FiscalYearContext)
  if (context === undefined) {
    throw new Error('useFiscalYear must be used within a FiscalYearProvider')
  }
  return context
}
