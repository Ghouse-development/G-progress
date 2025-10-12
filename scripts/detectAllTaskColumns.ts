import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log('🔍 CSVから全てのタスク列を検出します...\n')

// データ行（行100）を見て、日付らしいデータがある列を検出
const firstDataRow = rows[100] || []

// 日付フォーマットを検出する正規表現
const datePattern = /^\d{1,2}\/\d{1,2}$|^\d{4}\/\d{1,2}\/\d{1,2}$/

const taskColumns: Array<{ col: number; sampleDate: string }> = []

// 列14以降をチェック（最初の14列は基本情報）
for (let col = 14; col < firstDataRow.length; col++) {
  const cell = firstDataRow[col]?.trim() || ''

  if (datePattern.test(cell)) {
    taskColumns.push({
      col: col,
      sampleDate: cell
    })
  }
}

console.log(`✅ ${taskColumns.length}個の日付列を検出しました\n`)

// CSVファイルの行13-75からヘッダー情報を取得
console.log('📝 各列のヘッダー情報を取得中...\n')

const taskColumnsWithNames = taskColumns.map(tc => {
  // この列のヘッダーテキストを集める
  const headerTexts: string[] = []

  for (let row = 13; row < 76; row++) {
    const cell = rows[row]?.[tc.col]?.trim()
    if (cell && cell !== '' && cell !== '予定' && cell !== '実績' && cell !== '確定' && cell !== '手入力') {
      if (!headerTexts.includes(cell)) {
        headerTexts.push(cell)
      }
    }
  }

  return {
    col: tc.col,
    name: headerTexts.join(' / ') || `列${tc.col}`,
    sampleDate: tc.sampleDate
  }
})

// 最初の30件を表示
console.log('最初の30件のタスク列:\n')
taskColumnsWithNames.slice(0, 30).forEach((task, index) => {
  console.log(`${index + 1}. 列${task.col}: ${task.name} (例: ${task.sampleDate})`)
})

if (taskColumnsWithNames.length > 30) {
  console.log(`\n... 他${taskColumnsWithNames.length - 30}件`)
}

// JSONファイルに保存
writeFileSync('csv-all-task-columns.json', JSON.stringify(taskColumnsWithNames, null, 2))
console.log('\n✅ 全タスク列情報をcsv-all-task-columns.jsonに保存しました')
console.log(`✅ 合計: ${taskColumnsWithNames.length}個のタスク列`)
