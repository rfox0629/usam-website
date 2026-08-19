import React from "react";
import { font, t2 } from "./theme";

/**
 * 2THREE2 kit spec.
 *
 * A flat technical drawing of the intended race kit: black base, gold type,
 * and nothing else. It documents buildable artwork rather than pretending to
 * be a photograph of a kit that does not exist yet.
 *
 * Per the founder's first-mockup restraint, "Deploying Missionaries Across
 * America" is NOT placed on the kit. The lower back is drawn as an
 * intentionally blank reserved zone.
 */

const KIT_BLACK = "#0B0E13";
const KIT_BLACK_HI = "#1B212C";
const GOLD = "#D4A855";
const GOLD_HI = "#F2D294";

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

      {/* placeholder sponsor marks: small and off-centre so they never fight the brand */}
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
        RESERVED, BLANK IN V1
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
