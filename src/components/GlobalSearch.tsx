import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, X } from 'lucide-react'

interface SearchResult {
  type: 'project' | 'task'
  id: string
  title: string
  subtitle: string
  projectId?: string
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (query.trim().length >= 2) {
      handleSearch()
    } else {
      setResults([])
    }
  }, [query])

  const handleSearch = async () => {
    setLoading(true)

    try {
      // 案件を検索（顧客名で検索）
      const { data: projects } = await supabase
        .from('projects')
        .select('*, customer:customers(*)')
        .or(`customer.names.cs.{${query}}`)
        .limit(5)

      // タスクを検索（タイトルと説明で検索）
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, project:projects(*, customer:customers(*))')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5)

      const searchResults: SearchResult[] = []

      // 案件結果を追加
      if (projects) {
        projects.forEach((project: any) => {
          searchResults.push({
            type: 'project',
            id: project.id,
            title: `${project.customer?.names?.join('・') || '顧客名なし'}様邸`,
            subtitle: `契約日: ${project.contract_date} | 進捗: ${project.progress_rate}%`
          })
        })
      }

      // タスク結果を追加
      if (tasks) {
        tasks.forEach((task: any) => {
          searchResults.push({
            type: 'task',
            id: task.id,
            title: task.title,
            subtitle: `案件: ${task.project?.customer?.names?.join('・') || '不明'}様 | ${task.description || ''}`,
            projectId: task.project_id
          })
        })
      }

      setResults(searchResults)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      handleSelectResult(results[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'project') {
      navigate(`/projects/${result.id}`)
    } else if (result.type === 'task') {
      navigate(`/projects/${result.projectId}`)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-pastel-blue">
        {/* 検索入力 */}
        <div className="flex items-center gap-3 p-4 border-b-2 border-gray-200">
          <Search className="text-gray-400" size={24} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="案件名、顧客名、タスク名を検索..."
            className="flex-1 text-lg outline-none"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 検索結果 */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500">
              検索中...
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              「{query}」の検索結果が見つかりませんでした
            </div>
          )}

          {!loading && query.trim().length < 2 && query.trim().length > 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              2文字以上入力してください
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-pastel-blue-light'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      result.type === 'project'
                        ? 'bg-pastel-blue text-pastel-blue-dark'
                        : 'bg-pastel-green text-pastel-green-dark'
                    }`}>
                      {result.type === 'project' ? '案件' : 'タスク'}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{result.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{result.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター（キーボードヒント） */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↑↓</kbd>
            <span>選択</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Enter</kbd>
            <span>移動</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Esc</kbd>
            <span>閉じる</span>
          </div>
        </div>
      </div>
    </div>
  )
}
