import { supabase } from '../lib/supabase'
import { format, addDays, parseISO } from 'date-fns'
import taskMastersData from '../data/taskMasters.json'

interface TaskMaster {
  id: number
  businessNo: number
  title: string
  phase: string
  category?: string
  importance?: string
  department?: string
  purpose?: string
  description?: string
  dos?: string
  donts?: string
  tools?: string
  requiredMaterials?: string
  manualUrl?: string
  notes?: string
  daysFromContract: number | null
}

/**
 * 契約日からタスクの期限を計算
 */
const calculateDueDate = (contractDate: string, daysFromContract: number | null): string | null => {
  if (daysFromContract === null) {
    return null // 手動設定が必要なタスク
  }

  const contract = parseISO(contractDate)
  const dueDate = addDays(contract, daysFromContract)
  return format(dueDate, 'yyyy-MM-dd')
}

/**
 * 担当者を自動割り当て
 */
const assignEmployee = (
  department: string | undefined,
  assignedSales?: string,
  assignedDesign?: string,
  assignedConstruction?: string
): string | undefined => {
  if (!department) return undefined

  if (department === '営業') return assignedSales
  if (department === '設計' || department === 'IC') return assignedDesign
  if (department === '工事' || department === '現場監督') return assignedConstruction

  return undefined
}

/**
 * 優先度を判定
 */
const getPriority = (importance: string | undefined): 'low' | 'medium' | 'high' => {
  if (importance === 'S') return 'high'
  if (importance === 'A') return 'medium'
  return 'low'
}

/**
 * 新規案件のタスクを自動生成
 */
export const generateProjectTasks = async (
  projectId: string,
  contractDate: string,
  assignedSales?: string,
  assignedDesign?: string,
  assignedConstruction?: string
) => {
  try {
    console.log(`タスク自動生成開始: projectId=${projectId}, contractDate=${contractDate}`)

    const taskMasters = taskMastersData as TaskMaster[]

    // タスクマスタから実際のタスクを生成
    const tasks = taskMasters.map((master) => {
      const dueDate = calculateDueDate(contractDate, master.daysFromContract)
      const assignedTo = assignEmployee(master.department, assignedSales, assignedDesign, assignedConstruction)

      // descriptionを組み立て
      let fullDescription = ''
      if (master.purpose) fullDescription += `【目的】\n${master.purpose}\n\n`
      if (master.description) fullDescription += `${master.description}\n\n`
      if (master.dos) fullDescription += `【Dos（意識してやるべきこと）】\n${master.dos}\n\n`
      if (master.donts) fullDescription += `【Don'ts（やってはならないこと）】\n${master.donts}\n\n`
      if (master.tools) fullDescription += `【使用ツール】\n${master.tools}\n\n`
      if (master.requiredMaterials) fullDescription += `【必要資料】\n${master.requiredMaterials}\n\n`
      if (master.notes) fullDescription += `【備考】\n${master.notes}\n\n`

      return {
        project_id: projectId,
        title: master.title,
        description: fullDescription.trim() || null,
        assigned_to: assignedTo || null,
        due_date: dueDate,
        status: 'not_started' as const,
        priority: getPriority(master.importance),
        dos: master.dos || null,
        donts: master.donts || null,
        manual_url: master.manualUrl || null
      }
    })

    // Supabaseに一括挿入
    const { data, error } = await supabase
      .from('tasks')
      .insert(tasks)
      .select()

    if (error) {
      console.error('タスク生成エラー:', error)
      throw error
    }

    console.log(`タスク生成完了: ${tasks.length}件のタスクを生成しました`)
    return { success: true, tasksCount: tasks.length, tasks: data }

  } catch (error) {
    console.error('タスク自動生成に失敗:', error)
    return { success: false, error }
  }
}

/**
 * 既存案件にタスクを追加（再生成）
 */
export const regenerateProjectTasks = async (projectId: string) => {
  try {
    // プロジェクト情報を取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('contract_date, assigned_sales, assigned_design, assigned_construction')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('プロジェクト情報の取得に失敗:', projectError)
      return { success: false, error: projectError }
    }

    // 既存のタスクを削除
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('既存タスクの削除に失敗:', deleteError)
      return { success: false, error: deleteError }
    }

    // タスクを再生成
    return await generateProjectTasks(
      projectId,
      project.contract_date,
      project.assigned_sales,
      project.assigned_design,
      project.assigned_construction
    )

  } catch (error) {
    console.error('タスク再生成に失敗:', error)
    return { success: false, error }
  }
}
