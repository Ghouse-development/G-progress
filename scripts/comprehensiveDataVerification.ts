import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface CSVRow {
  contractNumber: string
  customerName: string
  contractDatePlanned: string
  contractDateActual: string
  constructionStartPlanned: string
  constructionStartActual: string
  lineNumber: number
}

interface Mismatch {
  type: string
  contractNumber: string
  csvCustomer: string
  dbCustomer: string
  csvValue: string
  dbValue: string
  lineNumber: number
}

async function comprehensiveVerification() {
  console.log('🔍 包括的データ検証を開始します...\n')
  console.log('=' .repeat(120))

  // Step 1: Check for duplicate contract numbers in database
  console.log('\n📋 ステップ1: データベース内の重複契約番号チェック\n')

  const { data: allProjects, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_number, customer:customers(names)')
    .order('contract_number')

  if (projectError) {
    console.error('❌ データベースエラー:', projectError)
    return
  }

  // Find duplicates
  const contractNumberCounts = new Map<string, number>()
  const duplicates: any[] = []

  allProjects?.forEach(project => {
    if (project.contract_number) {
      const count = contractNumberCounts.get(project.contract_number) || 0
      contractNumberCounts.set(project.contract_number, count + 1)
    }
  })

  contractNumberCounts.forEach((count, contractNumber) => {
    if (count > 1) {
      const dupes = allProjects?.filter(p => p.contract_number === contractNumber)
      duplicates.push({ contractNumber, count, projects: dupes })
    }
  })

  if (duplicates.length > 0) {
    console.log(`⚠️  データベース内に ${duplicates.length} 件の重複契約番号が見つかりました：\n`)
    duplicates.forEach(dup => {
      console.log(`   契約番号: ${dup.contractNumber} (${dup.count}件)`)
      dup.projects.forEach((p: any, index: number) => {
        console.log(`      ${index + 1}. ID: ${p.id}, 顧客: ${p.customer?.names?.join('・') || 'N/A'}`)
      })
      console.log()
    })
  } else {
    console.log('✅ データベース内に重複契約番号はありません\n')
  }

  // Step 2: Read CSV and verify all records
  console.log('=' .repeat(120))
  console.log('\n📋 ステップ2: CSV全レコードの詳細検証\n')

  const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n')

  console.log(`📄 CSV総行数: ${lines.length}`)
  console.log(`🔍 データ開始行: 102行目から\n`)

  // Parse all CSV rows with 6-digit contract numbers
  const csvRows: CSVRow[] = []
  lines.forEach((line, index) => {
    if (index < 101) return // Skip header rows

    const columns = line.split(',')
    const contractNumber = columns[0]?.trim()

    if (contractNumber && /^\d{6}$/.test(contractNumber)) {
      csvRows.push({
        contractNumber,
        customerName: columns[1]?.trim() || '',
        contractDatePlanned: columns[14]?.trim() || '',
        contractDateActual: columns[15]?.trim() || '',
        constructionStartPlanned: columns[16]?.trim() || '',
        constructionStartActual: columns[17]?.trim() || '',
        lineNumber: index + 1
      })
    }
  })

  console.log(`📊 有効なCSVレコード数: ${csvRows.length}\n`)

  // Step 3: Check for duplicate contract numbers in CSV
  console.log('=' .repeat(120))
  console.log('\n📋 ステップ3: CSV内の重複契約番号チェック\n')

  const csvContractNumberCounts = new Map<string, number>()
  const csvDuplicates: any[] = []

  csvRows.forEach(row => {
    const count = csvContractNumberCounts.get(row.contractNumber) || 0
    csvContractNumberCounts.set(row.contractNumber, count + 1)
  })

  csvContractNumberCounts.forEach((count, contractNumber) => {
    if (count > 1) {
      const dupes = csvRows.filter(r => r.contractNumber === contractNumber)
      csvDuplicates.push({ contractNumber, count, rows: dupes })
    }
  })

  if (csvDuplicates.length > 0) {
    console.log(`⚠️  CSV内に ${csvDuplicates.length} 件の重複契約番号が見つかりました：\n`)
    csvDuplicates.forEach(dup => {
      console.log(`   契約番号: ${dup.contractNumber} (${dup.count}件)`)
      dup.rows.forEach((r: CSVRow, index: number) => {
        console.log(`      ${index + 1}. 行番号: ${r.lineNumber}, 顧客: ${r.customerName}`)
      })
      console.log()
    })
  } else {
    console.log('✅ CSV内に重複契約番号はありません\n')
  }

  // Step 4: Detailed record-by-record verification
  console.log('=' .repeat(120))
  console.log('\n📋 ステップ4: 全レコード詳細照合（契約日・着工日）\n')

  const mismatches: Mismatch[] = []
  let perfectMatches = 0
  let notFoundInDB = 0

  for (const csvRow of csvRows) {
    // Find in database (if duplicates exist, use first match)
    const dbProjects = allProjects?.filter(p => p.contract_number === csvRow.contractNumber)

    if (!dbProjects || dbProjects.length === 0) {
      notFoundInDB++
      mismatches.push({
        type: 'DB未登録',
        contractNumber: csvRow.contractNumber,
        csvCustomer: csvRow.customerName,
        dbCustomer: 'N/A',
        csvValue: 'N/A',
        dbValue: 'N/A',
        lineNumber: csvRow.lineNumber
      })
      continue
    }

    const dbProject = dbProjects[0]

    // Get additional data for the project
    const { data: projectData } = await supabase
      .from('projects')
      .select('contract_date, construction_start_date')
      .eq('id', dbProject.id)
      .single()

    // Check contract date
    const csvContractDate = csvRow.contractDateActual || csvRow.contractDatePlanned
    const dbContractDate = projectData?.contract_date

    if (csvContractDate || dbContractDate) {
      let csvDateFormatted = ''
      if (csvContractDate) {
        const parts = csvContractDate.split('/')
        if (parts.length === 2) {
          csvDateFormatted = `2024-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
        } else if (parts.length === 3) {
          if (parts[0].length === 4) {
            csvDateFormatted = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
          } else {
            csvDateFormatted = `2024-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
          }
        }
      }

      if (csvDateFormatted !== dbContractDate) {
        mismatches.push({
          type: '契約日不一致',
          contractNumber: csvRow.contractNumber,
          csvCustomer: csvRow.customerName,
          dbCustomer: dbProject.customer?.names?.join('・') || 'N/A',
          csvValue: csvDateFormatted || '(なし)',
          dbValue: dbContractDate || '(なし)',
          lineNumber: csvRow.lineNumber
        })
      }
    }

    // Check construction start date
    const csvConstructionDate = csvRow.constructionStartActual || csvRow.constructionStartPlanned
    const dbConstructionDate = projectData?.construction_start_date

    if (csvConstructionDate || dbConstructionDate) {
      let csvConstrFormatted = ''
      if (csvConstructionDate) {
        const parts = csvConstructionDate.split('/')
        if (parts.length === 2) {
          csvConstrFormatted = `2024-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
        } else if (parts.length === 3) {
          if (parts[0].length === 4) {
            csvConstrFormatted = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
          } else {
            csvConstrFormatted = `2024-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
          }
        }
      }

      if (csvConstrFormatted !== dbConstructionDate) {
        mismatches.push({
          type: '着工日不一致',
          contractNumber: csvRow.contractNumber,
          csvCustomer: csvRow.customerName,
          dbCustomer: dbProject.customer?.names?.join('・') || 'N/A',
          csvValue: csvConstrFormatted || '(なし)',
          dbValue: dbConstructionDate || '(なし)',
          lineNumber: csvRow.lineNumber
        })
      }
    }

    // Check customer name
    const dbCustomerName = dbProject.customer?.names?.join('・') || ''
    if (csvRow.customerName && dbCustomerName && csvRow.customerName !== dbCustomerName) {
      // Normalize for comparison (remove spaces)
      const csvNormalized = csvRow.customerName.replace(/\s/g, '')
      const dbNormalized = dbCustomerName.replace(/\s/g, '')

      if (csvNormalized !== dbNormalized) {
        mismatches.push({
          type: '顧客名不一致',
          contractNumber: csvRow.contractNumber,
          csvCustomer: csvRow.customerName,
          dbCustomer: dbCustomerName,
          csvValue: csvRow.customerName,
          dbValue: dbCustomerName,
          lineNumber: csvRow.lineNumber
        })
      }
    }
  }

  perfectMatches = csvRows.length - mismatches.length - notFoundInDB

  // Step 5: Generate detailed report
  console.log('=' .repeat(120))
  console.log('\n📊 最終検証結果サマリー\n')
  console.log('=' .repeat(120))
  console.log(`\n総CSV レコード数: ${csvRows.length}`)
  console.log(`✅ 完全一致: ${perfectMatches}件 (${((perfectMatches / csvRows.length) * 100).toFixed(1)}%)`)
  console.log(`⚠️  不一致検出: ${mismatches.length - notFoundInDB}件`)
  console.log(`❌ DB未登録: ${notFoundInDB}件`)
  console.log()

  // Categorize mismatches
  const mismatchTypes = new Map<string, number>()
  mismatches.forEach(m => {
    mismatchTypes.set(m.type, (mismatchTypes.get(m.type) || 0) + 1)
  })

  console.log('不一致の内訳：')
  mismatchTypes.forEach((count, type) => {
    console.log(`   ${type}: ${count}件`)
  })
  console.log()

  if (mismatches.length > 0) {
    console.log('=' .repeat(120))
    console.log('\n📋 詳細不一致リスト\n')
    console.log('=' .repeat(120))

    mismatches.forEach((mismatch, index) => {
      console.log(`\n${index + 1}. ${mismatch.type}`)
      console.log(`   契約番号: ${mismatch.contractNumber} (CSV行: ${mismatch.lineNumber})`)
      console.log(`   CSV顧客名: ${mismatch.csvCustomer}`)
      console.log(`   DB顧客名: ${mismatch.dbCustomer}`)
      console.log(`   CSV値: ${mismatch.csvValue}`)
      console.log(`   DB値: ${mismatch.dbValue}`)
    })
  }

  // Write detailed report to file
  const reportPath = path.join(__dirname, '../verification_report.txt')
  let reportContent = '包括的データ検証レポート\n'
  reportContent += '生成日時: ' + new Date().toLocaleString('ja-JP') + '\n'
  reportContent += '='.repeat(120) + '\n\n'

  reportContent += `総CSVレコード数: ${csvRows.length}\n`
  reportContent += `完全一致: ${perfectMatches}件 (${((perfectMatches / csvRows.length) * 100).toFixed(1)}%)\n`
  reportContent += `不一致検出: ${mismatches.length - notFoundInDB}件\n`
  reportContent += `DB未登録: ${notFoundInDB}件\n\n`

  reportContent += 'データベース重複契約番号:\n'
  if (duplicates.length > 0) {
    duplicates.forEach(dup => {
      reportContent += `  契約番号: ${dup.contractNumber} (${dup.count}件)\n`
      dup.projects.forEach((p: any, i: number) => {
        reportContent += `    ${i + 1}. ID: ${p.id}, 顧客: ${p.customer?.names?.join('・') || 'N/A'}\n`
      })
    })
  } else {
    reportContent += '  なし\n'
  }
  reportContent += '\n'

  reportContent += 'CSV重複契約番号:\n'
  if (csvDuplicates.length > 0) {
    csvDuplicates.forEach(dup => {
      reportContent += `  契約番号: ${dup.contractNumber} (${dup.count}件)\n`
      dup.rows.forEach((r: CSVRow, i: number) => {
        reportContent += `    ${i + 1}. 行: ${r.lineNumber}, 顧客: ${r.customerName}\n`
      })
    })
  } else {
    reportContent += '  なし\n'
  }
  reportContent += '\n'

  reportContent += '詳細不一致リスト:\n'
  reportContent += '='.repeat(120) + '\n'
  mismatches.forEach((m, i) => {
    reportContent += `\n${i + 1}. ${m.type}\n`
    reportContent += `   契約番号: ${m.contractNumber} (CSV行: ${m.lineNumber})\n`
    reportContent += `   CSV顧客名: ${m.csvCustomer}\n`
    reportContent += `   DB顧客名: ${m.dbCustomer}\n`
    reportContent += `   CSV値: ${m.csvValue}\n`
    reportContent += `   DB値: ${m.dbValue}\n`
  })

  fs.writeFileSync(reportPath, reportContent, 'utf-8')

  console.log('\n\n' + '='.repeat(120))
  console.log(`\n📄 詳細レポートを保存しました: ${reportPath}\n`)
  console.log('='.repeat(120))
}

comprehensiveVerification().catch(console.error)
