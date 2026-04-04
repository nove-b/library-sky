"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface UserProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  did: string;
}

interface UsersResponse {
  success: boolean;
  users: UserProfile[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/bluesky/users");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }
        const data: UsersResponse = await response.json();
        setUsers(data.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <>
      <section className="space-y-1">
        <h1 className="text-xl font-semibold">ユーザー一覧</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Library Skyを使っている人たちの読書ログを見てみよう
        </p>
      </section>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="text-stone-500 dark:text-stone-400">読み込み中...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="py-12 text-center text-stone-500 dark:text-stone-400">
          まだユーザーがいません
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {users.map((user) => (
            <Link
              key={user.did}
              href={`/user/${user.handle}`}
              className="flex flex-col items-center gap-2 rounded-lg border border-stone-200 bg-white p-4 text-center transition hover:border-blue-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-blue-700"
            >
              <img
                src={user.avatarUrl || "https://placehold.co/64x64/f5f5f4/000000?text=BS"}
                alt={`${user.displayName}のプロフィール画像`}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div className="w-full">
                <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                  @{user.handle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
