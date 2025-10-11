/**
 * Dandori系UIのダミーデータ
 */

export interface DummyKpi {
  id: string
  title: string
  value: string
  hint?: string
  badge?: string
}

export interface DummyTableRow {
  id: string
  name: string
  status: "success" | "warning" | "error"
  progress: number
  date: string
}

// KPIダミーデータ
export const dummyKpis: DummyKpi[] = [
  {
    id: "1",
    title: "売上",
    value: "¥45M",
    hint: "今月",
  },
  {
    id: "2",
    title: "粗利率",
    value: "26.5%",
    hint: "先月比 +0.8pt",
  },
  {
    id: "3",
    title: "成約率",
    value: "12.3%",
  },
  {
    id: "4",
    title: "在庫数",
    value: "198 品目",
  },
]

// テーブルダミーデータ
export const dummyTableRows: DummyTableRow[] = [
  { id: "1", name: "案件A", status: "success", progress: 85, date: "2025-10-15" },
  { id: "2", name: "案件B", status: "warning", progress: 45, date: "2025-10-18" },
  { id: "3", name: "案件C", status: "error", progress: 20, date: "2025-10-12" },
  { id: "4", name: "案件D", status: "success", progress: 100, date: "2025-10-10" },
  { id: "5", name: "案件E", status: "warning", progress: 60, date: "2025-10-20" },
  { id: "6", name: "案件F", status: "success", progress: 90, date: "2025-10-22" },
  { id: "7", name: "案件G", status: "warning", progress: 35, date: "2025-10-25" },
  { id: "8", name: "案件H", status: "success", progress: 75, date: "2025-10-28" },
  { id: "9", name: "案件I", status: "error", progress: 15, date: "2025-10-11" },
  { id: "10", name: "案件J", status: "success", progress: 95, date: "2025-10-30" },
]

// グラフ用ダミーデータ
export const dummyChartData = [
  { month: "4月", 売上: 32, 粗利: 8 },
  { month: "5月", 売上: 38, 粗利: 10 },
  { month: "6月", 売上: 35, 粗利: 9 },
  { month: "7月", 売上: 42, 粗利: 11 },
  { month: "8月", 売上: 40, 粗利: 10 },
  { month: "9月", 売上: 45, 粗利: 12 },
]
