import React, { useId } from "react";
import {
  CyclistFigure,
  Figure,
  POSE_RUN_A,
  POSE_RUN_B,
  POSE_RUN_FLIGHT,
  POSE_WALK,
  POSE_WALK_ELDER,
  POSE_WALK_TALK,
} from "./figures";

/**
 * Hero illustration: a shared trail at first light.
 *
 * The composition is doing specific work from the brief. Everyone is on one
 * path heading the same direction (relational, not competitive); the group is
 * mixed in age, gender, and activity — runners, walkers, an older walker, a
 * cyclist — so the movement never reads as men-only or elite-only; and the
 * trail leads toward the sunrise rather than a finish line, which keeps the
 * emotional note "pursuit" instead of "race".
 */

const FAR = "#33405A";
const MID = "#141C29";
const NEAR = "#04060A";

function conifer(x: number, baseY: number, h: number, key: string, fill: string) {
  const w = h * 0.42;
  return (
    <path
      key={key}
      d={`M${x},${baseY - h}
          L${x + w * 0.55},${baseY - h * 0.45}
          L${x + w * 0.3},${baseY - h * 0.5}
          L${x + w * 0.85},${baseY - h * 0.06}
          L${x - w * 0.85},${baseY - h * 0.06}
          L${x - w * 0.3},${baseY - h * 0.5}
          L${x - w * 0.55},${baseY - h * 0.45} Z`}
      fill={fill}
    />
  );
}

// Deterministic (no Math.random) treeline so server and client markup match.
const treeline = Array.from({ length: 46 }, (_, i) => {
  const x = -10 + i * 16.4;
  const jitter = Math.sin(i * 2.3) * 5 + Math.sin(i * 0.7) * 3;
  const h = 20 + Math.sin(i * 1.7) * 7 + Math.cos(i * 0.9) * 5;
  return { h: Math.max(11, h), x: x + jitter };
}).filter((tree) => tree.x < 352 || tree.x > 452);

/**
 * `anchor` controls which part of the scene survives the crop. Both variants
 * pin the bottom (YMax) so the foreground figures are never sliced in half.
 * Desktop keeps the middle; mobile crops hard to the right, because that is
 * where the trail and the people sit — the left is reserved for headline copy.
 *
 * The scene is rendered twice (one instance per breakpoint), so every paint
 * server has to carry a unique id. Shared ids resolve to the first match in the
 * document — which is the `display:none` copy — and every gradient-filled shape
 * silently drops out.
 */
export function HeroScene({
  className,
  anchor = "xMidYMax",
}: {
  className?: string;
  anchor?: "xMidYMax" | "xMaxYMax";
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio={`${anchor} slice`}
      viewBox="0 0 720 540"
    >
      <defs>
        <linearGradient id={`${uid}-t2-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0A1120" />
          <stop offset="34%" stopColor="#1A2A42" />
          <stop offset="62%" stopColor="#404457" />
          <stop offset="84%" stopColor="#96654A" />
          <stop offset="100%" stopColor="#E8A868" />
        </linearGradient>
        <radialGradient id={`${uid}-t2-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE0AC" />
          <stop offset="45%" stopColor="#F0BE79" />
          <stop offset="100%" stopColor="#D4A855" />
        </radialGradient>
        <radialGradient id={`${uid}-t2-sunGlow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0BE79" stopOpacity={0.55} />
          <stop offset="55%" stopColor="#C57A42" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#C57A42" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}-t2-ground`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#121A26" />
          <stop offset="55%" stopColor="#0A0E15" />
          <stop offset="100%" stopColor="#06090D" />
        </linearGradient>
        <linearGradient id={`${uid}-t2-trail`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E7B678" stopOpacity={0.42} />
          <stop offset="30%" stopColor="#C98F52" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#8A7E68" stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id={`${uid}-t2-haze`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E0A063" stopOpacity={0} />
          <stop offset="100%" stopColor="#E0A063" stopOpacity={0.3} />
        </linearGradient>
        <linearGradient id={`${uid}-t2-vignette`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#05070A" stopOpacity={0.55} />
          <stop offset="30%" stopColor="#05070A" stopOpacity={0} />
          <stop offset="82%" stopColor="#05070A" stopOpacity={0} />
          <stop offset="100%" stopColor="#05070A" stopOpacity={0.9} />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect fill={`url(#${uid}-t2-sky)`} height={344} width={720} x={0} y={0} />

      {/* far range */}
      <path
        d="M0,344 L0,282 L52,236 L94,270 L148,208 L204,266 L244,240 L298,288 L354,248 L408,294 L468,258 L518,298 L578,264 L638,304 L698,274 L720,296 L720,344 Z"
        fill={FAR}
        opacity={0.5}
      />
      {/* sun sits in front of the far range and behind the near ridge, so it
          actually reads as a sunrise instead of being buried by the mountains */}
      <circle cx={528} cy={300} fill={`url(#${uid}-t2-sunGlow)`} r={200} />
      <circle cx={528} cy={300} fill={`url(#${uid}-t2-sun)`} r={38} />

      {/* mid ridge */}
      <path
        d="M0,344 L0,314 L70,288 L140,310 L210,282 L280,308 L350,290 L430,316 L500,294 L570,318 L650,298 L720,320 L720,344 Z"
        fill={MID}
        opacity={0.92}
      />
      {/* horizon haze */}
      <rect fill={`url(#${uid}-t2-haze)`} height={70} width={720} x={0} y={274} />

      {/* ground plane */}
      <rect fill={`url(#${uid}-t2-ground)`} height={200} width={720} x={0} y={340} />

      {/* trail, narrowing to the sunrise */}
      <path
        d="M502,341 C486,392 440,452 348,540 L760,540 C640,452 546,392 512,341 Z"
        fill={`url(#${uid}-t2-trail)`}
      />
      <path
        d="M502,341 C486,392 440,452 348,540"
        fill="none"
        stroke="#E7B678"
        strokeOpacity={0.16}
        strokeWidth={1.4}
      />
      <path
        d="M512,341 C546,392 640,452 760,540"
        fill="none"
        stroke="#E7B678"
        strokeOpacity={0.16}
        strokeWidth={1.4}
      />

      {/* treeline sitting on the horizon, with a gap where the trail runs out */}
      <g>{treeline.map((tree, i) => conifer(tree.x, 348, tree.h, `tree-${i}`, MID))}</g>

      {/* --- people, back to front ---
          Everyone sits in the right half of the frame: on desktop the headline
          occupies the left, and on mobile the crop anchors to this side. */}

      {/* far solo walker, almost at the light */}
      <Figure color={FAR} opacity={0.85} pose={POSE_WALK} scale={0.3} x={507} y={352} />

      {/* a pair further down the trail */}
      <Figure color="#26314A" opacity={0.92} pose={POSE_WALK_TALK} scale={0.4} x={478} y={364} />
      <Figure color="#26314A" opacity={0.92} pose={POSE_WALK} scale={0.4} x={492} y={365} />

      {/* cyclist rolling through */}
      <CyclistFigure color="#1B2434" opacity={0.95} ponytail scale={0.62} x={556} y={394} />

      {/* mid group: three walking together, one turned mid-conversation */}
      <ellipse cx={492} cy={424} fill="#000000" opacity={0.28} rx={56} ry={4} />
      <Figure color="#0E141E" pose={POSE_WALK} scale={0.66} x={460} y={424} />
      <Figure color="#0E141E" pose={POSE_WALK_TALK} ponytail scale={0.64} x={493} y={424} />
      <Figure color="#0E141E" pose={POSE_WALK_ELDER} scale={0.62} x={525} y={424} />

      {/* foreground: an older walker keeping her own pace on the same trail */}
      <ellipse cx={664} cy={470} fill="#000000" opacity={0.32} rx={36} ry={4} />
      <Figure color={NEAR} pose={POSE_WALK_ELDER} ponytail scale={1.04} x={664} y={470} />

      {/* foreground runners, side by side */}
      <ellipse cx={452} cy={504} fill="#000000" opacity={0.34} rx={44} ry={5} />
      <ellipse cx={540} cy={512} fill="#000000" opacity={0.34} rx={46} ry={5} />
      <Figure color={NEAR} pose={POSE_RUN_A} ponytail scale={1.28} x={452} y={504} />
      <Figure color={NEAR} pose={POSE_RUN_B} scale={1.34} x={540} y={512} />
      <Figure color={NEAR} pose={POSE_RUN_FLIGHT} cap scale={1.18} x={618} y={498} />

      <rect fill={`url(#${uid}-t2-vignette)`} height={540} width={720} x={0} y={0} />
    </svg>
  );
}
