import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
const csvContent = fs.readFileSync(csvPath, 'utf-8')

const records = parse(csvContent, {
  skip_empty_lines: true,
  relax_column_count: true,
  trim: true
})

const headers = records[0]

// サンプルデータ行を取得
let sampleRow: string[] = []
for (let i = 1; i < records.length; i++) {
  const contractNumber = records[i][0]?.trim()
  if (contractNumber && /^\d{6}$/.test(contractNumber)) {
    sampleRow = records[i]
    console.log(`サンプル行: 契約番号 ${contractNumber} - ${records[i][1]}\n`)
    break
  }
}

console.log('=' .repeat(100))
console.log('CSV全ヘッダー（228列） + サンプルデータ')
console.log('=' .repeat(100))
console.log()

for (let i = 0; i < headers.length; i++) {
  const headerName = headers[i]?.replace(/\n/g, ' ').trim() || `(空)`
  const sampleValue = sampleRow[i]?.trim() || ''

  // 日付パターンをチェック
  const isDate = /^\d{1,2}\/\d{1,2}$/.test(sampleValue) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(sampleValue)
  const marker = isDate ? ' [日付]' : ''

  console.log(`列${i.toString().padStart(3)}: ${headerName}${marker}`)
  if (sampleValue) {
    console.log(`       サンプル: ${sampleValue}`)
  }
  console.log()
}

console.log('=' .repeat(100))
console.log(`総列数: ${headers.length}`)
