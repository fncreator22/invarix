'use client';

import React, { useRef, forwardRef } from 'react';
import { ReactLenis } from 'lenis/react';
import { useTransform, motion, useScroll, type MotionValue } from 'motion/react';
import { cn } from '@/lib/utils';
import { ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';

export interface ProjectData {
  title: string;
  description: string;
  link: string;
  color: string;
  id?: string;
  target?: string;
  date?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceDomain?: string;
  lossFigure?: string;
  lossColor?: string;
  whatHappened?: string;
  withInvarix?: string;
  withINVARIX?: string;
  rules?: string[];
  articleImage?: string;
  borderClass?: string;
  glowGradient?: string;
}

export interface CardProps {
  i: number;
  title: string;
  description: string;
  url: string;
  color: string;
  progress: MotionValue<number>;
  range: [number, number];
  targetScale: number;
  project?: ProjectData;
  children?: React.ReactNode;
}

export const Card = ({
  i,
  title,
  description,
  url,
  color,
  progress,
  range,
  targetScale,
  project,
  children,
}: CardProps) => {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start end', 'start start'],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);

  const hasRichData = Boolean(project?.lossFigure || project?.rules || project?.whatHappened);
  const activeUrl = project?.sourceUrl || url || '#';
  const displayImage = project?.articleImage || url;

  return (
    <div
      ref={container}
      className="sticky top-20 sm:top-24 lg:top-28 flex items-start justify-center pb-8 sm:pb-12"
    >
      <motion.div
        style={{
          backgroundColor: color,
          scale,
          top: `${i * 20}px`,
        }}
        className={cn(
          "flex flex-col relative w-full rounded-none p-4 sm:p-6 lg:p-8 origin-top",
          "border shadow-2xl backdrop-blur-2xl transition-colors duration-300",
          project?.borderClass || "border-white/10"
        )}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 rounded-none bg-gradient-to-br opacity-40",
            project?.glowGradient || "from-white/5 via-transparent to-transparent"
          )}
        />

        {children ? (
          children
        ) : (
          <>
            {/* Top Header of Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 sm:pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-none border border-white/15 bg-white/[0.04] font-mono text-xs font-bold text-zinc-300">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="text-base sm:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                    {project?.target || title}
                    {project?.date && (
                      <span className="font-mono text-xs font-normal text-zinc-400">
                        ({project.date})
                      </span>
                    )}
                  </h3>
                  <span className="font-mono text-[10.5px] sm:text-[11px] text-zinc-400">
                    Incident Post-Mortem · Root Cause Analysis
                  </span>
                </div>
              </div>

              {/* Alarmed Loss / Catastrophe Impact Badge */}
              {project?.lossFigure && (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider shadow-sm",
                      project.id === "change-healthcare"
                        ? "border border-amber-500/40 bg-amber-500/10 text-amber-400"
                        : "border border-red-500/40 bg-red-500/10 text-red-400"
                    )}
                  >
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{project.lossFigure}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Card Body: Split Grid */}
            <div className="flex flex-col lg:flex-row h-full mt-3.5 sm:mt-5 gap-3.5 lg:gap-8 items-stretch">
              {/* Left Textual Column */}
              <div className="w-full lg:w-[46%] flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  {hasRichData ? (
                    <>
                      {/* The Root Failure */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="size-3 text-red-400" aria-hidden="true" />
                          <span className="font-mono text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-red-400">
                            The Root Failure
                          </span>
                        </div>
                        <p className="text-[12px] sm:text-[13.5px] text-zinc-300 leading-snug sm:leading-relaxed">
                          {project?.whatHappened || description}
                        </p>
                      </div>

                      {/* With INVARIX */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="size-3 text-brand" aria-hidden="true" />
                          <span className="font-mono text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-brand">
                            How INVARIX Prevents This
                          </span>
                        </div>
                        <p className="text-[12px] sm:text-[13.5px] text-zinc-300 leading-snug sm:leading-relaxed">
                          {project?.withInvarix || project?.withINVARIX}
                        </p>
                      </div>

                      {/* Governing Rules */}
                      {project?.rules && project.rules.length > 0 && (
                        <div className="space-y-1 pt-0.5">
                          <span className="block font-mono text-[9px] sm:text-[9.5px] uppercase text-zinc-400 font-semibold tracking-wider">
                            Governing Graph Rules
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {project.rules.map((rule) => (
                              <span
                                key={rule}
                                className="rounded-none border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[10px] sm:text-[10.5px] font-medium text-brand"
                              >
                                {rule}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{description}</p>
                  )}
                </div>

                {/* Source Link Bar */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-zinc-400 hover:text-white transition-colors group/link"
                  >
                    <span>{project?.sourceLabel || 'View official post-mortem'}</span>
                    <ExternalLink className="size-3 text-zinc-400 group-hover/link:text-white transition-colors" />
                  </a>
                </div>
              </div>

              {/* Right Image Column: Clickable Authentic Article Screenshot */}
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open official article: ${project?.target || title}`}
                className="group relative block w-full lg:w-[54%] h-44 sm:h-56 lg:h-auto lg:min-h-[260px] rounded-none overflow-hidden border border-white/10 bg-[#07080c] cursor-pointer shrink-0"
              >
                <motion.div
                  className="w-full h-full relative"
                  style={{ scale: imageScale }}
                >
                  <img
                    src={displayImage}
                    alt={project?.target || title}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </motion.div>

                {/* Transparent Subtle "View Article" Button Centered on Hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="inline-flex items-center gap-2 rounded-none border border-white/50 bg-black/40 backdrop-blur-xs px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-white shadow-lg">
                    <span>View Article</span>
                    <ExternalLink className="size-3.5 text-zinc-200" />
                  </span>
                </div>
              </a>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export interface StackingCardProps {
  projects: ProjectData[];
  className?: string;
  useLenis?: boolean;
}

export const StackingCard = forwardRef<HTMLDivElement, StackingCardProps>(
  ({ projects, className, useLenis = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
      target: containerRef,
      offset: ['start start', 'end end'],
    });

    const content = (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        {projects.map((project, i) => {
          const targetScale = 1 - (projects.length - i) * 0.04;
          return (
            <Card
              key={project.id || `p_${i}`}
              i={i}
              url={project.link}
              title={project.title}
              color={project.color}
              description={project.description}
              progress={scrollYProgress}
              range={[i * 0.25, 1]}
              targetScale={targetScale}
              project={project}
            />
          );
        })}
      </div>
    );

    if (useLenis) {
      return <ReactLenis root>{content}</ReactLenis>;
    }

    return content;
  }
);

StackingCard.displayName = 'StackingCard';

export const Component = StackingCard;
export default StackingCard;

// Demo support matching template
export const DemoOne = () => {
  const sampleProjects: ProjectData[] = [
    {
      title: 'Matthias Leidinger',
      description: 'Originally hailing from Austria, Berlin-based photographer Matthias Leindinger.',
      link: 'https://cdn.21st.dev/assets/mirror/68/688e3a84bc3a2949290945455c7927eae33b1bcf702e14ff82f32620918b7f44.jpg',
      color: '#0c0e15',
    },
    {
      title: 'Clément Chapillon',
      description: 'This is a story on the border between reality and imaginary.',
      link: 'https://cdn.21st.dev/assets/mirror/a1/a161a794d3ce6a559a66480d2efb6381f5014557e7fd54c40d305efb07dc9b0a.jpg',
      color: '#0d0f19',
    },
  ];

  return <StackingCard projects={sampleProjects} />;
};
