import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvPath = 'C:/claudecode/G-progress/sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvContent = readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvContent, {
  encoding: 'UTF-8',
  skipEmptyLines: true
})

const rows = parsed.data as string[][]

console.log('📊 CSVの日付データを分析します\n')

// 本田様のデータ（行102）を確認
const hondaRowIndex = rows.findIndex(row => row[1]?.includes('本田'))

if (hondaRowIndex === -1) {
  console.error('❌ 本田様のデータが見つかりません')
  process.exit(1)
}

const hondaRow = rows[hondaRowIndex]

console.log(`=== 本田様のデータ（行${hondaRowIndex}） ===`)
console.log(`顧客名: ${hondaRow[1]}`)
console.log(`契約番号: ${hondaRow[0]}`)
console.log(`契約日（列14）: ${hondaRow[14]}`)
console.log('')

// タスクの期限日を確認
const taskColumns = [
  { name: '請負契約', yoteiCol: 14, jissekiCol: 15 },
  { name: '設計ヒアリング', yoteiCol: 16, jissekiCol: 18 },
  { name: 'プラン確定', yoteiCol: 19, jissekiCol: 21 },
  { name: '構造GO', yoteiCol: 24, jissekiCol: 26 },
  { name: '申請GO', yoteiCol: 27, jissekiCol: 29 },
  { name: '構造1回目CB', yoteiCol: 30, jissekiCol: 32 },
  { name: '構造2回目CB', yoteiCol: 33, jissekiCol: 35 },
  { name: '最終打合', yoteiCol: 50, jissekiCol: 51 },
  { name: '構造図UP', yoteiCol: 62, jissekiCol: 63 },
  { name: '着工許可', yoteiCol: 65, jissekiCol: 66 },
  { name: 'フラット設計通知書', yoteiCol: 71, jissekiCol: 72 },
  { name: '建築確認済証', yoteiCol: 73, jissekiCol: 74 },
  { name: '中間検査合格証', yoteiCol: 76, jissekiCol: 77 },
  { name: '検査済証', yoteiCol: 81, jissekiCol: 82 },
  { name: '変更契約日', yoteiCol: 97, jissekiCol: 98 },
  { name: '分筆', yoteiCol: 104, jissekiCol: 105 },
  { name: '請負契約着工日', yoteiCol: 107, jissekiCol: 108 },
  { name: '上棟日', yoteiCol: 119, jissekiCol: 120 },
  { name: '完了検査', yoteiCol: 128, jissekiCol: -1 },
  { name: '完了検査（予定）', yoteiCol: 129, jissekiCol: 130 },
  { name: '引渡日', yoteiCol: 135, jissekiCol: 136 },
  { name: 'ローン本申込許可', yoteiCol: 151, jissekiCol: 152 },
  { name: '申込金', yoteiCol: 155, jissekiCol: 156 },
  { name: '契約金', yoteiCol: 158, jissekiCol: 159 },
  { name: '着工金', yoteiCol: 161, jissekiCol: -1 },
  { name: '着工金（支払）', yoteiCol: 162, jissekiCol: 163 },
  { name: '上棟金', yoteiCol: 168, jissekiCol: -1 },
  { name: '上棟金（支払）', yoteiCol: 169, jissekiCol: 170 },
  { name: '最終金', yoteiCol: 175, jissekiCol: -1 },
  { name: '最終金（支払）', yoteiCol: 176, jissekiCol: 177 }
]

console.log('=== タスクの期限日（予定） ===\n')

let taskCount = 0
taskColumns.forEach(task => {
  const yoteiDate = hondaRow[task.yoteiCol]
  const jissekiDate = task.jissekiCol >= 0 ? hondaRow[task.jissekiCol] : ''

  if (yoteiDate && yoteiDate.trim() !== '') {
    taskCount++
    console.log(`${taskCount}. ${task.name}`)
    console.log(`   列${task.yoteiCol}: 予定 = "${yoteiDate}"`)
    if (task.jissekiCol >= 0) {
      console.log(`   列${task.jissekiCol}: 実績 = "${jissekiDate}"`)
    }
    console.log('')
  }
})

console.log(`\n=== 合計 ${taskCount} 個のタスクに期限日が設定されています ===`)
