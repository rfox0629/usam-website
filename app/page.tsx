"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { PrimaryNav } from "../components/PrimaryNav";
const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function SectionHeading({ overline, headline, children, align = "center" }: {
  overline?: string; headline: React.ReactNode; children?: React.ReactNode; align?: string;
}) {
  return (
    <div className={`${align === "left" ? "text-left" : "text-center"} max-w-3xl ${align === "center" ? "mx-auto" : ""}`}>
      {overline && <p className="tactical-label mb-4 uppercase" style={{ fontFamily: font.rajdhani }}>{overline}</p>}
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-stone-100 leading-tight" style={{ fontFamily: font.oswald }}>{headline}</h2>
      {children && <div className="mt-5 text-stone-400 text-base md:text-lg leading-relaxed">{children}</div>}
    </div>
  );
}

function CTAButton({
  children,
  variant = "primary",
  href,
  onClick,
}: {
  children: React.ReactNode;
  variant?: string;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const cls = variant === "primary"
    ? "bg-stone-100 text-stone-950 hover:bg-amber-200"
    : "border border-stone-600 text-stone-400 hover:border-stone-400 hover:text-stone-200";
  const className = `inline-block px-7 py-3 text-sm tracking-[0.2em] uppercase transition-all duration-300 cursor-pointer ${cls}`;
  const style = { fontFamily: font.rajdhani, fontWeight: 600 } as const;

  if (href) {
    return <Link href={href} className={className} style={style}>{children}</Link>;
  }

  return <button type="button" onClick={onClick} className={className} style={style}>{children}</button>;
}

function AnimCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        let t0 = 0;
        const go = (ts: number) => {
          if (!t0) t0 = ts;
          const p = Math.min((ts - t0) / 2000, 1);
          setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(go);
        };
        requestAnimationFrame(go);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="transition-all duration-700"
      style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(32px)", transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function formatPopulation(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.floor(value));
}

function WorldMap() {
  const nodes: Array<[number, number]> = [[280,190],[600,135],[590,300],[760,160],[950,410],[310,400],[220,170],[320,200],[640,250],[860,180],[700,130],[580,380]];
  const routes: Array<[number, number, number, number]> = [[280,190,600,135],[280,190,590,300],[280,190,760,160],[280,190,310,400]];
  return (
    <svg viewBox="0 0 1200 600" className="w-full h-full" style={{ opacity: 0.12 }}>
      <defs>
        <radialGradient id="ug" cx="28%" cy="42%" r="25%">
          <stop offset="0%" stopColor="#d4a054" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#d4a054" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d="M160,120 Q200,90 280,95 Q340,100 370,140 Q380,170 360,200 Q340,230 310,250 Q290,260 270,280 Q250,290 220,285 Q200,290 180,310 Q160,290 140,260 Q130,230 135,200 Q140,170 155,140Z" fill="none" stroke="#3a3a3a" strokeWidth="0.8"/>
      <path d="M270,320 Q300,310 320,340 Q330,370 325,400 Q320,430 310,460 Q295,490 280,510 Q265,490 260,460 Q250,430 252,400 Q255,370 260,340Z" fill="none" stroke="#3a3a3a" strokeWidth="0.8"/>
      <path d="M520,110 Q560,95 600,100 Q630,110 640,130 Q635,150 620,160 Q600,170 580,165 Q560,170 540,160 Q520,145 518,125Z" fill="none" stroke="#3a3a3a" strokeWidth="0.8"/>
      <path d="M560,200 Q590,190 620,200 Q640,220 650,260 Q655,310 645,360 Q630,400 610,420 Q590,430 570,420 Q550,400 540,360 Q535,310 538,260 Q542,230 550,210Z" fill="none" stroke="#3a3a3a" strokeWidth="0.8"/>
      <path d="M660,100 Q720,80 800,85 Q880,90 940,110 Q980,130 1000,160 Q1010,190 990,210 Q960,230 920,240 Q880,245 840,235 Q800,225 760,210 Q720,195 690,170 Q665,150 658,125Z" fill="none" stroke="#3a3a3a" strokeWidth="0.8"/>
      <path d="M900,380 Q940,370 970,385 Q990,400 985,425 Q975,445 950,450 Q925,448 910,435 Q895,415 898,395Z" fill="none" stroke="#3a3a3a" strokeWidth="0.8"/>
      <circle cx={280} cy={190} r={160} fill="url(#ug)"/>
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={2.5} fill="#d4a054" opacity={0.7}>
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${2.5+i*0.3}s`} repeatCount="indefinite"/>
          </circle>
          <circle cx={x} cy={y} r={8} fill="none" stroke="#d4a054" strokeWidth={0.4} opacity={0.3}>
            <animate attributeName="r" values="6;16;6" dur={`${3+i*0.4}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${3+i*0.4}s`} repeatCount="indefinite"/>
          </circle>
        </g>
      ))}
      {routes.map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4a054" strokeWidth={0.4} opacity={0.15} strokeDasharray="4,6">
          <animate attributeName="strokeDashoffset" from="0" to="-20" dur="3s" repeatCount="indefinite"/>
        </line>
      ))}
    </svg>
  );
}

function ExpansionMap() {
  return (
    <div className="mx-auto w-full max-w-6xl overflow-hidden border border-stone-800/45 bg-[#050505] shadow-[0_0_80px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col items-center justify-center gap-1 border-b border-stone-800/35 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.55)]" />
          <span className="whitespace-nowrap text-[8px] uppercase tracking-[0.26em] text-amber-500/80 sm:text-[10px] sm:tracking-[0.36em]" style={{ fontFamily: font.rajdhani }}>
            DEPLOYMENT ORIGIN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-[8px] uppercase tracking-[0.22em] text-stone-500 sm:text-[10px] sm:tracking-[0.3em]" style={{ fontFamily: font.rajdhani }}>
            LIVE STATUS:
          </span>
          <span className="rounded-md border border-emerald-400/25 bg-emerald-950/35 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(16,185,129,0.16)] sm:px-3 sm:text-xs" style={{ fontFamily: font.rajdhani }}>
            Active
          </span>
        </div>
      </div>
      <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid meet" className="block h-[410px] w-full sm:h-[540px]">
        <defs>
          <radialGradient id="tableGlow" cx="50%" cy="52%" r="35%">
            <stop offset="0%" stopColor="#C9A24A" stopOpacity={0.09} />
            <stop offset="100%" stopColor="#C9A24A" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="centerPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C9A24A" stopOpacity={0.14} />
            <stop offset="80%" stopColor="#C9A24A" stopOpacity={0} />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="usaBackdrop">
            <feFlood floodColor="#C9A24A" result="goldFill" />
            <feComposite in="goldFill" in2="SourceAlpha" operator="in" result="tintedMap" />
            <feGaussianBlur in="tintedMap" stdDeviation="0.7" result="mapGlow" />
            <feMerge result="mapWithGlow">
              <feMergeNode in="mapGlow" />
              <feMergeNode in="tintedMap" />
            </feMerge>
            <feComponentTransfer in="mapWithGlow">
              <feFuncA type="linear" slope="1.08" />
            </feComponentTransfer>
          </filter>
        </defs>
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`gv${i}`} x1={i * 50} y1={0} x2={i * 50} y2={540} stroke="#101010" strokeWidth={0.35} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`gh${i}`} x1={0} y1={i * 50} x2={960} y2={i * 50} stroke="#101010" strokeWidth={0.35} />
        ))}
        <rect x={0} y={0} width={960} height={540} fill="url(#tableGlow)" />

        <image
          href="/usa-outline-clean.png"
          x="30"
          y="0"
          width="900"
          height="540"
          preserveAspectRatio="xMidYMid meet"
          opacity="0.86"
          filter="url(#usaBackdrop)"
        />

        <g transform="translate(0 34)">
        <g transform="translate(480 216) scale(0.9) translate(-480 -216)">
        {[92, 118, 144].map((r, i) => (
          <ellipse key={`ring${i}`} cx={480} cy={216} rx={r} ry={r * 0.62} fill="none" stroke="#C9A24A" strokeWidth={0.35} opacity={0.075 - i * 0.018} strokeDasharray="5,9">
            <animate attributeName="opacity" values={`${0.075 - i * 0.018};${0.025 - i * 0.005};${0.075 - i * 0.018}`} dur={`${4.5 + i * 0.8}s`} repeatCount="indefinite" />
          </ellipse>
        ))}

        <line x1={432} y1={78} x2={528} y2={78} stroke="#f5f5f4" strokeWidth={9} strokeLinecap="round" />
        <line x1={432} y1={354} x2={528} y2={354} stroke="#f5f5f4" strokeWidth={9} strokeLinecap="round" />
        <line x1={318} y1={156} x2={318} y2={222} stroke="#f5f5f4" strokeWidth={9} strokeLinecap="round" />
        <line x1={642} y1={156} x2={642} y2={222} stroke="#f5f5f4" strokeWidth={9} strokeLinecap="round" />
        <line x1={318} y1={258} x2={318} y2={324} stroke="#f5f5f4" strokeWidth={9} strokeLinecap="round" />
        <line x1={642} y1={258} x2={642} y2={324} stroke="#f5f5f4" strokeWidth={9} strokeLinecap="round" />

        <rect x={350} y={108} width={260} height={216} rx={14} fill="#050505" stroke="#2f2a20" strokeWidth={1.1} />
        <rect x={362} y={120} width={236} height={192} rx={10} fill="none" stroke="#1f1b14" strokeWidth={0.65} opacity={0.85} />

        <ellipse cx={480} cy={216} rx={90} ry={52} fill="url(#centerPulse)" filter="url(#softGlow)">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="4s" repeatCount="indefinite" />
        </ellipse>

        {[
          [480, 128, 0],
          [560, 152, 45],
          [586, 216, 90],
          [560, 280, 135],
          [480, 304, 180],
          [400, 280, 225],
          [374, 216, 270],
          [400, 152, 315],
        ].map(([x, y, angle], i) => (
          <g key={`seat${i}`}>
            <rect x={x - 8} y={y - 5} width={16} height={10} rx={3} fill="none" stroke="#2a2a2a" strokeWidth={0.55} opacity={0.38} transform={`rotate(${angle}, ${x}, ${y})`} />
            <circle cx={x} cy={y} r={1} fill="#C9A24A" opacity={0.2}>
              <animate attributeName="opacity" values="0.15;0.35;0.15" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        <text x={480} y={168} textAnchor="middle" fill="#f5f5f4" fontSize={22} letterSpacing="0.14em" style={{ fontFamily: font.oswald }}>
          THE
        </text>
        <text x={480} y={224} textAnchor="middle" fill="#f5f5f4" fontSize={52} letterSpacing="0.06em" style={{ fontFamily: font.oswald }}>
          TABLE
        </text>
        <text x={480} y={284} textAnchor="middle" fill="#C9A24A" fontSize={10} letterSpacing="0.34em" style={{ fontFamily: font.rajdhani }}>
          IT STARTS HERE
        </text>
        </g>
        </g>
        <rect x={18} y={18} width={924} height={504} fill="none" stroke="#151515" strokeWidth={0.6} />
        {[
          [18, 18],
          [942, 18],
          [18, 522],
          [942, 522],
        ].map(([cx, cy], i) => (
          <g key={`cr${i}`}>
            <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#1e1e1e" strokeWidth={0.4} />
            <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#1e1e1e" strokeWidth={0.4} />
          </g>
        ))}
      </svg>
    </div>
  );
}

function GlobalUrgencySection() {
  const growthPerSecond = 2.2;
  const [addedSinceLoad, setAddedSinceLoad] = useState(0);
  const religionData = [
    { label: "Christians", value: "2.3 Billion", percent: "28.8%" },
    { label: "Muslims", value: "2.0 Billion", percent: "25.6%" },
    { label: "Religiously Unaffiliated", value: "1.9 Billion", percent: "24.2%" },
  ] as const;
  const americaStats = [
    {
      label: "SELF-IDENTIFIED CHRISTIANS",
      stat: "64%",
      note: "Down from 76% in 2000",
      source: "Barna Group",
    },
    {
      label: "CHURCH ATTENDANCE",
      stat: "30%",
      note: "Adults attending weekly, down from 42%",
      source: "Gallup",
    },
    {
      label: "GEN Z IDENTIFYING AS CHRISTIAN",
      stat: "52%",
      note: "Lowest of any generation measured",
      source: "Barna Group",
    },
  ] as const;

  useEffect(() => {
    const startedAt = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      setAddedSinceLoad(elapsedSeconds * growthPerSecond);
    }, 450);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="relative overflow-hidden px-6 py-10 md:py-14">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_18%,rgba(201,162,74,0.08),transparent_22%),radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.025),transparent_34%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:84px_84px] opacity-40" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_44%,#050505_100%)]" />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <p className="tactical-label mb-2 uppercase" style={{ fontFamily: font.rajdhani }}>
            FIELD INTELLIGENCE
          </p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-stone-100 leading-none" style={{ fontFamily: font.oswald }}>
            THE URGENCY
          </h2>
          <p className="mt-3 text-base md:text-lg leading-relaxed text-stone-400">
            The harvest is great. The time is now.
          </p>
        </div>

        <div className="mt-6">
          <div className="border border-stone-800/60 bg-[#080808] p-5 md:p-6">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
              <div>
                <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  WORLD POPULATION
                </p>
                <div className="mt-2 text-[36px] md:text-[38px] font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                  8.3 Billion+
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-200 md:text-base">
                  Every number is a soul. Every second matters.
                </p>
              </div>
              <div>
                <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  GLOBAL GROWTH RATE
                </p>
                <p className="mt-2 text-base md:text-[16px] leading-relaxed text-stone-300">
                  Growing by about 2.2 people every second
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  Roughly <span className="text-amber-500/80">{formatPopulation(addedSinceLoad)}</span> people added since this page loaded
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="grid gap-px bg-stone-800/30 md:grid-cols-3">
            {religionData.map((item) => (
              <div key={item.label} className="border border-stone-800/60 bg-stone-950/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                  {item.label}
                </div>
                <div className="mt-2 text-[20px] md:text-[22px] leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                  {item.value}
                </div>
                <div className="mt-2 text-xs text-stone-500">
                  {item.percent} of the world
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.24em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
            SOURCES: WORLDOMETER AND PEW RESEARCH CENTER
          </p>
        </div>

        <div className="mt-6 border-t border-stone-800/60 pt-6">
          <div className="max-w-4xl">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              AMERICAN CRISIS
            </p>
            <h3 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              THE DECLINE IS REAL
            </h3>
          </div>

          <div className="mt-4 grid gap-px overflow-hidden border border-stone-800/25 bg-stone-800/25 md:grid-cols-3">
            {americaStats.map((item) => (
              <div key={item.label} className="relative bg-stone-950/75 px-4 py-4 text-center md:px-5 md:py-5">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
                <div className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  {item.label}
                </div>
                <div className="mt-2 text-4xl leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
                  {item.stat}
                </div>
                <div className="mt-2 text-sm leading-snug text-stone-400">{item.note}</div>
                <div className="mt-3 text-[9px] uppercase tracking-[0.24em] text-amber-500/70" style={{ fontFamily: font.rajdhani }}>
                  {item.source}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-stone-800/65 bg-[linear-gradient(180deg,rgba(14,14,14,0.95),rgba(9,9,9,0.92))] px-6 py-6 md:px-8 md:py-7">
            <div className="max-w-4xl mx-auto text-center">
              <p
                className="whitespace-pre-line uppercase text-amber-500/80"
                style={{ fontFamily: font.rajdhani, fontWeight: 500, fontSize: "11px", letterSpacing: "0.24em", lineHeight: 1.9 }}
              >
                {`This is not a dip. It is a long erosion.
It reflects a deeper breakdown in discipleship, formation, and mission.`}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 md:gap-5">
          <div className="h-px w-8 shrink-0 bg-amber-500/60 sm:w-14 md:w-24" />
          <p className="max-w-[18rem] text-center text-[9px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-stone-100 sm:max-w-none sm:text-[10px] sm:tracking-[0.24em] md:text-xs md:tracking-[0.34em]" style={{ fontFamily: font.rajdhani }}>
            USA MISSIONARIES EXISTS TO REVERSE&nbsp;IT
          </p>
          <div className="h-px w-8 shrink-0 bg-amber-500/60 sm:w-14 md:w-24" />
        </div>
      </div>
    </section>
  );
}

function DOSPanel() {
  const rows = [
    { op: "OPR-0042", city: "Austin, TX", status: "Active", tables: 3 },
    { op: "OPR-0117", city: "Denver, CO", status: "Active", tables: 5 },
    { op: "OPR-0203", city: "Portland, OR", status: "Deploying", tables: 1 },
    { op: "OPR-0089", city: "Nashville, TN", status: "Active", tables: 4 },
  ];
  return (
    <div className="relative border border-stone-800/60 rounded-sm overflow-hidden" style={{background:"rgba(5,5,5,0.8)"}}>
      <div className="absolute inset-0 pointer-events-none" style={{background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)"}}/>
      <div className="border-b border-stone-800/60 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500/70 animate-pulse"/>
          <span className="tactical-label" style={{fontFamily:font.rajdhani}}>SYSTEM // OPERATOR DASHBOARD</span>
        </div>
        <span className="text-xs text-stone-600" style={{fontFamily:font.rajdhani}}>v0.1.0-alpha</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800/40">
              {["OPERATOR","CITY","STATUS","TABLES"].map(h=>(
                <th key={h} className="px-5 py-3 text-xs tracking-[0.2em] text-stone-600 font-normal" style={{fontFamily:font.rajdhani}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} className="border-b border-stone-800/20 hover:bg-stone-800/10 transition-colors">
                <td className="px-5 py-3 text-stone-300 font-mono text-xs">{r.op}</td>
                <td className="px-5 py-3 text-stone-400 text-xs">{r.city}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-sm ${r.status==="Active"?"bg-green-900/30 text-green-400/80":"bg-amber-900/30 text-amber-400/80"}`} style={{fontFamily:font.rajdhani}}>{r.status}</span>
                </td>
                <td className="px-5 py-3 text-stone-400 font-mono text-xs">{r.tables}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollToIdentity = () => {
    document.getElementById("identity")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen">
      {/* NAV */}
      <PrimaryNav active="mission" fixed />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{transform:`translateY(${scrollY*0.15}px)`}}><WorldMap/></div>
        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",backgroundSize:"80px 80px"}}/>
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at 35% 45%,rgba(212,160,84,0.04) 0%,transparent 60%)"}}/>
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at center,transparent 40%,#050505 100%)"}}/>
        <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at center,rgba(5,5,5,0.66) 0%,rgba(5,5,5,0.48) 24%,rgba(5,5,5,0.14) 52%,transparent 72%)"}}/>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <Reveal>
            <div className="flex items-center justify-center gap-3 mb-9">
              <div className="w-9 h-[1.5px] bg-amber-500/45"/><span className="tactical-label uppercase" style={{fontFamily:font.rajdhani}}>ACTIVE DEPLOYMENT</span><div className="w-9 h-[1.5px] bg-amber-500/45"/>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight text-stone-100 leading-none mb-6" style={{fontFamily:font.oswald}}>THE MISSION<br/>IS ACTIVE</h1>
          </Reveal>
          <Reveal delay={300}>
            <div>
              <p className="text-lg md:text-[1.3rem] font-medium text-stone-300 leading-[1.75] max-w-2xl mx-auto mb-4">Deploying across the United States.<br/>Expanding to the ends of the earth.</p>
              <div
                className="mt-4 text-center uppercase text-stone-400"
                style={{ fontFamily: font.rajdhani, fontWeight: 500, fontSize: "11px", letterSpacing: "0.25em", lineHeight: 1.8 }}
              >
                <p>GO. MAKE DISCIPLES. BAPTIZE THEM. TEACH THEM THE COMMANDS.</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <p className="mt-[6px] mb-10 uppercase text-stone-600" style={{fontFamily:font.rajdhani, fontWeight:400, fontSize:"10px", letterSpacing:"0.3em"}}>MATTHEW 28:19–20</p>
          </Reveal>
          <Reveal delay={500}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <CTAButton href="/prayer">Pray for the Mission</CTAButton>
              <CTAButton variant="secondary" href="/support">Support the Mission</CTAButton>
            </div>
          </Reveal>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{background:"linear-gradient(transparent,#050505)"}}/>
      </section>

      <GlobalUrgencySection />

      {/* IDENTITY */}
      <section id="identity" className="py-28 md:py-40 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal><div className="w-12 h-px bg-stone-700 mx-auto"/></Reveal>
          <div className="mt-16 text-center">
            <Reveal delay={100}><SectionHeading headline={<>NOT AN ORGANIZATION.<br/>A DEPLOYMENT.</>}/></Reveal>
            <Reveal delay={250}>
              <div className="mt-10 space-y-1">
                {["No buildings.","No stages.","No spectators.","Only obedience."].map((l,i)=>(
                  <p key={i} className={`text-lg md:text-xl ${i===3?"text-stone-200 mt-4":"text-stone-500"}`}>{l}</p>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* EXPANSION MAP */}
      <section className="py-20 md:py-32 px-6" style={{background:"#080808"}}>
        <div className="max-w-6xl mx-auto">
          <Reveal><SectionHeading overline="STRATEGIC EXPANSION" headline="FROM HERE TO THE NATIONS"><p>It starts here.<br/>But it does not end here.</p></SectionHeading></Reveal>
          <Reveal delay={200}><div className="mt-16"><ExpansionMap/></div></Reveal>
          <Reveal delay={300}>
            <div className="mt-24 md:mt-28 text-center">
              <p className="text-base md:text-lg text-stone-300 leading-relaxed max-w-3xl mx-auto">
                "But you will receive power when the Holy Spirit has come upon you, and you will be my witnesses in Jerusalem and in all Judea and Samaria, and to the end of the earth."
              </p>
              <p className="tactical-label mt-4 uppercase" style={{fontFamily:font.rajdhani}}>
                Acts 1:8
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MISSION MODEL */}
      <section className="py-28 md:py-40 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal><SectionHeading overline="THE MODEL" headline="MEET. MINISTER. MULTIPLY."><p>Simple. Repeatable. Scalable.</p></SectionHeading></Reveal>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-stone-800/30">
            {[{n:"01",t:"MEET",d:"Enter the space. Identify the person of peace. Begin where they are."},{n:"02",t:"MINISTER",d:"Share the gospel with clarity. Serve with presence. Speak truth."},{n:"03",t:"MULTIPLY",d:"Train others to do the same. Launch tables. Repeat the cycle."}].map((c,i)=>(
              <Reveal key={i} delay={i*150}>
                <div className="p-8 md:p-10 h-full" style={{background:"#0a0a0a"}}>
                  <span className="tactical-amber-label text-xs tracking-[0.26em] block mb-4" style={{fontFamily:font.rajdhani}}>{c.n}</span>
                  <h3 className="text-2xl font-bold text-stone-100 mb-4 tracking-wide" style={{fontFamily:font.oswald}}>{c.t}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}><p className="tactical-label text-center mt-10 uppercase" style={{fontFamily:font.rajdhani}}>A FIELD-TESTED MODEL FOR GOSPEL MOVEMENT</p></Reveal>
        </div>
      </section>

      {/* DOS */}
      <section className="py-28 md:py-40 px-6" style={{background:"#080808"}}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Reveal><SectionHeading align="left" overline="SYSTEM LAYER" headline="THE INFRASTRUCTURE IS BEING BUILT"><p>A system designed to equip operators, track movement, and support multiplication at scale.</p></SectionHeading></Reveal>
              <Reveal delay={200}><div className="mt-8"><CTAButton variant="secondary" href="/system">View the System</CTAButton></div></Reveal>
            </div>
            <Reveal delay={300}><DOSPanel/></Reveal>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 md:py-48 px-6 relative">
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at center top,rgba(212,160,84,0.03) 0%,transparent 50%)"}}/>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <Reveal><div className="w-12 h-px bg-stone-700 mx-auto"/></Reveal>
          <Reveal delay={100}><h2 className="mt-12 text-5xl md:text-7xl font-bold text-stone-100 tracking-tight" style={{fontFamily:font.oswald}}>YOU WERE SENT</h2></Reveal>
          <Reveal delay={250}><div className="mt-8 space-y-1 text-stone-400 text-lg"><p>The question is not if.</p><p className="text-stone-200">It is when.</p></div></Reveal>
          <Reveal delay={400}><div className="mt-12"><CTAButton href="/mission">Join the Mission</CTAButton></div></Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-stone-800/30 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-amber-500/70 rotate-45"/>
            <span className="text-xs tracking-[0.3em] text-stone-600" style={{fontFamily:font.oswald}}>USA MISSIONARIES</span>
          </div>
          <p className="text-xs text-stone-700" style={{fontFamily:font.rajdhani}}>GO AND MAKE DISCIPLES OF ALL NATIONS — MATTHEW 28:19</p>
        </div>
      </footer>
    </main>
  );
}
