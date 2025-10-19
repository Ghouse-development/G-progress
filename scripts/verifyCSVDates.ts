import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface CSVProject {
  契約番号: string
  お客様名: string
  請負契約_予定?: string
  請負契約_実績?: string
  '設計ヒアリング_予定手入力'?: string
  '設計ヒアリング_確定'?: string
  '設計ヒアリング_実績'?: string
}

async function verifyDates() {
  console.log('📊 CSV と データベースの日付照合を開始します...\n')

  // CSVファイルを読み込み
  const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  // CSVを行に分割（最初の101行はヘッダーなのでスキップ）
  const lines = csvContent.split('\n')

  console.log(`📄 CSV総行数: ${lines.length}`)
  console.log(`🔍 データ開始行: 102行目から\n`)

  // データベースから全案件を取得
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, contract_number, customer:customers(names), contract_date, construction_start_date')
    .order('contract_number')

  if (error) {
    console.error('❌ データベースエラー:', error)
    return
  }

  console.log(`💾 データベース案件数: ${projects?.length || 0}\n`)

  // CSVのデータ行を解析（102行目以降）
  // 契約番号が6桁の数字で始まる行のみを抽出
  const dataLines = lines.slice(101).filter(line => {
    const firstColumn = line.split(',')[0]?.trim()
    return firstColumn && /^\d{6}$/.test(firstColumn)
  })

  console.log(`📋 CSV案件データ行数: ${dataLines.length}\n`)
  console.log('=' .repeat(100))
  console.log('詳細照合結果')
  console.log('='.repeat(100))

  let matchCount = 0
  let mismatchCount = 0
  let notFoundCount = 0

  for (const line of dataLines) {  // 全ての有効な案件データをチェック
    const columns = line.split(',')
    const contractNumber = columns[0]?.trim()
    const customerName = columns[1]?.trim()
    const contractDatePlanned = columns[14]?.trim()  // 請負契約_予定
    const contractDateActual = columns[15]?.trim()   // 請負契約_実績

    if (!contractNumber || !/^\d{6}$/.test(contractNumber)) continue

    // データベースで該当案件を検索
    const dbProject = projects?.find(p => p.contract_number?.toString() === contractNumber)

    console.log(`\n📌 契約番号: ${contractNumber}`)
    console.log(`   顧客名: ${customerName}`)

    if (dbProject) {
      console.log(`   ✅ データベースに存在`)
      console.log(`   DB顧客名: ${dbProject.customer?.names?.join('・') || ''}`)

      // 日付の照合
      const dbContractDate = dbProject.contract_date
      const csvDate = contractDateActual || contractDatePlanned

      console.log(`   📅 CSV契約日: ${csvDate || '(なし)'}`)
      console.log(`   📅 DB契約日: ${dbContractDate || '(なし)'}`)

      if (csvDate && dbContractDate) {
        // 日付を比較（CSVの日付フォーマットを変換）
        const csvDateParts = csvDate.split('/')
        let csvDateFormatted = ''
        if (csvDateParts.length === 2) {
          // MM/DD形式の場合、年を推定（2024年と仮定）
          csvDateFormatted = `2024-${csvDateParts[0].padStart(2, '0')}-${csvDateParts[1].padStart(2, '0')}`
        } else if (csvDateParts.length === 3) {
          // M/D/YYYY または YYYY/M/D 形式
          if (csvDateParts[0].length === 4) {
            csvDateFormatted = `${csvDateParts[0]}-${csvDateParts[1].padStart(2, '0')}-${csvDateParts[2].padStart(2, '0')}`
          } else {
            csvDateFormatted = `2024-${csvDateParts[0].padStart(2, '0')}-${csvDateParts[1].padStart(2, '0')}`
          }
        }

        if (csvDateFormatted === dbContractDate) {
          console.log(`   ✅ 日付一致`)
          matchCount++
        } else {
          console.log(`   ⚠️  日付不一致`)
          console.log(`      CSV: ${csvDateFormatted}`)
          console.log(`      DB:  ${dbContractDate}`)
          mismatchCount++
        }
      } else if (!csvDate && !dbContractDate) {
        console.log(`   ℹ️  両方とも日付なし`)
        matchCount++
      } else {
        console.log(`   ⚠️  片方のみ日付あり`)
        mismatchCount++
      }
    } else {
      console.log(`   ❌ データベースに見つかりません`)
      notFoundCount++
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log('📊 照合結果サマリー（最初の15件）')
  console.log('='.repeat(100))
  console.log(`✅ 一致: ${matchCount}件`)
  console.log(`⚠️  不一致: ${mismatchCount}件`)
  console.log(`❌ 未登録: ${notFoundCount}件`)
  console.log('\n')
}

verifyDates().catch(console.error)
