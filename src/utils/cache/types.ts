/**
 * キャッシュユーティリティの型定義
 *
 * このファイルは、メモリキャッシュ機能の型を定義します。
 * パフォーマンス最適化のために使用される、完全にオプショナルな機能です。
 */

/**
 * キャッシュエントリー
 * 個別のキャッシュアイテムの構造
 */
export interface CacheEntry<T = unknown> {
  /** キャッシュされた値 */
  value: T

  /** キャッシュ作成時刻 */
  createdAt: number

  /** 最後にアクセスされた時刻 */
  lastAccessedAt: number

  /** アクセス回数 */
  accessCount: number

  /** TTL（Time To Live）ミリ秒単位、undefinedの場合は無期限 */
  ttl?: number

  /** タグ（キャッシュのグループ化に使用） */
  tags?: string[]
}

/**
 * キャッシュオプション
 * キャッシュ設定時のオプション
 */
export interface CacheOptions {
  /** TTL（Time To Live）ミリ秒単位 */
  ttl?: number

  /** タグ（後でまとめて削除するため） */
  tags?: string[]

  /** 既存のエントリーを上書きするか */
  overwrite?: boolean
}

/**
 * キャッシュ統計情報
 * キャッシュの使用状況を表す統計データ
 */
export interface CacheStats {
  /** 現在のエントリー数 */
  size: number

  /** ヒット数（キャッシュから取得成功） */
  hits: number

  /** ミス数（キャッシュに存在せず） */
  misses: number

  /** ヒット率（パーセンテージ） */
  hitRate: number

  /** 削除されたエントリー数 */
  evictions: number

  /** 最も古いエントリーの作成時刻 */
  oldestEntry?: number

  /** 最新のエントリーの作成時刻 */
  newestEntry?: number

  /** 総メモリ使用量の推定値（バイト） */
  estimatedSize?: number
}

/**
 * キャッシュストラテジー
 * キャッシュの削除戦略
 */
export type CacheStrategy =
  | 'lru' // Least Recently Used（最も使用されていないものを削除）
  | 'lfu' // Least Frequently Used（最も頻度が低いものを削除）
  | 'fifo' // First In First Out（最も古いものを削除）
  | 'ttl' // Time To Live（期限切れのみ削除）

/**
 * キャッシュ設定
 * メモリキャッシュ全体の設定
 */
export interface CacheConfig {
  /** 最大エントリー数 */
  maxSize?: number

  /** デフォルトTTL（ミリ秒） */
  defaultTtl?: number

  /** キャッシュストラテジー */
  strategy?: CacheStrategy

  /** 自動クリーンアップ間隔（ミリ秒） */
  cleanupInterval?: number

  /** デバッグモード（詳細ログ出力） */
  debug?: boolean

  /** キー変換関数（正規化用） */
  keyTransformer?: (key: string) => string
}

/**
 * キャッシュキー生成関数
 * 複雑なオブジェクトからキーを生成
 */
export type CacheKeyGenerator = (...args: unknown[]) => string

/**
 * キャッシュ値生成関数
 * キャッシュミス時に値を生成
 */
export type CacheValueGenerator<T> = () => T | Promise<T>

/**
 * キャッシュイベント
 * キャッシュ操作時のイベント
 */
export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'clear'
  key?: string
  value?: unknown
  timestamp: number
}

/**
 * キャッシュリスナー
 * キャッシュイベントを監視
 */
export type CacheListener = (event: CacheEvent) => void

/**
 * メモリキャッシュインターフェース
 * キャッシュ実装が満たすべき契約
 */
export interface IMemoryCache<T = unknown> {
  /** 値を取得 */
  get(key: string): T | undefined

  /** 値を設定 */
  set(key: string, value: T, options?: CacheOptions): void

  /** キーが存在するか確認 */
  has(key: string): boolean

  /** エントリーを削除 */
  delete(key: string): boolean

  /** すべてクリア */
  clear(): void

  /** 統計情報を取得 */
  getStats(): CacheStats

  /** タグでエントリーを削除 */
  deleteByTag(tag: string): number

  /** 期限切れエントリーをクリーンアップ */
  cleanup(): number

  /** キャッシュサイズを取得 */
  size(): number
}
