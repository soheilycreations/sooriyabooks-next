"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function TrafficChart({ data }: { data: { date: string; views: number; visitors: number }[] }) {
  if (data.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No traffic recorded in this period.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="views"
          name="Page views"
          stroke="hsl(var(--accent))"
          fill="url(#viewsGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="visitors"
          name="Unique visitors"
          stroke="hsl(var(--foreground))"
          fill="url(#visitorsGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
