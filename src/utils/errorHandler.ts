/**
 * エラーハンドリングユーティリティ
 *
 * APIエラー、ネットワークエラー、バリデーションエラーなどを
 * 統一的に処理し、ユーザーフレンドリーなメッセージを返す
 */

import { PostgrestError } from '@supabase/supabase-js'

export interface AppError {
  type: 'api' | 'network' | 'validation' | 'auth' | 'unknown'
  message: string
  originalError?: unknown
  userMessage: string // ユーザーに表示するメッセージ
  code?: string
  details?: Record<string, unknown>
}

/**
 * Supabase/PostgrestErrorをAppErrorに変換
 */
export function handleSupabaseError(error: PostgrestError): AppError {
  console.error('Supabase Error:', error)

  // エラーコード別のメッセージマッピング
  const errorMessages: Record<string, string> = {
    // 認証エラー
    'PGRST301': 'ログインが必要です。再度ログインしてください。',
    '42501': 'この操作を実行する権限がありません。',

    // データエラー
    '23505': 'この情報は既に登録されています。',
    '23503': '関連するデータが見つかりません。',
    '23502': '必須項目が入力されていません。',

    // その他
    '42P01': 'データベーステーブルが見つかりません。システム管理者にお問い合わせください。',
  }

  const userMessage = errorMessages[error.code] ||
    'データベース操作でエラーが発生しました。しばらくしてから再度お試しください。'

  return {
    type: 'api',
    message: error.message,
    userMessage,
    code: error.code,
    details: error.details ? JSON.parse(JSON.stringify(error.details)) : undefined,
    originalError: error
  }
}

/**
 * ネットワークエラーをAppErrorに変換
 */
export function handleNetworkError(error: unknown): AppError {
  console.error('Network Error:', error)

  return {
    type: 'network',
    message: error instanceof Error ? error.message : 'Network error',
    userMessage: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    originalError: error
  }
}

/**
 * バリデーションエラーをAppErrorに変換
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return {
    type: 'validation',
    message,
    userMessage: message,
    details,
    originalError: new Error(message)
  }
}

/**
 * 認証エラーをAppErrorに変換
 */
export function createAuthError(message: string): AppError {
  return {
    type: 'auth',
    message,
    userMessage: message || 'ログインセッションが無効です。再度ログインしてください。',
    originalError: new Error(message)
  }
}

/**
 * 汎用エラーハンドラー
 * あらゆる種類のエラーをAppErrorに変換
 */
export function handleError(error: unknown): AppError {
  // すでにAppErrorの場合はそのまま返す
  if (isAppError(error)) {
    return error
  }

  // PostgrestError（Supabaseエラー）の場合
  if (isPostgrestError(error)) {
    return handleSupabaseError(error)
  }

  // ネットワークエラーの場合
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return handleNetworkError(error)
  }

  // その他のErrorオブジェクト
  if (error instanceof Error) {
    console.error('Unknown Error:', error)
    return {
      type: 'unknown',
      message: error.message,
      userMessage: '予期しないエラーが発生しました。しばらくしてから再度お試しください。',
      originalError: error
    }
  }

  // 完全に不明なエラー
  console.error('Unknown Error Type:', error)
  return {
    type: 'unknown',
    message: String(error),
    userMessage: '予期しないエラーが発生しました。ページをリロードしてください。',
    originalError: error
  }
}

/**
 * エラーがPostgrestErrorかどうかを判定
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  )
}

/**
 * エラーがAppErrorかどうかを判定
 */
function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'userMessage' in error
  )
}

/**
 * エラーログを記録（本番環境ではエラー監視サービスに送信）
 */
export function logError(error: AppError, context?: Record<string, unknown>) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    type: error.type,
    message: error.message,
    code: error.code,
    context,
    stack: error.originalError instanceof Error ? error.originalError.stack : undefined
  }

  // コンソールに出力
  console.error('Error Log:', errorLog)

  // 本番環境では、エラー監視サービスに送信
  if (import.meta.env.PROD) {
    // TODO: Sentryやその他のエラートラッキングサービスに送信
    // Sentry.captureException(error.originalError, {
    //   extra: { ...errorLog, ...context }
    // })
  }
}

/**
 * try-catchブロックで使用するヘルパー関数
 *
 * @example
 * const result = await withErrorHandling(
 *   async () => supabase.from('projects').select('*'),
 *   toast,
 *   'プロジェクト一覧の取得'
 * )
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  toastFn?: { error: (message: string) => void },
  operationName?: string
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    const appError = handleError(error)

    // ログ記録
    logError(appError, { operation: operationName })

    // トースト通知
    if (toastFn) {
      toastFn.error(appError.userMessage)
    }

    return null
  }
}
