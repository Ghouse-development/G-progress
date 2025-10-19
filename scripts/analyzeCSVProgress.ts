import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvPath = 'C:/claudecode/G-progress/sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log('📊 CSV構造分析: 予定と実績の関係\n')

const headerRow = rows[0] || []
const markerRow = rows[1] || []
const testRow = rows[100] || [] // 新木海斗様

console.log('=== 行100（新木海斗様）のサンプル ===')
console.log(`契約番号: ${testRow[0]}`)
console.log(`お客様名: ${testRow[1]}`)
console.log('')

// 予定と実績のペアを確認
const datePattern = /^\d{1,2}\/\d{1,2}$|^\d{4}\/\d{1,2}\/\d{1,2}$/

console.log('=== 予定と実績のペア（列14〜40） ===')
for (let col = 14; col <= 40; col++) {
  const marker = markerRow[col]?.trim() || ''
  const taskName = headerRow[col]?.trim() || ''
  const cellValue = testRow[col]?.trim() || ''

  if (datePattern.test(cellValue)) {
    console.log(`列${col}: ${taskName}`)
    console.log(`  マーカー: ${marker}`)
    console.log(`  値: ${cellValue}`)

    // 次の列が実績かチェック
    if (col + 1 < markerRow.length) {
      const nextMarker = markerRow[col + 1]?.trim() || ''
      const nextValue = testRow[col + 1]?.trim() || ''
      if (nextMarker.includes('実績') && datePattern.test(nextValue)) {
        console.log(`  → 実績あり（列${col + 1}）: ${nextValue} ✅ 完了`)
      } else if (nextMarker.includes('実績')) {
        console.log(`  → 実績なし（列${col + 1}）: 未完了`)
      }
    }
    console.log('')
  }
}

console.log('=== 結論 ===')
console.log('CSVには「予定」列の隣に「実績」列があります。')
console.log('実績列に日付が入っている場合は、そのタスクは完了しています。')
console.log('これを考慮してインポートする必要があります。')
