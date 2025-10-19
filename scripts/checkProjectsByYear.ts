import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^[\"']|[\"']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 年度計算関数（8月1日～翌年7月31日）
const getFiscalYear = (date: Date): number => {
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return month >= 8 ? year : year - 1
}

async function checkProjectsByYear() {
  console.log('🔍 年度別の案件数を確認します...\n')

  // 全プロジェクトを取得
  const { data: allProjects, error } = await supabase
    .from('projects')
    .select('id, contract_date, customer:customers(names)')
    .order('contract_date', { ascending: false })

  if (error) {
    console.error('❌ プロジェクト取得エラー:', error)
    return
  }

  console.log(`📊 データベース全案件数: ${allProjects?.length || 0}件\n`)

  // 年度別に集計
  const fiscalYearCounts: Record<number, number> = {}
  const fiscalYearProjects: Record<number, any[]> = {}

  allProjects?.forEach(project => {
    const contractDate = new Date(project.contract_date)
    const fy = getFiscalYear(contractDate)

    if (!fiscalYearCounts[fy]) {
      fiscalYearCounts[fy] = 0
      fiscalYearProjects[fy] = []
    }
    fiscalYearCounts[fy]++
    fiscalYearProjects[fy].push(project)
  })

  // 年度順にソート
  const sortedFY = Object.keys(fiscalYearCounts).map(Number).sort((a, b) => b - a)

  console.log('=== 年度別案件数 ===\n')
  sortedFY.forEach(fy => {
    console.log(`${fy}年度 (${fy}/8/1 - ${fy + 1}/7/31): ${fiscalYearCounts[fy]}件`)
  })

  // 現在の年度
  const currentFY = getFiscalYear(new Date())
  console.log(`\n📌 現在の年度: ${currentFY}年度`)
  console.log(`📌 現在の年度の案件数: ${fiscalYearCounts[currentFY] || 0}件`)

  // 2025年度のプロジェクトをサンプル表示
  console.log(`\n=== ${currentFY}年度のプロジェクトサンプル（最新10件） ===\n`)
  const currentFYProjects = fiscalYearProjects[currentFY] || []
  currentFYProjects.slice(0, 10).forEach((project, index) => {
    const customerName = project.customer?.names?.join('・') || '不明'
    console.log(`${index + 1}. ${customerName}様 (契約日: ${project.contract_date})`)
  })

  // ダッシュボードで46件しか表示されない理由を説明
  console.log('\n=== 分析結果 ===')
  if (fiscalYearCounts[currentFY] !== 131) {
    console.log(`⚠️  ダッシュボードは年度フィルタが有効になっています`)
    console.log(`   現在表示: ${currentFY}年度のみ（${fiscalYearCounts[currentFY] || 0}件）`)
    console.log(`   全件表示するには年度セレクターで過去の年度も選択してください`)
    console.log(`\n   年度別内訳:`)
    sortedFY.forEach(fy => {
      console.log(`   - ${fy}年度: ${fiscalYearCounts[fy]}件`)
    })
  } else {
    console.log(`✅ 全${fiscalYearCounts[currentFY]}件が表示されています`)
  }
}

checkProjectsByYear().catch(console.error)
