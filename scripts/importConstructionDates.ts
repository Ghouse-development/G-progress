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
  constructionStartPlanned: string
  constructionStartActual: string
  lineNumber: number
}

function parseCSVDate(dateStr: string): string | null {
  if (!dateStr) return null

  const parts = dateStr.split('/')

  if (parts.length === 2) {
    // MM/DD形式 → 2024年と仮定
    return `2024-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
  } else if (parts.length === 3) {
    // YYYY/M/D または M/D/YYYY 形式
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    } else {
      return `2024-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    }
  }

  return null
}

async function importConstructionDates() {
  console.log('🏗️  着工日インポートを開始します...\n')
  console.log('=' .repeat(100))

  // Read CSV file
  const csvPath = path.join(__dirname, '../sankoushiryou/●進捗管理表_オペレーション会議　村上さん用 (2).csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n')

  // Parse CSV rows
  const csvRows: CSVRow[] = []
  lines.forEach((line, index) => {
    if (index < 101) return // Skip header rows

    const columns = line.split(',')
    const contractNumber = columns[0]?.trim()

    if (contractNumber && /^\d{6}$/.test(contractNumber)) {
      csvRows.push({
        contractNumber,
        customerName: columns[1]?.trim() || '',
        constructionStartPlanned: columns[16]?.trim() || '',
        constructionStartActual: columns[17]?.trim() || '',
        lineNumber: index + 1
      })
    }
  })

  console.log(`📊 CSV着工日データ: ${csvRows.length}件\n`)

  // Get all projects from database
  const { data: allProjects, error: projectError } = await supabase
    .from('projects')
    .select('id, contract_number, construction_start_date, customer:customers(names)')
    .order('contract_number')

  if (projectError) {
    console.error('❌ データベースエラー:', projectError)
    return
  }

  console.log(`💾 データベース案件数: ${allProjects?.length || 0}\n`)
  console.log('=' .repeat(100))
  console.log('着工日インポート処理\n')
  console.log('=' .repeat(100))

  let updatedCount = 0
  let skippedCount = 0
  let errorCount = 0
  let noDateCount = 0

  for (const csvRow of csvRows) {
    const csvConstructionDate = csvRow.constructionStartActual || csvRow.constructionStartPlanned

    if (!csvConstructionDate) {
      noDateCount++
      continue
    }

    const formattedDate = parseCSVDate(csvConstructionDate)

    if (!formattedDate) {
      console.log(`⚠️  契約番号 ${csvRow.contractNumber}: 日付解析失敗 "${csvConstructionDate}"`)
      errorCount++
      continue
    }

    // Find matching projects in database
    const matchingProjects = allProjects?.filter(p => p.contract_number === csvRow.contractNumber)

    if (!matchingProjects || matchingProjects.length === 0) {
      console.log(`⚠️  契約番号 ${csvRow.contractNumber}: データベースに見つかりません`)
      errorCount++
      continue
    }

    // Handle duplicates
    if (matchingProjects.length > 1) {
      console.log(`\n⚠️  契約番号 ${csvRow.contractNumber}: 重複検出 (${matchingProjects.length}件)`)
      console.log(`   CSV顧客名: ${csvRow.customerName}`)
      console.log(`   CSV着工日: ${formattedDate}`)

      // Try to match by customer name (normalized)
      const csvCustomerNormalized = csvRow.customerName.replace(/\s/g, '').replace(/　/g, '')
      let matchedProject = null

      for (const project of matchingProjects) {
        const dbCustomerName = project.customer?.names?.join('') || ''
        const dbCustomerNormalized = dbCustomerName.replace(/・/g, '').replace(/\s/g, '')

        console.log(`   DB候補: ${dbCustomerName}`)

        if (csvCustomerNormalized.includes(dbCustomerNormalized) ||
            dbCustomerNormalized.includes(csvCustomerNormalized)) {
          matchedProject = project
          console.log(`   ✅ 顧客名でマッチング成功`)
          break
        }
      }

      if (!matchedProject) {
        console.log(`   ❌ 顧客名マッチング失敗 - スキップします`)
        skippedCount++
        continue
      }

      // Update the matched project
      const { error: updateError } = await supabase
        .from('projects')
        .update({ construction_start_date: formattedDate })
        .eq('id', matchedProject.id)

      if (updateError) {
        console.log(`   ❌ 更新エラー: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`   ✅ 着工日更新成功 (ID: ${matchedProject.id})`)
        updatedCount++
      }
    } else {
      // Single match - straightforward update
      const project = matchingProjects[0]

      // Check if already has construction_start_date
      if (project.construction_start_date) {
        if (project.construction_start_date === formattedDate) {
          // Already correct, skip
          continue
        } else {
          console.log(`\n📝 契約番号 ${csvRow.contractNumber}: 着工日を更新`)
          console.log(`   現在: ${project.construction_start_date}`)
          console.log(`   新規: ${formattedDate}`)
        }
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({ construction_start_date: formattedDate })
        .eq('id', project.id)

      if (updateError) {
        console.log(`   ❌ 更新エラー: ${updateError.message}`)
        errorCount++
      } else {
        updatedCount++
      }
    }
  }

  console.log('\n' + '=' .repeat(100))
  console.log('📊 インポート結果サマリー')
  console.log('=' .repeat(100))
  console.log(`✅ 更新成功: ${updatedCount}件`)
  console.log(`⏭️  スキップ（重複解決不可）: ${skippedCount}件`)
  console.log(`❌ エラー: ${errorCount}件`)
  console.log(`ℹ️  着工日なし: ${noDateCount}件`)
  console.log(`📄 総処理レコード: ${csvRows.length}件\n`)
  console.log('=' .repeat(100))
}

importConstructionDates().catch(console.error)
