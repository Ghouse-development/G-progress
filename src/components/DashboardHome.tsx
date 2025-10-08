import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project, Task } from '../types/database'
import { differenceInDays, format } from 'date-fns'
import { HelpCircle } from 'lucide-react'

// 年度計算関数（8月1日～翌年7月31日）
const getFiscalYear = (date: Date): number => {
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return month >= 8 ? year : year - 1
}

// 年度の開始日と終了日を取得
const getFiscalYearRange = (fiscalYear: number) => {
  const startDate = new Date(fiscalYear, 7, 1) // 8月1日
  const endDate = new Date(fiscalYear + 1, 6, 31, 23, 59, 59) // 翌年7月31日
  return { startDate, endDate }
}

interface DepartmentStatus {
  department: string
  status: 'normal' | 'warning' | 'delayed'
  delayedCount: number
  totalTasks: number
}

export default function DashboardHome() {
  const [mode, setMode] = useState<'staff' | 'admin'>('staff')
  const [fiscalYear, setFiscalYear] = useState<number>(getFiscalYear(new Date()))
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [constructionFilter, setConstructionFilter] = useState<'all' | 'pre' | 'post'>('all')

  // 利用可能な年度のリスト（過去5年分）
  const currentFY = getFiscalYear(new Date())
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    loadProjects()
  }, [mode, fiscalYear, currentUserId])

  const loadCurrentUser = async () => {
    // 開発モード: localStorageまたはデフォルトユーザーIDを使用
    const savedUserId = localStorage.getItem('currentUserId')
    if (savedUserId) {
      setCurrentUserId(savedUserId)
      return
    }

    // Supabase認証を試みる（本番用）
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('email', user.email)
          .single()

        if (employee) {
          setCurrentUserId(employee.id)
          return
        }
      }
    } catch (error) {
      console.log('Supabase auth not configured, using default user')
    }

    // デフォルト: ユーザーID '1' を使用（開発モード）
    setCurrentUserId('1')
    localStorage.setItem('currentUserId', '1')
  }

  const loadProjects = async () => {
    const { startDate, endDate } = getFiscalYearRange(fiscalYear)

    let query = supabase
      .from('projects')
      .select('*, customer:customers(*)')
      .gte('contract_date', startDate.toISOString())
      .lte('contract_date', endDate.toISOString())

    // 担当者モードの場合、自分が担当する案件のみ
    if (mode === 'staff' && currentUserId) {
      query = query.or(`assigned_sales.eq.${currentUserId},assigned_design.eq.${currentUserId},assigned_construction.eq.${currentUserId}`)
    }

    const { data, error } = await query

    if (!error && data) {
      setProjects(data as Project[])

      // プロジェクトに紐づくタスクをすべて取得
      const projectIds = data.map(p => p.id)
      if (projectIds.length > 0) {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds)

        if (tasksData) {
          setTasks(tasksData as Task[])
        }
      } else {
        setTasks([])
      }
    }
  }

  // 統計計算
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'construction' || p.status === 'post_contract').length
  const averageProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progress_rate, 0) / projects.length)
    : 0
  const delayedProjects = projects.filter(p => p.progress_rate < 50 && p.status !== 'completed').length

  // 部署ステータス計算
  const getDepartmentStatus = (): DepartmentStatus[] => {
    const departments = [
      { name: '営業部', positions: ['営業', '営業事務', 'ローン事務'] },
      { name: '設計部', positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'] },
      { name: '工事部', positions: ['工事', '工事事務', '積算・発注'] },
      { name: '外構事業部', positions: ['外構設計', '外構工事'] }
    ]

    return departments.map(dept => {
      const deptTasks = tasks.filter(task => {
        const taskPosition = task.description?.split(':')[0]?.trim()
        return dept.positions.includes(taskPosition || '')
      })

      const delayedTasks = deptTasks.filter(task => {
        if (!task.due_date) return false
        if (task.status === 'completed') return false
        const daysOverdue = differenceInDays(new Date(), new Date(task.due_date))
        return daysOverdue > 0
      })

      const delayedCount = delayedTasks.length
      let status: 'normal' | 'warning' | 'delayed' = 'normal'
      if (delayedCount === 0) {
        status = 'normal'
      } else if (delayedCount <= 2) {
        status = 'warning'
      } else {
        status = 'delayed'
      }

      return {
        department: dept.name,
        status,
        delayedCount,
        totalTasks: deptTasks.length
      }
    })
  }

  const departmentStatuses = getDepartmentStatus()

  // 着工前/後フィルタリング
  const filteredProjects = projects.filter(project => {
    if (constructionFilter === 'all') return true
    if (constructionFilter === 'pre') {
      return project.status === 'pre_contract' || project.status === 'post_contract'
    }
    if (constructionFilter === 'post') {
      return project.status === 'construction' || project.status === 'completed'
    }
    return true
  })

  // 職種別進捗状況計算（管理者モード用）
  const getPositionProgress = (projectId: string, position: string): 'completed' | 'inprogress' | 'warning' | 'delayed' | 'none' => {
    const positionTasks = tasks.filter(task => {
      const taskPosition = task.description?.split(':')[0]?.trim()
      return task.project_id === projectId && taskPosition === position
    })

    if (positionTasks.length === 0) return 'none'

    const completedTasks = positionTasks.filter(t => t.status === 'completed')
    const delayedTasks = positionTasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      return differenceInDays(new Date(), new Date(t.due_date)) > 0
    })

    if (completedTasks.length === positionTasks.length) return 'completed'
    if (delayedTasks.length >= 2) return 'delayed'
    if (delayedTasks.length === 1) return 'warning'
    return 'inprogress'
  }

  const ALL_POSITIONS = [
    '営業', '営業事務', 'ローン事務',
    '意匠設計', 'IC', '実施設計', '構造設計', '申請設計',
    '工事', '工事事務', '積算・発注',
    '外構設計', '外構工事'
  ]

  return (
    <div className="space-y-6">
      {/* ヘッダー: モード切替と年度選択 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-black">ダッシュボード</h2>

        <div className="flex items-center gap-4">
          {/* 年度選択 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                年度
                <span title="当社では8月1日〜翌年7月31日を1年度としています">
                  <HelpCircle size={14} className="text-gray-400 cursor-help" />
                </span>
                :
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="px-3 py-2 border border-pastel-blue rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
                title="当社では8月1日〜翌年7月31日を1年度としています"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}年度 ({year}/8/1 - {year + 1}/7/31)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-600 text-right">
              💡 当社は8月開始
            </div>
          </div>

          {/* モード切替 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-pastel-blue-light rounded-lg p-1 border-2 border-pastel-blue">
              <button
                onClick={() => setMode('staff')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === 'staff'
                    ? 'bg-gradient-pastel-blue text-pastel-blue-dark shadow-pastel'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="あなたが担当する案件のみを表示します"
              >
                👤 担当者モード
              </button>
              <button
                onClick={() => setMode('admin')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === 'admin'
                    ? 'bg-gradient-pastel-blue text-pastel-blue-dark shadow-pastel'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="全社の案件を俯瞰的に確認できます"
              >
                👨‍💼 管理者モード
              </button>
            </div>
            <div className="text-xs text-gray-600 text-right">
              {mode === 'admin'
                ? '💡 全社の案件を俯瞰的に確認できます'
                : '💡 あなたが担当する案件のみを表示します'}
            </div>
          </div>
        </div>
      </div>

      {/* モード表示インジケーター */}
      <div className={`px-4 py-2 rounded-lg border-2 ${
        mode === 'admin'
          ? 'bg-pastel-orange-light border-pastel-orange'
          : 'bg-pastel-blue-light border-pastel-blue'
      }`}>
        <p className="text-sm">
          {mode === 'admin' ? (
            <span className="font-medium text-pastel-orange-dark">
              📊 管理者モード: 全社の案件（{totalProjects}件）を表示中
            </span>
          ) : (
            <span className="font-medium text-pastel-blue-dark">
              📋 担当者モード: あなたが担当する案件（{totalProjects}件）を表示中
            </span>
          )}
        </p>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">全社進捗率</p>
            <span title="全案件の平均進捗率を表示しています">
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-blue-dark">{averageProgress}%</p>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-pastel-blue h-2 rounded-full transition-all duration-300"
              style={{ width: `${averageProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-orange shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">遅延案件数</p>
            <span title="進捗率が50%未満の案件数を表示しています">
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-orange-dark">{delayedProjects}</p>
          <p className="text-xs text-gray-500 mt-2">進捗50%未満</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-green shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">進行中案件</p>
            <span title="契約後または着工後の案件数を表示しています">
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-green-dark">{activeProjects}</p>
          <p className="text-xs text-gray-500 mt-2">契約後・着工後</p>
        </div>

        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-gray-600">総案件数</p>
            <span title={`${fiscalYear}年度の総案件数を表示しています`}>
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-2xl font-bold text-pastel-blue-dark">{totalProjects}</p>
          <p className="text-xs text-gray-500 mt-2">{fiscalYear}年度</p>
        </div>
      </div>

      {/* 部署ステータス表示（1行4部署） */}
      <div className="grid grid-cols-4 gap-3">
        {departmentStatuses.map(dept => (
          <div
            key={dept.department}
            className={`bg-white rounded-lg border-2 shadow-pastel p-3 ${
              dept.status === 'normal' ? 'border-pastel-blue' :
              dept.status === 'warning' ? 'border-yellow-500' :
              'border-red-500'
            }`}
          >
            <h3 className="text-xs font-semibold text-gray-800 mb-2 text-center">{dept.department}</h3>
            <div className="flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full shadow-pastel flex items-center justify-center ${
                dept.status === 'normal' ? 'bg-blue-500' :
                dept.status === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}>
                <span className="text-xl text-white font-bold">
                  {dept.status === 'normal' ? '✓' :
                   dept.status === 'warning' ? '!' :
                   '×'}
                </span>
              </div>
            </div>
            <p className="text-center mt-2 text-xs text-gray-600 font-medium">
              {dept.status === 'normal' && '計画通り'}
              {dept.status === 'warning' && `要注意 (${dept.delayedCount}件遅延)`}
              {dept.status === 'delayed' && `遅れあり (${dept.delayedCount}件遅延)`}
            </p>
          </div>
        ))}
      </div>

      {/* 管理者モード: 進捗マトリクス表示 */}
      {mode === 'admin' && (
        <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="p-4 bg-gradient-pastel-blue border-b-2 border-pastel-blue">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-pastel-blue-dark">全案件進捗マトリクス</h3>

              {/* フィルタボタン */}
              <div className="flex gap-2">
                <button
                  onClick={() => setConstructionFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    constructionFilter === 'all'
                      ? 'bg-white text-pastel-blue-dark shadow-pastel'
                      : 'bg-pastel-blue-light text-gray-700 hover:bg-white'
                  }`}
                >
                  全て ({projects.length})
                </button>
                <button
                  onClick={() => setConstructionFilter('pre')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    constructionFilter === 'pre'
                      ? 'bg-white text-pastel-blue-dark shadow-pastel'
                      : 'bg-pastel-blue-light text-gray-700 hover:bg-white'
                  }`}
                >
                  着工前 ({projects.filter(p => p.status === 'pre_contract' || p.status === 'post_contract').length})
                </button>
                <button
                  onClick={() => setConstructionFilter('post')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    constructionFilter === 'post'
                      ? 'bg-white text-pastel-blue-dark shadow-pastel'
                      : 'bg-pastel-blue-light text-gray-700 hover:bg-white'
                  }`}
                >
                  着工後 ({projects.filter(p => p.status === 'construction' || p.status === 'completed').length})
                </button>
              </div>
            </div>
          </div>

          {/* 凡例 */}
          <div className="p-3 bg-pastel-blue-light border-b border-gray-300">
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="font-bold text-gray-800">凡例:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>完了</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>進行中</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>要注意(1件遅延)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>遅延(2件以上)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span>タスクなし</span>
              </div>
            </div>
          </div>

          {/* マトリクステーブル */}
          <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="text-xs border-collapse" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th className="border-2 border-gray-300 p-2 bg-pastel-blue-light text-left font-bold text-gray-800" style={{ width: '180px' }}>
                    案件名
                  </th>
                  {ALL_POSITIONS.map(position => (
                    <th
                      key={position}
                      className="border-2 border-gray-300 p-1 bg-pastel-blue-light text-center font-bold text-gray-800"
                      style={{ width: '65px' }}
                      title={position}
                    >
                      <div className="truncate text-xs leading-tight">
                        {position.length > 4 ? position.slice(0, 3) + '..' : position}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={ALL_POSITIONS.length + 1} className="border-2 border-gray-300 p-8 text-center text-gray-500">
                      該当する案件がありません
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project: any) => (
                    <tr key={project.id} className="hover:bg-pastel-blue-light transition-colors">
                      <td className="border-2 border-gray-300 p-2 font-medium text-gray-900 bg-white">
                        <div className="font-bold text-xs truncate" title={`${project.customer?.names?.join('・') || '顧客名なし'}様邸`}>
                          {project.customer?.names?.join('・') || '顧客名なし'}様
                        </div>
                        <div className="text-gray-600 text-xs">
                          {format(new Date(project.contract_date), 'MM/dd')}
                        </div>
                      </td>
                      {ALL_POSITIONS.map(position => {
                        const progress = getPositionProgress(project.id, position)
                        const bgColor =
                          progress === 'completed' ? 'bg-green-500' :
                          progress === 'inprogress' ? 'bg-blue-500' :
                          progress === 'warning' ? 'bg-yellow-500' :
                          progress === 'delayed' ? 'bg-red-500' :
                          'bg-gray-300'

                        return (
                          <td key={position} className="border border-gray-300 p-0.5">
                            <div className={`w-full h-10 ${bgColor} rounded flex items-center justify-center text-white font-bold text-sm`}>
                              {progress === 'completed' && '✓'}
                              {progress === 'inprogress' && '●'}
                              {progress === 'warning' && '!'}
                              {progress === 'delayed' && '×'}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* グラフエリア（プレースホルダー） */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">案件状態分布</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-sm">📊 グラフを表示予定</p>
            <p className="text-xs mt-2">(recharts実装予定)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
