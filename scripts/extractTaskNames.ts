import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: false
})

const rows = parsed.data as string[][]

console.log('📝 CSVからタスク名を抽出します...\n')

// 行0からタスク名を取得
const headerRow = rows[0] || []
const markerRow = rows[1] || [] // 予定/実績のマーカー行

// データ行（行100）から日付列を検出
const firstDataRow = rows[100] || []
const datePattern = /^\d{1,2}\/\d{1,2}$|^\d{4}\/\d{1,2}\/\d{1,2}$/

const taskColumns: Array<{ col: number; name: string; sampleDate: string }> = []

// 列14以降をチェック
for (let col = 14; col < firstDataRow.length; col++) {
  const cell = firstDataRow[col]?.trim() || ''
  const marker = markerRow[col]?.trim() || ''

  // 予定列のみを対象にする（実績は除外）
  if (datePattern.test(cell) && (marker === '予定' || marker === '予定\n手入力' || marker === '予定手入力')) {
    const taskName = headerRow[col]?.trim() || `タスク-列${col}`

    taskColumns.push({
      col: col,
      name: taskName || `タスク-列${col}`,
      sampleDate: cell
    })

    console.log(`列${col}: ${taskName} (例: ${cell})`)
  }
}

console.log(`\n✅ ${taskColumns.length}個のタスク列を検出しました`)

// JSONファイルに保存
writeFileSync('csv-task-columns-with-names.json', JSON.stringify(taskColumns, null, 2))
console.log('✅ csv-task-columns-with-names.jsonに保存しました')
