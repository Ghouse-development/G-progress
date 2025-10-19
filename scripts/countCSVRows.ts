import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvPath = 'C:/claudecode/G-progress/sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log('📊 CSV総行数:', rows.length)
console.log('')

let dataCount = 0
const dataRows: { index: number, contractNo: string, name: string }[] = []

for (let i = 0; i < rows.length; i++) {
  const contractNo = rows[i][0]?.trim() || ''
  const name = rows[i][1]?.trim() || ''

  // 契約番号らしきもの（数字のみ）がある行をカウント
  if (contractNo && /^\d+$/.test(contractNo)) {
    dataCount++
    dataRows.push({ index: i, contractNo, name })
  }
}

console.log('=== 契約番号を持つデータ行 ===')
dataRows.forEach(row => {
  console.log(`行${row.index}: ${row.contractNo} - ${row.name}`)
})

console.log('')
console.log(`✅ 契約番号を持つデータ: ${dataCount}件`)
console.log(`⚠️  現在のインポート範囲: 行100〜${rows.length - 1}`)
console.log(`⚠️  行100より前に ${dataRows.filter(r => r.index < 100).length}件 のデータが存在します！`)
