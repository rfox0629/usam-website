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
type PlaceDot = { pull: number; x: number; y: number };

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

/** Shortest distance from a point to a polyline. Drives the pull to the spine. */
function distanceToPath(x: number, y: number, path: Point[]) {
  let best = Infinity;

  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared
      ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared))
      : 0;
    const distance = Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));

    if (distance < best) {
      best = distance;
    }
  }

  return best;
}

function channelWeight(order: number) {
  switch (order) {
    case 4:
      /* The Mississippi has to win the composition outright. The Missouri is the
         longer river and the eye follows length, so the main stem is given a
         clear margin over it at every point of its course. */
      return { base: 1.5, gain: 2.4, from: 0.86, to: 0.98, ink: "150, 106, 22" };
    case 3:
      /* The four rivers that meet the Mississippi: clearly secondary, clearly
         rivers. */
      return { base: 0.72, gain: 0.66, from: 0.5, to: 0.68, ink: "172, 128, 38" };
    default:
      /* What feeds those. Tertiary, but never so faint it reads as a scratch. */
      return { base: 0.5, gain: 0.28, from: 0.36, to: 0.5, ink: "190, 152, 70" };
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

    /*
     * Places, not texture.
     *
     * The previous field was a uniform staggered dot grid, which read as clip
     * art and gave the country no direction. These are sparse, jittered points
     * that grow and warm as they near the Mississippi, so the field itself
     * leans toward the spine: many places gathering into one movement rather
     * than decoration laid over a map. Spacing is tied to the drawn width so a
     * phone gets the same density of idea, not the same number of points.
     */
    const spacing = Math.max(17, width / 40);
    const dots: PlaceDot[] = [];
    /* Deterministic jitter: the field must not reshuffle on every resize. */
    let seed = 7;
    const noise = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;

      return seed / 2147483648;
    };

    for (let y = minY * scale + offsetY; y <= maxY * scale + offsetY; y += spacing) {
      for (let x = minX * scale + offsetX; x <= maxX * scale + offsetX; x += spacing) {
        const px = x + (noise() - 0.5) * spacing * 0.7;
        const py = y + (noise() - 0.5) * spacing * 0.7;

        if (!polygonContains(outline, px, py) || polygonContains(lake, px, py)) {
          continue;
        }

        dots.push({ pull: 0, x: px, y: py });
      }
    }

    const projectedRivers = new Map<string, Point[]>();

    for (const river of drawnRivers) {
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

    for (const river of drawnRivers) {
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
    lctx.strokeStyle = "rgba(168, 130, 50, 0.34)";
    lctx.lineWidth = 0.9;
    lctx.stroke();

    /* The places. Each is sized and warmed by how near it sits to the main
       stem, so the field leans toward the river instead of sitting on the map
       as an even texture. */
    const spine = projectedRivers.get("mississippi") ?? [];

    for (const dot of dots) {
      dot.pull = spine.length > 1
        ? Math.max(0, 1 - distanceToPath(dot.x, dot.y, spine) / (width * 0.34))
        : 0;

      lctx.beginPath();
      lctx.arc(dot.x, dot.y, 0.8 + dot.pull * 1.5, 0, Math.PI * 2);
      lctx.fillStyle = `rgba(178, 140, 60, ${(0.2 + dot.pull * 0.5).toFixed(3)})`;
      lctx.fill();
    }

    /* The rivers, drawn narrowest first so a trunk always sits over the
       streams that feed it. */
    const ordered = [...drawnRivers].sort((a, b) => a.order - b.order);

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

    /*
     * Where each major tributary meets the Mississippi. Small, quiet, and the
     * literal subject of the picture: separate journeys arriving at one river.
     */
    for (const river of drawnRivers) {
      if (river.order !== 3 || !river.attachTo) {
        continue;
      }

      const points = projectedRivers.get(river.name);
      const join = points?.[points.length - 1];

      if (!join) {
        continue;
      }

      lctx.beginPath();
      lctx.arc(join.x, join.y, 2.6, 0, Math.PI * 2);
      lctx.fillStyle = "rgba(250, 247, 241, 0.9)";
      lctx.fill();

      lctx.beginPath();
      lctx.arc(join.x, join.y, 2.6, 0, Math.PI * 2);
      lctx.strokeStyle = "rgba(150, 106, 22, 0.8)";
      lctx.lineWidth = 1;
      lctx.stroke();
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
      let alpha = 0.14 + journey * 0.26;

      if (awake) {
        const near = Math.hypot(head.x - pointerX, head.y - pointerY);

        if (near < 130) {
          alpha += (1 - near / 130) * 0.42;
        }
      }

      const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);

      gradient.addColorStop(0, "rgba(216, 169, 50, 0)");
      gradient.addColorStop(1, `rgba(226, 188, 96, ${Math.min(0.6, alpha).toFixed(3)})`);

      ctx.strokeStyle = gradient;
      /* Kept well under the channel it runs in. At the old width the light was
         as wide as the river and its round cap bled past the banks, which read
         as a smear alongside the Mississippi rather than as movement in it. */
      ctx.lineWidth = 0.4 + journey * 1.5;
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
