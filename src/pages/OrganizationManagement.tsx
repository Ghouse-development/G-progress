/**
 * マルチテナント管理画面
 * 組織（本社、フランチャイズ）の作成・編集・削除
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Organization } from '../types/database'
import { Building2, Plus, Edit, Trash2, X, Check, AlertTriangle, CheckCircle, Store } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useSimplePermissions } from '../hooks/usePermissions'

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const toast = useToast()
  const { isAdmin, loading: permissionsLoading } = useSimplePermissions()

  const [formData, setFormData] = useState({
    name: '',
    org_type: 'headquarter' as 'headquarter' | 'franchise',
    org_status: 'active' as 'active' | 'inactive' | 'suspended'
  })

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('組織データ読み込みエラー:', error)
        toast.error(`組織の読み込みに失敗しました: ${error.message}`)
        return
      }
      setOrganizations(data || [])
    } catch (error: any) {
      console.error('Failed to load organizations:', error)
      toast.error(`組織の読み込みに失敗しました: ${error?.message || '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (org?: Organization) => {
    if (org) {
      setEditingOrg(org)
      setFormData({
        name: org.name,
        org_type: org.org_type,
        org_status: org.org_status
      })
    } else {
      setEditingOrg(null)
      setFormData({
        name: '',
        org_type: 'headquarter',
        org_status: 'active'
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingOrg(null)
    setFormData({
      name: '',
      org_type: 'headquarter',
      org_status: 'active'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.warning('組織名を入力してください')
      return
    }

    try {
      if (editingOrg) {
        // 更新
        const { error } = await supabase
          .from('organizations')
          .update({
            name: formData.name,
            org_type: formData.org_type,
            org_status: formData.org_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOrg.id)

        if (error) {
          console.error('組織更新エラー:', error)
          toast.error(`組織の更新に失敗しました: ${error.message}`)
          return
        }
        toast.success('組織を更新しました')
      } else{
        // 新規作成
        const { error } = await supabase
          .from('organizations')
          .insert([{
            name: formData.name,
            org_type: formData.org_type,
            org_status: formData.org_status
          }])

        if (error) {
          console.error('組織作成エラー:', error)
          toast.error(`組織の作成に失敗しました: ${error.message}`)
          return
        }
        toast.success('組織を作成しました')
      }

      await loadOrganizations()
      handleCloseModal()
    } catch (error: any) {
      console.error('Failed to save organization:', error)
      toast.error(`組織の保存に失敗しました: ${error?.message || '不明なエラー'}`)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？\n\n※ この組織に紐づくすべてのデータ（従業員、案件など）も削除されます。`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('組織削除エラー:', error)
        toast.error(`組織の削除に失敗しました: ${error.message}`)
        return
      }
      toast.success('組織を削除しました')
      await loadOrganizations()
    } catch (error: any) {
      console.error('Failed to delete organization:', error)
      toast.error(`組織の削除に失敗しました: ${error?.message || '不明なエラー'}`)
    }
  }

  const getOrgTypeLabel = (type: string) => {
    switch (type) {
      case 'headquarter': return '本社'
      case 'franchise': return 'フランチャイズ'
      default: return type
    }
  }

  const getOrgStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '稼働中'
      case 'inactive': return '停止中'
      case 'suspended': return '一時停止'
      default: return status
    }
  }

  const getOrgStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-lg font-medium text-gray-700">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 管理者チェック
  if (!isAdmin()) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-8 text-center">
            <AlertTriangle size={64} className="mx-auto mb-4 text-yellow-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">アクセス権限がありません</h2>
            <p className="text-gray-700 mb-4">
              この機能は管理者（社長、役員、部門長）のみがアクセスできます。
            </p>
            <p className="text-base text-gray-600">
              アクセスが必要な場合は、システム管理者にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="prisma-header">
        <h1 className="prisma-header-title">マルチテナント管理</h1>
        <div className="prisma-header-actions">
          <button
            onClick={() => handleOpenModal()}
            className="prisma-btn prisma-btn-primary prisma-btn-sm"
          >
            <Plus size={18} />
            新規組織
          </button>
        </div>
      </div>
      <div className="prisma-content">
        <div className="prisma-card mb-4">
          <p className="text-base text-gray-600">組織（本社、フランチャイズ）の管理</p>
        </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* 総組織数 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-300 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-bold text-blue-900">総組織数</p>
            <Building2 className="text-blue-600" size={28} />
          </div>
          <p className="text-3xl font-black text-blue-900">{organizations.length}</p>
        </div>

        {/* 稼働中 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-300 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-bold text-green-900">稼働中</p>
            <CheckCircle className="text-green-600" size={28} />
          </div>
          <p className="text-3xl font-black text-green-900">
            {organizations.filter(o => o.org_status === 'active').length}
          </p>
        </div>

        {/* フランチャイズ */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-300 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-bold text-orange-900">フランチャイズ</p>
            <Store className="text-orange-600" size={28} />
          </div>
          <p className="text-3xl font-black text-orange-900">
            {organizations.filter(o => o.org_type === 'franchise').length}
          </p>
        </div>
      </div>

      {/* 組織一覧 */}
      <div className="bg-white rounded-lg border-2 border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-base font-bold text-gray-900">組織名</th>
              <th className="px-4 py-3 text-left text-base font-bold text-gray-900">種別</th>
              <th className="px-4 py-3 text-left text-base font-bold text-gray-900">ステータス</th>
              <th className="px-4 py-3 text-left text-base font-bold text-gray-900">作成日</th>
              <th className="px-4 py-3 text-right text-base font-bold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-gray-500" />
                    <span className="font-medium text-gray-900">{org.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-3 py-1 rounded-lg text-base font-medium bg-blue-100 text-blue-800 border border-blue-300">
                    {getOrgTypeLabel(org.org_type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-lg text-base font-medium border ${getOrgStatusColor(org.org_status)}`}>
                    {getOrgStatusLabel(org.org_status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(org.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(org)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(org.id, org.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {organizations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Building2 size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">組織が登録されていません</p>
            <p className="text-base">「新規組織」ボタンから組織を追加してください</p>
          </div>
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[600px]">
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingOrg ? '組織の編集' : '新規組織の作成'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="prisma-modal-content space-y-4">
                {/* 組織名 */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">
                    組織名 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="prisma-input"
                    placeholder="例: 株式会社Gハウス本社"
                    required
                  />
                </div>

                {/* 種別 */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">
                    種別 <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.org_type}
                    onChange={(e) => setFormData({ ...formData, org_type: e.target.value as any })}
                    className="prisma-select"
                  >
                    <option value="headquarter">本社</option>
                    <option value="franchise">フランチャイズ</option>
                  </select>
                </div>

                {/* ステータス */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">
                    ステータス <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.org_status}
                    onChange={(e) => setFormData({ ...formData, org_status: e.target.value as any })}
                    className="prisma-select"
                  >
                    <option value="active">稼働中</option>
                    <option value="inactive">停止中</option>
                    <option value="suspended">一時停止</option>
                  </select>
                </div>
              </div>

              <div className="prisma-modal-footer">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="prisma-btn prisma-btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="prisma-btn prisma-btn-primary flex items-center gap-2"
                >
                  <Check size={18} />
                  {editingOrg ? '更新' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
