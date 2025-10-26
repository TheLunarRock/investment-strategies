#!/usr/bin/env node

/**
 * 実際のSupabase接続テストスクリプト
 * ユーザーポリシー：モック禁止・実接続確認必須
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// ログ出力設定
const log = {
  info: (message) => console.log(`\x1b[36m[INFO]\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`),
  error: (message) => console.log(`\x1b[31m[ERROR]\x1b[0m ${message}`),
  warn: (message) => console.log(`\x1b[33m[WARN]\x1b[0m ${message}`),
  section: (title) => console.log(`\n\x1b[1m\x1b[34m━━━ ${title} ━━━\x1b[0m\n`)
}

async function testSupabaseConnection() {
  log.section('実際のSupabase接続テスト開始')
  
  // 環境変数確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    log.error('Supabase環境変数が設定されていません')
    log.info('以下の環境変数を.env.localに設定してください:')
    log.info('- NEXT_PUBLIC_SUPABASE_URL')
    log.info('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  
  log.info(`Supabase URL: ${supabaseUrl}`)
  log.info('Supabaseクライアント作成中...')
  
  try {
    // 実際のSupabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 認証状態確認
    log.info('認証状態を確認中...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      log.warn(`認証エラー: ${sessionError.message}`)
    } else {
      log.success('認証システム接続正常')
      if (session) {
        log.info(`現在のセッション: ${session.user.id}`)
      } else {
        log.info('セッションなし（正常）')
      }
    }
    
    // データベース接続テスト
    log.info('データベース接続を確認中...')
    const { data: tables, error: tablesError } = await supabase
      .from('warranty_settings')
      .select('*')
      .limit(1)
    
    if (tablesError) {
      if (tablesError.code === 'PGRST116') {
        log.warn('warranty_settingsテーブルが存在しません（まだ作成されていない可能性）')
        log.info('これは正常な場合があります')
      } else {
        log.error(`データベースエラー: ${tablesError.message}`)
        return false
      }
    } else {
      log.success('データベース接続正常')
      log.info(`warranty_settingsテーブル確認完了`)
    }
    
    // 匿名認証テスト（PIN認証で使用）
    log.info('匿名認証をテスト中...')
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    
    if (authError) {
      log.error(`匿名認証失敗: ${authError.message}`)
      return false
    } else {
      log.success('匿名認証成功')
      log.info(`セッション作成: ${authData.session?.user?.id || 'Unknown'}`)
      
      // テスト後のクリーンアップ
      await supabase.auth.signOut()
      log.info('テスト用セッションをクリーンアップしました')
    }
    
    log.section('✅ 全ての接続テストが成功しました！')
    log.success('Supabase接続は正常に動作しています')
    log.info('モック使用なし - 実際の接続確認完了')
    
    return true
    
  } catch (error) {
    log.error(`予期しないエラー: ${error.message}`)
    log.error('スタックトレース:', error.stack)
    return false
  }
}

// 実行
if (require.main === module) {
  testSupabaseConnection().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { testSupabaseConnection }