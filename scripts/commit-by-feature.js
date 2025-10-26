#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`)
};

// 変更されたフィーチャーを取得
function getChangedFeatures() {
  try {
    const result = execSync('git diff --name-only | grep "^src/features/" | cut -d"/" -f3 | sort -u', {
      encoding: 'utf8'
    });
    return result.trim().split('\n').filter(f => f);
  } catch (error) {
    return [];
  }
}

// ステージングされたフィーチャーを取得
function getStagedFeatures() {
  try {
    const result = execSync('git diff --cached --name-only | grep "^src/features/" | cut -d"/" -f3 | sort -u', {
      encoding: 'utf8'
    });
    return result.trim().split('\n').filter(f => f);
  } catch (error) {
    return [];
  }
}

// 入力を取得
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// メイン処理
async function main() {
  console.log(`\n${colors.bold}🚀 フィーチャー別コミット支援ツール${colors.reset}\n`);

  // 変更されたフィーチャーを確認
  const changedFeatures = getChangedFeatures();
  const stagedFeatures = getStagedFeatures();

  if (changedFeatures.length === 0 && stagedFeatures.length === 0) {
    log.info('変更されたフィーチャーがありません');
    return;
  }

  // 現在の状態を表示
  if (stagedFeatures.length > 0) {
    log.warning(`ステージング済みのフィーチャー: ${stagedFeatures.join(', ')}`);
    
    if (stagedFeatures.length > 1) {
      log.error('複数のフィーチャーがステージングされています！');
      log.info('Git hooksによりコミットがブロックされます');
      
      const answer = await prompt('\n最初のフィーチャーだけに絞りますか？ (y/n): ');
      if (answer.toLowerCase() === 'y') {
        // 全てアンステージ
        execSync('git reset', { stdio: 'inherit' });
        // 最初のフィーチャーだけステージ
        const firstFeature = stagedFeatures[0];
        execSync(`git add src/features/${firstFeature}/`, { stdio: 'inherit' });
        log.success(`${firstFeature}のみをステージングしました`);
      }
    }
  }

  if (changedFeatures.length > 0 && stagedFeatures.length === 0) {
    log.info(`変更されたフィーチャー: ${changedFeatures.join(', ')}`);
    
    if (changedFeatures.length === 1) {
      const answer = await prompt(`\n${changedFeatures[0]}をステージングしますか？ (y/n): `);
      if (answer.toLowerCase() === 'y') {
        execSync(`git add src/features/${changedFeatures[0]}/`, { stdio: 'inherit' });
        log.success(`${changedFeatures[0]}をステージングしました`);
      }
    } else {
      // 複数フィーチャーの場合、選択させる
      console.log('\nどのフィーチャーをコミットしますか？');
      changedFeatures.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f}`);
      });
      
      const choice = await prompt('\n番号を入力: ');
      const index = parseInt(choice) - 1;
      
      if (index >= 0 && index < changedFeatures.length) {
        const selectedFeature = changedFeatures[index];
        execSync(`git add src/features/${selectedFeature}/`, { stdio: 'inherit' });
        log.success(`${selectedFeature}をステージングしました`);
      }
    }
  }

  // コミットメッセージのサンプルを表示
  const currentStaged = getStagedFeatures();
  if (currentStaged.length === 1) {
    console.log(`\n${colors.bold}推奨コミットメッセージ:${colors.reset}`);
    console.log(`  feat(${currentStaged[0]}): 機能の説明`);
    console.log(`  fix(${currentStaged[0]}): 修正内容の説明`);
    console.log(`  chore(${currentStaged[0]}): その他の変更`);
    
    const commitType = await prompt('\nコミットタイプ (feat/fix/chore): ');
    const commitMsg = await prompt('コミットメッセージ: ');
    
    if (commitType && commitMsg) {
      const fullMessage = `${commitType}(${currentStaged[0]}): ${commitMsg}`;
      try {
        execSync(`git commit -m "${fullMessage}"`, { stdio: 'inherit' });
        log.success('コミットが完了しました！');
      } catch (error) {
        log.error('コミットに失敗しました');
      }
    }
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log.error('エラーが発生しました');
  console.error(error);
  process.exit(1);
});

// 実行
main().catch((error) => {
  log.error('実行に失敗しました');
  console.error(error);
  process.exit(1);
});