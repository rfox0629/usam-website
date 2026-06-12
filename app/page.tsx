"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { PrimaryNav } from "../components/PrimaryNav";
import { JoinMissionInterestModal } from "@/components/forms/JoinMissionInterestModal";
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
    ? "border border-usam-gold bg-usam-gold text-usam-black hover:bg-usam-gold/90"
    : "border border-usam-gold/65 bg-transparent text-usam-white hover:border-usam-gold hover:bg-usam-gold/12";
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

function WorldMap() {
  const nodes: Array<[number, number]> = [[280,190],[600,135],[590,300],[760,160],[950,410],[310,400],[220,170],[320,200],[640,250],[860,180],[700,130],[580,380]];
  const routes: Array<[number, number, number, number]> = [[280,190,600,135],[280,190,590,300],[280,190,760,160],[280,190,310,400]];
  return (
    <svg viewBox="0 0 1200 600" className="w-full h-full" style={{ opacity: 0.12 }}>
      <defs>
        <radialGradient id="ug" cx="28%" cy="42%" r="25%">
          <stop offset="0%" stopColor="#C2A14E" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#C2A14E" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d="M160,120 Q200,90 280,95 Q340,100 370,140 Q380,170 360,200 Q340,230 310,250 Q290,260 270,280 Q250,290 220,285 Q200,290 180,310 Q160,290 140,260 Q130,230 135,200 Q140,170 155,140Z" fill="none" stroke="#C2A14E" strokeOpacity={0.22} strokeWidth="0.8"/>
      <path d="M270,320 Q300,310 320,340 Q330,370 325,400 Q320,430 310,460 Q295,490 280,510 Q265,490 260,460 Q250,430 252,400 Q255,370 260,340Z" fill="none" stroke="#C2A14E" strokeOpacity={0.22} strokeWidth="0.8"/>
      <path d="M520,110 Q560,95 600,100 Q630,110 640,130 Q635,150 620,160 Q600,170 580,165 Q560,170 540,160 Q520,145 518,125Z" fill="none" stroke="#C2A14E" strokeOpacity={0.22} strokeWidth="0.8"/>
      <path d="M560,200 Q590,190 620,200 Q640,220 650,260 Q655,310 645,360 Q630,400 610,420 Q590,430 570,420 Q550,400 540,360 Q535,310 538,260 Q542,230 550,210Z" fill="none" stroke="#C2A14E" strokeOpacity={0.22} strokeWidth="0.8"/>
      <path d="M660,100 Q720,80 800,85 Q880,90 940,110 Q980,130 1000,160 Q1010,190 990,210 Q960,230 920,240 Q880,245 840,235 Q800,225 760,210 Q720,195 690,170 Q665,150 658,125Z" fill="none" stroke="#C2A14E" strokeOpacity={0.22} strokeWidth="0.8"/>
      <path d="M900,380 Q940,370 970,385 Q990,400 985,425 Q975,445 950,450 Q925,448 910,435 Q895,415 898,395Z" fill="none" stroke="#C2A14E" strokeOpacity={0.22} strokeWidth="0.8"/>
      <circle cx={280} cy={190} r={160} fill="url(#ug)"/>
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={2.5} fill="#C2A14E" opacity={0.7}>
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${2.5+i*0.3}s`} repeatCount="indefinite"/>
          </circle>
          <circle cx={x} cy={y} r={8} fill="none" stroke="#C2A14E" strokeWidth={0.4} opacity={0.3}>
            <animate attributeName="r" values="6;16;6" dur={`${3+i*0.4}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${3+i*0.4}s`} repeatCount="indefinite"/>
          </circle>
        </g>
      ))}
      {routes.map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C2A14E" strokeWidth={0.4} opacity={0.15} strokeDasharray="4,6">
          <animate attributeName="strokeDashoffset" from="0" to="-20" dur="3s" repeatCount="indefinite"/>
        </line>
      ))}
    </svg>
  );
}

function ExpansionMap() {
  const gold = "#C2A14E";
  const tableCenter = { x: 480, y: 246 };
  const seats = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return { x: tableCenter.x + Math.cos(angle) * 146, y: tableCenter.y + Math.sin(angle) * 98 };
  });

  return (
    <div className="relative">
      <svg viewBox="0 0 960 460" className="w-full h-auto">
        <defs>
          <radialGradient id="tableGlow" cx="50%" cy="52%" r="35%">
            <stop offset="0%" stopColor={gold} stopOpacity={0.16} />
            <stop offset="48%" stopColor={gold} stopOpacity={0.055} />
            <stop offset="100%" stopColor={gold} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="centerPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gold} stopOpacity={0.22} />
            <stop offset="72%" stopColor={gold} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="originExpansion" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gold} stopOpacity={0.2} />
            <stop offset="55%" stopColor={gold} stopOpacity={0.055} />
            <stop offset="100%" stopColor={gold} stopOpacity={0} />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cardGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor={gold} floodOpacity="0.22" />
          </filter>
          <filter id="usaBackdrop">
            <feFlood floodColor={gold} result="goldFill" />
            <feComposite in="goldFill" in2="SourceAlpha" operator="in" result="tintedMap" />
            <feComponentTransfer in="tintedMap">
              <feFuncA type="linear" slope="0.74" />
            </feComponentTransfer>
          </filter>
        </defs>
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`gv${i}`} x1={i * 50} y1={0} x2={i * 50} y2={460} stroke="#0c0c0c" strokeWidth={0.3} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`gh${i}`} x1={0} y1={i * 50} x2={960} y2={i * 50} stroke="#0c0c0c" strokeWidth={0.3} />
        ))}
        <rect x={0} y={0} width={960} height={460} fill="url(#tableGlow)" />

        <image
          href="/usa-outline-clean.png"
          x="54"
          y="20"
          width="852"
          height="474"
          preserveAspectRatio="xMidYMid meet"
          opacity="0.68"
          filter="url(#usaBackdrop)"
        />

        <ellipse cx={tableCenter.x} cy={tableCenter.y} rx={212} ry={132} fill="url(#originExpansion)">
          <animate attributeName="opacity" values="0.55;0.9;0.55" dur="5.5s" repeatCount="indefinite" />
        </ellipse>

        {[88, 112, 136].map((r, i) => (
          <ellipse key={`ring${i}`} cx={tableCenter.x} cy={tableCenter.y} rx={r} ry={r * 0.62} fill="none" stroke={gold} strokeWidth={0.45} opacity={0.45 - i * 0.045} strokeDasharray="5,9">
            <animate attributeName="opacity" values={`${0.42 - i * 0.04};${0.18 - i * 0.02};${0.42 - i * 0.04}`} dur={`${4.5 + i * 0.8}s`} repeatCount="indefinite" />
          </ellipse>
        ))}

        <rect x={360} y={134} width={240} height={220} rx={14} fill="#0D0D0D" stroke={gold} strokeOpacity={0.28} strokeWidth={1.05} filter="url(#cardGlow)" />
        <rect x={370} y={144} width={220} height={200} rx={10} fill="none" stroke={gold} strokeWidth={0.55} strokeOpacity={0.14} />

        <line x1={430} y1={100} x2={530} y2={100} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={10} strokeLinecap="round" />
        <line x1={430} y1={392} x2={530} y2={392} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={10} strokeLinecap="round" />
        <line x1={340} y1={178} x2={340} y2={246} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={10} strokeLinecap="round" />
        <line x1={620} y1={178} x2={620} y2={246} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={10} strokeLinecap="round" />
        <line x1={340} y1={288} x2={340} y2={356} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={10} strokeLinecap="round" />
        <line x1={620} y1={288} x2={620} y2={356} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={10} strokeLinecap="round" />

        <ellipse cx={tableCenter.x} cy={tableCenter.y} rx={86} ry={50} fill="url(#centerPulse)" filter="url(#softGlow)">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="4s" repeatCount="indefinite" />
        </ellipse>

        {seats.map((s, i) => {
          const angle = (i / 8) * 360;
          return (
            <g key={`seat${i}`}>
              <rect x={s.x - 9} y={s.y - 6} width={18} height={12} rx={3} fill="none" stroke={gold} strokeWidth={0.55} opacity={0.18} transform={`rotate(${angle}, ${s.x}, ${s.y})`} />
              <circle cx={s.x} cy={s.y} r={1} fill={gold} opacity={0.34}>
                <animate attributeName="opacity" values="0.22;0.58;0.22" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        <text x={tableCenter.x} y={194} textAnchor="middle" fill="#f5f5f4" fontSize={24} letterSpacing="0.14em" style={{ fontFamily: font.oswald }}>
          THE
        </text>
        <text x={tableCenter.x} y={258} textAnchor="middle" fill="#f5f5f4" fontSize={58} letterSpacing="0.05em" style={{ fontFamily: font.oswald }}>
          TABLE
        </text>
        <text x={tableCenter.x} y={314} textAnchor="middle" fill={gold} fontSize={11} letterSpacing="0.34em" style={{ fontFamily: font.rajdhani }}>
          IT STARTS HERE
        </text>
        <rect x={16} y={16} width={928} height={428} fill="none" stroke="#131313" strokeWidth={0.5} />
        {[
          [16, 16],
          [944, 16],
          [16, 444],
          [944, 444],
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

function FieldBeat({
  children,
  label,
  number,
  title,
}: {
  children: React.ReactNode;
  label: string;
  number: string;
  title: string;
}) {
  return (
    <div className="border-b border-[rgba(245,242,234,0.14)] py-11 sm:py-14 md:py-16 lg:py-[72px]">
      <div className="mx-auto max-w-[1060px] px-5 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-[11px] font-medium uppercase leading-none tracking-[0.22em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
              <span className="text-[#C2A14E]">{number}</span> / {label}
            </p>
            <h2 className="text-[clamp(30px,4.2vw,52px)] font-bold uppercase leading-[1.02] tracking-normal text-stone-100" style={{ fontFamily: font.oswald }}>
              {title}
            </h2>
          </div>
        </Reveal>
        <div className="mt-8 md:mt-10">
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldMathCard({
  emphasized = false,
  label,
  last = false,
  value,
}: {
  emphasized?: boolean;
  label: string;
  last?: boolean;
  value: string;
}) {
  return (
    <div className={`min-w-0 p-5 sm:p-6 ${last ? "" : "border-b border-[rgba(245,242,234,0.14)] md:border-b-0"}`}>
      <p className={`text-[10px] font-semibold uppercase leading-snug tracking-[0.18em] ${emphasized ? "text-[#C2A14E]" : "text-stone-500"}`} style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
      <p
        className={`mt-3 whitespace-nowrap font-bold leading-none tracking-normal ${
          emphasized ? "text-[clamp(22px,2.8vw,36px)] text-[#C2A14E]" : "text-[clamp(20px,2.4vw,32px)] text-stone-100"
        }`}
        style={{ fontFamily: font.oswald }}
      >
        {value}
      </p>
    </div>
  );
}

function FieldMathOperator({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center border-b border-[rgba(245,242,234,0.14)] px-0 py-2 md:border-x md:border-b-0 md:px-3 md:py-0">
      <span className="text-[clamp(18px,2vw,26px)] font-bold leading-none text-[#C2A14E]" style={{ fontFamily: font.oswald }}>
        {children}
      </span>
    </div>
  );
}

function GlobalUrgencySection() {
  const populationBarRef = useRef<HTMLDivElement>(null);
  const [isPopulationBarArmed, setIsPopulationBarArmed] = useState(false);

  useEffect(() => {
    const bar = populationBarRef.current;
    if (!bar) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      setIsPopulationBarArmed(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsPopulationBarArmed(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.35 });

    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-labelledby="field-intelligence-title" className="relative overflow-hidden border-y border-stone-900 bg-[#0D0D0D] text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.026),transparent_18%,transparent_82%,rgba(255,255,255,0.02)),radial-gradient(circle_at_50%_0%,rgba(194,161,78,0.052),transparent_28%),linear-gradient(135deg,#0D0D0D,#0a0a0b_48%,#0D0D0D)]" />
      <div className="relative">
        <Reveal>
          <div className="mx-auto max-w-[1060px] px-5 pt-14 sm:px-6 md:pt-[72px]">
            <div className="text-center">
              <div className="mx-auto mb-6 h-px w-9 bg-[#C2A14E]" />
              <p id="field-intelligence-title" className="text-[11px] font-medium uppercase leading-relaxed tracking-[0.22em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani }}>
                Field Intelligence <span className="text-stone-500">// Est. 07.04.1776 · Continental United States</span>
              </p>
            </div>
          </div>
        </Reveal>

        <FieldBeat number="01" label="Situation" title="THE DECLINE IS REAL.">
          <Reveal delay={120}>
            <p className="mx-auto max-w-[620px] text-center text-[clamp(1rem,1.8vw,1.2rem)] font-semibold leading-relaxed text-stone-200">
              In one generation, America became a mission field.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-12 grid grid-cols-[1.5fr_1fr_1fr] border border-[rgba(245,242,234,0.14)]">
              <div className="relative grid min-h-[136px] grid-rows-[1fr_auto_46px_1fr] border-r border-[rgba(245,242,234,0.14)] px-2 py-5 text-center before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-[#C2A14E] sm:min-h-[150px] sm:grid-rows-[1fr_auto_50px_1fr] sm:px-5 sm:py-7">
                <div className="row-start-2 flex translate-y-[1.5px] flex-nowrap items-baseline justify-center gap-x-1 sm:gap-x-4">
                  <span className="relative inline-block text-[clamp(18px,5.8vw,36px)] font-bold leading-[0.9] text-stone-500 after:absolute after:left-0 after:right-0 after:top-[52%] after:h-[3px] after:rotate-[-7deg] after:bg-[#C2A14E]" style={{ fontFamily: font.oswald }}>
                    76%
                  </span>
                  <span className="text-[clamp(9px,3vw,20px)] font-semibold leading-none text-[#C2A14E]" style={{ fontFamily: font.rajdhani }} aria-hidden="true">
                    &rarr;
                  </span>
                  <span className="text-[clamp(24px,6.4vw,46px)] font-bold leading-[0.9] text-[#C2A14E]" style={{ fontFamily: font.oswald }}>
                    64%
                  </span>
                </div>
                <p className="row-start-3 mx-auto mt-3 flex max-w-[7rem] items-start justify-center text-[8px] font-semibold uppercase leading-[1.55] tracking-[0.12em] text-stone-500 sm:max-w-[14rem] sm:text-[10px] sm:tracking-[0.22em]" style={{ fontFamily: font.rajdhani }}>
                  Americans identifying as Christian
                </p>
              </div>
              <div className="grid min-h-[136px] grid-rows-[1fr_auto_46px_1fr] border-r border-[rgba(245,242,234,0.14)] px-1 py-5 text-center sm:min-h-[150px] sm:grid-rows-[1fr_auto_50px_1fr] sm:px-5 sm:py-7">
                <span className="row-start-2 justify-self-center text-[clamp(24px,6.4vw,46px)] font-bold leading-[0.9] text-stone-100" style={{ fontFamily: font.oswald }}>
                  30%
                </span>
                <span className="row-start-3 mx-auto mt-3 flex max-w-[7rem] items-start justify-center text-[8px] font-semibold uppercase leading-[1.55] tracking-[0.12em] text-stone-500 sm:max-w-[14rem] sm:text-[10px] sm:tracking-[0.22em]" style={{ fontFamily: font.rajdhani }}>
                  Adults attending church weekly
                </span>
              </div>
              <div className="grid min-h-[136px] grid-rows-[1fr_auto_46px_1fr] px-1 py-5 text-center sm:min-h-[150px] sm:grid-rows-[1fr_auto_50px_1fr] sm:px-5 sm:py-7">
                <span className="row-start-2 justify-self-center text-[clamp(24px,6.4vw,46px)] font-bold leading-[0.9] text-stone-100" style={{ fontFamily: font.oswald }}>
                  52%
                </span>
                <span className="row-start-3 mx-auto mt-3 flex max-w-[7rem] items-start justify-center text-[8px] font-semibold uppercase leading-[1.55] tracking-[0.12em] text-stone-500 sm:max-w-[14rem] sm:text-[10px] sm:tracking-[0.22em]" style={{ fontFamily: font.rajdhani }}>
                  Gen Z identifying as Christian. Lowest measured.
                </span>
              </div>
            </div>
          </Reveal>
        </FieldBeat>

        <FieldBeat number="02" label="Terrain" title="THE MISSION FIELD IS HERE.">
          <Reveal delay={120}>
            <div className="text-center text-[clamp(28px,3.8vw,46px)] font-bold leading-[0.95] tracking-normal text-stone-100" style={{ fontFamily: font.oswald }}>
              335,000,000
            </div>
            <p className="mt-2 text-center text-[12px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani }}>
              The mission field: <span className="text-stone-500">every person in America</span>
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div ref={populationBarRef} className="mt-8 md:mt-10">
              <div
                className="flex h-[52px] overflow-hidden border border-[rgba(245,242,234,0.14)]"
                role="img"
                aria-label="U.S. population by religious identity: 64 percent Christian, 7 percent other religions, 29 percent unaffiliated"
              >
                <div
                  className="h-full bg-[#C2A14E] transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
                  style={{ width: isPopulationBarArmed ? "64%" : "0%" }}
                />
                <div
                  className="h-full bg-[#3D3A33] transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
                  style={{ width: isPopulationBarArmed ? "7%" : "0%" }}
                />
                <div
                  className="h-full bg-[#2A2A2E] transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
                  style={{ width: isPopulationBarArmed ? "29%" : "0%" }}
                />
              </div>

              <div className="grid border-x border-b border-[rgba(245,242,234,0.14)] md:grid-cols-[1.7fr_1fr_1fr]">
                <div className="grid min-h-[116px] grid-rows-[auto_1fr_auto] gap-1 border-b border-[rgba(245,242,234,0.14)] p-5 shadow-[inset_2px_0_0_#C2A14E] md:border-b-0 md:shadow-[inset_0_2px_0_#C2A14E]">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani }}>
                      Christians
                    </span>
                    <span className="inline-flex h-[18px] items-center border border-[rgba(194,161,78,0.45)] px-2 text-[9px] font-semibold uppercase leading-none tracking-[0.2em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani }}>
                      The Opportunity
                    </span>
                  </div>
                  <div className="self-end text-[clamp(22px,2.4vw,28px)] font-bold leading-none text-[#C2A14E]" style={{ fontFamily: font.oswald }}>
                    214M
                  </div>
                  <p className="truncate text-sm leading-relaxed text-stone-500">
                    64% of U.S. population
                  </p>
                </div>

                <div className="grid min-h-[116px] grid-rows-[auto_1fr_auto] gap-1 border-b border-[rgba(245,242,234,0.14)] p-5 md:border-b-0 md:border-l">
                  <span className="truncate text-[10px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                    Other Religions
                  </span>
                  <div className="self-end text-[clamp(18px,1.9vw,22px)] font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                    23M
                  </div>
                  <p className="truncate text-sm leading-relaxed text-stone-500">
                    7% of U.S. population
                  </p>
                </div>

                <div className="grid min-h-[116px] grid-rows-[auto_1fr_auto] gap-1 p-5 md:border-l">
                  <span className="truncate text-[10px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                    Unaffiliated
                  </span>
                  <div className="self-end text-[clamp(18px,1.9vw,22px)] font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                    98M
                  </div>
                  <p className="truncate text-sm leading-relaxed text-stone-500">
                    29% and growing
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </FieldBeat>

        <FieldBeat number="03" label="Opportunity" title="THE OPPORTUNITY IS MASSIVE.">
          <Reveal delay={120}>
            <p className="mx-auto max-w-[620px] text-center text-[clamp(1rem,1.8vw,1.2rem)] font-semibold leading-relaxed text-stone-200">
              We don&apos;t need every Christian to become a pastor. We need every Christian to become a disciple-maker.
            </p>
            <p className="mx-auto mt-2 max-w-[620px] text-center text-[clamp(0.95rem,1.6vw,1.0625rem)] leading-relaxed text-stone-500">
              There are approximately 214 million Christians in America today. If every Christian intentionally discipled one person, the impact would exceed the population of the United States.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 grid border border-[rgba(245,242,234,0.14)] md:mt-11 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.15fr)]">
              <FieldMathCard label="Christians Today" value="214,000,000" />
              <FieldMathOperator>+</FieldMathOperator>
              <FieldMathCard label="If Each Discipled One" value="214,000,000" />
              <FieldMathOperator>=</FieldMathOperator>
              <FieldMathCard emphasized label="Total Impact" value="428,000,000" last />
            </div>
          </Reveal>
        </FieldBeat>

        <Reveal>
          <div className="mx-auto max-w-[1060px] px-5 py-5 pb-16 sm:px-6 md:pb-20">
            <p className="break-words text-center text-[10px] font-medium uppercase leading-relaxed tracking-[0.16em] text-stone-500 md:tracking-[0.2em]" style={{ fontFamily: font.rajdhani }}>
              Sources <span className="text-[#C2A14E]">//</span> Pew Research Center &middot; Gallup &middot; Barna Group &middot; U.S. Census Bureau
            </p>
          </div>
        </Reveal>
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
    <div className="relative border border-stone-800/60 rounded-sm overflow-hidden" style={{background:"rgba(13,13,13,0.8)"}}>
      <div className="absolute inset-0 pointer-events-none" style={{background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)"}}/>
      <div className="border-b border-stone-800/60 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-usam-success shadow-[0_0_14px_rgba(15,157,118,0.38)]"/>
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
                  <span
                    className={`inline-flex rounded-sm border px-2 py-1 text-xs ${
                      r.status === "Active"
                        ? "border-[rgba(15,157,118,0.24)] bg-[rgba(15,157,118,0.16)] text-usam-success"
                        : "border-[rgba(194,161,78,0.24)] bg-[rgba(194,161,78,0.16)] text-usam-gold"
                    }`}
                    style={{fontFamily:font.rajdhani}}
                  >
                    {r.status}
                  </span>
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
  const [shouldPreviewJoinMission, setShouldPreviewJoinMission] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      return;
    }

    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const isRecoveryLink = hashParams.get("type") === "recovery"
      || Boolean(hashParams.get("access_token") && hashParams.get("refresh_token"));

    if (hashParams.get("type") === "recovery") {
      window.location.replace(`/update-password${hash}`);
      return;
    }

    if (isRecoveryLink) {
      window.location.replace(`/auth/session${hash}`);
    }
  }, []);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    setShouldPreviewJoinMission(new URLSearchParams(window.location.search).get("previewForm") === "join_mission_interest");
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
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at 35% 45%,rgba(194,161,78,0.04) 0%,transparent 60%)"}}/>
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at center,transparent 40%,#0D0D0D 100%)"}}/>
        <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at center,rgba(13,13,13,0.66) 0%,rgba(13,13,13,0.48) 24%,rgba(13,13,13,0.14) 52%,transparent 72%)"}}/>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <Reveal>
            <div className="flex items-center justify-center gap-3 mb-9">
              <div className="w-9 h-[1.5px] bg-usam-gold/45"/><span className="tactical-label uppercase" style={{fontFamily:font.rajdhani}}>ACTIVE DEPLOYMENT</span><div className="w-9 h-[1.5px] bg-usam-gold/45"/>
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
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{background:"linear-gradient(transparent,#0D0D0D)"}}/>
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
      <section className="py-20 md:py-32 px-6" style={{background:"#0D0D0D"}}>
        <div className="max-w-6xl mx-auto">
          <Reveal><SectionHeading overline="STRATEGIC EXPANSION" headline="FROM HERE TO THE NATIONS"><p>It starts here.<br/>But it does not end here.</p></SectionHeading></Reveal>
          <Reveal delay={150}>
            <div className="mt-7 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="animate-pulse text-[11px] text-[#C2A14E] shadow-[0_0_10px_rgba(194,161,78,0.55)]" aria-hidden="true">
                  ●
                </span>
                <span className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  ORIGIN
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  STATUS:
                </span>
                <span className="inline-flex rounded-sm border border-[rgba(15,157,118,0.24)] bg-[rgba(15,157,118,0.16)] px-2 py-1 text-[11px] text-usam-success" style={{ fontFamily: font.rajdhani, fontWeight: 500 }}>
                  ACTIVE
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={200}><div className="mt-5 mx-auto"><ExpansionMap/></div></Reveal>
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
                <div className="p-8 md:p-10 h-full" style={{background:"#0D0D0D"}}>
                  <span className="tactical-gold-label text-xs tracking-[0.26em] block mb-4" style={{fontFamily:font.rajdhani}}>{c.n}</span>
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
      <section className="py-28 md:py-40 px-6" style={{background:"#0D0D0D"}}>
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
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at center top,rgba(194,161,78,0.03) 0%,transparent 50%)"}}/>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <Reveal><div className="w-12 h-px bg-stone-700 mx-auto"/></Reveal>
          <Reveal delay={100}><h2 className="mt-12 text-5xl md:text-7xl font-bold text-stone-100 tracking-tight" style={{fontFamily:font.oswald}}>YOU WERE SENT</h2></Reveal>
          <Reveal delay={250}><div className="mt-8 space-y-1 text-stone-400 text-lg"><p>The question is not if.</p><p className="text-stone-200">It is when.</p></div></Reveal>
          <Reveal delay={400}><div className="mt-12"><JoinMissionInterestModal initialOpen={shouldPreviewJoinMission}>Join the Mission</JoinMissionInterestModal></div></Reveal>
        </div>
      </section>
    </main>
  );
}
