/**
 * 担当者モード専用ダッシュボード
 *
 * 自分のタスクを優先的に表示し、遅延を防ぐ
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Project, Task, Employee } from '../types/database'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import {
  isTaskDelayed,
  isTaskDueToday,
  isTaskDueThisWeek,
  getDelayDays,
  getDelayedTasksForEmployee,
  getTodayTasksForEmployee,
  getThisWeekTasksForEmployee,
  getTaskStatusIcon
} from '../lib/taskUtils'
import { getMyProjects } from '../lib/permissions'

interface TaskWithProject extends Task {
  project?: Project
}

export default function MyTasksDashboard() {
  const navigate = useNavigate()
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  // Supabaseリアルタイム更新
  useEffect(() => {
    const channel = supabase
      .channel('my-tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          loadData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadData = async () => {
    try {
      // 現在の従業員を取得
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

      if (!employee) {
        setLoading(false)
        return
      }

      setCurrentEmployee(employee)

      // 全プロジェクトを取得
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          customer:customers(*),
          sales:employees!projects_assigned_sales_fkey(*),
          design:employees!projects_assigned_design_fkey(*),
          construction:employees!projects_assigned_construction_fkey(*)
        `)
        .order('contract_date', { ascending: false })

      // 自分の担当案件をフィルタ
      const myProjectsList = getMyProjects(employee, projects || [])
      setMyProjects(myProjectsList)

      // 自分の担当案件のタスクを取得
      const myProjectIds = myProjectsList.map(p => p.id)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', myProjectIds)
        .order('due_date', { ascending: true })

      // タスクにプロジェクト情報を追加
      const tasksWithProject = (tasks || []).map(task => ({
        ...task,
        project: myProjectsList.find(p => p.id === task.project_id)
      }))

      setAllTasks(tasksWithProject)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
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

  if (!currentEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">従業員情報が見つかりません</div>
      </div>
    )
  }

  // 遅延タスク
  const delayedTasks = getDelayedTasksForEmployee(currentEmployee, allTasks)

  // 今日のタスク
  const todayTasks = getTodayTasksForEmployee(currentEmployee, allTasks)

  // 今週のタスク
  const thisWeekTasks = getThisWeekTasksForEmployee(currentEmployee, allTasks)

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b pb-3">
        <h1 className="text-xl font-bold text-gray-900">
          {currentEmployee.last_name} {currentEmployee.first_name}さんの業務
        </h1>
        <div className="text-base text-gray-600">
          担当案件: {myProjects.length}件
        </div>
      </div>

      {/* 遅延タスク */}
      {delayedTasks.length > 0 && (
        <section className="bg-white border-l-4 border-red-600 p-4">
          <h2 className="text-base font-bold text-gray-900 mb-3">
            遅延中のタスク ({delayedTasks.length}件)
          </h2>

          <div className="space-y-2">
            {delayedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                variant="delayed"
                onClick={() => navigate(`/projects/${task.project_id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 今日のタスク */}
      <section className="bg-white border-l-4 border-yellow-600 p-4">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          今日やるべきタスク ({todayTasks.length}件)
        </h2>

        {todayTasks.length > 0 ? (
          <div className="space-y-2">
            {todayTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                variant="today"
                onClick={() => navigate(`/projects/${task.project_id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-base text-gray-600">今日期限のタスクはありません</p>
        )}
      </section>

      {/* 今週のタスク */}
      <section className="bg-white border-l-4 border-blue-600 p-4">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          今週の予定 ({thisWeekTasks.length}件)
        </h2>

        {thisWeekTasks.length > 0 ? (
          <div className="space-y-2">
            {thisWeekTasks.slice(0, 5).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                variant="week"
                onClick={() => navigate(`/projects/${task.project_id}`)}
              />
            ))}
            {thisWeekTasks.length > 5 && (
              <div className="text-xs text-gray-500 text-center pt-2">
                他 {thisWeekTasks.length - 5}件
              </div>
            )}
          </div>
        ) : (
          <p className="text-base text-gray-600">今週期限のタスクはありません</p>
        )}
      </section>

      {/* 担当案件一覧 */}
      <section className="bg-white border p-4">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          担当案件一覧 ({myProjects.length}件)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {myProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

// タスクカードコンポーネント
interface TaskCardProps {
  task: TaskWithProject
  variant: 'delayed' | 'today' | 'week'
  onClick: () => void
}

function TaskCard({ task, variant, onClick }: TaskCardProps) {
  const delayDays = getDelayDays(task)

  return (
    <div
      className="bg-white border p-3 cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-base mb-1">{task.title}</h3>

          <p className="text-base text-gray-600 mb-1">
            {task.project?.customer?.names?.[0] || '案件名不明'}様邸
          </p>

          {task.due_date && (
            <div className="flex items-center gap-2 text-base text-gray-600">
              <span>
                期限: {format(new Date(task.due_date), 'M月d日(E)', { locale: ja })}
              </span>
              {variant === 'delayed' && delayDays > 0 && (
                <span className="font-bold text-red-600">
                  {delayDays}日遅れ
                </span>
              )}
            </div>
          )}
        </div>

        <button
          className="px-3 py-1 bg-black text-white text-base hover:bg-gray-800"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          {variant === 'delayed' ? '対応' : '詳細'}
        </button>
      </div>
    </div>
  )
}

// 案件カードコンポーネント
interface ProjectCardProps {
  project: Project
  onClick: () => void
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const customerName = project.customer?.names?.[0] || '顧客名不明'
  const statusText = project.status === 'post_contract' ? '契約後' :
    project.status === 'construction' ? '着工後' : '引き渡し済'

  return (
    <div
      className="bg-white border p-3 cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      <h3 className="font-bold text-gray-900 text-base mb-2">{customerName}様邸</h3>
      <div className="text-base text-gray-600 space-y-1">
        <p>契約日: {format(new Date(project.contract_date), 'M月d日')}</p>
        <p>進捗: {project.progress_rate}%</p>
      </div>
    </div>
  )
}
