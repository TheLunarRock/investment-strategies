#!/usr/bin/env node

/**
 * 保護されたフィーチャーのチェックスクリプト
 *
 * このスクリプトは、保護されたフィーチャーの変更を検出し、
 * 明示的な許可フラグがない場合はコミットをブロックします。
 *
 * 設定ファイル（.claude/protected-features.json）が存在しない場合は、
 * チェックをスキップするため、このスクリプトは完全にオプショナルです。
 *
 * 使用方法:
 *   node scripts/check-protected-features.js
 *   git commit --allow-feature-changes -m "protected feature update"
 *   git commit --emergency-override -m "emergency fix"
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 設定ファイルのパス
const PROTECTED_CONFIG_PATH = path.join(process.cwd(), '.claude', 'protected-features.json')

// カラー出力用のANSIコード
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

/**
 * カラー付きメッセージを出力
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * 保護設定を読み込み
 */
function loadProtectedConfig() {
  try {
    // 設定ファイルが存在しない場合はnullを返す（エラーにしない）
    if (!fs.existsSync(PROTECTED_CONFIG_PATH)) {
      log('ℹ️  保護設定ファイルが見つかりません。チェックをスキップします。', 'gray')
      return null
    }

    const content = fs.readFileSync(PROTECTED_CONFIG_PATH, 'utf8')
    const config = JSON.parse(content)

    // 保護機能が有効かチェック
    if (config.protectedFeatures && config.protectedFeatures.length > 0) {
      log(
        `🔒 ${config.protectedFeatures.length}個の保護されたフィーチャーが設定されています`,
        'cyan'
      )
      return config
    }

    log('ℹ️  保護されたフィーチャーが設定されていません。', 'gray')
    return null
  } catch (error) {
    log(`❌ 保護設定ファイルの読み込みに失敗しました: ${error.message}`, 'red')
    process.exit(1)
  }
}

/**
 * 変更されたファイルを取得
 */
function getChangedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    return output
      .trim()
      .split('\n')
      .filter((file) => file.length > 0)
  } catch (error) {
    // git diffが失敗した場合（例: gitリポジトリでない場合）
    log('⚠️  Gitの変更ファイル取得に失敗しました。チェックをスキップします。', 'yellow')
    return []
  }
}

/**
 * 保護されたパスのマッチングをチェック
 */
function checkProtectedPaths(changedFiles, protectedFeatures) {
  const violations = []

  for (const file of changedFiles) {
    for (const feature of protectedFeatures) {
      for (const protectedPath of feature.paths) {
        if (file.startsWith(protectedPath)) {
          violations.push({
            file,
            feature: feature.name,
            description: feature.description,
            reason: feature.reason,
            allowFlags: feature.allowFlags,
          })
        }
      }
    }
  }

  return violations
}

/**
 * コミットメッセージから許可フラグをチェック
 */
function checkAllowFlags(violations, globalSettings) {
  try {
    // コミットメッセージを取得（まだコミットされていない場合は.git/COMMIT_EDITMSGから）
    let commitMessage = ''
    const commitMsgPath = path.join(process.cwd(), '.git', 'COMMIT_EDITMSG')

    if (fs.existsSync(commitMsgPath)) {
      commitMessage = fs.readFileSync(commitMsgPath, 'utf8')
    } else {
      // コミットメッセージがまだ作成されていない場合は、環境変数から取得を試みる
      commitMessage = process.env.GIT_COMMIT_MESSAGE || ''
    }

    // 緊急バイパスチェック
    if (globalSettings.emergencyBypass && commitMessage.includes(globalSettings.emergencyBypass)) {
      log('🚨 緊急バイパスモードが有効です。保護を無視して続行します。', 'yellow')
      return true
    }

    // 各違反について許可フラグをチェック
    const unauthorizedViolations = violations.filter((violation) => {
      const isAllowed = violation.allowFlags.some((flag) => commitMessage.includes(flag))
      if (isAllowed) {
        log(`✅ ${violation.feature}: 許可フラグが検出されました`, 'green')
      }
      return !isAllowed
    })

    return unauthorizedViolations.length === 0
  } catch (error) {
    // フラグのチェックに失敗した場合は、安全のため違反として扱う
    return false
  }
}

/**
 * メイン処理
 */
function main() {
  log('\n🔍 保護されたフィーチャーのチェック\n', 'blue')

  // 設定を読み込み
  const config = loadProtectedConfig()
  if (!config || !config.protectedFeatures || config.protectedFeatures.length === 0) {
    // 保護設定がない場合は正常終了
    process.exit(0)
  }

  // 変更ファイルを取得
  const changedFiles = getChangedFiles()
  if (changedFiles.length === 0) {
    log('✅ 変更されたファイルはありません', 'green')
    process.exit(0)
  }

  log(`📝 ${changedFiles.length}個のファイルが変更されています`, 'cyan')

  // 保護されたパスのチェック
  const violations = checkProtectedPaths(changedFiles, config.protectedFeatures)

  if (violations.length === 0) {
    log('\n✅ 保護されたフィーチャーへの変更はありません', 'green')
    process.exit(0)
  }

  // 違反を報告
  log('\n⚠️  保護されたフィーチャーへの変更が検出されました:', 'yellow')
  log('─'.repeat(60), 'gray')

  const groupedViolations = {}
  for (const violation of violations) {
    if (!groupedViolations[violation.feature]) {
      groupedViolations[violation.feature] = []
    }
    groupedViolations[violation.feature].push(violation)
  }

  for (const [feature, featureViolations] of Object.entries(groupedViolations)) {
    const firstViolation = featureViolations[0]
    log(`\n📦 ${feature}`, 'magenta')
    if (firstViolation.description) {
      log(`   説明: ${firstViolation.description}`, 'gray')
    }
    if (firstViolation.reason) {
      log(`   理由: ${firstViolation.reason}`, 'gray')
    }
    log(`   変更ファイル:`, 'gray')
    for (const violation of featureViolations) {
      log(`     - ${violation.file}`, 'gray')
    }
    log(`   許可フラグ: ${firstViolation.allowFlags.join(', ')}`, 'cyan')
  }

  // 許可フラグのチェック
  const isAllowed = checkAllowFlags(violations, config.globalSettings || {})

  if (isAllowed) {
    log('\n✅ 許可フラグが確認されました。変更を続行します。', 'green')
    process.exit(0)
  }

  // ブロック
  log('\n' + '─'.repeat(60), 'red')
  log('❌ コミットがブロックされました', 'red')
  log('─'.repeat(60), 'red')
  log('\n保護されたフィーチャーを変更するには、以下のいずれかを実行してください:', 'yellow')
  log('1. コミットメッセージに適切な許可フラグを含める', 'gray')
  log('2. 緊急時は --emergency-override フラグを使用', 'gray')
  log('3. 変更を取り消す (git reset)', 'gray')

  if (config.globalSettings && config.globalSettings.adminContact) {
    log(`\n📞 お問い合わせ: ${config.globalSettings.adminContact}`, 'cyan')
  }

  process.exit(1)
}

// フックから呼ばれた場合やCIで実行された場合を判定
const isHook = process.argv.includes('--hook')
const isCI = process.env.CI === 'true'

// 実行
if (require.main === module) {
  try {
    main()
  } catch (error) {
    log(`\n❌ エラーが発生しました: ${error.message}`, 'red')
    if (isHook || isCI) {
      // フックやCIでエラーが発生した場合は、安全のためブロック
      process.exit(1)
    }
    // 通常実行時はエラーを表示して終了
    process.exit(0)
  }
}

module.exports = { loadProtectedConfig, checkProtectedPaths }
