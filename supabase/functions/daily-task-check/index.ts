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

    console.log('Starting daily task check...')

    // 今日の日付
    const today = new Date().toISOString().split('T')[0]

    // 期限切れの未完了タスクを取得
    const { data: delayedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        assigned_to,
        project_id,
        project:projects(
          id,
          customer:customers(names)
        ),
        assigned_employee:employees(
          id,
          last_name,
          first_name,
          email
        )
      `)
      .lt('due_date', today)
      .in('status', ['not_started', 'requested'])

    if (tasksError) {
      console.error('Error fetching delayed tasks:', tasksError)
      throw tasksError
    }

    console.log(`Found ${delayedTasks?.length || 0} delayed tasks`)

    // 各遅延タスクに対して通知を作成
    const notifications = []
    for (const task of delayedTasks || []) {
      if (!task.assigned_to) continue

      const delayDays = Math.floor(
        (new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )

      const customerName = task.project?.customer?.names?.[0] || '不明な顧客'

      // 通知を作成
      const notification = {
        user_id: task.assigned_to,
        title: `タスク遅延: ${task.title}`,
        message: `${customerName}の案件で、タスクが${delayDays}日遅延しています。早急な対応をお願いします。`,
        type: 'delay',
        related_project_id: task.project_id,
        related_task_id: task.id,
        read: false,
        created_at: new Date().toISOString()
      }

      notifications.push(notification)

      // メール送信（オプション - 実装する場合）
      if (task.assigned_employee?.email) {
        console.log(`Would send email to: ${task.assigned_employee.email}`)
        // TODO: SendGridやResendなどのメール送信サービスと連携
      }
    }

    // 通知を一括挿入
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error('Error inserting notifications:', notifError)
        throw notifError
      }

      console.log(`Created ${notifications.length} notifications`)
    }

    // 結果を返す
    return new Response(
      JSON.stringify({
        success: true,
        delayedTasksCount: delayedTasks?.length || 0,
        notificationsCreated: notifications.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in daily-task-check:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
