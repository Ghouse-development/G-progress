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
  const [daysFromTriggerInput, setDaysFromTriggerInput] = useState<string>('') // 入力フィールド用の文字列ステート
  const [selectedPosition, setSelectedPosition] = useState<string>('全職種') // 職種フィルタ（初期値: 全職種）
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null) // ドラッグ中のタスクID
  const [formData, setFormData] = useState({
    title: '',
    responsible_department: '',
    days_from_contract: 0,
    phase: '内定',
    purpose: '',
    manual_url: '',
    dos: '',
    donts: '',
    is_trigger_task: false,
    trigger_task_id: '',
    days_from_trigger: 0,
    show_in_progress: true // デフォルトで進捗管理表に掲載
  })

  useEffect(() => {
    loadTaskMasters()
  }, [])

  const loadTaskMasters = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('task_masters')
      .select('*')
      .order('days_from_contract', { ascending: true })

    if (error) {
      toast.error('タスクマスタの読み込みに失敗しました')
    } else if (data) {
      setTaskMasters(data as any)
    }
    setLoading(false)
  }

  // 契約日からの日数を再帰的に計算
  const calculateDaysFromContract = (taskId: string | null, daysFromTrigger: number = 0): number => {
    if (!taskId) {
      return daysFromTrigger
    }
    const triggerTask = taskMasters.find(t => t.id === taskId)
    if (!triggerTask) {
      return daysFromTrigger
    }
    if (triggerTask.trigger_task_id) {
      // 再帰的に計算
      return calculateDaysFromContract(triggerTask.trigger_task_id, (triggerTask.days_from_trigger || 0) + daysFromTrigger)
    } else {
      // トリガーなしの場合は、そのタスクのdays_from_contractを基準に
      return (triggerTask.days_from_contract || 0) + daysFromTrigger
    }
  }

  const handleOpenModal = (task?: TaskMaster) => {
    if (task) {
      setEditingTask(task)
      setDaysFromTriggerInput(task.days_from_trigger?.toString() || '0')
      setFormData({
        title: task.title,
        responsible_department: task.responsible_department || '',
        days_from_contract: task.days_from_contract || 0,
        phase: task.phase || '契約後',
        purpose: task.purpose || '',
        manual_url: task.manual_url || '',
        dos: task.dos || '',
        donts: task.donts || '',
        is_trigger_task: task.is_trigger_task || false,
        trigger_task_id: task.trigger_task_id || '',
        days_from_trigger: task.days_from_trigger || 0,
        show_in_progress: task.show_in_progress !== undefined ? task.show_in_progress : true
      })
    } else {
      setEditingTask(null)
      setDaysFromTriggerInput('0')
      setFormData({
        title: '',
        responsible_department: '',
        days_from_contract: 0,
        phase: '内定',
        purpose: '',
        manual_url: '',
        dos: '',
        donts: '',
        is_trigger_task: false,
        trigger_task_id: '',
        days_from_trigger: 0,
        show_in_progress: true
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.warning('タスク名を入力してください')
      return
    }

    if (!formData.phase) {
      toast.warning('フェーズを選択してください')
      return
    }

    if (!formData.responsible_department) {
      toast.warning('責任職種を選択してください')
      return
    }

    // トリガーなしの場合は、days_from_contractが必須
    if (!formData.trigger_task_id && (formData.days_from_contract === null || formData.days_from_contract === undefined)) {
      toast.warning('トリガーを設定しない場合は、トリガーからの日数を設定してください')
      return
    }

    // 契約日からの日数を計算
    const calculatedDaysFromContract = formData.trigger_task_id
      ? calculateDaysFromContract(formData.trigger_task_id, formData.days_from_trigger)
      : formData.days_from_contract

    try {
      if (editingTask) {
        // 更新
        const { error } = await supabase
          .from('task_masters')
          .update({
            title: formData.title,
            responsible_department: formData.responsible_department,
            days_from_contract: calculatedDaysFromContract,
            phase: formData.phase,
            purpose: formData.purpose,
            manual_url: formData.manual_url,
            dos: formData.dos,
            donts: formData.donts,
            is_trigger_task: formData.is_trigger_task,
            trigger_task_id: formData.trigger_task_id?.trim() || null,
            days_from_trigger: formData.days_from_trigger,
            show_in_progress: formData.show_in_progress,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id)

        if (error) {
          toast.error(`タスクマスタの更新に失敗しました: ${error.message}`)
          return
        }
        toast.success('タスクマスタを更新しました')
      } else {
        // 新規作成
        const nextTaskOrder = taskMasters.length > 0
          ? Math.max(...taskMasters.map(t => t.task_order || 0)) + 1
          : 1

        const { error } = await supabase.from('task_masters').insert({
          title: formData.title,
          responsible_department: formData.responsible_department,
          days_from_contract: calculatedDaysFromContract,
          purpose: formData.purpose,
          manual_url: formData.manual_url,
          dos: formData.dos,
          donts: formData.donts,
          phase: formData.phase,
          business_no: 0,
          task_order: nextTaskOrder,
          is_trigger_task: formData.is_trigger_task,
          trigger_task_id: formData.trigger_task_id || null,
          days_from_trigger: formData.days_from_trigger,
          show_in_progress: formData.show_in_progress
        })

        if (error) {
          toast.error(`タスクマスタの作成に失敗しました: ${error.message}`)
          return
        }
        toast.success('タスクマスタを追加しました')
      }

      setShowModal(false)
      await loadTaskMasters()
    } catch (error: any) {
      toast.error(`タスクマスタの保存に失敗しました: ${error?.message || '不明なエラー'}`)
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

      if (error) {
        toast.error(`タスクマスタの削除に失敗しました: ${error.message}`)
        return
      }

      toast.success('タスクマスタを削除しました')
      await loadTaskMasters()
    } catch (error: any) {
      toast.error(`タスクマスタの削除に失敗しました: ${error?.message || '不明なエラー'}`)
    }
  }

  // ドラッグ開始
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId)
  }

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // ドロップ
  const handleDrop = async (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null)
      return
    }

    const draggedIndex = taskMasters.findIndex(t => t.id === draggedTaskId)
    const targetIndex = taskMasters.findIndex(t => t.id === targetTaskId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTaskId(null)
      return
    }

    // 配列を並び替え
    const newTaskMasters = [...taskMasters]
    const [draggedTask] = newTaskMasters.splice(draggedIndex, 1)
    newTaskMasters.splice(targetIndex, 0, draggedTask)

    // 新しい順序でtask_orderを更新
    const updatedTaskMasters = newTaskMasters.map((task, index) => ({
      ...task,
      task_order: index + 1
    }))

    setTaskMasters(updatedTaskMasters)
    setDraggedTaskId(null)

    // データベースに保存
    try {
      const updatePromises = updatedTaskMasters.map(task =>
        supabase
          .from('task_masters')
          .update({ task_order: task.task_order })
          .eq('id', task.id)
      )

      const results = await Promise.all(updatePromises)

      // エラーがあるかチェック
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        toast.error('並び順の保存に失敗しました')
        // エラー時は元のデータを再読み込み
        await loadTaskMasters()
      } else {
        toast.success('並び順を保存しました')
      }
    } catch (error) {
      toast.error('並び順の保存に失敗しました')
      // エラー時は元のデータを再読み込み
      await loadTaskMasters()
    }
  }

  if (loading) {
    return <div className="p-4">読み込み中...</div>
  }

  // 全職種リストを生成（ORGANIZATION_HIERARCHYから）
  const allPositions = ORGANIZATION_HIERARCHY.flatMap(dept => dept.positions)

  // フィルタリングされたタスクマスタリスト
  const filteredTaskMasters = selectedPosition === '全職種'
    ? taskMasters
    : taskMasters.filter(task => task.responsible_department === selectedPosition)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="prisma-btn prisma-btn-secondary flex items-center gap-2"
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
            className="prisma-btn prisma-btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            新規タスク追加
          </button>
        </div>
      </div>

      {/* 職種フィルタ（タブ表示） */}
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-base font-semibold text-gray-700">表示職種</label>
          <span className="text-base text-gray-500">
            （{filteredTaskMasters.length}件）
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPosition('全職種')}
            className={`prisma-btn prisma-btn-sm ${selectedPosition === '全職種' ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
          >
            全職種
          </button>
          {ORGANIZATION_HIERARCHY.map(dept => (
            <div key={dept.name} className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-gray-500 px-2">{dept.name}:</span>
              {dept.positions.map(position => (
                <button
                  key={position}
                  onClick={() => setSelectedPosition(position)}
                  className={`prisma-btn prisma-btn-sm ${selectedPosition === position ? 'prisma-btn-primary' : 'prisma-btn-secondary'}`}
                >
                  {position}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* タスク一覧テーブル */}
      <div className="bg-white rounded-lg border-2 border-pastel-blue shadow-pastel-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] [-webkit-overflow-scrolling:touch]">
          <table className="w-full prisma-table min-w-max table-fixed">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <tbody className="divide-y divide-gray-200">
              {filteredTaskMasters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {selectedPosition === '全職種' ? 'タスクマスタが登録されていません' : `「${selectedPosition}」のタスクマスタがありません`}
                  </td>
                </tr>
              ) : (
                filteredTaskMasters.map((task) => (
                  <tr
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(task.id)}
                    className={`hover:bg-pastel-blue-light transition-colors cursor-move ${
                      draggedTaskId === task.id ? 'opacity-50 bg-blue-100' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="text-xs font-semibold text-gray-500 mb-1">タスク名</div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900 whitespace-nowrap">{task.title}</span>
                        {task.is_trigger_task && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border-2 border-blue-300 whitespace-nowrap">
                            トリガー
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-gray-500 mb-1">責任職種</div>
                      <div className="text-base text-gray-900">{task.responsible_department || '未設定'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-gray-500 mb-1">フェーズ</div>
                      <div className="text-base text-gray-900">{task.phase || '未設定'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xs font-semibold text-gray-500">契約日から</span>
                        <span className="text-base font-medium text-gray-900">
                          {task.days_from_contract !== null && task.days_from_contract !== undefined
                            ? `${task.days_from_contract}日`
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-semibold text-gray-500 mb-1">トリガー・日数</div>
                      <div className="text-base font-medium text-gray-900">
                        {task.trigger_task_id ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-600 truncate">
                              {taskMasters.find(t => t.id === task.trigger_task_id)?.title || '不明なタスク'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap self-start ${
                              (task.days_from_trigger ?? 0) >= 0
                                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                : 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                            }`}>
                              {(task.days_from_trigger ?? 0) > 0 ? '+' : ''}{task.days_from_trigger ?? 0}日
                            </span>
                          </div>
                        ) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-xs font-semibold text-gray-500 mb-1">進捗管理表</div>
                      <div className="text-base font-medium text-gray-900">
                        {task.show_in_progress ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border-2 border-blue-300">
                            掲載
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600 border-2 border-gray-300">
                            非掲載
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-xs font-semibold text-gray-500 mb-1">操作</div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(task)}
                          disabled={!canWrite}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="編集"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id, task.title)}
                          disabled={!canDelete}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors border-2 border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
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

              {/* フェーズ */}
              <div>
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
                  フェーズ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  className="prisma-input"
                >
                  <option value="内定">内定</option>
                  <option value="契約前">契約前</option>
                  <option value="着工前">着工前</option>
                  <option value="着工後">着工後</option>
                  <option value="引き渡し後">引き渡し後</option>
                </select>
              </div>

              {/* 責任職種 */}
              <div>
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
                  責任職種 <span className="text-red-500">*</span>
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

              {/* 目的 */}
              <div>
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
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
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
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

              {/* Do's */}
              <div>
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
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
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
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
                <h3 className="text-base font-bold text-gray-800 mb-3">トリガー設定 <span className="text-red-500">*</span></h3>

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
                      トリガー設定の有無 <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <p className="text-base text-gray-600 mt-2 ml-8">
                    ※ONにすると、他のタスクの起点（トリガー）として選択できるようになります
                  </p>
                </div>

                {/* トリガーを設定する */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="text-base font-bold text-gray-800 mb-3">トリガーを設定する <span className="text-red-500">*</span></h4>

                  {/* トリガー選択 */}
                  <div className="mb-4">
                    <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
                      トリガー（このタスクの起点となるタスク） <span className="text-red-500">*</span>
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
                  </div>

                  {/* トリガーからの日数 */}
                  {formData.trigger_task_id && (
                    <div>
                      <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
                        日数（トリガーからの相対日数）
                      </label>
                      <input
                        type="text"
                        value={daysFromTriggerInput}
                        onChange={(e) => {
                          const value = e.target.value
                          // 整数値（マイナス含む）のみ許可、入力中の"-"も許可
                          if (value === '' || value === '-' || /^-?\d+$/.test(value)) {
                            setDaysFromTriggerInput(value)
                            // 完全な数値の場合のみformDataを更新（"-"のみの場合は更新しない）
                            const num = parseInt(value, 10)
                            if (!isNaN(num)) {
                              setFormData({ ...formData, days_from_trigger: num })
                            }
                          }
                        }}
                        onBlur={() => {
                          // 入力が不完全な場合（空または"-"のみ）は0に設定
                          if (!daysFromTriggerInput || daysFromTriggerInput === '-') {
                            setDaysFromTriggerInput('0')
                            setFormData({ ...formData, days_from_trigger: 0 })
                          }
                        }}
                        className="prisma-input"
                        placeholder="例: 5（トリガーから5日後）、-3（トリガーから3日前）"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        プラス値: トリガー完了から〇日後、マイナス値: トリガー完了から〇日前
                      </p>
                    </div>
                  )}

                  {/* トリガーなしの場合の日数入力 */}
                  {!formData.trigger_task_id && (
                    <div>
                      <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
                        トリガーからの日数 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.days_from_contract}
                        onChange={(e) => setFormData({ ...formData, days_from_contract: parseInt(e.target.value) || 0 })}
                        className="prisma-input"
                        placeholder="例: 7（契約日から7日後）"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 進捗管理表に掲載するか */}
              <div className="border-t-2 border-gray-200 pt-4 mt-4">
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
                  進捗管理表に掲載するか <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="show_in_progress"
                      checked={formData.show_in_progress === true}
                      onChange={() => setFormData({ ...formData, show_in_progress: true })}
                      className="mr-2"
                    />
                    <span className="text-base">掲載する</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="show_in_progress"
                      checked={formData.show_in_progress === false}
                      onChange={() => setFormData({ ...formData, show_in_progress: false })}
                      className="mr-2"
                    />
                    <span className="text-base">掲載しない</span>
                  </label>
                </div>
              </div>

              {/* トリガーからの日数（自動計算） */}
              <div className="border-t-2 border-gray-200 pt-4 mt-4">
                <label className="block prisma-text-base font-medium text-gray-700 prisma-mb-1">
                  トリガーからの日数（自動計算）
                </label>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {formData.trigger_task_id
                      ? `${calculateDaysFromContract(formData.trigger_task_id, formData.days_from_trigger)}日`
                      : formData.days_from_contract !== null && formData.days_from_contract !== undefined
                        ? `${formData.days_from_contract}日`
                        : '未設定'}
                  </div>
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
