#!/usr/bin/env node

/**
 * SuperClaude v4.0.8 統合検証スクリプト
 * check:scとpreflight:scを統合した包括的な検証コマンド
 *
 * @version 4.0.8
 * @framework SuperClaude Production Edition
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const {
  detectPackageManager,
  getPackageManagerCommand,
  SUPERCLAUDE_FLAGS,
  MCP_CONFIG,
} = require('./utils')

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
  mcp: (msg) => console.log(`${colors.dim}[MCP]${colors.reset} ${msg}`),
  progress: (msg) => process.stdout.write(`\r${colors.cyan}⏳${colors.reset} ${msg}`),
  clearLine: () => process.stdout.write('\r\x1b[K'),
}

// スピナーアニメーション
const spinnerFrames = ['⏳', '⏰', '⏱', '⏲']
let spinnerIndex = 0
let spinnerInterval = null

// テンプレート機能チェック関数
const checkTemplateFunctionality = () => {
  const checks = {
    critical: [],
    warnings: [],
    info: [],
  }

  // 必須機能チェック
  // 1. Git Hooks
  const huskyPath = path.join(process.cwd(), '.husky')
  if (fs.existsSync(huskyPath)) {
    const preCommitPath = path.join(huskyPath, 'pre-commit')
    const commitMsgPath = path.join(huskyPath, 'commit-msg')

    if (fs.existsSync(preCommitPath) && fs.existsSync(commitMsgPath)) {
      try {
        const preCommitStats = fs.statSync(preCommitPath)
        const commitMsgStats = fs.statSync(commitMsgPath)
        if (preCommitStats.mode & 0o111 && commitMsgStats.mode & 0o111) {
          checks.critical.push({ name: 'Git Hooks', status: 'success', message: '実行権限あり' })
        } else {
          checks.critical.push({
            name: 'Git Hooks',
            status: 'error',
            message: '実行権限なし - postinstallスクリプトが機能していません',
          })
        }
      } catch (error) {
        checks.critical.push({
          name: 'Git Hooks',
          status: 'error',
          message: `権限確認エラー: ${error.message}`,
        })
      }
    } else {
      checks.critical.push({
        name: 'Git Hooks',
        status: 'error',
        message: 'pre-commit または commit-msg が見つかりません',
      })
    }
  } else {
    checks.critical.push({
      name: 'Git Hooks',
      status: 'error',
      message: '.huskyディレクトリが見つかりません',
    })
  }

  // 2. SuperClaude設定
  const claudeMd = path.join(process.cwd(), 'CLAUDE.md')
  const superClaudeMd = path.join(process.cwd(), 'SUPERCLAUDE_FINAL.md')
  if (fs.existsSync(claudeMd) && fs.existsSync(superClaudeMd)) {
    checks.critical.push({
      name: 'SuperClaude設定',
      status: 'success',
      message: '設定ファイル完備',
    })
  } else {
    const missing = []
    if (!fs.existsSync(claudeMd)) missing.push('CLAUDE.md')
    if (!fs.existsSync(superClaudeMd)) missing.push('SUPERCLAUDE_FINAL.md')
    checks.critical.push({
      name: 'SuperClaude設定',
      status: 'error',
      message: `設定ファイル不足: ${missing.join(', ')}`,
    })
  }

  // 3. フィーチャー境界スクリプト
  const boundariesScript = path.join(process.cwd(), 'scripts', 'check-boundaries.js')
  if (fs.existsSync(boundariesScript)) {
    checks.critical.push({
      name: 'フィーチャー境界',
      status: 'success',
      message: 'check-boundaries.js 存在',
    })
  } else {
    checks.critical.push({
      name: 'フィーチャー境界',
      status: 'error',
      message: 'check-boundaries.js が見つかりません',
    })
  }

  // 4. テスト環境
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const hasPlaywright =
    packageJson.devDependencies && '@playwright/test' in packageJson.devDependencies
  const hasVitest = packageJson.devDependencies && 'vitest' in packageJson.devDependencies

  if (hasPlaywright && hasVitest) {
    checks.critical.push({
      name: 'テスト環境',
      status: 'success',
      message: 'Playwright + Vitest 設定済み',
    })
  } else {
    const missing = []
    if (!hasPlaywright) missing.push('Playwright')
    if (!hasVitest) missing.push('Vitest')
    checks.critical.push({
      name: 'テスト環境',
      status: 'error',
      message: `テストライブラリ不足: ${missing.join(', ')}`,
    })
  }

  // 重要機能チェック（警告レベル）
  // 1. パッケージマネージャー
  if (fs.existsSync('pnpm-lock.yaml')) {
    checks.warnings.push({
      name: 'パッケージマネージャー',
      status: 'success',
      message: 'pnpm使用中（推奨）',
    })
  } else if (fs.existsSync('package-lock.json')) {
    checks.warnings.push({
      name: 'パッケージマネージャー',
      status: 'warning',
      message: 'npm使用中（pnpm推奨）',
    })
  } else if (fs.existsSync('yarn.lock')) {
    checks.warnings.push({
      name: 'パッケージマネージャー',
      status: 'warning',
      message: 'yarn使用中（pnpm推奨）',
    })
  }

  // 2. セットアップスクリプト
  const setupScript = path.join(process.cwd(), 'scripts', 'setup.js')
  if (fs.existsSync(setupScript)) {
    checks.warnings.push({
      name: 'セットアップスクリプト',
      status: 'success',
      message: 'setup.js 存在',
    })
  } else {
    checks.warnings.push({
      name: 'セットアップスクリプト',
      status: 'warning',
      message: 'setup.js が見つかりません',
    })
  }

  // 情報チェック
  // 1. 環境設定
  const envExample = path.join(process.cwd(), '.env.example')
  if (fs.existsSync(envExample)) {
    checks.info.push({ name: '環境設定', status: 'info', message: '.env.example 存在' })
  } else {
    checks.info.push({
      name: '環境設定',
      status: 'info',
      message: '.env.example なし（オプション）',
    })
  }

  // 2. GitHub Actions
  const workflowsPath = path.join(process.cwd(), '.github', 'workflows')
  if (fs.existsSync(workflowsPath)) {
    checks.info.push({ name: 'GitHub Actions', status: 'info', message: 'ワークフロー設定済み' })
  } else {
    checks.info.push({
      name: 'GitHub Actions',
      status: 'info',
      message: 'ワークフロー未設定（オプション）',
    })
  }

  return checks
}

// スピナー開始
const startSpinner = (message) => {
  spinnerIndex = 0
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${colors.cyan}${spinnerFrames[spinnerIndex]}${colors.reset} ${message}`)
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length
  }, 200)
}

// スピナー停止
const stopSpinner = () => {
  if (spinnerInterval) {
    clearInterval(spinnerInterval)
    spinnerInterval = null
    log.clearLine()
  }
}

// ESLint結果から警告数とエラー数を抽出
const extractLintStats = (output) => {
  if (!output) return { warnings: 0, errors: 0 }

  // ESLintの出力パターン: "✖ 118 problems (0 errors, 118 warnings)"
  const match = output.match(/✖\s+\d+\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/)
  if (match) {
    return {
      errors: parseInt(match[1], 10),
      warnings: parseInt(match[2], 10),
    }
  }

  // 問題がない場合
  return { warnings: 0, errors: 0 }
}

// コマンド実行
const runCommand = (command, silent = false, showProgress = false) => {
  try {
    if (!silent) log.info(`実行中: ${command}`)

    const startTime = Date.now()
    let progressTimer = null

    if (showProgress) {
      startSpinner(`${command.split(' ').pop()} 実行中...`)

      // 経過時間表示
      progressTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        process.stdout.write(
          `\r${colors.cyan}⏰${colors.reset} ${command.split(' ').pop()} 実行中... (${elapsed}秒経過)`
        )
      }, 1000)
    }

    const output = execSync(command, {
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
    })

    if (showProgress) {
      clearInterval(progressTimer)
      stopSpinner()
    }

    return { success: true, output }
  } catch (error) {
    if (showProgress) {
      stopSpinner()
    }
    return {
      success: false,
      error: error.message,
      output: error.stdout ? error.stdout.toString() : '',
    }
  }
}

// MCPサーバー使用提案
const suggestMCP = (checkType, result) => {
  if (result.success) return

  const suggestions = {
    boundaries: [
      'Serena MCP: シンボル分析で境界違反箇所を特定',
      'Morphllm MCP: パターンベースで自動修正',
    ],
    types: ['Sequential MCP: 型エラーの根本原因を分析', 'Context7 MCP: 正しい型定義パターンを確認'],
    tests: [
      'Playwright MCP: E2Eテストで実際の動作を検証',
      'Sequential MCP: テスト失敗の原因を分析',
    ],
    build: ['Sequential MCP: ビルドエラーの依存関係を分析', 'Serena MCP: 問題のあるシンボルを特定'],
  }

  if (suggestions[checkType]) {
    log.mcp(`推奨MCPサーバー:`)
    suggestions[checkType].forEach((s) => log.mcp(`  • ${s}`))
  }
}

// 検証結果の収集
const results = {
  boundaries: null,
  types: null,
  lint: null,
  tests: null,
  build: null,
  totalErrors: 0,
  totalWarnings: 0,
}

// メイン処理
async function main() {
  const args = process.argv.slice(2)
  const isQuick = args.includes('--quick')
  const isDeployment = args.includes('--deploy')
  const isFull = args.includes('--full') || (!isQuick && !isDeployment)
  const pm = detectPackageManager()
  const pmRun = getPackageManagerCommand(pm)

  console.log(`\n${colors.bold}🚀 SuperClaude v4.0.8 統合検証${colors.reset}`)
  console.log(`${colors.dim}Package Manager: ${pm}${colors.reset}`)

  // フラグベースの実行モード
  if (isDeployment) {
    console.log(
      `${colors.yellow}📦 デプロイメントモード（テンプレート・境界・型・リント・ビルド）${colors.reset}`
    )
  } else if (isFull) {
    console.log(
      `${colors.green}🔍 フル検証モード（テンプレート・境界・型・リント・テスト・ビルド）${colors.reset}`
    )
  } else if (isQuick) {
    console.log(`${colors.blue}⚡ クイックモード（境界・型のみ）${colors.reset}`)
  }

  // 0. テンプレート機能チェック（クイックモード以外）
  if (!isQuick) {
    log.section('テンプレート機能チェック')
    const templateChecks = checkTemplateFunctionality()

    // 必須機能（エラーレベル）
    console.log(`${colors.bold}必須機能:${colors.reset}`)
    templateChecks.critical.forEach((check) => {
      if (check.status === 'success') {
        console.log(`  ${colors.green}✓${colors.reset} ${check.name}: ${check.message}`)
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${check.name}: ${check.message}`)
        results.totalErrors++
      }
    })

    // 重要機能（警告レベル）
    if (templateChecks.warnings.length > 0) {
      console.log(`${colors.bold}重要機能:${colors.reset}`)
      templateChecks.warnings.forEach((check) => {
        if (check.status === 'success') {
          console.log(`  ${colors.green}✓${colors.reset} ${check.name}: ${check.message}`)
        } else {
          console.log(`  ${colors.yellow}⚠${colors.reset} ${check.name}: ${check.message}`)
          results.totalWarnings++
        }
      })
    }

    // 情報レベル
    if (templateChecks.info.length > 0) {
      console.log(`${colors.bold}オプション機能:${colors.reset}`)
      templateChecks.info.forEach((check) => {
        console.log(`  ${colors.dim}ℹ${colors.reset} ${check.name}: ${check.message}`)
      })
    }

    // テンプレート機能の総評
    const criticalErrors = templateChecks.critical.filter((c) => c.status === 'error').length
    if (criticalErrors > 0) {
      log.error(`テンプレート機能: ${criticalErrors}個の必須機能が利用不可`)
    } else {
      log.success('テンプレート機能: 全ての必須機能が利用可能')
    }
  }

  // 1. 境界チェック（最重要）
  log.section('フィーチャー境界チェック')
  const boundariesResult = runCommand(`${pmRun} check:boundaries`, true)
  results.boundaries = boundariesResult

  if (boundariesResult.success) {
    log.success('境界チェック: 違反なし')
  } else {
    log.error('境界チェック: 違反あり')
    results.totalErrors++
    suggestMCP('boundaries', boundariesResult)

    // 自動修正の提案
    log.warning(`自動修正: ${pmRun} fix:boundaries`)
  }

  // 2. 型チェック
  log.section('TypeScriptチェック')
  const typeResult = runCommand(`${pmRun} typecheck`, true)
  results.types = typeResult

  if (typeResult.success) {
    log.success('型チェック: エラーなし')
  } else {
    log.error('型チェック: エラーあり')
    results.totalErrors++
    suggestMCP('types', typeResult)
  }

  // 3. リンターチェック
  if (!isQuick) {
    log.section('ESLintチェック')
    const lintResult = runCommand(`${pmRun} lint`, true)
    results.lint = lintResult

    // ESLintの出力から警告とエラーの数を抽出
    const lintStats = extractLintStats(lintResult.output)

    if (lintResult.success) {
      if (lintStats.warnings > 0) {
        log.warning(`リント: ${lintStats.warnings}個の警告あり（エラーなし）`)
        results.totalWarnings++
      } else {
        log.success('リント: 問題なし')
      }
    } else {
      if (lintStats.errors > 0) {
        log.error(`リント: ${lintStats.errors}個のエラー、${lintStats.warnings}個の警告`)
        results.totalErrors++
      } else {
        log.warning(`リント: ${lintStats.warnings}個の警告あり`)
        results.totalWarnings++
      }
    }
  }

  // 4. テスト実行（フルモードのみ）
  if (isFull) {
    log.section('テスト実行')

    // ユニットテスト
    log.info('ユニットテスト実行中...')
    const testResult = runCommand(`${pmRun} test:unit`, true, true)
    results.tests = testResult

    if (testResult.success) {
      log.success('ユニットテスト: 全て合格')
    } else {
      log.error('ユニットテスト: 失敗あり')
      results.totalErrors++
      suggestMCP('tests', testResult)
    }

    // 回帰テスト（regression tests）
    const regressionPath = path.join(process.cwd(), 'tests', 'regression')
    if (
      fs.existsSync(regressionPath) &&
      fs.readdirSync(regressionPath).filter((f) => f.endsWith('.test.ts') || f.endsWith('.test.js'))
        .length > 0
    ) {
      log.info('回帰テスト実行中...')
      const regressionResult = runCommand(`${pmRun} test:regression`, true, true)

      if (regressionResult.success) {
        log.success('回帰テスト: 全て合格')
      } else {
        log.error('回帰テスト: 失敗あり')
        results.totalErrors++
        suggestMCP('tests', regressionResult)
      }
    } else {
      log.info('回帰テスト: スキップ（テストファイルなし）')
    }

    // E2Eテストはスキップ
    log.info('E2Eテスト: スキップ（必要時に手動実行）')
  }

  // 5. ビルドチェック（フルモードまたはデプロイメントモード）
  if (isFull || isDeployment) {
    log.section('プロダクションビルド')
    log.info('Next.jsビルドを実行中です...')

    const buildResult = runCommand(`${pmRun} build`, true, true)
    results.build = buildResult

    if (buildResult.success) {
      log.success('ビルド: 成功')
    } else {
      log.error('ビルド: 失敗')
      results.totalErrors++
      suggestMCP('build', buildResult)
    }
  }

  // 結果サマリー
  log.section('検証結果サマリー')

  const checkItems = []

  // テンプレート機能チェックは必須機能のエラー数で判定
  if (!isQuick) {
    const templateChecks = checkTemplateFunctionality()
    const criticalErrors = templateChecks.critical.filter((c) => c.status === 'error').length
    checkItems.push({
      name: 'テンプレート機能',
      result: { success: criticalErrors === 0 },
    })
  }

  checkItems.push(
    { name: '境界チェック', result: results.boundaries },
    { name: '型チェック', result: results.types }
  )

  if (!isQuick) {
    checkItems.push({ name: 'リント', result: results.lint })
  }

  if (isFull) {
    checkItems.push({ name: 'テスト', result: results.tests })
  }

  if (isFull || isDeployment) {
    checkItems.push({ name: 'ビルド', result: results.build })
  }

  checkItems.forEach((item) => {
    const status = item.result?.success ? '✅' : '❌'
    console.log(`  ${status} ${item.name}`)
  })

  // 総合判定
  console.log('')
  if (results.totalErrors === 0) {
    if (results.totalWarnings === 0) {
      log.success(`${colors.bold}🎉 全てのチェックに合格しました！${colors.reset}`)
    } else {
      log.warning(`${colors.bold}⚠️ ${results.totalWarnings}個の警告があります${colors.reset}`)
    }

    if (isDeployment) {
      log.success('デプロイ準備完了')
    }
  } else {
    log.error(`${colors.bold}❌ ${results.totalErrors}個のエラーがあります${colors.reset}`)

    // MCPサーバー統合提案
    console.log('')
    log.mcp('SuperClaude MCPサーバー活用提案:')
    log.mcp('  1. Serena MCP: プロジェクト全体のセマンティック分析')
    log.mcp('  2. Sequential MCP: エラーの根本原因分析')
    log.mcp('  3. Morphllm MCP: パターンベースの自動修正')
    log.mcp('  4. Context7 MCP: ベストプラクティスの確認')

    process.exit(1)
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error(`予期しないエラー: ${error.message}`)
  process.exit(1)
})

// 実行
main().catch((error) => {
  log.error(`実行エラー: ${error.message}`)
  process.exit(1)
})
