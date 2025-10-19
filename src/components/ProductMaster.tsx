import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Product } from '../types/database'
import { Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useSettings } from '../contexts/SettingsContext'
import { generateDemoProducts } from '../utils/demoData'

export default function ProductMaster() {
  const navigate = useNavigate()
  const toast = useToast()
  const { demoMode } = useSettings()
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
  }, [demoMode])

  const loadProducts = async () => {
    if (demoMode) {
      // デモモード：サンプルデータを使用
      setProducts(generateDemoProducts())
      return
    }

    // 通常モード：Supabaseからデータを取得
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
      toast.warning('商品名は必須です')
      return
    }

    try {
      if (demoMode) {
        // デモモード：ローカルステートのみ更新
        if (editingProduct) {
          setProducts(prevProducts =>
            prevProducts.map(p =>
              p.id === editingProduct.id
                ? { ...p, name: formData.name, code: formData.code || undefined, description: formData.description || undefined, updated_at: new Date().toISOString() }
                : p
            )
          )
          toast.success('商品を更新しました（デモモード）')
        } else {
          const newProduct: Product = {
            id: `demo-product-${Date.now()}`,
            name: formData.name,
            code: formData.code || undefined,
            description: formData.description || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setProducts(prevProducts => [...prevProducts, newProduct])
          toast.success('商品を追加しました（デモモード）')
        }
        handleCloseModal()
        return
      }

      // 通常モード：Supabaseを更新
      if (editingProduct) {
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
        toast.success('商品を更新しました')
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            code: formData.code || null,
            description: formData.description || null
          })

        if (error) throw error
        toast.success('商品を追加しました')
      }

      await loadProducts()
      handleCloseModal()
    } catch (error) {
      console.error('Failed to save product:', error)
      toast.error('商品の保存に失敗しました')
    }
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`「${product.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      if (demoMode) {
        // デモモード：ローカルステートのみ更新
        setProducts(prevProducts => prevProducts.filter(p => p.id !== product.id))
        toast.success('商品を削除しました（デモモード）')
        return
      }

      // 通常モード：Supabaseを更新
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      toast.success('商品を削除しました')
      await loadProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast.error('商品の削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            title="前の画面に戻る"
          >
            <ArrowLeft size={20} />
            戻る
          </button>
          <h2 className="text-2xl font-light text-black dark:text-gray-100">商品マスタ管理</h2>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pastel-blue-light">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  商品コード
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  説明
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    商品が登録されていません
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-pastel-blue-light dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {product.code || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {product.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
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
        <div className="prisma-modal-overlay">
          <div className="prisma-modal" style={{ maxWidth: '600px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingProduct ? '商品編集' : '新規商品追加'}
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
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: スタンダードプラン"
                  className="prisma-input"
                />
              </div>

              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  商品コード
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="例: STD-001"
                  className="prisma-input"
                />
              </div>

              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 dark:text-gray-300 prisma-mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="商品の説明を入力してください"
                  rows={3}
                  className="prisma-input resize-none"
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
                {editingProduct ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
