
export const metadata = {
  title: "ユーザーの本棚 | Library Sky",
  description: "大空の読書記録をBlueskyで共有",
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
