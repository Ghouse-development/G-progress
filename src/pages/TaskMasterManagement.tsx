/**
 * タスクマスタ管理ページ（モーダル対応）
 *
 * タスクマスタの一覧表示と編集機能
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TaskMaster } from '../types/database'
import { Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useSimplePermissions } from '../hooks/usePermissions'
import { ORGANIZATION_HIERARCHY } from '../constants/organizationHierarchy'

export default function TaskMasterManagement() {
  const navigate = useNavigate()
  const toast = useToast()
  const { canWrite, canDelete } = useSimplePermissions()
  const [taskMasters, setTaskMasters] = useState<TaskMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskMaster | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    responsible_department: '',
    days_from_contract: 0,
    phase: '契約後',
    purpose: '',
    manual_url: '',
    video_url: '',
    dos: '',
    donts: '',
    is_trigger_task: false,
    trigger_task_id: '',
    days_from_trigger: 0
  })

  useEffect(() => {
    loadTaskMasters()
  }, [])

  const loadTaskMasters = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('task_masters')
      .select('*')
      .order('task_order', { ascending: true })

    if (error) {
      console.error('タスクマスタの読み込みエラー:', error)
      toast.error('タスクマスタの読み込みに失敗しました')
    } else if (data) {
      setTaskMasters(data as any)
    }
    setLoading(false)
  }

  const handleOpenModal = (task?: TaskMaster) => {
    if (task) {
      setEditingTask(task)
      setFormData({
        title: task.title,
        responsible_department: task.responsible_department || '',
        days_from_contract: task.days_from_contract || 0,
        phase: task.phase || '契約後',
        purpose: task.purpose || '',
        manual_url: task.manual_url || '',
        video_url: '',
        dos: task.dos || '',
        donts: task.donts || '',
        is_trigger_task: task.is_trigger_task || false,
        trigger_task_id: task.trigger_task_id || '',
        days_from_trigger: task.days_from_trigger || 0
      })
    } else {
      setEditingTask(null)
      setFormData({
        title: '',
        responsible_department: '',
        days_from_contract: 0,
        phase: '契約後',
        purpose: '',
        manual_url: '',
        video_url: '',
        dos: '',
        donts: '',
        is_trigger_task: false,
        trigger_task_id: '',
        days_from_trigger: 0
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
            days_from_contract: formData.days_from_contract,
            phase: formData.phase,
            purpose: formData.purpose,
            manual_url: formData.manual_url,
            dos: formData.dos,
            donts: formData.donts,
            is_trigger_task: formData.is_trigger_task,
            trigger_task_id: formData.trigger_task_id || null,
            days_from_trigger: formData.days_from_trigger,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id)

        if (error) throw error
        toast.success('タスクマスタを更新しました')
      } else {
        // 新規作成
        const nextTaskOrder = taskMasters.length > 0
          ? Math.max(...taskMasters.map(t => t.task_order || 0)) + 1
          : 1

        const { error } = await supabase.from('task_masters').insert({
          title: formData.title,
          responsible_department: formData.responsible_department,
          days_from_contract: formData.days_from_contract,
          purpose: formData.purpose,
          manual_url: formData.manual_url,
          dos: formData.dos,
          donts: formData.donts,
          phase: formData.phase,
          business_no: 0,
          task_order: nextTaskOrder,
          is_trigger_task: formData.is_trigger_task,
          trigger_task_id: formData.trigger_task_id || null,
          days_from_trigger: formData.days_from_trigger
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
            onClick={() => handleOpenModal()}
            disabled={!canWrite}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            新規タスク追加
          </button>
        </div>
      </div>

      {/* タスク一覧テーブル */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="prisma-table-container">
          <table className="w-full prisma-table">
            <thead className="bg-pastel-blue-light">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  タスク名
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  フェーズ
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  責任部署
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">
                  契約日からの日数
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
                      <div className="text-sm text-gray-600">{task.phase || '未設定'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{task.responsible_department || '未設定'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {task.days_from_contract !== null && task.days_from_contract !== undefined
                          ? `${task.days_from_contract}日`
                          : '未設定'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md truncate">{task.purpose || '未設定'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(task)}
                          disabled={!canWrite}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="編集"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id, task.title)}
                          disabled={!canDelete}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <select
                  value={formData.responsible_department}
                  onChange={(e) => setFormData({ ...formData, responsible_department: e.target.value })}
                  className="prisma-input"
                >
                  <option value="">選択してください</option>
                  {ORGANIZATION_HIERARCHY.map((dept) => (
                    <optgroup key={dept.name} label={dept.name}>
                      {dept.positions.map((pos) => (
                        <option key={`${dept.name}-${pos}`} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* フェーズ */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  フェーズ
                </label>
                <select
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  className="prisma-input"
                >
                  <option value="集客">集客</option>
                  <option value="アポイント取得">アポイント取得</option>
                  <option value="営業">営業</option>
                  <option value="契約">契約</option>
                  <option value="設計">設計</option>
                  <option value="申請">申請</option>
                  <option value="融資">融資</option>
                  <option value="工事準備">工事準備</option>
                  <option value="工事">工事</option>
                  <option value="外構">外構</option>
                  <option value="管理">管理</option>
                  <option value="事務">事務</option>
                  <option value="入金管理">入金管理</option>
                  <option value="契約後">契約後</option>
                </select>
              </div>

              {/* 契約日からの日数 */}
              <div>
                <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                  契約日からの日数
                </label>
                <input
                  type="number"
                  value={formData.days_from_contract}
                  onChange={(e) => setFormData({ ...formData, days_from_contract: parseInt(e.target.value) || 0 })}
                  className="prisma-input"
                  placeholder="例: 7（契約日から7日後）"
                />
                <p className="text-xs text-gray-500 mt-1">
                  契約日から何日後にこのタスクが発生するか
                </p>
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

              {/* トリガー機能 */}
              <div className="border-t-2 border-gray-200 pt-4 mt-4">
                <h3 className="text-base font-bold text-gray-800 mb-3">トリガー設定</h3>

                {/* トリガー設定の有無 */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_trigger_task"
                      checked={formData.is_trigger_task}
                      onChange={(e) => setFormData({ ...formData, is_trigger_task: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_trigger_task" className="text-base font-bold text-gray-800">
                      トリガー設定の有無
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-8">
                    ※ONにすると、他のタスクの起点（トリガー）として選択できるようになります
                  </p>
                </div>

                {/* トリガーを設定する */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="text-base font-bold text-gray-800 mb-3">トリガーを設定する</h4>

                  {/* トリガー選択 */}
                  <div className="mb-4">
                    <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                      トリガー（このタスクの起点となるタスク）
                    </label>
                    <select
                      value={formData.trigger_task_id}
                      onChange={(e) => setFormData({ ...formData, trigger_task_id: e.target.value })}
                      className="prisma-input"
                    >
                      <option value="">トリガーなし（契約日基準）</option>
                      {taskMasters
                        .filter(t => t.is_trigger_task && t.id !== editingTask?.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      トリガータスクを選択すると、そのタスクからの相対日数で期限が設定されます
                    </p>
                  </div>

                  {/* トリガーからの日数 */}
                  {formData.trigger_task_id && (
                    <div>
                      <label className="block prisma-text-sm font-medium text-gray-700 prisma-mb-1">
                        日数（トリガーからの相対日数）
                      </label>
                      <input
                        type="number"
                        value={formData.days_from_trigger}
                        onChange={(e) => setFormData({ ...formData, days_from_trigger: parseInt(e.target.value) || 0 })}
                        className="prisma-input"
                        placeholder="例: 5（トリガーから5日後）、-3（トリガーから3日前）"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        プラス値: トリガー完了から〇日後、マイナス値: トリガー完了から〇日前
                      </p>
                    </div>
                  )}
                </div>
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

    </div>
  )
}
