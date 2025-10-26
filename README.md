# SuperClaude v4 Production Edition - Enterprise Template

[![Framework](https://img.shields.io/badge/SuperClaude-v4.0.8-blue)](https://github.com/SuperClaude-Org/SuperClaude_Framework)
[![Template](https://img.shields.io/badge/Edition-Production-green)](CLAUDE.md)
[![Architecture](https://img.shields.io/badge/Architecture-Feature--based-orange)](docs/architecture.md)

Claude Code用のエンタープライズグレードNext.jsテンプレート。
**SuperClaude v4.0.8** + **14専門エージェント** + **フィーチャーベース開発** + **コンテキスト駆動開発**

## 💡 SuperClaudeの本質

**重要**: SuperClaudeは実行されるソフトウェアではありません。Claude Codeの振る舞いをガイドする**構造化されたコンテキストファイル群**です。

- ✅ **コンテキストファイル**: Claude Code用の`.md`指示ファイル
- ✅ **行動パターン**: ワークフローとアプローチのガイド
- ✅ **ドメイン専門知識**: 特化された知識コンテキスト
- ✅ **MCPサーバー統合**: 実ツールとの設定・ガイダンス

## 🆕 v4 Production Edition の特徴

### 14の専門エージェント

- 🏗️ **system-architect**: スケーラブルなシステム設計
- 🛡️ **security-engineer**: セキュリティ脆弱性の特定
- ⚡ **performance-engineer**: パフォーマンス最適化
- 🎨 **frontend-architect**: アクセシブルなUI設計
- 🔧 **backend-architect**: 信頼性の高いバックエンド
- その他9つの専門エージェント

### /sc: 統一コマンド体系

```bash
/sc:start          # セッション開始
/sc:feature        # フィーチャー作成
/sc:boundaries     # 境界チェック
/sc:business-panel # ビジネス分析（新機能）
```

### 6つの適応モード

- **Business Panel** 🆕: 戦略的ビジネス分析
- **Brainstorming**: 要件探索
- **Orchestration**: 並列実行最適化
- **Token-Efficiency**: 30-50%トークン削減
- **Task Management**: 体系的タスク管理
- **Introspection**: メタ認知分析

## 📖 セットアップガイド

詳細なセットアップ手順は **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** を参照してください。

## 🚀 Quick Start

```bash
# Clone the repository
git clone [your-repo-url] my-app
cd my-app

# Run complete setup (dependencies + configuration)
pnpm setup:project

# Start development
pnpm dev
```

### 🔧 Git Hooksの自動設定

このテンプレートは**最初から機能するGit Hooks**を提供します：

- **postinstall時**: `pnpm install`実行時にgit hooksへ自動的に実行権限付与
- **pre-commit**: 境界違反チェック + 複数フィーチャー同時コミット防止
- **commit-msg**: コミットメッセージの標準化強制

新規プロジェクトでも即座に境界保護が有効になります。

> 💡 `pnpm setup:project`は依存関係のインストールも自動で行います

## 📋 Features

- ⚡ **Next.js 14.2.31** with App Router
- 🎨 **Tailwind CSS** with 11 UI design styles (Neumorphism, Glassmorphism, Cyberpunk, etc.)
- 📁 **Feature-based architecture** with boundary enforcement
- 🤖 **SuperClaude integration** for maximum AI development power
- 🧪 **Complete testing** - Playwright E2E + Vitest unit tests
- 📊 **Supabase ready** with MCP server support
- 🔒 **Security-first** with automated vulnerability fixes
- 🎯 **CI/CD Pipeline** with GitHub Actions
- 🎨 **UI Showcase** at `/ui-demo` with all design styles

## 🏗️ Project Structure

```
src/
├── app/          # Next.js App Router
├── features/     # Feature-based modules
├── components/   # Shared components
└── styles/       # Global styles
```

## 🧪 テストとカバレッジ

### テストコマンド

```bash
pnpm test              # ユニットテスト実行
pnpm test:watch        # ウォッチモード
pnpm test:coverage     # カバレッジ測定（90%閾値）
pnpm test:e2e          # Playwright E2Eテスト
pnpm test:regression   # 回帰テスト
```

### カバレッジレポート

```bash
# HTMLレポートの生成と表示
pnpm test:coverage:ui
```

## 📊 Bundle分析

```bash
# Bundle分析レポートの生成
pnpm build:analyze

# 最適化の機会を自動的に可視化
```

## 🌍 国際化（i18n）

### 対応言語

- 🇯🇵 日本語（デフォルト）
- 🇺🇸 英語

### 使用方法

```typescript
import { useI18n } from '@/hooks/useI18n'

function Component() {
  const { locale, t, setLocale } = useI18n()
  return <button>{t('common.actions.save')}</button>
}
```

## 📦 Claude Code専用コマンド

### Claude Code実装フロー

```bash
pnpm claude:start      # 実装開始（状態確認）
pnpm claude:implement  # フィーチャー作成
pnpm claude:validate   # 実装検証
pnpm claude:complete   # 完了確認
```

### 自動化コマンド

- `pnpm create:feature [name]` - フィーチャー自動生成（手動作成禁止）
- `pnpm check:boundaries` - 境界違反検出
- `pnpm fix:boundaries` - 違反自動修正
- `pnpm validate:all` - 全検証実行（完了条件）

### 開発コマンド

- `pnpm dev` - 開発サーバー起動
- `pnpm build` - プロダクションビルド
- `pnpm test` - テスト実行
- `pnpm typecheck` - 型チェック

## 🤖 Claude Code Integration

1. Install [Claude Code GitHub App](https://github.com/apps/claude-code)
2. Add `CLAUDE_CODE_OAUTH_TOKEN` to repository secrets
3. Create issues with `@claude` to trigger automated implementation

## 🔧 MCP (Model Context Protocol) サーバー設定

SuperClaude v4.0.8の6つのMCPサーバーを活用するための設定：

### Quick Setup（推奨）

```bash
# MCPサーバーの接続状態を確認
claude mcp list  # 5つのMCPが利用可能

# Magic MCP（UIコンポーネント生成）- 現在利用不可
# 設定は可能ですが、Claude Codeのツールとして統合されていません（2025-09-02時点）
# UI開発にはfrontend-architectエージェントを使用してください
```

### Supabase MCP（オプション）

```bash
# Supabaseデータベース操作用（プロジェクトで使用する場合）
claude mcp add supabase \
  -e SUPABASE_ACCESS_TOKEN=your_token_here \
  -- npx -y @supabase/mcp-server-supabase@latest
```

**注意**: MCPサーバー設定は開発環境側の設定で、各開発者が個別に設定します。

詳細設定は [MCP Setup Guide](docs/MCP_SETUP.md) を参照。

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
