import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
const csvContent = fs.readFileSync(csvPath, 'utf-8')

const records = parse(csvContent, {
  skip_empty_lines: true,
  relax_column_count: true,
  trim: true
})

console.log('=' .repeat(100))
console.log('CSV全列解析（228列）')
console.log('=' .repeat(100))
console.log()

const headers = records[0]
console.log(`総列数: ${headers.length}\n`)

// タスク関連キーワード
const taskKeywords = [
  '予定', '実績', '確定', '完了', '日', '契約', '申請', '着工', '上棟',
  '引渡', '検査', 'GO', 'CB', '打合', 'IC', '図面', '金', '許可',
  '決済', '工事', '設計', 'ヒアリング', 'プラン'
]

interface ColumnInfo {
  index: number
  name: string
  isTaskRelated: boolean
  hasDateData: boolean
}

const columnInfo: ColumnInfo[] = []

// サンプルデータ行を取得（最初のデータ行）
let sampleRow: string[] = []
for (let i = 1; i < records.length; i++) {
  const contractNumber = records[i][0]?.trim()
  if (contractNumber && /^\d{6}$/.test(contractNumber)) {
    sampleRow = records[i]
    break
  }
}

// 各列を解析
for (let i = 0; i < headers.length; i++) {
  const columnName = headers[i]?.trim() || `列${i}`
  const sampleValue = sampleRow[i]?.trim() || ''

  // タスク関連かチェック
  const isTaskRelated = taskKeywords.some(keyword =>
    columnName.includes(keyword) || columnName.includes('日')
  )

  // 日付データがあるかチェック（MM/DD形式）
  const hasDateData = /^\d{1,2}\/\d{1,2}$/.test(sampleValue) ||
                      /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(sampleValue)

  columnInfo.push({
    index: i,
    name: columnName,
    isTaskRelated,
    hasDateData
  })
}

// タスク関連列のみを表示
console.log('タスク関連列（日付データを含む可能性のある列）:')
console.log('=' .repeat(100))

let taskCount = 0
for (const col of columnInfo) {
  if (col.isTaskRelated || col.hasDateData) {
    const sample = sampleRow[col.index]?.trim() || ''
    console.log(`列${col.index.toString().padStart(3)}: ${col.name}`)
    console.log(`     サンプル値: ${sample}`)
    console.log()
    taskCount++
  }
}

console.log('=' .repeat(100))
console.log(`タスク関連列数: ${taskCount}`)
console.log()

// 基本情報列
console.log('基本情報列:')
console.log('=' .repeat(100))
for (let i = 0; i < Math.min(20, headers.length); i++) {
  console.log(`列${i.toString().padStart(3)}: ${headers[i]}`)
}
console.log()

// 詳細な列情報をJSONで保存
fs.writeFileSync(
  path.join(__dirname, '../csv-columns-analysis.json'),
  JSON.stringify(columnInfo, null, 2),
  'utf-8'
)

console.log('✅ 詳細な列情報を csv-columns-analysis.json に保存しました')
