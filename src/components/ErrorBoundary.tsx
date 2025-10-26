'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  featureName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * エラー境界コンポーネント
 * フィーチャー間のエラー伝播を防ぎ、各フィーチャーを独立させる
 * 
 * 使用例:
 * <ErrorBoundary featureName="user">
 *   <UserPageContent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // エラーログを出力（本番環境では外部サービスに送信）
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(
        `ErrorBoundary caught error in ${this.props.featureName ?? 'unknown'} feature:`,
        error,
        errorInfo
      )
    }
  }

  override render() {
    if (this.state.hasError) {
      // カスタムフォールバックまたはデフォルトエラーUI
      if (this.props.fallback !== undefined) {
        return <>{this.props.fallback}</>
      }

      return (
        <div className="p-8 border border-red-200 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            {this.props.featureName !== undefined
              ? `${this.props.featureName}機能でエラーが発生しました`
              : 'エラーが発生しました'
            }
          </h2>
          <p className="text-red-700">
            申し訳ございません。一時的な問題が発生しています。
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error !== undefined && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-600">
                エラー詳細（開発環境のみ）
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {this.state.error.toString()}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * フィーチャー専用のエラー境界ラッパー
 * フィーチャー名を自動設定
 */
export function FeatureErrorBoundary({ 
  featureName, 
  children,
  fallback
}: {
  featureName: string
  children: ReactNode
  fallback?: ReactNode
}) {
  return (
    <ErrorBoundary featureName={featureName} fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}