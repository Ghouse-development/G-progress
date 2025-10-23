/**
 * kintone自動バックアップスクリプト
 *
 * 使用方法：
 * npx tsx scripts/backupToKintone.ts
 *
 * 環境変数：
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - KINTONE_DOMAIN
 * - KINTONE_API_TOKEN
 * - KINTONE_APP_ID
 */

import { createClient } from '@supabase/supabase-js'
import { KintoneClient, projectToKintoneRecord } from '../src/lib/kintone'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const kintoneDomain = process.env.KINTONE_DOMAIN!
const kintoneApiToken = process.env.KINTONE_API_TOKEN!
const kintoneAppId = process.env.KINTONE_APP_ID!

const supabase = createClient(supabaseUrl, supabaseKey)

async function backupToKintone() {
  console.log('🔄 kintoneバックアップを開始します...')
  console.log(`📅 実行日時: ${new Date().toLocaleString('ja-JP')}`)
  console.log('')

  const startTime = new Date()

  try {
    // 1. kintone設定を確認
    if (!kintoneDomain || !kintoneApiToken || !kintoneAppId) {
      console.error('❌ kintone設定が不足しています')
      console.error('必要な環境変数:')
      console.error('  - KINTONE_DOMAIN')
      console.error('  - KINTONE_API_TOKEN')
      console.error('  - KINTONE_APP_ID')
      process.exit(1)
    }

    // 2. kintone接続テスト
    console.log('🔌 kintone接続テスト中...')
    const kintoneClient = new KintoneClient(kintoneDomain, kintoneApiToken)
    const testResult = await kintoneClient.testConnection(kintoneAppId)

    if (!testResult.success) {
      console.error(`❌ kintone接続テスト失敗: ${testResult.error}`)
      process.exit(1)
    }
    console.log('✅ kintone接続成功\n')

    // 3. Supabaseからデータを取得
    console.log('📊 Supabaseからデータを取得中...')
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        customer:customers(*),
        sales:employees!sales_staff_id(*),
        design:employees!design_staff_id(*),
        construction:employees!construction_staff_id(*)
      `)

    if (fetchError) {
      console.error('❌ データ取得エラー:', fetchError)
      process.exit(1)
    }

    console.log(`✅ ${projects?.length || 0}件の案件を取得しました\n`)

    // 4. kintoneにバックアップ
    console.log('💾 kintoneにバックアップ中...')
    let successCount = 0
    let errorCount = 0
    const errors: Array<{ project_id: string; error: string }> = []

    for (const project of projects || []) {
      try {
        const kintoneRecord = projectToKintoneRecord(project)
        await kintoneClient.createRecord(kintoneAppId, kintoneRecord)
        successCount++

        // 進捗表示
        if (successCount % 10 === 0) {
          console.log(`  ${successCount}件完了...`)
        }
      } catch (error) {
        errorCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          project_id: project.id,
          error: errorMessage
        })
        console.error(`  ⚠️  案件 ${project.contract_number} のバックアップに失敗:`, errorMessage)
      }
    }

    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    // 5. バックアップログを保存
    await supabase.from('backup_logs').insert({
      status: errorCount > 0 ? 'partial' : 'success',
      total_records: projects?.length || 0,
      success_count: successCount,
      error_count: errorCount,
      duration_seconds: duration,
      error_details: errors.length > 0 ? JSON.stringify(errors) : null,
      created_at: new Date().toISOString()
    })

    // 6. 結果サマリー
    console.log('\n====================================')
    console.log('📊 バックアップ結果')
    console.log('====================================')
    console.log(`✅ 成功: ${successCount}件`)
    if (errorCount > 0) {
      console.log(`❌ 失敗: ${errorCount}件`)
    }
    console.log(`⏱️  所要時間: ${duration}秒`)
    console.log('====================================\n')

    if (errorCount > 0) {
      console.log('⚠️  一部のバックアップに失敗しました')
      process.exit(1)
    } else {
      console.log('✅ すべてのバックアップが完了しました')
      process.exit(0)
    }
  } catch (error) {
    console.error('\n❌ バックアップ中に予期しないエラーが発生しました:', error)

    // エラーログを保存
    try {
      await supabase.from('backup_logs').insert({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        created_at: new Date().toISOString()
      })
    } catch (logError) {
      console.error('ログ保存エラー:', logError)
    }

    process.exit(1)
  }
}

backupToKintone()
