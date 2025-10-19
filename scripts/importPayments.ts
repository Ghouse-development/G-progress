/**
 * CSVから入金情報をインポート
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import Papa from 'papaparse'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface PaymentData {
  contract_number: string
  customer_name: string
  申込金日付?: string
  申込金額?: string
  契約金日付?: string
  契約金額?: string
  着工金日付?: string
  着工金額?: string
  上棟金日付?: string
  上棟金額?: string
  最終金日付?: string
  最終金額?: string
}

const parseAmount = (amountStr: string): number => {
  if (!amountStr) return 0
  // ¥記号とカンマを削除して数値に変換
  const cleaned = amountStr.replace(/[¥,]/g, '').trim()
  return parseFloat(cleaned) || 0
}

const parseDate = (dateStr: string, contractDate: string): string | null => {
  if (!dateStr || !contractDate) return null

  // 契約日から年を取得
  const contractYear = new Date(contractDate).getFullYear()

  // "8/4" のような形式をパース
  const match = dateStr.match(/(\d+)\/(\d+)/)
  if (!match) return null

  const month = parseInt(match[1])
  const day = parseInt(match[2])

  // 8月〜12月なら契約年、1月〜7月なら翌年
  const year = month >= 8 ? contractYear : contractYear + 1

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function importPayments() {
  console.log('CSVから入金情報をインポートします...')

  // CSVファイルを読み込み
  const csvPath = 'sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv'
  const csvData = fs.readFileSync(csvPath, 'utf-8')

  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true
  })

  const rows = parsed.data as any[]
  console.log(`${rows.length}行のデータを読み込みました`)

  let importCount = 0
  let skipCount = 0

  for (const row of rows) {
    const contractNumber = row['契約番号']
    const customerName = row['お客様名']
    const contractDate = row['請負契約 [日付]']

    if (!contractNumber) {
      skipCount++
      continue
    }

    // 契約番号から案件を検索
    const { data: projects } = await supabase
      .from('projects')
      .select('id, contract_date')
      .eq('contract_number', contractNumber)
      .single()

    if (!projects) {
      console.log(`案件が見つかりません: ${contractNumber} - ${customerName}`)
      skipCount++
      continue
    }

    const projectId = projects.id
    const projectContractDate = projects.contract_date

    // 入金データを作成
    const payments = []

    // 申込金
    const 申込金日付 = parseDate(row['申込金'], projectContractDate)
    const 申込金額 = parseAmount(row['_74']) // 列156
    if (申込金日付 && 申込金額 > 0) {
      payments.push({
        project_id: projectId,
        payment_type: '建築申込金',
        amount: 申込金額,
        scheduled_date: 申込金日付,
        scheduled_amount: 申込金額,
        status: 'pending'
      })
    }

    // 契約金
    const 契約金日付 = parseDate(row['契約金'], projectContractDate)
    const 契約金額 = parseAmount(row['_76']) // 列159
    if (契約金日付 && 契約金額 > 0) {
      payments.push({
        project_id: projectId,
        payment_type: '契約金',
        amount: 契約金額,
        scheduled_date: 契約金日付,
        scheduled_amount: 契約金額,
        status: 'pending'
      })
    }

    // 着工金
    const 着工金日付 = parseDate(row['着工金 '], projectContractDate)
    const 着工金額 = parseAmount(row['_81']) // 列165
    if (着工金日付 && 着工金額 > 0) {
      payments.push({
        project_id: projectId,
        payment_type: '着工金',
        amount: 着工金額,
        scheduled_date: 着工金日付,
        scheduled_amount: 着工金額,
        status: 'pending'
      })
    }

    // 上棟金
    const 上棟金日付 = parseDate(row['\n上棟金'], projectContractDate)
    const 上棟金額 = parseAmount(row['_86']) // 列172
    if (上棟金日付 && 上棟金額 > 0) {
      payments.push({
        project_id: projectId,
        payment_type: '上棟金',
        amount: 上棟金額,
        scheduled_date: 上棟金日付,
        scheduled_amount: 上棟金額,
        status: 'pending'
      })
    }

    // 最終金
    const 最終金日付 = parseDate(row['\n最終金'], projectContractDate)
    const 最終金額 = parseAmount(row['_91']) // 列179
    if (最終金日付 && 最終金額 > 0) {
      payments.push({
        project_id: projectId,
        payment_type: '最終金',
        amount: 最終金額,
        scheduled_date: 最終金日付,
        scheduled_amount: 最終金額,
        status: 'pending'
      })
    }

    // 入金データを一括挿入
    if (payments.length > 0) {
      const { error } = await supabase
        .from('payments')
        .insert(payments)

      if (error) {
        console.error(`入金データの挿入エラー (${contractNumber}):`, error.message)
      } else {
        console.log(`✓ ${contractNumber} - ${customerName}: ${payments.length}件の入金情報を挿入`)
        importCount++
      }
    }
  }

  console.log('\n=== インポート完了 ===')
  console.log(`成功: ${importCount}件`)
  console.log(`スキップ: ${skipCount}件`)
}

importPayments().catch(console.error)
