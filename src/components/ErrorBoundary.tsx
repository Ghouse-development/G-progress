/**
 * グローバルエラーバウンダリ
 * Reactコンポーネントツリー内のエラーをキャッチして、フォールバックUIを表示
 */

import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // エラーログをコンソールに出力
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // 本番環境では、エラー監視サービス（Sentry等）に送信
    if (import.meta.env.PROD) {
      // TODO: Sentryやその他のエラートラッキングサービスに送信
      // Sentry.captureException(error, { extra: errorInfo })
    }

    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが提供されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback
      }

      // デフォルトのエラーUI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full">
            <div className="prisma-card text-center">
              {/* エラーアイコン */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
              </div>

              {/* エラーメッセージ */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                予期しないエラーが発生しました
              </h1>
              <p className="text-base text-gray-600 mb-6">
                申し訳ございません。アプリケーションでエラーが発生しました。
                <br />
                ページをリロードするか、ホームに戻ってください。
              </p>

              {/* エラー詳細（開発環境のみ） */}
              {!import.meta.env.PROD && this.state.error && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left overflow-auto max-h-60">
                  <p className="text-sm font-semibold text-gray-900 mb-2">エラー詳細:</p>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReload}
                  className="prisma-btn prisma-btn-primary flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  ページをリロード
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="prisma-btn prisma-btn-secondary flex items-center justify-center gap-2"
                >
                  <Home size={20} />
                  ホームに戻る
                </button>
              </div>

              {/* サポート情報 */}
              <div className="mt-8 pt-6 border-t-2 border-gray-300">
                <p className="text-sm text-gray-600">
                  問題が解決しない場合は、システム管理者にお問い合わせください。
                </p>
                {this.state.error && (
                  <p className="text-xs text-gray-500 mt-2">
                    エラーID: {this.state.error.message.substring(0, 20)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
