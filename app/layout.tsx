import type { Metadata, Viewport } from "next";
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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://library-sky.com";

export const metadata: Metadata = {
  title: "Blueskyで読書ログを取ろう | Library Sky",
  description: "Blueskyにログインして、読書ログを手軽に記録。BlueskyのFeedで他の人の投稿を眺めて、新しい本との出会いを。マイページで自分のログを一覧でき、読書の軌跡がひと目で分かります。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Library Sky",
  },
  openGraph: {
    title: "Blueskyで読書ログを取ろう | Library Sky",
    description: "Blueskyにログインして、読書ログを手軽に記録。BlueskyのFeedで他の人の投稿を眺めて、新しい本との出会いを。マイページで自分のログを一覧でき、読書の軌跡がひと目で分かります。",
    url: BASE_URL,
    siteName: "Library Sky",
    images: [
      {
        url: `${BASE_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: "Library Sky",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blueskyで読書ログを取ろう | Library Sky",
    description: "Blueskyにログインして、読書ログを手軽に記録。BlueskyのFeedで他の人の投稿を眺めて、新しい本との出会いを。マイページで自分のログを一覧でき、読書の軌跡がひと目で分かります。",
    images: [`${BASE_URL}/ogp.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
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
