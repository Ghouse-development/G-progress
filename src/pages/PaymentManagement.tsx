/**
 * 入金管理ページ
 *
 * 月ごとの入金予定・実績を表示し、CSV/PDF出力が可能
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Payment, Project } from '../types/database'
import { useFilter } from '../contexts/FilterContext'
import { useSettings } from '../contexts/SettingsContext'
import { useSimplePermissions } from '../hooks/usePermissions'
import { useAuditLog } from '../hooks/useAuditLog'
import { useToast } from '../contexts/ToastContext'
import { generateDemoPayments, generateDemoProjects, generateDemoCustomers } from '../utils/demoData'
import Papa from 'papaparse'
import { exportElementToPDF } from '../utils/pdfJapaneseFont'
import { Calendar, DollarSign, TrendingUp, Percent } from 'lucide-react'

interface PaymentRow {
  projectName: string
  paymentType: string
  amount: number
  scheduled: number
  actual: number
}

export default function PaymentManagement() {
  const { selectedFiscalYear, viewMode } = useFilter()
  const { demoMode } = useSettings()
  const { canWrite } = useSimplePermissions()
  const { logExport } = useAuditLog()
  const toast = useToast()
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [payments, setPayments] = useState<Payment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Map viewMode to old mode format for demo data compatibility
  const legacyMode = viewMode === 'personal' ? 'my_tasks' : viewMode === 'branch' ? 'branch' : 'admin'

  useEffect(() => {
    loadPayments()
  }, [selectedMonth, selectedFiscalYear, viewMode])

  // リアルタイム更新の購読
  useEffect(() => {
    const channel = supabase
      .channel('payment-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          // 入金が変更されたらデータを再読み込み
          loadPayments()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          // プロジェクトが変更されたらデータを再読み込み
          loadPayments()
        }
      )
      .subscribe()

    // クリーンアップ: コンポーネントのアンマウント時にサブスクリプション解除
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedMonth, selectedFiscalYear, viewMode])

  const loadPayments = async () => {
    setLoading(true)

    try {
      // デモモードの場合はサンプルデータを使用（モード別にデータ件数を調整）
      if (demoMode) {
        const demoPayments = generateDemoPayments(legacyMode)
        const demoProjects = generateDemoProjects(legacyMode)
        const demoCustomers = generateDemoCustomers()

        // 選択した月の支払いをフィルタ
        const [year, month] = selectedMonth.split('-')
        const startDate = new Date(`${year}-${month}-01`)
        const endDate = new Date(`${year}-${month}-31`)

        const filteredPayments = demoPayments
          .filter(payment => {
            const scheduledDate = payment.scheduled_date ? new Date(payment.scheduled_date) : null
            const actualDate = payment.actual_date ? new Date(payment.actual_date) : null
            return (
              (scheduledDate && scheduledDate >= startDate && scheduledDate <= endDate) ||
              (actualDate && actualDate >= startDate && actualDate <= endDate)
            )
          })
          .map(payment => {
            const project = demoProjects.find(p => p.id === payment.project_id)
            const customer = project ? demoCustomers.find(c => c.id === project.customer_id) : null
            return {
              ...payment,
              project: project ? {
                ...project,
                customer
              } : null
            }
          })

        setPayments(filteredPayments as any)
        setLoading(false)
        return
      }

      // 通常モード：Supabaseからデータを取得
      // 選択した月の支払いを取得（選択した年度のプロジェクトのみ）
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = `${year}-${month}-31`

      // First get projects for the selected fiscal year
      const { data: fiscalYearProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('fiscal_year', selectedFiscalYear)

      if (projectsError) {
        throw new Error(`プロジェクトデータの取得に失敗しました: ${projectsError.message}`)
      }

      const projectIds = fiscalYearProjects?.map(p => p.id) || []

      if (projectIds.length === 0) {
        setPayments([])
        setLoading(false)
        return
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, project:projects(*, customer:customers(*))')
        .in('project_id', projectIds)
        .or(`scheduled_date.gte.${startDate},actual_date.gte.${startDate}`)
        .or(`scheduled_date.lte.${endDate},actual_date.lte.${endDate}`)

      if (paymentsError) {
        throw new Error(`入金データの取得に失敗しました: ${paymentsError.message}`)
      }

      setPayments(paymentsData || [])
    } catch (error: any) {
      console.error('入金データの読み込みエラー:', error)
      toast.error(error.message || '入金データの読み込みに失敗しました')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const paymentRows: PaymentRow[] = payments.map(payment => ({
    projectName: (payment as any).project?.customer?.names?.[0] || '不明',
    paymentType: payment.payment_type,
    amount: payment.amount,
    scheduled: payment.actual_amount ? 0 : payment.scheduled_amount || 0,
    actual: payment.actual_amount || 0
  }))

  const totalScheduled = paymentRows.reduce((sum, row) => sum + row.scheduled, 0)
  const totalActual = paymentRows.reduce((sum, row) => sum + row.actual, 0)
  const grandTotal = totalScheduled + totalActual
  const difference = totalActual - totalScheduled
  const achievementRate = totalScheduled > 0 ? (totalActual / totalScheduled) * 100 : 0

  const exportCSV = async () => {
    try {
      const csv = Papa.unparse({
        fields: ['案件', '名目', '金額', '予定', '実績'],
        data: paymentRows.map(row => [
          row.projectName,
          row.paymentType,
          row.amount,
          row.scheduled,
          row.actual
        ])
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `入金管理_${selectedMonth}.csv`
      link.click()

      // 監査ログ記録
      await logExport(
        'payments',
        '',
        {
          month: selectedMonth,
          format: 'CSV',
          record_count: paymentRows.length,
          total_scheduled: totalScheduled,
          total_actual: totalActual
        },
        `${selectedMonth}の入金管理データをCSV形式で出力しました（${paymentRows.length}件）`
      )

      toast.success(`CSV出力が完了しました（${paymentRows.length}件）`)
    } catch (error: any) {
      console.error('CSV出力エラー:', error)
      toast.error(error.message || 'CSV出力に失敗しました')
    }
  }

  const exportPDF = async () => {
    try {
      // テーブル要素を取得
      const tableElement = document.querySelector('.prisma-content') as HTMLElement
      if (!tableElement) {
        throw new Error('テーブル要素が見つかりませんでした')
      }

      // 一時的にヘッダー（タイトル・フィルタ）を含めた全体をキャプチャするための要素を作成
      const captureElement = document.createElement('div')
      captureElement.style.cssText = 'background: white; padding: 20px; width: 1200px;'

      // タイトルヘッダーを追加
      const titleDiv = document.createElement('div')
      titleDiv.style.cssText = 'margin-bottom: 20px;'
      titleDiv.innerHTML = `<h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0;">入金管理 ${selectedMonth}</h1>`
      captureElement.appendChild(titleDiv)

      // テーブルのクローンを追加
      const tableClone = tableElement.cloneNode(true) as HTMLElement
      captureElement.appendChild(tableClone)

      // 一時的にDOMに追加
      document.body.appendChild(captureElement)

      // PDFにエクスポート
      await exportElementToPDF(captureElement, `入金管理_${selectedMonth}`, 'portrait')

      // 一時要素を削除
      document.body.removeChild(captureElement)

      // 監査ログ記録
      await logExport(
        'payments',
        '',
        {
          month: selectedMonth,
          format: 'PDF',
          record_count: paymentRows.length,
          total_scheduled: totalScheduled,
          total_actual: totalActual
        },
        `${selectedMonth}の入金管理データをPDF形式で出力しました（${paymentRows.length}件）`
      )

      toast.success(`PDF出力が完了しました（${paymentRows.length}件）`)
    } catch (error: any) {
      console.error('PDF出力エラー:', error)
      toast.error(error.message || 'PDF出力に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="prisma-content">
        <div className="prisma-empty">読み込み中...</div>
      </div>
    )
  }

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">入金管理</h1>
        <div className="prisma-header-actions">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="prisma-input w-[200px]"
          />
          <button onClick={exportCSV} className="prisma-btn prisma-btn-secondary prisma-btn-sm">
            CSV出力
          </button>
          <button onClick={exportPDF} className="prisma-btn prisma-btn-primary prisma-btn-sm">
            PDF出力
          </button>
        </div>
      </div>

      <div className="prisma-content">
        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* 予定入金額 */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-300 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-blue-900">予定入金額</p>
              <Calendar className="text-blue-600" size={28} />
            </div>
            <p className="text-3xl font-black text-blue-900">
              ¥{totalScheduled.toLocaleString()}
            </p>
          </div>

          {/* 実績入金額 */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-300 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-green-900">実績入金額</p>
              <DollarSign className="text-green-600" size={28} />
            </div>
            <p className="text-3xl font-black text-green-900">
              ¥{totalActual.toLocaleString()}
            </p>
          </div>

          {/* 差額 */}
          <div className={`bg-gradient-to-br ${
            difference >= 0
              ? 'from-emerald-50 to-emerald-100 border-emerald-300'
              : 'from-red-50 to-red-100 border-red-300'
          } rounded-xl p-6 border-2 shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-base font-bold ${difference >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                差額
              </p>
              <TrendingUp className={difference >= 0 ? 'text-emerald-600' : 'text-red-600'} size={28} />
            </div>
            <p className={`text-3xl font-black ${difference >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              {difference >= 0 ? '+' : ''}¥{difference.toLocaleString()}
            </p>
          </div>

          {/* 達成率 */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-300 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-purple-900">達成率</p>
              <Percent className="text-purple-600" size={28} />
            </div>
            <p className="text-3xl font-black text-purple-900">
              {achievementRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <table className="prisma-table">
          <thead>
            <tr>
              <th>案件</th>
              <th>名目</th>
              <th className="text-right">金額</th>
              <th className="text-right">予定</th>
              <th className="text-right">実績</th>
            </tr>
          </thead>
          <tbody>
            {paymentRows.map((row, index) => (
              <tr key={index}>
                <td className="text-base">{row.projectName}</td>
                <td className="text-base">
                  <div className="flex items-center gap-2">
                    <span>{row.paymentType}</span>
                    {row.actual > 0 && (
                      <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-bold text-white bg-green-600 rounded-full border-2 border-white shadow-lg" title="入金確定">
                        確
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right text-base font-medium">{row.amount.toLocaleString()}</td>
                <td className="text-right text-base font-medium">{row.scheduled.toLocaleString()}</td>
                <td className="text-right text-base font-medium">{row.actual.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100">
              <td colSpan={3} className="text-base font-black">合計</td>
              <td className="text-right text-base font-black">{totalScheduled.toLocaleString()}</td>
              <td className="text-right text-base font-black">{totalActual.toLocaleString()}</td>
            </tr>
            <tr className="bg-gray-200">
              <td colSpan={3} className="text-base font-black">総計</td>
              <td className="text-right text-base font-black" colSpan={2}>{grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
