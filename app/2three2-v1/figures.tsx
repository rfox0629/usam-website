import React from "react";

/**
 * Articulated silhouette figures.
 *
 * No licensed photography exists for 2THREE2 yet, and the brief explicitly
 * forbids passing off generic stock imagery as the movement (or as the custom
 * kit). So the page draws its people instead: each figure is described by joint
 * positions and rendered as tapered limbs plus a head, which reads as a real
 * human silhouette at any scale and lets the scenes carry a deliberate mix of
 * men, women, and ages rather than a wall of interchangeable athletes.
 *
 * Local coordinate space: hip at (0,0), +y downward, figure faces +x.
 * `ground` is the local y where the feet meet the surface.
 */

type P = readonly [number, number];

export type Pose = {
  hip: P;
  chest: P;
  neck: P;
  head: P;
  headR: number;
  /** shoulder, elbow, hand */
  armFar: readonly [P, P, P];
  armNear: readonly [P, P, P];
  /** knee, ankle, toe (hip is the pose hip) */
  legFar: readonly [P, P, P];
  legNear: readonly [P, P, P];
  ground: number;
  ponytail?: boolean;
  cap?: boolean;
};

function line([x1, y1]: P, [x2, y2]: P) {
  return `M${x1},${y1} L${x2},${y2}`;
}

function Limb({
  joints,
  widths,
  color,
}: {
  joints: readonly P[];
  widths: readonly number[];
  color: string;
}) {
  return (
    <>
      {joints.slice(0, -1).map((from, i) => (
        <path
          key={i}
          d={line(from, joints[i + 1])}
          stroke={color}
          strokeWidth={widths[i]}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </>
  );
}

function Torso({ pose, color }: { pose: Pose; color: string }) {
  const [hx, hy] = pose.hip;
  const [cx, cy] = pose.chest;
  const [nx, ny] = pose.neck;
  // Slightly wider through the chest than the hips, closed with a soft curve so
  // the join to the neck doesn't read as a rectangle.
  return (
    <path
      d={`M${hx - 4.4},${hy + 1} C${cx - 5.6},${cy + 2} ${cx - 5.4},${cy - 4} ${nx - 3.4},${ny}
          L${nx + 3.4},${ny} C${cx + 5.4},${cy - 4} ${cx + 5.6},${cy + 2} ${hx + 4.6},${hy + 1} Z`}
      fill={color}
    />
  );
}

export function Figure({
  pose,
  x,
  y,
  scale = 1,
  color,
  opacity = 1,
  ponytail,
  cap,
}: {
  pose: Pose;
  x: number;
  y: number;
  scale?: number;
  color: string;
  opacity?: number;
  /** per-instance override, so one pose can serve several people in a scene */
  ponytail?: boolean;
  cap?: boolean;
}) {
  const [headX, headY] = pose.head;
  const hasPonytail = ponytail ?? pose.ponytail ?? false;
  const hasCap = cap ?? pose.cap ?? false;

  return (
    <g
      transform={`translate(${x},${y}) scale(${scale}) translate(0,${-pose.ground})`}
      opacity={opacity}
    >
      {/* far side limbs first so the near side overlaps them */}
      <Limb color={color} joints={[pose.armFar[0], pose.armFar[1], pose.armFar[2]]} widths={[3.9, 3.2]} />
      <Limb color={color} joints={[pose.hip, pose.legFar[0], pose.legFar[1], pose.legFar[2]]} widths={[6, 4.5, 3.2]} />

      <Torso color={color} pose={pose} />

      <Limb color={color} joints={[pose.hip, pose.legNear[0], pose.legNear[1], pose.legNear[2]]} widths={[6.4, 4.8, 3.4]} />
      <Limb color={color} joints={[pose.armNear[0], pose.armNear[1], pose.armNear[2]]} widths={[4.1, 3.4]} />

      {/* neck */}
      <path d={line(pose.neck, [headX, headY + pose.headR * 0.7])} stroke={color} strokeWidth={3.2} strokeLinecap="round" />

      {hasPonytail ? (
        <path
          d={`M${headX - pose.headR * 0.8},${headY - pose.headR * 0.2}
              q${-pose.headR * 1.5},${pose.headR * 0.5} ${-pose.headR * 1.7},${pose.headR * 2.1}
              q${pose.headR * 0.9},${-pose.headR * 0.7} ${pose.headR * 1.5},${-pose.headR * 1.5} Z`}
          fill={color}
        />
      ) : null}

      <circle cx={headX} cy={headY} r={pose.headR} fill={color} />

      {hasCap ? (
        <path
          d={`M${headX - pose.headR * 1.05},${headY - pose.headR * 0.34}
              a${pose.headR * 1.05},${pose.headR * 1.05} 0 0 1 ${pose.headR * 2.1},0
              l${pose.headR * 1.15},${pose.headR * 0.12}
              l0,${pose.headR * 0.34}
              l${-pose.headR * 3.25},0 Z`}
          fill={color}
        />
      ) : null}
    </g>
  );
}

const NECK: P = [2.2, -21];

/** Distance-runner stride, near leg reaching forward to land. */
export const POSE_RUN_A: Pose = {
  armFar: [[1, -19.5], [-6.5, -13.5], [-10.5, -6]],
  armNear: [[3, -19.5], [10, -13.5], [13, -20.5]],
  chest: [1.6, -13.5],
  ground: 24,
  head: [4.2, -28.6],
  headR: 5.2,
  hip: [0, 0],
  legFar: [[-8, 8], [-16, 12.5], [-21, 9.5]],
  legNear: [[10, 9], [14, 21], [19, 23.6]],
  neck: NECK,
};

/** Opposite phase of the same stride, so a pair of runners isn't cloned. */
export const POSE_RUN_B: Pose = {
  armFar: [[1, -19.5], [9.5, -13.5], [12.5, -20.5]],
  armNear: [[3, -19.5], [-6.5, -13.5], [-10.5, -6]],
  chest: [1.6, -13.5],
  ground: 24,
  head: [4.2, -28.6],
  headR: 5.2,
  hip: [0, 0],
  legFar: [[9, 9], [13.5, 20.5], [18.5, 23.2]],
  legNear: [[-7.5, 8.5], [-15, 13], [-20, 10]],
  neck: NECK,
};

/** Mid-flight stride — both feet off the ground, used for the lead runner. */
export const POSE_RUN_FLIGHT: Pose = {
  armFar: [[1, -19.5], [-7, -12.5], [-11, -4.5]],
  armNear: [[3, -19.5], [11, -14], [14.5, -21.5]],
  chest: [2, -13.5],
  ground: 24,
  head: [5, -28.8],
  headR: 5.2,
  hip: [0, 0],
  legFar: [[-9, 5], [-17.5, 3], [-22.5, 0.5]],
  legNear: [[12, 6], [18, 16], [23, 18.5]],
  neck: [2.8, -21],
};

/** Relaxed walking stride. */
export const POSE_WALK: Pose = {
  armFar: [[0.6, -20], [5.5, -13], [8.5, -5.5]],
  armNear: [[2, -20], [-3.5, -13], [-6.5, -5.5]],
  chest: [0.8, -14],
  ground: 25,
  head: [2, -28.8],
  headR: 5.2,
  hip: [0, 0],
  legFar: [[-4.5, 11.5], [-8.5, 22.5], [-13, 24.6]],
  legNear: [[5.5, 11.5], [9.5, 23], [14, 24.6]],
  neck: [1.2, -21],
};

/** Walking while talking — trailing hand open, head turned to a companion. */
export const POSE_WALK_TALK: Pose = {
  armFar: [[0.6, -20], [6.5, -14.5], [11, -18.5]],
  armNear: [[2, -20], [-3, -13.5], [-5.5, -6]],
  chest: [0.6, -14],
  ground: 25,
  head: [0.8, -28.8],
  headR: 5.2,
  hip: [0, 0],
  legFar: [[-4, 11.5], [-7.5, 22.5], [-12, 24.6]],
  legNear: [[5, 11.5], [8.5, 23], [13, 24.6]],
  neck: [0.8, -21],
};

/** Slightly stooped, shorter stride — reads as an older walker. */
export const POSE_WALK_ELDER: Pose = {
  armFar: [[0.4, -19], [4.5, -12.5], [7, -6]],
  armNear: [[1.8, -19], [-2.8, -12.5], [-4.5, -5.5]],
  chest: [1.6, -13],
  ground: 25,
  head: [4.4, -27],
  headR: 5,
  hip: [0, 0],
  legFar: [[-3.5, 11.5], [-6.5, 23], [-10.5, 24.8]],
  legNear: [[4.5, 11.5], [7.5, 23], [11.5, 24.8]],
  neck: [3, -19.8],
};

/**
 * A recreational cyclist, upright on a road bike — deliberately not the tri
 * position used in the Ironman section, so the hero reads "everyday people"
 * rather than "elite athletes".
 */
export function CyclistFigure({
  x,
  y,
  scale = 1,
  color,
  opacity = 1,
  ponytail = false,
}: {
  x: number;
  y: number;
  scale?: number;
  color: string;
  opacity?: number;
  ponytail?: boolean;
}) {
  const wheelR = 13;
  return (
    <g transform={`translate(${x},${y}) scale(${scale}) translate(0,${-wheelR})`} opacity={opacity}>
      {/* wheels */}
      <circle cx={0} cy={0} fill="none" r={wheelR} stroke={color} strokeWidth={1.9} />
      <circle cx={46} cy={0} fill="none" r={wheelR} stroke={color} strokeWidth={1.9} />
      {/* frame */}
      <path
        d="M0,0 L18,1 L8,-19 Z M18,1 L39,-16 M8,-19 L41,-17 M39,-16 L46,0"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.1}
      />
      {/* bars + saddle */}
      <path d="M36,-18 l8,-1 M5,-21 l7,0" fill="none" stroke={color} strokeLinecap="round" strokeWidth={2.2} />
      {/* rider */}
      <path d="M9,-23 L22,-36" stroke={color} strokeLinecap="round" strokeWidth={7} />
      <path d="M22,-36 L36,-24 L42,-20" fill="none" stroke={color} strokeLinecap="round" strokeWidth={3.4} />
      <path d="M9,-23 L20,-11 L15,1" fill="none" stroke={color} strokeLinecap="round" strokeWidth={4.6} />
      <path d="M9,-23 L17,-10 L21,2" fill="none" stroke={color} strokeLinecap="round" strokeWidth={4.6} />
      {ponytail ? <path d="M22,-41 q-6,1 -8,6 q4,-2 7,-4 Z" fill={color} /> : null}
      <circle cx={25.5} cy={-41} fill={color} r={4.6} />
    </g>
  );
}
