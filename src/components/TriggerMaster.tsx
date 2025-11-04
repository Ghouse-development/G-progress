import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { Trigger } from '../types/database'

interface TriggerMasterProps {
  onClose: () => void
}

export default function TriggerMaster({ onClose }: TriggerMasterProps) {
  const toast = useToast()
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null)
  const [formData, setFormData] = useState({
    name: ''
  })

  useEffect(() => {
    loadTriggers()
  }, [])

  const loadTriggers = async () => {
    const { data } = await supabase
      .from('triggers')
      .select('*')
      .order('name')

    if (data) {
      setTriggers(data as Trigger[])
    }
  }

  const handleOpenModal = (trigger?: Trigger) => {
    if (trigger) {
      setEditingTrigger(trigger)
      setFormData({
        name: trigger.name
      })
    } else {
      setEditingTrigger(null)
      setFormData({
        name: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTrigger(null)
    setFormData({
      name: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.warning('トリガー名は必須です')
      return
    }

    try {
      if (editingTrigger) {
        // 更新
        const { error } = await supabase
          .from('triggers')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTrigger.id)

        if (error) throw error
        toast.success('トリガーを更新しました')
      } else {
        // 新規作成
        const { error } = await supabase
          .from('triggers')
          .insert({
            name: formData.name
          })

        if (error) throw error
        toast.success('トリガーを追加しました')
      }

      await loadTriggers()
      handleCloseModal()
    } catch (error) {
      toast.error('トリガーの保存に失敗しました')
    }
  }

  const handleDelete = async (trigger: Trigger) => {
    if (!confirm(`「${trigger.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('triggers')
        .delete()
        .eq('id', trigger.id)

      if (error) throw error

      toast.success('トリガーを削除しました')
      await loadTriggers()
    } catch (error) {
      toast.error('トリガーの削除に失敗しました')
    }
  }

  return (
    <div className="prisma-modal-overlay">
      <div className="prisma-modal max-w-[500px]">
        {/* ヘッダー */}
        <div className="prisma-modal-header">
          <div className="flex items-center justify-between">
            <h2 className="prisma-modal-title">トリガーマスタ管理</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="prisma-modal-content">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base text-gray-600">
              タスクのトリガーとなる日付を管理します
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base"
            >
              <Plus size={16} />
              追加
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <colgroup>
                <col />
                <col style={{ width: '100px' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-base font-bold text-gray-800">
                    トリガー名
                  </th>
                  <th className="px-4 py-2 text-center text-base font-bold text-gray-800">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {triggers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-500 text-base">
                      トリガーが登録されていません
                    </td>
                  </tr>
                ) : (
                  triggers.map((trigger) => (
                    <tr key={trigger.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-base font-medium text-gray-900">
                        {trigger.name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenModal(trigger)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="編集"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(trigger)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="削除"
                          >
                            <Trash2 size={16} />
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

        {/* フッター */}
        <div className="prisma-modal-footer">
          <button
            onClick={onClose}
            className="prisma-btn prisma-btn-secondary"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* トリガー追加/編集モーダル */}
      {showModal && (
        <div className="prisma-modal-overlay z-[60]">
          <div className="prisma-modal max-w-[400px]">
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingTrigger ? 'トリガー編集' : '新規トリガー追加'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="prisma-modal-content">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  トリガー名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 請負契約日"
                  className="prisma-input"
                />
              </div>
            </div>

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
                {editingTrigger ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
