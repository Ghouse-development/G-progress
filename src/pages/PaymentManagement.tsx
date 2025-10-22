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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { JAPANESE_TABLE_STYLES } from '../utils/pdfJapaneseFont'

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
      const doc = new jsPDF()

      // タイトル（日本語対応）
      doc.setFontSize(16)
      doc.text(`入金管理 ${selectedMonth}`, 20, 20)

      // autoTableを使用してテーブルを作成（日本語ヘッダー）
      autoTable(doc, {
        startY: 30,
        head: [['案件', '名目', '金額', '予定', '実績']],
        body: paymentRows.map(row => [
          row.projectName,
          row.paymentType,
          `¥${row.amount.toLocaleString('ja-JP')}`,
          `¥${row.scheduled.toLocaleString('ja-JP')}`,
          `¥${row.actual.toLocaleString('ja-JP')}`
        ]),
        foot: [[
          '合計',
          '',
          `¥${grandTotal.toLocaleString('ja-JP')}`,
          `¥${totalScheduled.toLocaleString('ja-JP')}`,
          `¥${totalActual.toLocaleString('ja-JP')}`
        ]],
        ...JAPANESE_TABLE_STYLES
      })

      doc.save(`入金管理_${selectedMonth}.pdf`)

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
            className="prisma-input"
            style={{ width: '200px' }}
          />
          <button onClick={exportCSV} className="prisma-btn prisma-btn-secondary prisma-btn-sm">
            CSV出力（推奨）
          </button>
          <button onClick={exportPDF} className="prisma-btn prisma-btn-primary prisma-btn-sm" title="日本語が正しく表示されない場合があります。完全な日本語対応が必要な場合はCSV出力をご利用ください。">
            PDF出力
          </button>
        </div>
      </div>

      <div className="prisma-content">
        {/* PDF出力の情報 */}
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-800">
          <strong>💡 出力形式について:</strong> PDF出力は日本語に対応していますが、
          Excelでの編集が必要な場合は<strong>CSV出力</strong>をご利用ください。
        </div>
        <table className="prisma-table">
          <thead>
            <tr>
              <th>案件</th>
              <th>名目</th>
              <th style={{ textAlign: 'right' }}>金額</th>
              <th style={{ textAlign: 'right' }}>予定</th>
              <th style={{ textAlign: 'right' }}>実績</th>
            </tr>
          </thead>
          <tbody>
            {paymentRows.map((row, index) => (
              <tr key={index}>
                <td>{row.projectName}</td>
                <td>{row.paymentType}</td>
                <td style={{ textAlign: 'right' }}>{row.amount.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{row.scheduled.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{row.actual.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
              <td colSpan={3}>合計</td>
              <td style={{ textAlign: 'right' }}>{totalScheduled.toLocaleString()}</td>
              <td style={{ textAlign: 'right' }}>{totalActual.toLocaleString()}</td>
            </tr>
            <tr style={{ background: '#e5e7eb', fontWeight: 'bold' }}>
              <td colSpan={3}>総計</td>
              <td style={{ textAlign: 'right' }} colSpan={2}>{grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
