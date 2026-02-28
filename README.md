# Library Sky

Blueskyソーシャルメディアプラットフォームでのあなたの投稿を整理・管理するウェブアプリケーションです。

## 概要

**Library Sky** は、Bluesky上の投稿（ログ）を記録し、ユーザーのプロフィール情報やスレッド情報を取得・表示できるプラットフォームです。AT Protocol（Bluesky API）を活用し、セッション管理、投稿管理、プロフィール表示などの機能を提供します。

### 主な機能

- **Blueskyログイン認証**: セキュアなセッション管理によるユーザー認証
- **投稿管理**: Bluesky上の投稿を記録・表示
- **プロフィール表示**: ユーザープロフィール情報の取得・表示
- **スレッド表示**: 投稿スレッド情報の取得
- **フィード管理**: カスタムフィードの作成・管理

### 技術スタック

- **フレームワーク**: [Next.js](https://nextjs.org) 16.1.6
- **言語**: TypeScript
- **UI**: React 19.2.3
- **スタイリング**: Tailwind CSS 4
- **API**: [@atproto/api](https://github.com/bluesky-social/atproto) (Bluesky SDK)
- **HTTP Client**: Axios

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
