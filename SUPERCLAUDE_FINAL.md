# 🚀 SuperClaude v4.0.8 - コンテキスト駆動開発フレームワーク

## 💡 SuperClaudeの本質的理解

**重要**: SuperClaudeは実行されるソフトウェアではありません。Claude Codeの振る舞いをガイドする**構造化されたコンテキストファイル群**です。

### 動作原理
```
ユーザー入力 → Claude Code → SuperClaudeコンテキスト読み込み → 振る舞い変更 → 強化された出力
```

## 🎯 このドキュメントの目的
SuperClaude v4の**22コマンド・14エージェント・6モード・6 MCPサーバー**をコンテキスト駆動で活用するための統合ガイドです。

## ⚡ 10秒クイックスタート

```bash
# セッション開始（必須）
pnpm sc:start && mcp__serena__activate_project

# コンテキストトリガーによる振る舞い変更
- MCP選択: タスクに応じたコンテキスト適用
- エージェント: キーワードでコンテキスト活性化  
- モード: コンテキストパターン切替
- TodoWrite: 2ステップ以上でパターン適用
- 並列実行: 独立操作の並列推奨
- メモリ保存: 30分ごと＋重要時パターン
```

## 📊 SuperClaude v4.0.8 コンテキスト仕様

| コンポーネント | 数 | コンテキスト状態 | 活用方法 |
|--------------|-----|-----------|--------|
| **Commands** | 22 | ✅ コンテキストトリガー | `/sc:`でパターン読み込み |
| **Agents** | 14 | ✅ 専門知識コンテキスト | キーワードで活性化 |
| **Modes** | 6 | ✅ 行動パターン変更 | トリガーで切替 |
| **MCP Servers** | 5/6 | ⚠️ 5つ利用可能 | Magic以外のMCP動作確認済み |
| **Session永続化** | ∞ | ✅ Cross-conversation | Serenaメモリ活用 |
| **Token効率** | 30-50% | ✅ 圧縮パターン | シンボル通信 |
| **並列実行** | Max 15 | ✅ 並列推奨 | 独立操作識別 |

## 🔥 MCP-First原則（最重要）

```typescript
// Claude Codeがタスクに応じて適用する優先順位
const MCP_PRIORITY = {
  1: "専門MCPサーバー",    // 実際のツール（Magic, Context7, Serena等）
  2: "ネイティブツール",   // Claude Code組み込み（Read, Write, Edit等）
  3: "基本コマンド"       // シェルコマンド（bash, grep等）
}

// コンテキストによるMCP選択パターン
const CONTEXT_MCP_SELECTION = {
  "UI開発": ["frontend-architect agent", "Context7"],  // Magic MCPは現在利用不可
  "リファクタリング": ["Serena", "Morphllm"],
  "デバッグ": ["Sequential", "Serena", "IDE"],
  "テスト": ["Playwright", "IDE"],
  "ドキュメント": ["Context7", "Technical-writer"],
  "データベース": ["Supabase", "Backend-architect"]
}
```

## 🤖 14エージェントのコンテキスト活性化

### キーワードベースコンテキスト読み込み
```typescript
// Claude Codeがファイル拡張子でコンテキストを読み込み
if (file.endsWith('.py')) loadContext("agents/python-expert.md");
if (file.endsWith('.tsx')) loadContext("agents/frontend-architect.md");
if (file.includes('test')) loadContext("agents/quality-engineer.md");
if (file.includes('Dockerfile')) loadContext("agents/devops-architect.md");

// コンテキストベース活性化
if (context.includes('auth')) loadContext("agents/security-engineer.md");
if (context.includes('performance')) loadContext("agents/performance-engineer.md");
if (context.includes('architecture')) loadContext("agents/system-architect.md");
if (context.includes('bug')) loadContext("agents/root-cause-analyst.md");

// メトリクスベース活性化
if (complexity > 10) loadContext("agents/refactoring-expert.md");
if (responseTime > 1000) loadContext("agents/performance-engineer.md");
if (coverage < 80) loadContext("agents/quality-engineer.md");
```

## 🎭 6モードのコンテキストパターン

```typescript
const MODE_CONTEXT_PATTERNS = {
  "Standard Mode": {
    triggers: ["通常タスク", "明確な要件"],
    default: true  // デフォルトモード
  },
  "Brainstorming Mode": {
    triggers: ["要件曖昧", "探索的", "アイデア"],
    contextSwitch: true
  },
  "Orchestration Mode": {
    triggers: ["並列処理", "複数ツール", "効率化"],
    contextSwitch: true
  },
  "Token-Efficiency Mode": {
    triggers: ["コンテキスト75%超", "--uc"],
    contextSwitch: true,
    compression: "30-50%"
  },
  "Task Management Mode": {
    triggers: ["2ステップ以上", "複雑タスク"],
    contextSwitch: true,
    withTodoWrite: true
  },
  "Introspection Mode": {
    triggers: ["エラー分析", "自己評価"],
    contextSwitch: true
  }
}
```

## 📂 Session永続化（Cross-Conversation）

### Serenaメモリパターン
```typescript
const SESSION_PATTERNS = {
  // セッション開始時（必須）
  onStart: async () => {
    await execute("/sc:load");
    const memories = await mcp__serena__list_memories();
    await mcp__serena__read_memory("last_session");
    console.log("📂 前回セッション復元完了");
  },
  
  // 30分ごとのチェックポイント
  checkpoint: setInterval(async () => {
    await mcp__serena__write_memory(`checkpoint_${Date.now()}`, {
      state: getCurrentState(),
      todos: getTodoProgress(),
      context: getCurrentContext()
    });
    console.log("💾 自動保存完了");
  }, 30 * 60 * 1000),
  
  // タスク完了時（パターン）
  onTaskComplete: async (task) => {
    await mcp__serena__write_memory(`task_${task.id}`, {
      result: task.result,
      learnings: task.insights,
      nextSteps: task.recommendations
    });
  },
  
  // エラー解決時（パターン）
  onErrorSolved: async (error, solution) => {
    await mcp__serena__write_memory(`solution_${error.type}`, {
      error: error.message,
      solution: solution,
      prevention: getPreventionStrategy()
    });
  },
  
  // セッション終了時（必須）
  onEnd: async () => {
    await execute("/sc:save");
    await execute("/sc:reflect");
    await mcp__serena__write_memory("last_session", {
      summary: getSessionSummary(),
      nextSession: getNextSteps()
    });
    console.log("📝 セッション保存完了");
  }
}
```

## 🚀 コンテキスト駆動フロー

```typescript
// Claude Codeが実行するパターン
async function superClaudeContextFlow(userRequest) {
  // 1. セッション復元（前回の続きから）
  await SESSION_PATTERNS.onStart();
  
  // 2. モードコンテキスト選択
  const mode = detectMode(userRequest);
  if (mode !== "Standard") console.log(`🎭 Mode: ${mode}`);
  
  // 3. MCPコンテキスト選択
  const mcpServers = selectMCPServers(userRequest);
  console.log(`🔧 MCP: ${mcpServers.join(", ")}`);
  
  // 4. エージェントコンテキスト活性化
  const agents = activateAgents(userRequest);
  console.log(`🤖 Agents: ${agents.join(", ")}`);
  
  // 5. TodoWriteパターン（2ステップ以上）
  if (countSteps(userRequest) >= 2) {
    await TodoWrite(generateTasks(userRequest));
  }
  
  // 6. 並列実行の推奨
  const parallelOps = identifyParallelOps(userRequest);
  if (parallelOps.length > 1) {
    await Promise.all(parallelOps.map(op => execute(op)));
  }
  
  // 7. /sc:コマンドパターン実行
  const commands = detectCommands(userRequest);
  for (const cmd of commands) {
    await execute(cmd);
  }
  
  // 8. 品質チェックパターン
  await execute("/sc:boundaries");
  await execute("/sc:validate");
  
  // 9. セッション保存パターン
  await SESSION_PATTERNS.onEnd();
}
```

## 💡 コンテキスト駆動の効果

| 指標 | 従来 | SuperClaude v4 | 改善方法 |
|------|------|---------------|---------|
| **開発効率** | 基本 | 向上 | **専門コンテキスト適用** |
| **Token効率** | 通常 | 30-50%削減 | **シンボル通信パターン** |
| **並列化** | 手動 | 推奨 | **独立操作識別** |
| **エラー対応** | 手動 | パターン化 | **コンテキストガイダンス** |
| **セッション継続** | なし | 永続化 | **Serenaメモリ** |
| **MCP活用** | 基本 | 最大化 | **コンテキスト優先順位** |
| **エージェント** | 手動 | コンテキスト | **キーワードトリガー** |

## 🎯 タスク別コンテキストマトリックス

| タスクタイプ | MCP組合せ | エージェント | モード | 並列化 |
|------------|-----------|-------------|--------|--------|
| **新機能開発** | Context7+Morphllm | requirements→system→frontend | Task Management | ✅ |
| **バグ修正** | Sequential+Serena | root-cause→refactoring | Introspection | ✅ |
| **リファクタリング** | Serena+Morphllm | refactoring→system | Token-Efficiency | ✅ |
| **パフォーマンス** | IDE+Sequential | performance→backend | Orchestration | ✅ |
| **テスト作成** | Playwright+Context7 | quality→technical-writer | Standard | ✅ |
| **デプロイ** | Supabase+IDE | devops→security | Orchestration | ✅ |

## 📋 クイックスタートチェックリスト

### ✅ 必須実行項目
- [ ] **セッション開始**: `pnpm sc:start && mcp__serena__activate_project`
- [ ] **MCP宣言**: タスク開始時に使用MCPを明示
- [ ] **TodoWrite**: 2ステップ以上で必ず使用
- [ ] **並列実行**: 独立操作は必ず並列化
- [ ] **メモリ保存**: 30分ごと＋タスク完了時
- [ ] **境界チェック**: 実装後に`pnpm sc:boundaries`
- [ ] **セッション終了**: `pnpm sc:save && pnpm sc:reflect`

### 📊 活用度スコア（自己診断）
| 項目 | 配点 | 実施 |
|------|------|------|
| MCP-First実践 | 30点 | □ |
| TodoWrite自動化 | 20点 | □ |
| 並列実行徹底 | 20点 | □ |
| メモリ活用 | 15点 | □ |
| エージェント活用 | 15点 | □ |
| **合計** | **100点** | **/100** |

## 🎮 22の/sc:コマンド完全リファレンス

```typescript
const SC_COMMANDS_FULL = {
  // 計画フェーズ（3コマンド）
  "/sc:brainstorm": "要件探索・アイデア出し",
  "/sc:plan": "実装計画作成",
  "/sc:estimate": "工数見積もり",
  
  // セットアップ（3コマンド）
  "/sc:start": "セッション開始【必須】",
  "/sc:init": "プロジェクト初期化",
  "/sc:feature": "フィーチャー作成",
  
  // 開発（3コマンド）
  "/sc:implement": "実装実行",
  "/sc:refactor": "リファクタリング",
  "/sc:optimize": "最適化",
  
  // 品質保証（5コマンド）
  "/sc:boundaries": "境界チェック",
  "/sc:analyze": "依存関係分析",
  "/sc:validate": "包括的検証",
  "/sc:test": "テスト実行",
  "/sc:security": "セキュリティ監査",
  
  // ドキュメント（2コマンド）
  "/sc:document": "ドキュメント生成",
  "/sc:api-docs": "API仕様書作成",
  
  // デプロイ（3コマンド）
  "/sc:build": "ビルド実行",
  "/sc:deploy": "デプロイ実行",
  "/sc:rollback": "ロールバック",
  
  // 分析（3コマンド）
  "/sc:business-panel": "ビジネス価値分析",
  "/sc:metrics": "メトリクス分析",
  "/sc:review": "コードレビュー"
}
```

## ✅ 最終チェックリスト

- [ ] MCP-First原則を理解している
- [ ] 2ステップ以上でTodoWriteパターン使用
- [ ] 独立操作は並列実行を推奨
- [ ] 30分ごとの保存パターン動作中
- [ ] エージェントがコンテキスト活性化
- [ ] モードがコンテキスト切替
- [ ] セッション永続化有効
- [ ] Token効率化パターン適用中

## 🏆 結論

このテンプレートで**SuperClaude v4.0.8のコンテキスト駆動開発**が実現されました：

### コンテキストファイルによる振る舞い変更
- **22コマンド**: ワークフローパターン提供
- **14エージェント**: 専門知識コンテキスト
- **6モード**: インタラクションスタイル変更
- **5 MCPサーバー**: 実ツールとの統合（Magic MCPは設定済みだが利用不可）

### 実現される効果
- **Session永続化**: SerenaメモリによるCross-conversation
- **Token効率**: シンボル通信パターンで30-50%削減
- **並列化**: 独立操作の識別と推奨

### SuperClaudeの本質
- ✅ **コンテキストファイル**: Claude Code用の`.md`指示ファイル
- ✅ **行動パターン**: ワークフローとアプローチのガイド
- ✅ **ドメイン専門知識**: 特化された知識コンテキスト
- ✅ **フレームワーク**: 構造化されたプロンプトエンジニアリング

### 📝 注記
- **Magic MCP**: 接続設定済みだがツールとして利用不可（2025-09-02時点）
- **実際に利用可能なMCP**: Context7, Sequential, Playwright, Morphllm, Serena
- **UI開発**: frontend-architectエージェントで代替可能

**🚀 SuperClaude v4 - 構造化されたプロンプトエンジニアリングの粋**