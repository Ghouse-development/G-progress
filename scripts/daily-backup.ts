/**
 * 毎日のバックアップスクリプト
 *
 * 実行方法:
 * npx tsx scripts/daily-backup.ts
 *
 * Cron設定 (毎日午前2時):
 * 0 2 * * * cd /path/to/G-progress && npx tsx scripts/daily-backup.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { format } from 'date-fns'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// バックアップ対象テーブル
const TABLES = [
  'employees',
  'customers',
  'projects',
  'tasks',
  'payments',
  'vendors',
  'notifications',
  'audit_logs',
  'fiscal_years',
  'branches',
  'products',
  'organizations',
  'task_masters'
]

/**
 * 全テーブルのバックアップを実行
 */
async function backupAllTables() {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
  const backupDir = path.join(process.cwd(), 'backups', timestamp)

  // バックアップディレクトリ作成
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  console.log(`🔄 バックアップ開始: ${timestamp}`)
  console.log(`📁 保存先: ${backupDir}`)

  const results = []

  for (const table of TABLES) {
    try {
      console.log(`  ⏳ ${table} をバックアップ中...`)

      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })

      if (error) {
        console.error(`  ❌ ${table} のバックアップ失敗:`, error.message)
        results.push({ table, status: 'failed', error: error.message, count: 0 })
        continue
      }

      // JSONファイルに保存
      const filePath = path.join(backupDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')

      console.log(`  ✅ ${table} 完了 (${count}件)`)
      results.push({ table, status: 'success', count: count || 0 })

    } catch (err: any) {
      console.error(`  ❌ ${table} のバックアップ中にエラー:`, err.message)
      results.push({ table, status: 'failed', error: err.message, count: 0 })
    }
  }

  // サマリーファイル作成
  const summary = {
    timestamp,
    tables: results,
    totalTables: TABLES.length,
    successCount: results.filter(r => r.status === 'success').length,
    failedCount: results.filter(r => r.status === 'failed').length,
    totalRecords: results.reduce((sum, r) => sum + r.count, 0)
  }

  fs.writeFileSync(
    path.join(backupDir, '_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  )

  // 結果表示
  console.log('\n📊 バックアップ結果:')
  console.log(`  ✅ 成功: ${summary.successCount}/${summary.totalTables} テーブル`)
  console.log(`  ❌ 失敗: ${summary.failedCount}/${summary.totalTables} テーブル`)
  console.log(`  📦 合計レコード数: ${summary.totalRecords}件`)

  // 古いバックアップの削除（30日以上前）
  cleanOldBackups(30)

  return summary
}

/**
 * 古いバックアップを削除
 */
function cleanOldBackups(daysToKeep: number) {
  const backupsDir = path.join(process.cwd(), 'backups')

  if (!fs.existsSync(backupsDir)) {
    return
  }

  const now = new Date().getTime()
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000

  const dirs = fs.readdirSync(backupsDir)
  let deletedCount = 0

  for (const dir of dirs) {
    const dirPath = path.join(backupsDir, dir)
    const stats = fs.statSync(dirPath)

    if (stats.isDirectory()) {
      const age = now - stats.mtime.getTime()

      if (age > maxAge) {
        fs.rmSync(dirPath, { recursive: true, force: true })
        deletedCount++
        console.log(`  🗑️ 古いバックアップを削除: ${dir}`)
      }
    }
  }

  if (deletedCount > 0) {
    console.log(`\n🧹 ${deletedCount}個の古いバックアップを削除しました`)
  }
}

// 実行
backupAllTables()
  .then(summary => {
    if (summary.failedCount === 0) {
      console.log('\n✅ バックアップが正常に完了しました')
      process.exit(0)
    } else {
      console.error('\n⚠️ 一部のテーブルでバックアップに失敗しました')
      process.exit(1)
    }
  })
  .catch(err => {
    console.error('\n❌ バックアップ中に致命的なエラーが発生しました:', err)
    process.exit(1)
  })
