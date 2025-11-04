import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface Department {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

export default function DepartmentMaster() {
  const navigate = useNavigate()
  const toast = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: ''
  })

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (!error && data) {
      setDepartments(data as Department[])
    }
  }

  const handleOpenModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department)
      setFormData({
        name: department.name
      })
    } else {
      setEditingDepartment(null)
      setFormData({
        name: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingDepartment(null)
    setFormData({
      name: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.warning('部門名は必須です')
      return
    }

    try {
      if (editingDepartment) {
        // 更新
        const { error } = await supabase
          .from('departments')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDepartment.id)

        if (error) throw error
        toast.success('部門を更新しました')
      } else {
        // 新規作成
        const { error } = await supabase
          .from('departments')
          .insert({
            name: formData.name
          })

        if (error) throw error
        toast.success('部門を追加しました')
      }

      await loadDepartments()
      handleCloseModal()
    } catch (error) {
      toast.error('部門の保存に失敗しました')
    }
  }

  const handleDelete = async (department: Department) => {
    if (!confirm(`「${department.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id)

      if (error) throw error

      toast.success('部門を削除しました')
      await loadDepartments()
    } catch (error) {
      toast.error('部門の削除に失敗しました')
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
          <h2 className="text-2xl font-light text-black">部門マスタ管理</h2>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          新規部門追加
        </button>
      </div>

      {/* 部門一覧テーブル */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <colgroup>
              <col />
              <col style={{ width: '150px' }} />
            </colgroup>
            <thead className="bg-pastel-blue-light">
              <tr>
                <th className="px-6 py-3 text-left text-base font-bold text-gray-800 uppercase tracking-wider">
                  部門名
                </th>
                <th className="px-6 py-3 text-center text-base font-bold text-gray-800 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                    部門が登録されていません
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id} className="hover:bg-pastel-blue-light transition-colors">
                    <td className="px-6 py-4 text-base font-bold text-gray-900">
                      {department.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(department)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(department)}
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

      {/* 部門追加/編集モーダル */}
      {showModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[450px]">
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingDepartment ? '部門編集' : '新規部門追加'}
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
                  部門名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 営業部"
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
                {editingDepartment ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
