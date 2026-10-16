"use client";

import { useState, useRef } from "react";
import { 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Flame, 
  Network, 
  Pause, 
  Play, 
  ShieldAlert, 
  Terminal, 
  Volume2, 
  VolumeX, 
  Zap 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CLERK_ENABLED } from "@/lib/auth-config";
import { REPRIEVE_VIDEOS } from "@/lib/videos";

interface VslSectionProps {
  onBookCall: () => void;
}

const VSL_CHAPTERS = [
  {
    time: "0:00",
    seconds: 0,
    title: "The $2.4M Silent Killer",
    summary: "How an isolated #nosec token waiver in auth brought down payments and checkout on Black Friday.",
  },
  {
    time: "0:45",
    seconds: 45,
    title: "Who We Are & The Tech",
    summary: "Why traditional Jira tickets fail at systemic risk, and how our 3-graph FalkorDB engine maps living architecture.",
  },
  {
    time: "1:45",
    seconds: 105,
    title: "Live Pre-Merge Circuit Breaker",
    summary: "Zero-latency AST scanner catching temporary bypasses in GitHub PRs before they hit production.",
  },
  {
    time: "3:15",
    seconds: 195,
    title: "25+ Enterprise Case Studies",
    summary: "Northwind Pay, NeoBank UK, and Tier-1 Cloud Scale: $14.2M in cascading downtime prevented.",
  },
  {
    time: "4:30",
    seconds: 270,
    title: "What We Do For Your Business",
    summary: "15-minute architecture audit, zero production access required, and immediate risk mapping.",
  },
];

const VSL_SCRIPT = [
  {
    speaker: "Presenter (Principal Risk Architect)",
    timestamp: "0:00 - 0:45",
    text: "At 2:14 PM during Cyber Week, checkout crashed. The post-mortem did not find a zero-day vulnerability or an infrastructure outage. It found a single line of code: '#nosec' on line 42 of an authentication client. An engineer bypassed token renewal six months earlier to meet a sprint deadline. The ticket in Jira was marked 'Closed'. In the codebase, the risk remained active. When the upstream token expired under heavy load, it cascaded across four microservices in under 90 seconds, causing $2.4M in checkout downtime.",
  },
  {
    speaker: "Presenter",
    timestamp: "0:45 - 1:45",
    text: "Our team built INVARIX to address this structural blind spot. Traditional ticketing platforms treat tech debt as isolated, flat records. Modern cloud architectures are not flat; they are living directed graphs. INVARIX is a graph-reasoning risk engine built specifically for exception debt. Powered by FalkorDB, we model every temporary bypass, skipped test, and security waiver as an active directed edge with live expiration countdowns and cascading reachability.",
  },
  {
    speaker: "Presenter",
    timestamp: "1:45 - 3:15",
    text: "Developers do not need to open another dashboard. In terminal CLI and GitHub Actions, INVARIX parses repositories via AST scanning in under 15 milliseconds. When a pull request introduces an unmanaged bypass, our circuit breaker evaluates mathematical avalanche reachability (P = p0^h) across your entire mesh. If that bypass endangers downstream tier-1 services, the CI check blocks the merge and displays the exact shortest proof path directly in GitHub.",
  },
  {
    speaker: "Presenter",
    timestamp: "3:15 - 4:30",
    text: "We have deployed this across 25 production microservice architectures. At Northwind Pay, a fintech processing millions in daily transactions, INVARIX detected four simultaneous waiver expirations scheduled to collide during peak trading, preventing an estimated $1.8M outage. At NeoBank UK, our agent uncovered 42 orphaned security waivers whose original authors had left the company, giving their SRE team full audit compliance in 14 seconds.",
  },
  {
    speaker: "Presenter",
    timestamp: "4:30 - 5:24",
    text: "This enables engineering teams to ship on schedule without unmonitored production risk. We require zero production credentials or database connections; we analyze code metadata and dependency call graphs. Below this video, you can book a 15-minute architecture audit with our engineering team, or launch our interactive sandbox.",
  },
];

export function VslSection({ onBookCall }: VslSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = REPRIEVE_VIDEOS.HERO_SHOWCASE;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        void videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const jumpToChapter = (seconds: number, index: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds % (video.durationSeconds || 40);
      void videoRef.current.play();
      setIsPlaying(true);
      setActiveChapter(index);
    }
  };

  return (
    <section id="vsl" aria-labelledby="vsl-heading" className="relative mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-20 scroll-mt-20">
      {/* Background Volumetric Ambience */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[450px] w-[800px] rounded-full bg-brand/5 blur-[120px]" />
      </div>

      <div className="space-y-8 text-center max-w-4xl mx-auto">
        {/* Headline & Subheadline */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#121316] px-3 py-1 font-mono text-[11px] font-medium tracking-[0.12em] text-zinc-400">
            <span className="size-1.5 rounded-full bg-zinc-400" />
            <span>TECHNICAL VIDEO SALES LETTER · 5:24 RUNTIME</span>
          </div>
          <h2 id="vsl-heading" className="text-display-lg sm:text-display-xl font-display font-bold tracking-tight text-text-primary">
            How one unmonitored code shortcut caused a $2.4M outage.
          </h2>
          <p className="text-body-lg text-text-secondary max-w-3xl mx-auto leading-relaxed">
            Watch the technical walkthrough to see how deterministic graph reasoning models living architecture and intercepts multi-hop cascading failures before merge.
          </p>
        </div>

        {/* VSL Video Container - Double-Bezel Hardware Architecture */}
        <div className="relative rounded-2xl border border-white/[0.12] bg-[#0d0e12] p-1.5 shadow-2xl ring-1 ring-white/10 text-left">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#07080a]">
            {/* Top Control Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#101116] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-md bg-red-500/10 text-red-400 font-bold font-mono text-[11px] border border-red-500/20">
                  VSL
                </span>
                <div>
                  <span className="text-body-sm font-semibold text-text-primary">Technical Sales Briefing &amp; Architecture Walkthrough</span>
                  <span className="ml-2 hidden text-caption text-text-muted sm:inline">5:24 Runtime · 1080p 60FPS</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                  className="h-8 gap-1.5 px-3 text-[12px] font-medium border-white/10 bg-white/[0.03]"
                >
                  {isMuted ? <VolumeX className="size-3.5 text-text-muted" /> : <Volume2 className="size-3.5 text-brand" />}
                  <span>{isMuted ? "Unmute Audio" : "Mute"}</span>
                </Button>
                <span className="rounded border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-red-400">
                  Case Study
                </span>
              </div>
            </div>

            {/* Video Player Display */}
            <div className="relative aspect-video w-full overflow-hidden bg-black group">
              <video
                ref={videoRef}
                playsInline
                loop
                muted={isMuted}
                controls
                src={video.path}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="size-full object-cover"
              />

              {/* Big Center Play Overlay when paused */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label="Play Video Sales Letter"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all hover:bg-black/30"
                >
                  <div className="flex size-20 items-center justify-center rounded-full bg-brand text-white shadow-2xl transition-transform hover:scale-105 active:scale-95">
                    <Play className="size-8 fill-current translate-x-0.5" />
                  </div>
                </button>
              )}
            </div>

            {/* Chapter Scrubber Bar */}
            <div className="border-t border-white/[0.08] bg-[#0c0d10] p-3 sm:p-4">
              <div className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
                <Clock className="size-3.5 text-brand" />
                <span>Jump to Section in VSL (5 Acts):</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {VSL_CHAPTERS.map((ch, idx) => (
                  <button
                    key={ch.time}
                    type="button"
                    onClick={() => jumpToChapter(ch.seconds, idx)}
                    className={`rounded-lg border p-2 text-left transition-all text-caption ${
                      activeChapter === idx
                        ? "border-brand bg-brand-soft/40 shadow-xs"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="font-mono text-[11px] text-brand font-bold">{ch.time}</div>
                    <div className="font-semibold text-text-primary line-clamp-1">{ch.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Expandable VSL Transcript & Proofs */}
            <div className="border-t border-white/[0.08] bg-[#090a0d] p-4">
              <button
                type="button"
                onClick={() => setTranscriptOpen(!transcriptOpen)}
                className="flex w-full items-center justify-between text-body-sm font-semibold text-text-primary hover:text-brand transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="size-4 text-brand" />
                  Read Full Video Sales Letter Script &amp; Technical Evidence
                </span>
                {transcriptOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

            {transcriptOpen && (
              <div className="mt-4 space-y-4 pt-4 border-t border-border-subtle text-body-sm text-text-secondary">
                {VSL_SCRIPT.map((block) => (
                  <div key={block.timestamp} className="rounded-lg bg-surface-subtle p-3.5 border border-border-subtle space-y-1">
                    <div className="flex items-center justify-between font-mono text-caption">
                      <span className="font-semibold text-text-primary">{block.speaker}</span>
                      <span className="text-brand font-bold">{block.timestamp}</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">{block.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* PRIMARY CALL-TO-ACTION CONTAINER DIRECTLY UNDER VSL */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d10] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-2">
            <h3 className="text-h2 sm:text-h2 font-display font-bold text-text-primary">
              Ready to See Where Your Hidden Architecture Risk Concentrates?
            </h3>
            <p className="text-body-base text-text-secondary max-w-2xl mx-auto">
              Book a 15-minute confidential architecture audit with our graph engineering team, or launch our live interactive Northwind Pay environment with 0 registration.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={onBookCall}
              className="gap-2 font-bold px-8 py-6 text-body-base shadow-lg hover:shadow-brand/25 transition-all"
            >
              <Calendar className="size-5" />
              Book a 15-Minute Architecture Audit
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 px-6 py-6 text-body-base border-border-strong hover:bg-surface-elevated"
            >
              <Link href="/w/northwind-pay/home">
                Launch Live Northwind Pay Demo
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Microcopy & Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-caption text-text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-brand" /> Zero production access required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-brand" /> 100% deterministic graph proofs
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-brand" /> Confidential NDA protection
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
