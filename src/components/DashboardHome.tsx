export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-light text-black">ダッシュボード</h2>

      {/* 信号表示 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">営業部門</h3>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-12 h-12 rounded-full bg-green-500"></div>
          </div>
          <p className="text-center mt-4 text-sm text-gray-600">正常稼働中</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">設計部門</h3>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-12 h-12 rounded-full bg-yellow-400"></div>
          </div>
          <p className="text-center mt-4 text-sm text-gray-600">注意が必要</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">工事部門</h3>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-12 h-12 rounded-full bg-green-500"></div>
          </div>
          <p className="text-center mt-4 text-sm text-gray-600">正常稼働中</p>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">全社進捗率</p>
          <p className="text-3xl font-light text-black mt-2">78.5%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">遅延案件数</p>
          <p className="text-3xl font-light text-black mt-2">3</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">進行中案件</p>
          <p className="text-3xl font-light text-black mt-2">24</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">今月完了予定</p>
          <p className="text-3xl font-light text-black mt-2">8</p>
        </div>
      </div>

      {/* グラフエリア（プレースホルダー） */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-black mb-4">遅延案件推移</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          グラフを表示（recharts実装予定）
        </div>
      </div>
    </div>
  )
}
