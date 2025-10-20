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

const phaseOptions = [
  '契約',
  '設計',
  '申請',
  '融資',
  '工事準備',
  '工事',
  '外構',
  '管理',
  '事務',
  '入金管理'
]

export default function TaskMasterManagement() {
  const { showToast } = useToast()
  const [taskMasters, setTaskMasters] = useState<TaskMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskMaster | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    responsible_department: '',
    days_from_contract: 0,
    phase: '契約後',
    description: ''
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
        .order('task_order', { ascending: true })

      if (error) throw error
      setTaskMasters(data || [])
    } catch (error) {
      console.error('Failed to load task masters:', error)
      showToast('タスクマスタの読み込みに失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('タスク名は必須です', 'warning')
      return
    }

    if (!formData.responsible_department) {
      showToast('担当部署は必須です', 'warning')
      return
    }

    try {
      const taskData = {
        title: formData.title,
        responsible_department: formData.responsible_department,
        days_from_contract: formData.days_from_contract,
        business_no: 1,
        task_order: editingTask ? editingTask.task_order : (taskMasters.length + 1),
        phase: formData.phase,
        description: formData.description
      }

      if (editingTask) {
        const { error } = await supabase
          .from('task_masters')
          .update(taskData)
          .eq('id', editingTask.id)

        if (error) throw error
        showToast('タスクマスタを更新しました', 'success')
      } else {
        const { error } = await supabase
          .from('task_masters')
          .insert(taskData)

        if (error) throw error
        showToast('タスクマスタを作成しました', 'success')
      }

      await loadTaskMasters()
      handleCloseModal()
    } catch (error) {
      console.error('Failed to save task master:', error)
      showToast('タスクマスタの保存に失敗しました', 'error')
    }
  }

  const handleEdit = (task: TaskMaster) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      responsible_department: task.responsible_department || '',
      days_from_contract: task.days_from_contract || 0,
      phase: task.phase || '契約後',
      description: task.description || ''
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
      showToast('タスクマスタを削除しました', 'success')
      await loadTaskMasters()
    } catch (error) {
      console.error('Failed to delete task master:', error)
      showToast('タスクマスタの削除に失敗しました', 'error')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTask(null)
    setFormData({
      title: '',
      responsible_department: '',
      days_from_contract: 0,
      phase: '契約後',
      description: ''
    })
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">タスク管理マスタ</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg border-2 border-black hover:bg-blue-700 transition-colors font-bold text-lg shadow-lg"
        >
          <Plus size={24} />
          新規タスク追加
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg border-3 border-black shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-100 to-blue-50 border-b-3 border-black">
              <tr>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">タスク名</th>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">フェーズ</th>
                <th className="px-6 py-4 text-left text-base font-bold text-gray-900">担当部署</th>
                <th className="px-6 py-4 text-center text-base font-bold text-gray-900">契約日からの日数</th>
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
              ) : taskMasters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-base">
                    タスクマスタが登録されていません
                  </td>
                </tr>
              ) : (
                taskMasters.map((task) => (
                  <tr key={task.id} className="border-b-2 border-gray-200 hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-base text-gray-900 font-bold">{task.title}</td>
                    <td className="px-6 py-4 text-base text-gray-700 font-medium">{task.phase || '-'}</td>
                    <td className="px-6 py-4 text-base text-gray-700 font-medium">{task.responsible_department || '-'}</td>
                    <td className="px-6 py-4 text-center text-lg text-gray-900 font-bold">
                      {task.days_from_contract !== null && task.days_from_contract !== undefined ? (
                        <>
                          {task.days_from_contract > 0 ? '+' : ''}
                          {task.days_from_contract}日
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-600"
                          title="編集"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
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
          <div className="prisma-modal" style={{ maxWidth: '700px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingTask ? 'タスクマスタ編集' : '新規タスクマスタ'}
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
              {/* タスク名 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  タスク名 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例: 請負契約"
                  className="prisma-input"
                />
              </div>

              {/* 担当部署 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  担当部署 <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.responsible_department}
                  onChange={(e) => setFormData({ ...formData, responsible_department: e.target.value })}
                  className="prisma-select"
                >
                  <option value="">選択してください</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* フェーズ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  フェーズ
                </label>
                <select
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  className="prisma-select"
                >
                  {phaseOptions.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>

              {/* 契約日からの日数 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  契約日からの日数
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formData.days_from_contract}
                    onChange={(e) => setFormData({ ...formData, days_from_contract: parseInt(e.target.value) || 0 })}
                    className="prisma-input"
                    style={{ width: '120px' }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">日</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  契約日から何日後にこのタスクが発生するか（例: 7なら契約日の7日後）
                </p>
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="タスクの詳細説明を入力してください"
                  className="prisma-input resize-none"
                  rows={3}
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
                {editingTask ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
