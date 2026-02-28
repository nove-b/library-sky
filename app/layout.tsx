import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import LayoutClient from "./components/LayoutClient";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "blueskyで読書ログを取ろう | Library Sky",
  description: "Blueskyにログインして、読書ログを手軽に記録。BlueskyのFeedで他の人の投稿を眺めて、新しい本との出会いを。マイページで自分のログを一覧でき、読書の軌跡がひと目で分かります。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${manrope.variable} ${fraunces.variable} antialiased`}>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
