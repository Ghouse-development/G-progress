import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Product } from '../types/database'
import { Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react'

export default function ProductMaster() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')

    if (!error && data) {
      setProducts(data as Product[])
    }
  }

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        code: product.code || '',
        description: product.description || ''
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        code: '',
        description: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      code: '',
      description: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('商品名は必須です')
      return
    }

    try {
      if (editingProduct) {
        // 更新
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            code: formData.code || null,
            description: formData.description || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id)

        if (error) throw error
        alert('商品を更新しました')
      } else {
        // 新規作成
        const { error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            code: formData.code || null,
            description: formData.description || null
          })

        if (error) throw error
        alert('商品を追加しました')
      }

      await loadProducts()
      handleCloseModal()
    } catch (error) {
      console.error('Failed to save product:', error)
      alert('商品の保存に失敗しました')
    }
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`「${product.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      alert('商品を削除しました')
      await loadProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('商品の削除に失敗しました')
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
          <h2 className="text-2xl font-light text-black">商品マスタ管理</h2>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          新規商品追加
        </button>
      </div>

      {/* 商品一覧テーブル */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pastel-blue-light">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  商品コード
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  説明
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    商品が登録されていません
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-pastel-blue-light transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.code || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
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

      {/* 商品追加/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProduct ? '商品編集' : '新規商品追加'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    商品名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: スタンダードプラン"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    商品コード
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="例: STD-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="商品の説明を入力してください"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingProduct ? '更新' : '作成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
