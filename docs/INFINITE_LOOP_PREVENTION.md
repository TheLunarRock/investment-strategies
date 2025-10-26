# 🔥 無限ループ防止ガイド

**v4.0.9 更新**: 強化版ESLint検出ルール + リアルタイム警告システムを追加

## React Hooks無限ループパターンと解決策

### ❌ 危険なパターン（無限ループを引き起こす）

#### 1. オブジェクト/配列の依存配列問題

```typescript
// ❌ 問題のあるコード
const MyComponent = () => {
  const config = { category: 'all', limit: 10 } // 毎回新しいオブジェクト

  useEffect(() => {
    fetchData(config)
  }, [config]) // configは毎回異なる参照 → 無限ループ！
}
```

#### 2. 関数の依存配列問題

```typescript
// ❌ 問題のあるコード
const MyComponent = () => {
  const handleClick = () => {} // 毎回新しい関数

  useEffect(() => {
    doSomething(handleClick)
  }, [handleClick]) // 無限ループ！
}
```

#### 3. setState内での同じstate参照

```typescript
// ❌ 問題のあるコード
useEffect(() => {
  setData((data) => [...data, newItem]) // 毎回実行される
}, [data]) // dataが更新 → useEffect実行 → dataが更新 → 無限ループ！
```

### ✅ 正しい解決パターン

#### 解決策1: useMemoで安定した参照を保つ

```typescript
// ✅ 正しいコード
const MyComponent = () => {
  const config = useMemo(
    () => ({
      category: 'all',
      limit: 10,
    }),
    []
  ) // 依存配列が空 = 一度だけ作成

  useEffect(() => {
    fetchData(config)
  }, [config]) // configは常に同じ参照
}
```

#### 解決策2: プリミティブ値を依存配列に

```typescript
// ✅ 正しいコード
const MyComponent = ({ category, limit }) => {
  useEffect(() => {
    const config = { category, limit }
    fetchData(config)
  }, [category, limit]) // プリミティブ値なので安全
}
```

#### 解決策3: useCallbackで関数を安定化

```typescript
// ✅ 正しいコード
const MyComponent = () => {
  const handleClick = useCallback(() => {
    // 処理
  }, []) // 依存がない場合は空配列

  useEffect(() => {
    doSomething(handleClick)
  }, [handleClick]) // handleClickは安定した参照
}
```

#### 解決策4: 適切な条件分岐

```typescript
// ✅ 正しいコード
useEffect(() => {
  if (!data.includes(newItem)) {
    // 条件チェック
    setData((prev) => [...prev, newItem])
  }
}, [newItem]) // dataは依存配列に含めない
```

## 🛡️ 予防的実装パターン

### 1. カスタムフックでの無限ループ防止

```typescript
// ✅ 安全なカスタムフック
export const useFeatureData = (id: string) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // useRefで前回値を記憶
  const prevIdRef = useRef(id)

  useEffect(() => {
    // IDが変わった時のみ実行
    if (prevIdRef.current !== id) {
      prevIdRef.current = id
      setLoading(true)

      fetchData(id)
        .then(setData)
        .finally(() => setLoading(false))
    }
  }, [id]) // プリミティブ値のみ

  return { data, loading }
}
```

### 2. 設定オブジェクトの安定化パターン

```typescript
// ✅ 設定を安定化する
const useStableConfig = (category: string, limit: number) => {
  return useMemo(
    () => ({ category, limit }),
    [category, limit] // プリミティブ値の変更時のみ再作成
  )
}
```

### 3. デバウンスパターン

```typescript
// ✅ 無駄な再実行を防ぐ
const useDebouncedEffect = (effect: () => void, deps: any[], delay = 500) => {
  useEffect(() => {
    const timer = setTimeout(effect, delay)
    return () => clearTimeout(timer)
  }, [...deps, delay])
}
```

## 🚨 Claude Code用の必須チェックリスト

### useEffect使用時の確認事項

- [ ] 依存配列にオブジェクト/配列を直接入れていない
- [ ] 依存配列に関数を直接入れていない
- [ ] setState内で同じstateを参照していない
- [ ] 必要に応じてuseMemo/useCallbackを使用
- [ ] 無限ループの可能性をテストで確認

### 実装前の質問

1. この依存配列の値は毎回変わる可能性があるか？
2. オブジェクト/配列の場合、useMemoが必要か？
3. 関数の場合、useCallbackが必要か？
4. 本当にuseEffectが必要か？（イベントハンドラで十分では？）

## 🔍 無限ループの検出方法

### 1. コンソールログで確認

```typescript
useEffect(() => {
  console.count('effect実行') // 実行回数を確認
  // 処理
}, [deps])
```

### 2. React DevToolsで確認

- Profilerタブで過度な再レンダリングを検出
- Components タブで props/state の変更を追跡

### 3. ESLint警告の確認

```bash
# exhaustive-depsルールが警告を出す
pnpm lint
```

## 🔥 v4.0.9新機能: 自動検出システム

### 1. 強化版ESLintルール

新しく追加された検出パターン:

- オブジェクトリテラル: `useEffect(() => {...}, [{ key: 'value' }])` ❌
- 配列リテラル: `useEffect(() => {...}, [[1, 2, 3]])` ❌
- 関数リテラル: `useEffect(() => {...}, [() => {}])` ❌
- useCallback/useMemoの不適切な依存配列も検出

### 2. リアルタイム警告システム

開発環境でのみ動作する無限ループ検出フック:

```typescript
import { useInfiniteLoopDetector } from '@/hooks/useInfiniteLoopDetector'

const MyComponent = () => {
  // 🔍 リアルタイム監視
  useInfiniteLoopDetector({
    name: 'MyComponent-effect',
    threshold: 10, // 10回実行で警告
    timeWindow: 5000, // 5秒間の監視
  })

  useEffect(() => {
    // 監視対象のコード
  }, [dependency])
}
```

### 3. 統計機能

開発者コンソールで実行:

```javascript
logExecutionStats() // 実行統計をテーブル表示
```

## 📋 フィーチャー作成時のテンプレート改善案

```typescript
// hooks/useFeature.ts の改善版テンプレート（v4.0.9対応）
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useInfiniteLoopDetector } from '@/hooks/useInfiniteLoopDetector'

export const useFeature = (id: string, options?: { limit?: number }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // オプションを安定化
  const stableOptions = useMemo(() => ({ limit: options?.limit ?? 10 }), [options?.limit])

  // 前回のIDを記憶
  const prevIdRef = useRef(id)

  useEffect(() => {
    // 無駄な実行を防ぐ
    if (prevIdRef.current === id && data) {
      return
    }

    prevIdRef.current = id
    let cancelled = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await getData(id, stableOptions)
        if (!cancelled) {
          setData(result)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    // クリーンアップ
    return () => {
      cancelled = true
    }
  }, [id, stableOptions]) // 安定した依存配列

  return { data, loading }
}
```
