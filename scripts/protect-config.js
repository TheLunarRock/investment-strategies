#!/usr/bin/env node

/**
 * 設定ファイル保護スクリプト
 * 
 * このスクリプトは以下の設定ファイルが変更されていないことを確認します：
 * - tsconfig.json
 * - .eslintrc.json
 * - jest.config.js
 * - vitest.config.ts
 * - next.config.js
 * 
 * もし変更が検出された場合、エラーを表示してプロセスを停止します。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 保護対象の設定ファイル
const PROTECTED_FILES = [
  'tsconfig.json',
  '.eslintrc.json',
  'jest.config.js',
  'vitest.config.ts',
  'next.config.js',
  'tailwind.config.ts',
  'postcss.config.js'
];

// 正しいチェックサムを保存するファイル
const CHECKSUM_FILE = path.join(__dirname, '.config-checksums.json');

/**
 * ファイルのチェックサムを計算
 */
function calculateChecksum(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * 現在の設定ファイルのチェックサムを取得
 */
function getCurrentChecksums() {
  const checksums = {};
  for (const file of PROTECTED_FILES) {
    const filePath = path.join(process.cwd(), file);
    const checksum = calculateChecksum(filePath);
    if (checksum) {
      checksums[file] = checksum;
    }
  }
  return checksums;
}

/**
 * チェックサムを初期化（初回実行時）
 */
function initializeChecksums() {
  const checksums = getCurrentChecksums();
  fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(checksums, null, 2));
  console.log('✅ 設定ファイルのチェックサムを初期化しました');
  return checksums;
}

/**
 * 保存されたチェックサムを読み込み
 */
function loadSavedChecksums() {
  if (!fs.existsSync(CHECKSUM_FILE)) {
    return initializeChecksums();
  }
  
  try {
    return JSON.parse(fs.readFileSync(CHECKSUM_FILE, 'utf8'));
  } catch (error) {
    console.error('⚠️ チェックサムファイルの読み込みに失敗しました');
    return initializeChecksums();
  }
}

/**
 * 設定ファイルの変更をチェック
 */
function checkConfigIntegrity() {
  const savedChecksums = loadSavedChecksums();
  const currentChecksums = getCurrentChecksums();
  const violations = [];
  
  for (const file of PROTECTED_FILES) {
    if (savedChecksums[file] && currentChecksums[file]) {
      if (savedChecksums[file] !== currentChecksums[file]) {
        violations.push(file);
      }
    }
  }
  
  return violations;
}

/**
 * エラーメッセージを表示
 */
function showError(violations) {
  console.error('\n' + '='.repeat(60));
  console.error('🚨 設定ファイルの不正な変更を検出しました！');
  console.error('='.repeat(60));
  
  console.error('\n変更された設定ファイル:');
  for (const file of violations) {
    console.error(`  ❌ ${file}`);
  }
  
  console.error('\n' + '⚠️'.repeat(30));
  console.error('\n🔴 重要な警告:');
  console.error('設定ファイルの変更は禁止されています！');
  console.error('これらのファイルはテンプレートの品質を保証する重要な役割を持っています。');
  
  console.error('\n📋 正しい対処法:');
  console.error('1. 型エラー → 適切な型定義を実装してください');
  console.error('2. ESLintエラー → コードを規約に合わせて修正してください');
  console.error('3. テスト失敗 → 実装を修正してテストを通してください');
  console.error('4. ビルドエラー → 根本原因を解決してください');
  
  console.error('\n💡 ヒント:');
  console.error('設定を変更するのではなく、コードを設定に合わせて修正することが重要です。');
  console.error('これによりコードの品質が向上し、将来的な問題を防ぐことができます。');
  
  console.error('\n🔄 変更を元に戻すには:');
  console.error('git checkout -- ' + violations.join(' '));
  
  console.error('\n' + '⚠️'.repeat(30));
  console.error('\n');
}

/**
 * メイン処理
 */
function main() {
  const command = process.argv[2];
  
  if (command === '--init') {
    // チェックサムを初期化
    initializeChecksums();
    return;
  }
  
  if (command === '--update') {
    // チェックサムを更新（管理者のみ使用）
    console.log('⚠️ 設定ファイルのチェックサムを更新します');
    console.log('この操作は管理者のみが実行してください！');
    initializeChecksums();
    return;
  }
  
  // 設定ファイルの整合性をチェック
  const violations = checkConfigIntegrity();
  
  if (violations.length > 0) {
    showError(violations);
    process.exit(1);
  }
  
  console.log('✅ 設定ファイルの整合性チェック: OK');
}

// 実行
main();