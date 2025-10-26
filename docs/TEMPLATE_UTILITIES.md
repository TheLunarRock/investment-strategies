# Template v3.0 ユーティリティガイド

このドキュメントでは、Template v3.0で提供される高品質なユーティリティ機能について説明します。
これらの機能はすべて**完全にオプショナル**であり、必要な場合のみインポートして使用します。

## 目次

1. [エラーハンドリング](#エラーハンドリング)
2. [保護されたフィーチャー](#保護されたフィーチャー)
3. [メモリキャッシュ](#メモリキャッシュ)

---

## エラーハンドリング

統一的で使いやすいエラーハンドリングシステムを提供します。

### 特徴

- 🛡️ **ユーザーフレンドリーなメッセージ**: 技術的なエラーを分かりやすく変換
- 📊 **構造化されたエラー**: 一貫性のあるエラーオブジェクト
- 🎯 **エラーレベルとカテゴリ**: 適切な対応を判断可能
- 🔧 **Supabase統合**: Supabaseエラーの専用処理

### 基本的な使用方法

```typescript
import { transformError, handleError, tryCatch } from '@/utils/error-handling'

// 1. エラーの変換
try {
  // 危険な処理
} catch (error) {
  const structured = transformError(error)
  console.log(structured.userMessage) // ユーザー向けメッセージ
  console.log(structured.level) // critical, error, warning, info
  console.log(structured.category) // network, database, auth等
}

// 2. エラーのハンドリング（ログ付き）
try {
  // 危険な処理
} catch (error) {
  const structured = handleError(error, {
    defaultUserMessage: 'カスタムメッセージ',
    context: { userId, action: 'データ取得' },
    log: true, // 自動ログ出力
  })
}

// 3. Promise形式のエラーハンドリング
const { data, error } = await tryCatch(
  async () => {
    return await fetchData()
  },
  { defaultUserMessage: 'データの取得に失敗しました' }
)

if (error) {
  // エラー処理
  alert(error.userMessage)
} else {
  // 正常処理
  console.log(data)
}
```

### Supabase統合

```typescript
import { transformSupabaseError, checkSupabaseResponse } from '@/utils/error-handling'

// Supabaseエラーの変換
const { data, error } = await supabase.from('users').select()
if (error) {
  const structured = transformSupabaseError(error, {
    operation: 'ユーザー取得',
  })
  // structured.userMessage: "データベースへの接続に失敗しました"
}

// レスポンスチェック（エラー時は自動throw）
const data = await checkSupabaseResponse(supabase.from('users').select())
```

### エラーの集約

```typescript
import { aggregateErrors } from '@/utils/error-handling'

// 複数のエラーを1つにまとめる
const errors: StructuredError[] = []

// 複数の処理でエラー収集
if (validationError) errors.push(transformError(validationError))
if (networkError) errors.push(transformError(networkError))

// 集約
if (errors.length > 0) {
  const aggregated = aggregateErrors(errors)
  console.log(aggregated.level) // 最も重大なレベル
  console.log(aggregated.category) // 最も頻出のカテゴリ
}
```

---

## 保護されたフィーチャー

プロダクション環境で稼働中の重要機能を保護するメカニズムです。

### 特徴

- 🔒 **変更の制御**: 重要機能への変更を検出・制御
- 📝 **明示的な許可**: フラグによる変更許可
- 🚨 **緊急バイパス**: 緊急時の回避手段
- 🎯 **Git Hooks統合**: コミット時の自動チェック

### 設定方法

#### 1. 設定ファイルの作成

```bash
# サンプルをコピー
cp .claude/protected-features.example.json .claude/protected-features.json
```

#### 2. 保護したいフィーチャーを設定

```json
{
  "protectedFeatures": [
    {
      "name": "authentication",
      "description": "認証システム",
      "paths": ["src/features/auth/", "src/app/api/auth/"],
      "protection": "strict",
      "reason": "本番環境で2万人のユーザーが使用中",
      "protectedAt": "2025-01-15T00:00:00Z",
      "allowFlags": ["--allow-auth-changes", "--critical-auth-fix"]
    },
    {
      "name": "payment",
      "description": "決済処理",
      "paths": ["src/features/payment/", "src/lib/stripe/"],
      "protection": "strict",
      "reason": "決済処理のため変更には慎重な検証が必要",
      "allowFlags": ["--allow-payment-changes"]
    }
  ],
  "globalSettings": {
    "strictMode": true,
    "logChanges": true,
    "requireExplicitApproval": true,
    "emergencyBypass": "--emergency-override",
    "adminContact": "dev-team@example.com"
  }
}
```

### 使用方法

#### 通常のコミット（保護機能が検出）

```bash
git add src/features/auth/
git commit -m "fix: 認証エラーの修正"

# ❌ コミットがブロックされる
# ⚠️  保護されたフィーチャーへの変更が検出されました:
# 📦 authentication
#    理由: 本番環境で2万人のユーザーが使用中
#    許可フラグ: --allow-auth-changes, --critical-auth-fix
```

#### 許可フラグ付きコミット

```bash
git commit -m "fix: 認証エラーの修正 --allow-auth-changes"

# ✅ 許可フラグが確認されました。変更を続行します。
```

#### 緊急時のバイパス

```bash
git commit -m "critical: セキュリティパッチ適用 --emergency-override"

# 🚨 緊急バイパスモードが有効です。保護を無視して続行します。
```

### チェックコマンド

```bash
# 手動で保護チェックを実行
node scripts/check-protected-features.js

# Git Hooksのセットアップ（自動実行）
npm run setup:hooks
```

---

## メモリキャッシュ

高性能なインメモリキャッシュシステムで、API応答や計算結果をキャッシュします。

### 特徴

- ⚡ **高速アクセス**: メモリ内でのデータ管理
- 🎯 **複数の削除戦略**: LRU, LFU, FIFO, TTL
- 🔄 **自動クリーンアップ**: 期限切れデータの自動削除
- 📊 **統計情報**: ヒット率などの詳細な統計

### 基本的な使用方法

```typescript
import { MemoryCache } from '@/utils/cache'

// キャッシュインスタンスの作成
const cache = new MemoryCache<UserData>({
  maxSize: 100, // 最大100エントリー
  strategy: 'lru', // 最近使用されていないものを削除
  defaultTtl: 60000, // デフォルト1分
  cleanupInterval: 300000, // 5分ごとにクリーンアップ
})

// データの設定
cache.set('user:123', userData, {
  ttl: 300000, // 5分間有効
  tags: ['user', 'profile'], // タグ付け
})

// データの取得
const user = cache.get('user:123')

// タグで削除
cache.deleteByTag('user') // すべてのユーザーデータを削除

// 統計情報
const stats = cache.getStats()
console.log(`ヒット率: ${stats.hitRate}%`)
```

### 高度な使用方法

#### 関数のメモ化

```typescript
import { memoize } from '@/utils/cache'

// 重い計算処理をメモ化
const expensiveCalculation = memoize(
  (n: number) => {
    console.log('計算実行...')
    return fibonacci(n)
  },
  { ttl: 60000 } // 1分間キャッシュ
)

// 初回は計算実行
const result1 = expensiveCalculation(40) // "計算実行..." が表示

// 2回目はキャッシュから取得
const result2 = expensiveCalculation(40) // ログなし、高速
```

#### 非同期関数のキャッシュ

```typescript
import { cacheAsync } from '@/utils/cache'

// API呼び出しをキャッシュ
const fetchUserData = cacheAsync(
  async (userId: string) => {
    console.log('API呼び出し...')
    const response = await fetch(`/api/users/${userId}`)
    return response.json()
  },
  {
    ttl: 300000, // 5分
    onError: (error) => console.error('エラー:', error),
  }
)

// 重複リクエストを自動的に防ぐ
const [user1, user2] = await Promise.all([
  fetchUserData('123'), // API呼び出し実行
  fetchUserData('123'), // 同じPromiseを共有（重複防止）
])
```

#### プリセット設定の使用

```typescript
import { MemoryCache, CachePresets } from '@/utils/cache'

// API応答用のプリセット
const apiCache = new MemoryCache(CachePresets.api)

// セッションデータ用のプリセット
const sessionCache = new MemoryCache(CachePresets.session)

// 開発環境用（デバッグ有効）
const devCache = new MemoryCache(CachePresets.development)
```

#### バッチ処理

```typescript
import { getBatch } from '@/utils/cache'

// 複数のキーを一度に処理
const userIds = ['123', '456', '789']

const users = await getBatch(
  cache,
  userIds.map((id) => `user:${id}`),
  async (key) => {
    const id = key.split(':')[1]
    return await fetchUser(id)
  },
  { ttl: 300000 }
)

// Map<string, UserData> が返される
users.forEach((user, key) => {
  console.log(`${key}: ${user.name}`)
})
```

### 削除戦略の選び方

| 戦略     | 説明                           | 使用場面                     |
| -------- | ------------------------------ | ---------------------------- |
| **LRU**  | 最近使用されていないものを削除 | API応答、セッションデータ    |
| **LFU**  | 使用頻度が低いものを削除       | 計算結果、静的データ         |
| **FIFO** | 最も古いものを削除             | ログ、一時データ             |
| **TTL**  | 期限切れのみ削除               | 認証トークン、期限付きデータ |

### パフォーマンスのヒント

```typescript
// 1. 適切なサイズ設定
const cache = new MemoryCache({
  maxSize: 500, // メモリとヒット率のバランスを考慮
})

// 2. 統計情報の監視
setInterval(() => {
  const stats = cache.getStats()
  if (stats.hitRate < 50) {
    console.warn('ヒット率が低い: サイズを増やすことを検討')
  }
}, 60000)

// 3. ウォームアップ
import { warmupCache } from '@/utils/cache'

await warmupCache(cache, [
  {
    key: 'config',
    generator: async () => await loadConfig(),
  },
  {
    key: 'translations',
    generator: async () => await loadTranslations(),
  },
])

// 4. 条件付きキャッシュ
import { conditionalCache } from '@/utils/cache'

// 成功した結果のみキャッシュ
conditionalCache((result) => result.status === 'success', cache, 'api:response', apiResult)
```

### クリーンアップ

```typescript
import { destroyGlobalCache } from '@/utils/cache'

// アプリケーション終了時
process.on('SIGTERM', () => {
  destroyGlobalCache() // グローバルキャッシュをクリーンアップ
  cache.destroy() // 個別のキャッシュもクリーンアップ
})
```

---

## まとめ

これらのユーティリティは、プロダクション環境で実証済みのパターンを基に実装されています。

### 特徴のまとめ

| ユーティリティ             | 主な用途             | インポートコスト | パフォーマンス影響 |
| -------------------------- | -------------------- | ---------------- | ------------------ |
| **エラーハンドリング**     | エラー管理の統一     | 小（~5KB）       | なし               |
| **保護されたフィーチャー** | 重要機能の保護       | なし（Node.js）  | なし               |
| **メモリキャッシュ**       | パフォーマンス最適化 | 中（~10KB）      | 改善               |

### ベストプラクティス

1. **必要な時だけインポート**: すべてオプショナル
2. **設定はプロジェクトに合わせて調整**: デフォルトは汎用的
3. **統計情報を監視**: 特にキャッシュのヒット率
4. **定期的なクリーンアップ**: メモリリークを防ぐ

### サポート

問題が発生した場合は、各機能のソースコードにコメントで詳細な説明があります：

- `/src/utils/error-handling/` - エラーハンドリング
- `/scripts/check-protected-features.js` - 保護機能
- `/src/utils/cache/` - キャッシュシステム
