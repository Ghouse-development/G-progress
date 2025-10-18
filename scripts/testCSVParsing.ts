import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
const csvContent = fs.readFileSync(csvPath, 'utf-8')

// 正しいCSVパースを使用
const records = parse(csvContent, {
  skip_empty_lines: true,
  relax_column_count: true,
  trim: true
})

console.log(`📊 CSVファイル解析結果:`)
console.log(`総行数: ${records.length}`)
console.log(`ヘッダー行の列数: ${records[0]?.length || 0}`)
console.log()
console.log(`最初の10列名:`)
for (let i = 0; i < Math.min(10, records[0]?.length || 0); i++) {
  console.log(`  列${i}: ${records[0][i]}`)
}
console.log()

// データ行をカウント
let dataRowCount = 0
for (let i = 1; i < records.length; i++) {
  const contractNumber = records[i][0]?.trim()
  if (contractNumber && /^\d{6}$/.test(contractNumber)) {
    dataRowCount++
  }
}

console.log(`6桁契約番号を持つデータ行数: ${dataRowCount}`)
console.log()

// サンプルデータ行を表示
console.log(`サンプルデータ行（最初のデータ行）:`)
for (let i = 1; i < records.length; i++) {
  const contractNumber = records[i][0]?.trim()
  if (contractNumber && /^\d{6}$/.test(contractNumber)) {
    console.log(`  契約番号: ${contractNumber}`)
    console.log(`  顧客名: ${records[i][1]}`)
    console.log(`  列数: ${records[i].length}`)
    break
  }
}
