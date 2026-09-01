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
type Drop = {
  cumulative: number[];
  distance: number;
  length: number;
  route: Point[];
  speed: number;
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
function channelWeight(order: number) {
  switch (order) {
    case 4:
      /* The Mississippi has to win the composition outright. The Missouri is the
         longer river and the eye follows length, so the main stem is given a
         clear margin over it at every point of its course. */
      return { base: 1.7, gain: 2.9, from: 0.82, to: 0.97, ink: "166, 120, 26" };
    case 3:
      return { base: 0.7, gain: 0.62, from: 0.56, to: 0.74, ink: "178, 134, 44" };
    case 2:
      return { base: 0.56, gain: 0.34, from: 0.5, to: 0.64, ink: "186, 145, 56" };
    default:
      /* Creeks stay hairlines, but readable ones. Pushed any fainter and the
         "many streams" half of the idea disappears. */
      return { base: 0.5, gain: 0.18, from: 0.48, to: 0.62, ink: "194, 158, 80" };
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
  let drops: Drop[] = [];
  let routesByRiver = new Map<string, Point[]>();

  /* Attention. Nearby streams wake a little; it is never required. */
  let pointerX = -9999;
  let pointerY = -9999;
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

    /* The dot field. Spacing is tied to the drawn width so the country reads
       as the same texture on a phone as on a desktop. */
    const spacing = Math.max(5, Math.min(10, width / 66));
    const dotRadius = Math.max(0.95, spacing * 0.145);
    const dots: Point[] = [];

    for (let y = minY * scale + offsetY; y <= maxY * scale + offsetY; y += spacing) {
      for (let x = minX * scale + offsetX; x <= maxX * scale + offsetX; x += spacing) {
        /* A half step stagger, so the field reads as a considered matrix
           rather than as graph paper. */
        const row = Math.round((y - (minY * scale + offsetY)) / spacing);
        const px = x + (row % 2 === 0 ? 0 : spacing / 2);

        if (!polygonContains(outline, px, y) || polygonContains(lake, px, y)) {
          continue;
        }

        dots.push({ x: px, y });
      }
    }

    const projectedRivers = new Map<string, Point[]>();

    for (const river of rivers) {
      projectedRivers.set(river.name, river.points.map(place));
    }

    /*
     * Splice each tributary onto its parent's remaining course, so a route is
     * a real journey from a headwater to the Gulf rather than a line that
     * stops at a confluence. Memoised, because the Ohio's route is shared by
     * everything that feeds the Ohio.
     */
    const byName = new Map(rivers.map((river) => [river.name, river]));
    const routeCache = new Map<string, Point[]>();

    const routeFor = (river: River): Point[] => {
      const cached = routeCache.get(river.name);

      if (cached) {
        return cached;
      }

      const own = projectedRivers.get(river.name) ?? [];
      const parent = river.attachTo ? byName.get(river.attachTo) : undefined;

      if (!parent) {
        routeCache.set(river.name, own);

        return own;
      }

      const parentRoute = routeFor(parent);
      const mouth = own[own.length - 1];

      /* Join where the tributary actually meets it: the nearest vertex on the
         parent's course. Hand maintaining indices in the data would rot the
         first time a waypoint moved. */
      let nearest = 0;
      let best = Infinity;

      for (let i = 0; i < parentRoute.length; i += 1) {
        const d = Math.hypot(parentRoute[i].x - mouth.x, parentRoute[i].y - mouth.y);

        if (d < best) {
          best = d;
          nearest = i;
        }
      }

      const route = own.concat(parentRoute.slice(nearest + 1));

      routeCache.set(river.name, route);

      return route;
    };

    routesByRiver = new Map();
    drops = [];

    for (const river of rivers) {
      const route = routeFor(river);

      if (route.length < 2) {
        continue;
      }

      routesByRiver.set(river.name, route);

      const cumulative = cumulativeLengths(route);
      const length = cumulative[cumulative.length - 1];
      /* A headwater carries fewer drops than a trunk, so the lower river
         visibly gathers what the branches brought. */
      const count = river.order >= 3 ? 3 : river.order === 2 ? 2 : 1;

      for (let i = 0; i < count; i += 1) {
        drops.push({
          cumulative,
          distance: (length * (i + Math.random())) / count,
          length,
          route,
          speed: 16 + river.order * 3.5,
        });
      }
    }

    /*
     * Everything that never changes is drawn once. Each frame then costs one
     * drawImage plus the light, which is what keeps this cheap enough to sit
     * behind a page an applicant is typing into.
     */
    const layer = document.createElement("canvas");

    layer.width = canvas.width;
    layer.height = canvas.height;

    const lctx = layer.getContext("2d");

    if (!lctx) {
      return;
    }

    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* The country. Present enough to hold the silhouette, but stepped back from
       the earlier weight: the river is the subject, and when the dots matched it
       the whole image flattened into one texture. */
    lctx.fillStyle = "rgba(190, 152, 70, 0.58)";

    for (const dot of dots) {
      lctx.beginPath();
      lctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
      lctx.fill();
    }

    /* The rivers, drawn narrowest first so a trunk always sits over the
       streams that feed it. */
    const ordered = [...rivers].sort((a, b) => a.order - b.order);

    lctx.lineCap = "round";
    lctx.lineJoin = "round";

    for (const river of ordered) {
      const points = projectedRivers.get(river.name);

      if (!points || points.length < 2) {
        continue;
      }

      const cumulative = cumulativeLengths(points);
      const total = cumulative[cumulative.length - 1] || 1;
      const { base, gain, from: alphaFrom, to: alphaTo, ink } = channelWeight(river.order);

      /*
       * Drawn as quadratic curves between the midpoints of consecutive
       * segments, with each waypoint as the control point. Straight segments
       * joined at the waypoints gave the basin a spiky, root-like look;
       * rivers bend. Each span is stroked separately so the channel can keep
       * widening downstream.
       */
      const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

      for (let i = 1; i < points.length; i += 1) {
        const t = cumulative[i] / total;
        const from = i === 1 ? points[0] : mid(points[i - 1], points[i]);
        const to = i === points.length - 1 ? points[i] : mid(points[i], points[i + 1]);

        const ramp = channelRamp(t);

        lctx.strokeStyle = `rgba(${ink}, ${(alphaFrom + (alphaTo - alphaFrom) * ramp).toFixed(3)})`;
        lctx.lineWidth = base + gain * ramp;
        lctx.beginPath();
        lctx.moveTo(from.x, from.y);
        lctx.quadraticCurveTo(points[i].x, points[i].y, to.x, to.y);
        lctx.stroke();
      }
    }

    /*
     * Lake Itasca. Every stream on the map runs to one place, and that story
     * only lands if the eye can find where the river begins, so the source gets
     * a mark of its own: a filled node with a ring drawn off it, the way a
     * survey drawing marks an origin. It sits on top of the network because it
     * is the one point the composition is asking you to find.
     */
    const source = projectedRivers.get("mississippi")?.[0];

    if (source) {
      /* Cleared to paper first so the ring reads as a mark on the map rather
         than as a knot in the line it sits on. */
      lctx.beginPath();
      lctx.arc(source.x, source.y, 5.4, 0, Math.PI * 2);
      lctx.fillStyle = "rgba(250, 247, 241, 0.92)";
      lctx.fill();

      lctx.beginPath();
      lctx.arc(source.x, source.y, 5.4, 0, Math.PI * 2);
      lctx.strokeStyle = "rgba(168, 122, 28, 0.85)";
      lctx.lineWidth = 1.3;
      lctx.stroke();

      lctx.beginPath();
      lctx.arc(source.x, source.y, 2.1, 0, Math.PI * 2);
      lctx.fillStyle = "rgba(150, 106, 22, 1)";
      lctx.fill();
    }

    statics = layer;
  };

  const paintLight = (time: number) => {
    if (!statics) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(statics, 0, 0, width, height);

    const awake = time - lastPointer < 2600;

    ctx.lineCap = "round";

    for (const drop of drops) {
      const head = along(drop.route, drop.cumulative, drop.distance);
      const tailLength = 14 + (drop.distance / drop.length) * 22;
      const tail = along(drop.route, drop.cumulative, drop.distance - tailLength);

      /* Brighter the further it has travelled, so the lower river carries the
         most light without needing to be drawn heavier. */
      const journey = drop.distance / drop.length;
      let alpha = 0.22 + journey * 0.4;

      if (awake) {
        const near = Math.hypot(head.x - pointerX, head.y - pointerY);

        if (near < 130) {
          alpha += (1 - near / 130) * 0.42;
        }
      }

      const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);

      gradient.addColorStop(0, "rgba(216, 169, 50, 0)");
      gradient.addColorStop(1, `rgba(233, 199, 110, ${Math.min(0.95, alpha).toFixed(3)})`);

      ctx.strokeStyle = gradient;
      /* Sized under the channel it runs in, so light never overflows the banks
         of a hairline creek and still fills the trunk near the Gulf. */
      ctx.lineWidth = 0.55 + journey * 3.4;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
    }
  };

  let previous = 0;

  const render = (time: number) => {
    const delta = previous ? Math.min(64, time - previous) : 16;

    previous = time;

    for (const drop of drops) {
      /* Water speeds up as the channel deepens. */
      const accelerate = 1 + (drop.distance / drop.length) * 0.7;

      drop.distance += (drop.speed * accelerate * delta) / 1000;

      if (drop.distance > drop.length) {
        /* Past the delta, and back to a headwater. */
        drop.distance = 0;
      }
    }

    paintLight(time);
    frame = window.requestAnimationFrame(render);
  };

  /** One composed still: the drops spread down the basin, nothing moving. */
  const renderStatic = () => {
    for (let i = 0; i < drops.length; i += 1) {
      drops[i].distance = drops[i].length * (0.25 + ((i * 0.37) % 1) * 0.6);
    }

    paintLight(0);
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
}
