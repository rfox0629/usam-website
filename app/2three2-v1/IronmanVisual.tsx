import React, { useId } from "react";
import { font, t2 } from "./theme";

/**
 * Race With Purpose — Ironman 70.3 campaign visual.
 *
 * The brief is explicit that we must not show ordinary cyclists and claim they
 * are wearing the custom kit. Since no photography of the kit exists, this is
 * drawn as a deliberate branded composition: three athletes riding together in
 * coordinated black-and-gold 2THREE2 kits, paired with a flat kit spec that
 * renders the intended artwork at legible size. The illustration is the concept
 * art; the spec is the buildable document behind it.
 *
 * Per the founder's first-mockup restraint, the phrase "Deploying Missionaries
 * Across America" is NOT placed on the kit. The lower back is drawn as an
 * intentionally blank reserved zone and annotated as a future option.
 */

const KIT_BLACK = "#0B0E13";
const KIT_BLACK_HI = "#1B212C";
const GOLD = "#D4A855";
const GOLD_HI = "#F2D294";
const SKIN = "#C08D63";

/** Two-bone IK: returns the joint position between `a` and `b`. */
function solveJoint(
  a: readonly [number, number],
  b: readonly [number, number],
  l1: number,
  l2: number,
  sign: 1 | -1,
): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.001) || 0.001;
  const a1 = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a1 * a1));
  const mx = a[0] + (a1 * dx) / d;
  const my = a[1] + (a1 * dy) / d;
  return [mx + sign * h * (-dy / d), my + sign * h * (dx / d)];
}

/** Point some fraction along a segment, used for the short-hem gold band. */
function along(a: readonly [number, number], b: readonly [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function TriRider({
  crankAngle,
  detail,
  id,
}: {
  /** degrees; drives both pedals so no two riders are on the same stroke */
  crankAngle: number;
  /** the lead rider carries the full branding; rear riders stay simpler */
  detail: "full" | "simple";
  id: string;
}) {
  const wheelR = 30;
  const bb: [number, number] = [40, 2];
  const hip: [number, number] = [20, -56];
  const shoulder: [number, number] = [66, -72];
  const crankR = 15;

  const rad = (crankAngle * Math.PI) / 180;
  const footNear: [number, number] = [bb[0] + crankR * Math.cos(rad), bb[1] + crankR * Math.sin(rad)];
  const footFar: [number, number] = [bb[0] - crankR * Math.cos(rad), bb[1] - crankR * Math.sin(rad)];
  const kneeNear = solveJoint(hip, footNear, 34, 34, -1);
  const kneeFar = solveJoint(hip, footFar, 34, 34, -1);
  const hemNear = [along(hip, kneeNear, 0.74), along(hip, kneeNear, 0.94)] as const;

  // torso quad, used for both the suit shape and the branding baseline
  const ax = shoulder[0] - hip[0];
  const ay = shoulder[1] - hip[1];
  const alen = Math.hypot(ax, ay);
  const px = -ay / alen;
  const py = ax / alen;
  const torsoAngle = (Math.atan2(ay, ax) * 180) / Math.PI;
  // +perp is the belly side (rider leans forward, so the back is the upper edge)
  const hipBelly: [number, number] = [hip[0] + px * 10.5, hip[1] + py * 10.5];
  const hipBack: [number, number] = [hip[0] - px * 10.5, hip[1] - py * 10.5];
  const shBelly: [number, number] = [shoulder[0] + px * 9, shoulder[1] + py * 9];
  const shBack: [number, number] = [shoulder[0] - px * 9, shoulder[1] - py * 9];
  const torsoMid: [number, number] = [(hip[0] + shoulder[0]) / 2, (hip[1] + shoulder[1]) / 2];

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-disc`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#1A212C" />
          <stop offset="50%" stopColor="#0B0F15" />
          <stop offset="100%" stopColor="#212936" />
        </linearGradient>
      </defs>

      {/* ---- far-side leg, behind the frame ---- */}
      <path
        d={`M${hip[0]},${hip[1]} L${kneeFar[0]},${kneeFar[1]}`}
        stroke="#161C26"
        strokeLinecap="round"
        strokeWidth={11.5}
      />
      <path
        d={`M${kneeFar[0]},${kneeFar[1]} L${footFar[0]},${footFar[1]}`}
        stroke="#7A5A40"
        strokeLinecap="round"
        strokeWidth={7}
      />

      {/* ---- wheels ---- */}
      {/* rear disc wheel — the detail that reads "triathlon" rather than "road bike" */}
      <circle cx={0} cy={0} fill={`url(#${id}-disc)`} r={wheelR} />
      <circle cx={0} cy={0} fill="none" r={wheelR} stroke={GOLD} strokeOpacity={0.8} strokeWidth={1.8} />
      <circle cx={0} cy={0} fill="none" r={wheelR - 7} stroke={GOLD} strokeOpacity={0.22} strokeWidth={0.9} />
      <circle cx={0} cy={0} fill="#39424F" r={3.4} />
      {/* front deep-section rim */}
      <circle cx={108} cy={0} fill="none" r={wheelR - 3.5} stroke="#151B24" strokeWidth={8} />
      <circle cx={108} cy={0} fill="none" r={wheelR} stroke={GOLD} strokeOpacity={0.75} strokeWidth={1.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            stroke="#4A5563"
            strokeWidth={0.8}
            x1={108}
            x2={108 + Math.cos(a) * (wheelR - 8)}
            y1={0}
            y2={Math.sin(a) * (wheelR - 8)}
          />
        );
      })}
      <circle cx={108} cy={0} fill="#39424F" r={3} />

      {/* ---- frame ---- */}
      <g fill="none" stroke="#2E3846" strokeLinecap="round" strokeWidth={6}>
        <path d="M0,0 L40,2" />
        <path d="M0,0 L18,-46" />
        <path d="M40,2 L18,-46" />
        <path d="M40,2 L88,-24" />
        <path d="M18,-46 L93,-40" />
        <path d="M88,-24 L108,0" />
      </g>
      {/* gold pinstripe picks the frame out of the dark road */}
      <g fill="none" stroke={GOLD} strokeLinecap="round" strokeOpacity={0.8} strokeWidth={1.5}>
        <path d="M40,2 L88,-24" />
        <path d="M18,-46 L93,-40" />
      </g>
      {/* chainring + crank */}
      <circle cx={40} cy={2} fill="none" r={10} stroke={GOLD} strokeOpacity={0.8} strokeWidth={1.6} />
      <path
        d={`M${footNear[0]},${footNear[1]} L${bb[0]},${bb[1]} L${footFar[0]},${footFar[1]}`}
        fill="none"
        stroke="#5A6472"
        strokeLinecap="round"
        strokeWidth={2.6}
      />
      {/* saddle + cockpit */}
      <path d="M6,-48 L28,-47" stroke="#2E3846" strokeLinecap="round" strokeWidth={5} />
      <path d="M90,-45 L128,-56" stroke="#4A5563" strokeLinecap="round" strokeWidth={3.4} />
      <path d="M86,-40 L100,-34" stroke="#4A5563" strokeLinecap="round" strokeWidth={3.4} />

      {/* ---- rider ---- */}
      {/* far arm, tucked under */}
      <path d="M63,-70 L86,-55 L124,-59" fill="none" stroke="#10161E" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6.4} />

      {/* tri-suit torso */}
      <path
        d={`M${hipBelly[0]},${hipBelly[1]} L${shBelly[0]},${shBelly[1]} L${shBack[0]},${shBack[1]} L${hipBack[0]},${hipBack[1]} Z`}
        fill={KIT_BLACK}
      />
      {/* gold panel down the belly side, leaving the back clear for the wordmark */}
      <path
        d={`M${hipBelly[0]},${hipBelly[1]} L${shBelly[0]},${shBelly[1]}
            L${shBelly[0] - px * 3.2},${shBelly[1] - py * 3.2} L${hipBelly[0] - px * 3.8},${hipBelly[1] - py * 3.8} Z`}
        fill={GOLD}
      />

      <g transform={`translate(${torsoMid[0]},${torsoMid[1]}) rotate(${torsoAngle})`}>
        <text
          fill={GOLD_HI}
          fontFamily={font.display}
          fontSize={detail === "full" ? 12 : 10}
          fontWeight={700}
          letterSpacing={0.5}
          textAnchor="middle"
          y={2}
        >
          2THREE2
        </text>
        {/* Only the wordmark goes on the illustrated kit. At this scale the
            campaign line collapses into an unreadable smudge between the thigh
            and the arm — it is rendered legibly on the kit spec instead. */}
      </g>

      {/* near arm on the aerobar pads */}
      <path
        d={`M${shoulder[0]},${shoulder[1]} L88,-53 L126,-57`}
        fill="none"
        stroke={KIT_BLACK}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={7.6}
      />
      {/* short black sleeve ending in a gold cuff, then bare forearm */}
      <path d="M96,-54 L100,-54.5" stroke={GOLD} strokeLinecap="round" strokeWidth={7} />
      <path d="M102,-54.6 L124,-57" stroke={SKIN} strokeLinecap="round" strokeWidth={6.2} />
      <circle cx={127} cy={-57.4} fill={SKIN} r={3.4} />

      {/* near leg: black short, gold hem band, bare shin, gold shoe */}
      <path
        d={`M${hip[0]},${hip[1]} L${kneeNear[0]},${kneeNear[1]}`}
        stroke={KIT_BLACK}
        strokeLinecap="round"
        strokeWidth={12.5}
      />
      <path
        d={`M${hemNear[0][0]},${hemNear[0][1]} L${hemNear[1][0]},${hemNear[1][1]}`}
        stroke={GOLD}
        strokeWidth={12.5}
      />
      <path
        d={`M${kneeNear[0]},${kneeNear[1]} L${footNear[0]},${footNear[1]}`}
        stroke={SKIN}
        strokeLinecap="round"
        strokeWidth={7.6}
      />
      <circle cx={footNear[0]} cy={footNear[1]} fill={GOLD_HI} r={4.2} />

      {/* aero helmet: teardrop shell with a trailing tail */}
      <path d="M74,-68 L64,-63 L84,-64 Z" fill={KIT_BLACK} />
      <path
        d="M95,-73 C95,-80.5 89.5,-85 82,-85 C73.5,-85 67,-79 63.5,-70.5
           L60,-62.5 L84,-66 C90.5,-67 95,-69 95,-73 Z"
        fill={KIT_BLACK}
      />
      <path
        d="M82,-85 C73.5,-85 67,-79 63.5,-70.5 L66.5,-69.5 C70,-77 76,-81.5 83,-81.5 Z"
        fill={GOLD}
      />
      {/* face + visor edge */}
      <path d="M95,-73 C95,-77 93,-80 90,-82 L88,-70 Z" fill={SKIN} />
      <circle cx={91.5} cy={-71.5} fill={SKIN} r={3.2} />
    </g>
  );
}

/**
 * `viewBox` is a prop so the same drawing can serve two crops: the full wide
 * composition on desktop, and a tighter frame on mobile where a 960-wide scene
 * would shrink the riders below the size where the kit is readable.
 */
export function PacelineScene({
  className,
  viewBox = "0 0 960 520",
  preserveAspectRatio = "xMidYMax slice",
}: {
  className?: string;
  viewBox?: string;
  preserveAspectRatio?: string;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg aria-hidden="true" className={className} preserveAspectRatio={preserveAspectRatio} viewBox={viewBox}>
      <defs>
        <linearGradient id={`${uid}-tri-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0C1524" />
          <stop offset="38%" stopColor="#1E2E44" />
          <stop offset="72%" stopColor="#5A5660" />
          <stop offset="100%" stopColor="#D4955E" />
        </linearGradient>
        <linearGradient id={`${uid}-tri-road`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#242B36" />
          <stop offset="100%" stopColor="#0C1016" />
        </linearGradient>
        <linearGradient id={`${uid}-tri-streak`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={GOLD} stopOpacity={0} />
          <stop offset="100%" stopColor={GOLD} stopOpacity={0.5} />
        </linearGradient>
        <linearGradient id={`${uid}-tri-vig`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#05070A" stopOpacity={0.42} />
          <stop offset="32%" stopColor="#05070A" stopOpacity={0} />
          <stop offset="86%" stopColor="#05070A" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#05070A" stopOpacity={0.82} />
        </linearGradient>
        <radialGradient id={`${uid}-tri-sunglow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0BE79" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#F0BE79" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* horizon sits high so the riders, not the sky, own the frame */}
      <rect fill={`url(#${uid}-tri-sky)`} height={216} width={960} x={0} y={0} />
      <circle cx={762} cy={196} fill={`url(#${uid}-tri-sunglow)`} r={170} />

      {/* open country, low and wide so the riders stay the subject */}
      <path
        d="M0,214 L0,176 L88,148 L164,174 L246,142 L332,176 L420,156 L520,182 L616,158 L714,184 L812,160 L900,182 L960,166 L960,214 Z"
        fill="#141D2B"
        opacity={0.92}
      />
      {/* sun drawn over the ridge so it reads as light, not as a dark disc */}
      <circle cx={762} cy={196} fill="#F5CC93" r={25} />

      {/* road in perspective */}
      <rect fill={`url(#${uid}-tri-road)`} height={306} width={960} x={0} y={214} />
      <path d="M436,214 L516,214 L900,520 L20,520 Z" fill="#1C2430" />
      <path d="M436,214 L516,214 L900,520 L20,520 Z" fill="none" stroke="#3D4655" strokeWidth={1} />
      {/* centre line, bunching toward the horizon */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const seg = (u: number) => {
          const t = (u / 7) ** 2.2;
          return {
            half: 2 + 11 * t,
            x: 476 + (460 - 476) * t,
            y: 214 + 306 * t,
          };
        };
        const a = seg(i);
        const b = seg(i + 0.5);
        return (
          <path
            d={`M${a.x - a.half},${a.y} L${a.x + a.half},${a.y} L${b.x + b.half},${b.y} L${b.x - b.half},${b.y} Z`}
            fill="#A79E8A"
            key={i}
            opacity={0.2}
          />
        );
      })}

      {/* speed streaks */}
      {[
        [30, 330, 170],
        [8, 386, 220],
        [96, 444, 190],
        [40, 486, 250],
      ].map(([x, y, w], i) => (
        <rect fill={`url(#${uid}-tri-streak)`} height={2} key={i} opacity={0.45} width={w} x={x} y={y} />
      ))}

      {/* three athletes riding close together, receding up the road */}
      <g opacity={0.72} transform="translate(110,400) scale(1)">
        <ellipse cx={54} cy={33} fill="#000" opacity={0.45} rx={86} ry={6} />
        <TriRider crankAngle={200} detail="simple" id={`${uid}-rider-c`} />
      </g>
      <g opacity={0.9} transform="translate(252,425) scale(1.22)">
        <ellipse cx={54} cy={33} fill="#000" opacity={0.5} rx={88} ry={6} />
        <TriRider crankAngle={95} detail="simple" id={`${uid}-rider-b`} />
      </g>
      <g transform="translate(424,450) scale(1.5)">
        <ellipse cx={54} cy={33} fill="#000" opacity={0.55} rx={90} ry={6} />
        <TriRider crankAngle={-25} detail="full" id={`${uid}-rider-a`} />
      </g>

      <rect fill={`url(#${uid}-tri-vig)`} height={520} width={960} x={0} y={0} />
    </svg>
  );
}

const sponsors = ["NORTHLAND", "GRANITE CO.", "RIVERSTONE", "CEDAR & OAK"] as const;

// Shared flat-pattern geometry: collar, sloped shoulders, short sleeves, and a
// lightly tapered body. Drawn once so front and back stay identical garments.
const JERSEY_BODY =
  "M50,34 L78,24 Q100,34 122,24 L150,34 L188,74 L168,98 L148,78 L152,150 L148,244 " +
  "L52,244 L48,150 L52,78 L32,98 L12,74 Z";
const JERSEY_YOKE = "M50,34 L78,24 Q100,34 122,24 L150,34 L166,57 L128,44 Q100,52 72,44 L34,57 Z";
const CUFF_RIGHT = "M188,74 L168,98 L158,90 L178,66 Z";
const CUFF_LEFT = "M12,74 L32,98 L42,90 L22,66 Z";

function JerseyShell() {
  return (
    <>
      <path d={JERSEY_BODY} fill={KIT_BLACK} stroke={t2.panelBorder} strokeWidth={1} />
      <path d={JERSEY_YOKE} fill={GOLD} />
      <path d={CUFF_RIGHT} fill={GOLD} opacity={0.85} />
      <path d={CUFF_LEFT} fill={GOLD} opacity={0.85} />
    </>
  );
}

function JerseyFront() {
  return (
    <g>
      <JerseyShell />

      <text fill={GOLD_HI} fontFamily={font.display} fontSize={22} fontWeight={700} letterSpacing={0.8} textAnchor="middle" x={100} y={148}>
        2THREE2
      </text>
      <line stroke={GOLD} strokeOpacity={0.5} strokeWidth={0.9} x1={62} x2={138} y1={158} y2={158} />
      <text fill="#E4DCCC" fontFamily={font.ui} fontSize={7} fontWeight={600} letterSpacing={1.4} textAnchor="middle" x={100} y={173}>
        RACE. PRAY. PURSUE.
      </text>

      {/* placeholder sponsor marks — small and off-centre so they never fight the brand */}
      <rect fill="#0F141C" height={14} stroke={t2.panelBorder} strokeWidth={0.8} width={40} x={58} y={192} />
      <text fill="#8A8578" fontFamily={font.ui} fontSize={5.6} letterSpacing={0.4} textAnchor="middle" x={78} y={201.5}>
        NORTHLAND
      </text>
      <rect fill="#0F141C" height={14} stroke={t2.panelBorder} strokeWidth={0.8} width={40} x={102} y={192} />
      <text fill="#8A8578" fontFamily={font.ui} fontSize={5.6} letterSpacing={0.4} textAnchor="middle" x={122} y={201.5}>
        GRANITE CO.
      </text>

      <text fill="#8A8578" fontFamily={font.ui} fontSize={5.2} fontWeight={600} letterSpacing={1} textAnchor="middle" x={100} y={230}>
        POWERED BY USA MISSIONARIES
      </text>
    </g>
  );
}

function JerseyBack() {
  return (
    <g>
      <JerseyShell />

      <text fill={GOLD_HI} fontFamily={font.display} fontSize={19} fontWeight={700} letterSpacing={0.8} textAnchor="middle" x={100} y={108}>
        2THREE2
      </text>
      <text fill="#8A8578" fontFamily={font.ui} fontSize={6.2} fontWeight={600} letterSpacing={1.3} textAnchor="middle" x={100} y={124}>
        RACE. PRAY. PURSUE.
      </text>

      {/* sponsor bar */}
      <rect fill="#0F141C" height={15} stroke={t2.panelBorder} strokeWidth={0.8} width={88} x={56} y={140} />
      <text fill="#8A8578" fontFamily={font.ui} fontSize={5.8} letterSpacing={0.5} textAnchor="middle" x={100} y={150.5}>
        RIVERSTONE &middot; CEDAR &amp; OAK
      </text>

      {/* rear pockets */}
      <path d="M60,172 L140,172 L138,202 L62,202 Z" fill="none" stroke={t2.panelBorder} strokeWidth={0.9} />
      <line stroke={t2.panelBorder} strokeWidth={0.9} x1={87} x2={86} y1={172} y2={202} />
      <line stroke={t2.panelBorder} strokeWidth={0.9} x1={113} x2={114} y1={172} y2={202} />

      {/* lower back: deliberately left blank in v1 */}
      <rect
        fill="none"
        height={26}
        stroke={GOLD}
        strokeDasharray="4 4"
        strokeOpacity={0.45}
        strokeWidth={1}
        width={84}
        x={58}
        y={210}
      />
      <text fill={GOLD} fontFamily={font.ui} fontSize={5.8} letterSpacing={0.8} opacity={0.75} textAnchor="middle" x={100} y={226.5}>
        RESERVED &mdash; BLANK IN V1
      </text>
    </g>
  );
}

export function KitSpec({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 480 300">
      <g transform="translate(20,22)">
        <JerseyFront />
        <text fill={t2.creamFaint} fontFamily={font.ui} fontSize={9} letterSpacing={2} textAnchor="middle" x={100} y={272}>
          FRONT
        </text>
      </g>
      <g transform="translate(260,22)">
        <JerseyBack />
        <text fill={t2.creamFaint} fontFamily={font.ui} fontSize={9} letterSpacing={2} textAnchor="middle" x={100} y={272}>
          BACK
        </text>
      </g>
    </svg>
  );
}

export { sponsors };
