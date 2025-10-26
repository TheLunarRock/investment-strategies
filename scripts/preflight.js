#!/usr/bin/env node

/**
 * SuperClaude v4.0.8 統合プリフライトスクリプト
 * - Sequential MCP: 包括的なデプロイ前分析
 * - Serena MCP: セッション情報の永続化
 * - Playwright MCP: E2Eテスト実行
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
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
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
    return { success: false, error, output: error.stdout };
  }
};

// ファイルサイズの取得
const getDirectorySize = (dir) => {
  const result = runCommand(`du -sh ${dir} 2>/dev/null || echo "0"`, true);
  return result.output ? result.output.trim().split('\t')[0] : 'N/A';
};

// フラグ処理（SuperClaude統合）
const args = process.argv.slice(2);
const isSuperClaudeMode = args.some(arg => arg.startsWith('--sc-'));
const validateMode = args.includes('--sc-validate');

// チェック結果
const results = {
  passed: 0,
  warnings: 0,
  errors: 0,
  critical: 0
};

// メイン処理
async function preflight() {
  console.log(`\n${colors.bold}🚀 SuperClaude v4.0.8 デプロイ前チェック (Preflight Check)${colors.reset}\n`);
  
  if (isSuperClaudeMode) {
    console.log(`${colors.blue}🤖 SuperClaudeモード有効${colors.reset}`);
    console.log(`推奨MCP: ${MCP_CONFIG.priority.testing} (テスト用), ${MCP_CONFIG.priority.analysis} (分析用)\n`);
  }
  
  // 1. プロダクションビルド
  log.section('プロダクションビルド');
  log.info('クリーンビルドを実行中...');
  
  // 既存のビルドを削除
  if (fs.existsSync('.next')) {
    runCommand('rm -rf .next', true);
  }
  
  const buildResult = runCommand(`${getPackageManagerCommand('run')} build`);
  if (buildResult.success) {
    log.success('プロダクションビルドが成功しました');
    results.passed++;
    
    // ビルドサイズの確認
    const buildSize = getDirectorySize('.next');
    log.info(`ビルドサイズ: ${buildSize}`);
    
    // Static HTML exportの確認
    if (fs.existsSync('.next/server/app')) {
      const staticPages = fs.readdirSync('.next/server/app').filter(f => f.endsWith('.html')).length;
      log.info(`静的ページ数: ${staticPages}`);
    }
    
    // ビルド後の境界チェック
    log.info('ビルド後の境界チェック...');
    const boundaryCheck = runCommand('pnpm check:boundaries', true);
    // ANSIカラーコードを除去してから判定
    const cleanOutput = (boundaryCheck.output || '').replace(/\x1b\[[0-9;]*m/g, '');
    // 実際のエラー数を確認（"エラー: 0"は成功を意味する）
    const hasActualErrors = cleanOutput.includes('✗ エラー:') &&
                           !cleanOutput.includes('✗ エラー: 0');
    
    if (!boundaryCheck.success || hasActualErrors) {
      log.error('本番ビルドに境界違反が含まれています');
      results.critical = true;
      results.errors++;
    } else {
      log.success('境界チェック合格');
      results.passed++;
    }
  } else {
    log.error('ビルドに失敗しました - デプロイ不可');
    results.critical = true;
    results.errors++;
  }
  
  // 2. 環境変数の確認
  log.section('環境変数チェック');
  
  // 本番環境で必要な環境変数の確認
  const requiredEnvVars = [
    'NEXT_PUBLIC_APP_NAME'
    // 必要に応じて追加: 'NEXT_PUBLIC_API_URL', etc.
  ];
  
  let envValid = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log.success(`${envVar} ✓`);
      results.passed++;
    } else {
      // .env.localから読み込み
      if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        if (envContent.includes(`${envVar}=`)) {
          log.success(`${envVar} ✓ (.env.local)`);
          results.passed++;
        } else {
          log.warning(`${envVar} が設定されていません`);
          envValid = false;
          results.warnings++;
        }
      } else {
        log.warning(`${envVar} が設定されていません`);
        envValid = false;
        results.warnings++;
      }
    }
  }
  
  // 3. セキュリティチェック
  log.section('セキュリティチェック');
  
  // 本番用の脆弱性チェック
  const auditResult = runCommand(`${getPackageManagerCommand('auditProd')} --audit-level=critical`, true);
  const auditOutput = auditResult.output || auditResult.error?.stdout || '';
  
  // より厳密な脆弱性チェック
  if (auditOutput.includes('found 0 vulnerabilities') || 
      auditOutput.includes('no vulnerabilities') ||
      (auditOutput.includes('found') && auditOutput.includes('0 critical'))) {
    log.success('重大な脆弱性は見つかりませんでした');
    results.passed++;
  } else if (auditOutput.includes('critical')) {
    log.error('重大な脆弱性が検出されました - デプロイを中止してください');
    results.critical++;
    results.errors++;
  } else if (auditOutput.includes('high')) {
    log.warning('高リスクの脆弱性が検出されました - 修正を推奨');
    results.warnings++;
  } else {
    log.success('重大な脆弱性は見つかりませんでした');
    results.passed++;
  }
  
  // シークレットの漏洩チェック
  log.info('シークレット漏洩チェック...');
  const secretPatterns = [
    'CLAUDE_CODE_OAUTH_TOKEN',
    'API_KEY',
    'SECRET',
    'PASSWORD',
    'TOKEN'
  ];
  
  let secretsFound = false;
  const srcFiles = runCommand('find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null', true);
  
  if (srcFiles.success && srcFiles.output) {
    for (const pattern of secretPatterns) {
      const grepResult = runCommand(`grep -l "${pattern}" ${srcFiles.output.replace(/\n/g, ' ')} 2>/dev/null || true`, true);
      if (grepResult.output && grepResult.output.trim()) {
        log.error(`潜在的なシークレット露出: ${pattern} が検出されました`);
        secretsFound = true;
      }
    }
  }
  
  if (!secretsFound) {
    log.success('ハードコードされたシークレットは検出されませんでした');
    results.passed++;
  } else {
    results.errors++;
  }
  
  // 4. パフォーマンスチェック
  log.section('パフォーマンスチェック');
  
  // bundle-analyzerがあれば実行
  if (fs.existsSync('.next/analyze')) {
    log.info('バンドルサイズ分析...');
    const analyzeResult = runCommand('npx next-bundle-analyzer', true);
    if (analyzeResult.success) {
      log.success('バンドル分析が完了しました');
    }
  }
  
  // Lighthouseスコアの推定（簡易チェック）
  log.info('パフォーマンス指標の確認...');
  
  // 大きすぎるアセットの確認
  if (fs.existsSync('.next/static')) {
    const largeFiles = runCommand('find .next/static -size +500k -type f 2>/dev/null', true);
    if (largeFiles.output && largeFiles.output.trim()) {
      log.warning('500KB以上の大きなファイルが検出されました');
      console.log(colors.dim + largeFiles.output + colors.reset);
      results.warnings++;
    } else {
      log.success('大きなアセットファイルは検出されませんでした');
      results.passed++;
    }
  }
  
  // 4.5. フィーチャー別検証
  log.section('フィーチャー別検証');
  const featuresDir = 'src/features';
  if (fs.existsSync(featuresDir)) {
    const features = fs.readdirSync(featuresDir)
      .filter(f => !f.startsWith('_') && fs.statSync(path.join(featuresDir, f)).isDirectory());
    
    log.info(`${features.length}個のフィーチャーを検証中...`);
    
    let criticalError = false;
    for (const feature of features) {
      const indexPath = path.join(featuresDir, feature, 'index.ts');
      const indexJsPath = path.join(featuresDir, feature, 'index.js');
      
      if (!fs.existsSync(indexPath) && !fs.existsSync(indexJsPath)) {
        log.error(`${feature}: index.tsが存在しません`);
        results.errors++;
        continue;
      }
      
      // フック公開の最終確認
      const actualPath = fs.existsSync(indexPath) ? indexPath : indexJsPath;
      const content = fs.readFileSync(actualPath, 'utf8');
      if (content.match(/export\s*{[^}]*\buse[A-Z]/)) {
        log.error(`🔴 ${feature}: フックが公開されています（本番環境では致命的）`);
        results.critical = true;
        criticalError = true;
        break; // 致命的エラーなので即座に中断
      }
    }
    
    if (!criticalError && results.errors === 0) {
      log.success('全フィーチャーが本番デプロイ可能です');
      results.passed++;
    }
  }
  
  // 5. デプロイ設定の確認
  log.section('デプロイ設定チェック');
  
  // Vercel設定
  if (fs.existsSync('vercel.json')) {
    log.success('Vercel設定ファイルが存在します');
    results.passed++;
  } else {
    log.info('Vercel設定ファイルはありません（デフォルト設定を使用）');
  }
  
  // package.jsonのengines設定
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.engines && packageJson.engines.node) {
    log.success(`Node.jsバージョン要件: ${packageJson.engines.node}`);
    results.passed++;
  } else {
    log.warning('Node.jsバージョン要件が指定されていません');
    results.warnings++;
  }
  
  // 6. 最終確認
  log.section('最終確認');
  
  // TypeScriptエラーの確認
  const tsResult = runCommand('npx tsc --noEmit', true);
  if (tsResult.success) {
    log.success('TypeScriptエラーはありません');
    results.passed++;
  } else {
    log.error('TypeScriptエラーが存在します');
    results.errors++;
  }
  
  // ESLintチェック（存在する場合）
  if (packageJson.scripts && packageJson.scripts.lint) {
    const lintResult = runCommand(`${getPackageManagerCommand('run')} lint`, true);
    if (lintResult.success) {
      log.success('Lintエラーはありません');
      results.passed++;
    } else {
      log.warning('Lintエラーが存在します');
      results.warnings++;
    }
  }
  
  // 結果サマリー
  const readyToDeploy = !results.critical && results.errors === 0;
  
  console.log(`
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
📊 ${colors.bold}SuperClaude v4.0.8 Preflight チェック結果${colors.reset}

  ${colors.green}✓ 成功:${colors.reset} ${results.passed}
  ${colors.yellow}⚠ 警告:${colors.reset} ${results.warnings}
  ${colors.red}✗ エラー:${colors.reset} ${results.errors}

${readyToDeploy ? 
  `${colors.green}${colors.bold}✅ デプロイ可能です！${colors.reset}` : 
  `${colors.red}${colors.bold}❌ デプロイ前に修正が必要です${colors.reset}`}

${readyToDeploy ? `
${colors.dim}推奨デプロイコマンド:

標準デプロイ:
  Vercel:  vercel --prod
  Netlify: netlify deploy --prod
  
フィーチャーベース安全デプロイ（推奨）:
  pnpm check:boundaries && vercel --prod
  
デプロイ前の最終確認:
  pnpm validate:all${colors.reset}` : ''}
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

  // エラーがある場合は終了コード1
  process.exit(readyToDeploy ? 0 : 1);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('Preflightチェック中にエラーが発生しました');
  console.error(error);
  process.exit(1);
});

// 実行
preflight().catch((error) => {
  log.error('Preflightチェックに失敗しました');
  console.error(error);
  process.exit(1);
});