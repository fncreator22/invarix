"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useApi, wsPath } from "@/lib/api";
import { formatUtcDay } from "@/lib/format";
import { hasRole } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** 04 §3 / FR-WS-08: Shows sample data simulation banner. Admins can reset the sample, start blank, or dismiss/minimize. */
export function SampleBanner() {
  const { workspace, role, wsId } = useWorkspace();
  const api = useApi();
  const qc = useQueryClient();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(`reprieve_dismiss_sample_${wsId}`) === "1") {
      setIsDismissed(true);
    }
  }, [wsId]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`reprieve_dismiss_sample_${wsId}`, "1");
    }
  };

  const reset = useMutation({
    mutationFn: () => api<unknown>(wsPath(wsId, "/sample-data"), { method: "POST" }),
    meta: { success: "Sample data reset. Sentinel is rerunning detection." },
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey.includes(wsId) }),
  });

  if (workspace?.data_mode !== "sample" || isDismissed) return null;
  const isAdmin = hasRole(role, "admin");

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-subtle bg-info-soft px-4 py-1.5 text-body-sm transition-all animate-in fade-in">
      <span className="inline-flex items-center gap-2 text-info">
        <Database aria-hidden className="size-4" />
        <span className="font-medium">Sample data · simulated date</span>
      </span>
      <span className="text-text-secondary">As of {formatUtcDay(workspace.as_of)}</span>
      <div className="ml-auto flex items-center gap-1.5">
        {isAdmin && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" loading={reset.isPending}>
                  Reset sample
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset the sample data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This restores Northwind Pay to its original state. Reviews, notes and changes made to sample entities
                    are replaced.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => reset.mutate()}>Reset sample</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/onboarding?new=1&path=blank">Start blank</Link>
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-text-secondary hover:text-text-primary hover:bg-info/10"
          onClick={handleDismiss}
          title="Minimize sample banner"
          aria-label="Minimize sample banner"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
