"use client";

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
      <BlueskySessionPanel session={session} onSessionChange={onSessionChange} />
      <LogComposer session={session} />
    </section>
  );
}
