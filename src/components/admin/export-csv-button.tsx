"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportCsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, string | number>[];
}) {
  function handleExport() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]!);
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
