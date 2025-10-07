import { createClient } from '@supabase/supabase-js'
import { addDays, format } from 'date-fns'

// Supabase設定
const supabaseUrl = 'https://qxftwxkpeqvlukjybnfp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTIzMTUsImV4cCI6MjA3NTM4ODMxNX0.CMvqNski6cYgG3cfkNPwtpKJQKiaWPtszP48qX8_WP8'

const supabase = createClient(supabaseUrl, supabaseKey)

// 職種リスト
const POSITIONS = [
  '営業', '営業事務', 'ローン事務',
  '意匠設計', 'IC', '実施設計', '構造設計', '申請設計',
  '工事', '工事事務', '積算・発注'
]

async function insertSampleTasks() {
  console.log('🚀 サンプルタスクの投入を開始します...\n')

  // プロジェクトを取得
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_date')

  if (projectError) {
    console.error('❌ プロジェクトの取得に失敗:', projectError.message)
    return
  }

  if (!projects || projects.length === 0) {
    console.log('⚠️  プロジェクトが見つかりません')
    return
  }

  console.log(`📝 ${projects.length}件のプロジェクトにタスクを投入します`)

  // 従業員を取得（タスクの担当者として割り当て）
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .limit(1)

  const assignedTo = employees && employees.length > 0 ? employees[0].id : null

  let totalTasks = 0

  for (const project of projects) {
    const contractDate = new Date(project.contract_date)
    const tasks = []

    // 各職種に対して複数のタスクを作成
    // 営業部のタスク
    tasks.push({
      project_id: project.id,
      title: '初回面談',
      description: '営業: お客様との初回面談',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 0), 'yyyy-MM-dd'),
      status: 'completed',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: 'ヒアリング',
      description: '営業: 要望ヒアリング',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 7), 'yyyy-MM-dd'),
      status: 'completed',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: '契約書作成',
      description: '営業事務: 契約書の作成と準備',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 14), 'yyyy-MM-dd'),
      status: 'completed',
      priority: 'medium'
    })

    tasks.push({
      project_id: project.id,
      title: 'ローン申請',
      description: 'ローン事務: 住宅ローン事前審査申請',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 21), 'yyyy-MM-dd'),
      status: 'requested',
      priority: 'high'
    })

    // 設計部のタスク
    tasks.push({
      project_id: project.id,
      title: '基本プラン作成',
      description: '意匠設計: 基本設計プラン作成',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 30), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: 'IC打合せ',
      description: 'IC: インテリアコーディネート打合せ',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 45), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'medium'
    })

    tasks.push({
      project_id: project.id,
      title: '実施設計図作成',
      description: '実施設計: 実施設計図面作成',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 60), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: '構造計算',
      description: '構造設計: 構造計算書作成',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 75), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: '確認申請提出',
      description: '申請設計: 建築確認申請書類提出',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 90), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    // 工事部のタスク
    tasks.push({
      project_id: project.id,
      title: '見積作成',
      description: '積算・発注: 工事見積書作成',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 100), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'medium'
    })

    tasks.push({
      project_id: project.id,
      title: '着工準備',
      description: '工事: 着工前準備・現場確認',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 120), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: '基礎工事',
      description: '工事: 基礎工事開始',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 130), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: '工程表作成',
      description: '工事事務: 工程表作成と管理',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 125), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'medium'
    })

    tasks.push({
      project_id: project.id,
      title: '建方工事',
      description: '工事: 建方・上棟工事',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 150), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: '仕上げ工事',
      description: '工事: 内装仕上げ工事',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 200), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    tasks.push({
      project_id: project.id,
      title: '竣工検査',
      description: '工事: 竣工検査・引渡し準備',
      assigned_to: assignedTo,
      due_date: format(addDays(contractDate, 240), 'yyyy-MM-dd'),
      status: 'not_started',
      priority: 'high'
    })

    // タスクを投入
    const { error: taskError } = await supabase
      .from('tasks')
      .insert(tasks)

    if (taskError) {
      console.error(`❌ プロジェクト ${project.id} のタスク投入に失敗:`, taskError.message)
    } else {
      totalTasks += tasks.length
      console.log(`✅ プロジェクト ${project.id} に ${tasks.length}件のタスクを投入しました`)
    }
  }

  console.log(`\n🎉 サンプルタスクの投入が完了しました！`)
  console.log(`📊 合計 ${totalTasks}件のタスクを投入しました`)
  console.log(`\n👉 http://localhost:5173/projects で案件を選択してタスクを確認できます`)
}

insertSampleTasks().catch(console.error)
