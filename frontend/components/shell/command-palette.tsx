"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Moon, Plus, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useDeferredValue, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { entityMeta, entityRoute } from "@/components/entity-meta";
import { FOOTER_NAV, PRIMARY_NAV, REGISTRY_NAV } from "@/components/shell/nav";
import { useShell } from "@/components/shell/shell-context";
import { useEntityDrawer } from "@/components/shell/use-drawer";
import { useApi, wsPath } from "@/lib/api";
import { middleTruncate } from "@/lib/format";
import type { Ref } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const PAGES = [...PRIMARY_NAV.filter((i) => i.key !== "registry"), ...REGISTRY_NAV, ...FOOTER_NAV];

/** ⌘K palette (05 §9): Go to, Entities (GET /search), Actions. */
export function CommandPalette() {
  const { commandOpen, setCommandOpen, setStewardOpen } = useShell();
  const { slug, wsId } = useWorkspace();
  const router = useRouter();
  const api = useApi();
  const drawer = useEntityDrawer();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());

  const search = useQuery({
    queryKey: ["search", wsId, q],
    queryFn: ({ signal }) => api<Ref[]>(wsPath(wsId, "/search"), { query: { q }, signal, wakeBudgetMs: 0 }),
    enabled: commandOpen && q.length >= 2,
    staleTime: 10_000,
  });

  const go = (fn: () => void) => {
    setCommandOpen(false);
    setQuery("");
    fn();
  };
  const match = (label: string) => !q || label.toLowerCase().includes(q.toLowerCase());
  const pages = PAGES.filter((p) => match(p.label));
  const actions = [
    { key: "ask", label: "Ask Steward…", icon: Sparkles, run: () => setStewardOpen(true) },
    { key: "new-exc", label: "New exception", icon: Plus, run: () => router.push(`/w/${slug}/exceptions/new`) },
    {
      key: "theme",
      label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
  ].filter((a) => match(a.label));
  const entities = q.length >= 2 ? (search.data ?? []) : [];

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(o) => {
        setCommandOpen(o);
        if (!o) setQuery("");
      }}
      title="Search and commands"
      description="Jump to a page, find an entity, or run an action"
      className="top-[18%] translate-y-0 z-(--z-command) sm:max-w-[560px]"
      shouldFilter={false}
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search pages, services, exceptions, people…" />
      <CommandList>
        <CommandEmpty>
          {search.isFetching ? "Searching…" : search.isError ? "Search is unavailable right now." : "No results."}
        </CommandEmpty>
        {pages.length > 0 && (
          <CommandGroup heading="Go to">
            {pages.map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem key={p.key} value={`page-${p.key}`} onSelect={() => go(() => router.push(`/w/${slug}/${p.href}`))}>
                  <Icon aria-hidden />
                  {p.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {entities.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Entities">
              {entities.slice(0, 12).map((e) => {
                const meta = entityMeta(e.kind, e.id);
                const Icon = meta.icon;
                const href = entityRoute(slug, e.kind, e.id);
                return (
                  <CommandItem
                    key={e.id}
                    value={`entity-${e.id}`}
                    onSelect={() => go(() => (href ? router.push(href) : drawer.open(e.id)))}
                  >
                    <Icon aria-hidden />
                    <span className="truncate">{e.label ?? e.id}</span>
                    <span className="ml-auto font-mono text-caption text-text-muted">{middleTruncate(e.id)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
        {actions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem key={a.key} value={`action-${a.key}`} onSelect={() => go(a.run)}>
                    <Icon aria-hidden />
                    {a.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
