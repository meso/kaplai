# KAPLAI — AI-Powered Game Creation for Kids

> [KAPLAYGROUND](https://github.com/kaplayjs/kaplayground) をフォークし、AIによるコード生成機能を追加したプロジェクトです。

小学生向けの「AIでゲームを作る」ワークショップを実現するために開発されました。

## 概要

子供がAI（LLM）に自然言語で指示を出し、AIがKAPLAYのコードを生成、即座に実行して動作を確認 — このループを繰り返してゲームを作ります。

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌──────────────┐
│   クライアント  │────▶│ Cloudflare Workers │────▶│  AI Gateway   │────▶│   Anthropic   │
│  (ブラウザ)    │◀────│   (API Proxy)     │◀────│  (streaming)  │◀────│    (LLM)      │
└──────────────┘     └──────────────────┘     └──────────────┘     └──────────────┘
```

## 主な機能

- **AI会話によるコード生成**: 「キャラクターを追加して」「ジャンプさせて」などの自然言語でゲームを作成
- **ストリーミングレスポンス**: AIの応答が逐次表示され、タイムアウトを回避
- **タブレット最適化**: 80%のユーザーがタブレットを想定したUI設計
- **QRコード共有**: 作品をQRコードで共有、家で親に見せられる
- **タッチ操作専用**: キーボードではなく、画面端タップで操作する統一インターフェース

## ターゲット環境

| 項目 | 内容 |
|------|------|
| デバイス | ノートPC 20%、タブレット 80% |
| タブレット | iPad 〜 iPad mini |
| 画面向き | 横向き |
| ブラウザ | Safari / Chrome |

## UI

```
┌─────────────────────────────────────────────────────────┐
│ [ヘッダー/ツールバー]                                    │
├───────────────────────────┬─────────────────────────────┤
│                           │                             │
│  [左パネル]               │  [右パネル]                 │
│                           │                             │
│  ┌─────────┬─────────┐   │                             │
│  │ AI会話  │ コード  │   │      ゲームビュー           │
│  └─────────┴─────────┘   │                             │
│  (タブ切り替え)           │                             │
│                           │                             │
│  ┌─────────────────────┐ │                             │
│  │ 会話履歴（表示用）   │ │                             │
│  │ 👤 キャラを追加して  │ │                             │
│  │ 🤖 追加しました！    │ │                             │
│  │ 👤 ジャンプさせて    │ │                             │
│  │ 🤖 できました！      │ │                             │
│  └─────────────────────┘ │                             │
│                           │                             │
│  ┌─────────────────────┐ │                             │
│  │ [入力欄]            │ │                             │
│  │ 敵を出して...       │ │                             │
│  └─────────────────────┘ │                             │
│                           │                             │
└───────────────────────────┴─────────────────────────────┘
```

## デプロイ手順

### 1. AI Gateway の作成

1. Cloudflareダッシュボード → AI Gateway → Create Gateway
2. Gateway名を設定（例: `kaplai`）
3. Account IDとGateway IDをメモ

### 2. Unified Billing の設定

AI Gateway で Unified Billing を有効化し、クレジットをチャージ。

### 3. 環境変数の設定

Cloudflareダッシュボードで以下の環境変数を設定:

```
CF_ACCOUNT_ID=your_cloudflare_account_id
AI_GATEWAY_NAME=kaplai
CF_API_TOKEN=your_cloudflare_api_token
LLM_MODEL=anthropic/claude-sonnet-4-5
```

**対応モデル例:**
- `anthropic/claude-sonnet-4-5`
- `openai/gpt-4o`
- `google-ai-studio/gemini-2.0-flash`
- その他AI Gateway対応モデル

### 4. ビルド & デプロイ

```bash
pnpm install
pnpm build
npx wrangler pages deploy dist --project-name=kaplai
```

### 5. ワークショップ終了後

LLM機能を無効化するには、Cloudflareダッシュボードで:
- `CF_API_TOKEN` を削除または空に設定
- または `functions/api/chat.ts` を削除して再デプロイ

静的サイトとして残るので、作品のURL（QRコード）は引き続きアクセス可能です。

## 技術スタック

- **フロントエンド**: React + Vite + TypeScript
- **状態管理**: Zustand
- **エディタ**: Monaco Editor
- **LLM**: Claude (Anthropic API via Cloudflare AI Gateway)
- **ホスティング**: Cloudflare Pages/Workers

## ファイル構成（AI機能関連）

```
├── functions/
│   └── api/
│       └── chat.ts              # AI Gateway APIプロキシ（ストリーミング対応）
├── src/
│   ├── features/
│   │   └── AIChat/
│   │       ├── index.ts         # エクスポート
│   │       ├── systemPrompt.ts  # LLM用システムプロンプト
│   │       ├── components/
│   │       │   └── AIChat.tsx   # AI会話コンポーネント
│   │       └── stores/
│   │           └── useAIChat.ts # Zustand ストア
│   └── components/
│       ├── Playground/
│       │   └── WorkspaceExample.tsx  # タブ切り替え追加
│       └── ShareQRDialog/
│           └── ShareQRDialog.tsx     # QRコード表示ダイアログ
└── wrangler.jsonc               # Cloudflare設定
```

## 備考

- LLMモデルは環境変数 `LLM_MODEL` で切り替え可能（デフォルト: `anthropic/claude-sonnet-4-5`）
- AI Gatewayの `/compat` エンドポイントでOpenAI SDK互換のAPIを使用
- AI Gatewayでアナリティクス、レート制限が利用可能
- ストリーミング対応でCloudflare Workersの30秒タイムアウトを回避

## クレジット

- フォーク元: [KAPLAYGROUND](https://github.com/kaplayjs/kaplayground) by KAPLAY team
- ゲームライブラリ: [KAPLAY](https://kaplayjs.com/)
