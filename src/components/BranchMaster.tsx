import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { Branch } from '../types/database'

export default function BranchMaster() {
  const navigate = useNavigate()
  const toast = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState({
    name: ''
  })

  useEffect(() => {
    loadBranches()
  }, [])

  const loadBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name')

    if (!error && data) {
      setBranches(data as Branch[])
    }
  }

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        name: branch.name
      })
    } else {
      setEditingBranch(null)
      setFormData({
        name: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBranch(null)
    setFormData({
      name: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.warning('拠点名は必須です')
      return
    }

    try {
      if (editingBranch) {
        // 更新
        const { error } = await supabase
          .from('branches')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBranch.id)

        if (error) throw error
        toast.success('拠点を更新しました')
      } else {
        // 新規作成
        const { error } = await supabase
          .from('branches')
          .insert({
            name: formData.name
          })

        if (error) throw error
        toast.success('拠点を追加しました')
      }

      await loadBranches()
      handleCloseModal()
    } catch (error) {
      toast.error('拠点の保存に失敗しました')
    }
  }

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`「${branch.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branch.id)

      if (error) throw error

      toast.success('拠点を削除しました')
      await loadBranches()
    } catch (error) {
      toast.error('拠点の削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            title="前の画面に戻る"
          >
            <ArrowLeft size={20} />
            戻る
          </button>
          <h2 className="text-2xl font-light text-black">拠点マスタ管理</h2>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          新規拠点追加
        </button>
      </div>

      {/* 拠点一覧テーブル */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pastel-blue-light">
              <tr>
                <th className="px-6 py-3 text-left text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  拠点名
                </th>
                <th className="px-6 py-3 text-center text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                    拠点が登録されていません
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-pastel-blue-light transition-colors">
                    <td className="px-6 py-4 text-base font-bold text-gray-900">
                      {branch.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(branch)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(branch)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 拠点追加/編集モーダル */}
      {showModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[450px]">
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingBranch ? '拠点編集' : '新規拠点追加'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  拠点名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 東京本社"
                  className="prisma-input"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={handleCloseModal}
                className="prisma-btn prisma-btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                className="prisma-btn prisma-btn-primary"
              >
                {editingBranch ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
