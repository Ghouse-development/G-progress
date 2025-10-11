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

    console.log('Starting payment reminder check...')

    // 今日から7日後までの支払い予定をチェック
    const today = new Date()
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const todayStr = today.toISOString().split('T')[0]
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]

    // 期限が近い未完了の支払いを取得
    const { data: upcomingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_type,
        amount,
        scheduled_date,
        project_id,
        project:projects(
          id,
          customer:customers(names)
        )
      `)
      .eq('status', 'pending')
      .gte('scheduled_date', todayStr)
      .lte('scheduled_date', sevenDaysLaterStr)

    if (paymentsError) {
      console.error('Error fetching upcoming payments:', paymentsError)
      throw paymentsError
    }

    console.log(`Found ${upcomingPayments?.length || 0} upcoming payments`)

    // 期限超過の支払いもチェック
    const { data: overduePayments, error: overdueError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_type,
        amount,
        scheduled_date,
        project_id,
        project:projects(
          id,
          customer:customers(names)
        )
      `)
      .eq('status', 'pending')
      .lt('scheduled_date', todayStr)

    if (overdueError) {
      console.error('Error fetching overdue payments:', overdueError)
      throw overdueError
    }

    console.log(`Found ${overduePayments?.length || 0} overdue payments`)

    // 営業部門の従業員を取得（支払い関連通知の対象）
    const { data: salesEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, last_name, first_name, email')
      .in('department', ['営業', '営業事務', 'ローン事務'])

    if (empError) {
      console.error('Error fetching employees:', empError)
      throw empError
    }

    const notifications = []

    // 期限が近い支払いの通知
    for (const payment of upcomingPayments || []) {
      const daysUntilDue = Math.ceil(
        (new Date(payment.scheduled_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      const customerName = payment.project?.customer?.names?.[0] || '不明な顧客'

      // 全営業部門メンバーに通知
      for (const employee of salesEmployees || []) {
        notifications.push({
          user_id: employee.id,
          title: `入金予定日が近づいています`,
          message: `${customerName}の${payment.payment_type}（¥${payment.amount.toLocaleString()}）が${daysUntilDue}日後に予定されています。`,
          type: 'payment_reminder',
          related_project_id: payment.project_id,
          read: false,
          created_at: new Date().toISOString()
        })
      }
    }

    // 期限超過の支払いの通知
    for (const payment of overduePayments || []) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(payment.scheduled_date).getTime()) / (1000 * 60 * 60 * 24)
      )

      const customerName = payment.project?.customer?.names?.[0] || '不明な顧客'

      // 全営業部門メンバーに通知
      for (const employee of salesEmployees || []) {
        notifications.push({
          user_id: employee.id,
          title: `⚠️ 入金予定日超過`,
          message: `${customerName}の${payment.payment_type}（¥${payment.amount.toLocaleString()}）が${daysOverdue}日超過しています。早急な確認をお願いします。`,
          type: 'payment_overdue',
          related_project_id: payment.project_id,
          read: false,
          created_at: new Date().toISOString()
        })
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

      console.log(`Created ${notifications.length} payment notifications`)
    }

    // 結果を返す
    return new Response(
      JSON.stringify({
        success: true,
        upcomingPayments: upcomingPayments?.length || 0,
        overduePayments: overduePayments?.length || 0,
        notificationsCreated: notifications.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in payment-reminder:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
