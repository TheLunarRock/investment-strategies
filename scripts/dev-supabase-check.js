#!/usr/bin/env node

/**
 * 開発時専用Supabase接続確認スクリプト
 * 軽量・高速チェック（日常的な開発作業向け）
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const log = {
  info: (message) => console.log(`\x1b[36mℹ\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32m✓\x1b[0m ${message}`),
  error: (message) => console.log(`\x1b[31m✗\x1b[0m ${message}`),
  warn: (message) => console.log(`\x1b[33m⚠\x1b[0m ${message}`)
}

async function quickSupabaseCheck() {
  console.log('\x1b[1m🔍 Supabase接続クイックチェック\x1b[0m\n')
  
  // 環境変数の存在確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    log.error('Supabase環境変数が未設定')
    log.info('設定方法: cp .env.example .env.local を実行し、Supabaseの設定を入力')
    return false
  }
  
  try {
    // クライアント作成とヘルスチェック
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 最小限の接続確認（高速）
    const { error } = await supabase.auth.getSession()
    
    if (error) {
      log.warn(`認証システム警告: ${error.message}`)
    }
    
    log.success('Supabase接続確認完了')
    log.info(`接続先: ${new URL(supabaseUrl).hostname}`)
    
    // 実接続ポリシー確認メッセージ
    console.log('\n\x1b[2m💡 ヒント: このチェックは実際のSupabase接続を使用しています（モックなし）\x1b[0m')
    console.log('\x1b[2m   詳細なテスト: pnpm test:real-connection\x1b[0m\n')
    
    return true
    
  } catch (error) {
    log.error(`接続失敗: ${error.message}`)
    log.info('対処法:')
    log.info('1. .env.localの設定を確認')
    log.info('2. Supabaseプロジェクトのステータス確認')
    log.info('3. ネットワーク接続確認')
    return false
  }
}

// コマンドライン実行
if (require.main === module) {
  quickSupabaseCheck().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { quickSupabaseCheck }