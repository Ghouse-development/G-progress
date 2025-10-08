import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  const handleLogin = () => {
    // 開発モード: 認証なしでログイン
    localStorage.setItem('auth', 'true')
    localStorage.setItem('currentUserId', '1') // デフォルトユーザーIDを設定
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-black mb-2">G-progress</h1>
          <p className="text-sm text-gray-500">業務管理システム</p>
          <p className="text-xs text-gray-400 mt-2">開発モード（認証なし）</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleLogin}
            className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition font-medium"
          >
            ログイン
          </button>
        </div>
      </div>
    </div>
  )
}
