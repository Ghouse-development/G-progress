import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'

const csvPath = 'c:\\Users\\nishino\\Downloads\\●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log('📝 CSVから全てのタスク列を抽出します（実績を除く）...\n')

// 行0からタスク名を取得
const headerRow = rows[0] || []
const markerRow = rows[1] || [] // 予定/実績のマーカー行

// データ行（行100）から日付列を検出
const firstDataRow = rows[100] || []
const datePattern = /^\d{1,2}\/\d{1,2}$|^\d{4}\/\d{1,2}\/\d{1,2}$/

const taskColumns: Array<{ col: number; name: string; marker: string; sampleDate: string }> = []

// 列14以降をチェック
for (let col = 14; col < firstDataRow.length; col++) {
  const cell = firstDataRow[col]?.trim() || ''
  const marker = markerRow[col]?.trim() || ''
  const taskName = headerRow[col]?.trim() || ''

  // 日付データがあり、かつ「実績」ではない列を対象にする
  if (datePattern.test(cell) && !marker.includes('実績')) {
    // タスク名がない場合は、近くの列からタスク名を探す
    let finalTaskName = taskName

    if (!finalTaskName || finalTaskName === '') {
      // 左側の列からタスク名を探す（最大10列）
      for (let i = 1; i <= 10; i++) {
        const nearbyName = headerRow[col - i]?.trim()
        if (nearbyName && nearbyName !== '') {
          finalTaskName = `${nearbyName}（${marker || '列' + col}）`
          break
        }
      }
    }

    // それでもタスク名が見つからない場合
    if (!finalTaskName || finalTaskName === '') {
      finalTaskName = `タスク-列${col}（${marker || '不明'}）`
    }

    taskColumns.push({
      col: col,
      name: finalTaskName,
      marker: marker,
      sampleDate: cell
    })

    console.log(`列${col}: ${finalTaskName} [${marker}] (例: ${cell})`)
  }
}

console.log(`\n✅ ${taskColumns.length}個のタスク列を検出しました`)

// JSONファイルに保存
writeFileSync('csv-all-tasks-complete.json', JSON.stringify(taskColumns, null, 2))
console.log('✅ csv-all-tasks-complete.jsonに保存しました')
