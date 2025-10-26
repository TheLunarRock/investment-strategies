/**
 * キャッシュヘルパー関数
 *
 * キャッシュ操作を簡素化するユーティリティ関数群です。
 * デコレータ、メモ化、非同期操作のラッパーなどを提供します。
 */

import { MemoryCache } from './memory-cache'
import type { CacheOptions, CacheValueGenerator } from './types'

/**
 * グローバルキャッシュインスタンス（オプション）
 * 必要な場合のみ初期化される
 */
let globalCache: MemoryCache<unknown> | undefined

/**
 * グローバルキャッシュを取得（遅延初期化）
 */
export function getGlobalCache(): MemoryCache<unknown> {
  if (!globalCache) {
    globalCache = new MemoryCache({
      maxSize: 500,
      strategy: 'lru',
      cleanupInterval: 300000, // 5分
    })
  }
  return globalCache
}

/**
 * キャッシュキー生成関数
 * オブジェクトや配列から一意のキーを生成
 *
 * @param prefix - キーのプレフィックス
 * @param args - キー生成に使用する引数
 * @returns 生成されたキャッシュキー
 */
export function createCacheKey(prefix: string, ...args: unknown[]): string {
  const suffix = args
    .map((arg) => {
      if (arg === null) return 'null'
      if (arg === undefined) return 'undefined'
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    })
    .join(':')

  return `${prefix}:${suffix}`
}

/**
 * 関数の結果をメモ化
 * 同じ引数での呼び出しはキャッシュから返す
 *
 * @param fn - メモ化する関数
 * @param options - キャッシュオプション
 * @returns メモ化された関数
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: {
    ttl?: number
    keyPrefix?: string
    cache?: MemoryCache<ReturnType<T>>
  }
): T {
  const cache =
    options?.cache ??
    new MemoryCache<ReturnType<T>>({
      maxSize: 100,
      strategy: 'lru',
    })

  const keyPrefix = options?.keyPrefix ?? (fn.name || 'memoized')

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = createCacheKey(keyPrefix, ...args)
    const cached = cache.get(key)

    if (cached !== undefined) {
      return cached
    }

    const result = fn(...args) as ReturnType<T>
    cache.set(key, result, { ttl: options?.ttl })

    return result
  }) as T
}

/**
 * 非同期関数の結果をキャッシュ
 * Promiseの結果を共有し、重複リクエストを防ぐ
 *
 * @param fn - キャッシュする非同期関数
 * @param options - キャッシュオプション
 * @returns キャッシュ機能を持つ非同期関数
 */
export function cacheAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: {
    ttl?: number
    keyPrefix?: string
    cache?: MemoryCache<ReturnType<T>>
    onError?: (error: Error) => void
  }
): T {
  const cache =
    options?.cache ??
    new MemoryCache<ReturnType<T>>({
      maxSize: 100,
      strategy: 'lru',
    })

  const keyPrefix = options?.keyPrefix ?? (fn.name || 'cached-async')
  const pendingPromises = new Map<string, Promise<Awaited<ReturnType<T>>>>()

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = createCacheKey(keyPrefix, ...args)

    // キャッシュチェック
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached as Awaited<ReturnType<T>>
    }

    // 実行中のPromiseがあれば共有（重複防止）
    const pending = pendingPromises.get(key)
    if (pending) {
      return pending
    }

    // 新規実行
    const promise = (async (): Promise<Awaited<ReturnType<T>>> => {
      try {
        const result = await fn(...args)
        cache.set(key, result as ReturnType<T>, { ttl: options?.ttl })
        return result as Awaited<ReturnType<T>>
      } catch (error) {
        // エラー時はキャッシュしない
        if (options?.onError) {
          options.onError(error as Error)
        }
        throw error
      } finally {
        // 実行完了後にpendingから削除
        pendingPromises.delete(key)
      }
    })()

    pendingPromises.set(key, promise)
    return promise
  }) as T
}

/**
 * キャッシュされた値を取得、なければ生成
 * get-or-setパターンの簡潔な実装
 *
 * @param cache - キャッシュインスタンス
 * @param key - キャッシュキー
 * @param generator - 値を生成する関数
 * @param options - キャッシュオプション
 * @returns キャッシュまたは生成された値
 */
export async function getCachedOrGenerate<T>(
  cache: MemoryCache<T>,
  key: string,
  generator: CacheValueGenerator<T>,
  options?: CacheOptions
): Promise<T> {
  // キャッシュチェック
  const cached = cache.get(key)
  if (cached !== undefined) {
    return cached
  }

  // 値を生成
  const value = await generator()

  // キャッシュに保存
  cache.set(key, value, options)

  return value
}

/**
 * タイムベースのキャッシュキー生成
 * 指定された間隔で自動的に新しいキーを生成
 *
 * @param prefix - キープレフィックス
 * @param intervalMs - キー更新間隔（ミリ秒）
 * @returns 時間ベースのキャッシュキー
 */
export function createTimeBasedKey(prefix: string, intervalMs: number = 60000): string {
  const bucket = Math.floor(Date.now() / intervalMs)
  return `${prefix}:t${bucket}`
}

/**
 * キャッシュのウォームアップ
 * 事前に値を生成してキャッシュに格納
 *
 * @param cache - キャッシュインスタンス
 * @param items - ウォームアップするアイテム
 */
export async function warmupCache<T>(
  cache: MemoryCache<T>,
  items: Array<{
    key: string
    generator: CacheValueGenerator<T>
    options?: CacheOptions
  }>
): Promise<void> {
  const promises = items.map(async ({ key, generator, options }) => {
    try {
      const value = await generator()
      cache.set(key, value, options)
    } catch (error) {
      // ウォームアップ失敗は警告のみ
      // eslint-disable-next-line no-console
      console.warn(`Cache warmup failed for key: ${key}`, error)
    }
  })

  await Promise.all(promises)
}

/**
 * 条件付きキャッシュ
 * 条件を満たす場合のみキャッシュする
 *
 * @param shouldCache - キャッシュするかどうかを判定する関数
 * @param cache - キャッシュインスタンス
 * @param key - キャッシュキー
 * @param value - キャッシュする値
 * @param options - キャッシュオプション
 */
export function conditionalCache<T>(
  shouldCache: (value: T) => boolean,
  cache: MemoryCache<T>,
  key: string,
  value: T,
  options?: CacheOptions
): void {
  if (shouldCache(value)) {
    cache.set(key, value, options)
  }
}

/**
 * バッチキャッシュ取得
 * 複数のキーを一度に取得し、存在しないものは生成
 *
 * @param cache - キャッシュインスタンス
 * @param keys - 取得するキーの配列
 * @param generator - 値を生成する関数（キーごと）
 * @param options - キャッシュオプション
 * @returns キーと値のマップ
 */
export async function getBatch<T>(
  cache: MemoryCache<T>,
  keys: string[],
  generator: (key: string) => T | Promise<T>,
  options?: CacheOptions
): Promise<Map<string, T>> {
  const result = new Map<string, T>()
  const missingKeys: string[] = []

  // キャッシュから取得
  for (const key of keys) {
    const cached = cache.get(key)
    if (cached !== undefined) {
      result.set(key, cached)
    } else {
      missingKeys.push(key)
    }
  }

  // 存在しないものを生成
  if (missingKeys.length > 0) {
    const promises = missingKeys.map(async (key) => {
      const value = await generator(key)
      cache.set(key, value, options)
      result.set(key, value)
    })

    await Promise.all(promises)
  }

  return result
}

/**
 * キャッシュの統計情報を文字列として取得
 * デバッグ用のフォーマット済み文字列
 *
 * @param cache - キャッシュインスタンス
 * @returns フォーマット済みの統計情報
 */
export function getCacheStatsString(cache: MemoryCache<unknown>): string {
  const stats = cache.getStats()

  return `
Cache Statistics:
  Size: ${stats.size}
  Hit Rate: ${stats.hitRate.toFixed(2)}%
  Hits: ${stats.hits}
  Misses: ${stats.misses}
  Evictions: ${stats.evictions}
  Estimated Memory: ${stats.estimatedSize !== undefined ? `${(stats.estimatedSize / 1024).toFixed(2)} KB` : 'N/A'}
  `.trim()
}

/**
 * グローバルキャッシュのクリーンアップ
 * アプリケーション終了時に呼び出す
 */
export function destroyGlobalCache(): void {
  if (globalCache) {
    globalCache.destroy()
    globalCache = undefined
  }
}
