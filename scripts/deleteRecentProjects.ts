import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteRecentProjects() {
  console.log('🔍 最近作成されたプロジェクトを確認します...\n')

  // 全プロジェクトを取得してcreated_atでソート
  const { data: allProjects, error } = await supabase
    .from('projects')
    .select(`
      id,
      contract_number,
      contract_date,
      created_at,
      customer:customers(names)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  console.log(`📊 総プロジェクト数: ${allProjects.length}件\n`)

  // 上位37件（最近作成されたもの）を表示
  console.log('🆕 最近作成された37件:')
  const recentProjects = allProjects.slice(0, 37)
  recentProjects.forEach((p, i) => {
    const customerName = p.customer?.names?.join('・') || '不明'
    console.log(`${i + 1}. ${customerName}様 (契約: ${p.contract_date}, 作成: ${p.created_at})`)
  })

  console.log('\n⚠️  これらのプロジェクトを削除します...\n')

  // 削除実行
  const projectIds = recentProjects.map(p => p.id)
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .in('id', projectIds)

  if (deleteError) {
    console.error('❌ 削除エラー:', deleteError)
  } else {
    console.log(`✅ ${projectIds.length}件のプロジェクトを削除しました`)
  }
}

deleteRecentProjects()
