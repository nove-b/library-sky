<p align="center">
	<img src="public/icon.svg" alt="Library Sky Logo" width="84" />
</p>

<h1 align="center">Library Sky</h1>

<p align="center">
	Blueskyで読書ログを記録・共有するためのWebアプリ
</p>

---

## できること

- Blueskyアカウントでログインして読書ログを投稿
- 本の検索結果からタイトル・著者・画像をすばやく入力
- ステータス（読みたい / 読書中 / 読了 / 中断）と評価・コメントを記録
- ユーザーページで自分のログを一覧表示
- PWAとしてインストールし、ホーム画面から起動

## こんな人向け

- 読書記録をSNSで気軽に残したい
- Blueskyで読書仲間の投稿を見つけたい
- 読了履歴を自分のタイムラインとして管理したい

## 画面の使い方

1. トップページでBlueskyに接続
2. 書籍名で検索して本を選択
3. ステータス・評価・コメントを入力
4. 投稿ボタンでBlueskyへ送信

## PWAインストール

- 未インストール時は画面下にインストールバナーを表示
- バナーを閉じた場合は1週間後に再表示
- Chrome/Edgeでは「インストール」ボタン、iOS Safariでは「ホーム画面に追加」で利用可能

## 開発環境セットアップ

### 必要環境

- Node.js 20+
- pnpm

### 起動手順

```bash
pnpm install
pnpm dev
```

起動後、`http://localhost:3000` にアクセスしてください。

## スクリプト

- `pnpm dev` : 開発サーバー起動
- `pnpm build` : 本番ビルド
- `pnpm start` : 本番サーバー起動
- `pnpm lint` : Lint実行

## 技術スタック

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- AT Protocol (`@atproto/api`)
- PWA (`next-pwa`)

## 補足

- Blueskyの認証情報はブラウザのローカルストレージに保持されます。
- 開発中にPWA挙動を再確認する場合は、ブラウザのService Workerとキャッシュを削除してから確認してください。
