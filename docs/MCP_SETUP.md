# MCP (Model Context Protocol) サーバー設定ガイド

## 📋 SuperClaude v4.0.8 MCPサーバー一覧

SuperClaude v4.0.8では以下の6つのMCPサーバーを活用します：

| サーバー | 用途 | 設定状態 |
|----------|------|----------|
| **Context7** | 公式ドキュメント取得 | ✅ 設定済み |
| **Magic** | UIコンポーネント生成 | ✅ 設定済み |
| **Morphllm** | パターンベース編集 | ✅ 設定済み |
| **Playwright** | ブラウザテスト | ✅ 設定済み |
| **Sequential** | 複雑な分析・推論 | ✅ 設定済み |
| **Serena** | セマンティック理解 | ✅ 設定済み |

## 🚀 Magic MCP設定方法

Magic MCPは21st.devのUIパターンライブラリを使用してモダンなUIコンポーネントを生成します。

### 設定手順

1. **APIキーの取得**
   - [21st.dev](https://21st.dev)でアカウント作成
   - ダッシュボードからAPIキーを取得

2. **Claude Codeへの追加**
   ```bash
   # APIキーを環境変数として設定してMagic MCPを追加
   claude mcp add magic \
     -e TWENTYFIRST_API_KEY=your_api_key_here \
     -- npx -y @21st-dev/magic@latest
   ```

3. **接続確認**
   ```bash
   # MCPサーバーの状態を確認
   claude mcp list
   ```

### 使用例

Magic MCPは以下のようなUIコンポーネント作成時に自動的に活用されます：

```typescript
// トリガーキーワード
"create a login form"        // → Magic MCPが自動起動
"build a responsive navbar"  // → Magic MCPが自動起動
"add a data table"          // → Magic MCPが自動起動
"/ui button component"      // → Magic MCPが自動起動
```

## 🔧 その他のMCPサーバー設定

### Context7（ドキュメント取得）
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

### Sequential（複雑な分析）
```bash
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

### Playwright（ブラウザテスト）
```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

### Morphllm（パターン編集）
```bash
claude mcp add morphllm-fast-apply -- npx @morph-llm/morph-fast-apply /home/
```

### Serena（セマンティック理解）
```bash
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server
```

## ✅ 設定確認方法

全てのMCPサーバーが正常に動作しているか確認：

```bash
claude mcp list
```

期待される出力：
```
Checking MCP server health...

context7: ✓ Connected
sequential-thinking: ✓ Connected
playwright: ✓ Connected
serena: ✓ Connected
morphllm-fast-apply: ✓ Connected
magic: ✓ Connected
```

## 🎯 コンテキスト駆動の活用

MCPサーバーは以下の優先順位で自動的に選択されます：

```typescript
const MCP_PRIORITY = {
  1: "専門MCPサーバー",    // タスクに特化したMCP
  2: "ネイティブツール",   // Claude Code組み込み
  3: "基本コマンド"       // シェルコマンド
}
```

### タスク別MCP自動選択

| タスクタイプ | 自動選択されるMCP |
|------------|------------------|
| UI開発 | Magic + Context7 |
| リファクタリング | Serena + Morphllm |
| デバッグ | Sequential + Serena |
| テスト | Playwright |
| ドキュメント | Context7 |

## 📝 トラブルシューティング

### Magic MCPが動作しない場合

1. **APIキーの確認**
   ```bash
   # 設定を確認
   cat ~/.claude.json | grep -A 5 magic
   ```

2. **再設定**
   ```bash
   # 削除して再追加
   claude mcp remove magic
   claude mcp add magic -e TWENTYFIRST_API_KEY=your_key -- npx -y @21st-dev/magic@latest
   ```

3. **ログ確認**
   ```bash
   # MCPサーバーのログを確認
   claude mcp logs magic
   ```

## 🔗 関連ドキュメント

- [SuperClaude v4.0.8 完全ガイド](../SUPERCLAUDE_FINAL.md)
- [Claude Code実装ガイド](../CLAUDE.md)
- [プロジェクト情報](../PROJECT_INFO.md)