# SuperClaude v4 コンテキストフレームワーク - Claude Code行動ガイド

# ═══════════════════════════════════════════════════

# 🔒 設定ファイル保護ルール（最優先・絶対遵守）

# ═══════════════════════════════════════════════════

## ⛔ 絶対に変更してはいけない設定ファイル

**以下のファイルは品質保証の要であり、絶対に変更してはいけません：**

| ファイル               | 役割           | 変更禁止の理由       |
| ---------------------- | -------------- | -------------------- |
| **tsconfig.json**      | TypeScript設定 | 型安全性を保証       |
| **.eslintrc.json**     | ESLint設定     | コード品質基準を維持 |
| **jest.config.js**     | Jest設定       | テスト品質を保証     |
| **vitest.config.ts**   | Vitest設定     | テスト実行環境を保護 |
| **next.config.js**     | Next.js設定    | ビルド設定の一貫性   |
| **tailwind.config.ts** | Tailwind設定   | スタイルの一貫性     |
| **postcss.config.js**  | PostCSS設定    | CSS処理の安定性      |

## 🚨 エラー時の対処法（設定変更は絶対禁止）

| エラー種別       | ❌ 絶対にやってはいけない         | ✅ 正しい対処法            |
| ---------------- | --------------------------------- | -------------------------- |
| **型エラー**     | `// @ts-ignore`追加、tsconfig緩和 | 適切な型定義を実装         |
| **ESLintエラー** | ルール無効化、eslintrc編集        | コードを規約に合わせて修正 |
| **テスト失敗**   | テストスキップ、設定変更          | 実装を修正してテストを通す |
| **ビルドエラー** | 設定ファイル編集                  | 根本原因のコードを修正     |

## 🔒 自動保護機能

```bash
# 設定ファイル保護チェック（コミット時自動実行）
node scripts/protect-config.js

# チェックサムで変更を検出
# 変更が検出されたらコミットをブロック
```

## 📋 Claude Codeへの絶対指示

1. **設定ファイルは読み取り専用** - 参照のみ、編集禁止
2. **エラーは設定変更ではなくコード修正で解決** - 品質基準を維持
3. **テストやリントのルールは不可侵** - 品質の妥協は許されない
4. **困難な場合は質問** - 設定変更ではなく相談を選択

**理由**: このテンプレートの価値は「厳格な品質管理」にあります。設定を緩めることは、テンプレートの存在意義を否定する行為です。

# ═══════════════════════════════════════════════════

# 📁 Claude Code設定ファイル構造

# ═══════════════════════════════════════════════════

## ⚙️ 設定ファイルの種類と役割

`.claude`ディレクトリには2種類の設定ファイルがあります：

| ファイル                            | Git管理 | 役割                                     | 優先度 |
| ----------------------------------- | ------- | ---------------------------------------- | ------ |
| **settings.json**                   | ✅ 管理 | テンプレートのデフォルト設定（全員共通） | 低     |
| **settings.local.json**             | ❌ 除外 | 個人用カスタマイズ設定（上書き）         | 高     |
| **protected-features.example.json** | ✅ 管理 | フィーチャー保護設定のサンプル           | -      |
| **protected-features.json**         | ❌ 除外 | 実際のフィーチャー保護設定               | -      |

## 🔄 設定の読み込み優先順位

Claude Codeは以下の順序で設定を読み込み、後から読み込んだ設定が優先されます：

```
1. settings.json (デフォルト)
   ↓ 上書き
2. settings.local.json (個人用カスタマイズ)
```

## 📝 使い方

### テンプレートをクローンした場合

```bash
# settings.jsonが自動的に含まれる
git clone <template-repo>

# ✅ すぐにSuperClaude機能が使える
/sc:save    # 動作する
/sc:load    # 動作する
```

### 個人用カスタマイズが必要な場合

```bash
# settings.local.jsonを作成（任意）
cp .claude/settings.json .claude/settings.local.json

# settings.local.jsonを編集
# この変更はgit管理外（コミットされない）
```

## ⚠️ 重要な注意事項

1. **settings.jsonは編集しない**
   - テンプレートのデフォルト設定として維持
   - 変更が必要な場合はsettings.local.jsonを使用

2. **settings.local.jsonはコミットしない**
   - .gitignoreで自動除外
   - 個人用設定なのでチームで共有不要

3. **テンプレート更新時**
   - settings.jsonの更新をpull
   - settings.local.jsonは影響を受けない

# ═══════════════════════════════════════════════════

# 🔴 MCP-First原則（最優先・絶対遵守）

# ═══════════════════════════════════════════════════

## 💡 SuperClaudeの本質

**SuperClaudeは実行ソフトウェアではなく、Claude Codeの振る舞いをガイドするコンテキストファイル群です。**
**MCPサーバーは実ツールであり、SuperClaudeはその使用をガイドします。**

### コンテキスト駆動フロー

```bash
1. mcp__serena__activate_project  # セッション開始時必須
2. TodoWrite([...])               # 2ステップ以上で必須
3. "使用MCP: [リスト]"を宣言      # タスク開始時必須
4. 並列実行（独立操作は必ず）      # 効率化必須
```

### 🧠 Serenaメモリパターン

```typescript
// 以下のタイミングで保存パターンを適用
const MEMORY_PATTERNS = {
  タスク完了時: "mcp__serena__write_memory('task_完了', result)",
  エラー解決時: "mcp__serena__write_memory('solution_エラー名', fix)",
  新パターン発見: "mcp__serena__write_memory('pattern_名前', code)",
  '30分経過': "mcp__serena__write_memory('checkpoint_時刻', state)",
  重要な決定: "mcp__serena__write_memory('decision_内容', reason)",
  セッション終了: "mcp__serena__write_memory('session_summary', all)",
}
```

### 🎮 /sc:コマンドコンテキストトリガー

```typescript
// キーワード検出時にコンテキストを読み込み
const SC_CONTEXT_TRIGGERS = {
  // セッション管理
  作業開始: 'pnpm sc:start', // git status + 境界チェック
  セッション開始: 'pnpm sc:start',

  // フィーチャー開発
  新機能: 'pnpm sc:feature', // フィーチャー作成ウィザード
  フィーチャー作成: 'pnpm sc:feature',
  コンポーネント追加: 'pnpm sc:feature',

  // 品質管理
  境界チェック: 'pnpm sc:boundaries', // 境界違反検出
  境界違反: 'pnpm sc:boundaries',
  依存関係: 'pnpm sc:analyze', // 依存関係分析

  // テスト・検証
  テスト実行: 'pnpm sc:test', // フィーチャー単位テスト
  品質チェック: 'pnpm sc:validate', // 包括的検証
  リリース前: 'pnpm sc:validate',

  // リファクタリング
  リファクタリング: 'pnpm sc:refactor', // 境界維持リファクタ
  コード改善: 'pnpm sc:refactor',

  // ビジネス分析（v4新機能）
  ROI: 'pnpm sc:business-panel', // ビジネス価値分析
  優先順位: 'pnpm sc:business-panel',
  ビジネス価値: 'pnpm sc:business-panel',
}

// コンテキスト適用例：タスク開始時にパターン判断
if (task.includes('新機能')) {
  loadContext('commands/sc/feature.md') // コンテキスト読み込み
}
```

### 🎯 並列実行の推奨パターン

```typescript
// ❌ 絶対禁止：順次実行
file1 = read(); file2 = read(); file3 = read();

// ✅ 必須：並列実行
[file1, file2, file3] = await Promise.all([...])
```

詳細は以下を参照：

- **[SUPERCLAUDE_FINAL.md](./SUPERCLAUDE_FINAL.md)** - SuperClaude v4.0.8完全ガイド（統合版）

# ═══════════════════════════════════════════════════

# 🚀 SuperClaude v4 Production Edition の新機能

# ═══════════════════════════════════════════════════

## 📊 バージョン情報

| 項目                  | 内容                                 |
| --------------------- | ------------------------------------ |
| **Framework Version** | SuperClaude v4.0.8                   |
| **Template Edition**  | Production (Enterprise-ready)        |
| **Architecture**      | Feature-based with strict boundaries |
| **Last Updated**      | 2025-08-31                           |

## 🎯 v4新機能：14の専門エージェント

### プロダクション開発に最適化されたエージェント

| エージェント             | 役割                               | フィーチャー境界との統合           |
| ------------------------ | ---------------------------------- | ---------------------------------- |
| **general-purpose**      | 複雑な質問の調査と多段階タスク     | 全フィーチャー横断的な分析         |
| **python-expert**        | SOLID原則に基づくPythonコード      | フィーチャー内のPython実装         |
| **system-architect**     | スケーラブルなシステム設計         | フィーチャー間の依存関係設計       |
| **refactoring-expert**   | 技術的負債の削減とリファクタリング | 境界を維持したリファクタリング     |
| **devops-architect**     | インフラとデプロイメントの自動化   | CI/CDパイプライン統合              |
| **security-engineer**    | セキュリティ脆弱性の特定と対策     | フィーチャー単位のセキュリティ監査 |
| **frontend-architect**   | アクセシブルで高性能なUI           | フィーチャー内UIコンポーネント設計 |
| **backend-architect**    | 信頼性の高いバックエンドシステム   | APIフィーチャーの設計              |
| **quality-engineer**     | 包括的なテスト戦略                 | フィーチャー単位のテスト           |
| **performance-engineer** | システムパフォーマンス最適化       | ボトルネック分析と改善             |
| **requirements-analyst** | 要件定義と仕様化                   | フィーチャー要件の明確化           |
| **technical-writer**     | 技術文書の作成                     | フィーチャードキュメント           |
| **root-cause-analyst**   | 複雑な問題の根本原因分析           | 境界違反の原因特定                 |
| **learning-guide**       | プログラミング概念の教育           | チームへの知識共有                 |

## 🎮 /sc: コマンド体系（v4統一名前空間）

### フィーチャー開発専用コマンド

| コマンド         | 機能                           | 使用タイミング         |
| ---------------- | ------------------------------ | ---------------------- |
| `/sc:start`      | セッション開始＋境界チェック   | 作業開始時             |
| `/sc:feature`    | フィーチャー作成ウィザード     | 新機能追加時           |
| `/sc:boundaries` | 境界違反の検出と修正           | 実装後の検証           |
| `/sc:analyze`    | フィーチャー依存関係分析       | アーキテクチャレビュー |
| `/sc:test`       | フィーチャー単位テスト実行     | 品質保証               |
| `/sc:refactor`   | 境界を維持したリファクタリング | コード改善             |
| `/sc:validate`   | 包括的な品質チェック           | リリース前             |

## 🎭 6つの行動モード（v4完全版）

| モード                | 用途         | フィーチャー開発での活用   |
| --------------------- | ------------ | -------------------------- |
| **Brainstorming**     | 要件探索     | 新フィーチャーの概念設計   |
| **Business Panel** 🆕 | 戦略的分析   | ビジネス価値とROI評価      |
| **Orchestration**     | 効率的な実行 | 並列タスクの最適化         |
| **Token-Efficiency**  | リソース節約 | 大規模リファクタリング時   |
| **Task Management**   | 体系的管理   | フィーチャー実装の進捗管理 |
| **Introspection**     | メタ認知分析 | 境界違反の深層分析         |

# ═══════════════════════════════════════════════════

# ⚡ MCP積極活用ルール - ALWAYS USE MCP FIRST

# ═══════════════════════════════════════════════════

## 🚀 MCPサーバー優先原則

**MCPサーバーは実ツールとして優先的に使用します。**
**タスク開始時に適切なMCPを選択し、使用しない場合は理由を説明します。**

### 🎯 利用可能なMCPサーバー（積極使用必須）

| MCPサーバー             | 用途                             | 使用すべきタイミング                                 |
| ----------------------- | -------------------------------- | ---------------------------------------------------- |
| **Serena**              | セマンティック検索・シンボル操作 | コード検索、関数定義、依存関係分析、プロジェクト記憶 |
| **Morphllm-fast-apply** | 高速ファイル操作・パターン編集   | 複数ファイル編集、一括置換、ディレクトリ操作         |
| **Sequential-thinking** | 構造化思考・複雑な分析           | デバッグ、設計、問題の根本原因分析                   |
| **Context7**            | 公式ドキュメント参照             | React/Next.js/Vue等のライブラリ使用時                |
| **Playwright**          | ブラウザ自動化・E2Eテスト        | UI検証、統合テスト、アクセシビリティテスト           |
| **Supabase**            | Supabaseプロジェクト管理         | DB操作、Edge Functions、認証設定                     |
| **IDE**                 | VS Code連携                      | 診断情報取得、コード実行                             |

### 🔴 MCP優先順位ルール（絶対遵守）

| タスク種別               | 第1選択（必須）       | 第2選択           | 絶対に使わない |
| ------------------------ | --------------------- | ----------------- | -------------- |
| **コード検索・分析**     | Serena (semantic)     | Grep/Glob         | bash grep/find |
| **ファイル操作**         | Morphllm (fast-apply) | Native Read/Write | 手動操作       |
| **複雑な分析・デバッグ** | Sequential (thinking) | Task agent        | 素の推論のみ   |
| **ドキュメント参照**     | Context7              | WebSearch         | 記憶のみ       |
| **ブラウザテスト**       | Playwright            | -                 | unit testのみ  |
| **DB操作（Supabase）**   | Supabase MCP          | -                 | 手動SQL        |

### 🔴 MCP自動起動トリガー（必須使用）

```typescript
// 以下のキーワードで自動的にMCPを使用する
const MCP_TRIGGERS = {
  // Serena: セマンティック検索・プロジェクト記憶
  関数: 'mcp__serena__find_symbol',
  クラス: 'mcp__serena__find_symbol',
  シンボル: 'mcp__serena__find_symbol',
  依存関係: 'mcp__serena__find_referencing_symbols',
  プロジェクト: 'mcp__serena__activate_project',
  記憶: 'mcp__serena__write_memory',

  // Morphllm: 高速ファイル操作
  複数ファイル: 'mcp__morphllm-fast-apply__read_multiple_files',
  ディレクトリ: 'mcp__morphllm-fast-apply__list_directory',
  ファイル作成: 'mcp__morphllm-fast-apply__write_file',
  一括編集: 'mcp__morphllm-fast-apply__tiny_edit_file',

  // Sequential: 構造化思考
  なぜ: 'mcp__sequential-thinking__sequentialthinking',
  原因: 'mcp__sequential-thinking__sequentialthinking',
  設計: 'mcp__sequential-thinking__sequentialthinking',
  デバッグ: 'mcp__sequential-thinking__sequentialthinking',
  分析: 'mcp__sequential-thinking__sequentialthinking',

  // Context7: 公式ドキュメント
  React: 'mcp__context7__resolve-library-id → get-library-docs',
  'Next.js': 'mcp__context7__resolve-library-id → get-library-docs',
  Vue: 'mcp__context7__resolve-library-id → get-library-docs',
  Tailwind: 'mcp__context7__resolve-library-id → get-library-docs',

  // Playwright: ブラウザテスト
  E2E: 'mcp__playwright__browser_snapshot',
  ブラウザ: 'mcp__playwright__browser_navigate',
  スクリーンショット: 'mcp__playwright__browser_take_screenshot',
  UI検証: 'mcp__playwright__browser_snapshot',

  // Supabase: DB/認証管理
  データベース: 'mcp__supabase__list_tables',
  マイグレーション: 'mcp__supabase__apply_migration',
  'Edge Function': 'mcp__supabase__deploy_edge_function',
  Supabase: 'mcp__supabase__search_docs',
}
```

### 💡 MCPサーバー併用パターン（SuperClaude最大活用）

```bash
# パターン1: 分析→実装（最頻出）
mcp__sequential-thinking → mcp__morphllm-fast-apply
"複雑な問題を分析してから効率的に実装"

# パターン2: 検索→編集（リファクタリング）
mcp__serena__find_symbol → mcp__morphllm-fast-apply__tiny_edit_file
"シンボル検索して正確な場所を特定してから編集"

# パターン3: ドキュメント→実装（新機能）
mcp__context7__get-library-docs → mcp__serena__write_memory
"公式パターンを確認して記憶に保存してから実装"

# パターン4: 実装→テスト（品質保証）
mcp__morphllm-fast-apply → mcp__playwright__browser_snapshot
"実装後にE2Eテストで動作確認"

# パターン5: DB設計→実装（Supabase）
mcp__supabase__list_tables → mcp__supabase__apply_migration
"既存テーブル確認してからマイグレーション適用"
```

### ⚠️ MCP使用の明示的宣言（必須）

```bash
# タスク開始時に必ず以下を宣言
"🎯 このタスクで使用するMCP:"
"1. Serenaでシンボル検索と依存関係分析"
"2. Sequential-thinkingで実装戦略を構造化"
"3. Morphllm-fast-applyで効率的な一括編集"
"4. Playwrightで動作検証"

# 実例
"認証機能の実装:"
"→ Context7でNext-Auth公式パターン確認"
"→ Serenaで既存認証コード検索"
"→ Sequential-thinkingで設計分析"
"→ Morphllm-fast-applyで実装"
"→ Supabaseで認証DB設定"
```

### 🚀 SuperClaudeの価値を最大化する使い方

1. **必ずMCPから始める**: ネイティブツールは最終手段
2. **並列実行を活用**: 複数MCPを同時に使用
3. **記憶を活用**: Serenaのメモリ機能で知識を蓄積
4. **公式パターン重視**: Context7で正しい実装を確認
5. **構造化思考**: Sequential-thinkingで複雑な問題を分解

# ═══════════════════════════════════════════════════

# 🛡️ 中間保護層パターン（エラーループ対策）

# ═══════════════════════════════════════════════════

## 🔥 なぜ中間保護層パターンが必要か

### 問題：エラー修正の無限ループ

```
フィーチャーA実装 → エラー修正 → フィーチャーBが壊れる
→ フィーチャーB修正 → フィーチャーAが壊れる → 無限ループ
```

### 解決：中間保護層による物理的隔離

```
┌──────────────────────────────────────┐
│  App Layer (page.tsx)                │
│  ┌──────────────────────────────┐   │
│  │  🛡️ ErrorBoundary            │   │ ← エラーをここで止める
│  │  ┌──────────────────────┐    │   │
│  │  │  PageContent（中間層）│    │   │ ← フィーチャー間の緩衝材
│  │  └──────────────────────┘    │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
         ↑ 公開APIのみアクセス
┌──────────────────────────────────────┐
│  Feature Layer                       │
│  • 内部実装（外部から見えない）      │
│  • 公開API（純粋関数のみ）          │
└──────────────────────────────────────┘
```

## 📝 実装パターン（自動生成済み）

### 1. ページ構造（src/app/[feature]/page.tsx）

```typescript
// ✅ 正しい実装（pnpm create:featureで自動生成）
export default function FeaturePage() {
  return (
    <FeatureErrorBoundary featureName="feature-name">
      <FeaturePageContent />  // 中間保護層
    </FeatureErrorBoundary>
  )
}

async function FeaturePageContent() {
  // フィーチャーAPIのみ使用（フック・コンポーネント禁止）
  const data = await getFeatureData()

  // 独自UI実装（フィーチャーコンポーネント使用禁止）
  return <div>{/* 独自実装 */}</div>
}
```

### 2. ErrorBoundaryコンポーネント（作成済み）

- 場所: `src/components/ErrorBoundary.tsx`
- 役割: エラーを捕捉し、他フィーチャーへの伝播を防ぐ
- 効果: 1つのフィーチャーのエラーが全体を壊さない

## 🎯 効果（測定済み）

| 問題         | 従来                 | 中間保護層パターン     | 改善率 |
| ------------ | -------------------- | ---------------------- | ------ |
| エラー伝播   | 全フィーチャーに影響 | 単一フィーチャーに限定 | 100%   |
| 修正の連鎖   | 5-10回のループ       | 1回で完了              | 80-90% |
| デバッグ時間 | 30-60分              | 5-10分                 | 80%    |
| 境界違反     | 頻発                 | 物理的に不可能         | 100%   |

## 🚨 Claude Code実装時の必須指示

```markdown
「新フィーチャー実装：必ず中間保護層パターン（ErrorBoundary→PageContent→API呼び出し）を使用し、作業は現在のフィーチャーディレクトリ内のみ、他フィーチャーのエラーや警告は一切無視、境界違反チェックは現フィーチャーのみ実行、完了後に単独コミットしてから次へ進むこと」
```

## 🔥 React Hooks無限ループ防止（必須対策）

### 実際に発生した無限ループパターン

| 原因                           | 症状                          | 解決策                           |
| ------------------------------ | ----------------------------- | -------------------------------- |
| **オブジェクト参照の不安定性** | API数百回/秒呼び出し          | useMemoで安定化                  |
| **依存配列でのプロパティ参照** | `[config.category]`で検知失敗 | オブジェクト全体`[config]`を使用 |
| **useCallback不適切使用**      | 関数が再作成され続ける        | useCallback削除、直接定義        |
| **エラー時の状態更新ループ**   | 空配列→エラー→再レンダリング  | 空配列は正常として扱う           |

### 🚨 Claude Code必須チェックリスト

```typescript
// ❌ 絶対にやってはいけない（Mac高熱の原因）
const Component = () => {
  const config = { limit: 10 } // 毎回新しいオブジェクト
  useEffect(() => {
    fetch(config)
  }, [config]) // 無限ループ！
}

// ✅ 正しい実装
const Component = () => {
  const config = useMemo(() => ({ limit: 10 }), []) // 安定した参照
  useEffect(() => {
    fetch(config)
  }, [config]) // 安全
}
```

### 無限ループ防止の実装済み対策

1. **フックテンプレート改善済み**
   - useMemoでオプション安定化
   - useRefで前回値記憶
   - クリーンアップ処理追加

2. **ESLintルール追加済み**
   - useEffect内setState警告
   - exhaustive-deps必須化

3. **ドキュメント完備**
   - `/docs/INFINITE_LOOP_PREVENTION.md`参照

## 🔒 Git Hooks（自動エラーループ防止）

### 実装済みの保護機能

1. **複数フィーチャーの同時コミット防止**
   - 1コミット = 1フィーチャーを物理的に強制
   - エラー時は分かりやすい日本語で対処法を表示

2. **コミットメッセージの標準化**
   - feat/fix/chore等の形式を強制
   - フィーチャー名を自動検出して推奨

3. **境界違反の自動検出**
   - コミット前に境界チェック実行
   - 違反があればコミットをブロック

### エラー時の対処法

```bash
# エラー: 複数フィーチャーの同時変更を検出

# 対処法1: フィーチャーごとに分けてコミット
git add src/features/user/
git commit -m "fix(user): 認証エラー修正"

git add src/features/product/
git commit -m "feat(product): 商品一覧追加"

# 対処法2: 支援ツールを使用
pnpm commit:feature  # 対話的にフィーチャーを選択

# 対処法3: Claude Codeに指示
「userフィーチャーだけコミットして」
```

### 利用可能なコマンド

| コマンド                 | 説明                             |
| ------------------------ | -------------------------------- |
| `pnpm commit:feature`    | フィーチャー別コミット支援ツール |
| `pnpm git:check`         | 変更されたフィーチャーを確認     |
| `git commit --no-verify` | 緊急時のフック回避（非推奨）     |

# ═══════════════════════════════════════════════════

# 🔴 CRITICAL: Feature-Based Development Rules (維持)

# ═══════════════════════════════════════════════════

## 🤖 重要：このテンプレートは100% Claude Code実装用

**人間はコードを書きません。全ての実装はClaude Codeが行います。**
このドキュメントはClaude Codeの実装ルールです。曖昧さを排除し、自動判断可能な内容のみ記載しています。

## 🚨 なぜフックを公開してはいけないのか（30秒理解）

| 問題                | 具体的なエラー            | 影響                     |
| ------------------- | ------------------------- | ------------------------ |
| **Reactルール違反** | 関数・ループ内で使用不可  | アプリがクラッシュ       |
| **SSR破壊**         | サーバーサイドで動作不可  | Hydrationエラー          |
| **テスト困難**      | React Testing Library必須 | 単体テスト不可           |
| **強結合**          | Reactに依存               | 他フレームワーク使用不可 |

**→ だから純粋な関数として公開する**

## 🔴 絶対原則（これを破ると実装失敗）

### 7つの鉄則

| ルール               | 内容                                      | 違反時の結果                         |
| -------------------- | ----------------------------------------- | ------------------------------------ |
| **フック**           | フックは絶対にindex.tsから公開しない      | React Rules of Hooks違反でクラッシュ |
| **UIコンポーネント** | 各フィーチャーが独自実装（共有禁止）      | 密結合・責任曖昧化・スタイル競合     |
| **データ取得**       | 純粋な関数として公開（フック禁止）        | どこでも使用可能に                   |
| **import形式**       | `@/features/[name]`のみ                   | ビルドエラー・境界違反               |
| **状態管理**         | 各フィーチャーが独自管理                  | グローバル状態の混乱                 |
| **相対パス**         | `../`での他フィーチャー参照禁止           | 循環参照・ビルドエラー               |
| **内部アクセス**     | `/components`, `/hooks`等への直接参照禁止 | カプセル化の破壊                     |

### 🔴 計算済みデータ参照原則（新規追加）

**重要: 各フィーチャーは自身のドメインの計算に責任を持ち、他のフィーチャーは計算済みデータを参照する**

| 原則                     | 内容                                               | 実装例                               |
| ------------------------ | -------------------------------------------------- | ------------------------------------ |
| **計算責任の一元化**     | 各フィーチャーが自身のドメインの計算に責任を持つ   | 売上管理が売上計算を担当             |
| **計算済みデータの参照** | 他フィーチャーは計算済みの結果を参照（再計算禁止） | 会計は売上管理から計算済み売上を取得 |
| **単一の真実の源**       | 同じ計算ロジックを複数箇所に実装しない             | 売上計算は売上管理のみ               |

```typescript
// ✅ 正しい実装：計算済みデータを参照
// 会計フィーチャー
import { getSalesData } from '@/features/sales'
const periodSales = await getSalesData(startDate, endDate)
const total = periodSales.reduce((sum, d) => sum + d.calculatedAmount, 0)

// ❌ 間違った実装：他フィーチャーで再計算
// 会計フィーチャー
import { getUnitPrice } from '@/features/unit-price'
import { getQuantity } from '@/features/sales'
const sales = unitPrice * quantity // 再計算してはいけない！
```

**なぜ重要か**: 保守性向上、データ整合性確保、テスト容易性、パフォーマンス最適化

### 正しいindex.tsテンプレート

```typescript
// src/features/[feature-name]/index.ts

// ✅ API関数（公開推奨）
export { getFeatureData, createItem, updateItem, deleteItem } from './api/featureApi'

// ✅ ドメイン型のみ（公開可）
export type { FeatureItem, FeatureConfig } from './types'

// ❌ フック（絶対公開禁止） - これが最重要！
// ❌ UIコンポーネント（原則非公開）
// ❌ 内部実装（utils, store等）
```

## 📁 フィーチャー構造

```
src/features/[機能名]/
├── api/          # API関数（公開推奨）
├── components/   # UIコンポーネント（内部のみ）
├── hooks/        # カスタムフック（内部のみ）
├── types/        # 型定義（ドメイン型のみ公開）
├── utils/        # ヘルパー（内部のみ）
├── store/        # 状態管理（内部のみ）
└── index.ts      # 公開API（最小限）
```

## 🔍 境界違反の自動検出

```bash
# package.jsonに追加済みのコマンド
pnpm check:boundaries

# または手動実行
grep -r "from '\.\./'" src/features/ || echo "✅ 境界違反なし"
grep -r "from '@/features/[^']*/\(components\|hooks\|utils\|api\|types\)" src/features/ || echo "✅ 直接参照なし"
```

## 🤖 SuperClaude統合

### 🔴 MCPサーバー自動起動（積極使用）

**重要: 以下の状況では必ずMCPサーバーを使用してください**

| 状況               | 必須MCPサーバー                         | 具体的な使用例                                   |
| ------------------ | --------------------------------------- | ------------------------------------------------ |
| **コード探索**     | Serena → `mcp__serena__find_symbol`     | 関数定義、クラス検索、依存関係分析               |
| **ファイル操作**   | Morphllm → `mcp__morphllm-fast-apply`   | 複数ファイル読み込み、一括編集、ディレクトリ探索 |
| **複雑な分析**     | Sequential → `mcp__sequential-thinking` | デバッグ、設計検討、問題の根本原因分析           |
| **ドキュメント**   | Context7 → `mcp__context7`              | React/Next.js/Vue等の公式パターン確認            |
| **ブラウザテスト** | Playwright → `mcp__playwright`          | E2Eテスト、UI検証、スクリーンショット            |
| **DB操作**         | Supabase → `mcp__supabase`              | テーブル作成、マイグレーション、Edge Functions   |

### 自動フラグトリガー

| 状況               | フラグ                                         | 効果                                               |
| ------------------ | ---------------------------------------------- | -------------------------------------------------- |
| 新フィーチャー作成 | `--task-manage --validate --delegate --serena` | タスク管理＋境界検証＋並列実行＋セマンティック検索 |
| 複雑な依存関係     | `--sequential --think-hard`                    | Sequential MCPで深い分析＋循環参照検出             |
| UI開発             | `--frontend-architect --validate`              | frontend-architectエージェント＋境界チェック       |
| リファクタリング   | `--morph --validate --safe-mode`               | Morphllm MCPでパターン適用＋安全実行               |
| バグ修正           | `--think --sequential --validate`              | Sequential MCPで原因分析＋影響範囲確認             |
| テスト作成         | `--playwright --delegate`                      | Playwright MCPでE2Eテスト＋並列実行                |

### MCPサーバー活用（実際に利用可能なMCP）

| サーバー                | 主要用途                             | 自動トリガーキーワード                        | 状態        |
| ----------------------- | ------------------------------------ | --------------------------------------------- | ----------- |
| **Serena**              | セマンティック検索・プロジェクト記憶 | find, search, symbol, class, function, メモリ | ✅ 利用可能 |
| **Morphllm-fast-apply** | 高速ファイル操作・一括編集           | edit, modify, create, write, ディレクトリ     | ✅ 利用可能 |
| **Sequential-thinking** | 構造化分析・問題解決                 | why, debug, analyze, design, 原因, なぜ       | ✅ 利用可能 |
| **Context7**            | 公式ドキュメント参照                 | React, Next.js, Vue, library, 公式, docs      | ✅ 利用可能 |
| **Playwright**          | ブラウザ自動化・E2Eテスト            | test, browser, screenshot, E2E, UI検証        | ✅ 利用可能 |
| **Supabase**            | DB管理・認証・Edge Functions         | database, table, migration, auth, Supabase    | ✅ 利用可能 |
| **IDE**                 | VS Code連携・診断情報                | diagnostic, execute, VS Code                  | ✅ 利用可能 |

**注**: Magic MCPは設定済みですが、Claude Codeのツールとして利用不可（2025-09-02時点）。UI開発にはfrontend-architectエージェントを使用してください。

### TodoWrite自動化（2ステップ以上で必須）

- **2ステップ以上** → 必ずTodoWrite使用（例外なし）
- **タスク開始時** → 最初に必ずタスク分解を実行
- **進捗更新** → 各ステップ完了時に即座にstatus更新
- **並列タスク明記** → どのタスクが並列実行可能か明示
- **フィーチャー作成** → タスク自動生成
- **境界違反チェック** → 各タスクで自動実行

## 📋 実装フロー（/sc:コマンド完全自動化）

### 🔴 必須実行タイミング（例外なし）

```typescript
// Claude Codeが自動判断して実行
const EXECUTION_FLOW = {
  '1. セッション開始時': '必ず pnpm sc:start',
  '2. タスク分析時': 'タスク種別判断 → 適切な/sc:コマンド',
  '3. 実装前': 'pnpm sc:boundaries で現状確認',
  '4. 実装中': 'pnpm sc:analyze で依存関係チェック',
  '5. 実装後': 'pnpm sc:validate で包括的検証',
  '6. エラー時': 'pnpm sc:analyze → sc:refactor',
}
```

### 1. セッション開始（必須自動実行）

```bash
pnpm sc:start            # git status + 境界チェック
mcp__serena__activate_project  # プロジェクト記憶読み込み
TodoWrite([...])         # タスク分解（2ステップ以上）
```

### 2. タスク種別による自動コマンド選択

```bash
# 新機能開発 → 自動実行
pnpm sc:feature [name]   # フィーチャー作成ウィザード
pnpm sc:boundaries       # 境界チェック

# バグ修正 → 自動実行
pnpm sc:analyze          # 原因分析
pnpm sc:refactor         # 修正実行

# リリース前 → 自動実行
pnpm sc:validate         # 全検証
pnpm sc:business-panel   # ビジネス影響分析
```

### 3. 実装中の自動実行

```bash
# 並列実行（自動最適化）
--delegate auto --concurrency 15
--morph --validate       # パターン適用+検証

# 30分ごと（自動）
pnpm sc:boundaries       # 定期境界チェック
mcp__serena__write_memory  # チェックポイント保存
```

### 4. 完了時の自動実行

```bash
pnpm sc:validate         # 包括的検証
pnpm sc:test            # テスト実行
pnpm sc:business-panel  # 価値確認
```

## ⚠️ よくある違反（SuperClaudeが自動修正）

### 最頻出パターンと修正

```typescript
// ❌ 違反例1: フック公開（最も危険）
export { useUser } from './hooks/useUser' // 致命的エラー！

// ✅ 修正後: API関数公開
export { getUserData } from './api/userApi' // 正しい

// 使用側の実装
import { getUserData } from '@/features/user' // API関数を使用
const useMyFeature = () => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    getUserData(id).then(setUser) // 自フィーチャー内でフック化
  }, [id])
  return user
}

// ❌ 違反例2: 相対パスで他フィーチャー参照
import { UserProfile } from '../user/components/UserProfile'

// ✅ 修正後: 独自UI実装
// 各フィーチャーが独自のUIコンポーネントを持つ
const MyUserCard = ({ userId }) => {
  /* 独自実装 */
}
```

**SuperClaude自動修正**: `--morph --validate`で即座に修正

## 💡 効率化の指標

| 作業             | 従来     | SuperClaude | 改善率     | 測定根拠    |
| ---------------- | -------- | ----------- | ---------- | ----------- |
| フィーチャー作成 | 30分     | 5分         | 83%短縮    | 実測平均    |
| 境界違反検出     | 手動5分  | 自動即座    | 100%自動化 | ツール実装  |
| 違反修正         | 手動10分 | 自動2秒     | 99%短縮    | --morph実測 |
| 並列タスク実行   | 順次60分 | 並列10分    | 83%短縮    | 15並列実測  |

\*測定根拠: 実際のプロジェクトでの平均値

## 🤖 Claude Code実装の自動フロー

### 実装開始時（必須実行）

```bash
git status                    # 現在の状態確認
pnpm check:boundaries        # 既存構造の把握
```

### フィーチャー作成時（必須使用）

```bash
pnpm create:feature [name]   # 自動生成を使用（手動作成禁止）
```

### 実装完了時（必須実行）

```bash
pnpm check:boundaries        # 境界違反チェック
pnpm fix:boundaries          # 違反の自動修正
pnpm typecheck              # 型チェック
pnpm test                   # テスト実行
pnpm build                  # ビルド確認
```

### エラー時の自動対応表

| エラー種別   | 実行コマンド          | 次のアクション   |
| ------------ | --------------------- | ---------------- |
| 境界違反     | `pnpm fix:boundaries` | 自動修正される   |
| 型エラー     | `pnpm typecheck`      | エラー箇所を修正 |
| テスト失敗   | `pnpm test:unit`      | 失敗テストを修正 |
| ビルドエラー | `pnpm build`          | エラーログを解析 |

## 🎯 実装完了の定義

以下が全て成功したら実装完了：

```bash
pnpm validate:all   # 全チェックが通る
```

### Claude Codeの禁止事項（絶対）

1. **フィーチャー間の共有** → 禁止（重複を許容）
2. **フック公開** → 禁止（内部実装）
3. **手動ディレクトリ作成** → 禁止（create:feature使用）
4. **判断の保留** → 禁止（ルールに従う）
5. **any型の使用** → 禁止（適切な型定義）

## 🐛 バグ修正プロトコル（必須）

### バグ報告・エラー修正時の絶対ルール

**バグ修正 = 回帰テストファースト（例外なし）**

#### 1. テストファースト原則

```bash
# 必ず最初に実行
tests/regression/YYYY-MM-DD-NNN-description.test.ts を作成

# 例: 2025-01-15-001-login-infinite-loop.test.ts
```

#### 2. テストテンプレート

```typescript
/**
 * Bug ID: YYYY-MM-DD-NNN
 * Date: YYYY-MM-DD
 * Issue: [具体的な問題の説明]
 * Feature: [関連フィーチャー]
 * Fixed by: [修正コミット]
 */
describe('Regression: [ID] - [説明]', () => {
  it('should [期待動作]', () => {
    // バグ再現テスト
  })
})
```

#### 3. 実行フロー

1. **テスト作成** → tests/regression/に配置
2. **失敗確認** → `pnpm test:regression`で失敗を確認
3. **修正実装** → バグの根本原因を修正
4. **成功確認** → テストが通ることを確認
5. **永続化** → このテストは削除禁止

#### 4. トリガー判定

以下の場合は必ず回帰テストを作成：

- 「バグ」「修正」「fix」「エラー」「動作しない」等のキーワード
- エラーメッセージ・スタックトレースの提供
- 既存機能の不具合報告

**選択制ではない。バグ修正 = 回帰テスト必須。**

## 🔵 Git/GitHub設定

```bash
# 機能ブランチで作業（必須）
git checkout -b feature/[機能名]-[日付]

# SuperClaude自動追跡
--task-manage  # 進捗を自動管理

# mainへの直接コミット禁止
```

## 💡 SuperClaude活用のコツ

### 重要な理解

1. **フックは内部実装** - 他フィーチャーから使用不可
2. **データ取得は関数** - どこからでも呼び出し可能
3. **UIは独立** - 重複を許容して独立性を維持
4. **SuperClaudeが監視** - 違反は自動検出・修正

### よく使うコマンド組み合わせ

```bash
# 新機能開発の黄金パターン
--task-manage --validate --delegate auto --concurrency 15

# デバッグの黄金パターン
--think-hard --sequential --validate

# リファクタリングの黄金パターン
--morph --validate --safe-mode
```

---

**このドキュメントはSuperClaudeフレームワークに最適化されています。**
**詳細なプロジェクト固有設定は PROJECT_INFO.md を参照してください。**
