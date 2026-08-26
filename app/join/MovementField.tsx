"use client";

import { useEffect, useRef } from "react";

/**
 * USA-191: The Movement.
 *
 * A scattered field of people. Most are latent. Every few seconds one of them
 * is sent, and what follows travels: the light reaches a neighbour, then their
 * neighbours, and the accent spreads outward along real connections rather
 * than appearing everywhere at once. Where the applicant's attention rests the
 * field leans toward them and its longer range structure resolves.
 *
 * The metaphor is the whole reason the artwork exists. USA Missionaries sends
 * people who reach people, so the image had to be propagation through a
 * network, not a grid lighting up under a cursor. The accent only ever appears
 * on a point the movement has actually reached, so the gold on screen is
 * always a count of what has been carried.
 *
 * Drawn on Operations paper rather than on a dark screen, which changes how it
 * has to be built: on white, a glow reads as smudge, so the tech feel comes
 * from fine dark linework at low alpha, a denser mesh, and a third pass of
 * long chords that only appear where attention is strongest. That last pass is
 * what makes the field resolve into deliberate structure instead of staying an
 * even texture.
 *
 * Canvas 2D over a relaxed scatter with precomputed proximity edges. No
 * dependencies, no WebGL, DPR aware, and a single composed still frame under
 * reduced motion.
 */

type Node = {
  x: number;
  y: number;
  /** Rendered position, drawn toward attention. */
  rx: number;
  ry: number;
  /** 0 latent, 1 fully lit by attention. */
  a: number;
  /** 0 untouched, 1 just reached by the movement. */
  e: number;
  phase: number;
};

/* Fewer, larger cells on a phone. The density that reads as fine drafting on a
   desktop reads as noise at 390px. */
const spacingFor = (width: number) => (width < 640 ? 66 : 46);
const ATTENTION_RADIUS = 240;
const IDLE_MS = 2200;
/* How long the light takes to cross one connection. Slow enough to read as
   travel rather than as a flash. */
const HOP_MS = 130;
const SEND_EVERY_MS = 2500;

/* Ink for the latent field. Slate 900, the same ink Operations sets text in. */
const INK = "15, 23, 42";
/* The one accent, matching the Operations gold exactly. */
const GOLD = "216, 169, 50";

/** Deterministic PRNG, so the field never reshuffles across resizes. */
function rand(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

export function MovementField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let edges: Array<[number, number]> = [];
    /* Longer range connections that only appear where attention is strongest,
       so the focus resolves into deliberate architecture rather than into a
       denser patch of the same mesh. */
    let chords: Array<[number, number]> = [];
    let neighbours: number[][] = [];
    let frame = 0;

    /* Attention follows the pointer and wanders on its own when idle, so the
       field is alive on a phone and on first paint. */
    let pointerX = -9999;
    let pointerY = -9999;
    let lastPointer = -IDLE_MS * 2;
    let attractorX = 0;
    let attractorY = 0;
    let seeded = false;

    /* The travelling wavefront. Each entry is a node waiting to be reached. */
    let pending: Array<{ index: number; at: number }> = [];
    let reached = new Set<number>();
    let lastSend = 0;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const spacing = spacingFor(width);
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      nodes = [];

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          /* A relaxed scatter rather than a lattice. Jitter is large enough
             that no row or column ever reads as a line, which is what keeps
             this from looking like graph paper. */
          const seed = r * 977 + c * 131;
          const jx = (rand(seed) - 0.5) * spacing * 0.9;
          const jy = (rand(seed + 0.5) - 0.5) * spacing * 0.9;
          const x = (c - 1) * spacing + jx;
          const y = (r - 1) * spacing + jy;

          nodes.push({
            a: 0,
            e: 0,
            phase: rand(seed + 7) * Math.PI * 2,
            rx: x,
            ry: y,
            x,
            y,
          });
        }
      }

      /* Proximity edges, found through the same grid the points were generated
         on so this stays linear rather than n squared. */
      const linkRadius = spacing * 1.44;
      const linkRadiusSq = linkRadius * linkRadius;

      edges = [];
      chords = [];
      neighbours = nodes.map(() => []);

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const i = r * cols + c;

          /* Forward-only neighbourhood, so each pair is considered once. */
          const near = [
            r * cols + c + 1,
            (r + 1) * cols + c,
            (r + 1) * cols + c + 1,
            (r + 1) * cols + c - 1,
          ];

          for (const j of near) {
            if (j <= i || j >= nodes.length) {
              continue;
            }

            /* Guard the horizontal wrap: index arithmetic alone would connect
               the last node of one row to the first of the next. */
            if (Math.abs((j % cols) - c) > 1) {
              continue;
            }

            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;

            if (dx * dx + dy * dy > linkRadiusSq) {
              continue;
            }

            edges.push([i, j]);
            neighbours[i].push(j);
            neighbours[j].push(i);
          }

          /* Two cells out, in three directions. These are never part of the
             propagation graph: they are structure, not relationship. */
          const far = [
            r * cols + c + 2,
            (r + 2) * cols + c,
            (r + 2) * cols + c + 2,
          ];

          for (const j of far) {
            if (j <= i || j >= nodes.length) {
              continue;
            }

            if (Math.abs((j % cols) - c) > 2) {
              continue;
            }

            chords.push([i, j]);
          }
        }
      }

      pending = [];
      reached = new Set();

      if (!seeded) {
        attractorX = width * 0.62;
        attractorY = height * 0.48;
        seeded = true;
      }
    };

    /** Sends one person. Everything after this is the movement carrying it. */
    const send = (time: number, index: number) => {
      reached = new Set([index]);
      pending = [{ at: time, index }];
    };

    const advanceWavefront = (time: number) => {
      if (!nodes.length) {
        return;
      }

      if (time - lastSend > SEND_EVERY_MS && pending.length === 0) {
        lastSend = time;
        send(time, Math.floor(rand(time * 0.001) * nodes.length));
      }

      const stillPending: Array<{ index: number; at: number }> = [];

      for (const item of pending) {
        if (time < item.at) {
          stillPending.push(item);
          continue;
        }

        nodes[item.index].e = 1;

        for (const next of neighbours[item.index]) {
          if (reached.has(next)) {
            continue;
          }

          reached.add(next);
          stillPending.push({ at: time + HOP_MS, index: next });
        }
      }

      pending = stillPending;
    };

    const step = (time: number) => {
      const idle = time - lastPointer > IDLE_MS;

      const targetX = idle
        ? width * 0.56 + Math.cos(time * 0.00017) * width * 0.26
        : pointerX;
      const targetY = idle
        ? height * 0.5 + Math.sin(time * 0.00024) * height * 0.26
        : pointerY;

      const chase = idle ? 0.018 : 0.13;

      attractorX += (targetX - attractorX) * chase;
      attractorY += (targetY - attractorY) * chase;

      advanceWavefront(time);

      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        const dx = attractorX - n.x;
        const dy = attractorY - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target =
          dist < ATTENTION_RADIUS ? Math.pow(1 - dist / ATTENTION_RADIUS, 1.6) : 0;

        n.a += (target - n.a) * 0.1;
        /* The light fades faster than the next hop arrives, so what travels is
           a narrow band moving outward rather than a stain that keeps growing
           until the whole field is gold. On paper this matters more than it
           did on a dark ground: the ink mesh is the structure, and the accent
           is only ever the thing moving through it. */
        n.e *= 0.905;

        const pull = n.a * 11;

        n.rx = n.x + (dx / dist) * pull;
        n.ry = n.y + (dy / dist) * pull;
      }
    };

    const paint = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      /* Pass one: the field as it stands. Everyone is there before anything
         happens to them. Kept very light, because on paper this is the tone
         of a drafting line rather than of an object. */
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${INK}, 0.1)`;
      ctx.beginPath();

      for (let i = 0; i < edges.length; i += 1) {
        const a = nodes[edges[i][0]];
        const b = nodes[edges[i][1]];

        ctx.moveTo(a.rx, a.ry);
        ctx.lineTo(b.rx, b.ry);
      }

      ctx.stroke();

      /* Pass two: structure. Only where attention is strongest, so the field
         resolves under the eye instead of being uniformly busy. */
      for (let i = 0; i < chords.length; i += 1) {
        const a = nodes[chords[i][0]];
        const b = nodes[chords[i][1]];
        const strength = Math.min(a.a, b.a);

        if (strength < 0.42) {
          continue;
        }

        ctx.strokeStyle = `rgba(${INK}, ${((strength - 0.42) * 0.34).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.rx, a.ry);
        ctx.lineTo(b.rx, b.ry);
        ctx.stroke();
      }

      /* Pass three: connections the movement has actually crossed. */
      for (let i = 0; i < edges.length; i += 1) {
        const a = nodes[edges[i][0]];
        const b = nodes[edges[i][1]];
        const carried = Math.min(a.e, b.e);

        if (carried < 0.06) {
          continue;
        }

        ctx.strokeStyle = `rgba(${GOLD}, ${(carried * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(a.rx, a.ry);
        ctx.lineTo(b.rx, b.ry);
        ctx.stroke();
      }

      ctx.lineWidth = 1;

      /* The people themselves. */
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        const shimmer = 0.13 + 0.05 * Math.sin(time * 0.0005 + n.phase);
        const size = 0.85 + Math.max(n.e, n.a * 0.5) * 2;

        ctx.beginPath();
        ctx.arc(n.rx, n.ry, size, 0, Math.PI * 2);

        if (n.e > 0.06) {
          /* Gold at full strength, cooling back toward the field ink as it
             fades, so a point that has been reached settles rather than
             switching off. */
          ctx.fillStyle = `rgba(${GOLD}, ${(n.e * 0.75).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(${INK}, ${(shimmer + n.a * 0.22).toFixed(3)})`;
        }

        ctx.fill();
      }
    };

    const render = (time: number) => {
      step(time);
      paint(time);
      frame = window.requestAnimationFrame(render);
    };

    /** One composed frame: attention settled, one send already carried. */
    const renderStatic = () => {
      attractorX = width * 0.62;
      attractorY = height * 0.46;

      for (let pass = 0; pass < 40; pass += 1) {
        for (let i = 0; i < nodes.length; i += 1) {
          const n = nodes[i];
          const dx = attractorX - n.x;
          const dy = attractorY - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target =
            dist < ATTENTION_RADIUS ? Math.pow(1 - dist / ATTENTION_RADIUS, 1.6) : 0;

          n.a += (target - n.a) * 0.2;
          n.rx = n.x + (dx / dist) * n.a * 9;
          n.ry = n.y + (dy / dist) * n.a * 9;
        }
      }

      /* Carry one send a fixed number of hops and let it decay by distance, so
         the still frame shows a movement mid-spread rather than a blank field. */
      if (nodes.length) {
        const origin = Math.floor(nodes.length * 0.34);

        reached = new Set([origin]);

        let frontier = [origin];

        for (let hop = 0; hop < 7; hop += 1) {
          const next: number[] = [];

          for (const index of frontier) {
            nodes[index].e = Math.max(0, 1 - hop * 0.26);

            for (const neighbour of neighbours[index]) {
              if (reached.has(neighbour)) {
                continue;
              }

              reached.add(neighbour);
              next.push(neighbour);
            }
          }

          frontier = next;
        }
      }

      paint(0);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();

      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      lastPointer = performance.now();
    };

    const onResize = () => {
      build();

      if (reduceMotion) {
        renderStatic();
      }
    };

    build();

    if (reduceMotion) {
      renderStatic();
    } else {
      frame = window.requestAnimationFrame(render);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas aria-hidden="true" className="join-field" ref={canvasRef} />;
}
