# Supabase MCP Server セットアップガイド

## 概要
Supabase MCPサーバーを使用すると、Claude CodeからSupabaseデータベースに直接アクセスできます。

## セットアップ手順

### 1. Supabaseアクセストークンの取得

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. Account Settings → Access Tokens
3. 新しいアクセストークンを生成
4. トークンをコピー（`sbp_`で始まる文字列）

### 2. Claude Desktop/Cursorでの設定

```bash
# Supabase MCPサーバーを追加
claude mcp add supabase \
  -s local \
  -e SUPABASE_ACCESS_TOKEN=your_token_here \
  -- npx -y @supabase/mcp-server-supabase@latest
```

**your_token_here** を実際のトークンに置き換えてください。

### 3. 設定の確認

```bash
# MCPサーバーのリスト表示
claude mcp list

# Supabaseサーバーが表示されることを確認
```

## 利用可能な機能

MCPサーバー接続後、Claude Codeから以下が可能になります：

- **テーブル操作**: 作成、読み取り、更新、削除
- **スキーマ管理**: マイグレーション、インデックス作成
- **リアルタイム**: サブスクリプション設定
- **RLS（Row Level Security）**: ポリシー管理
- **関数**: Edge Functions の管理

## セキュリティ注意事項

⚠️ **重要**:
- アクセストークンは**絶対にコミットしない**
- `.env.local`や`.gitignore`に記載されたファイルに保存
- チーム開発では各開発者が個別のトークンを使用

## トラブルシューティング

### 接続できない場合

1. トークンが正しいか確認
2. ネットワーク接続を確認
3. Claude Desktop/Cursorを再起動

### 権限エラーの場合

1. トークンの権限スコープを確認
2. Supabaseプロジェクトの設定を確認

## 関連ドキュメント

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [MCP Server仕様](https://github.com/supabase/mcp-server-supabase)
- [PROJECT_INFO.md](../PROJECT_INFO.md) - プロジェクト固有のテーブル構造