"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ALASKA,
  ASIA,
  AFRICA,
  AUSTRALIA,
  CANADA,
  EUROPE,
  GREENLAND,
  INDIA,
  JAPAN,
  MEXICO,
  MIDDLE_EAST,
  NEW_ZEALAND,
  SE_ASIA_ISLANDS,
  SOUTH_AMERICA,
  UK,
  USA_OUTLINE,
  USA_STATE_LINES,
} from "./mapdata";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function SectionHeading({ overline, headline, children, align = "center" }: {
  overline?: string; headline: React.ReactNode; children?: React.ReactNode; align?: string;
}) {
  return (
    <div className={`${align === "left" ? "text-left" : "text-center"} max-w-3xl ${align === "center" ? "mx-auto" : ""}`}>
      {overline && <p className="text-xs tracking-[0.35em] text-stone-500 mb-4" style={{ fontFamily: font.rajdhani }}>{overline}</p>}
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-stone-100 leading-tight" style={{ fontFamily: font.oswald }}>{headline}</h2>
      {children && <div className="mt-5 text-stone-400 text-base md:text-lg leading-relaxed">{children}</div>}
    </div>
  );
}

function CTAButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: string }) {
  const cls = variant === "primary"
    ? "bg-stone-100 text-stone-950 hover:bg-amber-200"
    : "border border-stone-600 text-stone-400 hover:border-stone-400 hover:text-stone-200";
  return (
    <button className={`inline-block px-7 py-3 text-sm tracking-[0.2em] uppercase transition-all duration-300 cursor-pointer ${cls}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 600 }}>{children}</button>
  );
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
  const [hovered, setHovered] = useState<number | null>(null);
  const worldOutlines = [
    { d: CANADA, op: 0.22 },
    { d: MEXICO, op: 0.22 },
    { d: SOUTH_AMERICA, op: 0.25 },
    { d: EUROPE, op: 0.28 },
    { d: UK, op: 0.25 },
    { d: AFRICA, op: 0.25 },
    { d: MIDDLE_EAST, op: 0.25 },
    { d: ASIA, op: 0.25 },
    { d: INDIA, op: 0.25 },
    { d: JAPAN, op: 0.28 },
    { d: AUSTRALIA, op: 0.25 },
    { d: NEW_ZEALAND, op: 0.22 },
    { d: SE_ASIA_ISLANDS, op: 0.22 },
    { d: GREENLAND, op: 0.2 },
    { d: ALASKA, op: 0.2 },
  ];
  const nodes = [
    { label: "USA", x: 290, y: 190, big: true, phase: "ORIGIN" },
    { label: "JERUSALEM", x: 608, y: 155, big: false, phase: "PHASE 01" },
    { label: "JUDEA", x: 640, y: 165, big: false, phase: "PHASE 02" },
    { label: "SAMARIA", x: 700, y: 155, big: false, phase: "PHASE 03" },
    { label: "ENDS OF THE EARTH", x: 830, y: 335, big: false, phase: "PHASE 04" },
  ];
  const routes = [
    { x1: 290, y1: 190, x2: 608, y2: 155 },
    { x1: 608, y1: 155, x2: 640, y2: 165 },
    { x1: 640, y1: 165, x2: 700, y2: 155 },
    { x1: 700, y1: 155, x2: 830, y2: 335 },
  ];
  const cities = [
    { x: 138, y: 130, l: "SEA" },
    { x: 128, y: 178, l: "SFO" },
    { x: 155, y: 218, l: "LA" },
    { x: 200, y: 230, l: "PHX" },
    { x: 268, y: 155, l: "DEN" },
    { x: 348, y: 252, l: "DAL" },
    { x: 368, y: 272, l: "HOU" },
    { x: 332, y: 182, l: "KC" },
    { x: 420, y: 242, l: "ATL" },
    { x: 418, y: 155, l: "CHI" },
    { x: 476, y: 258, l: "MIA" },
    { x: 478, y: 170, l: "NYC" },
    { x: 472, y: 186, l: "DC" },
    { x: 440, y: 165, l: "CLE" },
    { x: 300, y: 120, l: "MSP" },
    { x: 252, y: 228, l: "ABQ" },
    { x: 428, y: 212, l: "NSH" },
    { x: 460, y: 148, l: "BOS" },
  ];
  return (
    <div className="relative">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-[10px] tracking-[0.4em] text-stone-600 uppercase" style={{ fontFamily: font.rajdhani }}>
          DEPLOYMENT MAP — LIVE
        </span>
      </div>
      <div className="absolute top-3 right-4 z-10 text-right">
        <span className="text-[10px] tracking-[0.3em] text-stone-700 block" style={{ fontFamily: font.rajdhani }}>
          STATUS: ACTIVE
        </span>
      </div>
      <svg viewBox="0 0 1000 460" className="w-full h-auto">
        <defs>
          <radialGradient id="uglow" cx="28%" cy="42%" r="30%">
            <stop offset="0%" stopColor="#C9A24A" stopOpacity={0.08} />
            <stop offset="50%" stopColor="#C9A24A" stopOpacity={0.02} />
            <stop offset="100%" stopColor="#C9A24A" stopOpacity={0} />
          </radialGradient>
          <filter id="ng">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sg">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={`gv${i}`} x1={i * 50} y1={0} x2={i * 50} y2={460} stroke="#0d0d0d" strokeWidth={0.3} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`gh${i}`} x1={0} y1={i * 50} x2={1000} y2={i * 50} stroke="#0d0d0d" strokeWidth={0.3} />
        ))}
        <rect x={0} y={0} width={1000} height={460} fill="url(#uglow)" />
        {worldOutlines.map((w, i) => (
          <path key={`wo${i}`} d={w.d} fill="none" stroke="#2a2a2a" strokeWidth={0.6} opacity={w.op} />
        ))}
        <path d={USA_OUTLINE} fill="rgba(201,162,74,0.012)" stroke="#444" strokeWidth={1} opacity={0.6} />
        {USA_STATE_LINES.map(([x1, y1, x2, y2], i) => (
          <line key={`sl${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1c1c1c" strokeWidth={0.35} opacity={0.45} />
        ))}
        {cities.map((c, i) => (
          <g key={`ci${i}`}>
            <circle cx={c.x} cy={c.y} r={1} fill="#C9A24A" opacity={0.18} />
            <text x={c.x} y={c.y - 4} textAnchor="middle" fill="#2e2e2e" fontSize={5.5} letterSpacing="0.06em" style={{ fontFamily: font.rajdhani }}>
              {c.l}
            </text>
          </g>
        ))}
        {routes.map((r, i) => {
          const dx = r.x2 - r.x1;
          const dy = r.y2 - r.y1;
          const mx = (r.x1 + r.x2) / 2;
          const my = (r.y1 + r.y2) / 2;
          const cx1 = mx - dy * 0.12;
          const cy1 = my + dx * 0.12;
          const p = `M${r.x1},${r.y1} Q${cx1},${cy1} ${r.x2},${r.y2}`;
          return (
            <g key={`rt${i}`}>
              <path d={p} fill="none" stroke="#C9A24A" strokeWidth={0.6} opacity={0.14} strokeDasharray="3,7">
                <animate attributeName="strokeDashoffset" from="0" to="-20" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
              </path>
              <circle r={1.5} fill="#C9A24A" opacity={0}>
                <animateMotion dur={`${4 + i * 0.8}s`} repeatCount="indefinite" path={p} />
                <animate attributeName="opacity" values="0;0.7;0" dur={`${4 + i * 0.8}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
        {nodes.map((n, i) => {
          const isHovered = hovered === i;
          return (
            <g key={`nd${i}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
              {n.big && (
                <>
                  <circle cx={n.x} cy={n.y} r={32} fill="none" stroke="#C9A24A" strokeWidth={0.2} opacity={0.1} strokeDasharray="2,4" />
                  <circle cx={n.x} cy={n.y} r={20} fill="none" stroke="#C9A24A" strokeWidth={0.25} opacity={0.14} strokeDasharray="2,3" />
                  <line x1={n.x - 38} y1={n.y} x2={n.x - 9} y2={n.y} stroke="#C9A24A" strokeWidth={0.2} opacity={0.18} />
                  <line x1={n.x + 9} y1={n.y} x2={n.x + 38} y2={n.y} stroke="#C9A24A" strokeWidth={0.2} opacity={0.18} />
                  <line x1={n.x} y1={n.y - 38} x2={n.x} y2={n.y - 9} stroke="#C9A24A" strokeWidth={0.2} opacity={0.18} />
                  <line x1={n.x} y1={n.y + 9} x2={n.x} y2={n.y + 38} stroke="#C9A24A" strokeWidth={0.2} opacity={0.18} />
                </>
              )}
              <circle cx={n.x} cy={n.y} r={n.big ? 16 : 9} fill="none" stroke="#C9A24A" strokeWidth={0.35} opacity={isHovered ? 0.4 : 0.15}>
                <animate attributeName="r" values={n.big ? "12;22;12" : "6;13;6"} dur={`${3.5 + i * 0.6}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values={isHovered ? "0.4;0.02;0.4" : "0.18;0;0.18"} dur={`${3.5 + i * 0.6}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={n.x} cy={n.y} r={n.big ? 5 : 2.5} fill="#C9A24A" opacity={isHovered ? 1 : 0.8} filter={n.big ? "url(#ng)" : "url(#sg)"} />
              {n.big && (
                <circle cx={n.x} cy={n.y} r={8} fill="none" stroke="#C9A24A" strokeWidth={0.6} opacity={0.3}>
                  <animate attributeName="r" values="7;12;7" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
                </circle>
              )}
              <text x={n.x} y={n.y - (n.big ? 26 : 15)} textAnchor="middle" fill={isHovered ? "#e5c76b" : "#C9A24A"} fontSize={n.big ? 13 : 8.5} letterSpacing="0.22em" fontWeight={700} style={{ fontFamily: font.oswald, transition: "fill 0.3s" }}>
                {n.label}
              </text>
              <text x={n.x} y={n.y + (n.big ? 20 : 14)} textAnchor="middle" fill="#363636" fontSize={6.5} letterSpacing="0.28em" style={{ fontFamily: font.rajdhani }}>
                {n.phase}
              </text>
            </g>
          );
        })}
        <line x1={28} y1={434} x2={98} y2={434} stroke="#252525" strokeWidth={0.4} />
        <line x1={28} y1={431} x2={28} y2={437} stroke="#252525" strokeWidth={0.4} />
        <line x1={98} y1={431} x2={98} y2={437} stroke="#252525" strokeWidth={0.4} />
        <text x={63} y={445} textAnchor="middle" fill="#252525" fontSize={6.5} letterSpacing="0.18em" style={{ fontFamily: font.rajdhani }}>
          1000 MI
        </text>
        <rect x={18} y={18} width={964} height={424} fill="none" stroke="#141414" strokeWidth={0.6} />
        {[
          [18, 18],
          [982, 18],
          [18, 442],
          [982, 442],
        ].map(([cx, cy], i) => (
          <g key={`cr${i}`}>
            <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#222" strokeWidth={0.5} />
            <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#222" strokeWidth={0.5} />
          </g>
        ))}
      </svg>
    </div>
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
          <span className="text-xs tracking-[0.3em] text-stone-500" style={{fontFamily:font.rajdhani}}>DOS // OPERATOR DASHBOARD</span>
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

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="border border-stone-800/50 bg-stone-900/30 p-6 md:p-8 text-center">
      <div className="text-4xl md:text-5xl font-bold text-stone-100 mb-2" style={{fontFamily:font.oswald}}>
        <AnimCounter target={value} suffix={suffix}/>
      </div>
      <div className="text-xs tracking-[0.3em] text-stone-500 uppercase" style={{fontFamily:font.rajdhani}}>{label}</div>
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

  return (
    <main className="min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-800/30" style={{background:"rgba(5,5,5,0.85)",backdropFilter:"blur(12px)"}}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-amber-500/70 rotate-45"/>
            <span className="text-sm tracking-[0.35em] text-stone-300 font-medium" style={{fontFamily:font.oswald}}>USA MISSIONARIES</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Mission","Movement","System","Deploy"].map(item=>(
              <a key={item} href="#" className="text-xs tracking-[0.2em] text-stone-500 hover:text-stone-200 transition-colors uppercase" style={{fontFamily:font.rajdhani,fontWeight:600}}>{item}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{transform:`translateY(${scrollY*0.15}px)`}}><WorldMap/></div>
        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",backgroundSize:"80px 80px"}}/>
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at 35% 45%,rgba(212,160,84,0.04) 0%,transparent 60%)"}}/>
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at center,transparent 40%,#050505 100%)"}}/>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <Reveal>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-8 h-px bg-stone-600"/><span className="text-xs tracking-[0.5em] text-stone-500" style={{fontFamily:font.rajdhani}}>ACTIVE DEPLOYMENT</span><div className="w-8 h-px bg-stone-600"/>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight text-stone-100 leading-none mb-6" style={{fontFamily:font.oswald}}>THE MISSION<br/>IS ACTIVE</h1>
          </Reveal>
          <Reveal delay={300}>
            <p className="text-base md:text-lg text-stone-400 leading-relaxed max-w-xl mx-auto mb-3">Deploying across the United States.<br/>Expanding to the ends of the earth.</p>
          </Reveal>
          <Reveal delay={400}>
            <p className="text-xs tracking-[0.25em] text-stone-600 mb-10" style={{fontFamily:font.rajdhani}}>MATTHEW 28:19–20</p>
          </Reveal>
          <Reveal delay={500}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <CTAButton>Enter the Mission</CTAButton>
              <CTAButton variant="secondary">Access Briefing</CTAButton>
            </div>
          </Reveal>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{background:"linear-gradient(transparent,#050505)"}}/>
      </section>

      {/* IDENTITY */}
      <section className="py-28 md:py-40 px-6">
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
                  <span className="text-xs tracking-[0.3em] text-amber-600/60 block mb-4" style={{fontFamily:font.rajdhani}}>{c.n}</span>
                  <h3 className="text-2xl font-bold text-stone-100 mb-4 tracking-wide" style={{fontFamily:font.oswald}}>{c.t}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}><p className="text-center mt-10 text-xs tracking-[0.25em] text-stone-600" style={{fontFamily:font.rajdhani}}>A FIELD-TESTED MODEL FOR GOSPEL MOVEMENT</p></Reveal>
        </div>
      </section>

      {/* DOS */}
      <section className="py-28 md:py-40 px-6" style={{background:"#080808"}}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Reveal><SectionHeading align="left" overline="SYSTEM LAYER" headline="THE INFRASTRUCTURE IS BEING BUILT"><p>A system designed to equip operators, track movement, and support multiplication at scale.</p></SectionHeading></Reveal>
              <Reveal delay={200}><div className="mt-8"><CTAButton variant="secondary">View the System</CTAButton></div></Reveal>
            </div>
            <Reveal delay={300}><DOSPanel/></Reveal>
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section className="py-28 md:py-40 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal><h2 className="text-4xl md:text-6xl font-bold text-stone-100 tracking-tight leading-none" style={{fontFamily:font.oswald}}>THIS IS NOT<br/>FOR EVERYONE</h2></Reveal>
          <Reveal delay={150}><div className="mt-10 space-y-1 text-stone-400 text-lg"><p>This is for those who are ready to go.</p><p className="text-stone-600">Not just believe.</p></div></Reveal>
          <Reveal delay={300}><div className="mt-8 space-y-1">{["To speak.","To act.","To multiply."].map((l,i)=>(<p key={i} className="text-stone-200 text-lg md:text-xl font-medium">{l}</p>))}</div></Reveal>
          <Reveal delay={450}><div className="mt-12"><CTAButton>Step In</CTAButton></div></Reveal>
        </div>
      </section>

      {/* IMPACT */}
      <section className="py-28 md:py-40 px-6" style={{background:"#080808"}}>
        <div className="max-w-4xl mx-auto">
          <Reveal><p className="text-center text-xs tracking-[0.5em] text-amber-600/50 mb-12" style={{fontFamily:font.rajdhani}}>LIVE MOVEMENT</p></Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Reveal delay={100}><StatCard label="Active Operators" value={147} suffix="+"/></Reveal>
            <Reveal delay={200}><StatCard label="Cities Reached" value={38}/></Reveal>
            <Reveal delay={300}><StatCard label="Tables Initiated" value={412}/></Reveal>
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
          <Reveal delay={400}><div className="mt-12"><CTAButton>Join the Mission</CTAButton></div></Reveal>
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
