import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

/**
 * CSV形式でデータをエクスポート
 */
export function exportToCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data, {
    quotes: true,
    delimiter: ',',
    header: true
  })

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // UTF-8 BOM付き
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Excel形式でデータをエクスポート
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // 列幅を自動調整
  const maxWidth = 50
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const columnData = data.map(row => String(row[key] || ''))
    const maxLength = Math.max(key.length, ...columnData.map(val => val.length))
    return { wch: Math.min(maxLength + 2, maxWidth) }
  })
  worksheet['!cols'] = colWidths

  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`)
}

/**
 * 複数シートのExcelファイルをエクスポート
 */
export function exportToExcelMultiSheet(sheets: Array<{ name: string; data: any[] }>, filename: string) {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ name, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data)

    // 列幅を自動調整
    const maxWidth = 50
    const colWidths = Object.keys(data[0] || {}).map(key => {
      const columnData = data.map(row => String(row[key] || ''))
      const maxLength = Math.max(key.length, ...columnData.map(val => val.length))
      return { wch: Math.min(maxLength + 2, maxWidth) }
    })
    worksheet['!cols'] = colWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  })

  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`)
}

/**
 * PDF形式でテーブルデータをエクスポート
 */
export function exportTableToPDF(
  data: any[],
  columns: Array<{ header: string; dataKey: string }>,
  title: string,
  filename: string
) {
  const doc = new jsPDF('l', 'mm', 'a4') // 横向き、A4サイズ

  // タイトル設定
  doc.setFontSize(18)
  doc.text(title, 14, 15)

  // 日付追加
  doc.setFontSize(10)
  doc.text(format(new Date(), 'yyyy年M月d日 HH:mm:ss', { locale: ja }), 14, 22)

  // テーブル生成
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.dataKey] || '')),
    startY: 28,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'left'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 30 }
  })

  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`)
}

/**
 * HTML要素をPDFにエクスポート（日本語完全対応）
 * html2canvasを使用してHTMLを画像化してからPDFに変換
 */
export async function exportHTMLToPDF(
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  try {
    // HTML要素をCanvasに変換
    const canvas = await html2canvas(element, {
      scale: 2, // 高解像度
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = orientation === 'portrait' ? 210 : 297 // A4サイズ (mm)
    const imgHeight = orientation === 'portrait' ? 297 : 210

    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    const ratio = canvasHeight / canvasWidth
    const pdfHeight = imgWidth * ratio

    const doc = new jsPDF(orientation, 'mm', 'a4')

    let heightLeft = pdfHeight
    let position = 0

    // 1ページに収まらない場合は複数ページに分割
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, pdfHeight)
    heightLeft -= imgHeight

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight
      doc.addPage()
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, pdfHeight)
      heightLeft -= imgHeight
    }

    doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`)
  } catch (error) {
    console.error('PDF export failed:', error)
    throw new Error('PDFのエクスポートに失敗しました')
  }
}

/**
 * レポート形式のPDFをエクスポート（複数セクション対応）
 */
export function exportReportToPDF(
  title: string,
  sections: Array<{
    sectionTitle: string
    data: any[]
    columns: Array<{ header: string; dataKey: string }>
  }>,
  filename: string
) {
  const doc = new jsPDF('l', 'mm', 'a4')

  // タイトル
  doc.setFontSize(20)
  doc.text(title, 14, 15)

  // 日付
  doc.setFontSize(10)
  doc.text(format(new Date(), 'yyyy年M月d日 HH:mm:ss', { locale: ja }), 14, 22)

  let currentY = 30

  sections.forEach((section, index) => {
    // 新しいページが必要かチェック
    if (currentY > 180 && index > 0) {
      doc.addPage()
      currentY = 15
    }

    // セクションタイトル
    doc.setFontSize(14)
    doc.text(section.sectionTitle, 14, currentY)
    currentY += 7

    // テーブル
    autoTable(doc, {
      head: [section.columns.map(col => col.header)],
      body: section.data.map(row => section.columns.map(col => row[col.dataKey] || '')),
      startY: currentY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'left'
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 14, right: 14 }
    })

    // @ts-ignore - autoTableのfinalY型定義の問題を回避
    currentY = doc.lastAutoTable.finalY + 10
  })

  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`)
}

/**
 * プロジェクトデータをエクスポート
 */
export function exportProjects(projects: any[], exportFormat: 'csv' | 'excel' | 'pdf') {
  const data = projects.map(p => ({
    'プロジェクトID': p.id,
    '顧客名': p.customer?.names?.[0] || '',
    'ステータス': getStatusLabel(p.status),
    '契約日': p.contract_date ? format(new Date(p.contract_date), 'yyyy/MM/dd') : '',
    '完了予定日': p.expected_end_date ? format(new Date(p.expected_end_date), 'yyyy/MM/dd') : '',
    '実際の完了日': p.actual_end_date ? format(new Date(p.actual_end_date), 'yyyy/MM/dd') : '',
    '進捗率': `${p.progress_rate || 0}%`,
    '備考': p.notes || ''
  }))

  switch (exportFormat) {
    case 'csv':
      exportToCSV(data, 'プロジェクト一覧')
      break
    case 'excel':
      exportToExcel(data, 'プロジェクト一覧', 'プロジェクト')
      break
    case 'pdf':
      exportTableToPDF(
        data,
        [
          { header: 'プロジェクトID', dataKey: 'プロジェクトID' },
          { header: '顧客名', dataKey: '顧客名' },
          { header: 'ステータス', dataKey: 'ステータス' },
          { header: '契約日', dataKey: '契約日' },
          { header: '完了予定日', dataKey: '完了予定日' },
          { header: '進捗率', dataKey: '進捗率' }
        ],
        'プロジェクト一覧',
        'プロジェクト一覧'
      )
      break
  }
}

/**
 * タスクデータをエクスポート
 */
export function exportTasks(tasks: any[], exportFormat: 'csv' | 'excel' | 'pdf') {
  const data = tasks.map(t => ({
    'タスクID': t.id,
    'タイトル': t.title,
    '説明': t.description || '',
    'ステータス': getTaskStatusLabel(t.status),
    '担当者': t.assigned_employee ? `${t.assigned_employee.last_name} ${t.assigned_employee.first_name}` : '',
    '期限': t.due_date ? format(new Date(t.due_date), 'yyyy/MM/dd') : '',
    '完了日': t.actual_completion_date ? format(new Date(t.actual_completion_date), 'yyyy/MM/dd') : '',
    'プロジェクト': t.project?.customer?.names?.[0] || ''
  }))

  switch (exportFormat) {
    case 'csv':
      exportToCSV(data, 'タスク一覧')
      break
    case 'excel':
      exportToExcel(data, 'タスク一覧', 'タスク')
      break
    case 'pdf':
      exportTableToPDF(
        data,
        [
          { header: 'タスクID', dataKey: 'タスクID' },
          { header: 'タイトル', dataKey: 'タイトル' },
          { header: 'ステータス', dataKey: 'ステータス' },
          { header: '担当者', dataKey: '担当者' },
          { header: '期限', dataKey: '期限' },
          { header: 'プロジェクト', dataKey: 'プロジェクト' }
        ],
        'タスク一覧',
        'タスク一覧'
      )
      break
  }
}

/**
 * 従業員パフォーマンスをエクスポート
 */
export function exportEmployeePerformance(employees: any[], exportFormat: 'csv' | 'excel' | 'pdf') {
  const data = employees.map(e => ({
    '氏名': e.name,
    '部門': e.department,
    '役職': e.role,
    '総タスク数': e.totalTasks,
    '完了タスク数': e.completedTasks,
    '遅延タスク数': e.delayedTasks,
    '完了率': `${e.completionRate.toFixed(1)}%`
  }))

  switch (exportFormat) {
    case 'csv':
      exportToCSV(data, '従業員パフォーマンス')
      break
    case 'excel':
      exportToExcel(data, '従業員パフォーマンス', '従業員パフォーマンス')
      break
    case 'pdf':
      exportTableToPDF(
        data,
        [
          { header: '氏名', dataKey: '氏名' },
          { header: '部門', dataKey: '部門' },
          { header: '役職', dataKey: '役職' },
          { header: '総タスク数', dataKey: '総タスク数' },
          { header: '完了タスク数', dataKey: '完了タスク数' },
          { header: '遅延タスク数', dataKey: '遅延タスク数' },
          { header: '完了率', dataKey: '完了率' }
        ],
        '従業員パフォーマンス',
        '従業員パフォーマンス'
      )
      break
  }
}

/**
 * 月次レポートを総合PDFとしてエクスポート
 */
export function exportMonthlyReportPDF(
  monthlyData: any,
  projectStats: any,
  departmentStats: any,
  employeePerformance: any[]
) {
  const sections = []

  // 月次サマリーセクション
  sections.push({
    sectionTitle: `${monthlyData.year}年${monthlyData.month}月 サマリー`,
    data: [
      { 項目: '新規契約数', 値: monthlyData.newContracts },
      { 項目: '完了プロジェクト数', 値: monthlyData.completedProjects },
      { 項目: '完了タスク数', 値: monthlyData.completedTasks },
      { 項目: '売上', 値: `¥${((monthlyData.totalRevenue || 0) / 10000).toFixed(0)}万円` }
    ],
    columns: [
      { header: '項目', dataKey: '項目' },
      { header: '値', dataKey: '値' }
    ]
  })

  // プロジェクトステータスセクション
  sections.push({
    sectionTitle: 'プロジェクトステータス',
    data: [
      { ステータス: '契約前', 件数: projectStats.preContract },
      { ステータス: '契約後', 件数: projectStats.postContract },
      { ステータス: '施工中', 件数: projectStats.construction },
      { ステータス: '完了', 件数: projectStats.completed }
    ],
    columns: [
      { header: 'ステータス', dataKey: 'ステータス' },
      { header: '件数', dataKey: '件数' }
    ]
  })

  // 部門別タスク完了率セクション
  const deptData = Object.entries(departmentStats || {}).map(([dept, stats]: [string, any]) => ({
    部門: dept,
    総タスク数: stats.total,
    完了数: stats.completed,
    完了率: `${stats.rate.toFixed(1)}%`
  }))

  if (deptData.length > 0) {
    sections.push({
      sectionTitle: '部門別タスク完了率',
      data: deptData,
      columns: [
        { header: '部門', dataKey: '部門' },
        { header: '総タスク数', dataKey: '総タスク数' },
        { header: '完了数', dataKey: '完了数' },
        { header: '完了率', dataKey: '完了率' }
      ]
    })
  }

  // 従業員パフォーマンス（上位10名）
  const topEmployees = employeePerformance
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 10)
    .map(e => ({
      氏名: e.name,
      部門: e.department,
      完了率: `${e.completionRate.toFixed(1)}%`,
      完了タスク: e.completedTasks,
      総タスク: e.totalTasks
    }))

  if (topEmployees.length > 0) {
    sections.push({
      sectionTitle: '従業員パフォーマンス（上位10名）',
      data: topEmployees,
      columns: [
        { header: '氏名', dataKey: '氏名' },
        { header: '部門', dataKey: '部門' },
        { header: '完了率', dataKey: '完了率' },
        { header: '完了タスク', dataKey: '完了タスク' },
        { header: '総タスク', dataKey: '総タスク' }
      ]
    })
  }

  exportReportToPDF(
    `${monthlyData.year}年${monthlyData.month}月 総合レポート`,
    sections,
    `月次レポート_${monthlyData.year}${String(monthlyData.month).padStart(2, '0')}`
  )
}

// ヘルパー関数
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pre_contract: '契約前',
    post_contract: '契約後',
    construction: '施工中',
    completed: '完了'
  }
  return labels[status] || status
}

function getTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_started: '未着手',
    requested: '着手中',
    completed: '完了'
  }
  return labels[status] || status
}
