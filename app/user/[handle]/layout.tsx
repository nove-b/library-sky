
export const metadata = {
  title: "blueskyで読書ログを取ろう | Library Sky",
  description: "Blueskyにログインして、読書ログを手軽に記録。BlueskyのFeedで他の人の投稿を眺めて、新しい本との出会いを。マイページで自分のログを一覧でき、読書の軌跡がひと目で分かります。",
};

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="min-h-screen">{children}</main>
    </>
  );
}
