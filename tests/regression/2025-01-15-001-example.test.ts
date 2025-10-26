/**
 * Bug ID: 2025-01-15-001
 * Date: 2025-01-15
 * Issue: サンプル回帰テスト（実際のバグではない）
 * Feature: template
 * Fixed by: N/A - これはテンプレート例です
 */

import { describe, it, expect } from 'vitest'

describe('Regression: 2025-01-15-001 - Example regression test', () => {
  it('should demonstrate the regression test pattern', () => {
    // これはサンプルテストです
    // 実際のバグ修正時は、ここにバグを再現するコードを書きます

    // 例: ある関数が特定の条件で無限ループしていた場合
    const mockFunction = (value: number) => {
      // 修正前: while(value > 0) { } // 無限ループ
      // 修正後:
      while (value > 0) {
        value--
      }
      return value
    }

    // このテストは修正前は失敗（またはタイムアウト）し、
    // 修正後は成功します
    expect(mockFunction(5)).toBe(0)
  })

  it('should prevent regression of specific edge cases', () => {
    // エッジケースのテスト例
    const handleEmptyArray = <T>(arr: T[]): T | null => {
      // 修正前: arr[0].property // エラー
      // 修正後:
      if (arr.length === 0) return null
      return arr[0]
    }

    expect(handleEmptyArray([])).toBe(null)
    expect(handleEmptyArray([1])).toBe(1)
  })
})
