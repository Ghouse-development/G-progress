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

const headers = records[0]

// サンプルデータ行を取得
let sampleRow: string[] = []
for (let i = 1; i < records.length; i++) {
  const contractNumber = records[i][0]?.trim()
  if (contractNumber && /^\d{6}$/.test(contractNumber)) {
    sampleRow = records[i]
    break
  }
}

interface TaskDefinition {
  name: string
  plannedCol?: number
  plannedInputCol?: number
  confirmedCol?: number
  actualCol?: number
  department: string
}

const taskDefinitions: TaskDefinition[] = []

// 既知のタスク列パターンを定義
// 列名 -> 部署のマッピング
const columnToDepartment: { [key: string]: string } = {
  '請負契約': '営業',
  '設計ヒアリング': '意匠設計',
  'プラン': '意匠設計',
  '構造': '構造設計',
  '申請': '申請設計',
  'IC': 'IC',
  '最終打合': 'IC',
  '図面': '実施設計',
  '着工': '工事',
  '上棟': '工事',
  '検査': '工事',
  '引渡': '工事',
  '解体': '工事',
  '金': '営業事務',
  '契約': '営業',
  '土地': '営業',
  '水道': '工事',
  '基礎': '工事',
  '外構': '外構工事',
  'ローン': 'ローン事務',
  '補助金': '営業事務'
}

function getDepartmentFromColumnName(columnName: string): string {
  for (const [key, dept] of Object.entries(columnToDepartment)) {
    if (columnName.includes(key)) {
      return dept
    }
  }
  return 'その他'
}

// タスク列を検出して定義を生成
for (let i = 14; i < headers.length; i++) {
  const columnName = headers[i]?.replace(/\n/g, '').replace(/\s+/g, '').trim()
  if (!columnName || columnName.length === 0) continue

  const sampleValue = sampleRow[i]?.trim() || ''

  // 日付パターンをチェック（MM/DD または YYYY/MM/DD）
  const isDateColumn = /^\d{1,2}\/\d{1,2}$/.test(sampleValue) ||
                       /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(sampleValue)

  // 金額パターンをチェック
  const isAmountColumn = sampleValue.includes('¥') || sampleValue.includes('円')

  // タスク名候補（日付データを持つ列の前の列、または日付を含む列名）
  if (columnName.includes('日') || columnName.includes('予定') ||
      columnName.includes('実績') || columnName.includes('確定') ||
      columnName.includes('契約') || columnName.includes('GO') ||
      columnName.includes('CB') || columnName.includes('検査') ||
      columnName.includes('着工') || columnName.includes('引渡') ||
      columnName.includes('上棟') || columnName.includes('IC') ||
      columnName.includes('打合') || columnName.includes('申請') ||
      columnName.includes('解体') || columnName.includes('工事')) {

    // 既存のタスク定義に同名のものがあるかチェック
    const existingTask = taskDefinitions.find(t => t.name === columnName)

    if (!existingTask && !isAmountColumn) {
      const dept = getDepartmentFromColumnName(columnName)

      // 次の1-3列が日付列かチェック
      const nextCols = [i + 1, i + 2, i + 3]
      const dateCols: number[] = []

      for (const col of nextCols) {
        if (col < headers.length) {
          const nextSample = sampleRow[col]?.trim() || ''
          if (/^\d{1,2}\/\d{1,2}$/.test(nextSample) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(nextSample)) {
            dateCols.push(col)
          }
        }
      }

      // タスク定義を作成
      if (dateCols.length > 0 || isDateColumn) {
        const taskDef: TaskDefinition = {
          name: columnName,
          department: dept
        }

        if (isDateColumn) {
          taskDef.plannedCol = i
          if (dateCols.length > 0) {
            taskDef.actualCol = dateCols[0]
          }
        } else if (dateCols.length === 1) {
          taskDef.plannedCol = i
          taskDef.actualCol = dateCols[0]
        } else if (dateCols.length === 2) {
          taskDef.plannedInputCol = i
          taskDef.confirmedCol = dateCols[0]
          taskDef.actualCol = dateCols[1]
        } else if (dateCols.length >= 3) {
          taskDef.plannedInputCol = i
          taskDef.confirmedCol = dateCols[0]
          taskDef.actualCol = dateCols[1]
        }

        taskDefinitions.push(taskDef)
      }
    }
  }
}

console.log('=' .repeat(100))
console.log(`生成されたタスク定義: ${taskDefinitions.length}個`)
console.log('=' .repeat(100))
console.log()

// 最初の30個を表示
for (let i = 0; i < Math.min(30, taskDefinitions.length); i++) {
  const task = taskDefinitions[i]
  console.log(`${i + 1}. ${task.name} (${task.department})`)
  console.log(`   plannedCol: ${task.plannedCol}, plannedInputCol: ${task.plannedInputCol}`)
  console.log(`   confirmedCol: ${task.confirmedCol}, actualCol: ${task.actualCol}`)
  console.log()
}

// TypeScript定義を生成
let tsCode = `// 自動生成されたタスク定義（${taskDefinitions.length}個）\n`
tsCode += `const TASK_DEFINITIONS = [\n`

for (const task of taskDefinitions) {
  tsCode += `  { name: '${task.name}', `
  if (task.plannedCol !== undefined) tsCode += `plannedCol: ${task.plannedCol}, `
  if (task.plannedInputCol !== undefined) tsCode += `plannedInputCol: ${task.plannedInputCol}, `
  if (task.confirmedCol !== undefined) tsCode += `confirmedCol: ${task.confirmedCol}, `
  if (task.actualCol !== undefined) tsCode += `actualCol: ${task.actualCol}, `
  tsCode += `department: '${task.department}' },\n`
}

tsCode += `]\n`

fs.writeFileSync(
  path.join(__dirname, '../generated-task-definitions.ts'),
  tsCode,
  'utf-8'
)

console.log('=' .repeat(100))
console.log('✅ TypeScript定義を generated-task-definitions.ts に保存しました')
