/**
 * タスクマスタ管理ページ（モーダル対応）
 *
 * タスクマスタの一覧表示と編集機能
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TaskMaster, Trigger } from '../types/database'
import { Plus, Edit2, Trash2, X, ArrowLeft, Settings } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import TriggerMaster from '../components/TriggerMaster'

export default function TaskMasterManagement() {
  const navigate = useNavigate()
  const toast = useToast()
  const [taskMasters, setTaskMasters] = useState<TaskMaster[]>([])
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTriggerMaster, setShowTriggerMaster] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskMaster | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    responsible_department: '',
    trigger_id: '',
    days_from_trigger: 0,
    purpose: '',
    manual_url: '',
    video_url: '',
    dos: '',
    donts: ''
  })

  useEffect(() => {
    loadTaskMasters()
    loadTriggers()
  }, [])

  const loadTaskMasters = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('task_masters')
      .select('*, trigger:triggers(*)')
      .order('days_from_trigger', { ascending: true })

    if (data) {
      setTaskMasters(data as any)
    }
    setLoading(false)
  }

  const loadTriggers = async () => {
    const { data } = await supabase
      .from('triggers')
      .select('*')
      .order('name')

    if (data) {
      setTriggers(data as Trigger[])
    }
  }

  const handleOpenModal = (task?: TaskMaster) => {
    if (task) {
      setEditingTask(task)
      setFormData({
        title: task.title,
        responsible_department: task.responsible_department || '',
        trigger_id: task.trigger_id || (triggers.length > 0 ? triggers[0].id : ''),
        days_from_trigger: task.days_from_trigger || task.days_from_contract || 0,
        purpose: task.purpose || '',
        manual_url: task.manual_url || '',
        video_url: '',
        dos: task.dos || '',
        donts: task.donts || ''
      })
    } else {
      setEditingTask(null)
      setFormData({
        title: '',
        responsible_department: '',
        trigger_id: triggers.length > 0 ? triggers[0].id : '',
        days_from_trigger: 0,
        purpose: '',
        manual_url: '',
        video_url: '',
        dos: '',
        donts: ''
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.warning('タスク名を入力してください')
      return
    }

    try {
      if (editingTask) {
        // 更新
        const { error } = await supabase
          .from('task_masters')
          .update({
            title: formData.title,
            responsible_department: formData.responsible_department,
            trigger_id: formData.trigger_id || null,
            days_from_trigger: formData.days_from_trigger,
            purpose: formData.purpose,
            manual_url: formData.manual_url,
            dos: formData.dos,
            donts: formData.donts,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id)

        if (error) throw error
        toast.success('タスクマスタを更新しました')
      } else {
        // 新規作成
        const { error } = await supabase.from('task_masters').insert({
          title: formData.title,
          responsible_department: formData.responsible_department,
          trigger_id: formData.trigger_id || null,
          days_from_trigger: formData.days_from_trigger,
          purpose: formData.purpose,
          manual_url: formData.manual_url,
          dos: formData.dos,
          donts: formData.donts,
          phase: '未設定',
          business_no: 0,
          task_order: 0
        })

        if (error) throw error
        toast.success('タスクマスタを追加しました')
      }

      setShowModal(false)
      await loadTaskMasters()
    } catch (error) {
      console.error('Failed to save task master:', error)
      toast.error('タスクマスタの保存に失敗しました')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除してもよろしいですか？`)) {
      return
    }

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

  if (loading) {
    return <div className="p-4">読み込み中...</div>
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
          <h2 className="text-2xl font-light text-black">タスクマスタ管理</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTriggerMaster(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            title="トリガーマスタ管理"
          >
            <Settings size={20} />
            トリガーマスタ
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            新規タスク追加
          </button>
        </div>
      </div>

      {/* タスク一覧テーブル */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pastel-blue-light">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  タスク名
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  責任部署
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  トリガー
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">
                  トリガーからの日数
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  目的
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {taskMasters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    タスクマスタが登録されていません
                  </td>
                </tr>
              ) : (
                taskMasters.map((task) => (
                  <tr key={task.id} className="hover:bg-pastel-blue-light transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{task.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{task.responsible_department || '未設定'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{task.trigger?.name || '未設定'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">{task.days_from_trigger || task.days_from_contract || 0}日</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md truncate">{task.purpose || '未設定'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(task)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id, task.title)}
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

      {/* 編集モーダル */}
      {showModal && (
        <div className="prisma-modal-overlay">
          <div className="prisma-modal" style={{ maxWidth: '700px' }}>
            {/* ヘッダー */}
            <div className="prisma-modal-header">
              <div className="flex items-center justify-between">
                <h2 className="prisma-modal-title">
                  {editingTask ? 'タスクマスタ編集' : 'タスクマスタ新規作成'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="prisma-modal-content space-y-4">
              {/* タスク名 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  タスク名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="prisma-input"
                  placeholder="例: 契約書作成"
                />
              </div>

              {/* 責任部署 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  責任部署
                </label>
                <input
                  type="text"
                  value={formData.responsible_department}
                  onChange={(e) => setFormData({ ...formData, responsible_department: e.target.value })}
                  className="prisma-input"
                  placeholder="例: 営業部"
                />
              </div>

              {/* トリガー */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  トリガー
                </label>
                <select
                  value={formData.trigger_id}
                  onChange={(e) => setFormData({ ...formData, trigger_id: e.target.value })}
                  className="prisma-input"
                >
                  <option value="">トリガーを選択</option>
                  {triggers.map((trigger) => (
                    <option key={trigger.id} value={trigger.id}>
                      {trigger.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* トリガーからの日数 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  トリガーからの日数
                </label>
                <input
                  type="number"
                  value={formData.days_from_trigger}
                  onChange={(e) => setFormData({ ...formData, days_from_trigger: parseInt(e.target.value) || 0 })}
                  className="prisma-input"
                  placeholder="例: 3"
                />
              </div>

              {/* 目的 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  目的
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="prisma-textarea"
                  rows={3}
                  placeholder="このタスクの目的を記述"
                />
              </div>

              {/* マニュアルURL */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  マニュアルURL
                </label>
                <input
                  type="url"
                  value={formData.manual_url}
                  onChange={(e) => setFormData({ ...formData, manual_url: e.target.value })}
                  className="prisma-input"
                  placeholder="https://..."
                />
              </div>

              {/* 動画URL */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  動画URL
                </label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="prisma-input"
                  placeholder="https://..."
                />
              </div>

              {/* Do's */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  Do's（推奨事項）
                </label>
                <textarea
                  value={formData.dos}
                  onChange={(e) => setFormData({ ...formData, dos: e.target.value })}
                  className="prisma-textarea"
                  rows={3}
                  placeholder="推奨される作業方法"
                />
              </div>

              {/* Don'ts */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  Don'ts（禁止事項）
                </label>
                <textarea
                  value={formData.donts}
                  onChange={(e) => setFormData({ ...formData, donts: e.target.value })}
                  className="prisma-textarea"
                  rows={3}
                  placeholder="避けるべき作業方法"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="prisma-modal-footer">
              <button
                onClick={() => setShowModal(false)}
                className="prisma-btn prisma-btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="prisma-btn prisma-btn-primary"
              >
                {editingTask ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トリガーマスタモーダル */}
      {showTriggerMaster && (
        <TriggerMaster
          onClose={() => {
            setShowTriggerMaster(false)
            loadTriggers() // トリガーを再読み込み
          }}
        />
      )}
    </div>
  )
}
