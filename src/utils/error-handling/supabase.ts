/**
 * Supabase専用のエラーハンドリング
 *
 * Supabaseクライアントから返されるエラーを
 * 構造化されたエラー形式に変換します。
 */

import type { ErrorCategory, StructuredError } from './types'
import { getUserFriendlyMessage, inferErrorLevel, sanitizeErrorMessage } from './user-friendly'

/**
 * Supabaseエラーコードのマッピング
 * Supabase固有のエラーコードをアプリケーションエラーコードに変換
 */
const SUPABASE_ERROR_MAP: Record<string, { code: string; category: ErrorCategory }> = {
  // 認証関連
  invalid_credentials: { code: 'ERR_INVALID_CREDENTIALS', category: 'auth' },
  email_not_confirmed: { code: 'ERR_EMAIL_NOT_CONFIRMED', category: 'auth' },
  user_already_exists: { code: 'ERR_USER_EXISTS', category: 'auth' },
  refresh_token_not_found: { code: 'ERR_SESSION_EXPIRED', category: 'auth' },
  JWT: { code: 'ERR_UNAUTHORIZED', category: 'auth' },

  // データベース関連
  '23505': { code: 'ERR_DUPLICATE', category: 'database' }, // unique_violation
  '23503': { code: 'ERR_FOREIGN_KEY', category: 'database' }, // foreign_key_violation
  '23502': { code: 'ERR_NOT_NULL', category: 'database' }, // not_null_violation
  '42P01': { code: 'ERR_TABLE_NOT_FOUND', category: 'database' }, // undefined_table
  '42703': { code: 'ERR_COLUMN_NOT_FOUND', category: 'database' }, // undefined_column

  // RLS (Row Level Security) 関連
  '42501': { code: 'ERR_FORBIDDEN', category: 'auth' }, // insufficient_privilege

  // ネットワーク関連
  'fetch failed': { code: 'ERR_NETWORK', category: 'network' },
  FetchError: { code: 'ERR_NETWORK', category: 'network' },
  NetworkError: { code: 'ERR_NETWORK', category: 'network' },
  TIMEOUT: { code: 'ERR_TIMEOUT', category: 'network' },
}

/**
 * Supabaseエラー用のユーザーメッセージ
 */
const SUPABASE_USER_MESSAGES: Record<string, string> = {
  ERR_INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません。',
  ERR_EMAIL_NOT_CONFIRMED: 'メールアドレスの確認が完了していません。確認メールをご確認ください。',
  ERR_USER_EXISTS: 'このメールアドレスは既に登録されています。',
  ERR_DUPLICATE: '既に同じデータが登録されています。',
  ERR_FOREIGN_KEY: '関連するデータが見つかりません。',
  ERR_NOT_NULL: '必須項目が入力されていません。',
  ERR_TABLE_NOT_FOUND: 'データベースの設定に問題があります。管理者にお問い合わせください。',
  ERR_COLUMN_NOT_FOUND: 'データベースの設定に問題があります。管理者にお問い合わせください。',
  ERR_FORBIDDEN: 'この操作を行う権限がありません。',
}

/**
 * Supabaseのエラーレスポンス型
 * 実際のSupabaseエラーの構造を模倣
 */
interface SupabaseError {
  message?: string
  code?: string
  details?: string
  hint?: string
  statusCode?: number
}

/**
 * Supabaseエラーかどうかを判定
 * @param error - エラーオブジェクト
 * @returns Supabaseエラーかどうか
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  if (error === null || error === undefined || typeof error !== 'object') {
    return false
  }

  const err = error as Record<string, unknown>

  // Supabaseエラーの特徴的なプロパティをチェック
  return (
    typeof err.message === 'string' &&
    (typeof err.code === 'string' ||
      typeof err.statusCode === 'number' ||
      typeof err.details === 'string' ||
      typeof err.hint === 'string')
  )
}

/**
 * Supabaseエラーコードを解析
 * @param error - Supabaseエラー
 * @returns エラー情報
 */
function parseSupabaseError(error: SupabaseError): {
  code: string
  category: ErrorCategory
  message: string
} {
  // エラーコードの特定
  let code = 'ERR_UNKNOWN'
  let category: ErrorCategory = 'unknown'

  // PostgreSQLエラーコード
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (error.code !== undefined && SUPABASE_ERROR_MAP[error.code] !== undefined) {
    const mapped = SUPABASE_ERROR_MAP[error.code]
    code = mapped.code
    category = mapped.category
  }
  // エラーメッセージから推測
  else if (error.message !== undefined) {
    for (const [pattern, mapped] of Object.entries(SUPABASE_ERROR_MAP)) {
      if (error.message.includes(pattern)) {
        code = mapped.code
        category = mapped.category
        break
      }
    }
  }

  // メッセージの構築
  const message = error.message ?? error.details ?? 'Unknown Supabase error'

  return { code, category, message }
}

/**
 * Supabaseエラーを構造化されたエラーに変換
 * @param error - Supabaseのエラー
 * @param context - 追加のコンテキスト情報
 * @returns 構造化されたエラー
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function transformSupabaseError(
  error: unknown,
  context?: Record<string, unknown>
): StructuredError {
  const timestamp = new Date()

  // Supabaseエラーでない場合
  if (!isSupabaseError(error)) {
    // 環境変数未設定エラーの特別処理
    if (
      error instanceof Error &&
      error.message.includes('Missing Supabase environment variables')
    ) {
      return {
        code: 'ERR_CONFIG',
        message: error.message,
        userMessage: 'データベース接続が設定されていません。管理者にお問い合わせください。',
        level: 'critical',
        category: 'system',
        timestamp,
        context,
        originalError: error,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }
    }

    // 一般的なエラーとして処理
    const message = error instanceof Error ? error.message : String(error)
    return {
      code: 'ERR_UNKNOWN',
      message: sanitizeErrorMessage(message),
      userMessage: getUserFriendlyMessage('ERR_UNKNOWN'),
      level: 'error',
      category: 'unknown',
      timestamp,
      context,
      originalError: error,
      stack:
        error instanceof Error && process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }

  // Supabaseエラーの解析
  const { code, category, message } = parseSupabaseError(error)

  // ユーザーメッセージの取得
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const userMessage =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    SUPABASE_USER_MESSAGES[code] ??
    getUserFriendlyMessage(code, undefined) ??
    'データベースエラーが発生しました。しばらく待ってから再度お試しください。'

  // エラーレベルの推測
  const level = inferErrorLevel(message, category)

  // コンテキスト情報の構築
  const errorContext = {
    ...context,
    supabase: {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      hint: error.hint,
    },
  }

  return {
    code,
    message: sanitizeErrorMessage(message),
    userMessage,
    level,
    category,
    context: errorContext,
    timestamp,
    originalError: error,
    stack:
      process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
  }
}

/**
 * Supabaseの操作を安全に実行
 * @param operation - 実行する操作
 * @param context - エラーコンテキスト
 * @returns 操作の結果またはエラー
 */
export async function safeSupabaseOperation<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<{ data?: T; error?: StructuredError }> {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    const structuredError = transformSupabaseError(error, context)

    // 開発環境でのみコンソール出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Supabase operation failed:', structuredError)
    }

    return { error: structuredError }
  }
}

/**
 * Supabaseレスポンスのエラーチェック
 * Supabaseクライアントの標準レスポンス形式に対応
 * @param response - Supabaseのレスポンス
 * @param context - エラーコンテキスト
 * @returns データまたはエラーをスロー
 */
export function checkSupabaseResponse<T>(
  response: { data: T | null; error: unknown },
  context?: Record<string, unknown>
): T {
  if (response.error !== null && response.error !== undefined) {
    throw transformSupabaseError(response.error, context)
  }

  if (response.data === null || response.data === undefined) {
    throw {
      code: 'ERR_NO_DATA',
      message: 'No data returned from Supabase',
      userMessage: 'データの取得に失敗しました。',
      level: 'error' as const,
      category: 'database' as const,
      timestamp: new Date(),
      context,
    } satisfies StructuredError
  }

  return response.data
}
