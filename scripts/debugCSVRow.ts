import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log('🔍 CSVの1行目（行100）の40タスク列を確認します...\n')

const testRow = rows[100]
const contractNo = testRow[0]

console.log(`契約番号: ${contractNo}`)
console.log(`お客様名: ${testRow[1]}`)
console.log(`\n40個のタスク列のデータ:\n`)

const milestones = [
  { name: 'タスク-列14', col: 14 },
  { name: 'タスク-列15', col: 15 },
  { name: 'タスク-列16', col: 16 },
  { name: 'タスク-列17', col: 17 },
  { name: 'タスク-列18', col: 18 },
  { name: 'タスク-列19', col: 19 },
  { name: 'タスク-列20', col: 20 },
  { name: 'タスク-列21', col: 21 },
  { name: 'タスク-列24', col: 24 },
  { name: 'タスク-列25', col: 25 },
  { name: 'タスク-列27', col: 27 },
  { name: 'タスク-列28', col: 28 },
  { name: 'タスク-列30', col: 30 },
  { name: 'タスク-列31', col: 31 },
  { name: 'タスク-列33', col: 33 },
  { name: 'タスク-列34', col: 34 },
  { name: 'タスク-列50', col: 50 },
  { name: 'タスク-列62', col: 62 },
  { name: 'タスク-列65', col: 65 },
  { name: 'タスク-列71', col: 71 },
  { name: 'タスク-列73', col: 73 },
  { name: 'タスク-列76', col: 76 },
  { name: 'タスク-列81', col: 81 },
  { name: 'タスク-列97', col: 97 },
  { name: 'タスク-列104', col: 104 },
  { name: 'タスク-列107', col: 107 },
  { name: 'タスク-列119', col: 119 },
  { name: 'タスク-列128', col: 128 },
  { name: 'タスク-列129', col: 129 },
  { name: 'タスク-列135', col: 135 },
  { name: 'タスク-列150', col: 150 },
  { name: 'タスク-列151', col: 151 },
  { name: 'タスク-列155', col: 155 },
  { name: 'タスク-列158', col: 158 },
  { name: 'タスク-列161', col: 161 },
  { name: 'タスク-列162', col: 162 },
  { name: 'タスク-列168', col: 168 },
  { name: 'タスク-列169', col: 169 },
  { name: 'タスク-列175', col: 175 },
  { name: 'タスク-列176', col: 176 }
]

let hasDataCount = 0
let emptyCount = 0

milestones.forEach((m, index) => {
  const cellValue = testRow[m.col]?.trim() || ''
  const status = cellValue ? '✅' : '⭕'

  if (cellValue) {
    hasDataCount++
    console.log(`${index + 1}. ${status} ${m.name}: "${cellValue}"`)
  } else {
    emptyCount++
  }
})

console.log(`\n=== サマリー ===`)
console.log(`データあり: ${hasDataCount}件`)
console.log(`データなし: ${emptyCount}件`)
console.log(`合計: ${milestones.length}件`)
