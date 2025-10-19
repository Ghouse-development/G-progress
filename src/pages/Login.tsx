import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('1')
  const [employees, setEmployees] = useState<any[]>([])

  // 開発モード：従業員リストを取得
  useEffect(() => {
    const loadEmployees = async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, last_name, first_name, department')
        .order('last_name')

      if (data) {
        setEmployees(data)
        if (data.length > 0) {
          setSelectedEmployeeId(data[0].id)
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      loadEmployees()
    }
  }, [])

  // 開発モード用クイックログイン
  const handleDevLogin = () => {
    localStorage.setItem('auth', 'true')
    localStorage.setItem('currentUserId', selectedEmployeeId)
    navigate('/')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError('メールアドレスまたはパスワードが正しくありません')
      toast.error('ログインに失敗しました')
      setLoading(false)
    } else {
      toast.success('ログインしました')
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        {/* ロゴエリア */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-2xl mb-4">
            <span className="text-3xl font-black text-white">G</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">G-progress</h1>
          <p className="text-base text-gray-600 font-medium">業務管理システム</p>
        </div>

        {/* ログインカード */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ログイン</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                placeholder="example@ghouse.co.jp"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 px-4 rounded-xl hover:bg-gray-800 transition font-bold text-lg shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          {/* 開発モード用クイックログイン */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <p className="text-xs text-gray-500 mb-3 text-center font-medium">
                開発モード専用
              </p>
              <div className="mb-3">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ログインするユーザーを選択
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.last_name} {emp.first_name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleDevLogin}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition font-bold text-sm border-2 border-gray-300"
              >
                クイックログイン（認証なし）
              </button>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            © 2025 G-progress by Gハウス
          </p>
        </div>
      </div>
    </div>
  )
}
