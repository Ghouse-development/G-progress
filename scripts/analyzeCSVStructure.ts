import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: false
})

const rows = parsed.data as string[][]

console.log('📋 CSVの構造を分析します...\n')

// 最初の100行のヘッダー部分を確認
console.log('=== ヘッダー行の確認 (行0-20) ===\n')

for (let row = 0; row < 20; row++) {
  const rowData = rows[row]
  if (rowData) {
    console.log(`行${row}: 列14="${rowData[14]}" 列15="${rowData[15]}" 列16="${rowData[16]}" 列17="${rowData[17]}"`)
  }
}

console.log('\n=== データ行の確認 (行100-102) ===\n')

for (let row = 100; row < 103; row++) {
  const rowData = rows[row]
  if (rowData) {
    console.log(`行${row}:`)
    console.log(`  契約番号: ${rowData[0]}`)
    console.log(`  お客様名: ${rowData[1]}`)
    console.log(`  列14: ${rowData[14]}`)
    console.log(`  列15: ${rowData[15]}`)
    console.log(`  列16: ${rowData[16]}`)
    console.log(`  列17: ${rowData[17]}`)
    console.log('')
  }
}

// タスク名を探す
console.log('\n=== タスク名が含まれる行を探索 (行0-50) ===\n')

for (let row = 0; row < 50; row++) {
  const rowData = rows[row]
  const cell14 = rowData?.[14]?.trim()
  const cell17 = rowData?.[17]?.trim()
  const cell20 = rowData?.[20]?.trim()

  if (cell14 && cell14 !== '' && cell14 !== '予定' && cell14 !== '実績' && cell14 !== '確定' && !cell14.match(/^\d{1,2}\/\d{1,2}$/)) {
    console.log(`行${row}: 列14="${cell14}" 列17="${cell17}" 列20="${cell20}"`)
  }
}
