"use client";

import { useState, useRef } from "react";
import { Film, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REPRIEVE_VIDEOS } from "@/lib/videos";

export function HeroShowreelSection() {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = REPRIEVE_VIDEOS.HERO_SHOWCASE;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section aria-label="Product Film" className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-16">
      <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl ring-1 ring-white/5">
        {/* Top header bar */}
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface-raised px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Film className="size-4" />
            </span>
            <div>
              <span className="text-body-sm font-semibold text-text-primary">{video.title}</span>
              <span className="ml-2 hidden text-caption text-text-muted sm:inline">{video.subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMute}
              className="h-7 gap-1.5 px-2.5 text-[12px] font-medium"
            >
              {isMuted ? <VolumeX className="size-3.5 text-text-muted" /> : <Volume2 className="size-3.5 text-brand" />}
              <span>{isMuted ? "Unmute Soundtrack" : "Mute"}</span>
            </Button>
            <span className="rounded-full border border-proof/30 bg-proof-soft px-2.5 py-0.5 font-mono text-[11px] font-medium text-proof">
              1080p · 30 FPS · Bento & FalkorDB
            </span>
          </div>
        </div>

        {/* Video container */}
        <div className="relative aspect-video w-full overflow-hidden bg-[#F8F9FA]">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="size-full object-cover"
            src={video.path}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

        {/* Bottom meta bar */}
        <div className="flex flex-col gap-2 border-t border-border-subtle bg-sunken px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-caption text-text-secondary">
            {video.acts.map((act, i) => (
              <span key={act.act}>
                {i > 0 && " → "}
                <strong className="text-text-primary">Act {act.act}:</strong> {act.title}
              </span>
            ))}
          </p>
          <span className="text-caption font-mono text-text-muted">
            Rendered with motionmaxxing DevTools + ffmpeg runtime
          </span>
        </div>
      </div>
    </section>
  );
}
