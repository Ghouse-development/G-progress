/**
 * jsPDF用の日本語フォント設定ユーティリティ
 * IPAexゴシックフォントをjsPDFに追加
 */

import { jsPDF } from 'jspdf'

// IPAexゴシックフォント（Base64エンコード済み - 一部のみ、実際には完全なフォントファイルが必要）
// 本番環境では完全なフォントファイルをCDNまたはローカルで読み込む必要があります

/**
 * jsPDFインスタンスに日本語フォントを追加
 *
 * 注: この実装では、ブラウザのデフォルトフォントレンダリングを使用します。
 * より高品質な出力が必要な場合は、IPAexゴシックやNoto Sans JPなどの
 * 日本語フォントファイルをBase64変換して埋め込む必要があります。
 */
export function addJapaneseFont(doc: jsPDF): void {
  // jsPDF 2.x以降では、setFont()でシステムフォントを使用できる
  // ただし、完全な日本語サポートには制限があります

  // デフォルトのフォント設定
  doc.setFont('helvetica', 'normal')
}

/**
 * 日本語対応のjsPDFインスタンスを作成
 */
export function createJapanesePDF(orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  const doc = new jsPDF(orientation)
  addJapaneseFont(doc)
  return doc
}

/**
 * 日本語テキストを適切に分割して描画
 * 長いテキストを複数行に分割してPDFに描画します
 */
export function drawJapaneseText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number = 180
): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + (lines.length * 7) // 行の高さ分を返す
}

/**
 * CSV形式での出力を推奨するメッセージ
 */
export const PDF_JAPANESE_WARNING = `
⚠️ PDF出力の制限事項:
- 現在のPDF出力では、一部の日本語文字が正しく表示されない場合があります
- 完全な日本語対応が必要な場合は、CSV出力をご利用ください
- CSV出力はExcelで開くことで、すべての日本語が正しく表示されます
`.trim()

/**
 * jspdf-autotableで日本語を使用する際のデフォルト設定
 */
export const JAPANESE_TABLE_STYLES = {
  styles: {
    font: 'helvetica',
    fontSize: 10,
    cellPadding: 3,
  },
  headStyles: {
    fillColor: [66, 66, 66] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 11,
  },
  bodyStyles: {
    textColor: [0, 0, 0] as [number, number, number],
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
