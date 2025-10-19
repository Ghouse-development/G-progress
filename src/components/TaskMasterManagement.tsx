import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TaskMaster, Department } from '../types/database'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

const departments: Department[] = [
  '営業',
  '営業事務',
  'ローン事務',
  '実施設計',
  '意匠設計',
  '申請設計',
  '構造設計',
  'IC',
  '工事',
  '発注・積算',
  '工事事務',
  '外構設計',
  '外構工事'
]

const triggerTypes = [
  { value: 'contract', label: '契約日' },
  { value: 'construction_start', label: '着工日' },
  { value: 'roof_raising', label: '上棟日' }
]

export default function TaskMasterManagement() {
  const toast = useToast()
  const [taskMasters, setTaskMasters] = useState<TaskMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskMaster | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    responsible_department: '',
    trigger_type: 'contract',
    days_from_trigger: 0
  })

  useEffect(() => {
    loadTaskMasters()
  }, [])

  const loadTaskMasters = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('task_masters')
        .select('*')
        .order('days_from_contract', { ascending: true })

      if (error) throw error
      setTaskMasters(data || [])
    } catch (error) {
      console.error('Failed to load task masters:', error)
      toast.error('タスクマスタの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.warning('タスク名は必須です')
      return
    }

    if (!formData.responsible_department) {
      toast.warning('担当部署は必須です')
      return
    }

    try {
      const taskData = {
        title: formData.title,
        responsible_department: formData.responsible_department,
        days_from_contract: formData.days_from_trigger,
        business_no: 1,
        task_order: taskMasters.length + 1,
        phase: '契約後'
      }

      if (editingTask) {
        const { error } = await supabase
          .from('task_masters')
          .update(taskData)
          .eq('id', editingTask.id)

        if (error) throw error
        toast.success('タスクマスタを更新しました')
      } else {
        const { error } = await supabase
          .from('task_masters')
          .insert(taskData)

        if (error) throw error
        toast.success('タスクマスタを作成しました')
      }

      await loadTaskMasters()
      handleCloseModal()
    } catch (error) {
      console.error('Failed to save task master:', error)
      toast.error('タスクマスタの保存に失敗しました')
    }
  }

  const handleEdit = (task: TaskMaster) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      responsible_department: task.responsible_department || '',
      trigger_type: 'contract',
      days_from_trigger: task.days_from_contract || 0
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このタスクマスタを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('task_masters')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('タスクマスタを削除しました')
      await loadTaskMasters()
    } catch (error) {
      console.error('Failed to delete task master:', error)
      toast.error('タスクマスタの削除に失敗しました')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTask(null)
    setFormData({
      title: '',
      responsible_department: '',
      trigger_type: 'contract',
      days_from_trigger: 0
    })
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">タスク管理マスタ</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          新規タスク追加
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg border-2 border-gray-300 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-100 to-blue-50 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">タスク名</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">担当部署</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">期日トリガー</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">トリガーからの日数</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : taskMasters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    タスクマスタが登録されていません
                  </td>
                </tr>
              ) : (
                taskMasters.map((task) => (
                  <tr key={task.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{task.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.responsible_department || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">契約日</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 font-bold">
                      {task.days_from_contract !== null && task.days_from_contract !== undefined ? (
                        <>
                          {task.days_from_contract > 0 ? '+' : ''}
                          {task.days_from_contract}日
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
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

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full border-2 border-gray-300">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTask ? 'タスクマスタ編集' : '新規タスクマスタ'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="px-5 py-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* タスク名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タスク名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例: 請負契約"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 担当部署 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  担当部署 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.responsible_department}
                  onChange={(e) => setFormData({ ...formData, responsible_department: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 期日トリガー */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期日トリガー
                </label>
                <select
                  value={formData.trigger_type}
                  onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {triggerTypes.map((trigger) => (
                    <option key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* トリガーからの日数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  トリガーからの日数
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.days_from_trigger}
                    onChange={(e) => setFormData({ ...formData, days_from_trigger: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                  />
                  <span className="text-sm text-gray-600">日後</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  負の値で前、正の値で後（例: -7なら7日前）
                </p>
              </div>
            </div>

            {/* フッター */}
            <div className="flex gap-2 px-5 py-3 border-t-2 border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {editingTask ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
