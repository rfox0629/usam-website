"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const tableCenter = { x: 264, y: 246 };
  const seats = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return { x: tableCenter.x + Math.cos(angle) * 142, y: tableCenter.y + Math.sin(angle) * 96 };
  });
  const worldOutlines = [
    { d: "M80,165 L78,158 L76,148 L78,138 L82,128 L88,118 L96,108 L106,98 L118,90 L132,84 L148,78 L165,74 L182,72 L200,72 L218,74 L238,72 L258,68 L278,64 L298,62 L318,60 L338,58 L358,56 L378,54 L398,56 L418,60 L436,64 L452,68 L466,74 L478,82 L486,92 L490,104 L492,118 L490,130 L486,140 L480,148 L472,134 L466,120 L460,110 L454,98 L450,82 L446,78 L440,80 L436,84 L432,88 L428,84 L426,78 L422,74 L416,72 L410,74 L406,78 L404,82 L400,78 L398,72 L396,68 L392,64 L386,62 L380,64 L376,68 L374,72 L370,68 L365,64 L360,64 L356,68 L352,72 L346,66 L340,64 L336,66 L332,70 L328,74 L322,70 L316,68 L310,70 L305,74 L300,78 L294,74 L288,72 L282,72 L278,76 L272,78 L266,76 L258,76 L252,78 L248,82 L242,84 L235,82 L228,82 L222,84 L214,86 L208,88 L204,92 L198,94 L192,92 L184,92 L178,94 L172,96 L165,98 L158,100 L154,104 L150,108 L145,110 L138,108 L134,110 L130,115 L125,118 L118,118 L112,115 L108,118 L108,124 L105,128 L100,132 L96,138 L96,145 L92,148 L86,155 L82,160 L80,165", op: 0.18 },
    { d: "M80,165 L86,166 L92,168 L98,168 L104,166 L110,164 L116,162 L122,162 L128,164 L134,166 L138,170 L140,176 L138,182 L134,188 L128,194 L122,200 L116,206 L112,212 L108,218 L106,224 L108,230 L112,236 L118,240 L125,242 L132,244 L140,248 L148,252 L156,256 L162,260 L168,266 L172,272 L176,278 L180,284 L184,290 L188,296 L192,300 L198,304 L204,306 L210,308 L216,310 L220,314 L224,318 L226,324", op: 0.16 },
    { d: "M226,324 L232,322 L238,318 L244,314 L252,312 L260,314 L268,318 L274,324 L280,330 L284,338 L288,346 L290,354 L292,362 L290,370 L288,378 L284,386 L280,394 L274,400 L268,406 L264,414 L260,422 L254,428 L248,432 L242,436 L236,438 L230,436 L224,432 L220,426 L216,418 L214,410 L212,402 L212,394 L214,386 L216,378 L218,370 L218,362 L216,354 L214,346 L214,338 L216,330 L220,326 L224,322", op: 0.16 },
    { d: "M528,88 L524,82 L520,78 L516,74 L520,68 L526,64 L532,60 L540,58 L548,56 L556,54 L562,52 L568,54 L574,58 L580,62 L586,66 L590,72 L594,78 L598,84 L602,78 L606,72 L612,68 L618,72 L622,78 L626,84 L630,78 L634,72 L640,68 L646,72 L650,78 L652,84 L656,90 L660,96 L662,102 L658,108 L654,114 L648,118 L642,122 L636,124 L630,128 L624,132 L618,128 L614,124 L610,120 L606,124 L602,128 L598,132 L592,136 L586,134 L582,130 L578,126 L574,122 L570,126 L566,130 L560,134 L554,130 L550,126 L546,122 L540,118 L534,114 L530,108 L528,102 L526,96 L528,92", op: 0.24 },
    { d: "M508,78 L512,72 L516,68 L520,72 L522,78 L520,84 L516,88 L512,92 L508,88 L506,82 Z M500,82 L504,78 L508,82 L506,88 L502,90 L498,86 Z", op: 0.18 },
    { d: "M548,160 L554,156 L562,152 L570,150 L578,150 L586,152 L594,156 L600,162 L606,168 L612,176 L616,184 L620,194 L622,204 L624,214 L624,226 L622,238 L620,248 L616,258 L612,268 L606,276 L600,284 L594,290 L586,296 L580,300 L574,304 L566,308 L560,310 L554,308 L548,304 L542,298 L536,290 L532,282 L528,272 L526,262 L524,252 L524,240 L526,228 L528,218 L530,208 L534,198 L538,188 L542,178 L546,168", op: 0.18 },
    { d: "M600,132 L608,128 L616,126 L624,128 L632,132 L640,138 L646,144 L650,152 L652,160 L650,168 L646,174 L640,178 L634,180 L628,178 L622,174 L616,176 L612,180 L608,176 L604,170 L600,164 L596,158 L594,150 L596,142", op: 0.22 },
    { d: "M660,52 L670,48 L682,44 L696,42 L712,40 L728,42 L744,44 L760,48 L776,52 L792,58 L806,64 L818,72 L828,80 L836,90 L842,100 L846,112 L848,124 L846,136 L842,148 L836,158 L828,166 L818,172 L806,176 L792,178 L778,180 L764,178 L752,174 L742,168 L734,160 L728,152 L722,144 L716,136 L712,128 L710,138 L706,148 L700,156 L694,164 L688,170 L682,174 L676,178 L670,180 L664,176 L660,170 L656,164 L654,156 L656,148 L660,140 L662,132 L660,124 L656,116 L654,108 L656,100 L660,92 L662,84 L660,76 L658,68 L660,60", op: 0.2 },
    { d: "M700,156 L706,160 L712,166 L716,174 L720,182 L722,192 L722,202 L720,212 L716,220 L712,226 L706,230 L700,232 L694,228 L688,222 L684,214 L682,206 L682,196 L684,188 L688,180 L692,172 L696,164", op: 0.16 },
    { d: "M852,102 L856,96 L860,92 L864,96 L866,102 L864,108 L860,114 L856,118 L852,122 L848,118 L846,112 L848,106 Z M858,118 L862,114 L866,118 L864,124 L860,126 L856,122 Z", op: 0.16 },
    { d: "M790,310 L800,306 L812,302 L824,300 L836,302 L848,306 L858,312 L866,320 L872,330 L874,340 L872,350 L868,358 L862,364 L854,368 L844,370 L834,370 L824,368 L814,364 L806,358 L800,350 L796,340 L794,330 L792,320", op: 0.16 },
    { d: "M894,362 L898,356 L902,352 L906,356 L906,362 L902,368 L898,370 L894,366 Z M900,372 L904,368 L908,372 L906,378 L902,380 L898,376 Z", op: 0.14 },
    { d: "M752,232 L758,228 L766,228 L772,232 L776,238 L772,242 L766,244 L758,242 L754,238 Z M778,236 L784,234 L790,236 L792,240 L788,244 L782,244 L778,240 Z M796,240 L802,238 L808,242 L806,248 L800,248 L796,244 Z", op: 0.14 },
  ];
  const missionNodes = [
    { label: "JERUSALEM", sub: "PHASE 01", x: 676, y: 156 },
    { label: "JUDEA", sub: "PHASE 02", x: 706, y: 168 },
    { label: "SAMARIA", sub: "PHASE 03", x: 742, y: 150 },
    { label: "TO THE ENDS OF THE EARTH", sub: "PHASE 04", x: 850, y: 316 },
  ];
  const missionRoutes = [
    { x1: tableCenter.x + 146, y1: tableCenter.y, x2: 676, y2: 156 },
    { x1: 676, y1: 156, x2: 706, y2: 168 },
    { x1: 706, y1: 168, x2: 742, y2: 150 },
    { x1: 742, y1: 150, x2: 850, y2: 316 },
  ];

  return (
    <div className="relative">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-[10px] tracking-[0.4em] text-stone-600 uppercase" style={{ fontFamily: font.rajdhani }}>
          DEPLOYMENT ORIGIN — LIVE
        </span>
      </div>
      <div className="absolute top-3 right-4 z-10 text-right">
        <span className="text-[10px] tracking-[0.3em] text-stone-700 block" style={{ fontFamily: font.rajdhani }}>
          STATUS: ACTIVE
        </span>
      </div>
      <svg viewBox="0 0 960 460" className="w-full h-auto">
        <defs>
          <radialGradient id="tableGlow" cx="50%" cy="52%" r="35%">
            <stop offset="0%" stopColor="#C9A24A" stopOpacity={0.07} />
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
        </defs>
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`gv${i}`} x1={i * 50} y1={0} x2={i * 50} y2={460} stroke="#0c0c0c" strokeWidth={0.3} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`gh${i}`} x1={0} y1={i * 50} x2={960} y2={i * 50} stroke="#0c0c0c" strokeWidth={0.3} />
        ))}
        <rect x={0} y={0} width={960} height={460} fill="url(#tableGlow)" />

        {[92, 118, 144].map((r, i) => (
          <ellipse key={`ring${i}`} cx={tableCenter.x} cy={tableCenter.y} rx={r} ry={r * 0.62} fill="none" stroke="#C9A24A" strokeWidth={0.35} opacity={0.08 - i * 0.018} strokeDasharray="5,9">
            <animate attributeName="opacity" values={`${0.08 - i * 0.018};${0.025 - i * 0.005};${0.08 - i * 0.018}`} dur={`${4.5 + i * 0.8}s`} repeatCount="indefinite" />
          </ellipse>
        ))}

        <g transform="translate(-118 0)">
          <rect x={336} y={112} width={288} height={276} rx={14} fill="#050505" stroke="#2f2a20" strokeWidth={1.2} />
          <rect x={348} y={124} width={264} height={252} rx={10} fill="none" stroke="#1f1b14" strokeWidth={0.65} opacity={0.8} />

          <line x1={424} y1={88} x2={536} y2={88} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={12} strokeLinecap="round" />
          <line x1={424} y1={412} x2={536} y2={412} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={12} strokeLinecap="round" />
          <line x1={306} y1={170} x2={306} y2={250} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={12} strokeLinecap="round" />
          <line x1={654} y1={170} x2={654} y2={250} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={12} strokeLinecap="round" />
          <line x1={306} y1={282} x2={306} y2={362} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={12} strokeLinecap="round" />
          <line x1={654} y1={282} x2={654} y2={362} stroke="#f5f5f4" strokeOpacity={0.95} strokeWidth={12} strokeLinecap="round" />

          <ellipse cx={480} cy={250} rx={92} ry={54} fill="url(#centerPulse)" filter="url(#softGlow)">
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="4s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {seats.map((s, i) => {
          const angle = (i / 8) * 360;
          return (
            <g key={`seat${i}`}>
              <rect x={s.x - 9} y={s.y - 6} width={18} height={12} rx={3} fill="none" stroke="#2a2a2a" strokeWidth={0.6} opacity={0.4} transform={`rotate(${angle}, ${s.x}, ${s.y})`} />
              <circle cx={s.x} cy={s.y} r={1} fill="#C9A24A" opacity={0.2}>
                <animate attributeName="opacity" values="0.15;0.35;0.15" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        <text x={tableCenter.x} y={176} textAnchor="middle" fill="#f5f5f4" fontSize={24} letterSpacing="0.14em" style={{ fontFamily: font.oswald }}>
          THE
        </text>
        <text x={tableCenter.x} y={236} textAnchor="middle" fill="#f5f5f4" fontSize={56} letterSpacing="0.06em" style={{ fontFamily: font.oswald }}>
          TABLE
        </text>
        <text x={tableCenter.x} y={286} textAnchor="middle" fill="#f5f5f4" fontSize={32} letterSpacing="0.12em" style={{ fontFamily: font.oswald }}>
          ORIGIN
        </text>
        <text x={tableCenter.x} y={332} textAnchor="middle" fill="#C9A24A" fontSize={11} letterSpacing="0.34em" style={{ fontFamily: font.rajdhani }}>
          IT STARTS HERE
        </text>
        <text x={tableCenter.x} y={430} textAnchor="middle" fill="#78716c" fontSize={9} letterSpacing="0.32em" style={{ fontFamily: font.rajdhani }}>
          MOVEMENT BEGINS AT THE TABLE
        </text>

        <g transform="translate(458 44) scale(0.46)">
          {worldOutlines.map((shape, i) => (
            <path key={`world${i}`} d={shape.d} fill="none" stroke="#3f3f46" strokeWidth={1.4} opacity={shape.op} />
          ))}
        </g>

        {missionRoutes.map((r, i) => {
          const dx = r.x2 - r.x1;
          const dy = r.y2 - r.y1;
          const mx = (r.x1 + r.x2) / 2;
          const my = (r.y1 + r.y2) / 2;
          const cx1 = mx - dy * 0.08;
          const cy1 = my + dx * 0.08;
          const p = `M${r.x1},${r.y1} Q${cx1},${cy1} ${r.x2},${r.y2}`;
          return (
            <g key={`route${i}`}>
              <path d={p} fill="none" stroke="#C9A24A" strokeWidth={0.75} opacity={0.18} strokeDasharray="4,8">
                <animate attributeName="strokeDashoffset" from="0" to="-24" dur={`${3.4 + i * 0.5}s`} repeatCount="indefinite" />
              </path>
              <circle r={1.8} fill="#C9A24A" opacity={0}>
                <animateMotion dur={`${4.2 + i * 0.7}s`} repeatCount="indefinite" path={p} />
                <animate attributeName="opacity" values="0;0.7;0" dur={`${4.2 + i * 0.7}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        <circle cx={tableCenter.x + 146} cy={tableCenter.y} r={4.2} fill="#C9A24A" opacity={0.9} filter="url(#softGlow)" />
        <text x={tableCenter.x + 146} y={tableCenter.y - 16} textAnchor="middle" fill="#C9A24A" fontSize={9} letterSpacing="0.2em" style={{ fontFamily: font.oswald }}>
          SEND
        </text>

        {missionNodes.map((node, i) => (
          <g key={`node${i}`}>
            <circle cx={node.x} cy={node.y} r={8} fill="none" stroke="#C9A24A" strokeWidth={0.4} opacity={0.14}>
              <animate attributeName="r" values="6;12;6" dur={`${3.8 + i * 0.6}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.14;0;0.14" dur={`${3.8 + i * 0.6}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={node.x} cy={node.y} r={2.6} fill="#C9A24A" opacity={0.85} />
            <text x={node.x} y={node.y - 14} textAnchor="middle" fill="#C9A24A" fontSize={8.5} letterSpacing="0.18em" style={{ fontFamily: font.oswald }}>
              {node.label}
            </text>
            <text x={node.x} y={node.y + 13} textAnchor="middle" fill="#57534e" fontSize={6} letterSpacing="0.24em" style={{ fontFamily: font.rajdhani }}>
              {node.sub}
            </text>
          </g>
        ))}

        <text x={742} y={394} textAnchor="middle" fill="#78716c" fontSize={8.5} letterSpacing="0.28em" style={{ fontFamily: font.rajdhani }}>
          FROM THE TABLE TO THE NATIONS
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
