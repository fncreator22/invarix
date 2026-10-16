"use client";

import { useState, useEffect } from "react";
import { Terminal, Copy, Check, X, Cpu } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

/** OmniDimension-style sticky MCP Protocol banner. Exposes live MCP tools endpoint for Claude Desktop / Cursor / custom agents. */
export function McpBanner() {
  const { wsId } = useWorkspace();
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(`invarix_dismiss_mcp_${wsId}`) === "1") {
      queueMicrotask(() => {
        setIsDismissed(true);
      });
    }
  }, [wsId]);

  if (isDismissed) return null;

  const endpointPath = `/api/v1/workspaces/${wsId}/mcp/tools`;
  const fullEndpointUrl = typeof window !== "undefined" ? `${window.location.origin}${endpointPath}` : endpointPath;

  const handleCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(fullEndpointUrl);
      setCopied(true);
      toast.success("MCP tools endpoint copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy endpoint");
    }
  };

  const handleCopyClaudeConfig = async () => {
    const config = {
      mcpServers: {
        invarix: {
          url: fullEndpointUrl,
          headers: {
            Authorization: "Bearer <YOUR_CLERK_TOKEN_OR_API_KEY>",
          },
        },
      },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      toast.success("Claude Desktop MCP config JSON copied!");
    } catch {
      toast.error("Failed to copy config");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`invarix_dismiss_mcp_${wsId}`, "1");
    }
  };

  return (
    <div
      role="region"
      aria-label="Model Context Protocol Endpoint Banner"
      className="relative z-(--z-sticky) flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-brand/20 bg-surface/90 px-4 py-2 text-body-sm shadow-sm backdrop-blur-md transition-all animate-in fade-in"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-solid" />
          </span>
          <Cpu className="size-3.5" aria-hidden />
          MCP Ready
        </span>
        <span className="text-text-muted hidden sm:inline">|</span>
        <div className="flex items-center gap-1.5 font-mono text-xs text-text-secondary">
          <Terminal className="size-3.5 text-text-muted" aria-hidden />
          <span className="truncate max-w-[280px] md:max-w-md font-medium text-text-primary" title={endpointPath}>
            {endpointPath}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-border-subtle hover:border-brand/50"
          onClick={handleCopyEndpoint}
        >
          {copied ? <Check className="size-3 text-sev-low" /> : <Copy className="size-3" />}
          <span>{copied ? "Copied" : "Copy URL"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-text-secondary hover:text-text-primary"
          onClick={handleCopyClaudeConfig}
        >
          Claude Config
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-text-secondary hover:text-text-primary"
          onClick={handleDismiss}
          title="Dismiss MCP banner"
          aria-label="Dismiss MCP banner"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
