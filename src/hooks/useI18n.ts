/**
 * 国際化カスタムフック
 *
 * Next.js App Routerと互換性のある簡易i18nフック
 * 将来的にnext-i18nextの完全統合時に拡張可能
 */

import { useState, useEffect } from 'react'

export type Locale = 'ja' | 'en'

interface I18nConfig {
  defaultLocale: Locale
  locales: Locale[]
}

const config: I18nConfig = {
  defaultLocale: 'ja',
  locales: ['ja', 'en'],
}

/**
 * 現在のロケールを取得・設定するフック
 */
export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(config.defaultLocale)

  useEffect(() => {
    // ブラウザの言語設定を取得
    const browserLang = navigator.language.split('-')[0] as Locale
    const initialLocale = config.locales.includes(browserLang) ? browserLang : config.defaultLocale

    // localStorage から保存された設定を取得
    const savedLocale = localStorage.getItem('locale') as Locale | null
    if (savedLocale && config.locales.includes(savedLocale)) {
      setLocaleState(savedLocale)
    } else {
      setLocaleState(initialLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    if (config.locales.includes(newLocale)) {
      setLocaleState(newLocale)
      localStorage.setItem('locale', newLocale)
      // 将来的にはここでルーティングも更新
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const t = (key: string, _namespace = 'common'): string => {
    // 簡易的な翻訳関数（将来的にはnext-i18nextに置き換え）
    // 実際の実装では、翻訳ファイルから動的に読み込む
    // _namespace は将来的に使用
    return key
  }

  return {
    locale,
    locales: config.locales,
    setLocale,
    t,
  }
}

/**
 * 言語切り替えコンポーネント用のヘルパー
 */
export function getLocaleDisplayName(locale: Locale): string {
  const displayNames: Record<Locale, string> = {
    ja: '日本語',
    en: 'English',
  }
  return displayNames[locale] || locale
}
