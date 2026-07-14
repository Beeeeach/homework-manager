# 宿題マネージャー

中高生向けの「宿題を終わらせること」に特化したWebアプリ。
仕様書（Ver.0.3）に基づき、宿題の登録だけで計画・進捗管理・リスケジュールを自動化する。

## 技術スタック

- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand（状態管理）
- Vitest（テスト）
- 永続化: localStorage（リポジトリ抽象化により後で差し替え可能）

## ディレクトリ構成

```
src/
  domain/   # データモデルの型定義（Assignment, Task, StudySession, AllocationLog）
  engine/   # スケジューリング・リスケジュール・学習ロジック（純粋関数、UI非依存）
  store/    # Zustandによるアプリ状態
  ui/       # 画面コンポーネント
  data/     # 永続化層（リポジトリインターフェース + localStorage実装）
  config/   # 設定値一覧（仕様書18章に対応）
```

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run test       # テスト実行（1回）
npm run test:watch # テスト実行（watchモード）
```

## デプロイ（Vercel）

このプロジェクトはVite製の静的SPAなので、Vercelの無料枠にそのままデプロイできます。

### 手順

1. **GitHubにリポジトリを作成してpush**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <あなたのGitHubリポジトリURL>
   git push -u origin main
   ```

2. **Vercelでインポート**
   - [vercel.com](https://vercel.com) にアクセスし、GitHubアカウントでログイン
   - 「Add New... → Project」から、上記でpushしたリポジトリを選択
   - Framework Presetは自動的に「Vite」が検出される
   - Build Command: `npm run build`（自動検出されるはず）
   - Output Directory: `dist`（自動検出されるはず）
   - 「Deploy」をクリック

3. **数分待つと公開URLが発行される**
   `https://<プロジェクト名>.vercel.app` のようなURLでアクセス可能になる。

### ローカルでのプレビュー確認（デプロイ前の最終チェック）
```bash
npm run build
npm run preview
```

### 注意点
- データはlocalStorageに保存されるため、**ブラウザ・端末をまたいでは共有されない**。複数端末で使いたい場合は、フェーズ9で抽象化した`AppRepository`をSupabase実装に差し替える対応が別途必要（`data/repository.ts`のインターフェースはそのまま使える設計にしてある）。
- 環境変数は現時点で使用していない（AI APIを使わない方針のため、APIキー等の設定は不要）。

## 実装フェーズ

- [x] フェーズ0: プロジェクト基盤
- [x] フェーズ1: データモデル（15章）
- [x] フェーズ2: スケジューリングエンジン（10章）
- [x] フェーズ3: オーバーロード検出（9章）
- [x] フェーズ4: リスケジュールエンジン（12章）
- [x] フェーズ5: 学習機能／EMA（14章）
- [x] フェーズ6: 記録機能（13章）
- [x] フェーズ7: 初回設定フロー（6章）
- [x] フェーズ8: ホーム画面（16章）
- [x] フェーズ9: 永続化層
- [x] フェーズ10: 結合テスト
- [x] フェーズ11: デプロイ
