import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared inline form feedback — same treatment used across checkout, auth, and contact. */
export function FormAlert({ tone = "error", children }: { tone?: "error" | "success"; children: React.ReactNode }) {
  const isError = tone === "error";
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-sm",
        isError ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-accent/30 bg-accent/5 text-foreground",
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      )}
      <p>{children}</p>
    </div>
  );
}
