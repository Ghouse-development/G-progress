import Papa from 'papaparse'
import { supabase } from './supabase'
import { format, parse, isValid } from 'date-fns'

export interface CSVRow {
  [key: string]: string
}

export interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

/**
 * CSV進捗管理表からプロジェクトデータを抽出
 */
export function parseProjectCSV(csvText: string): CSVRow[] {
  const result = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    console.error('CSV Parse Errors:', result.errors)
  }

  const rows = result.data

  // ヘッダー行を探す（"契約番号"を含む行）
  let headerIndex = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(cell => cell.includes('契約') && cell.includes('番号'))) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    throw new Error('ヘッダー行が見つかりません')
  }

  // ヘッダーを取得
  const headers = rows[headerIndex].map(h => h.trim())

  // データ行を抽出（ヘッダー行の次から）
  const dataRows: CSVRow[] = []
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < headers.length) continue // 不完全な行はスキップ

    const rowData: CSVRow = {}
    headers.forEach((header, index) => {
      rowData[header] = row[index]?.trim() || ''
    })

    // 契約番号があるデータのみ追加（空行を除外）
    if (rowData['契約\n番号'] || rowData['契約番号']) {
      dataRows.push(rowData)
    }
  }

  return dataRows
}

/**
 * 日付文字列をパース（複数フォーマットに対応）
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null

  const formats = [
    'yyyy/M/d',
    'yyyy/MM/dd',
    'yyyy-M-d',
    'yyyy-MM-dd',
    'M/d',
    'MM/dd',
  ]

  for (const formatStr of formats) {
    try {
      const parsed = parse(dateStr, formatStr, new Date())
      if (isValid(parsed)) {
        // M/d形式の場合、年を現在年と仮定
        if (!formatStr.includes('yyyy')) {
          parsed.setFullYear(new Date().getFullYear())
        }
        return parsed
      }
    } catch (e) {
      continue
    }
  }

  return null
}

/**
 * CSVデータをSupabaseにインポート
 */
export async function importProjectsFromCSV(csvRows: CSVRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  for (const row of csvRows) {
    try {
      // 顧客名の取得（複数名対応）
      const customerName = row['お客様名\n※敬称略'] || row['お客様名'] || ''
      if (!customerName) {
        result.failed++
        result.errors.push('顧客名が見つかりません')
        continue
      }

      const customerNames = customerName.split('・').map(n => n.trim())
      const buildingSite = row['建設地（住所）\n※住所不在地域は、地番'] || row['建設地'] || ''

      // 顧客を作成
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          names: customerNames,
          building_site: buildingSite,
        })
        .select()
        .single()

      if (customerError) {
        result.failed++
        result.errors.push(`顧客作成エラー: ${customerError.message}`)
        continue
      }

      // 請負契約日を取得
      const contractDateStr = row['請負\n契約'] || row['請負契約'] || ''
      const contractDate = parseDate(contractDateStr)

      if (!contractDate) {
        result.failed++
        result.errors.push(`${customerName}: 契約日が無効です`)
        continue
      }

      // 商品名を取得
      const productName = row['商品'] || ''
      let productId = null

      if (productName) {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('name', productName)
          .single()

        productId = product?.id || null
      }

      // プロジェクトを作成
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          customer_id: customer.id,
          product_id: productId,
          contract_date: format(contractDate, 'yyyy-MM-dd'),
          construction_start_date: parseDate(row['着工日'])
            ? format(parseDate(row['着工日'])!, 'yyyy-MM-dd')
            : null,
          status: 'post_contract',
          progress_rate: 0,
        })

      if (projectError) {
        result.failed++
        result.errors.push(`${customerName}: プロジェクト作成エラー - ${projectError.message}`)
        continue
      }

      result.success++
    } catch (error: any) {
      result.failed++
      result.errors.push(`予期しないエラー: ${error.message}`)
    }
  }

  return result
}
