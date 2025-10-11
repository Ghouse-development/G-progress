import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log(`総行数: ${rows.length}\n`)

// 行100から115までをチェック
for (let i = 100; i < Math.min(115, rows.length); i++) {
  const row = rows[i]
  const contractNo = row[0]?.trim() || ''
  const customerName = row[1]?.trim() || ''

  console.log(`行インデックス ${i}: 契約番号="${contractNo}", 顧客名="${customerName}"`)
}
