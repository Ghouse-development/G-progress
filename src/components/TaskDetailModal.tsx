/**
 * 共通タスク詳細モーダル
 * 全ページ（ProjectDetail、TaskBoard、Calendar、ProjectList、TaskByPosition）で共通使用
 */

import { useState, useEffect } from 'react'
import { X, Lock, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Task, Employee } from '../types/database'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useToast } from '../contexts/ToastContext'

interface TaskWithEmployee extends Task {
  assigned_employee?: Employee
  dayFromContract?: number
}

interface AuditLog {
  id: string
  action: string
  changes: any
  created_at: string
  employee?: {
    first_name: string
    last_name: string
  }
}

interface TaskDetailModalProps {
  task: TaskWithEmployee
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  currentEmployeeId: string
  taskEditLock?: {
    isLocked: boolean
    lockedBy: string | null
    lockedByName: string
    onlineUsers: any[]
  }
}

export default function TaskDetailModal({
  task: initialTask,
  isOpen,
  onClose,
  onUpdate,
  currentEmployeeId,
  taskEditLock = { isLocked: false, lockedBy: null, lockedByName: '', onlineUsers: [] }
}: TaskDetailModalProps) {
  const toast = useToast()
  const [task, setTask] = useState<TaskWithEmployee>(initialTask)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [commentEditing, setCommentEditing] = useState(false)
  const [commentValue, setCommentValue] = useState(initialTask.comment || '')

  useEffect(() => {
    setTask(initialTask)
    setCommentValue(initialTask.comment || '')
    if (isOpen && initialTask.id) {
      loadAuditLogs(initialTask.id)
    }
  }, [initialTask, isOpen])

  // 変更履歴を読み込み（最新10件）
  const loadAuditLogs = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          changes,
          created_at,
          employee:employee_id(first_name, last_name)
        `)
        .eq('entity_type', 'task')
        .eq('entity_id', taskId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      // Map the data to fix employee type (Supabase returns array, we want single object)
      const mappedLogs = (data || []).map((log: any) => ({
        ...log,
        employee: Array.isArray(log.employee) && log.employee.length > 0 ? log.employee[0] : log.employee
      }))
      setAuditLogs(mappedLogs)
    } catch (error) {
      console.error('変更履歴の読み込みに失敗:', error)
    }
  }

  const handleUpdateTaskStatus = async (newStatus: string) => {
    try {
      await onUpdate(task.id, { status: newStatus as any })
      setTask({ ...task, status: newStatus as any })
      toast.success('ステータスを更新しました')
      loadAuditLogs(task.id) // 変更履歴を再読み込み
    } catch (error) {
      toast.error('ステータスの更新に失敗しました')
    }
  }

  const handleUpdateDueDate = async (newDate: string) => {
    try {
      await onUpdate(task.id, { due_date: newDate })
      setTask({ ...task, due_date: newDate })
      setEditingDueDate(false)
      toast.success('期限日を更新しました')
      loadAuditLogs(task.id)
    } catch (error) {
      toast.error('期限日の更新に失敗しました')
    }
  }

  const handleToggleDateConfirmed = async () => {
    try {
      const newValue = !task.is_date_confirmed
      await onUpdate(task.id, { is_date_confirmed: newValue })
      setTask({ ...task, is_date_confirmed: newValue })
      toast.success(newValue ? '日付を確定しました' : '日付を予定に戻しました')
      loadAuditLogs(task.id)
    } catch (error) {
      toast.error('日付確定状態の更新に失敗しました')
    }
  }

  const handleUpdateComment = async (newComment: string) => {
    try {
      await onUpdate(task.id, { comment: newComment })
      setTask({ ...task, comment: newComment })
    } catch (error) {
      toast.error('コメントの更新に失敗しました')
    }
  }

  if (!isOpen) return null

  const isLocked = taskEditLock.isLocked && taskEditLock.lockedBy !== currentEmployeeId

  return (
    <div className="prisma-modal-overlay">
      <div className="prisma-modal max-w-[900px]">
        {/* ヘッダー */}
        <div className="prisma-modal-header">
          <div className="flex items-center justify-between">
            <h2 className="prisma-modal-title">{task.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* 編集ロック状態表示 */}
          {isLocked && (
            <div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-center gap-2">
              <Lock size={20} className="text-yellow-700" />
              <div className="flex-1">
                <p className="text-base font-bold text-yellow-900">
                  {taskEditLock.lockedByName}が編集中です
                </p>
                <p className="text-base text-yellow-700">閲覧のみ可能です。編集はできません。</p>
              </div>
            </div>
          )}

          {/* オンラインユーザー表示 */}
          {taskEditLock.onlineUsers.length > 0 && (
            <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg flex items-center gap-2">
              <Users size={18} className="text-blue-700" />
              <p className="text-base text-blue-900">
                他に{taskEditLock.onlineUsers.length}人が閲覧中
              </p>
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="prisma-modal-content space-y-4">
          {/* ステータス変更ボタン */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleUpdateTaskStatus('not_started')}
                disabled={isLocked}
                className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                  task.status === 'not_started'
                    ? 'task-not-started'
                    : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                未着手
              </button>
              <button
                onClick={() => handleUpdateTaskStatus('requested')}
                disabled={isLocked}
                className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                  task.status === 'requested'
                    ? 'task-in-progress'
                    : 'bg-white text-yellow-900 hover:bg-yellow-50 border-2 border-yellow-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                着手中
              </button>
              <button
                onClick={() => handleUpdateTaskStatus('delayed')}
                disabled={isLocked}
                className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                  task.status === 'delayed'
                    ? 'task-delayed'
                    : 'bg-white text-red-900 hover:bg-red-50 border-2 border-red-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                遅延
              </button>
              <button
                onClick={() => handleUpdateTaskStatus('completed')}
                disabled={isLocked}
                className={`px-4 py-3 rounded-lg font-bold text-base transition-all ${
                  task.status === 'completed'
                    ? 'task-completed'
                    : 'bg-white text-blue-900 hover:bg-blue-50 border-2 border-blue-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                完了
              </button>
            </div>
          </div>

          {/* 期限日 */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              期限日
            </label>
            {editingDueDate ? (
              <div>
                <input
                  type="date"
                  value={task.due_date || ''}
                  onChange={(e) => handleUpdateDueDate(e.target.value)}
                  onBlur={() => setEditingDueDate(false)}
                  autoFocus
                  className="prisma-input"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    className="prisma-btn prisma-btn-secondary prisma-btn-sm"
                    onClick={() => {
                      const today = new Date()
                      handleUpdateDueDate(format(today, 'yyyy-MM-dd'))
                    }}
                  >
                    今日
                  </button>
                  <button
                    type="button"
                    className="prisma-btn prisma-btn-secondary prisma-btn-sm"
                    onClick={() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      handleUpdateDueDate(format(tomorrow, 'yyyy-MM-dd'))
                    }}
                  >
                    明日
                  </button>
                  <button
                    type="button"
                    className="prisma-btn prisma-btn-secondary prisma-btn-sm"
                    onClick={() => {
                      const nextWeek = new Date()
                      nextWeek.setDate(nextWeek.getDate() + 7)
                      handleUpdateDueDate(format(nextWeek, 'yyyy-MM-dd'))
                    }}
                  >
                    1週間後
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="prisma-input bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => !isLocked && setEditingDueDate(true)}
              >
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <span>{task.due_date ? format(new Date(task.due_date), 'yyyy年MM月dd日 (E)', { locale: ja }) : '未設定'}</span>
                  {task.original_due_date && task.due_date && task.due_date !== task.original_due_date && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold text-white bg-orange-600 rounded-full border-2 border-white shadow-sm">
                      変更あり
                    </span>
                  )}
                </div>
                {task.dayFromContract !== undefined && (
                  <div className="text-base text-gray-600 mt-1">
                    契約日から {task.dayFromContract}日目
                  </div>
                )}
                {task.original_due_date && task.due_date && task.due_date !== task.original_due_date && (
                  <div className="text-sm text-orange-600 mt-1">
                    当初予定: {format(new Date(task.original_due_date), 'yyyy年MM月dd日 (E)', { locale: ja })}
                    {task.date_change_count && ` (変更回数: ${task.date_change_count}回)`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 予定・確定トグル */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              日付の状態
            </label>
            <div className="flex gap-0 border-2 border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={async () => {
                  if (!task.is_date_confirmed || !task.due_date) return
                  try {
                    await onUpdate(task.id, { is_date_confirmed: false })
                    setTask({ ...task, is_date_confirmed: false })
                    toast.success('日付を予定に変更しました')
                    loadAuditLogs(task.id)
                  } catch (error) {
                    toast.error('日付状態の更新に失敗しました')
                  }
                }}
                disabled={isLocked || !task.due_date || !task.is_date_confirmed}
                className={`flex-1 px-4 py-3 font-bold text-base transition-all ${
                  !task.is_date_confirmed
                    ? 'bg-yellow-100 text-yellow-900 border-r-2 border-yellow-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } disabled:cursor-not-allowed`}
              >
                予定
              </button>
              <button
                onClick={async () => {
                  if (task.is_date_confirmed || !task.due_date) return
                  try {
                    await onUpdate(task.id, { is_date_confirmed: true })
                    setTask({ ...task, is_date_confirmed: true })
                    toast.success('日付を確定しました')
                    loadAuditLogs(task.id)
                  } catch (error) {
                    toast.error('日付状態の更新に失敗しました')
                  }
                }}
                disabled={isLocked || !task.due_date || task.is_date_confirmed}
                className={`flex-1 px-4 py-3 font-bold text-base transition-all ${
                  task.is_date_confirmed
                    ? 'bg-green-100 text-green-900 border-l-2 border-green-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } disabled:cursor-not-allowed`}
              >
                確定
              </button>
            </div>
            {!task.due_date && (
              <p className="text-xs text-gray-500 mt-1">※期限日が設定されていないため変更できません</p>
            )}
          </div>

          {/* コメント */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              コメント（遅延理由・進捗状況など）
            </label>
            <textarea
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              onBlur={() => {
                if (commentValue !== task.comment) {
                  handleUpdateComment(commentValue)
                }
              }}
              className="prisma-textarea"
              placeholder="コメントを入力"
              rows={3}
            />
          </div>

          {/* 作業内容 */}
          {task.description && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                作業内容
              </label>
              <div className="prisma-textarea bg-gray-50 min-h-[80px]">
                {task.description}
              </div>
            </div>
          )}

          {/* Do's & Don'ts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {task.dos && (
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Do's（推奨事項）
                </label>
                <div className="prisma-textarea bg-gray-50 whitespace-pre-wrap min-h-[120px] max-h-[200px] overflow-y-auto">
                  {task.dos}
                </div>
              </div>
            )}

            {task.donts && (
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Don'ts（禁止事項）
                </label>
                <div className="prisma-textarea bg-gray-50 whitespace-pre-wrap min-h-[120px] max-h-[200px] overflow-y-auto">
                  {task.donts}
                </div>
              </div>
            )}
          </div>

          {/* マニュアル・動画 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                マニュアル
              </label>
              {task.manual_url ? (
                <a
                  href={task.manual_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prisma-btn prisma-btn-secondary w-full"
                >
                  開く
                </a>
              ) : (
                <div className="text-gray-500 text-base">未設定</div>
              )}
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                動画
              </label>
              {task.video_url ? (
                <a
                  href={task.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prisma-btn prisma-btn-secondary w-full"
                >
                  開く
                </a>
              ) : (
                <div className="text-gray-500 text-base">未設定</div>
              )}
            </div>
          </div>

          {/* 変更履歴 */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              変更履歴（最新10件）
            </label>
            {auditLogs.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-gray-900">
                        {log.employee ? `${log.employee.first_name} ${log.employee.last_name}` : '不明'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {format(new Date(log.created_at), 'M/d HH:mm')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {log.action === 'update' && log.changes && (
                        <div>
                          {Object.entries(log.changes).map(([key, value]: [string, any]) => (
                            <div key={key}>
                              <span className="font-medium">{key}</span>: {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                      {log.action === 'create' && '作成'}
                      {log.action === 'delete' && '削除'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
                変更履歴はありません
              </div>
            )}
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
    </div>
  )
}
