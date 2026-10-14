'use client';

import * as React from 'react';
import Link from 'next/link';
import {
   Activity,
   ArrowRight,
   BookOpen,
   Bot,
   Check,
   CheckCircle2,
   Copy,
   Cpu,
   Database,
   ExternalLink,
   FileCode,
   FileText,
   Layers,
   Mail,
   Network,
   RefreshCw,
   ShieldAlert,
   ShieldCheck,
   Sparkles,
   Terminal,
   Trash2,
   Webhook,
   Zap,
} from 'lucide-react';
import { SiGithub, SiDiscord } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogoMark } from '@/components/logo';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SlackIcon({ className = 'size-5' }: { className?: string }) {
   return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Slack">
         <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
   );
}

export type DialogKey = 'cli' | 'three-graph' | 'rules' | 'post-mortems' | 'mcp' | 'github' | 'falkordb';

export interface ReprieveFeature {
   id: string;
   icon: React.ReactNode;
   title: string;
   subtitle: string;
   description: string;
   actionLabel: string;
   href?: string;
   dialogKey?: DialogKey;
   badge?: string;
   metric?: string;
}

export interface ReprieveIntegration {
   id: string;
   icon: React.ReactNode;
   title: string;
   category: string;
   description: string;
   status: 'active' | 'ready' | 'configured';
   actionLabel: string;
   href?: string;
   dialogKey?: DialogKey;
}

export interface ReprieveGuide {
   id: string;
   icon: React.ReactNode;
   title: string;
   description: string;
   tag: string;
   dialogKey: DialogKey;
}

export const REPRIEVE_FEATURES: ReprieveFeature[] = [
   {
      id: 'avalanche',
      icon: <Network className="text-brand size-5" />,
      title: 'Avalanche Centrality',
      subtitle: 'P = p₀ʰ Multi-Hop Reachability',
      description:
         'Multi-hop failure reachability across the microservice dependency mesh. Traces compounding cascaded risk.',
      actionLabel: 'Explore Graph',
      href: '/graph',
      badge: 'P = p₀ʰ Model',
      metric: 'Max depth: 4 hops',
   },
   {
      id: 'sentinel',
      icon: <ShieldAlert className="text-brand size-5" />,
      title: 'Autonomous Sentinel',
      subtitle: 'Continuous Collision Detection',
      description:
         'Continuous detection engine scanning sliding temporal collision windows and architectural bypasses.',
      actionLabel: 'View Alerts',
      href: '/alerts',
      badge: '8 Invariants Active',
      metric: 'Sub-second cycle',
   },
   {
      id: 'mcp-tools',
      icon: <Cpu className="text-brand size-5" />,
      title: '14 Read-Only MCP Tools',
      subtitle: 'Model Context Protocol for IDEs',
      description:
         'Native MCP protocol endpoints allowing Cursor, Claude Desktop, and VS Code to inspect live graphs safely.',
      actionLabel: 'View MCP Config',
      dialogKey: 'mcp',
      badge: '14 Tools Mounted',
      metric: 'Read-only safe',
   },
   {
      id: 'memory-graph',
      icon: <Zap className="text-brand size-5" />,
      title: 'Precedent Decision Memory',
      subtitle: 'Episodic & Semantic Waiver Recall',
      description:
         'Episodic and semantic recall of prior approval rationales, audits, and runbooks on matching controls.',
      actionLabel: 'Review Exceptions',
      href: '/exceptions',
      badge: 'Memory Graph',
      metric: 'Semantic ranking',
   },
   {
      id: 'ast-scanner',
      icon: <Terminal className="text-brand size-5" />,
      title: 'Zero-Login AST Scanner',
      subtitle: 'Pre-Merge Circuit Breaker',
      description:
         'Lightweight TypeScript/Python AST scanner running locally or in CI in <15ms to catch unauthorized decorators.',
      actionLabel: 'View CLI Commands',
      dialogKey: 'cli',
      badge: '< 15ms CI Gate',
      metric: 'Zero-auth CLI',
   },
   {
      id: 'steward-agent',
      icon: <Bot className="text-brand size-5" />,
      title: 'Steward AI Conversational Agent',
      subtitle: 'SSE Streaming Graph Copilot',
      description:
         'Strict citation-grounded graph reasoning assistant with token streaming and bounded tool execution (≤6/turn).',
      actionLabel: 'Launch Steward',
      href: '/steward',
      badge: 'Grounded SSE',
      metric: '≤ 6 tools / turn',
   },
];

export const REPRIEVE_INTEGRATIONS: ReprieveIntegration[] = [
   {
      id: 'maileroo',
      icon: <Mail className="size-5 text-brand" />,
      title: 'Maileroo',
      category: 'Email Delivery',
      description: '3,000 free emails/mo, 2 custom domains, real-time risk bulletins and weekly digests.',
      status: 'active',
      actionLabel: 'Configure',
      href: '/settings/integrations',
   },
   {
      id: 'slack-discord',
      icon: <SlackIcon className="size-5 text-brand" />,
      title: 'Slack / Discord',
      category: 'Incident Broadcast',
      description: 'Operational incident cards with shortest proof paths broadcast to #sre-alerts.',
      status: 'active',
      actionLabel: 'Configure',
      href: '/settings/integrations',
   },
   {
      id: 'github-actions',
      icon: <SiGithub className="size-5 text-brand" />,
      title: 'GitHub Actions',
      category: 'Pre-Merge Gate',
      description: '.github/workflows/reprieve.yml gate blocking PRs violating risk limits.',
      status: 'ready',
      actionLabel: 'View YAML',
      dialogKey: 'github',
   },
   {
      id: 'webhooks',
      icon: <Webhook className="size-5 text-brand" />,
      title: 'Enterprise HMAC Webhooks',
      category: 'SIEM / Observability',
      description: 'Signed Svix-style payloads with SHA-256 signatures for Datadog / PagerDuty / SIEM.',
      status: 'active',
      actionLabel: 'Configure',
      href: '/settings/integrations',
   },
   {
      id: 'mcp-server',
      icon: <Cpu className="size-5 text-brand" />,
      title: 'Model Context Protocol (MCP)',
      category: 'IDE Intelligence',
      description: 'Connect Cursor, Claude Desktop, and VS Code directly to your Reprieve graph reasoning tools.',
      status: 'configured',
      actionLabel: 'View Config',
      dialogKey: 'mcp',
   },
   {
      id: 'falkordb',
      icon: <Database className="size-5 text-brand" />,
      title: 'FalkorDB Engine',
      category: 'Graph Database',
      description: 'Low-latency C-based graph engine storing platform, domain, and agent memory graphs.',
      status: 'active',
      actionLabel: 'Cluster Info',
      dialogKey: 'falkordb',
   },
];

export const REPRIEVE_GUIDES: ReprieveGuide[] = [
   {
      id: 'cli-guide',
      icon: <Terminal className="size-5 text-brand" />,
      title: 'Zero-Login CLI Quickstart',
      description: 'Run npx reprieve scan --strict locally in under 15ms without credentials or accounts.',
      tag: 'CLI Tool',
      dialogKey: 'cli',
   },
   {
      id: 'three-graph-guide',
      icon: <Layers className="size-5 text-brand" />,
      title: 'Three-Graph Architecture',
      description: 'Isolated graph namespaces: platform, org_{ws_id}, and mem_{ws_id} topology.',
      tag: 'Architecture',
      dialogKey: 'three-graph',
   },
   {
      id: 'rules-guide',
      icon: <ShieldCheck className="size-5 text-brand" />,
      title: '8 Detection Rules',
      description: 'Invariant rules catalog from R1 (Ghost Owner) to R8 (Blast Concentration).',
      tag: 'Cypher Rules',
      dialogKey: 'rules',
   },
   {
      id: 'post-mortems-guide',
      icon: <BookOpen className="size-5 text-brand" />,
      title: 'Incident Post-Mortems',
      description: 'CrowdStrike, Knight Capital, and GitLab historical outages reconstructed.',
      tag: 'Case Studies',
      dialogKey: 'post-mortems',
   },
];

export interface SettingsWorkspaceHubProps {
   slug?: string;
   wsId?: string;
   workspaceName?: string;
   region?: string;
   role?: string;
   dataMode?: 'sample' | 'blank' | string;
   clockMode?: 'simulated' | 'live' | string;
   isAdmin?: boolean;
   onRename?: (newName: string) => void | Promise<void>;
   isRenaming?: boolean;
   onRunSentinel?: () => void;
   isRunningSentinel?: boolean;
   onResetBlank?: () => void;
   isResettingBlank?: boolean;
   onLoadSample?: () => void;
   isLoadingSample?: boolean;
   deleteDialogNode?: React.ReactNode;
}

export function SettingsWorkspaceHub({
   slug = 'northwind-pay',
   wsId = 'ws_01m4p7v5fqha7nwyzs0sgphj9c',
   workspaceName = 'Northwind Pay',
   region = 'United States (US-East-1)',
   role = 'admin',
   dataMode = 'sample',
   clockMode = 'simulated',
   isAdmin = true,
   onRename,
   isRenaming = false,
   onRunSentinel,
   isRunningSentinel = false,
   onResetBlank,
   isResettingBlank = false,
   onLoadSample,
   isLoadingSample = false,
   deleteDialogNode,
}: SettingsWorkspaceHubProps) {
   const [localName, setLocalName] = React.useState<string | null>(null);
   const [activeDialog, setActiveDialog] = React.useState<DialogKey | null>(null);
   const [copied, setCopied] = React.useState<string | null>(null);

   const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
   };

   const resolveHref = (path: string) => (slug ? `/w/${slug}${path}` : path);

   const currentName = localName ?? workspaceName;
   const canSaveName =
      isAdmin &&
      localName !== null &&
      localName.trim().length >= 2 &&
      localName.trim() !== workspaceName;

   const handleSaveName = (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSaveName) return;
      if (onRename) {
         onRename(localName.trim());
      } else {
         toast.success(`Workspace renamed to "${localName.trim()}" (demo mode).`);
      }
   };

   return (
      <div className="w-full text-text-primary transition-colors duration-300">
         {/* Top Banner with Reprieve Logo */}
         <div className="rounded-xl border border-border-subtle bg-surface/60 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-lg border border-border-subtle bg-raised shrink-0">
                     <LogoMark variant="aurora" className="size-8" />
                  </div>
                  <div>
                     <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-brand font-semibold px-1.5 py-0.5 bg-brand-soft border border-brand/20">
                           Reprieve Workspace Hub
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                           <span className="size-1.5 rounded-full bg-emerald-500" />
                           Region: <span className="text-text-primary font-medium">{region}</span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary border border-border-subtle px-1.5 py-0.5 bg-surface-sunken capitalize">
                           Role: {role}
                        </span>
                     </div>
                     <h1 className="text-h2 font-semibold tracking-tight text-text-primary">
                        {currentName || 'Workspace Infrastructure'}
                     </h1>
                     <p className="text-body-sm text-text-secondary mt-0.5">
                        Manage workspace identity, automated Sentinel invariants, graph integrations, and pre-merge CI circuit breakers.
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <Button variant="outline" size="sm" asChild>
                     <Link href={resolveHref('/settings/integrations')}>
                        Integrations Hub
                     </Link>
                  </Button>
                  <Button variant="default" size="sm" asChild>
                     <Link href={resolveHref('/alerts')}>
                        Live Sentinel Alerts
                     </Link>
                  </Button>
               </div>
            </div>
         </div>

         {/* 1. Workspace Identity & Renaming */}
         <section className="card-e1 p-5 mb-8" aria-label="Workspace Details">
            <h2 className="mb-4 font-sans text-h3 font-semibold">Workspace Details</h2>
            <div className="space-y-6">
               <form className="space-y-4" onSubmit={handleSaveName}>
                  <label className="block space-y-1.5 text-body-sm">
                     <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary">Workspace Name</span>
                        {!isAdmin && (
                           <span className="text-caption text-text-muted italic">
                              Admin role required to rename
                           </span>
                        )}
                     </div>
                     <div className="flex gap-2">
                        <Input
                           value={currentName}
                           onChange={(e) => setLocalName(e.target.value)}
                           maxLength={80}
                           disabled={!isAdmin || isRenaming}
                           placeholder="Workspace Name"
                           className="max-w-md font-medium"
                        />
                        {isAdmin && (
                           <Button
                              type="submit"
                              size="sm"
                              loading={isRenaming}
                              disabled={!canSaveName}
                           >
                              Save Name
                           </Button>
                        )}
                     </div>
                  </label>
               </form>

               <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-body-sm pt-2 border-t border-border-subtle">
                  <dt className="text-text-muted">Workspace ID</dt>
                  <dd className="flex items-center gap-2">
                     <span className="font-mono text-xs text-text-secondary bg-surface-sunken px-2 py-0.5 border border-border-subtle">
                        {wsId}
                     </span>
                     <button
                        type="button"
                        onClick={() => copyToClipboard(wsId, 'ws-id')}
                        className="text-text-muted hover:text-text-primary transition-colors p-1"
                        title="Copy Workspace ID"
                     >
                        {copied === 'ws-id' ? (
                           <Check className="size-3.5 text-emerald-400" />
                        ) : (
                           <Copy className="size-3.5" />
                        )}
                     </button>
                  </dd>

                  <dt className="text-text-muted">Address</dt>
                  <dd className="font-mono text-xs text-text-primary">/w/{slug}</dd>

                  <dt className="text-text-muted">Region</dt>
                  <dd className="text-text-primary flex items-center gap-1.5">
                     <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                     <span>{region}</span>
                  </dd>

                  <dt className="text-text-muted">Data Mode</dt>
                  <dd>
                     {dataMode === 'sample'
                        ? 'Sample demo data (Northwind Pay)'
                        : 'Blank (Custom codebase)'}
                  </dd>

                  <dt className="text-text-muted">Clock</dt>
                  <dd>
                     {clockMode === 'simulated'
                        ? 'Simulated (change it from the date chip in the top bar)'
                        : 'Live'}
                  </dd>

                  <dt className="text-text-muted">Your Role</dt>
                  <dd className="capitalize font-medium text-text-primary">{role}</dd>
               </dl>
            </div>
         </section>

         {/* 2. Maintenance & Data Management */}
         {isAdmin && (
            <section className="card-e1 p-5 mb-8" aria-label="Maintenance & Data Management">
               <h2 className="mb-4 font-sans text-h3 font-semibold">Maintenance & Data Management</h2>
               <div className="space-y-4">
                  <div className="flex flex-wrap gap-2.5">
                     <Button
                        variant="secondary"
                        loading={isRunningSentinel}
                        onClick={() => {
                           if (onRunSentinel) onRunSentinel();
                           else toast.success('Sentinel scan executed (demo mode).');
                        }}
                     >
                        Run Sentinel now
                     </Button>

                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive-outline" loading={isResettingBlank}>
                              Clear all data (Reset to blank)
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>Reset workspace to a clean blank slate?</AlertDialogTitle>
                              <AlertDialogDescription>
                                 This wipes all services, exceptions, reviews, and alerts from this workspace. The workspace will be completely empty with 0 alerts, ready for real CLI/MCP code scans.
                              </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                 className="bg-danger text-text-on-brand hover:bg-danger/90"
                                 onClick={() => {
                                    if (onResetBlank) onResetBlank();
                                    else toast.success('Workspace reset to blank (demo mode).');
                                 }}
                              >
                                 Clear all data & start blank
                              </AlertDialogAction>
                           </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>

                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="outline" loading={isLoadingSample}>
                              {dataMode === 'sample'
                                 ? 'Reload demo data (Northwind Pay)'
                                 : 'Load demo data (Northwind Pay)'}
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>Load Northwind Pay demo dataset?</AlertDialogTitle>
                              <AlertDialogDescription>
                                 Both graphs will be populated from Northwind Pay (12 services, 31 exceptions, and 8 risk rules). Any existing entities in this workspace will be replaced by the demo data.
                              </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                 onClick={() => {
                                    if (onLoadSample) onLoadSample();
                                    else toast.success('Loaded Northwind Pay demo data (demo mode).');
                                 }}
                              >
                                 Load demo data
                              </AlertDialogAction>
                           </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                  </div>
                  <p className="text-caption text-text-muted">
                     Use <strong>Clear all data</strong> to purge all sample alerts and start fresh, or <strong>Load demo data</strong> to explore the full graph algorithms.
                  </p>
               </div>
            </section>
         )}

         {/* 3. Explore Features */}
         <section className="card-e1 p-5 mb-8" aria-label="Explore Features">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="font-sans text-h3 font-semibold">Explore Features</h2>
                  <p className="text-caption text-text-muted mt-0.5">
                     Verified graph reasoning and architectural risk prevention engines implemented in Reprieve.
                  </p>
               </div>
               <span className="font-mono text-[11px] text-text-muted">6 Core Engines</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {REPRIEVE_FEATURES.map((feature) => (
                  <div
                     key={feature.id}
                     className="rounded-lg border border-border-subtle bg-surface p-4 flex flex-col justify-between hover:border-brand/40 transition-colors"
                  >
                     <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                           <div className="p-2 rounded-md border border-border-subtle bg-raised">
                              {feature.icon}
                           </div>
                           {feature.badge && (
                              <span className="font-mono text-[10px] uppercase text-text-secondary border border-border-subtle px-1.5 py-0.5 rounded bg-surface-sunken">
                                 {feature.badge}
                              </span>
                           )}
                        </div>
                        <h3 className="font-medium text-body-sm text-text-primary">
                           {feature.title}
                        </h3>
                        <p className="text-caption text-text-secondary mt-1">
                           {feature.description}
                        </p>
                     </div>

                     <div className="pt-3 mt-3 border-t border-border-subtle/50 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-text-muted">
                           {feature.metric}
                        </span>
                        {feature.dialogKey ? (
                           <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5"
                              onClick={() => setActiveDialog(feature.dialogKey!)}
                           >
                              {feature.actionLabel}
                           </Button>
                        ) : (
                           <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2.5">
                              <Link href={resolveHref(feature.href || '/graph')} className="flex items-center gap-1.5">
                                 {feature.actionLabel}
                                 <ArrowRight size={13} />
                              </Link>
                           </Button>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         </section>

         {/* 4. Integrations & Connectors */}
         <section className="card-e1 p-5 mb-8" aria-label="Integrations & Connectors">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="font-sans text-h3 font-semibold">Integrations & Connectors</h2>
                  <p className="text-caption text-text-muted mt-0.5">
                     Connect external notification channels, pre-merge git hooks, and IDE clients.
                  </p>
               </div>
               <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                  <Link href={resolveHref('/settings/integrations')}>
                     Browse all
                  </Link>
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {REPRIEVE_INTEGRATIONS.map((integration) => (
                  <div
                     key={integration.id}
                     className="rounded-lg border border-border-subtle bg-surface p-4 flex flex-col justify-between hover:border-brand/40 transition-colors"
                  >
                     <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                           <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md border border-border-subtle bg-raised">
                                 {integration.icon}
                              </div>
                              <span className="font-medium text-body-sm text-text-primary">
                                 {integration.title}
                              </span>
                           </div>
                           <span
                              className={cn(
                                 'font-mono text-[10px] uppercase px-1.5 py-0.5 border rounded',
                                 integration.status === 'active'
                                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                    : 'border-brand/30 text-brand bg-brand-soft'
                              )}
                           >
                              {integration.status}
                           </span>
                        </div>
                        <p className="text-caption text-text-secondary">
                           {integration.description}
                        </p>
                     </div>

                     <div className="pt-3 mt-3 border-t border-border-subtle/50 flex justify-end">
                        {integration.dialogKey ? (
                           <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-3"
                              onClick={() => setActiveDialog(integration.dialogKey!)}
                           >
                              {integration.actionLabel}
                           </Button>
                        ) : (
                           <Button variant="outline" size="sm" asChild className="h-7 text-xs px-3">
                              <Link href={resolveHref(integration.href || '/settings/integrations')}>
                                 {integration.actionLabel}
                              </Link>
                           </Button>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         </section>

         {/* 5. Documentation & Guides */}
         <section className="card-e1 p-5 mb-8" aria-label="Documentation & Guides">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="font-sans text-h3 font-semibold">Documentation & Guides</h2>
                  <p className="text-caption text-text-muted mt-0.5">
                     Architectural specifications, incident post-mortems, and command-line automation patterns.
                  </p>
               </div>
               <span className="font-mono text-[11px] text-text-muted">4 Specifications</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {REPRIEVE_GUIDES.map((guide) => (
                  <div
                     key={guide.id}
                     onClick={() => setActiveDialog(guide.dialogKey)}
                     className="group rounded-lg border border-border-subtle bg-surface p-4 flex flex-col justify-between hover:border-brand/40 transition-colors cursor-pointer"
                  >
                     <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                           <div className="p-1.5 rounded-md border border-border-subtle bg-raised">
                              {guide.icon}
                           </div>
                           <span className="font-mono text-[10px] uppercase text-text-muted border border-border-subtle px-1.5 py-0.5 rounded">
                              {guide.tag}
                           </span>
                        </div>
                        <h3 className="font-medium text-body-sm text-text-primary group-hover:text-brand transition-colors mb-1">
                           {guide.title}
                        </h3>
                        <p className="text-caption text-text-secondary">
                           {guide.description}
                        </p>
                     </div>
                     <div className="mt-3 pt-2 flex items-center justify-between text-xs text-brand">
                        <span className="font-mono text-[11px]">View Specification</span>
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                     </div>
                  </div>
               ))}
            </div>
         </section>

         {/* 6. Danger Zone */}
         <section className="card-e1 p-5 border-danger/30 bg-danger/5" aria-label="Danger Zone">
            <h2 className="mb-2 font-sans text-h3 font-semibold text-danger">Danger Zone</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <div>
                  <h3 className="font-semibold text-danger text-body-sm">Delete this workspace</h3>
                  <p className="mt-0.5 text-caption text-text-secondary">
                     Permanently purge all graph topology, exceptions, Sentinel alerts, and API keys. This action cannot be reversed.
                  </p>
               </div>
               <div>
                  {deleteDialogNode ? (
                     deleteDialogNode
                  ) : isAdmin ? (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">
                              Delete workspace
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                 This will permanently delete workspace <strong>{workspaceName}</strong> and purge all associated graphs.
                              </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                 className="bg-danger text-text-on-brand"
                                 onClick={() => toast.error('Workspace deletion simulated (demo mode).')}
                              >
                                 Delete Workspace
                              </AlertDialogAction>
                           </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                  ) : (
                     <p className="text-caption text-text-muted italic">
                        Only the workspace owner can delete this workspace.
                     </p>
                  )}
               </div>
            </div>
         </section>

         {/* Interactive Modal Dialogs */}
         {/* 1. CLI Quickstart Modal */}
         <Dialog open={activeDialog === 'cli'} onOpenChange={(open) => !open && setActiveDialog(null)}>
            <DialogContent className="max-w-2xl">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <Terminal className="size-5 text-brand" />
                     Zero-Login CLI Quickstart
                  </DialogTitle>
                  <DialogDescription>
                     Scan your repository for unapproved bypasses, expired waivers, and risky decorators in under 15ms.
                  </DialogDescription>
               </DialogHeader>
               <div className="space-y-4 pt-3">
                  <div className="space-y-2">
                     <span className="text-caption font-mono uppercase text-text-muted">1. Instant Zero-Login Scan</span>
                     <div className="flex items-center justify-between bg-surface-sunken border border-border-subtle p-3 font-mono text-body-sm">
                        <code>npx reprieve scan --strict</code>
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => copyToClipboard('npx reprieve scan --strict', 'cmd-scan')}
                        >
                           {copied === 'cmd-scan' ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                        </Button>
                     </div>
                     <p className="text-caption text-text-muted">
                        No API key or network credentials required. Directly inspects TypeScript and Python ASTs.
                     </p>
                  </div>
                  <div className="space-y-2">
                     <span className="text-caption font-mono uppercase text-text-muted">2. Pre-Merge Gate Enforcement</span>
                     <div className="flex items-center justify-between bg-surface-sunken border border-border-subtle p-3 font-mono text-body-sm">
                        <code>npx reprieve gate --max-avalanche=0.75</code>
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => copyToClipboard('npx reprieve gate --max-avalanche=0.75', 'cmd-gate')}
                        >
                           {copied === 'cmd-gate' ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                        </Button>
                     </div>
                     <p className="text-caption text-text-muted">
                        Fail CI builds if code changes introduce cascading failure blast radius exceeding tolerance.
                     </p>
                  </div>
               </div>
            </DialogContent>
         </Dialog>

         {/* 2. Three-Graph Architecture Modal */}
         <Dialog open={activeDialog === 'three-graph'} onOpenChange={(open) => !open && setActiveDialog(null)}>
            <DialogContent className="max-w-2xl">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <Layers className="size-5 text-brand" />
                     Three-Graph Architecture Topology
                  </DialogTitle>
                  <DialogDescription>
                     Tenant isolation maintained across three distinct FalkorDB graph namespaces.
                  </DialogDescription>
               </DialogHeader>
               <div className="space-y-3 pt-3">
                  <div className="border border-border-subtle bg-surface p-3.5 space-y-1">
                     <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-brand font-semibold">platform</span>
                        <span className="text-text-muted">Global Namespace</span>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Users, workspaces, memberships, and notifications. Managed via Clerk auth webhooks.
                     </p>
                  </div>
                  <div className="border border-border-subtle bg-surface p-3.5 space-y-1">
                     <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-brand font-semibold">org_{wsId.slice(0, 8)}</span>
                        <span className="text-text-muted">Tenant Domain Graph</span>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Services, exceptions, controls, owners, and active Sentinel risk alerts.
                     </p>
                  </div>
                  <div className="border border-border-subtle bg-surface p-3.5 space-y-1">
                     <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-brand font-semibold">mem_{wsId.slice(0, 8)}</span>
                        <span className="text-text-muted">Agent Memory Graph</span>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Episodic Turns, Semantic Facts, Procedural Playbooks, and HandoffTasks for Steward copilot.
                     </p>
                  </div>
               </div>
            </DialogContent>
         </Dialog>

         {/* 3. 8 Detection Rules Modal */}
         <Dialog open={activeDialog === 'rules'} onOpenChange={(open) => !open && setActiveDialog(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <ShieldCheck className="size-5 text-brand" />
                     8 Core Architectural Detection Rules
                  </DialogTitle>
                  <DialogDescription>
                     Named, parameterized OpenCypher invariant detection queries executed continuously by Sentinel.
                  </DialogDescription>
               </DialogHeader>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  {[
                     { id: 'R1', name: 'Ghost Owner', desc: 'Active exception owned by an inactive person or person who left the org.' },
                     { id: 'R2', name: 'Expired Waiver', desc: 'Exception whose valid_until timestamp is in the past.' },
                     { id: 'R3', name: 'High Avalanche Reachability', desc: 'Cascading failure reachability (P = p₀ʰ) exceeding workspace tolerance.' },
                     { id: 'R4', name: 'Temporal Collision Window', desc: 'Three or more exceptions expiring in the same sliding temporal window.' },
                     { id: 'R5', name: 'Tier-1 Production Bypass', desc: 'Unapproved waiver applied to critical payment or auth tier.' },
                     { id: 'R6', name: 'Missing Compensating Control', desc: 'Exception granted without verified redundant control.' },
                     { id: 'R7', name: 'Orphaned Microservice', desc: 'Service node with dependencies but no owner team edge.' },
                     { id: 'R8', name: 'Blast Concentration', desc: 'Single team owning more than 60% of total system risk.' },
                  ].map((rule) => (
                     <div key={rule.id} className="border border-border-subtle bg-surface p-3">
                        <div className="flex items-center justify-between mb-1">
                           <span className="font-mono text-xs text-brand font-semibold">{rule.id}</span>
                           <span className="font-medium text-xs text-text-primary">{rule.name}</span>
                        </div>
                        <p className="text-caption text-text-secondary">{rule.desc}</p>
                     </div>
                  ))}
               </div>
            </DialogContent>
         </Dialog>

         {/* 4. Incident Post-Mortems Modal */}
         <Dialog open={activeDialog === 'post-mortems'} onOpenChange={(open) => !open && setActiveDialog(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <BookOpen className="size-5 text-brand" />
                     Incident Post-Mortems Archive
                  </DialogTitle>
                  <DialogDescription>
                     Real-world engineering disasters modeled as Reprieve graph failure paths, with verified links to official post-incident reviews (PIRs).
                  </DialogDescription>
               </DialogHeader>
               <div className="space-y-3 pt-3">
                  <div className="border border-border-subtle bg-surface p-3.5 flex flex-col justify-between gap-2">
                     <div className="flex items-start justify-between gap-2">
                        <div>
                           <span className="font-medium text-body-sm text-text-primary block">
                              CrowdStrike Channel File 291 (July 2024)
                           </span>
                           <span className="text-[11px] font-mono text-text-muted">
                              8.5M Systems Crashed · Intercepted by Rule R4 &amp; R8
                           </span>
                        </div>
                        <a
                           href="https://www.crowdstrike.com/falcon-content-update-remediation-and-guidance-hub/"
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium shrink-0 pt-0.5"
                        >
                           Official PIR Hub
                           <ExternalLink className="size-3" />
                        </a>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Content update bypassed canary rollout, triggering kernel panics; Reprieve pre-merge AST scanner forces phased rollout gates on root dependencies.
                     </p>
                  </div>

                  <div className="border border-border-subtle bg-surface p-3.5 flex flex-col justify-between gap-2">
                     <div className="flex items-start justify-between gap-2">
                        <div>
                           <span className="font-medium text-body-sm text-text-primary block">
                              Square / Block DNS &amp; Firewall Outage (September 2023)
                           </span>
                           <span className="text-[11px] font-mono text-text-muted">
                              24-Hour Checkout Outage · Intercepted by Rule R4 &amp; R6
                           </span>
                        </div>
                        <a
                           href="https://developer.squareup.com/blog/incident-summary-2023-09-07"
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium shrink-0 pt-0.5"
                        >
                           Official Engineering PIR
                           <ExternalLink className="size-3" />
                        </a>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Firewall update coincided with DNS upgrade, severing payment gateways; Reprieve detects compound infrastructure change collisions.
                     </p>
                  </div>

                  <div className="border border-border-subtle bg-surface p-3.5 flex flex-col justify-between gap-2">
                     <div className="flex items-start justify-between gap-2">
                        <div>
                           <span className="font-medium text-body-sm text-text-primary block">
                              Change Healthcare / UnitedHealth (February 2024)
                           </span>
                           <span className="text-[11px] font-mono text-text-muted">
                              $1.6B Claims Freeze · Intercepted by Rule R2 &amp; R7
                           </span>
                        </div>
                        <a
                           href="https://www.unitedhealthgroup.com/newsroom/2024/2024-02-22-change-healthcare-cybersecurity-incident.html"
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium shrink-0 pt-0.5"
                        >
                           Official Incident Release
                           <ExternalLink className="size-3" />
                        </a>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Legacy Citrix portal lacked MFA from an unmonitored merger exception; Reprieve Sentinel flags unowned assets and broken compensating controls.
                     </p>
                  </div>

                  <div className="border border-border-subtle bg-surface p-3.5 flex flex-col justify-between gap-2">
                     <div className="flex items-start justify-between gap-2">
                        <div>
                           <span className="font-medium text-body-sm text-text-primary block">
                              Knight Capital SMARS Deployment (August 2012)
                           </span>
                           <span className="text-[11px] font-mono text-text-muted">
                              $440M Lost in 45 Min · Intercepted by Rule R2 &amp; R5
                           </span>
                        </div>
                        <a
                           href="https://www.sec.gov/news/press-release/2013-222"
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium shrink-0 pt-0.5"
                        >
                           SEC Release No. 2013-222
                           <ExternalLink className="size-3" />
                        </a>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Dead code flag re-enabled dormant test code executing millions of unintended market orders; Reprieve halts retired flags bound to inactive owners.
                     </p>
                  </div>

                  <div className="border border-border-subtle bg-surface p-3.5 flex flex-col justify-between gap-2">
                     <div className="flex items-start justify-between gap-2">
                        <div>
                           <span className="font-medium text-body-sm text-text-primary block">
                              GitLab Database Outage (January 2017)
                           </span>
                           <span className="text-[11px] font-mono text-text-muted">
                              300GB Primary Desync · Intercepted by Rule R3 &amp; R7
                           </span>
                        </div>
                        <a
                           href="https://about.gitlab.com/blog/2017/02/01/gitlab-dot-com-database-incident/"
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium shrink-0 pt-0.5"
                        >
                           GitLab Incident Report
                           <ExternalLink className="size-3" />
                        </a>
                     </div>
                     <p className="text-caption text-text-secondary">
                        Backup verification temporarily disabled during replication lag; Reprieve flags zero compensating controls during degraded primary operations.
                     </p>
                  </div>
               </div>
            </DialogContent>
         </Dialog>

         {/* 5. GitHub Actions YAML Modal */}
         <Dialog open={activeDialog === 'github'} onOpenChange={(open) => !open && setActiveDialog(null)}>
            <DialogContent className="max-w-2xl">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <SiGithub className="size-5 text-brand" />
                     GitHub Actions Pre-Merge Gate
                  </DialogTitle>
                  <DialogDescription>
                     Drop this workflow file into your repository to enforce AST checks on every pull request.
                  </DialogDescription>
               </DialogHeader>
               <div className="space-y-3 pt-3">
                  <div className="relative bg-surface-sunken border border-border-subtle p-3 font-mono text-xs overflow-x-auto">
                     <pre className="text-text-secondary">
{`name: Reprieve Invariant Gate
on: [pull_request]

jobs:
  reprieve-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Zero-Login AST Scanner
        run: npx reprieve scan --strict
      - name: Verify Blast Radius Limit
        run: npx reprieve gate --max-avalanche=0.75`}
                     </pre>
                     <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 h-7 px-2"
                        onClick={() =>
                           copyToClipboard(
                              `name: Reprieve Invariant Gate\non: [pull_request]\n\njobs:\n  reprieve-gate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Run Zero-Login AST Scanner\n        run: npx reprieve scan --strict\n      - name: Verify Blast Radius Limit\n        run: npx reprieve gate --max-avalanche=0.75`,
                              'yaml'
                           )
                        }
                     >
                        {copied === 'yaml' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                     </Button>
                  </div>
               </div>
            </DialogContent>
         </Dialog>

         {/* 6. MCP Configuration Modal */}
         <Dialog open={activeDialog === 'mcp'} onOpenChange={(open) => !open && setActiveDialog(null)}>
            <DialogContent className="max-w-2xl">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <Cpu className="size-5 text-brand" />
                     Model Context Protocol (MCP) Configuration
                  </DialogTitle>
                  <DialogDescription>
                     Add Reprieve as an MCP server in Cursor, Claude Desktop, or Claude Code.
                  </DialogDescription>
               </DialogHeader>
               <div className="space-y-3 pt-3">
                  <div className="relative bg-surface-sunken border border-border-subtle p-3 font-mono text-xs overflow-x-auto">
                     <pre className="text-text-secondary">
{`{
  "mcpServers": {
    "reprieve": {
      "command": "npx",
      "args": [
        "-y",
        "reprieve",
        "mcp",
        "--workspace=${slug ?? 'your-workspace-slug'}"
      ]
    }
  }
}`}
                     </pre>
                     <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 h-7 px-2"
                        onClick={() =>
                           copyToClipboard(
                              JSON.stringify(
                                 {
                                    mcpServers: {
                                       reprieve: {
                                          command: 'npx',
                                          args: ['-y', 'reprieve', 'mcp', `--workspace=${slug ?? 'your-workspace-slug'}`],
                                       },
                                    },
                                 },
                                 null,
                                 2
                              ),
                              'mcp-json'
                           )
                        }
                     >
                        {copied === 'mcp-json' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                     </Button>
                  </div>
                  <p className="text-caption text-text-muted">
                     Includes 14 read-only graph reasoning tools: predict_avalanche, proof_path, what_if_as_of, list_alerts, and more.
                  </p>
               </div>
            </DialogContent>
         </Dialog>

         {/* 7. FalkorDB Cluster Info Modal */}
         <Dialog open={activeDialog === 'falkordb'} onOpenChange={(open) => !open && setActiveDialog(null)}>
            <DialogContent className="max-w-2xl">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <Database className="size-5 text-brand" />
                     FalkorDB Graph Cluster
                  </DialogTitle>
                  <DialogDescription>
                     Ultra-low latency C-native graph execution engine built for real-time Cypher traversal.
                  </DialogDescription>
               </DialogHeader>
               <div className="space-y-3 pt-3">
                  <div className="border border-border-subtle bg-surface p-3 space-y-1.5">
                     <div className="flex items-center justify-between text-caption font-mono">
                        <span className="text-text-muted">Engine Version:</span>
                        <span className="text-text-primary">FalkorDB v0.4+ / RedisGraph Protocol</span>
                     </div>
                     <div className="flex items-center justify-between text-caption font-mono">
                        <span className="text-text-muted">Execution Mode:</span>
                        <span className="text-emerald-400 font-semibold">In-Memory Sparse Matrices (GraphBLAS)</span>
                     </div>
                     <div className="flex items-center justify-between text-caption font-mono">
                        <span className="text-text-muted">Query Protocol:</span>
                        <span className="text-text-primary">Parameterized OpenCypher</span>
                     </div>
                     <div className="flex items-center justify-between text-caption font-mono">
                        <span className="text-text-muted">Namespace:</span>
                        <span className="text-text-primary">org_{wsId.slice(0, 8)} / mem_{wsId.slice(0, 8)}</span>
                     </div>
                  </div>
                  <p className="text-caption text-text-secondary">
                     All graph reasoning queries are pre-compiled and read-only. Modifications are only executed through human-reviewed proposed actions.
                  </p>
               </div>
            </DialogContent>
         </Dialog>
      </div>
   );
}

export { SettingsWorkspaceHub as Component };
export default SettingsWorkspaceHub;
