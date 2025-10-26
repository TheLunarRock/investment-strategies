#!/usr/bin/env node

/**
 * SuperClaude v4.0.8 統合チェックスクリプト
 * - Sequential MCP: 複雑な問題の分析
 * - Morphllm MCP: パターンベース修正提案
 * - Context7 MCP: ベストプラクティス検証
 * 
 * @version 4.0.8
 * @framework SuperClaude Production Edition
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { 
  detectPackageManager, 
  getPackageManagerCommand,
  SUPERCLAUDE_FLAGS,
  MCP_CONFIG
} = require('./utils');

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
};

// コマンド実行
const runCommand = (command, silent = false) => {
  try {
    if (!silent) log.info(`実行中: ${command}`);
    const output = execSync(command, { 
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error };
  }
};

// チェック結果の集計
const results = {
  passed: 0,
  warnings: 0,
  errors: 0
};

// フラグ処理（SuperClaude統合）
const args = process.argv.slice(2);
const isSuperClaudeMode = args.some(arg => arg.startsWith('--sc-'));
const analyzeMode = args.includes('--sc-analyze');

// メイン処理
async function check() {
  console.log('\n🔍 SuperClaude v4.0.8 Production Edition - 健全性チェック\n');
  
  if (isSuperClaudeMode) {
    console.log(`${colors.blue}🤖 SuperClaudeモード有効${colors.reset}`);
    console.log(`推奨MCP: ${MCP_CONFIG.priority.analysis} (分析用)\n`);
  }
  
  // 1. TypeScript型チェック
  log.section('TypeScript型チェック');
  const tsResult = runCommand('npx tsc --noEmit', true);
  if (tsResult.success) {
    log.success('TypeScriptの型チェックが成功しました');
    results.passed++;
  } else {
    log.error('TypeScriptの型エラーがあります');
    console.log(colors.dim + tsResult.error.stdout + colors.reset);
    results.errors++;
  }
  
  // 2. ビルドテスト
  log.section('ビルドテスト');
  const buildResult = runCommand(`${getPackageManagerCommand('run')} build`, true);
  if (buildResult.success) {
    log.success('ビルドが正常に完了しました');
    results.passed++;
  } else {
    log.error('ビルドエラーが発生しました');
    results.errors++;
  }
  
  // 3. 依存関係の脆弱性チェック
  log.section('セキュリティチェック');
  const auditResult = runCommand(getPackageManagerCommand('auditProd'), true);
  if (auditResult.success) {
    log.success('既知の脆弱性は見つかりませんでした');
    results.passed++;
  } else {
    const output = auditResult.error.stdout || '';
    if (output.includes('found 0 vulnerabilities')) {
      log.success('既知の脆弱性は見つかりませんでした');
      results.passed++;
    } else {
      const pm = detectPackageManager();
      log.warning(`脆弱性が検出されました（${getPackageManagerCommand('auditFix')} を実行してください）`);
      results.warnings++;
    }
  }
  
  // 4. フィーチャー構造チェック
  log.section('プロジェクト構造チェック');
  const requiredDirs = [
    'src/app',
    'src/features',
    'src/styles'
  ];
  
  let structureValid = true;
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      log.error(`必須ディレクトリが見つかりません: ${dir}`);
      structureValid = false;
      results.errors++;
    }
  }
  
  if (structureValid) {
    log.success('フィーチャーベース構造が正しく維持されています');
    results.passed++;
  }
  
  // 4.5. フィーチャー境界チェック
  log.section('フィーチャー境界チェック');
  const boundaryResult = runCommand('pnpm check:boundaries', true);
  if (boundaryResult.success) {
    log.success('フィーチャー境界違反は検出されませんでした');
    results.passed++;
  } else {
    const output = boundaryResult.error?.stdout || '';
    if (output.includes('エラー: 0') || output.includes('✗ エラー: 0')) {
      log.success('境界チェック合格');
      results.passed++;
    } else {
      log.error('フィーチャー境界違反が検出されました');
      log.info('詳細: pnpm check:boundaries --verbose');
      results.errors++;
    }
  }
  
  // 4.6. フィーチャー健全性チェック
  log.section('フィーチャー健全性');
  const featuresDir = 'src/features';
  if (fs.existsSync(featuresDir)) {
    const features = fs.readdirSync(featuresDir)
      .filter(f => !f.startsWith('_') && !f.startsWith('.') && fs.statSync(path.join(featuresDir, f)).isDirectory());
    
    let healthyCount = 0;
    let hookExportViolations = [];
    
    for (const feature of features) {
      const indexPath = path.join(featuresDir, feature, 'index.ts');
      const indexJsPath = path.join(featuresDir, feature, 'index.js');
      
      if (fs.existsSync(indexPath) || fs.existsSync(indexJsPath)) {
        const actualPath = fs.existsSync(indexPath) ? indexPath : indexJsPath;
        const content = fs.readFileSync(actualPath, 'utf8');
        
        // フック公開チェック
        if (content.match(/export\s*{[^}]*\buse[A-Z]/)) {
          log.error(`${feature}: フックがindex.tsから公開されています（違反）`);
          hookExportViolations.push(feature);
          results.errors++;
        } else {
          healthyCount++;
        }
      } else {
        log.warning(`${feature}: index.tsが存在しません`);
        results.warnings++;
      }
    }
    
    if (healthyCount === features.length) {
      log.success(`全${features.length}フィーチャーが健全です`);
      results.passed++;
    } else if (hookExportViolations.length > 0) {
      log.error(`🔴 致命的エラー: ${hookExportViolations.join(', ')}がフックを公開しています`);
    }
  }
  
  // 5. 設定ファイルの検証
  log.section('設定ファイルチェック');
  
  // Tailwind設定
  if (fs.existsSync('tailwind.config.ts') || fs.existsSync('tailwind.config.js')) {
    const configFile = fs.existsSync('tailwind.config.ts') ? 'tailwind.config.ts' : 'tailwind.config.js';
    const tailwindConfig = fs.readFileSync(configFile, 'utf8');
    
    if (tailwindConfig.includes('M PLUS Rounded 1c')) {
      log.success('丸文字フォント設定が正しく設定されています');
      results.passed++;
    } else {
      log.error('丸文字フォント設定が見つかりません');
      results.errors++;
    }
  }
  
  // CLAUDE.md
  if (fs.existsSync('CLAUDE.md')) {
    const claudeContent = fs.readFileSync('CLAUDE.md', 'utf8');
    if (claudeContent.includes('SuperClaude') && 
        claudeContent.includes('フックは絶対にindex.tsから公開しない')) {
      log.success('CLAUDE.mdは必要な内容を含んでいます');
      results.passed++;
    } else {
      log.warning('CLAUDE.mdに必要なセクションが不足しています');
      results.warnings++;
    }
  } else {
    log.error('CLAUDE.mdが見つかりません');
    results.errors++;
  }
  
  // PROJECT_INFO.md
  if (fs.existsSync('PROJECT_INFO.md')) {
    log.success('PROJECT_INFO.mdが存在します');
    results.passed++;
  } else {
    log.info('PROJECT_INFO.mdが見つかりません（プロジェクト固有設定用）');
  }
  
  // 6. GitHub Actions設定チェック
  log.section('GitHub Actions設定チェック');
  const workflowsDir = '.github/workflows';
  if (fs.existsSync(workflowsDir)) {
    const workflows = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    let allValid = true;
    
    for (const workflow of workflows) {
      const content = fs.readFileSync(path.join(workflowsDir, workflow), 'utf8');
      try {
        // 基本的な構文チェック
        if (!content.includes('name:') || !content.includes('on:')) {
          log.warning(`${workflow}: 必須フィールドが不足している可能性があります`);
          allValid = false;
          results.warnings++;
        }
      } catch (error) {
        log.error(`${workflow}: 読み取りエラー`);
        allValid = false;
        results.errors++;
      }
    }
    
    if (allValid && workflows.length > 0) {
      log.success(`${workflows.length}個のワークフローファイルが正常です`);
      results.passed++;
    }
  }
  
  // 7. 環境変数チェック
  log.section('環境設定チェック');
  if (fs.existsSync('.env.local')) {
    log.success('.env.localファイルが存在します');
    results.passed++;
  } else {
    log.warning('.env.localファイルが見つかりません（必要に応じて作成してください）');
    results.warnings++;
  }
  
  // 8. Node.jsバージョンチェック
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion >= 18) {
    log.success(`Node.js ${nodeVersion} ✓`);
    results.passed++;
  } else {
    log.error(`Node.js ${nodeVersion} は古すぎます。v18以上が必要です`);
    results.errors++;
  }
  
  // 結果サマリー
  console.log(`
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
📊 チェック結果サマリー (SuperClaude v4.0.8)

  ${colors.green}✓ 成功:${colors.reset} ${results.passed}
  ${colors.yellow}⚠ 警告:${colors.reset} ${results.warnings}
  ${colors.red}✗ エラー:${colors.reset} ${results.errors}

${results.errors === 0 ? 
  `${colors.green}✨ プロジェクトは健全な状態です！${colors.reset}` : 
  `${colors.red}⚠️  修正が必要な項目があります${colors.reset}`}
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

  // エラーがある場合は終了コード1
  process.exit(results.errors > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('チェック中にエラーが発生しました');
  console.error(error);
  process.exit(1);
});

// 実行
check().catch((error) => {
  log.error('チェックに失敗しました');
  console.error(error);
  process.exit(1);
});