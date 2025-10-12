import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log('📋 CSVの構造を詳しく確認します...\n')

// 行0のヘッダー（タスク名）を確認
const headerRow = rows[0] || []
console.log('=== 行0（タスク名） ===')
for (let col = 14; col < 200 && col < headerRow.length; col++) {
  const taskName = headerRow[col]?.trim()
  if (taskName && taskName !== '') {
    console.log(`列${col}: "${taskName}"`)
  }
}

console.log('\n=== 行1（予定/実績マーカー） ===')
const markerRow = rows[1] || []
for (let col = 14; col < 200 && col < markerRow.length; col++) {
  const marker = markerRow[col]?.trim()
  if (marker && marker !== '') {
    console.log(`列${col}: "${marker}"`)
  }
}

// 行100の1案件を詳しく見る
console.log('\n=== 行100（新木海斗様）の全データ ===')
const testRow = rows[100] || []
console.log(`契約番号: ${testRow[0]}`)
console.log(`お客様名: ${testRow[1]}`)
console.log('\n日付が入っている列:')

let dateCount = 0
const datePattern = /^\d{1,2}\/\d{1,2}$|^\d{4}\/\d{1,2}\/\d{1,2}$/

for (let col = 14; col < testRow.length; col++) {
  const cell = testRow[col]?.trim()
  if (cell && datePattern.test(cell)) {
    const taskName = headerRow[col]?.trim() || `列${col}`
    const marker = markerRow[col]?.trim()
    dateCount++
    console.log(`  列${col} (${marker}): ${taskName} = ${cell}`)
  }
}

console.log(`\n合計: ${dateCount}個の日付データ`)
