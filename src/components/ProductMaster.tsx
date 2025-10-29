import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Product } from '../types/database'
import { Plus, Edit2, Trash2, X, GripVertical } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useSimplePermissions } from '../hooks/usePermissions'

export default function ProductMaster() {
  const { showToast } = useToast()
  const { canWrite, canDelete } = useSimplePermissions()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    is_active: true,
    display_order: 0
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      showToast('商品マスタの読み込みに失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showToast('商品名は必須です', 'warning')
      return
    }

    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        is_active: formData.is_active,
        display_order: editingProduct ? editingProduct.display_order : products.length
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (error) throw error
        showToast('商品マスタを更新しました', 'success')
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData)

        if (error) throw error
        showToast('商品マスタを作成しました', 'success')
      }

      await loadProducts()
      handleCloseModal()
    } catch (error: any) {
      if (error.code === '23505') {
        showToast('この商品名は既に登録されています', 'error')
      } else {
        showToast('商品マスタの保存に失敗しました', 'error')
      }
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category || '',
      description: product.description || '',
      is_active: product.is_active,
      display_order: product.display_order
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この商品マスタを削除してもよろしいですか？\n\n※この商品を使用している案件がある場合は削除できません。')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === '23503') {
          showToast('この商品を使用している案件があるため削除できません', 'error')
        } else {
          throw error
        }
        return
      }

      showToast('商品マスタを削除しました', 'success')
      await loadProducts()
    } catch (error) {
      showToast('商品マスタの削除に失敗しました', 'error')
    }
  }

  const handleDragStart = (product: Product) => {
    setDraggedProduct(product)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetProduct: Product) => {
    if (!draggedProduct || draggedProduct.id === targetProduct.id) {
      setDraggedProduct(null)
      return
    }

    try {
      const draggedIndex = products.findIndex(p => p.id === draggedProduct.id)
      const targetIndex = products.findIndex(p => p.id === targetProduct.id)

      // ローカルで並び替え
      const newProducts = [...products]
      newProducts.splice(draggedIndex, 1)
      newProducts.splice(targetIndex, 0, draggedProduct)

      // display_orderを更新
      const updates = newProducts.map((product, index) => ({
        id: product.id,
        display_order: index
      }))

      // バッチ更新
      for (const update of updates) {
        await supabase.from('products').update({ display_order: update.display_order }).eq('id', update.id)
      }

      await loadProducts()
      showToast('並び順を変更しました', 'success')
    } catch (error) {
      showToast('並び順の変更に失敗しました', 'error')
    } finally {
      setDraggedProduct(null)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      category: '',
      description: '',
      is_active: true,
      display_order: products.length
    })
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">商品マスタ</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg border-2 border-black hover:bg-blue-700 transition-colors font-bold text-lg shadow-lg"
        >
          <Plus size={24} />
          新規商品追加
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg border border-gray-300 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-100 to-purple-50 border-b border-gray-300">
              <tr>
                <th className="px-2 py-4 text-center text-base font-bold text-gray-900 w-12"></th>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">商品名</th>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">カテゴリ</th>
                <th className="px-6 py-4 text-center text-base font-bold text-gray-900">有効/無効</th>
                <th className="px-6 py-4 text-center text-base font-bold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-base">
                    読み込み中...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-base">
                    商品マスタが登録されていません
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    draggable
                    onDragStart={() => handleDragStart(product)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(product)}
                    className={`border-b-2 border-gray-200 hover:bg-purple-50 transition-colors cursor-move ${
                      draggedProduct?.id === product.id ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-2 py-4 text-center">
                      <GripVertical size={20} className="text-gray-400 mx-auto" />
                    </td>
                    <td className="px-6 py-4 text-base text-gray-900 font-bold">{product.name}</td>
                    <td className="px-6 py-4 text-base text-gray-700 font-medium">{product.category || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-base font-bold ${
                        product.is_active
                          ? 'bg-green-100 text-green-800 border-2 border-green-600'
                          : 'bg-gray-100 text-gray-600 border-2 border-gray-400'
                      }`}>
                        {product.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-600"
                          title="編集"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors border-2 border-red-600"
                          title="削除"
                        >
                          <Trash2 size={20} />
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

      {/* モーダル */}
      {showModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal max-w-[600px]">
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingProduct ? '商品マスタ編集' : '新規商品マスタ'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              {/* 商品名 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  商品名 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: LIFE Limited"
                  className="prisma-input"
                />
              </div>

              {/* カテゴリ */}
              <div>
                <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  カテゴリ
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="prisma-select"
                >
                  <option value="">選択してください</option>
                  <option value="注文住宅">注文住宅</option>
                  <option value="規格住宅">規格住宅</option>
                  <option value="モデルハウス">モデルハウス</option>
                  <option value="建売">建売</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              {/* 商品説明 */}
              <div>
                <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  商品説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="商品の特徴や説明を入力してください"
                  className="prisma-input resize-none"
                  rows={4}
                />
              </div>

              {/* 有効/無効 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-base font-medium text-gray-700 dark:text-gray-300">
                  この商品を有効にする
                </label>
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
                {editingProduct ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
