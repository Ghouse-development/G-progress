import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Comment, Employee } from '../types/database'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MessageSquare, Edit2, Trash2, Reply } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface CommentSectionProps {
  projectId?: string
  taskId?: string
  currentUserId: string
}

export default function CommentSection({ projectId, taskId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadComments()
    loadEmployees()
  }, [projectId, taskId])

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('last_name', { ascending: true })

    if (!error && data) {
      setEmployees(data)
    }
  }

  const loadComments = async () => {
    if (!projectId && !taskId) return

    const query = supabase
      .from('comments')
      .select(`
        *,
        user:employees(*)
      `)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })

    if (projectId) {
      query.eq('project_id', projectId)
    } else if (taskId) {
      query.eq('task_id', taskId)
    }

    const { data, error } = await query

    if (error) {
      console.error('コメント読み込みエラー:', error)
      return
    }

    if (data) {
      // 返信を読み込み
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              user:employees(*)
            `)
            .eq('parent_comment_id', comment.id)
            .order('created_at', { ascending: true })

          return { ...comment, replies: replies || [] }
        })
      )

      setComments(commentsWithReplies)
    }
  }

  const handleCommentChange = (value: string) => {
    setNewComment(value)
    checkForMention(value)
  }

  const checkForMention = (value: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = value.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setShowMentionDropdown(true)
      setMentionSearch(mentionMatch[1])
      setMentionPosition(cursorPosition)
    } else {
      setShowMentionDropdown(false)
    }
  }

  const insertMention = (employee: Employee) => {
    const beforeMention = newComment.substring(0, mentionPosition - mentionSearch.length - 1)
    const afterMention = newComment.substring(mentionPosition)
    const mention = `@${employee.last_name}${employee.first_name}[${employee.id}] `
    setNewComment(beforeMention + mention + afterMention)
    setShowMentionDropdown(false)
    textareaRef.current?.focus()
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@[\w\s]+\[([a-f0-9-]+)\]/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1])
    }

    return mentions
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    const mentions = extractMentions(newComment)

    const commentData: any = {
      user_id: currentUserId,
      content: newComment,
      mentions
    }

    if (projectId) {
      commentData.project_id = projectId
    } else if (taskId) {
      commentData.task_id = taskId
    }

    if (replyingTo) {
      commentData.parent_comment_id = replyingTo
    }

    const { error } = await supabase
      .from('comments')
      .insert([commentData])

    if (error) {
      console.error('コメント投稿エラー:', error)
      showToast('コメントの投稿に失敗しました', 'error')
      return
    }

    showToast('コメントを投稿しました', 'success')
    setNewComment('')
    setReplyingTo(null)
    loadComments()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enterキーのみで送信（Shift+Enterは改行）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    const mentions = extractMentions(editContent)

    const { error } = await supabase
      .from('comments')
      .update({ content: editContent, mentions })
      .eq('id', commentId)

    if (error) {
      console.error('コメント編集エラー:', error)
      showToast('コメントの編集に失敗しました', 'error')
      return
    }

    showToast('コメントを編集しました', 'success')
    setEditingComment(null)
    setEditContent('')
    loadComments()
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('このコメントを削除しますか？')) return

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('コメント削除エラー:', error)
      showToast('コメントの削除に失敗しました', 'error')
      return
    }

    showToast('コメントを削除しました', 'success')
    loadComments()
  }

  const filteredEmployees = employees.filter(emp => {
    const searchLower = mentionSearch.toLowerCase()
    return (
      emp.last_name.toLowerCase().includes(searchLower) ||
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.department.toLowerCase().includes(searchLower)
    )
  })

  const renderComment = (comment: Comment, isReply = false) => {
    const isEditing = editingComment === comment.id
    const isOwner = comment.user_id === currentUserId

    return (
      <div
        key={comment.id}
        className={`border border-gray-300 rounded-lg p-4 ${isReply ? 'ml-12 mt-2 bg-gray-50' : 'bg-white'}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold border border-gray-300">
              {comment.user?.last_name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="font-bold text-base">
                {comment.user?.last_name} {comment.user?.first_name}
              </div>
              <div className="text-base text-gray-600">
                {format(new Date(comment.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                {comment.edited && ' (編集済み)'}
              </div>
            </div>
          </div>

          {isOwner && !isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingComment(comment.id)
                  setEditContent(comment.content)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="p-1 hover:bg-red-100 rounded text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleEditComment(comment.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg border border-gray-300 font-bold"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setEditingComment(null)
                  setEditContent('')
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg border border-gray-300 font-bold"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-900 whitespace-pre-wrap">{comment.content}</p>
            {!isReply && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="mt-2 text-base text-blue-600 hover:underline flex items-center gap-1"
              >
                <Reply size={14} />
                返信
              </button>
            )}
          </>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}

        {replyingTo === comment.id && (
          <div className="mt-4 ml-12 border border-blue-500 rounded-lg p-3 bg-blue-50">
            <div className="text-base font-bold mb-2">返信中...</div>
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enterで送信、Shift+Enterで改行、@ユーザー名でメンション可能"
              className="w-full p-2 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
            <button
              onClick={() => {
                setReplyingTo(null)
                setNewComment('')
              }}
              className="mt-2 px-4 py-2 bg-gray-200 rounded-lg border border-gray-300 font-bold"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare size={24} />
        コメント ({comments.length})
      </h3>

      {/* 新規コメント入力 */}
      {!replyingTo && (
        <div className="mb-6 border border-gray-300 rounded-lg p-4 bg-white relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => handleCommentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="コメントを入力... (Enterで送信、Shift+Enterで改行、@ユーザー名でメンション可能)"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-base"
            rows={4}
          />

          {/* メンションドロップダウン */}
          {showMentionDropdown && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto w-64">
              {filteredEmployees.slice(0, 10).map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => insertMention(emp)}
                  className="p-2 hover:bg-blue-100 cursor-pointer border-b border-gray-200"
                >
                  <div className="font-bold text-base">
                    {emp.last_name} {emp.first_name}
                  </div>
                  <div className="text-base text-gray-600">{emp.department}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* コメント一覧 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            まだコメントがありません
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  )
}
