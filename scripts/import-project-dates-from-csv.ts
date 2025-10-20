/**
 * CSVから案件の各種期日を読み込んでprojectsテーブルを更新
 *
 * 実行方法:
 * npx tsx scripts/import-project-dates-from-csv.ts <CSVファイルパス>
 *
 * 例:
 * npx tsx scripts/import-project-dates-from-csv.ts sankoushiryou/進捗管理表.csv
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { parse } from 'csv-parse/sync'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// CSVのカラム名と対応するDBフィールド名のマッピング
const fieldMapping: { [key: string]: string } = {
  '契約番号': 'contract_number',
  'お客様名': 'customer_names',
  '建設地（住所）': 'construction_address',
  '商品': 'product_type',
  '階数': 'floors',
  '坪数(施工)': 'construction_area',

  // スケジュール
  '請負契約': 'contract_date',
  '設計ヒアリング': 'design_hearing_date',
  'プラン確定': 'plan_finalized_date',
  'プラン確定時資金計画書お客様送付': 'plan_financial_sent_date',
  '構造GO': 'structure_go_date',
  '申請GO': 'application_go_date',
  '構造1回目CB': 'structure_1st_cb_date',
  '構造2回目CB': 'structure_2nd_cb_date',
  '打合せ可能日': 'meeting_available_date',
  '最終打合': 'final_meeting_date',
  '会議図面渡し日': 'meeting_document_delivery_date',
  '変更契約前会議': 'pre_change_contract_meeting_date',
  '図面UP': 'drawing_upload_date',
  '構造図Up': 'structure_drawing_upload_date',
  '着工許可': 'construction_permit_date',

  // 融資関連
  'フラット設計に関する通知書必要日': 'flat_design_notice_required_date',
  '建築確認済証必要日': 'building_permit_required_date',
  '中間検査合格証必要日': 'interim_inspection_cert_required_date',
  '検査済証必要日': 'completion_inspection_cert_required_date',

  // 解体・土地関連
  '解体開始日': 'demolition_start_date',
  '解体完了日': 'demolition_completion_date',
  '変更契約日': 'change_contract_date',
  '土地決済': 'land_settlement_date',
  '分筆完了日': 'subdivision_completion_date',

  // 工事スケジュール
  '請負契約着工日': 'initial_contract_construction_start_date',
  '変更契約着工日': 'change_contract_construction_start_date',
  '地盤補強工事日': 'ground_reinforcement_date',
  '基礎着工日': 'foundation_start_date',
  '実行予算完成': 'execution_budget_completion_date',
  '上棟日': 'roof_raising_date',
  '中間検査': 'interim_inspection_date',
  '完了検査': 'completion_inspection_date',
  '引渡日': 'handover_date',
  '施主希望カギ渡し日': 'owner_desired_key_delivery_date',
  '外構工事開始日': 'exterior_work_start_date',
  '外構工事完了日': 'exterior_work_completion_date',

  // 金額関連
  '契約金額': 'contract_amount',
  '申込金日付': 'application_fee_date',
  '申込金金額': 'application_fee_amount',
  '契約金日付': 'contract_payment_date',
  '契約金金額': 'contract_payment_amount',
  '着工金日付': 'construction_start_payment_date',
  '着工金金額': 'construction_start_payment_amount',
  '上棟金日付': 'roof_raising_payment_date',
  '上棟金金額': 'roof_raising_payment_amount',
  '最終金日付': 'final_payment_date',
  '最終金金額': 'final_payment_amount',

  // 性能値
  'C値': 'c_value',
  'UA値': 'ua_value',
  'ηAC値': 'eta_ac_value',

  // 備考
  '進捗状況（問題点・アクションプラン）': 'progress_status',
  '備考（お客様個別情報・注意点）': 'notes'
}

/**
 * 日付文字列をISO形式に変換
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD などに対応
    const cleaned = dateStr.replace(/[年月]/g, '-').replace(/日/g, '').trim()
    const date = new Date(cleaned)

    if (isNaN(date.getTime())) return null

    return date.toISOString().split('T')[0] // YYYY-MM-DD形式
  } catch {
    return null
  }
}

/**
 * 数値文字列をパース
 */
function parseNumber(numStr: string): number | null {
  if (!numStr || numStr.trim() === '') return null

  try {
    // カンマを除去して数値化
    const cleaned = numStr.replace(/,/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  } catch {
    return null
  }
}

/**
 * CSVを読み込んでprojectsテーブルを更新
 */
async function importProjectDates(csvPath: string) {
  console.log(`📄 CSVファイルを読み込み中: ${csvPath}`)

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ ファイルが見つかりません: ${csvPath}`)
    process.exit(1)
  }

  // CSVファイル読み込み
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true // BOM対応
  })

  console.log(`📊 ${records.length}件のレコードを読み込みました`)

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (const record of records) {
    try {
      // 契約番号でプロジェクトを特定
      const contractNumber = record['契約番号']

      if (!contractNumber) {
        skippedCount++
        continue
      }

      // 更新データを構築
      const updateData: any = {}

      for (const [csvColumn, dbField] of Object.entries(fieldMapping)) {
        const value = record[csvColumn]

        if (!value || value.trim() === '') continue

        // 日付フィールド
        if (dbField.includes('_date') || dbField === 'contract_date') {
          const parsedDate = parseDate(value)
          if (parsedDate) {
            updateData[dbField] = parsedDate
          }
        }
        // 金額フィールド
        else if (dbField.includes('_amount') || dbField === 'contract_amount') {
          const parsedNumber = parseNumber(value)
          if (parsedNumber !== null) {
            updateData[dbField] = parsedNumber
          }
        }
        // 数値フィールド（坪数、階数、性能値）
        else if (['construction_area', 'floors', 'c_value', 'ua_value', 'eta_ac_value'].includes(dbField)) {
          const parsedNumber = parseNumber(value)
          if (parsedNumber !== null) {
            updateData[dbField] = parsedNumber
          }
        }
        // 文字列フィールド
        else {
          updateData[dbField] = value
        }
      }

      // お客様名は配列として処理
      if (record['お客様名']) {
        updateData.customer_names = [record['お客様名']]
      }

      if (Object.keys(updateData).length === 0) {
        skippedCount++
        continue
      }

      // プロジェクトを更新
      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('contract_number', contractNumber)

      if (error) {
        console.error(`  ❌ 契約番号 ${contractNumber} の更新失敗:`, error.message)
        errorCount++
      } else {
        console.log(`  ✅ 契約番号 ${contractNumber} を更新しました`)
        successCount++
      }

    } catch (err: any) {
      console.error(`  ❌ レコード処理エラー:`, err.message)
      errorCount++
    }
  }

  // 結果表示
  console.log('\n📊 インポート結果:')
  console.log(`  ✅ 成功: ${successCount}件`)
  console.log(`  ❌ 失敗: ${errorCount}件`)
  console.log(`  ⏭️ スキップ: ${skippedCount}件`)
  console.log(`  📦 合計: ${records.length}件`)
}

// コマンドライン引数からCSVパスを取得
const csvPath = process.argv[2]

if (!csvPath) {
  console.error('❌ 使用方法: npx tsx scripts/import-project-dates-from-csv.ts <CSVファイルパス>')
  process.exit(1)
}

// 実行
importProjectDates(csvPath)
  .then(() => {
    console.log('\n✅ インポートが完了しました')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ インポート中にエラーが発生しました:', err)
    process.exit(1)
  })
