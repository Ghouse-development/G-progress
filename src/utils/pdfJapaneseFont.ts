/**
 * jsPDF用の日本語フォント設定ユーティリティ
 *
 * ⚠️ 重要: jsPDFのテキスト描画では日本語フォントの埋め込みが必要ですが、
 * これはファイルサイズが大きくなる問題があります。
 *
 * 推奨される方法:
 * 1. exportHTMLToPDF() を使用 - HTMLをCanvasに変換してPDFに埋め込み（日本語完全対応）
 * 2. exportToExcel() / exportToCSV() を使用 - Excel/CSVなら日本語完全対応
 */

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * jsPDFインスタンスに基本設定を追加
 * 注: 日本語テキストの描画には制限があります
 */
export function setupJapanesePDF(doc: jsPDF): void {
  // デフォルトのフォント設定
  // Helveticaは日本語非対応のため、テキスト描画には使用しないでください
  doc.setFont('helvetica', 'normal')
}

/**
 * 日本語対応のjsPDFインスタンスを作成
 * 注: これは基本的な設定のみです。日本語テキストを含む場合は exportHTMLToPDF() を使用してください
 */
export function createJapanesePDF(orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  const doc = new jsPDF(orientation)
  setupJapanesePDF(doc)
  return doc
}

/**
 * HTML要素をPDFに変換（日本語完全対応）
 * この方法が最も推奨されます
 *
 * @param element - PDF化するHTML要素
 * @param filename - 出力ファイル名
 * @param orientation - ページ向き
 *
 * @example
 * const tableElement = document.getElementById('my-table')
 * if (tableElement) {
 *   await exportElementToPDF(tableElement, 'report', 'landscape')
 * }
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
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

    // 1ページ目
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, pdfHeight)
    heightLeft -= imgHeight

    // 複数ページに分割（必要な場合）
    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight
      doc.addPage()
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, pdfHeight)
      heightLeft -= imgHeight
    }

    // タイムスタンプ付きでファイル保存
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_')
    doc.save(`${filename}_${timestamp}.pdf`)
  } catch (error) {
    console.error('PDF export failed:', error)
    throw new Error('PDFのエクスポートに失敗しました')
  }
}

/**
 * 日本語テキストを適切に描画（制限付き）
 * ⚠️ 警告: この方法では日本語が正しく表示されない可能性があります
 * 代わりに exportElementToPDF() または exportHTMLToPDF() を使用してください
 */
export function drawJapaneseText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number = 180
): number {
  console.warn('drawJapaneseText: この方法は日本語表示に制限があります。exportElementToPDF()の使用を推奨します。')
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + (lines.length * 7)
}

/**
 * PDF出力の推奨事項メッセージ
 */
export const PDF_JAPANESE_RECOMMENDATION = `
✅ 推奨される日本語PDF出力方法:

1. **HTMLからPDF生成（最推奨）**
   - exportElementToPDF() または exportHTMLToPDF() を使用
   - ブラウザのフォントを使用するため、日本語が完全に表示されます
   - 画像として埋め込むため、レイアウトも保持されます

2. **Excel/CSV出力**
   - exportToExcel() / exportToCSV() を使用
   - Excelで開くことで、日本語が完全に表示されます
   - データの編集・加工が可能

❌ 非推奨:
- jsPDFの直接的なテキスト描画（doc.text()）
  → 日本語フォントの埋め込みが必要で、ファイルサイズが大きくなります
`.trim()

/**
 * jspdf-autotableで使用する日本語対応スタイル
 * 注: これでも完全な日本語対応にはなりません
 */
export const JAPANESE_TABLE_STYLES = {
  styles: {
    font: 'helvetica',
    fontSize: 10,
    cellPadding: 3,
    overflow: 'linebreak' as const,
    cellWidth: 'wrap' as const,
  },
  headStyles: {
    fillColor: [66, 66, 66] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 11,
    halign: 'center' as const,
  },
  bodyStyles: {
    textColor: [0, 0, 0] as [number, number, number],
    halign: 'left' as const,
  },
  footStyles: {
    fillColor: [240, 240, 240] as [number, number, number],
    textColor: [0, 0, 0] as [number, number, number],
    fontStyle: 'bold' as const,
  },
  alternateRowStyles: {
    fillColor: [250, 250, 250] as [number, number, number],
  },
}
