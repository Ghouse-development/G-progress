import * as fs from 'fs'
import Papa from 'papaparse'

const csvPath = 'sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv'
const csvData = fs.readFileSync(csvPath, 'utf-8')

const parsed = Papa.parse(csvData, {
  header: true,
  skipEmptyLines: true
})

const row = (parsed.data as any[])[0]
const headers = Object.keys(row)

console.log('=== 入金関連の列（詳細） ===\n')

// 申込金周辺（列155-159）
console.log('【申込金】')
for (let i = 155; i <= 160; i++) {
  const header = headers[i]
  console.log(`列 ${i}: ${header}`)
  if (row[header]) {
    console.log(`  値: ${row[header]}`)
  }
}

console.log('\n【契約金】')
for (let i = 157; i <= 163; i++) {
  const header = headers[i]
  console.log(`列 ${i}: ${header}`)
  if (row[header]) {
    console.log(`  値: ${row[header]}`)
  }
}

console.log('\n【着工金】')
for (let i = 161; i <= 167; i++) {
  const header = headers[i]
  console.log(`列 ${i}: ${header}`)
  if (row[header]) {
    console.log(`  値: ${row[header]}`)
  }
}

console.log('\n【上棟金】')
for (let i = 168; i <= 174; i++) {
  const header = headers[i]
  console.log(`列 ${i}: ${header}`)
  if (row[header]) {
    console.log(`  値: ${row[header]}`)
  }
}

console.log('\n【最終金】')
for (let i = 175; i <= 181; i++) {
  const header = headers[i]
  console.log(`列 ${i}: ${header}`)
  if (row[header]) {
    console.log(`  値: ${row[header]}`)
  }
}
