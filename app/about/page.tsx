import type { Metadata } from "next";
import Link from "next/link";
import BlueskyLink from "@/app/components/BlueskyLink";

export const metadata: Metadata = {
  title: "使い方 | Library Sky",
  description: "Library Sky の使い方ガイド。Blueskyで読書ログを記録する方法を説明します。",
};

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">使い方</h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Library Sky は、<BlueskyLink asLink={false} /> で読書ログを手軽に記録・共有できるサービスです。
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-stone-200 dark:border-stone-700 pb-2">
          🚀 はじめかた
        </h2>
        <ol className="space-y-4 text-sm text-stone-700 dark:text-stone-300">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs dark:bg-blue-900/40 dark:text-blue-300">
              1
            </span>
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">Bluesky アカウントでログイン</p>
              <p className="mt-1">
                トップページの「Blueskyでログイン」ボタンから、<BlueskyLink asLink={false} /> アカウントでサインインします。
                アプリパスワードは不要で、OAuth 認証を使用しています。
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs dark:bg-blue-900/40 dark:text-blue-300">
              2
            </span>
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">本を検索して記録する</p>
              <p className="mt-1">
                ログイン後に表示される検索フォームで本のタイトルや著者名を入力して本を探します。
                見つかったら読書ステータスを選択して投稿しましょう。
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs dark:bg-blue-900/40 dark:text-blue-300">
              3
            </span>
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">マイページで読書記録を確認</p>
              <p className="mt-1">
                ヘッダーのアバターアイコンからマイページへ移動できます。
                記録した本の一覧や読書ステータスを確認できます。
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-stone-200 dark:border-stone-700 pb-2">
          📚 読書ステータス
        </h2>
        <ul className="space-y-3 text-sm text-stone-700 dark:text-stone-300">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
              読みたい
            </span>
            <span>読みたいと思っている本を記録しておきます。</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
              読書中
            </span>
            <span>現在読んでいる本を記録します。</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
              読了
            </span>
            <span>読み終わった本を記録します。</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
              中断
            </span>
            <span>途中で読むのをやめた本を記録します。</span>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-stone-200 dark:border-stone-700 pb-2">
          🌐 Bluesky への投稿
        </h2>
        <p className="text-sm text-stone-700 dark:text-stone-300">
          読書ログを記録すると、<BlueskyLink asLink={false} /> に自動的に投稿されます。
          投稿には本のタイトル・著者・読書ステータスが含まれ、ほかのユーザーとも共有されます。
          また、<BlueskyLink href="https://bsky.app/profile/did:plc:2atly2y5kfyjcj5zap6pv4wd/feed/aaaf7ciexzdpw">読書ログ Feed</BlueskyLink>{" "}
          で他のユーザーの投稿を眺めて、新しい本との出会いを楽しめます。
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-stone-200 dark:border-stone-700 pb-2">
          🔒 プライバシーとデータ
        </h2>
        <p className="text-sm text-stone-700 dark:text-stone-300">
          Library Sky は <BlueskyLink asLink={false} /> の OAuth 認証を使用しており、パスワードを保存しません。
          投稿データはすべて <BlueskyLink asLink={false} /> のサーバーに保存されます。
          ログアウトするとセッション情報がすべて削除されます。
        </p>
      </section>

      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← トップページへ戻る
        </Link>
      </div>
    </div>
  );
}
