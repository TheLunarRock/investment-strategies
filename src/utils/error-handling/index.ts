/**
 * エラーハンドリングユーティリティ
 *
 * アプリケーション全体で使用できる統一的なエラー処理機能を提供します。
 * このモジュールは完全にオプショナルで、必要な場合のみインポートして使用します。
 *
 * @example
 * ```typescript
 * import { handleError, transformError } from '@/utils/error-handling'
 *
 * try {
 *   // 何らかの処理
 * } catch (error) {
 *   const structured = transformError(error)
 *   console.error(structured.userMessage)
 * }
 * ```
 */

import type { ErrorCategory, ErrorHandlingOptions, ErrorLevel, StructuredError } from './types'
import {
  formatDeveloperMessage,
  getUserFriendlyMessage,
  inferErrorCategory,
  inferErrorLevel,
  sanitizeErrorMessage,
} from './user-friendly'

// 型のエクスポート
export type {
  ErrorCategory,
  ErrorHandlingOptions,
  ErrorLevel,
  ErrorMessageMap,
  ErrorTransformer,
  StructuredError,
} from './types'

// ユーザーフレンドリー機能のエクスポート
// 注: これらの関数は外部から使用される想定のため、すべてエクスポートします
export {
  formatDeveloperMessage,
  getUserFriendlyMessage,
  inferErrorCategory,
  inferErrorLevel,
  sanitizeErrorMessage,
} from './user-friendly'

// Supabase機能のエクスポート
export {
  checkSupabaseResponse,
  isSupabaseError,
  safeSupabaseOperation,
  transformSupabaseError,
} from './supabase'

/**
 * 汎用エラー変換関数
 * 任意のエラーを構造化されたエラーに変換
 *
 * @param error - 変換するエラー
 * @param options - エラーハンドリングオプション
 * @returns 構造化されたエラー
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function transformError(error: unknown, options?: ErrorHandlingOptions): StructuredError {
  const timestamp = new Date()

  // 既に構造化されたエラーの場合
  if (isStructuredError(error)) {
    // オプションでコンテキストを追加
    if (options?.context) {
      return {
        ...error,
        context: { ...error.context, ...options.context },
      }
    }
    return error
  }

  // Errorオブジェクトの場合
  if (error instanceof Error) {
    const message = sanitizeErrorMessage(error.message)
    const category = inferErrorCategory(message)
    const level = inferErrorLevel(message, category)

    return {
      code: error.name !== 'Error' ? error.name : undefined,
      message,
      userMessage: options?.defaultUserMessage ?? getUserFriendlyMessage(undefined, message),
      level,
      category,
      context: options?.context,
      timestamp,
      originalError: error,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }

  // 文字列エラーの場合
  if (typeof error === 'string') {
    const message = sanitizeErrorMessage(error)
    const category = inferErrorCategory(message)
    const level = inferErrorLevel(message, category)

    return {
      message,
      userMessage: options?.defaultUserMessage ?? getUserFriendlyMessage(undefined, message),
      level,
      category,
      context: options?.context,
      timestamp,
      originalError: error,
    }
  }

  // その他の型の場合
  return {
    message: 'Unknown error occurred',
    userMessage: options?.defaultUserMessage ?? '予期しないエラーが発生しました。',
    level: 'error',
    category: 'unknown',
    context: options?.context,
    timestamp,
    originalError: error,
  }
}

/**
 * 構造化されたエラーかどうかを判定
 * @param error - チェックするオブジェクト
 * @returns 構造化されたエラーかどうか
 */
export function isStructuredError(error: unknown): error is StructuredError {
  if (error === null || error === undefined || typeof error !== 'object') {
    return false
  }

  const e = error as Record<string, unknown>

  return (
    typeof e.message === 'string' &&
    typeof e.level === 'string' &&
    typeof e.category === 'string' &&
    e.timestamp instanceof Date
  )
}

/**
 * エラーを処理してログ出力
 * @param error - 処理するエラー
 * @param options - エラーハンドリングオプション
 * @returns 構造化されたエラー
 */
export function handleError(error: unknown, options?: ErrorHandlingOptions): StructuredError {
  const structured = transformError(error, options)

  // ログ出力（オプション）
  if (options?.log !== false) {
    logError(structured)
  }

  // 再スロー（オプション）
  if (options?.rethrow === true) {
    throw structured
  }

  return structured
}

/**
 * エラーをログ出力
 * @param error - ログ出力するエラー
 */
function logError(error: StructuredError): void {
  // 開発環境でのみ詳細ログ
  if (process.env.NODE_ENV === 'development') {
    const message = formatDeveloperMessage(error)

    // エラーレベルに応じて適切なログ関数を使用
    switch (error.level) {
      case 'critical':
      case 'error':
        // eslint-disable-next-line no-console
        console.error(message, error.stack)
        break
      case 'warning':
        // eslint-disable-next-line no-console
        console.warn(message)
        break
      case 'info':
        // eslint-disable-next-line no-console
        console.info(message)
        break
    }
  } else {
    // 本番環境では最小限のログ
    if (error.level === 'critical' || error.level === 'error') {
      // eslint-disable-next-line no-console
      console.error(`[${error.level}] ${error.code ?? error.category}: ${error.userMessage}`)
    }
  }
}

/**
 * Promiseチェーンでのエラーハンドリング用ヘルパー
 * @param operation - 実行する非同期操作
 * @param options - エラーハンドリングオプション
 * @returns 結果またはエラー
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  options?: ErrorHandlingOptions
): Promise<{ data?: T; error?: StructuredError }> {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    const structured = handleError(error, { ...options, rethrow: false })
    return { error: structured }
  }
}

/**
 * 複数のエラーを集約
 * @param errors - エラーの配列
 * @returns 集約されたエラー
 */
export function aggregateErrors(errors: StructuredError[]): StructuredError {
  if (errors.length === 0) {
    throw new Error('No errors to aggregate')
  }

  if (errors.length === 1) {
    return errors[0]
  }

  // 最も重大なレベルを特定
  const levelOrder: ErrorLevel[] = ['critical', 'error', 'warning', 'info']
  const mostSevereLevel =
    levelOrder.find((level) => errors.some((e) => e.level === level)) ?? 'error'

  // カテゴリをカウント
  const categories = errors.map((e) => e.category)
  const mostCommonCategory =
    categories.reduce(
      (acc, cat) => {
        const count = categories.filter((c) => c === cat).length
        return count > (acc.count ?? 0) ? { category: cat, count } : acc
      },
      {} as { category?: ErrorCategory; count?: number }
    ).category ?? 'unknown'

  return {
    code: 'ERR_MULTIPLE',
    message: `Multiple errors occurred (${errors.length})`,
    userMessage: '複数のエラーが発生しました。',
    level: mostSevereLevel,
    category: mostCommonCategory,
    context: {
      errors: errors.map((e) => ({
        code: e.code,
        message: e.message,
        category: e.category,
        level: e.level,
      })),
    },
    timestamp: new Date(),
  }
}
