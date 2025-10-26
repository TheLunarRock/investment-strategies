#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// コマンドライン引数の処理
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const fix = args.includes('--fix');

// 結果の集計
const results = {
  passed: 0,
  warnings: 0,
  errors: 0,
  violations: []
};

// 境界違反パターンのチェック
const checkPatterns = [
  // 相対パス参照は削除（後で高度なチェックに置き換え）
  {
    name: '内部ディレクトリ参照',
    pattern: "from '@/features/[^']*/\\(components\\|hooks\\|utils\\|api\\|types\\)",
    message: 'フィーチャー内部ディレクトリへの直接参照',
    severity: 'error'
  },
  {
    name: 'フック公開',
    pattern: "export\\s*{[^}]*\\buse[A-Z]",
    file: 'index.ts',
    message: 'フックのindex.tsからの公開',
    severity: 'critical'
  },
  {
    name: 'UIコンポーネント公開',
    pattern: "export\\s*{[^}]*}\\s*from\\s*['\"]\\./components",
    file: 'index.ts',
    message: 'UIコンポーネントのindex.tsからの公開',
    severity: 'warning'
  },
  // 新パターン: 無限ループリスク検出
  {
    name: '無限ループリスク（オブジェクト依存）',
    pattern: "useEffect\\([^,]+,\\s*\\[[^\\]]*\\{[^\\}]*\\}[^\\]]*\\]",
    message: 'useEffectの依存配列にオブジェクトリテラルが含まれています（無限ループのリスク）',
    severity: 'critical'
  },
  {
    name: '無限ループリスク（配列依存）',
    pattern: "useEffect\\([^,]+,\\s*\\[[^\\]]*\\[[^\\]]*\\][^\\]]*\\]",
    message: 'useEffectの依存配列に配列リテラルが含まれています（無限ループのリスク）',
    severity: 'critical'
  },
  {
    name: '無限ループリスク（関数依存）',
    pattern: "useEffect\\([^,]+,\\s*\\[[^\\]]*\\(\\)\\s*=>",
    message: 'useEffectの依存配列にインライン関数が含まれています（無限ループのリスク）',
    severity: 'critical'
  }
];

// より高度な相対パス参照チェック
function checkRelativeImports(filePath, content, featureName) {
  const violations = [];
  const relativeImportRegex = /from\s+['"](\.\.\/[^'"]+)['"]/g;
  let match;
  
  while ((match = relativeImportRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // ../で始まるパスを解析
    // 例: ../utils/helper → 同一フィーチャー内
    // 例: ../user/api → 他フィーチャー
    const pathSegments = importPath.split('/');
    
    // 最初の../を除いた最初のセグメントを確認
    if (pathSegments.length > 1) {
      const firstSegment = pathSegments[1];
      
      // フィーチャー名のリストを取得
      const featuresDir = path.join(process.cwd(), 'src/features');
      const features = fs.readdirSync(featuresDir)
        .filter(f => fs.statSync(path.join(featuresDir, f)).isDirectory());
      
      // 他のフィーチャーへの参照かチェック
      if (features.includes(firstSegment) && firstSegment !== featureName) {
        violations.push({
          file: filePath,
          check: '他フィーチャーへの相対パス参照',
          message: `相対パスで他フィーチャー「${firstSegment}」を参照しています: ${match[0]}`,
          severity: 'error',
          matches: [match[0]]
        });
      }
    }
  }
  
  return violations;
}

// ErrorBoundary使用チェック
function checkErrorBoundaryUsage(filePath, content) {
  const violations = [];
  const fileName = path.basename(filePath);
  
  // page.tsxファイルでErrorBoundaryを使用しているかチェック
  if (fileName === 'page.tsx' || fileName === 'page.jsx') {
    const hasErrorBoundary = content.includes('ErrorBoundary') || content.includes('FeatureErrorBoundary');
    const hasPageContent = content.includes('PageContent');
    
    if (!hasErrorBoundary) {
      violations.push({
        file: filePath,
        check: 'ErrorBoundary未使用',
        message: 'page.tsxでErrorBoundaryを使用していません（エラー分離パターン違反）',
        severity: 'warning'
      });
    }
    
    if (!hasPageContent) {
      violations.push({
        file: filePath,
        check: 'PageContent未分離',
        message: 'page.tsxでPageContentコンポーネントを分離していません（推奨パターン違反）',
        severity: 'info'
      });
    }
  }
  
  return violations;
}

// ファイル内容の検査
function checkFile(filePath, content, featureName) {
  const violations = [];
  const fileName = path.basename(filePath);
  
  // 相対パスの高度なチェック
  const relativeViolations = checkRelativeImports(filePath, content, featureName);
  violations.push(...relativeViolations);
  
  // ErrorBoundary使用チェック
  const errorBoundaryViolations = checkErrorBoundaryUsage(filePath, content);
  violations.push(...errorBoundaryViolations);
  
  for (const check of checkPatterns) {
    // ファイル名が指定されている場合、該当ファイルのみチェック
    if (check.file && fileName !== check.file) continue;
    
    const regex = new RegExp(check.pattern, 'gm');
    const matches = content.match(regex);
    
    if (matches) {
      violations.push({
        file: filePath,
        check: check.name,
        message: check.message,
        severity: check.severity,
        matches: matches
      });
    }
  }
  
  return violations;
}

// フィーチャーディレクトリの検査
function checkFeature(featurePath) {
  const featureName = path.basename(featurePath);
  const violations = [];
  
  // フィーチャー内のすべてのTypeScript/JavaScriptファイルを検査
  const files = getAllFiles(featurePath, ['.ts', '.tsx', '.js', '.jsx']);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const fileViolations = checkFile(file, content, featureName);
    violations.push(...fileViolations);
  }
  
  // index.tsの存在確認
  const indexPath = path.join(featurePath, 'index.ts');
  if (!fs.existsSync(indexPath) && !fs.existsSync(path.join(featurePath, 'index.js'))) {
    violations.push({
      file: featurePath,
      check: 'index.ts不在',
      message: 'index.tsファイルが存在しません',
      severity: 'warning'
    });
  }
  
  return violations;
}

// 再帰的にファイルを取得
function getAllFiles(dirPath, extensions) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(itemPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(itemPath);
        }
      }
    }
  }
  
  traverse(dirPath);
  return files;
}

// 違反の自動修正（実験的機能）
function fixViolation(violation) {
  if (!fix) return false;
  
  const { file, check } = violation;
  let content = fs.readFileSync(file, 'utf8');
  let fixed = false;
  
  switch (check) {
    case '他フィーチャーへの相対パス参照':
      // ../user/api/userApi → @/features/user
      content = content.replace(
        /from ['"]\.\.\/([^\/]+)\/.+['"]/g,
        "from '@/features/$1'"
      );
      fixed = true;
      break;
    
    case '内部ディレクトリ参照':
      // @/features/user/components/UserCard → @/features/user
      content = content.replace(
        /from ['"]@\/features\/([^\/]+)\/[^'"]+['"]/g,
        "from '@/features/$1'"
      );
      fixed = true;
      break;
  }
  
  if (fixed) {
    fs.writeFileSync(file, content);
    return true;
  }
  
  return false;
}

// メイン処理
async function checkBoundaries() {
  console.log(`\n${colors.bold}🔍 フィーチャー境界チェック${colors.reset}\n`);
  
  const featuresDir = path.join(process.cwd(), 'src/features');
  
  if (!fs.existsSync(featuresDir)) {
    log.error('src/featuresディレクトリが存在しません');
    process.exit(1);
  }
  
  // フィーチャーリストの取得
  const features = fs.readdirSync(featuresDir)
    .filter(f => {
      const stat = fs.statSync(path.join(featuresDir, f));
      return stat.isDirectory() && !f.startsWith('_') && !f.startsWith('.');
    });
  
  log.info(`検出されたフィーチャー: ${features.length}個`);
  
  if (verbose) {
    console.log(colors.dim + features.map(f => `  - ${f}`).join('\n') + colors.reset);
  }
  
  // 各フィーチャーの検査
  log.section('境界違反チェック');
  
  for (const feature of features) {
    const featurePath = path.join(featuresDir, feature);
    const violations = checkFeature(featurePath);
    
    if (violations.length > 0) {
      log.error(`${feature}: ${violations.length}個の違反`);
      
      for (const violation of violations) {
        const relativePath = path.relative(process.cwd(), violation.file);
        
        if (violation.severity === 'critical') {
          log.error(`  🔴 ${violation.check}: ${relativePath}`);
          if (violation.message) {
            console.log(`     ${colors.red}${violation.message}${colors.reset}`);
          }
          results.errors++;
        } else if (violation.severity === 'error') {
          log.error(`  ❌ ${violation.check}: ${relativePath}`);
          if (violation.message) {
            console.log(`     ${colors.yellow}${violation.message}${colors.reset}`);
          }
          results.errors++;
        } else if (violation.severity === 'warning') {
          log.warning(`  ⚠️  ${violation.check}: ${relativePath}`);
          if (verbose && violation.message) {
            console.log(`     ${colors.dim}${violation.message}${colors.reset}`);
          }
          results.warnings++;
        } else if (violation.severity === 'info') {
          if (verbose) {
            log.info(`  ℹ️  ${violation.check}: ${relativePath}`);
            if (violation.message) {
              console.log(`     ${colors.dim}${violation.message}${colors.reset}`);
            }
          }
        }
        
        if (verbose && violation.matches) {
          console.log(colors.dim + '    コード: ' + violation.matches.join('\n    ') + colors.reset);
        }
        
        // 自動修正
        if (fix && fixViolation(violation)) {
          log.success(`    ✨ 自動修正完了`);
        }
      }
      
      results.violations.push(...violations);
    } else {
      log.success(`${feature}: 違反なし`);
      results.passed++;
    }
  }
  
  // グローバルチェック（フィーチャー間の循環参照）
  log.section('循環参照チェック');
  
  const circularDeps = checkCircularDependencies(featuresDir);
  if (circularDeps.length > 0) {
    log.error('循環参照が検出されました:');
    for (const cycle of circularDeps) {
      log.error(`  ${cycle.join(' → ')}`);
      results.errors++;
    }
  } else {
    log.success('循環参照は検出されませんでした');
    results.passed++;
  }
  
  // 結果サマリー
  console.log(`
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
📊 チェック結果サマリー

  ${colors.green}✓ 成功:${colors.reset} ${results.passed}
  ${colors.yellow}⚠ 警告:${colors.reset} ${results.warnings}
  ${colors.red}✗ エラー:${colors.reset} ${results.errors}

${results.errors === 0 ? 
  `${colors.green}✨ 境界違反は検出されませんでした！${colors.reset}` : 
  `${colors.red}⚠️  境界違反が検出されました。修正が必要です。${colors.reset}`}

${fix ? `${colors.yellow}📝 --fixモードで自動修正を試みました${colors.reset}` : ''}
${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

  // エラーがある場合は終了コード1
  process.exit(results.errors > 0 ? 1 : 0);
}

// 循環参照の検出
function checkCircularDependencies(featuresDir) {
  const dependencies = {};
  const features = fs.readdirSync(featuresDir)
    .filter(f => fs.statSync(path.join(featuresDir, f)).isDirectory());
  
  // 各フィーチャーの依存関係を収集
  for (const feature of features) {
    dependencies[feature] = [];
    const featurePath = path.join(featuresDir, feature);
    const files = getAllFiles(featurePath, ['.ts', '.tsx', '.js', '.jsx']);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const importMatches = content.match(/from ['"]@\/features\/([^\/'"]+)/g) || [];
      
      for (const match of importMatches) {
        const dep = match.match(/@\/features\/([^\/'"]+)/)[1];
        if (dep !== feature && !dependencies[feature].includes(dep)) {
          dependencies[feature].push(dep);
        }
      }
    }
  }
  
  // 循環参照の検出
  const cycles = [];
  
  function findCycle(feature, path = []) {
    if (path.includes(feature)) {
      const cycleStart = path.indexOf(feature);
      const cycle = [...path.slice(cycleStart), feature];
      cycles.push(cycle);
      return;
    }
    
    const deps = dependencies[feature] || [];
    for (const dep of deps) {
      findCycle(dep, [...path, feature]);
    }
  }
  
  for (const feature of features) {
    findCycle(feature);
  }
  
  // 重複する循環を除去
  const uniqueCycles = [];
  for (const cycle of cycles) {
    const sorted = [...cycle].sort().join(',');
    if (!uniqueCycles.some(c => [...c].sort().join(',') === sorted)) {
      uniqueCycles.push(cycle);
    }
  }
  
  return uniqueCycles;
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('チェック中にエラーが発生しました');
  console.error(error);
  process.exit(1);
});

// 実行
checkBoundaries().catch((error) => {
  log.error('境界チェックに失敗しました');
  console.error(error);
  process.exit(1);
});