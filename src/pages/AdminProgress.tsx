import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Project, Customer, Task } from '../types/database'
import { format, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ProjectWithCustomer extends Project {
  customer: Customer
}

interface TaskWithProject extends Task {
  project_id: string
  dayFromContract?: number
}

// 部門の定義
const DEPARTMENTS = [
  { name: '営業部', positions: ['営業', '営業事務', 'ローン事務'] },
  { name: '設計部', positions: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計'] },
  { name: '工事部', positions: ['工事', '工事事務', '積算・発注'] },
  { name: '外構事業部', positions: ['外構設計', '外構工事'] }
]

export default function AdminProgress() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithCustomer[]>([])
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // 全案件を取得（年度フィルタなし、引き渡し済み以外）
    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        *,
        customer:customers(*)
      `)
      .neq('status', '引き渡し済み')
      .order('contract_date', { ascending: false })

    // 全タスクを取得
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')

    if (projectsData) {
      const projectsWithCustomer = projectsData.map((p: any) => ({
        ...p,
        customer: p.customer
      })) as ProjectWithCustomer[]
      setProjects(projectsWithCustomer)
    }

    if (tasksData && projectsData) {
      // タスクに契約日からの経過日数を追加
      const tasksWithDays = tasksData.map((task: any) => {
        const project = projectsData.find((p: any) => p.id === task.project_id)
        if (project && task.due_date) {
          const dayFromContract = differenceInDays(
            new Date(task.due_date),
            new Date(project.contract_date)
          )
          return { ...task, dayFromContract }
        }
        return task
      }) as TaskWithProject[]
      setTasks(tasksWithDays)
    }

    setLoading(false)
  }

  // 案件の契約日から何日経過したかを計算
  const getDaysFromContract = (contractDate: string): number => {
    return differenceInDays(new Date(), new Date(contractDate))
  }

  // 部署の遅延状況を取得
  const getDepartmentStatus = (projectId: string, dayFromContract: number, deptPositions: string[]) => {
    const deptTasks = tasks.filter(task =>
      task.project_id === projectId &&
      task.dayFromContract !== undefined &&
      task.dayFromContract <= dayFromContract &&
      deptPositions.some(pos => task.description?.includes(pos))
    )

    const completedCount = deptTasks.filter(t => t.status === 'completed').length
    const totalCount = deptTasks.length

    if (totalCount === 0) return { status: 'none', count: 0, total: 0 }

    const delayedTasks = deptTasks.filter(t =>
      t.status !== 'completed' &&
      t.dayFromContract !== undefined &&
      t.dayFromContract < dayFromContract
    )

    if (delayedTasks.length > 0) {
      return { status: 'delayed', count: delayedTasks.length, total: totalCount, tasks: delayedTasks }
    } else if (completedCount === totalCount) {
      return { status: 'completed', count: completedCount, total: totalCount }
    } else {
      return { status: 'in_progress', count: completedCount, total: totalCount }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">管理者モード：全案件進行状況</h1>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              戻る
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            全案件の進行状況を一覧表示。横スクロールで全期間を確認できます。
          </p>
          <div className="mt-3 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
              <span>完了</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
              <span>進行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
              <span>遅延あり</span>
            </div>
          </div>
        </div>

        {/* 進行状況グリッド */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '75vh' }}>
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="sticky left-0 bg-gray-100 z-20 px-4 py-2 border text-left text-sm font-semibold w-48">
                    案件名
                  </th>
                  {DEPARTMENTS.map(dept => (
                    <th key={dept.name} className="px-2 py-2 border text-center text-sm font-semibold min-w-32">
                      {dept.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const todayFromContract = getDaysFromContract(project.contract_date)

                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white z-10 px-4 py-3 border text-sm font-medium">
                        <div
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          {project.customer?.names?.join('・')}様
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          契約: {format(new Date(project.contract_date), 'yyyy/MM/dd', { locale: ja })}
                        </div>
                        <div className="text-xs text-gray-500">
                          経過: {todayFromContract}日目
                        </div>
                      </td>
                      {DEPARTMENTS.map(dept => {
                        const status = getDepartmentStatus(project.id, todayFromContract, dept.positions)

                        return (
                          <td
                            key={dept.name}
                            className="px-2 py-3 border text-center text-xs relative"
                          >
                            {status.total > 0 && (
                              <div
                                className={`p-2 rounded ${
                                  status.status === 'completed' ? 'bg-green-200 text-green-900' :
                                  status.status === 'delayed' ? 'bg-red-200 text-red-900' :
                                  status.status === 'in_progress' ? 'bg-yellow-200 text-yellow-900' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={
                                  status.status === 'delayed' && status.tasks && status.tasks.length > 0
                                    ? `遅延タスク:\n${status.tasks.map(t => t.title).join('\n')}`
                                    : `${status.count}/${status.total} 完了`
                                }
                              >
                                {status.count}/{status.total}
                                {status.status === 'delayed' && (
                                  <div className="font-bold text-red-700 mt-1">
                                    遅延 {status.tasks?.length}件
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 案件数表示 */}
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <p className="text-sm text-gray-600">
            全 {projects.length} 件の案件を表示中
          </p>
        </div>
      </div>
    </div>
  )
}
