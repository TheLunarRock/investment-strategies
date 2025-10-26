/**
 * キャッシュユーティリティ
 *
 * 高性能なメモリキャッシュシステムを提供します。
 * このモジュールは完全にオプショナルで、必要な場合のみインポートして使用します。
 *
 * @example
 * ```typescript
 * // 基本的な使用方法
 * import { MemoryCache } from '@/utils/cache'
 *
 * const cache = new MemoryCache<UserData>({
 *   maxSize: 100,
 *   strategy: 'lru',
 *   defaultTtl: 60000 // 1分
 * })
 *
 * cache.set('user:123', userData)
 * const user = cache.get('user:123')
 * ```
 *
 * @example
 * ```typescript
 * // メモ化の使用
 * import { memoize } from '@/utils/cache'
 *
 * const expensiveCalculation = memoize((n: number) => {
 *   // 重い計算処理
 *   return n * n
 * }, { ttl: 30000 })
 *
 * const result = expensiveCalculation(100) // 計算実行
 * const cached = expensiveCalculation(100) // キャッシュから取得
 * ```
 *
 * @example
 * ```typescript
 * // 非同期関数のキャッシュ
 * import { cacheAsync } from '@/utils/cache'
 *
 * const fetchUserData = cacheAsync(
 *   async (id: string) => {
 *     const response = await fetch(`/api/users/${id}`)
 *     return response.json()
 *   },
 *   { ttl: 300000 } // 5分
 * )
 * ```
 */

// 型のエクスポート
export type {
  CacheConfig,
  CacheEntry,
  CacheEvent,
  CacheKeyGenerator,
  CacheListener,
  CacheOptions,
  CacheStats,
  CacheStrategy,
  CacheValueGenerator,
  IMemoryCache,
} from './types'

// メインクラスのエクスポート
export { MemoryCache } from './memory-cache'
export { default } from './memory-cache'

// ヘルパー関数のエクスポート
export {
  cacheAsync,
  conditionalCache,
  createCacheKey,
  createTimeBasedKey,
  destroyGlobalCache,
  getBatch,
  getCachedOrGenerate,
  getCacheStatsString,
  getGlobalCache,
  memoize,
  warmupCache,
} from './helpers'

/**
 * プリセット設定
 * よく使用される設定の組み合わせ
 */
export const CachePresets = {
  /**
   * API応答のキャッシュ用設定
   * 短いTTLとLRU戦略
   */
  api: {
    maxSize: 200,
    strategy: 'lru' as const,
    defaultTtl: 60000, // 1分
    cleanupInterval: 120000, // 2分
  },

  /**
   * セッションデータのキャッシュ用設定
   * 長いTTLと小さいサイズ
   */
  session: {
    maxSize: 50,
    strategy: 'lru' as const,
    defaultTtl: 1800000, // 30分
    cleanupInterval: 600000, // 10分
  },

  /**
   * 計算結果のキャッシュ用設定
   * TTLなしでLFU戦略
   */
  computation: {
    maxSize: 500,
    strategy: 'lfu' as const,
    cleanupInterval: 300000, // 5分
  },

  /**
   * 静的リソースのキャッシュ用設定
   * 大きいサイズと長いTTL
   */
  static: {
    maxSize: 1000,
    strategy: 'fifo' as const,
    defaultTtl: 3600000, // 1時間
    cleanupInterval: 1800000, // 30分
  },

  /**
   * 開発環境用設定
   * デバッグ有効と短いTTL
   */
  development: {
    maxSize: 100,
    strategy: 'lru' as const,
    defaultTtl: 10000, // 10秒
    cleanupInterval: 30000, // 30秒
    debug: true,
  },
} as const

/**
 * キャッシュ無効化のベストプラクティス
 *
 * 1. タグベースの無効化
 * ```typescript
 * cache.set('user:123', data, { tags: ['user', 'profile'] })
 * cache.set('user:456', data, { tags: ['user', 'settings'] })
 * cache.deleteByTag('user') // すべてのユーザーデータを削除
 * ```
 *
 * 2. TTLベースの自動無効化
 * ```typescript
 * cache.set('api:response', data, { ttl: 60000 }) // 1分後に自動削除
 * ```
 *
 * 3. 手動無効化
 * ```typescript
 * cache.delete('specific:key')
 * cache.clear() // すべてクリア
 * ```
 */

/**
 * パフォーマンスのヒント
 *
 * 1. 適切なストラテジー選択
 *    - LRU: 最近のアクセスパターンが重要な場合
 *    - LFU: アクセス頻度が重要な場合
 *    - FIFO: 単純な時系列管理の場合
 *    - TTL: 有効期限管理が主な場合
 *
 * 2. サイズの最適化
 *    - メモリ使用量とヒット率のバランスを考慮
 *    - getStats()で統計情報を監視
 *
 * 3. クリーンアップ間隔の調整
 *    - TTLを使用する場合は適切な間隔を設定
 *    - メモリリークを防ぐために定期的なクリーンアップを実施
 */

/**
 * メモリ管理の注意点
 *
 * 1. 大きなオブジェクトのキャッシュ
 *    - estimatedSizeを監視してメモリ使用量を把握
 *    - 必要に応じてmaxSizeを調整
 *
 * 2. 循環参照の回避
 *    - キャッシュされるオブジェクトに循環参照がないことを確認
 *    - WeakMapの使用を検討（別途実装が必要）
 *
 * 3. アプリケーション終了時のクリーンアップ
 *    - destroyGlobalCache()を呼び出してリソースを解放
 *    - 個別のキャッシュインスタンスも.destroy()を呼び出す
 */
