import { streams, unitedStates, type LonLat } from "./movement-geography";

/**
 * The /join hero: the United States coming alive.
 *
 * Two layers. A field of small, uniform points fills the silhouette of the
 * country and sits almost dormant. Under a cursor, the points nearby brighten
 * softly and the brightness lingers behind the cursor, so moving across the
 * map leaves a quiet memory of where attention has been. Beneath the field, a
 * simple river system: the Mississippi as a fixed spine from Minnesota to the
 * Gulf, and a sparse set of tributaries reaching it. Many streams, one river.
 *
 * The field is the interaction; the river is the structure. Nothing on the
 * river moves, and nothing on the map is annotated.
 *
 * The points are symbolic. They are not missionary locations and are not
 * derived from any location data. They represent the vision of missionaries
 * throughout the United States.
 *
 * Framework-free: this owns a canvas and a lifetime, nothing more.
 */

type Point = { x: number; y: number };

type FieldPoint = {
  /** Brightness, 0 dormant to 1 fully lit. Eased each frame, never set. */
  light: number;
  x: number;
  y: number;
};

/* --------------------------------------------------------------- projection
   Albers equal-area conic on the standard parallels used for maps of the
   contiguous United States. Returns y growing southward, so a projected shape
   already sits the right way up on a canvas. */

const DEG = Math.PI / 180;
const REF_LON = -96 * DEG;
const REF_LAT = 37.5 * DEG;
const PAR_1 = 29.5 * DEG;
const PAR_2 = 45.5 * DEG;
const N = (Math.sin(PAR_1) + Math.sin(PAR_2)) / 2;
const C = Math.cos(PAR_1) ** 2 + 2 * N * Math.sin(PAR_1);
const RHO_0 = Math.sqrt(C - 2 * N * Math.sin(REF_LAT)) / N;

function project([lon, lat]: LonLat): Point {
  const rho = Math.sqrt(C - 2 * N * Math.sin(lat * DEG)) / N;
  const theta = N * (lon * DEG - REF_LON);

  /* Northern latitudes have the smaller rho, so rho*cos(theta) - RHO_0 is most
     negative in the north: smallest y, top of the canvas. The other sign puts
     Minnesota at the bottom of the map. */
  return { x: rho * Math.sin(theta), y: rho * Math.cos(theta) - RHO_0 };
}

/* ----------------------------------------------------------------- geometry */

function contains(polygon: Point[], x: number, y: number) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > y !== b.y > y;

    if (crosses && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }

  return inside;
}

/** A soft, symmetric falloff: 1 at the centre, 0 at the edge, smooth throughout. */
function falloff(distance: number, radius: number) {
  if (distance >= radius) {
    return 0;
  }

  const t = 1 - distance / radius;

  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ palette
   Warm cream behind, graphite structure, gold only where the country is
   alive. Keeping the river out of gold is what lets the illumination read as
   the one thing that is happening. */

const REST_INK = "44, 52, 66";
const LIT_INK = "201, 162, 39";
const SPINE_INK = "34, 44, 60";
const STREAM_INK = "34, 44, 60";

/* ------------------------------------------------------------------- tuning */

const REST_ALPHA = 0.16;
const REST_RADIUS = 1.05;
const LIT_ALPHA = 0.82;
const LIT_RADIUS = 1.85;

/** How long light takes to arrive, and how long it takes to leave. */
const RISE_MS = 140;
const FADE_MS = 1500;

/** Below this the field is considered settled and the loop goes to sleep. */
const SETTLED = 0.004;

/** How long one ambient breath lasts, in and out. */
const AMBIENT_LIFE = 2600;

export function startMovementField(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { alpha: true });

  if (!ctx) {
    return () => undefined;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const noHover = window.matchMedia("(hover: none)");

  let width = 0;
  let height = 0;
  let structure: HTMLCanvasElement | null = null;
  let field: FieldPoint[] = [];
  let outline: Point[] = [];
  let reach = 0;

  /* Where the light is. Off-canvas means nowhere. */
  let cursorX = -1e6;
  let cursorY = -1e6;
  let cursorOn = false;

  /* Ambient life for surfaces without a cursor. */
  let ambientX = 0;
  let ambientY = 0;
  let ambientPeak = 0;
  let ambientAt = 0;
  let ambientNext = 0;

  let frame = 0;
  let awake = false;
  let previous = 0;
  let ambientTimer = 0;

  const build = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Fit the projected country into the box with breathing room. */
    const raw = unitedStates.map(project);
    const xs = raw.map((p) => p.x);
    const ys = raw.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = Math.min(width, height) * 0.06;
    const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;
    const place = (lonLat: LonLat): Point => {
      const p = project(lonLat);

      return { x: p.x * scale + offsetX, y: p.y * scale + offsetY };
    };

    outline = unitedStates.map(place);

    /*
     * The field. A regular lattice with alternate rows offset by half a step,
     * which reads as one even material rather than as graph paper. Spacing
     * follows the drawn width so a phone shows the same density of idea.
     */
    const step = Math.max(7, Math.min(11, width / 74));
    const next: FieldPoint[] = [];
    let row = 0;

    for (let y = minY * scale + offsetY; y <= maxY * scale + offsetY; y += step * 0.88) {
      const shift = row % 2 === 0 ? 0 : step / 2;

      for (let x = minX * scale + offsetX + shift; x <= maxX * scale + offsetX; x += step) {
        if (contains(outline, x, y)) {
          next.push({ light: 0, x, y });
        }
      }

      row += 1;
    }

    /* Carry brightness across a resize so a redraw never blinks the field off. */
    if (field.length === next.length) {
      for (let i = 0; i < next.length; i += 1) {
        next[i].light = field[i].light;
      }
    }

    field = next;
    /* A soft local pool, not a searchlight. Roughly a tenth of the drawn width,
       so many small points brighten rather than one large area. */
    reach = Math.max(54, Math.min(92, width * 0.105));

    /* The river system is fixed, so it is painted once to its own layer. */
    const layer = document.createElement("canvas");

    layer.width = width * dpr;
    layer.height = height * dpr;

    const sctx = layer.getContext("2d");

    if (sctx) {
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.lineCap = "round";
      sctx.lineJoin = "round";

      for (const stream of streams) {
        const pts = stream.points.map(place);

        sctx.strokeStyle = stream.spine
          ? `rgba(${SPINE_INK}, 0.34)`
          : `rgba(${STREAM_INK}, 0.2)`;
        sctx.lineWidth = stream.spine ? 1.4 : 0.8;
        sctx.beginPath();
        sctx.moveTo(pts[0].x, pts[0].y);

        /* Through the midpoints of consecutive segments, so the course bends
           the way water does instead of turning at each waypoint. */
        for (let i = 1; i < pts.length - 1; i += 1) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;

          sctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }

        const last = pts[pts.length - 1];

        sctx.lineTo(last.x, last.y);
        sctx.stroke();
      }
    }

    structure = layer;
  };

  const paint = () => {
    ctx.clearRect(0, 0, width, height);

    if (structure) {
      ctx.drawImage(structure, 0, 0, width, height);
    }

    for (const point of field) {
      const { light } = point;
      const radius = REST_RADIUS + (LIT_RADIUS - REST_RADIUS) * light;
      const alpha = REST_ALPHA + (LIT_ALPHA - REST_ALPHA) * light;

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = light > 0.02 ? `rgba(${LIT_INK}, ${alpha.toFixed(3)})` : `rgba(${REST_INK}, ${REST_ALPHA})`;
      ctx.fill();
    }
  };

  /**
   * Without a cursor, a small area of the country lights gently now and then,
   * then settles. Rare, soft, and never brighter than a hover would be.
   */
  const scheduleAmbient = (now: number) => {
    ambientNext = now + 3800 + Math.random() * 4200;
  };

  const startAmbient = (now: number) => {
    if (field.length === 0) {
      return;
    }

    const seed = field[Math.floor(Math.random() * field.length)];

    ambientX = seed.x;
    ambientY = seed.y;
    ambientAt = now;
    ambientPeak = 0.34 + Math.random() * 0.14;
    scheduleAmbient(now);
  };

  const advance = (now: number, delta: number) => {
    let sourceX = cursorX;
    let sourceY = cursorY;
    let strength = cursorOn ? 1 : 0;
    let radius = reach;

    if (!cursorOn && noHover.matches) {
      if (now >= ambientNext) {
        startAmbient(now);
      }

      /* A slow breath in, a slower breath out. */
      const age = now - ambientAt;

      if (age < AMBIENT_LIFE) {
        const t = age / AMBIENT_LIFE;

        strength = ambientPeak * Math.sin(t * Math.PI);
        sourceX = ambientX;
        sourceY = ambientY;
        radius = reach * 0.8;
      }
    }

    let moving = false;

    for (const point of field) {
      const target = strength * falloff(Math.hypot(point.x - sourceX, point.y - sourceY), radius);
      const rising = target > point.light;
      const rate = Math.min(1, delta / (rising ? RISE_MS : FADE_MS));

      point.light += (target - point.light) * rate;

      if (point.light < SETTLED && target === 0) {
        point.light = 0;
      } else if (point.light > SETTLED || target > 0) {
        moving = true;
      }
    }

    return moving;
  };

  const loop = (now: number) => {
    const delta = previous ? Math.min(50, now - previous) : 16;

    previous = now;

    const moving = advance(now, delta);

    paint();

    /* A breath that has just begun has lit nothing yet, so it must hold the
       loop open on its own; otherwise the map sleeps at sin(0) and the breath
       never rises. */
    const breathing = noHover.matches && !cursorOn && now - ambientAt < AMBIENT_LIFE;

    /* Sleep once the field has settled: a dormant map costs nothing, on a
       phone as much as on a desktop. Without a cursor the next ambient breath
       is what wakes it, and that is a timer, not a running frame loop. */
    if (moving || cursorOn || breathing) {
      frame = window.requestAnimationFrame(loop);
    } else {
      awake = false;
      previous = 0;

      if (noHover.matches) {
        armAmbient(now);
      }
    }
  };

  const armAmbient = (now: number) => {
    window.clearTimeout(ambientTimer);
    ambientTimer = window.setTimeout(wake, Math.max(0, ambientNext - now));
  };

  function wake() {
    if (awake || reducedMotion.matches || document.visibilityState === "hidden") {
      return;
    }

    awake = true;
    previous = 0;
    frame = window.requestAnimationFrame(loop);
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    /* Only the country responds. The cream around it is not part of the map. */
    cursorOn = contains(outline, x, y);
    cursorX = x;
    cursorY = y;
    wake();
  };

  const onPointerLeave = () => {
    cursorOn = false;
    wake();
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(ambientTimer);
      awake = false;
      previous = 0;
    } else {
      wake();
    }
  };

  const onResize = () => {
    build();

    if (reducedMotion.matches) {
      paint();
    } else {
      wake();
    }
  };

  build();

  if (reducedMotion.matches) {
    /* A quiet still: the field at rest over the river. Nothing moves. */
    paint();
  } else {
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave);
    scheduleAmbient(performance.now());
    wake();
  }

  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(ambientTimer);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("resize", onResize);
  };
}
