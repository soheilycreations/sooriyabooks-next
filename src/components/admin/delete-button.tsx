"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/auth/actions";

export function DeleteButton({
  action,
  confirmMessage = "Are you sure? This cannot be undone.",
}: {
  action: () => Promise<ActionResult>;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          const result = await action();
          if (!result.ok) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
      aria-label="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
