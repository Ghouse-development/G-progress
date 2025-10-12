import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: false  // 空行もスキップしない
})

const rows = parsed.data as string[][]

console.log(`総行数: ${rows.length}`)
console.log('\n=== ヘッダー行の解析 ===\n')

// 最初の数行を見てヘッダー構造を理解する
const headerRows = rows.slice(0, 105) // 行105までがヘッダー

// 列ごとにヘッダーテキストを結合
const columnHeaders: string[] = []

for (let col = 0; col < 200; col++) {
  const headerParts: string[] = []

  for (let row = 0; row < 104; row++) {
    const cell = rows[row]?.[col]?.trim()
    if (cell && cell !== '' && cell !== '予定' && cell !== '実績' && cell !== '確定') {
      headerParts.push(cell)
    }
  }

  const headerText = headerParts.join(' ').trim()
  if (headerText) {
    columnHeaders[col] = headerText
  }
}

// タスク列を検出（日付っぽい列）
const taskColumns: Array<{ col: number; name: string; isPlan: boolean }> = []

// 行104の「予定」「実績」マーカーを確認
const row104 = rows[103] || []

for (let col = 14; col < 150; col++) {
  const marker = row104[col]?.trim()
  const headerText = columnHeaders[col] || `列${col}`

  if (marker === '予定' || marker === '予定手入力') {
    taskColumns.push({
      col: col,
      name: headerText,
      isPlan: true
    })
  }
}

console.log(`\n発見したタスク列（予定）: ${taskColumns.length}件\n`)

// 最初の50件を表示
taskColumns.slice(0, 50).forEach((task, index) => {
  console.log(`${index + 1}. 列${task.col}: ${task.name}`)
})

if (taskColumns.length > 50) {
  console.log(`\n... 他${taskColumns.length - 50}件`)
}

// JSONファイルに保存
const output = {
  totalColumns: taskColumns.length,
  tasks: taskColumns
}

writeFileSync('csv-task-columns.json', JSON.stringify(output, null, 2))
console.log('\n✅ タスク列情報をcsv-task-columns.jsonに保存しました')
