/**
 * Dandori系UIのサンプルページ
 *
 * このページは、Dandori系UIの完全な実装例を示しています。
 * - 3カラムレイアウト（左サイドバー、中央メイン、右サマリ）
 * - 上部ヘッダー（検索、通知、アバター、新規ボタン）
 * - KPI カード
 * - グラフセクション
 * - テーブルセクション
 */

import { DandoriHeader } from "../components/layout/DandoriHeader"
import { RightPanel } from "../components/layout/RightPanel"
import { KpiCard } from "../components/ui/KpiCard"
import { SectionCard } from "../components/ui/SectionCard"
import { ProgressStat } from "../components/ui/ProgressStat"
import { Badge } from "../components/ui/Badge"
import { dummyKpis, dummyTableRows, dummyChartData } from "../lib/dummy"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

export default function SamplePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 上部ヘッダー固定 */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-6">
          <DandoriHeader
            title="Dandori系UI サンプル"
            onSearch={(query) => console.log("検索:", query)}
            onNewClick={() => alert("新規ボタンがクリックされました")}
          />
        </div>
      </div>

      {/* 3カラムレイアウト */}
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* メインコンテンツ */}
          <main className="min-w-0 space-y-6">
            {/* KPI カード群 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {dummyKpis.map((kpi) => (
                <KpiCard
                  key={kpi.id}
                  title={kpi.title}
                  value={kpi.value}
                  hint={kpi.hint}
                  badge={kpi.badge}
                />
              ))}
            </div>

            {/* グラフセクション */}
            <SectionCard title="指標推移" subtitle="過去6ヶ月">
              <div className="space-y-6">
                {/* 折れ線グラフ */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">売上推移</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dummyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="売上" stroke="#6366f1" strokeWidth={2} />
                      <Line type="monotone" dataKey="粗利" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 棒グラフ */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">月別比較</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dummyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="売上" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="粗利" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </SectionCard>

            {/* プログレス統計 */}
            <SectionCard title="進捗状況">
              <div className="space-y-4">
                <ProgressStat label="営業部" value={85} max={100} />
                <ProgressStat label="設計部" value={65} max={100} />
                <ProgressStat label="工事部" value={45} max={100} />
                <ProgressStat label="外構事業部" value={90} max={100} />
              </div>
            </SectionCard>

            {/* テーブルセクション */}
            <SectionCard title="案件一覧" subtitle="直近10件">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">案件名</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">ステータス</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">進捗</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">期限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dummyTableRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{row.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={row.status}>
                            {row.status === "success" && "完了"}
                            {row.status === "warning" && "進行中"}
                            {row.status === "error" && "遅延"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                                style={{ width: `${row.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-10 text-right">
                              {row.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </main>

          {/* 右サイドパネル */}
          <RightPanel />
        </div>
      </div>
    </div>
  )
}
