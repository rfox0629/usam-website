/**
 * USA-191: the watershed engine.
 *
 * Framework free on purpose. WatershedMap.tsx is a thin React wrapper around
 * this, and the founder review page compiles this same file rather than a hand
 * copied imitation of it, so what a reviewer looks at is the code that ships
 * and cannot quietly drift from it.
 *
 * Give it a canvas; it returns the teardown.
 */
import { lakeMichigan, rivers, usOutline, type River } from "./watershed-data";

/* Albers equal-area conic, the standard projection for a map of the US. */
const RAD = Math.PI / 180;
const LON0 = -96 * RAD;
const LAT0 = 37.5 * RAD;
const LAT1 = 29.5 * RAD;
const LAT2 = 45.5 * RAD;
const N = 0.5 * (Math.sin(LAT1) + Math.sin(LAT2));
const C = Math.cos(LAT1) ** 2 + 2 * N * Math.sin(LAT1);
const RHO0 = Math.sqrt(C - 2 * N * Math.sin(LAT0)) / N;

function albers([lon, lat]: [number, number]): [number, number] {
  const rho = Math.sqrt(C - 2 * N * Math.sin(lat * RAD)) / N;
  const theta = N * (lon * RAD - LON0);

  /* Screen y grows downward, so the conic's northward y is negated here.
     Without this the whole country renders upside down. */
  return [rho * Math.sin(theta), rho * Math.cos(theta) - RHO0];
}

type Point = { x: number; y: number };

/** A drop of light, and the whole course it will run to the Gulf. */
type ActivityPoint = {
  /** 0 dormant, 1 fully lit. Eased every frame, never set directly. */
  glow: number;
  /** Fixed per point, so a cluster does not light as one flat block. */
  offset: number;
  x: number;
  y: number;
};


function polygonContains(polygon: Point[], x: number, y: number) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];

    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }

  return inside;
}

function cumulativeLengths(points: Point[]) {
  const cumulative = [0];

  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;

    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }

  return cumulative;
}

/** Position at a distance along a polyline. */
function along(points: Point[], cumulative: number[], distance: number): Point {
  const total = cumulative[cumulative.length - 1];
  const target = Math.max(0, Math.min(total, distance));

  let i = 1;

  while (i < cumulative.length - 1 && cumulative[i] < target) {
    i += 1;
  }

  const segment = cumulative[i] - cumulative[i - 1] || 1;
  const t = (target - cumulative[i - 1]) / segment;

  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
  };
}

/**
 * Channel weight by Strahler rank, where 4 is the Mississippi itself and 1 is a
 * headwater creek.
 *
 * The first pass gave a creek 0.45px and the main stem 0.85px at its head. Under
 * two decimal places of difference the basin read as a bare tree rather than as
 * a river with streams running into it. The spread is now roughly sixteen to one
 * at the mouth and five to one at the source, and tone carries the same
 * hierarchy: creeks are pale and recessive, the trunk is deep gold and nearly
 * opaque, so the eye is drawn down the spine rather than out into the branches.
 */
/**
 * The rivers the hero actually draws.
 *
 * The data carries 43 real rivers. Drawing all of them produced dozens of thin
 * branches radiating outward, which read as a tree or a root system rather than
 * as water running to one place. Only the recognisable systems are drawn: the
 * Mississippi, the four major tributaries that meet it, and five well known
 * rivers feeding those. The rest stay in the data, unused, because the point of
 * the image is one movement gathering, not an inventory of every creek.
 */
const drawnRivers = rivers.filter((river) => river.order >= 2);

function channelWeight(order: number) {
  switch (order) {
    /*
     * The rivers are structure now, not the subject. The activity field is what
     * the eye is meant to find first, so these sit close to the weight of the
     * country outline: the Mississippi still legibly the spine, but read on a
     * second look rather than announced.
     */
    case 4:
      return { base: 0.9, gain: 1.1, from: 0.5, to: 0.66, ink: "158, 114, 28" };
    case 3:
      return { base: 0.6, gain: 0.34, from: 0.36, to: 0.48, ink: "172, 128, 38" };
    default:
      return { base: 0.48, gain: 0.18, from: 0.27, to: 0.37, ink: "184, 144, 58" };
  }
}

/**
 * How far down its own course a channel has run, shaped for drawing.
 *
 * A river does not keep widening all the way to the sea. Letting width track
 * distance linearly to t=1 put a bulb on the end of the Mississippi that read as
 * a tuber rather than a mouth, so the ramp finishes early and the last stretch
 * runs at an even width.
 */
function channelRamp(t: number) {
  if (t < 0.82) {
    return t / 0.82;
  }

  /* The last stretch eases back off its full width so the Mississippi finishes
     as a mouth opening to the Gulf rather than as a club with a round cap on
     the end of it. */
  if (t > 0.96) {
    return 1 - ((t - 0.96) / 0.04) * 0.34;
  }

  return 1;
}

export function startWatershed(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { alpha: true });

  if (!ctx) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let frame = 0;
  let statics: HTMLCanvasElement | null = null;
  let points: ActivityPoint[] = [];
  let riverPaths: Point[][] = [];

  /*
   * Where the light is coming from, in canvas space.
   *
   * On a device with a pointer this follows the cursor. Without one it is a
   * quiet ambient focus that drifts between parts of the country, so a phone
   * still sees the movement waking somewhere rather than a dead image.
   */
  let focusX = -9999;
  let focusY = -9999;
  let focusStrength = 0;
  let lastPointer = -99999;

  const build = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Project once, then fit the whole country into the box with a margin.
       Rivers and dots share the transform so they cannot drift apart. */
    const projected = usOutline.map(albers);
    const xs = projected.map((p) => p[0]);
    const ys = projected.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 0.04;
    const scale = Math.min(
      (width * (1 - pad * 2)) / (maxX - minX),
      (height * (1 - pad * 2)) / (maxY - minY),
    );
    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;

    const place = (coordinate: [number, number]): Point => {
      const [px, py] = albers(coordinate);

      return { x: px * scale + offsetX, y: py * scale + offsetY };
    };

    const outline = usOutline.map(place);
    const lake = lakeMichigan.map(place);

    /*
     * The activity field.
     *
     * These are the subject of the image now, and the rivers are the structure
     * behind them. Each point stands for the movement spreading across the
     * country, NOT for a real missionary at a real address: nothing here is
     * derived from location data, and it must not be presented as if it were
     * until there is approved public data to draw on.
     *
     * Sparse on purpose. The field should read as counted, and it should sit
     * almost dormant until someone touches it.
     */
    const spacing = Math.max(26, width / 26);
    points = [];
    /* Deterministic jitter: the field must not reshuffle on every resize. */
    let seed = 7;
    const noise = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;

      return seed / 2147483648;
    };

    for (let y = minY * scale + offsetY; y <= maxY * scale + offsetY; y += spacing) {
      for (let x = minX * scale + offsetX; x <= maxX * scale + offsetX; x += spacing) {
        const px = x + (noise() - 0.5) * spacing * 0.78;
        const py = y + (noise() - 0.5) * spacing * 0.78;
        const offset = noise();

        if (!polygonContains(outline, px, py) || polygonContains(lake, px, py)) {
          continue;
        }

        points.push({ glow: 0, offset, x: px, y: py });
      }
    }

    const projectedRivers = new Map<string, Point[]>();

    for (const river of drawnRivers) {
      projectedRivers.set(river.name, river.points.map(place));
    }

    riverPaths = Array.from(projectedRivers.values());

    const layer = document.createElement("canvas");

    layer.width = canvas.width;
    layer.height = canvas.height;

    const lctx = layer.getContext("2d");

    if (!lctx) {
      return;
    }

    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /*
     * The country, drawn as a hairline rather than filled in. A faint outline
     * states America in one read and leaves the interior to the river, which is
     * what the composition is actually about.
     */
    lctx.beginPath();

    outline.forEach((point, index) => {
      if (index === 0) {
        lctx.moveTo(point.x, point.y);
      } else {
        lctx.lineTo(point.x, point.y);
      }
    });

    lctx.closePath();
    lctx.strokeStyle = "rgba(168, 130, 50, 0.3)";
    lctx.lineWidth = 0.9;
    lctx.stroke();

    /*
     * The confluence rings and the Lake Itasca source mark are deliberately
     * gone. They annotated the river while the river was the subject; with it
     * dialled back to structure they read as unexplained circles sitting louder
     * than anything they pointed at. The activity field is the subject now.
     */

    statics = layer;
  };

  /* Radius of influence, and how hard the field is allowed to be pushed. */
  const REACH = () => Math.max(120, Math.min(210, width * 0.19));

  const paintFrame = () => {
    if (!statics) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(statics, 0, 0, width, height);

    const reach = REACH();

    /*
     * A few river segments near the light warm slightly, so the water reads as
     * carrying the activity rather than sitting under it. Deliberately capped
     * and applied per segment rather than per river: lighting whole rivers put
     * the branching structure back on screen, which is the look this is meant
     * to stay away from.
     */
    if (focusStrength > 0.01) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const path of riverPaths) {
        for (let i = 1; i < path.length; i += 1) {
          const midX = (path[i - 1].x + path[i].x) / 2;
          const midY = (path[i - 1].y + path[i].y) / 2;
          const near = 1 - Math.min(1, Math.hypot(midX - focusX, midY - focusY) / (reach * 0.85));

          if (near <= 0) {
            continue;
          }

          ctx.strokeStyle = `rgba(196, 152, 58, ${(near * near * 0.3 * focusStrength).toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(path[i - 1].x, path[i - 1].y);
          ctx.lineTo(path[i].x, path[i].y);
          ctx.stroke();
        }
      }
    }

    for (const point of points) {
      const { glow } = point;

      /* Dormant is genuinely faint. The field should look like a quiet record
         of presence until someone moves across it. */
      const radius = 1 + glow * 2.1;
      const alpha = 0.2 + glow * 0.68;

      if (glow > 0.06) {
        /* A soft halo, so a lit point reads as illumination rather than as a
           bigger dot. */
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 3.4 * glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(214, 172, 74, ${(glow * 0.13).toFixed(3)})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${glow > 0.4 ? "168, 122, 28" : "178, 140, 60"}, ${alpha.toFixed(3)})`;
      ctx.fill();
    }
  };

  let previous = 0;
  /* Where the ambient focus is heading, and when it last chose a destination. */
  let ambientFromX = 0;
  let ambientFromY = 0;
  let ambientToX = 0;
  let ambientToY = 0;
  let ambientSince = 0;
  const AMBIENT_DWELL = 3200;

  const pickAmbientTarget = (time: number) => {
    if (points.length === 0) {
      return;
    }

    /* Chosen from the field itself, so the light always lands somewhere the
       country actually has points rather than in empty ocean. */
    const next = points[Math.floor(Math.random() * points.length)];

    ambientFromX = ambientToX || next.x;
    ambientFromY = ambientToY || next.y;
    ambientToX = next.x;
    ambientToY = next.y;
    ambientSince = time;
  };

  const advance = (time: number, delta: number) => {
    const hasPointer = time - lastPointer < 2400;

    if (hasPointer) {
      focusStrength += (1 - focusStrength) * Math.min(1, delta / 220);
    } else {
      /* No cursor: drift between clusters and breathe, well under the
         intensity a deliberate hover produces. */
      if (time - ambientSince > AMBIENT_DWELL) {
        pickAmbientTarget(time);
      }

      const span = Math.min(1, (time - ambientSince) / AMBIENT_DWELL);
      const eased = span < 0.5 ? 2 * span * span : 1 - (-2 * span + 2) ** 2 / 2;

      focusX = ambientFromX + (ambientToX - ambientFromX) * eased;
      focusY = ambientFromY + (ambientToY - ambientFromY) * eased;

      const breathe = Math.sin(span * Math.PI);

      focusStrength += (breathe * 0.62 - focusStrength) * Math.min(1, delta / 420);
    }

    const reach = REACH();

    for (const point of points) {
      const distance = Math.hypot(point.x - focusX, point.y - focusY);
      const near = distance >= reach ? 0 : 1 - distance / reach;
      /* Squared falloff keeps the lit area tight and the edge soft. */
      const target = near * near * (0.55 + point.offset * 0.45) * focusStrength;

      /* Rises quickly under the cursor, fades slowly behind it. The decay is
         the part that makes the map feel alive rather than switched. */
      const rate = target > point.glow ? delta / 150 : delta / 900;

      point.glow += (target - point.glow) * Math.min(1, rate);
    }
  };

  const render = (time: number) => {
    const delta = previous ? Math.min(64, time - previous) : 16;

    previous = time;

    advance(time, delta);
    paintFrame();

    frame = window.requestAnimationFrame(render);
  };

  /** One composed still: a quiet resting field, nothing moving. */
  const renderStatic = () => {
    for (const point of points) {
      point.glow = 0.1 + point.offset * 0.12;
    }

    focusStrength = 0;
    paintFrame();
  };

  const onPointerMove = (event: PointerEvent) => {
    /* Touch drags should not drive the cursor treatment; a phone gets the
       ambient behaviour instead. */
    if (event.pointerType !== "mouse") {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    focusX = event.clientX - rect.left;
    focusY = event.clientY - rect.top;
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
}
