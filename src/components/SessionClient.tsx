"use client";

import dynamic from "next/dynamic";
import type { LemmaMeta } from "@/lib/learning";

const SessionRunner = dynamic(
  () => import("@/components/SessionRunner").then((mod) => mod.SessionRunner),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[color:var(--muted)]">← Exit session</div>
        </div>
        <div className="card p-12 text-center text-[color:var(--muted)] animate-pulse">
          Loading session…
        </div>
      </div>
    ),
  }
);

interface Props {
  freq: LemmaMeta[];
}

export function SessionClient(props: Props) {
  return <SessionRunner {...props} />;
}
