"use client";

import { Play, Pause, RotateCcw, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SimulationForecastOut } from "@/lib/types";

interface TemporalSliderProps {
  horizonDays: number;
  onHorizonChange: (days: number | ((prev: number) => number)) => void;
  forecast?: SimulationForecastOut | null;
  isLoading?: boolean;
}

const PRESETS = [
  { label: "Now", days: 0 },
  { label: "+7d", days: 7 },
  { label: "+30d", days: 30 },
  { label: "+90d", days: 90 },
];

export function TemporalSlider({
  horizonDays,
  onHorizonChange,
  forecast,
  isLoading,
}: TemporalSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onHorizonChange((prev: number) => {
        const next = Math.min(90, prev + 1);
        if (next >= 90) {
          setTimeout(() => setIsPlaying(false), 0);
        }
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, onHorizonChange]);

  const topSPOF = forecast?.avalanche_centrality?.[0];
  const collisionCount = forecast?.temporal_collisions?.length ?? 0;

  return (
    <div className="flex flex-col gap-2.5 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Calendar className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Forecast Horizon
          </span>
          <Badge variant="outline" className="font-mono text-xs tabular-nums px-1.5 py-0 shrink-0">
            +{horizonDays}d
          </Badge>
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-brand font-medium shrink-0">
              <span className="size-1.5 rounded-full bg-brand" />
              Simulating…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center rounded-md border border-border-subtle bg-surface-subtle p-0.5">
            {PRESETS.map((p) => (
              <Button
                key={p.days}
                variant={horizonDays === p.days ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-1.5 text-[11px] font-medium transition-colors",
                  horizonDays === p.days && "bg-brand text-text-on-brand shadow-xs hover:bg-brand hover:text-text-on-brand",
                )}
                onClick={() => {
                  setIsPlaying(false);
                  onHorizonChange(p.days);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Button
            variant={isPlaying ? "default" : "outline"}
            size="icon"
            className="size-6 text-foreground shadow-xs shrink-0"
            onClick={() => setIsPlaying((p) => !p)}
            title={isPlaying ? "Pause simulation" : "Play simulation timeline"}
          >
            {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 fill-current ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => {
              setIsPlaying(false);
              onHorizonChange(0);
            }}
            title="Reset to present day"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-1">
        <Slider
          value={[horizonDays]}
          min={0}
          max={90}
          step={1}
          onValueChange={([val]) => {
            setIsPlaying(false);
            onHorizonChange(val);
          }}
          className="w-full cursor-pointer"
        />
      </div>

      {forecast && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle/80 pt-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            {topSPOF && (
              <div className="flex items-center gap-1 min-w-0">
                <TrendingUp className="size-3 text-amber-500 shrink-0" />
                <span className="truncate">
                  Top SPOF: <strong className="text-foreground">{topSPOF.service_name}</strong> ({topSPOF.score})
                </span>
              </div>
            )}
            {collisionCount > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <AlertTriangle className="size-3 text-rose-500 shrink-0" />
                <span>
                  <strong className="text-rose-500">{collisionCount}</strong> Collision{collisionCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/70 shrink-0 ml-auto">
            {forecast.execution_time_ms.toFixed(1)}ms
          </span>
        </div>
      )}
    </div>
  );
}
