"use client";

import { Suspense } from "react";
import type { BlueskySession } from "@/lib/types";
import BlueskySessionPanel from "./BlueskySessionPanel";
import LogComposer from "./LogComposer";

interface HomeClientProps {
  session: BlueskySession | null;
  onSessionChange: (session: BlueskySession | null) => void;
}

export default function HomeClient({ session, onSessionChange }: HomeClientProps) {
  return (
    <section className="grid gap-8">
      <Suspense fallback={<div>読み込み中...</div>}>
        <BlueskySessionPanel session={session} onSessionChange={onSessionChange} />
      </Suspense>
      <LogComposer session={session} />
    </section>
  );
}
