"use client";

import { useEffect, useId, useState } from "react";

/**
 * Broad, graceful tributaries entering from the left and converging into a
 * single unified river. Deliberately unlabeled: this reads purely as motion
 * and composition, not as an annotated diagram.
 */
const STREAMS = [
  { id: "s1", d: "M0,46 C 260,46 420,140 640,206", width: 1.5, opacity: 0.28 },
  { id: "s2", d: "M0,112 C 260,112 420,166 640,216", width: 2, opacity: 0.4 },
  { id: "s3", d: "M0,178 C 260,178 420,196 640,226", width: 2.5, opacity: 0.55 },
  { id: "s4", d: "M0,282 C 300,282 440,252 640,236", width: 2.5, opacity: 0.55 },
  { id: "s5", d: "M0,348 C 300,348 460,266 640,246", width: 2, opacity: 0.4 },
  { id: "s6", d: "M0,414 C 320,414 480,278 640,256", width: 1.5, opacity: 0.28 },
] as const;

const MAIN_RIVER_D = "M640,231 C 820,248 1000,214 1200,231";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!("matchMedia" in window)) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}

type FlowParticlesProps = {
  pathId: string;
  count: number;
  baseDuration: number;
  size: number;
  color: string;
  glowFilterId: string;
  reducedMotion: boolean;
};

function FlowParticles({ pathId, count, baseDuration, size, color, glowFilterId, reducedMotion }: FlowParticlesProps) {
  if (reducedMotion) return null;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const dur = baseDuration + index * 1.6;
        const begin = -(index * (dur / count)) - index * 2.1;
        return (
          <circle key={index} r={size} fill={color} filter={`url(#${glowFilterId})`} opacity={0}>
            <animateMotion begin={`${begin}s`} calcMode="linear" dur={`${dur}s`} repeatCount="indefinite">
              <mpath xlinkHref={`#${pathId}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              begin={`${begin}s`}
              dur={`${dur}s`}
              keyTimes="0;0.1;0.9;1"
              repeatCount="indefinite"
              values="0;0.85;0.85;0"
            />
          </circle>
        );
      })}
    </>
  );
}

export function RiverOfMinistries() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reducedMotion = usePrefersReducedMotion();
  const glowFilterId = `${uid}-glow`;
  const riverGlowFilterId = `${uid}-river-glow`;
  const riverGradientId = `${uid}-river-gradient`;
  const shimmerGradientId = `${uid}-shimmer`;

  return (
    <figure>
      <svg
        aria-labelledby={`${uid}-title`}
        className="w-full"
        role="img"
        viewBox="0 0 1200 480"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id={`${uid}-title`}>
          Many separate streams flowing together into one unified river of shared mission.
        </title>

        <defs>
          <filter height="300%" id={glowFilterId} width="300%" x="-100%" y="-100%">
            <feGaussianBlur result="blur" stdDeviation="2" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter height="300%" id={riverGlowFilterId} width="300%" x="-100%" y="-100%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <linearGradient id={riverGradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#C2A14E" stopOpacity="0.5" />
            <stop offset="1" stopColor="#E9CE8B" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={shimmerGradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#F1D89A" stopOpacity="0" />
            <stop offset="0.5" stopColor="#F1D89A" stopOpacity="0.32" />
            <stop offset="1" stopColor="#F1D89A" stopOpacity="0" />
            {!reducedMotion ? (
              <animateTransform
                attributeName="gradientTransform"
                dur="7s"
                repeatCount="indefinite"
                type="translate"
                values="-1 0; 1 0"
              />
            ) : null}
          </linearGradient>
        </defs>

        {/* Invisible geometry paths used as motion guides for particles */}
        {STREAMS.map((stream) => (
          <path d={stream.d} fill="none" id={`${uid}-${stream.id}`} key={stream.id} stroke="none" />
        ))}
        <path d={MAIN_RIVER_D} fill="none" id={`${uid}-river`} stroke="none" />

        {/* Tributaries: broad, graceful lines entering from the left */}
        <g>
          {STREAMS.map((stream) => (
            <path
              d={stream.d}
              fill="none"
              key={stream.id}
              stroke="#C2A14E"
              strokeLinecap="round"
              strokeOpacity={stream.opacity}
              strokeWidth={stream.width}
            />
          ))}
        </g>

        {/* Main river: soft glow layer beneath the crisp stroke */}
        <path
          d={MAIN_RIVER_D}
          fill="none"
          filter={`url(#${riverGlowFilterId})`}
          opacity="0.4"
          stroke={`url(#${riverGradientId})`}
          strokeLinecap="round"
          strokeWidth="20"
        />
        <path
          d={MAIN_RIVER_D}
          fill="none"
          stroke={`url(#${riverGradientId})`}
          strokeLinecap="round"
          strokeWidth="8"
        />
        <path
          d={MAIN_RIVER_D}
          fill="none"
          stroke={`url(#${shimmerGradientId})`}
          strokeLinecap="round"
          strokeWidth="8"
        />

        {/* Flowing, illuminated particles: subtle, slow, unhurried */}
        {STREAMS.map((stream) => (
          <FlowParticles
            baseDuration={10}
            color="#E9CE8B"
            count={1}
            glowFilterId={glowFilterId}
            key={stream.id}
            pathId={`${uid}-${stream.id}`}
            reducedMotion={reducedMotion}
            size={2.2}
          />
        ))}
        <FlowParticles
          baseDuration={7.5}
          color="#F8E7B8"
          count={2}
          glowFilterId={glowFilterId}
          pathId={`${uid}-river`}
          reducedMotion={reducedMotion}
          size={3}
        />
      </svg>
    </figure>
  );
}
