"use client";

import { useEffect, useId, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const PRIMARY_TRIBUTARIES = [
  {
    d: "M8,66 C 230,66 400,150 616,214",
    id: "ktg",
    label: "Kitchen Table Gospel",
    labelX: 8,
    labelY: 48,
    sublabel: "Direct discipleship, one table at a time",
  },
  {
    d: "M8,158 C 230,158 400,196 616,230",
    id: "dos",
    label: "DOS",
    labelX: 8,
    labelY: 140,
    sublabel: "The Discipleship Operating System",
  },
] as const;

const PARTNER_TRIBUTARIES = [
  {
    d: "M132,434 C 372,434 556,322 764,272",
    id: "mor",
    label: "Ministry of Reconciliation",
    labelX: 132,
    labelY: 452,
  },
  {
    d: "M84,486 C 372,486 600,344 826,282",
    id: "churches",
    label: "Local Churches",
    labelX: 84,
    labelY: 504,
  },
  {
    d: "M196,392 C 420,392 616,320 866,286",
    id: "aligned",
    label: "Aligned Ministries",
    labelX: 196,
    labelY: 410,
  },
] as const;

const MAIN_RIVER_D = "M616,222 C 820,244 1000,262 1176,270";

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
  baseDuration: number;
  color: string;
  count: number;
  glowFilterId: string;
  pathId: string;
  reducedMotion: boolean;
  size: number;
};

function FlowParticles({ baseDuration, color, count, glowFilterId, pathId, reducedMotion, size }: FlowParticlesProps) {
  if (reducedMotion) return null;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const dur = baseDuration + index * 0.9;
        const begin = -(index * (dur / count)) - index * 1.4;
        return (
          <circle key={index} r={size} fill={color} filter={`url(#${glowFilterId})`} opacity={0}>
            <animateMotion begin={`${begin}s`} calcMode="linear" dur={`${dur}s`} repeatCount="indefinite">
              <mpath href={`#${pathId}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              begin={`${begin}s`}
              dur={`${dur}s`}
              keyTimes="0;0.08;0.9;1"
              repeatCount="indefinite"
              values="0;1;1;0"
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
  const orbGradientId = `${uid}-orb`;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {PRIMARY_TRIBUTARIES.map((item) => (
          <div
            key={item.id}
            className="border border-usam-gold/35 bg-[rgba(194,161,78,0.08)] px-4 py-2.5"
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-usam-gold"
              style={{ fontFamily: font.rajdhani }}
            >
              {item.label}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">{item.sublabel}</p>
          </div>
        ))}
      </div>

      <figure className="mt-8">
        <svg
          aria-labelledby={`${uid}-title`}
          className="w-full"
          role="img"
          viewBox="0 0 1200 520"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title id={`${uid}-title`}>
            Kitchen Table Gospel and DOS flowing together as the primary river of USA Missionaries, joined
            downstream by strategic partner ministries including Ministry of Reconciliation, local churches, and
            aligned ministries.
          </title>

          <defs>
            <filter height="300%" id={glowFilterId} width="300%" x="-100%" y="-100%">
              <feGaussianBlur result="blur" stdDeviation="2.2" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter height="300%" id={riverGlowFilterId} width="300%" x="-100%" y="-100%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <linearGradient id={riverGradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#C2A14E" stopOpacity="0.45" />
              <stop offset="0.55" stopColor="#C2A14E" stopOpacity="0.85" />
              <stop offset="1" stopColor="#F1D89A" stopOpacity="1" />
            </linearGradient>
            <linearGradient id={shimmerGradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#F1D89A" stopOpacity="0" />
              <stop offset="0.5" stopColor="#F1D89A" stopOpacity="0.55" />
              <stop offset="1" stopColor="#F1D89A" stopOpacity="0" />
              {!reducedMotion ? (
                <animateTransform
                  attributeName="gradientTransform"
                  dur="4.5s"
                  repeatCount="indefinite"
                  type="translate"
                  values="-1 0; 1 0"
                />
              ) : null}
            </linearGradient>
            <radialGradient id={orbGradientId}>
              <stop offset="0" stopColor="#F1D89A" stopOpacity="0.9" />
              <stop offset="1" stopColor="#F1D89A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {[...PRIMARY_TRIBUTARIES, ...PARTNER_TRIBUTARIES].map((item) => (
            <path d={item.d} fill="none" id={`${uid}-${item.id}`} key={item.id} stroke="none" />
          ))}
          <path d={MAIN_RIVER_D} fill="none" id={`${uid}-river`} stroke="none" />

          <g opacity="0.55">
            {PARTNER_TRIBUTARIES.map((item) => (
              <path
                d={item.d}
                fill="none"
                key={item.id}
                stroke="#C2A14E"
                strokeLinecap="round"
                strokeWidth="2"
              />
            ))}
          </g>

          <g>
            {PRIMARY_TRIBUTARIES.map((item) => (
              <path
                d={item.d}
                fill="none"
                key={item.id}
                stroke="#C2A14E"
                strokeLinecap="round"
                strokeOpacity="0.85"
                strokeWidth="3.5"
              />
            ))}
          </g>

          <path
            d={MAIN_RIVER_D}
            fill="none"
            filter={`url(#${riverGlowFilterId})`}
            opacity="0.55"
            stroke={`url(#${riverGradientId})`}
            strokeLinecap="round"
            strokeWidth="22"
          />
          <path
            d={MAIN_RIVER_D}
            fill="none"
            stroke={`url(#${riverGradientId})`}
            strokeLinecap="round"
            strokeWidth="9"
          />
          <path
            d={MAIN_RIVER_D}
            fill="none"
            stroke={`url(#${shimmerGradientId})`}
            strokeLinecap="round"
            strokeWidth="9"
          />

          <circle cx="1176" cy="270" fill={`url(#${orbGradientId})`} r="46" />
          <circle cx="1176" cy="270" fill="#F1D89A" r="4" />

          <FlowParticles
            baseDuration={5.5}
            color="#F1D89A"
            count={3}
            glowFilterId={glowFilterId}
            pathId={`${uid}-ktg`}
            reducedMotion={reducedMotion}
            size={3.2}
          />
          <FlowParticles
            baseDuration={6.2}
            color="#F1D89A"
            count={3}
            glowFilterId={glowFilterId}
            pathId={`${uid}-dos`}
            reducedMotion={reducedMotion}
            size={3.2}
          />
          {PARTNER_TRIBUTARIES.map((item) => (
            <FlowParticles
              baseDuration={7}
              color="#C2A14E"
              count={2}
              glowFilterId={glowFilterId}
              key={item.id}
              pathId={`${uid}-${item.id}`}
              reducedMotion={reducedMotion}
              size={2.4}
            />
          ))}
          <FlowParticles
            baseDuration={4.5}
            color="#FFF7E4"
            count={5}
            glowFilterId={glowFilterId}
            pathId={`${uid}-river`}
            reducedMotion={reducedMotion}
            size={3.6}
          />

          <g className="hidden sm:block" fill="#8F7433" fontFamily="'Rajdhani', sans-serif" fontSize="12" letterSpacing="1.6">
            {PRIMARY_TRIBUTARIES.map((item) => (
              <text key={item.id} x={item.labelX} y={item.labelY}>
                {item.label.toUpperCase()}
              </text>
            ))}
            {PARTNER_TRIBUTARIES.map((item) => (
              <text fillOpacity="0.75" fontSize="10.5" key={item.id} x={item.labelX} y={item.labelY}>
                {item.label.toUpperCase()}
              </text>
            ))}
            <text fill="#F1D89A" textAnchor="end" x="1176" y="248">
              ONE RIVER / ONE MISSION
            </text>
          </g>
        </svg>

        <figcaption
          className="mt-3 flex flex-wrap justify-between gap-3 border-t border-stone-800 pt-3 text-[11px] uppercase tracking-[0.18em] text-stone-500"
          style={{ fontFamily: font.rajdhani }}
        >
          <span>Fig. 01: The River of Ministries</span>
          <span>Collaboration, not acquisition</span>
        </figcaption>
      </figure>

      <div className="mt-8">
        <p
          className="text-[10px] uppercase tracking-[0.24em] text-stone-500"
          style={{ fontFamily: font.rajdhani }}
        >
          Strategic Partner Ministries
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {PARTNER_TRIBUTARIES.map((item) => (
            <span
              className="border border-stone-800 bg-black/40 px-3.5 py-1.5 text-xs text-stone-400"
              key={item.id}
              style={{ fontFamily: font.rajdhani }}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
