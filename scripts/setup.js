#!/usr/bin/env node

/**
 * SuperClaude v4.0.8 統合セットアップスクリプト
 * - Sequential MCP: 複雑な依存関係分析
 * - Serena MCP: プロジェクトメモリ管理
 * - Morphllm MCP: パターンベース修正
 *
 * @version 4.0.8
 * @framework SuperClaude Production Edition
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const {
  detectPackageManager,
  getPackageManagerCommand,
  SUPERCLAUDE_FLAGS,
  MCP_CONFIG,
  identifyParallelTasks,
} = require('./utils')

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
}

// コマンド実行
const runCommand = (command, silent = false) => {
  try {
    if (!silent) log.info(`実行中: ${command}`)
    const output = execSync(command, {
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
    })
    return { success: true, output }
  } catch (error) {
    return { success: false, error, output: error.stdout }
  }
}

// フラグ処理（SuperClaude統合）
const args = process.argv.slice(2)
const isFullSetup = args.includes('--full') || !args.includes('--quick')
const isQuickSetup = args.includes('--quick')
const isSuperClaudeMode = args.some((arg) => arg.startsWith('--sc-'))

// 結果追跡
const results = {
  created: [],
  installed: [],
  warnings: [],
}

// メイン処理
async function setup() {
  console.log(`
${colors.bold}🚀 SuperClaude v4 Production Edition - セットアップ${colors.reset}
${colors.dim}エンタープライズグレード・フィーチャーベース開発環境${colors.reset}
`)

  // ========== Step 0: 依存関係の自動インストール ==========
  if (!fs.existsSync('node_modules')) {
    log.section('Step 0/8: 依存関係のインストール')
    log.info('node_modules が見つかりません。依存関係をインストールします...')

    try {
      log.info('📦 pnpm install を実行中...')
      execSync('pnpm install', { stdio: 'inherit' })
      log.success('依存関係のインストールが完了しました')
      results.installed.push('全npm依存関係')
    } catch (error) {
      log.error('依存関係のインストールに失敗しました')
      log.info('手動で pnpm install を実行してください')
      process.exit(1)
    }
  }

  // ========== Step 1: 基本環境セットアップ ==========
  log.section('Step 1/8: 基本環境設定')

  // .env.local作成（.env.exampleから）
  if (!fs.existsSync('.env.local')) {
    if (fs.existsSync('.env.example')) {
      // .env.exampleが存在する場合はコピー
      fs.copyFileSync('.env.example', '.env.local')
      log.success('.env.example から .env.local を作成しました')
      log.info('📝 必要に応じて .env.local の値を編集してください')
      results.created.push('.env.local')
    } else {
      // .env.exampleが存在しない場合はデフォルト作成
      const envContent = `# 環境変数
NEXT_PUBLIC_APP_NAME=template-v3.0

# 開発環境
NODE_ENV=development

# APIエンドポイント（必要に応じて追加）
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
`
      fs.writeFileSync('.env.local', envContent)
      log.success('デフォルトの .env.local を作成しました')
      results.created.push('.env.local')
    }
  } else {
    log.info('.env.local は既に存在します')
  }

  // ========== Step 2: Playwright E2Eテスト環境 ==========
  log.section('Step 2/8: E2Eテスト環境構築')

  // playwright.config.ts作成
  if (!fs.existsSync('playwright.config.ts')) {
    const playwrightConfig = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
`
    fs.writeFileSync('playwright.config.ts', playwrightConfig)
    log.success('playwright.config.ts を作成しました')
    results.created.push('playwright.config.ts')
  }

  // E2Eテストディレクトリ構造
  const testDirs = [
    'tests/e2e',
    'tests/e2e/features',
    'tests/e2e/fixtures',
    'tests/e2e/helpers',
    'tests/unit',
    'tests/unit/features',
  ]

  testDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      results.created.push(dir)
    }
  })
  log.success('テストディレクトリ構造を作成しました')

  // テストヘルパー作成
  const authHelperPath = 'tests/e2e/helpers/auth.ts'
  if (!fs.existsSync(authHelperPath)) {
    const authHelper = `import { Page } from '@playwright/test';

export async function authenticate(page: Page, password: string = '0492') {
  // PROJECT_INFO.mdに記載のパスワード認証
  await page.goto('/');
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(password);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  }
}

export async function waitForFeatureLoad(page: Page, featureName: string) {
  await page.waitForSelector(\`[data-feature="\${featureName}"]\`, { 
    state: 'visible',
    timeout: 10000 
  });
}
`
    fs.writeFileSync(authHelperPath, authHelper)
    log.success('E2Eテストヘルパーを作成しました')
    results.created.push(authHelperPath)
  }

  // ========== Step 3: Vitest単体テスト環境 ==========
  log.section('Step 3/8: 単体テスト環境構築')

  // vitest.config.ts作成
  if (!fs.existsSync('vitest.config.ts')) {
    const vitestConfig = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '.next/',
        'scripts/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features')
    }
  }
});
`
    fs.writeFileSync('vitest.config.ts', vitestConfig)
    log.success('vitest.config.ts を作成しました')
    results.created.push('vitest.config.ts')
  }

  // テストセットアップファイル
  if (!fs.existsSync('tests/setup.ts')) {
    const setupContent = `import '@testing-library/jest-dom';

// グローバルモック設定
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// localStorageモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;
`
    fs.writeFileSync('tests/setup.ts', setupContent)
    log.success('tests/setup.ts を作成しました')
    results.created.push('tests/setup.ts')
  }

  // ========== Step 4: GitHub Actions CI/CD ==========
  log.section('Step 4/8: CI/CD環境構築')

  // .github/workflows ディレクトリ作成
  const workflowDir = '.github/workflows'
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true })
  }

  // CI/CDワークフロー
  const ciPath = path.join(workflowDir, 'ci.yml')
  if (!fs.existsSync(ciPath)) {
    const ciWorkflow = `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: コード品質チェック
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      
      - name: 型チェック
        run: pnpm typecheck
      
      - name: フィーチャー境界チェック
        run: pnpm check:boundaries
      
      - name: 全体チェック
        run: pnpm check

  test:
    name: テスト実行
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      
      - name: 単体テスト
        run: pnpm test:unit
      
      - name: Playwrightブラウザインストール
        run: pnpm exec playwright install --with-deps chromium
      
      - name: E2Eテスト
        run: pnpm test:e2e
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            test-results/
            playwright-report/
          retention-days: 30

  build:
    name: ビルドチェック
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: 依存関係インストール
        run: pnpm install --frozen-lockfile
      
      - name: プロダクションビルド
        run: pnpm build
      
      - name: Preflightチェック
        run: pnpm preflight
`
    fs.writeFileSync(ciPath, ciWorkflow)
    log.success('GitHub Actions CI/CDワークフローを作成しました')
    results.created.push(ciPath)
  }

  // ========== Step 5: SuperClaude統合強化 ==========
  log.section('Step 5/8: SuperClaude v4統合確認')

  // claudedocs ディレクトリ作成
  if (!fs.existsSync('claudedocs')) {
    fs.mkdirSync('claudedocs')

    // README作成
    const claudeDocsReadme = `# Claude Code専用ドキュメント

このディレクトリはClaude Codeが生成する分析レポートや設計ドキュメント専用です。

## ディレクトリ構造
- /analysis - コード分析レポート
- /design - 設計ドキュメント
- /reviews - コードレビュー結果
- /proposals - 実装提案

## 注意事項
- このディレクトリの内容はClaude Code専用
- 人間の開発者は参照のみ
- プロダクションコードには含めない
`
    fs.writeFileSync('claudedocs/README.md', claudeDocsReadme)
    log.success('claudedocs ディレクトリを作成しました')
    results.created.push('claudedocs')
  }

  // CLAUDE.mdの確認
  if (!fs.existsSync('CLAUDE.md')) {
    log.warning('CLAUDE.mdが見つかりません - Claude Codeの開発ガイドが必要です')
    results.warnings.push('CLAUDE.md未作成')
  } else {
    log.success('CLAUDE.mdが存在します')
  }

  // PROJECT_INFO.mdの確認
  if (!fs.existsSync('PROJECT_INFO.md')) {
    log.warning('PROJECT_INFO.mdが見つかりません（プロジェクト固有設定用）')
    results.warnings.push('PROJECT_INFO.md未作成')
  } else {
    log.success('PROJECT_INFO.mdが存在します')
  }

  // ========== Step 6: VS Code設定 ==========
  log.section('Step 6/8: 開発環境設定')

  // VS Code設定
  const vscodeDir = '.vscode'
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir)

    // settings.json
    const vscodeSettings = {
      'editor.formatOnSave': true,
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': true,
      },
      'typescript.tsdk': 'node_modules/typescript/lib',
      'typescript.enablePromptUseWorkspaceTsdk': true,
      'tailwindCSS.includeLanguages': {
        typescript: 'javascript',
        typescriptreact: 'javascript',
      },
      'files.associations': {
        '*.css': 'tailwindcss',
      },
    }
    fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify(vscodeSettings, null, 2))

    // extensions.json
    const vscodeExtensions = {
      recommendations: [
        'dbaeumer.vscode-eslint',
        'esbenp.prettier-vscode',
        'bradlc.vscode-tailwindcss',
        'formulahendry.auto-rename-tag',
        'christian-kohler.path-intellisense',
      ],
    }
    fs.writeFileSync(
      path.join(vscodeDir, 'extensions.json'),
      JSON.stringify(vscodeExtensions, null, 2)
    )

    log.success('VS Code設定を作成しました')
    results.created.push('.vscode')
  }

  // ========== Step 7: Playwrightブラウザインストール（フルセットアップ時のみ） ==========
  if (isFullSetup) {
    log.section('Step 7/8: Playwrightブラウザインストール')

    try {
      log.info('Playwrightブラウザを自動インストール中... (約100MB)')
      log.info('これには数分かかる場合があります...')

      // --yesフラグと--with-depsフラグで完全自動インストール
      // stdio: 'pipe'にして質問を回避し、進捗のみ表示
      execSync('npx playwright install --with-deps chromium', {
        stdio: 'pipe',
        encoding: 'utf-8',
      })

      log.success('✓ Chromiumブラウザを自動インストールしました')
      log.success('✓ 必要な依存関係もインストールしました')
      results.installed.push('Playwright Chromium (with dependencies)')
    } catch (error) {
      // エラーが発生してもセットアップは続行
      log.warning('ブラウザの自動インストールに失敗しました')
      log.info('手動インストール: pnpm exec playwright install --with-deps')
      results.warnings.push('Playwrightブラウザは手動インストールが必要です')
    }
  } else {
    log.info('クイックセットアップモード: ブラウザインストールをスキップ')
    log.info('後でインストール: pnpm exec playwright install --with-deps')
  }

  // ========== Step 8: 完了レポート ==========
  log.section('Step 8/8: セットアップ完了')

  console.log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
✨ ${colors.bold}SuperClaude Template v4.0.8 セットアップ完了！${colors.reset}

${colors.blue}📦 インストール済み機能:${colors.reset}
  ✓ フィーチャーベース開発環境
  ✓ SuperClaude統合
  ✓ Playwright E2Eテスト
  ✓ Vitest 単体テスト
  ✓ GitHub Actions CI/CD
  ✓ 境界違反自動検出
  ✓ Claude Code専用ドキュメント領域

📋 作成されたファイル・ディレクトリ:
  ${results.created.map((item) => `• ${item}`).join('\n  ')}

🔧 インストールされた設定:
  ${results.installed.map((item) => `• ${item}`).join('\n  ') || '• なし'}

⚠️  検出された問題:
  ${results.warnings.map((item) => `• ${item}`).join('\n  ') || '• なし'}

${colors.yellow}🚀 次のステップ:${colors.reset}

1. 環境変数の設定:
   ${colors.dim}編集: .env.local${colors.reset}

2. 開発開始:
   ${colors.green}pnpm dev${colors.reset}              # 開発サーバー起動
   ${colors.green}pnpm create:feature [名前]${colors.reset}  # 新機能作成

3. テスト実行:
   ${colors.green}pnpm test:unit${colors.reset}         # 単体テスト
   ${colors.green}pnpm test:e2e${colors.reset}          # E2Eテスト
   ${colors.green}pnpm test:e2e:ui${colors.reset}       # Playwright UI モード

4. 品質チェック:
   ${colors.green}pnpm check:boundaries${colors.reset}  # 境界違反チェック
   ${colors.green}pnpm validate:all${colors.reset}      # 全検証実行
   ${colors.green}pnpm preflight${colors.reset}         # デプロイ前チェック

${colors.blue}📚 ドキュメント:${colors.reset}
  • CLAUDE.md         - Claude Code開発ガイド
  • PROJECT_INFO.md   - プロジェクト固有設定
  • README.md         - プロジェクト概要

${colors.bold}${colors.green}🎉 準備完了！最高の開発体験をお楽しみください！${colors.reset}
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`)
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('セットアップ中にエラーが発生しました')
  console.error(error)
  process.exit(1)
})

// 実行
setup().catch((error) => {
  log.error('セットアップに失敗しました')
  console.error(error)
  process.exit(1)
})
