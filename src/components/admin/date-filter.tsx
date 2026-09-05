"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

export function DateFilter({ current, basePath = "/admin/analytics" }: { current: string; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPreset(preset: string) {
    const params = new URLSearchParams(searchParams);
    params.set("range", preset);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPreset(p.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${current === p.value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
        >
          {p.label}
        </button>
      ))}
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const params = new URLSearchParams(searchParams);
          params.set("range", "custom");
          params.set("from", String(form.get("from")));
          params.set("to", String(form.get("to")));
          router.push(`${basePath}?${params.toString()}`);
        }}
      >
        <input type="date" name="from" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
        <span className="text-xs text-muted-foreground">to</span>
        <input type="date" name="to" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
        <button type="submit" className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70">
          Apply
        </button>
      </form>
    </div>
  );
}
