import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function analyzeCSVTaskColumns() {
  console.log('📊 CSVタスク列解析を開始します...\n')

  const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n')

  // ヘッダー行を結合（最初の101行）
  const headerLines = lines.slice(0, 101)

  // 最初の行から列数を取得
  const firstLine = lines[0]
  const columns = firstLine.split(',')

  console.log(`📄 総列数: ${columns.length}\n`)

  // 各列のヘッダー情報を収集
  const columnHeaders: string[][] = []

  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    const columnTexts: string[] = []

    for (let rowIndex = 0; rowIndex < 101; rowIndex++) {
      const line = lines[rowIndex]
      if (line) {
        const cols = line.split(',')
        const text = cols[colIndex]?.trim()
        if (text) {
          columnTexts.push(text)
        }
      }
    }

    columnHeaders.push(columnTexts)
  }

  // タスク列を識別（列18以降がタスク列の可能性が高い）
  console.log('=' .repeat(100))
  console.log('タスク列の解析')
  console.log('=' .repeat(100))

  const taskColumns: Array<{
    index: number
    name: string
    type: string
    fullHeader: string[]
  }> = []

  // 列18以降を確認
  for (let i = 18; i < columnHeaders.length; i++) {
    const header = columnHeaders[i]
    const fullText = header.join(' ')

    // タスク名を推定
    let taskName = ''
    let taskType = ''

    // ヘッダーテキストから情報を抽出
    if (fullText.includes('予定手入力') || fullText.includes('予定日')) {
      taskType = '予定'
    } else if (fullText.includes('確定')) {
      taskType = '確定'
    } else if (fullText.includes('実績')) {
      taskType = '実績'
    }

    // タスク名を推定（最初の有効なテキスト）
    for (const text of header) {
      if (text && !text.includes('予定') && !text.includes('確定') && !text.includes('実績')) {
        taskName = text
        break
      }
    }

    if (taskName || taskType) {
      taskColumns.push({
        index: i,
        name: taskName,
        type: taskType,
        fullHeader: header
      })
    }
  }

  console.log(`\n✅ 検出されたタスク列数: ${taskColumns.length}\n`)

  // 列インデックス順に表示
  taskColumns.forEach((col, idx) => {
    console.log(`\n${idx + 1}. 列${col.index}: ${col.name || '(名前なし)'} [${col.type || '(タイプ不明)'}]`)
    console.log(`   ヘッダー詳細: ${col.fullHeader.slice(0, 5).join(' | ')}`)
  })

  // 最初の20列を詳しく表示
  console.log('\n\n' + '=' .repeat(100))
  console.log('最初の20列の詳細')
  console.log('=' .repeat(100))

  for (let i = 0; i < Math.min(20, columnHeaders.length); i++) {
    console.log(`\n列${i}: ${columnHeaders[i].slice(0, 10).join(' | ')}`)
  }

  // JSON出力
  const outputPath = path.join(__dirname, '../csv-task-columns-detailed.json')
  const output = {
    totalColumns: columns.length,
    taskColumns: taskColumns,
    allColumnHeaders: columnHeaders.slice(0, 50).map((h, i) => ({
      index: i,
      texts: h.slice(0, 10)
    }))
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\n\n📄 詳細情報を保存: ${outputPath}`)
}

analyzeCSVTaskColumns()
