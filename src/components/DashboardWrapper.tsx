/**
 * ダッシュボードラッパー
 *
 * モードに応じて表示を切り替える:
 * - my_tasks: 自分のタスク（MyTasksDashboard）
 * - all_view: 全案件閲覧（DashboardHome - 閲覧モード）
 * - admin: 管理者モード（DashboardHome - 管理者モード）
 */

import { useState, useEffect } from 'react'
import { useMode } from '../contexts/ModeContext'
import MyTasksDashboard from './MyTasksDashboard'
import DashboardHome from './DashboardHome'
import { supabase } from '../lib/supabase'
import { Employee } from '../types/database'

export default function DashboardWrapper() {
  const { mode, setMode } = useMode()
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentEmployee()
  }, [])

  const loadCurrentEmployee = async () => {
    try {
      const employeeId = localStorage.getItem('selectedEmployeeId')
      if (!employeeId) {
        setLoading(false)
        return
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      setCurrentEmployee(employee)
      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  // 部門長かどうか
  const isDepartmentHead = currentEmployee?.role === 'department_head'

  return (
    <div className="space-y-4">
      {/* モード切替ボタン */}
      <div className="bg-white border p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('my_tasks')}
            className={`px-3 py-2 text-sm font-bold ${
              mode === 'my_tasks'
                ? 'bg-black text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            自分のタスク
          </button>

          <button
            onClick={() => setMode('all_view')}
            className={`px-3 py-2 text-sm font-bold ${
              mode === 'all_view'
                ? 'bg-black text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            全案件閲覧
          </button>

          {isDepartmentHead && (
            <button
              onClick={() => setMode('admin')}
              className={`px-3 py-2 text-sm font-bold ${
                mode === 'admin'
                  ? 'bg-black text-white'
                  : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}
            >
              管理者モード
            </button>
          )}
        </div>
      </div>

      {/* モードに応じた表示 */}
      {mode === 'my_tasks' ? (
        <MyTasksDashboard />
      ) : (
        <DashboardHome />
      )}
    </div>
  )
}
