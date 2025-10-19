/**
 * タスクマスタ管理ページ（モーダル対応）
 *
 * タスクマスタの一覧表示と編集機能
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TaskMaster } from '../types/database'

export default function TaskMasterManagement() {
  const [taskMasters, setTaskMasters] = useState<TaskMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskMaster | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    responsible_department: '',
    days_from_contract: 0,
    purpose: '',
    manual_url: '',
    video_url: '',
    dos: '',
    donts: ''
  })

  useEffect(() => {
    loadTaskMasters()
  }, [])

  const loadTaskMasters = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('task_masters')
      .select('*')
      .order('days_from_contract', { ascending: true })

    if (data) {
      setTaskMasters(data)
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
        days_from_contract: 0,
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
    if (!formData.title) {
      alert('タスク名を入力してください')
      return
    }

    if (editingTask) {
      // 更新
      await supabase
        .from('task_masters')
        .update({
          title: formData.title,
          responsible_department: formData.responsible_department,
          days_from_contract: formData.days_from_contract,
          purpose: formData.purpose,
          manual_url: formData.manual_url,
          dos: formData.dos,
          donts: formData.donts,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id)
    } else {
      // 新規作成
      await supabase.from('task_masters').insert({
        title: formData.title,
        responsible_department: formData.responsible_department,
        days_from_contract: formData.days_from_contract,
        purpose: formData.purpose,
        manual_url: formData.manual_url,
        dos: formData.dos,
        donts: formData.donts,
        phase: '未設定',
        business_no: 0,
        task_order: 0
      })
    }

    setShowModal(false)
    loadTaskMasters()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このタスクマスタを削除しますか？')) return

    await supabase.from('task_masters').delete().eq('id', id)
    loadTaskMasters()
  }

  if (loading) {
    return <div className="p-4">読み込み中...</div>
  }

  return (
    <div className="p-4">
      <div className="bg-white border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">タスクマスタ管理</h1>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800"
          >
            新規作成
          </button>
        </div>

        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">タスク名</th>
              <th className="border p-2 text-left">責任部署</th>
              <th className="border p-2 text-right">契約日からの日数</th>
              <th className="border p-2 text-left">目的</th>
              <th className="border p-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {taskMasters.map(task => (
              <tr key={task.id}>
                <td className="border p-2">{task.title}</td>
                <td className="border p-2">{task.responsible_department}</td>
                <td className="border p-2 text-right">{task.days_from_contract}日</td>
                <td className="border p-2">{task.purpose}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleOpenModal(task)}
                    className="px-3 py-1 bg-white border text-sm hover:bg-gray-50 mr-2"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm hover:bg-red-700"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 編集モーダル */}
      {showModal && (
        <div className="modal-overlay">
          <div className="bg-white border p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTask ? 'タスクマスタ編集' : 'タスクマスタ新規作成'}
            </h2>

            <div className="space-y-4">
              {/* タスク名 */}
              <div>
                <label className="block text-sm font-bold mb-1">タスク名 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border"
                  placeholder="例: 契約書作成"
                />
              </div>

              {/* 責任部署 */}
              <div>
                <label className="block text-sm font-bold mb-1">責任部署</label>
                <input
                  type="text"
                  value={formData.responsible_department}
                  onChange={(e) => setFormData({ ...formData, responsible_department: e.target.value })}
                  className="w-full p-2 border"
                  placeholder="例: 営業部"
                />
              </div>

              {/* 期日（契約日からの日数） */}
              <div>
                <label className="block text-sm font-bold mb-1">契約日からの日数</label>
                <input
                  type="number"
                  value={formData.days_from_contract}
                  onChange={(e) => setFormData({ ...formData, days_from_contract: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border"
                  placeholder="例: 3"
                />
              </div>

              {/* 目的 */}
              <div>
                <label className="block text-sm font-bold mb-1">目的</label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full p-2 border"
                  rows={3}
                  placeholder="このタスクの目的を記述"
                />
              </div>

              {/* マニュアルURL */}
              <div>
                <label className="block text-sm font-bold mb-1">マニュアルURL</label>
                <input
                  type="url"
                  value={formData.manual_url}
                  onChange={(e) => setFormData({ ...formData, manual_url: e.target.value })}
                  className="w-full p-2 border"
                  placeholder="https://..."
                />
              </div>

              {/* 動画URL */}
              <div>
                <label className="block text-sm font-bold mb-1">動画URL</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="w-full p-2 border"
                  placeholder="https://..."
                />
              </div>

              {/* Do's */}
              <div>
                <label className="block text-sm font-bold mb-1">Do's（推奨事項）</label>
                <textarea
                  value={formData.dos}
                  onChange={(e) => setFormData({ ...formData, dos: e.target.value })}
                  className="w-full p-2 border"
                  rows={3}
                  placeholder="推奨される作業方法"
                />
              </div>

              {/* Don'ts */}
              <div>
                <label className="block text-sm font-bold mb-1">Don'ts（禁止事項）</label>
                <textarea
                  value={formData.donts}
                  onChange={(e) => setFormData({ ...formData, donts: e.target.value })}
                  className="w-full p-2 border"
                  rows={3}
                  placeholder="避けるべき作業方法"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white border text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
