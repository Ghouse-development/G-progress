/**
 * 承認フロー
 * 全事業共通の申請・承認管理
 */

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, FileText, AlertCircle } from 'lucide-react'
import { useSimplePermissions } from '../hooks/usePermissions'

interface ApprovalRequest {
  id: string
  type: '購買申請' | '稟議申請' | '経費精算' | '休暇申請' | '契約承認'
  title: string
  requester: string
  department: string
  requestDate: string
  amount?: number
  status: 'pending' | 'approved' | 'rejected'
  currentApprover: string
  description: string
}

export default function ApprovalFlow() {
  const { canWrite } = useSimplePermissions()
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  // サンプルデータ
  const [requests] = useState<ApprovalRequest[]>([
    {
      id: '1',
      type: '購買申請',
      title: '建材購入申請（木材）',
      requester: '山田太郎',
      department: '工事部',
      requestDate: '2025-10-20',
      amount: 1500000,
      status: 'pending',
      currentApprover: '部長',
      description: '10月着工案件の建材購入'
    },
    {
      id: '2',
      type: '稟議申請',
      title: '新規ツール導入の稟議',
      requester: '佐藤花子',
      department: '営業部',
      requestDate: '2025-10-19',
      amount: 500000,
      status: 'approved',
      currentApprover: '-',
      description: 'CRMシステムの導入'
    },
    {
      id: '3',
      type: '経費精算',
      title: '出張経費精算（東京）',
      requester: '鈴木一郎',
      department: '設計部',
      requestDate: '2025-10-18',
      amount: 45000,
      status: 'approved',
      currentApprover: '-',
      description: '顧客打ち合わせのための出張費'
    },
    {
      id: '4',
      type: '休暇申請',
      title: '有給休暇申請',
      requester: '田中美咲',
      department: '営業事務',
      requestDate: '2025-10-17',
      status: 'rejected',
      currentApprover: '-',
      description: '10/25-10/27 の3日間'
    },
    {
      id: '5',
      type: '契約承認',
      title: '外注契約承認申請',
      requester: '高橋健太',
      department: '工事部',
      requestDate: '2025-10-16',
      amount: 3200000,
      status: 'pending',
      currentApprover: '取締役',
      description: '外構工事業者との年間契約'
    }
  ])

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true
    return req.status === filter
  })

  const statusConfig = {
    pending: {
      label: '承認待ち',
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-300 dark:border-yellow-700'
    },
    approved: {
      label: '承認済み',
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-300 dark:border-green-700'
    },
    rejected: {
      label: '却下',
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-300 dark:border-red-700'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">承認フロー</h2>
        <span className="prisma-badge prisma-badge-purple">全社共通</span>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="prisma-card">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">全申請</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {requests.length}
          </div>
        </div>
        <div className="prisma-card bg-yellow-50 dark:bg-yellow-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">承認待ち</div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {requests.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="prisma-card bg-green-50 dark:bg-green-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">承認済み</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {requests.filter(r => r.status === 'approved').length}
          </div>
        </div>
        <div className="prisma-card bg-red-50 dark:bg-red-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">却下</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {requests.filter(r => r.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="prisma-card">
        <div className="flex items-center gap-4">
          <label className="text-base font-semibold text-gray-700 dark:text-gray-300">表示:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`prisma-btn ${filter === 'all' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              全て
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`prisma-btn ${filter === 'pending' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              承認待ち
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`prisma-btn ${filter === 'approved' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              承認済み
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`prisma-btn ${filter === 'rejected' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
            >
              却下
            </button>
          </div>
        </div>
      </div>

      {/* 申請一覧 */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="prisma-card text-center py-12">
            <AlertCircle className="inline-block mb-4 text-gray-400" size={48} />
            <p className="text-lg text-gray-500 dark:text-gray-400">該当する申請がありません</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const config = statusConfig[request.status]
            const StatusIcon = config.icon

            return (
              <div
                key={request.id}
                className={`prisma-card border-l-4 ${config.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="text-gray-600 dark:text-gray-400" size={24} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="prisma-badge prisma-badge-gray text-xs">
                            {request.type}
                          </span>
                          <span className={`flex items-center gap-1 text-sm font-semibold ${config.color}`}>
                            <StatusIcon size={16} />
                            {config.label}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {request.title}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">申請者</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {request.requester}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">部署</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {request.department}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">申請日</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {request.requestDate}
                        </div>
                      </div>
                      {request.amount && (
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">金額</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(request.amount)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      {request.description}
                    </div>

                    {request.status === 'pending' && (
                      <div className="mt-3 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">現在の承認者: </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {request.currentApprover}
                        </span>
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button disabled={!canWrite} className="prisma-btn prisma-btn-primary" title={!canWrite ? '権限がありません' : ''}>
                        承認
                      </button>
                      <button disabled={!canWrite} className="prisma-btn prisma-btn-secondary" title={!canWrite ? '権限がありません' : ''}>
                        却下
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 注意書き */}
      <div className="prisma-card bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" size={20} />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">開発中の機能</p>
            <p>
              承認フロー機能は現在開発中です。表示されているデータはサンプルです。
              実際の承認ワークフローエンジンは今後実装予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
