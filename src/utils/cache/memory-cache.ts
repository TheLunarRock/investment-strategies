/**
 * メモリキャッシュ実装
 *
 * 高性能なインメモリキャッシュシステムを提供します。
 * LRU、LFU、FIFO、TTLストラテジーをサポートし、
 * 自動クリーンアップとイベント監視機能を備えています。
 *
 * @example
 * ```typescript
 * const cache = new MemoryCache<UserData>({
 *   maxSize: 100,
 *   strategy: 'lru',
 *   defaultTtl: 5 * 60 * 1000 // 5分
 * })
 *
 * cache.set('user:123', userData, { ttl: 10000 })
 * const user = cache.get('user:123')
 * ```
 */

import type {
  CacheConfig,
  CacheEntry,
  CacheEvent,
  CacheListener,
  CacheOptions,
  CacheStats,
  CacheStrategy,
  IMemoryCache,
} from './types'

/**
 * 内部設定の型定義
 */
type InternalCacheConfig = {
  maxSize: number
  defaultTtl?: number
  strategy: CacheStrategy
  cleanupInterval: number
  debug: boolean
  keyTransformer: (key: string) => string
}

/**
 * メモリキャッシュクラス
 * 完全にオプショナルな機能として実装
 */
export class MemoryCache<T = unknown> implements IMemoryCache<T> {
  private entries: Map<string, CacheEntry<T>>
  private config: InternalCacheConfig
  private listeners: Set<CacheListener>
  private cleanupTimer?: NodeJS.Timeout
  private stats: {
    hits: number
    misses: number
    evictions: number
  }

  /**
   * コンストラクタ
   * @param config - キャッシュ設定
   */
  constructor(config: CacheConfig = {}) {
    this.entries = new Map()
    this.listeners = new Set()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    }

    // デフォルト設定との統合
    this.config = {
      maxSize: config.maxSize ?? 1000,
      defaultTtl: config.defaultTtl,
      strategy: config.strategy ?? 'lru',
      cleanupInterval: config.cleanupInterval ?? 60000, // 1分
      debug: config.debug ?? false,
      keyTransformer: config.keyTransformer ?? ((key) => key),
    }

    // 自動クリーンアップの開始
    if (this.config.cleanupInterval > 0) {
      this.startAutoCleanup()
    }
  }

  /**
   * 値を取得
   */
  get(key: string): T | undefined {
    const normalizedKey = this.config.keyTransformer(key)
    const entry = this.entries.get(normalizedKey)

    if (!entry) {
      this.stats.misses++
      this.emitEvent({ type: 'miss', key: normalizedKey, timestamp: Date.now() })
      return undefined
    }

    // TTLチェック
    if (entry.ttl !== undefined && Date.now() - entry.createdAt > entry.ttl) {
      this.delete(normalizedKey)
      this.stats.misses++
      this.emitEvent({ type: 'miss', key: normalizedKey, timestamp: Date.now() })
      return undefined
    }

    // アクセス情報の更新
    entry.lastAccessedAt = Date.now()
    entry.accessCount++

    this.stats.hits++
    this.emitEvent({
      type: 'hit',
      key: normalizedKey,
      value: entry.value,
      timestamp: Date.now(),
    })

    return entry.value
  }

  /**
   * 値を設定
   */
  set(key: string, value: T, options?: CacheOptions): void {
    const normalizedKey = this.config.keyTransformer(key)

    // 既存エントリのチェック
    if (this.entries.has(normalizedKey) && options?.overwrite !== true) {
      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.log(`[Cache] Key already exists: ${normalizedKey}`)
      }
      return
    }

    // サイズ制限チェックと削除戦略の実行
    if (this.entries.size >= this.config.maxSize) {
      this.evictEntry()
    }

    const now = Date.now()
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      ttl: options?.ttl ?? this.config.defaultTtl,
      tags: options?.tags,
    }

    this.entries.set(normalizedKey, entry)
    this.emitEvent({
      type: 'set',
      key: normalizedKey,
      value,
      timestamp: now,
    })

    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[Cache] Set: ${normalizedKey}`)
    }
  }

  /**
   * キーが存在するか確認
   */
  has(key: string): boolean {
    const normalizedKey = this.config.keyTransformer(key)
    const entry = this.entries.get(normalizedKey)

    if (!entry) {
      return false
    }

    // TTLチェック
    if (entry.ttl !== undefined && Date.now() - entry.createdAt > entry.ttl) {
      this.delete(normalizedKey)
      return false
    }

    return true
  }

  /**
   * エントリーを削除
   */
  delete(key: string): boolean {
    const normalizedKey = this.config.keyTransformer(key)
    const existed = this.entries.delete(normalizedKey)

    if (existed) {
      this.emitEvent({
        type: 'delete',
        key: normalizedKey,
        timestamp: Date.now(),
      })

      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.log(`[Cache] Delete: ${normalizedKey}`)
      }
    }

    return existed
  }

  /**
   * すべてクリア
   */
  clear(): void {
    const size = this.entries.size
    this.entries.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    }

    this.emitEvent({
      type: 'clear',
      timestamp: Date.now(),
    })

    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[Cache] Cleared ${size} entries`)
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): CacheStats {
    const entries = Array.from(this.entries.values())
    const total = this.stats.hits + this.stats.misses

    return {
      size: this.entries.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      evictions: this.stats.evictions,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map((e) => e.createdAt)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map((e) => e.createdAt)) : undefined,
      estimatedSize: this.estimateMemorySize(),
    }
  }

  /**
   * タグでエントリーを削除
   */
  deleteByTag(tag: string): number {
    let deleted = 0

    for (const [key, entry] of this.entries) {
      if (entry.tags?.includes(tag) === true) {
        this.entries.delete(key)
        deleted++

        this.emitEvent({
          type: 'delete',
          key,
          timestamp: Date.now(),
        })
      }
    }

    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[Cache] Deleted ${deleted} entries with tag: ${tag}`)
    }

    return deleted
  }

  /**
   * 期限切れエントリーをクリーンアップ
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.entries) {
      if (entry.ttl !== undefined && now - entry.createdAt > entry.ttl) {
        this.entries.delete(key)
        cleaned++

        this.emitEvent({
          type: 'evict',
          key,
          timestamp: now,
        })
      }
    }

    if (this.config.debug && cleaned > 0) {
      // eslint-disable-next-line no-console
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`)
    }

    return cleaned
  }

  /**
   * キャッシュサイズを取得
   */
  size(): number {
    return this.entries.size
  }

  /**
   * リスナーを追加
   */
  addListener(listener: CacheListener): void {
    this.listeners.add(listener)
  }

  /**
   * リスナーを削除
   */
  removeListener(listener: CacheListener): void {
    this.listeners.delete(listener)
  }

  /**
   * クリーンアップを停止
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.clear()
    this.listeners.clear()
  }

  // ===== Private Methods =====

  /**
   * エントリーを削除（ストラテジーに基づく）
   */
  private evictEntry(): void {
    let keyToEvict: string | undefined

    switch (this.config.strategy) {
      case 'lru':
        keyToEvict = this.findLRUKey()
        break
      case 'lfu':
        keyToEvict = this.findLFUKey()
        break
      case 'fifo':
        keyToEvict = this.findFIFOKey()
        break
      case 'ttl':
        // TTL戦略では期限切れのみ削除（cleanup()で処理）
        this.cleanup()
        // それでも容量オーバーなら最も古いものを削除
        if (this.entries.size >= this.config.maxSize) {
          keyToEvict = this.findFIFOKey()
        }
        break
    }

    if (keyToEvict !== undefined) {
      this.entries.delete(keyToEvict)
      this.stats.evictions++

      this.emitEvent({
        type: 'evict',
        key: keyToEvict,
        timestamp: Date.now(),
      })

      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.log(`[Cache] Evicted: ${keyToEvict} (strategy: ${this.config.strategy})`)
      }
    }
  }

  /**
   * LRU（最も使用されていない）キーを検索
   */
  private findLRUKey(): string | undefined {
    let lruKey: string | undefined
    let lruTime = Infinity

    for (const [key, entry] of this.entries) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt
        lruKey = key
      }
    }

    return lruKey
  }

  /**
   * LFU（最も頻度が低い）キーを検索
   */
  private findLFUKey(): string | undefined {
    let lfuKey: string | undefined
    let lfuCount = Infinity

    for (const [key, entry] of this.entries) {
      if (entry.accessCount < lfuCount) {
        lfuCount = entry.accessCount
        lfuKey = key
      }
    }

    return lfuKey
  }

  /**
   * FIFO（最も古い）キーを検索
   */
  private findFIFOKey(): string | undefined {
    let fifoKey: string | undefined
    let fifoTime = Infinity

    for (const [key, entry] of this.entries) {
      if (entry.createdAt < fifoTime) {
        fifoTime = entry.createdAt
        fifoKey = key
      }
    }

    return fifoKey
  }

  /**
   * メモリ使用量を推定（簡易版）
   */
  private estimateMemorySize(): number {
    let size = 0

    for (const [key, entry] of this.entries) {
      // キーのサイズ
      size += key.length * 2 // UTF-16

      // 値のサイズ（簡易推定）
      const value = JSON.stringify(entry.value)
      size += value.length * 2

      // メタデータ
      size += 100 // 固定オーバーヘッド
    }

    return size
  }

  /**
   * イベントを発行
   */
  private emitEvent(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        if (this.config.debug) {
          // eslint-disable-next-line no-console
          console.error('[Cache] Listener error:', error)
        }
      }
    }
  }

  /**
   * 自動クリーンアップを開始
   */
  private startAutoCleanup(): void {
    // 無限ループ防止: 既存のタイマーがある場合はクリア
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanup()
      if (this.config.debug && cleaned > 0) {
        // eslint-disable-next-line no-console
        console.log(`[Cache] Auto cleanup: ${cleaned} entries`)
      }
    }, this.config.cleanupInterval)

    // Node.jsのタイマーが他の処理をブロックしないように設定
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref()
    }
  }
}

/**
 * デフォルトエクスポート
 * 簡単な使用のため
 */
export default MemoryCache
