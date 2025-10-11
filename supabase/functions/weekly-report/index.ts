import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting weekly report generation...')

    // 過去7日間の期間を計算
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const todayStr = today.toISOString().split('T')[0]
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    // 今週完了したタスクを取得
    const { data: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, assigned_to')
      .eq('status', 'completed')
      .gte('actual_completion_date', sevenDaysAgoStr)
      .lte('actual_completion_date', todayStr)

    if (tasksError) {
      console.error('Error fetching completed tasks:', tasksError)
      throw tasksError
    }

    // 今週新規契約したプロジェクトを取得
    const { data: newProjects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        customer:customers(names)
      `)
      .gte('contract_date', sevenDaysAgoStr)
      .lte('contract_date', todayStr)

    if (projectsError) {
      console.error('Error fetching new projects:', projectsError)
      throw projectsError
    }

    // 今週完了したプロジェクトを取得
    const { data: completedProjects, error: completedProjError } = await supabase
      .from('projects')
      .select(`
        id,
        customer:customers(names)
      `)
      .eq('status', 'completed')
      .gte('actual_end_date', sevenDaysAgoStr)
      .lte('actual_end_date', todayStr)

    if (completedProjError) {
      console.error('Error fetching completed projects:', completedProjError)
      throw completedProjError
    }

    // 今週の入金を取得
    const { data: weekPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('actual_date', sevenDaysAgoStr)
      .lte('actual_date', todayStr)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      throw paymentsError
    }

    const totalRevenue = weekPayments?.reduce((sum, p) => sum + p.amount, 0) || 0

    // 部門別のタスク完了数を集計
    const tasksByEmployee: Record<string, number> = {}
    for (const task of completedTasks || []) {
      if (task.assigned_to) {
        tasksByEmployee[task.assigned_to] = (tasksByEmployee[task.assigned_to] || 0) + 1
      }
    }

    // 全従業員を取得
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, last_name, first_name, email, department, role')

    if (empError) {
      console.error('Error fetching employees:', empError)
      throw empError
    }

    // レポート本文を作成
    const reportContent = `
📊 **週次レポート（${sevenDaysAgoStr} 〜 ${todayStr}）**

## 📈 今週のハイライト

### プロジェクト
- 新規契約: ${newProjects?.length || 0}件
- 完了: ${completedProjects?.length || 0}件

### タスク
- 完了: ${completedTasks?.length || 0}件

### 売上
- 入金額: ¥${totalRevenue.toLocaleString()}

## 🏆 完了タスク数トップ5

${employees
  ?.map(emp => ({
    name: `${emp.last_name} ${emp.first_name}`,
    department: emp.department,
    count: tasksByEmployee[emp.id] || 0
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 5)
  .map((emp, idx) => `${idx + 1}. ${emp.name}（${emp.department}）: ${emp.count}件`)
  .join('\n')}

## 📋 新規契約プロジェクト

${newProjects?.map(p => `- ${p.customer?.names?.[0] || '不明な顧客'}`).join('\n') || 'なし'}

## ✅ 完了プロジェクト

${completedProjects?.map(p => `- ${p.customer?.names?.[0] || '不明な顧客'}`).join('\n') || 'なし'}

---
このレポートは自動生成されました。
    `.trim()

    // 管理者や営業部門の責任者に通知を送信
    const managementEmployees = employees?.filter(
      emp => emp.role === '管理者' || emp.role === '部長' || emp.role === 'マネージャー'
    ) || []

    const notifications = managementEmployees.map(emp => ({
      user_id: emp.id,
      title: '📊 週次レポート',
      message: `今週の活動サマリーが生成されました。新規契約${newProjects?.length || 0}件、完了タスク${completedTasks?.length || 0}件。`,
      type: 'info',
      read: false,
      created_at: new Date().toISOString()
    }))

    // 通知を一括挿入
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error('Error inserting notifications:', notifError)
        throw notifError
      }

      console.log(`Sent weekly report to ${notifications.length} managers`)
    }

    // メール送信（オプション）
    for (const manager of managementEmployees) {
      if (manager.email) {
        console.log(`Would send weekly report email to: ${manager.email}`)
        // TODO: SendGridやResendなどのメール送信サービスと連携してレポートを送信
      }
    }

    // 結果を返す
    return new Response(
      JSON.stringify({
        success: true,
        report: reportContent,
        stats: {
          newProjects: newProjects?.length || 0,
          completedProjects: completedProjects?.length || 0,
          completedTasks: completedTasks?.length || 0,
          totalRevenue,
        },
        notificationsSent: notifications.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in weekly-report:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
