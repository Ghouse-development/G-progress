import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, X, FileText, CheckSquare, Users } from 'lucide-react'

interface SearchResult {
  type: 'project' | 'task' | 'employee'
  id: string
  title: string
  subtitle: string
  projectId?: string
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl+K / Cmd+K で検索モーダルを開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      // 案件を検索（顧客名・建設地で検索）
      const { data: projects } = await supabase
        .from('projects')
        .select('*, customer:customers(*)')
        .limit(100)

      // タスクを検索（説明・Do's/Don'tsで検索）
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, project:projects(*, customer:customers(*))')
        .or(`description.ilike.%${query}%,dos.ilike.%${query}%,donts.ilike.%${query}%`)
        .limit(10)

      // 従業員を検索（名前・部門で検索）
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .or(`last_name.ilike.%${query}%,first_name.ilike.%${query}%,department.ilike.%${query}%`)
        .limit(10)

      const searchResults: SearchResult[] = []

      // 案件結果を追加（クライアント側でフィルタリング）
      if (projects) {
        const filteredProjects = projects.filter((project: any) => {
          const customerNames = project.customer?.names?.join('・') || ''
          const buildingSite = project.customer?.building_site || ''
          const searchLower = query.toLowerCase()
          return customerNames.toLowerCase().includes(searchLower) ||
                 buildingSite.toLowerCase().includes(searchLower)
        }).slice(0, 5)

        filteredProjects.forEach((project: any) => {
          searchResults.push({
            type: 'project',
            id: project.id,
            title: `${project.customer?.names?.join('・') || '顧客名なし'}様`,
            subtitle: `${project.customer?.building_site || ''} | 契約日: ${project.contract_date}`
          })
        })
      }

      // タスク結果を追加
      if (tasks) {
        tasks.forEach((task: any) => {
          searchResults.push({
            type: 'task',
            id: task.id,
            title: task.description || 'タスク',
            subtitle: `案件: ${task.project?.customer?.names?.join('・') || '不明'}様 | 期限: ${task.due_date || '未設定'}`,
            projectId: task.project_id
          })
        })
      }

      // 従業員結果を追加
      if (employees) {
        employees.forEach((employee: any) => {
          searchResults.push({
            type: 'employee',
            id: employee.id,
            title: `${employee.last_name} ${employee.first_name}`,
            subtitle: `${employee.department} | ${employee.email || 'メールなし'}`
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
      setIsOpen(false)
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'project') {
      navigate(`/projects/${result.id}`)
    } else if (result.type === 'task' && result.projectId) {
      navigate(`/projects/${result.projectId}`)
    }
    // 従業員の場合は何もしない（情報表示のみ）
    setIsOpen(false)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <FileText size={16} className="text-blue-600" />
      case 'task': return <CheckSquare size={16} className="text-green-600" />
      case 'employee': return <Users size={16} className="text-purple-600" />
      default: return null
    }
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'project': return 'bg-blue-100 text-blue-800'
      case 'task': return 'bg-green-100 text-green-800'
      case 'employee': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project': return '案件'
      case 'task': return 'タスク'
      case 'employee': return '従業員'
      default: return ''
    }
  }

  return (
    <>
      {/* 検索トリガーボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        title="グローバル検索 (Ctrl+K)"
      >
        <Search size={18} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-600 hidden md:inline">検索</span>
        <kbd className="hidden lg:inline-block px-2 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded font-mono">Ctrl+K</kbd>
      </button>

      {/* 検索モーダル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border-2 border-gray-300">
        {/* 検索入力 */}
        <div className="flex items-center gap-3 p-4 border-b-2 border-gray-200">
          <Search className="text-gray-400" size={24} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="案件、顧客名、タスク、従業員を検索..."
            className="flex-1 text-lg outline-none font-medium text-gray-900"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 検索結果 */}
        <div className="max-h-[500px] overflow-y-auto p-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border-2 border-gray-200 bg-white">
                  <div className="flex items-start gap-3">
                    {/* アイコンスケルトン */}
                    <div className="mt-0.5">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    {/* コンテンツスケルトン */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-center text-sm text-gray-500 font-medium mt-4">検索中...</p>
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-8">
              <Search size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">「{query}」の検索結果が見つかりませんでした</p>
              <p className="text-sm text-gray-500 mt-2">別のキーワードで検索してください</p>
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="text-center py-8">
              <Search size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">2文字以上入力して検索してください</p>
              <p className="text-sm text-gray-500 mt-2">案件、タスク、従業員を検索できます</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    index === selectedIndex
                      ? 'bg-blue-50 border-blue-300 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTypeBadgeClass(result.type)}`}>
                          {getTypeLabel(result.type)}
                        </span>
                        <div className="font-bold text-gray-900 truncate">{result.title}</div>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-1">{result.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター（キーボードヒント） */}
        <div className="p-3 bg-gray-50 border-t-2 border-gray-300 flex items-center justify-between text-xs text-gray-600 rounded-b-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded font-mono">↑↓</kbd>
              <span className="font-medium">選択</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded font-mono">Enter</kbd>
              <span className="font-medium">移動</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded font-mono">ESC</kbd>
            <span className="font-medium">閉じる</span>
          </div>
        </div>
      </div>
        </div>
      )}
    </>
  )
}
