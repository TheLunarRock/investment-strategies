/**
 * エラーハンドリングユーティリティの型定義
 *
 * このファイルは、アプリケーション全体で使用されるエラー関連の型を定義します。
 * すべての型は汎用的で、特定のフレームワークやライブラリに依存しません。
 */

/**
 * エラーレベルの定義
 * エラーの重要度を表現するための列挙型
 */
export type ErrorLevel = 'critical' | 'error' | 'warning' | 'info'

/**
 * エラーカテゴリの定義
 * エラーの種類を分類するための型
 */
export type ErrorCategory =
  | 'network' // ネットワーク関連のエラー
  | 'database' // データベース関連のエラー
  | 'auth' // 認証・認可関連のエラー
  | 'validation' // バリデーションエラー
  | 'business' // ビジネスロジックエラー
  | 'system' // システムエラー
  | 'unknown' // 不明なエラー

/**
 * 構造化されたエラー情報
 * エラーの詳細情報を保持する型
 */
export interface StructuredError {
  /** エラーコード（例: 'ERR_NETWORK_TIMEOUT'） */
  code?: string

  /** エラーメッセージ（開発者向け） */
  message: string

  /** ユーザー向けのメッセージ */
  userMessage?: string

  /** エラーレベル */
  level: ErrorLevel

  /** エラーカテゴリ */
  category: ErrorCategory

  /** 追加のコンテキスト情報 */
  context?: Record<string, unknown>

  /** エラーのスタックトレース（開発環境のみ） */
  stack?: string

  /** エラー発生時刻 */
  timestamp: Date

  /** 元のエラーオブジェクト（あれば） */
  originalError?: unknown
}

/**
 * エラーハンドリングオプション
 * エラー処理時の設定を定義する型
 */
export interface ErrorHandlingOptions {
  /** ログを出力するか */
  log?: boolean

  /** ユーザーに通知するか */
  notify?: boolean

  /** エラーを再スローするか */
  rethrow?: boolean

  /** デフォルトのユーザーメッセージ */
  defaultUserMessage?: string

  /** エラーコンテキストの追加情報 */
  context?: Record<string, unknown>
}

/**
 * エラー変換関数の型
 * 任意のエラーを構造化されたエラーに変換する関数
 */
export type ErrorTransformer = (error: unknown, options?: ErrorHandlingOptions) => StructuredError

/**
 * エラーメッセージマッピング
 * エラーコードからユーザーメッセージへのマッピング
 */
export interface ErrorMessageMap {
  [key: string]: {
    userMessage: string
    level?: ErrorLevel
    category?: ErrorCategory
  }
}
