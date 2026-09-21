import Image from "next/image";
import type {
  AdvisorExampleNetwork,
  AdvisorExampleNetworkNode,
  AdvisorExampleRhythm,
  AdvisorExampleTrend,
} from "@/src/lib/advisor-content";
import type { ExampleTheme } from "./exampleTheme";

/**
 * The chart pieces of a dashboard concept. All of them are plain markup and
 * SVG rendered on the server: no chart library, no client JavaScript.
 *
 * Every chart is built so it survives a 320px phone and a printed page: text
 * lives in HTML, not inside a scaled SVG, so it never shrinks below legible;
 * bars are HTML boxes; only the line paths and the multiplication tree are
 * SVG, and the tree has a stacked HTML twin for narrow screens.
 */

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/* ---------------------------------------------------------------------- */
/* AVATAR                                                                  */
/* ---------------------------------------------------------------------- */

export function Avatar({
  name,
  photo,
  size,
  theme,
  tone = "soft",
  ring = false,
}: {
  name: string;
  photo?: string;
  size: number;
  theme: ExampleTheme;
  tone?: "soft" | "dark";
  ring?: boolean;
}) {
  const style = {
    height: size,
    width: size,
    boxShadow: ring ? `0 0 0 3px #FFFFFF, 0 0 0 6px ${theme.accent}` : undefined,
  };

  if (photo) {
    return (
      <span className="relative block flex-shrink-0 overflow-hidden rounded-full" style={style}>
        <Image alt={name} className="object-cover" fill sizes={`${size}px`} src={photo} />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        ...style,
        backgroundColor: tone === "dark" ? theme.ink : theme.accentSoft,
        color: tone === "dark" ? "#FFFFFF" : theme.accentText,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

/* ---------------------------------------------------------------------- */
/* TREND LINE                                                              */
/* ---------------------------------------------------------------------- */

function niceCeiling(value: number) {
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;

  return step * magnitude;
}

export function TrendChart({ trend, theme }: { trend: AdvisorExampleTrend; theme: ExampleTheme }) {
  const { values, labels } = trend;
  const top = niceCeiling(Math.max(...values));
  const n = values.length;
  const points = values.map((value, i) => ({
    x: (i / (n - 1)) * 100,
    y: 100 - (value / top) * 100,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const area = `${line} L100 100 L0 100 Z`;
  const last = points[n - 1];
  const ticks = [0, top / 2, top];
  const unit = trend.unit ?? "";

  return (
    <div>
      <div className="flex">
        {/* Tick labels live in HTML, in a fixed gutter, so they never scale. */}
        <div className="relative w-8 flex-shrink-0 text-[11px] tabular-nums" style={{ color: theme.muted }}>
          {ticks.map((tick) => (
            <span
              className="absolute right-2 -translate-y-1/2"
              key={tick}
              style={{ top: `${100 - (tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: 176 }}>
          {ticks.map((tick) => (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 h-px"
              key={tick}
              style={{ backgroundColor: theme.line, top: `${100 - (tick / top) * 100}%` }}
            />
          ))}

          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full overflow-visible"
            focusable="false"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <path d={area} fill={theme.accent} fillOpacity={0.1} />
            <path
              d={line}
              fill="none"
              stroke={theme.accent}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* End marker and its value, the one direct label on the chart. */}
          <span
            aria-hidden="true"
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              backgroundColor: theme.accent,
              boxShadow: "0 0 0 2px #FFFFFF",
              left: `${last.x}%`,
              top: `${last.y}%`,
            }}
          />
          <span
            className="absolute right-0 -translate-y-full pb-2.5 text-[12.5px] font-semibold tabular-nums"
            style={{ color: theme.ink, top: `${last.y}%` }}
          >
            {values[n - 1]}
            {unit ? ` ${unit}` : ""}
          </span>

          {/* Hover targets, one per point, wider than the mark. */}
          <div aria-hidden="true" className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {values.map((value, i) => (
              <span className="block h-full" key={`${labels[i]}-${i}`} title={`${labels[i]}: ${value}${unit ? ` ${unit}` : ""}`} />
            ))}
          </div>
        </div>
      </div>

      <div
        className="ml-8 mt-2 grid text-center text-[11px]"
        style={{ color: theme.muted, gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {labels.map((label, i) => (
          <span className={i % 2 === 1 && n > 6 ? "hidden sm:block" : "block"} key={`${label}-${i}`}>
            {label}
          </span>
        ))}
      </div>

      <details className="mt-3 text-[12.5px]" style={{ color: theme.muted }}>
        <summary className="cursor-pointer select-none font-medium" style={{ color: theme.accentText }}>
          Show as a table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">{trend.title}</caption>
            <thead>
              <tr>
                <th className="py-1 pr-3 font-medium" scope="col">
                  Week
                </th>
                <th className="py-1 font-medium" scope="col">
                  {unit ? unit[0].toUpperCase() + unit.slice(1) : "Value"}
                </th>
              </tr>
            </thead>
            <tbody>
              {values.map((value, i) => (
                <tr key={`${labels[i]}-${i}`} style={{ borderTop: `1px solid ${theme.line}` }}>
                  <td className="py-1 pr-3">{labels[i]}</td>
                  <td className="py-1 font-semibold" style={{ color: theme.ink }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* WEEKLY RHYTHM                                                           */
/* ---------------------------------------------------------------------- */

export function RhythmChart({ rhythm, theme }: { rhythm: AdvisorExampleRhythm; theme: ExampleTheme }) {
  const max = Math.max(...rhythm.days.map((day) => day.value)) || 1;
  const hasGathering = rhythm.days.some((day) => day.gathering);
  const radius = theme.radiusPx ? "4px 4px 0 0" : 0;

  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-3" style={{ height: 168 }}>
        {rhythm.days.map((day) => {
          const pct = (day.value / max) * 82;

          return (
            <div
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              key={day.label}
              title={`${day.label}: ${day.value} meetings${day.gathering ? " (gathering day)" : ""}`}
            >
              <span className="mb-1.5 text-[12px] font-semibold tabular-nums" style={{ color: theme.ink }}>
                {day.value}
              </span>
              <div
                className="w-full max-w-[28px]"
                style={{
                  backgroundColor: day.gathering ? theme.accentLight : theme.accent,
                  borderRadius: radius,
                  height: `${pct}%`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 border-t pt-2 sm:gap-3" style={{ borderColor: theme.line }}>
        {rhythm.days.map((day) => (
          <span
            className="min-w-0 flex-1 truncate text-center text-[11.5px] font-medium"
            key={day.label}
            style={{ color: day.gathering ? theme.muted : theme.ink }}
          >
            {day.label}
          </span>
        ))}
      </div>

      {hasGathering ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" style={{ color: theme.muted }}>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.accentLight }} />
            Weekend gathering
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.accent }} />
            Discipleship through the week
          </span>
        </div>
      ) : null}

      {rhythm.places && rhythm.places.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rhythm.places.map((place) => (
            <div
              className="min-w-0 px-3 py-2"
              key={place.label}
              style={{ backgroundColor: theme.surfaceAlt, borderRadius: theme.radiusPx ? 8 : 0 }}
            >
              <dt className="truncate text-[11.5px]" style={{ color: theme.muted }}>
                {place.label}
              </dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums" style={{ color: theme.ink }}>
                {place.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* MULTIPLICATION TREE                                                     */
/* ---------------------------------------------------------------------- */

type Laid = {
  node: AdvisorExampleNetworkNode;
  depth: number;
  row: number;
  parent: Laid | null;
};

function layoutTree(root: AdvisorExampleNetworkNode) {
  const laid: Laid[] = [];
  let leaves = 0;
  let maxDepth = 0;

  function place(node: AdvisorExampleNetworkNode, depth: number, parent: Laid | null): Laid {
    maxDepth = Math.max(maxDepth, depth);
    const entry: Laid = { node, depth, row: 0, parent };

    if (node.children && node.children.length > 0) {
      const kids = node.children.map((child) => place(child, depth + 1, entry));
      entry.row = (kids[0].row + kids[kids.length - 1].row) / 2;
    } else {
      entry.row = leaves;
      leaves += 1;
    }

    laid.push(entry);

    return entry;
  }

  place(root, 0, null);

  return { laid, leaves, maxDepth };
}

const TREE_W = 900;
const ROW_H = 64;
const PAD_Y = 22;
const PAD_TOP_WITH_COLUMNS = 44;
const PAD_L = 28;
const LAST_COL_W = 250;

function radiusFor(laid: Laid) {
  if (laid.node.highlight) return 27;
  if (laid.depth === 0) return 21;

  return 17;
}

function TreeSvg({ network, theme }: { network: AdvisorExampleNetwork; theme: ExampleTheme }) {
  const { laid, leaves, maxDepth } = layoutTree(network.root);
  const columns = network.columns ?? [];
  const padTop = columns.length > 0 ? PAD_TOP_WITH_COLUMNS : PAD_Y;
  const colStep = maxDepth > 0 ? (TREE_W - PAD_L - LAST_COL_W) / maxDepth : 0;
  const height = leaves * ROW_H + padTop + PAD_Y;
  const xOf = (entry: Laid) => PAD_L + entry.depth * colStep + radiusFor(entry);
  const yOf = (entry: Laid) => padTop + entry.row * ROW_H + ROW_H / 2;
  let clipCount = 0;

  return (
    <svg
      aria-hidden="true"
      className="block h-auto w-full"
      focusable="false"
      role="img"
      viewBox={`0 0 ${TREE_W} ${height}`}
    >
      {columns.map((label, depth) => (
        <text
          fill={theme.muted}
          fontSize={11}
          fontWeight={600}
          key={`${label}-${depth}`}
          letterSpacing={0.8}
          x={PAD_L + depth * colStep}
          y={16}
        >
          {label.toUpperCase()}
        </text>
      ))}
      {columns.length > 0 ? (
        <line stroke={theme.line} strokeWidth={1} x1={PAD_L} x2={TREE_W - 8} y1={26} y2={26} />
      ) : null}

      {/* Edges first, so nodes sit on top of them. */}
      {laid
        .filter((entry) => entry.parent)
        .map((entry) => {
          const parent = entry.parent as Laid;
          const x1 = xOf(parent) + radiusFor(parent);
          const y1 = yOf(parent);
          const x2 = xOf(entry) - radiusFor(entry);
          const y2 = yOf(entry);
          const mid = (x1 + x2) / 2;
          const strong = Boolean(parent.node.highlight);

          return (
            <path
              d={`M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
              fill="none"
              key={`${parent.node.name}-${entry.node.name}-${entry.row}`}
              stroke={strong ? theme.accent : theme.line}
              strokeWidth={strong ? 2.5 : 2}
            />
          );
        })}

      {laid.map((entry) => {
        const r = radiusFor(entry);
        const cx = xOf(entry);
        const cy = yOf(entry);
        const { node } = entry;
        const dark = entry.depth === 0;
        const textX = cx + r + 10;
        const clipId = node.photo ? `tree-clip-${(clipCount += 1)}` : null;

        return (
          <g key={`${node.name}-${entry.depth}-${entry.row}`}>
            {node.highlight ? (
              <circle cx={cx} cy={cy} fill="none" r={r + 5} stroke={theme.accent} strokeWidth={3} />
            ) : null}
            {node.photo && clipId ? (
              <>
                <clipPath id={clipId}>
                  <circle cx={cx} cy={cy} r={r} />
                </clipPath>
                <image
                  clipPath={`url(#${clipId})`}
                  height={r * 2}
                  href={node.photo}
                  preserveAspectRatio="xMidYMid slice"
                  width={r * 2}
                  x={cx - r}
                  y={cy - r}
                />
              </>
            ) : (
              <>
                <circle cx={cx} cy={cy} fill={dark ? theme.ink : theme.accentSoft} r={r} />
                <text
                  dominantBaseline="central"
                  fill={dark ? "#FFFFFF" : theme.accentText}
                  fontSize={Math.round(r * 0.72)}
                  fontWeight={600}
                  textAnchor="middle"
                  x={cx}
                  y={cy}
                >
                  {initialsOf(node.name)}
                </text>
              </>
            )}

            {node.fruit ? (
              <>
                <circle cx={cx + r - 4} cy={cy - r + 4} fill={theme.gold} r={9.5} stroke="#FFFFFF" strokeWidth={2} />
                <text
                  dominantBaseline="central"
                  fill="#FFFFFF"
                  fontSize={10.5}
                  fontWeight={700}
                  textAnchor="middle"
                  x={cx + r - 4}
                  y={cy - r + 4.5}
                >
                  {node.fruit}
                </text>
              </>
            ) : null}

            {node.highlight ? (
              <>
                <text
                  dominantBaseline="hanging"
                  fill={theme.ink}
                  fontSize={16}
                  fontWeight={700}
                  paintOrder="stroke"
                  stroke="#FFFFFF"
                  strokeLinejoin="round"
                  strokeWidth={5}
                  textAnchor="middle"
                  x={cx}
                  y={cy + r + 12}
                >
                  {node.name}
                </text>
                {node.role || node.meta ? (
                  <text
                    dominantBaseline="hanging"
                    fill={theme.muted}
                    fontSize={12}
                    paintOrder="stroke"
                    stroke="#FFFFFF"
                    strokeLinejoin="round"
                    strokeWidth={4}
                    textAnchor="middle"
                    x={cx}
                    y={cy + r + 32}
                  >
                    {[node.role, node.meta].filter(Boolean).join(" · ")}
                  </text>
                ) : null}
              </>
            ) : (
              <>
                <text
                  dominantBaseline="central"
                  fill={theme.ink}
                  fontSize={14.5}
                  fontWeight={600}
                  paintOrder="stroke"
                  stroke="#FFFFFF"
                  strokeLinejoin="round"
                  strokeWidth={4}
                  x={textX}
                  y={node.role || node.meta ? cy - 9 : cy}
                >
                  {node.name}
                </text>
                {node.role || node.meta ? (
                  <text
                    dominantBaseline="central"
                    fill={theme.muted}
                    fontSize={12}
                    paintOrder="stroke"
                    stroke="#FFFFFF"
                    strokeLinejoin="round"
                    strokeWidth={4}
                    x={textX}
                    y={cy + 10}
                  >
                    {[node.role, node.meta].filter(Boolean).join(" · ")}
                  </text>
                ) : null}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function TreeList({
  node,
  depth,
  theme,
}: {
  node: AdvisorExampleNetworkNode;
  depth: number;
  theme: ExampleTheme;
}) {
  return (
    <li>
      <div className="flex items-center gap-3 py-1.5">
        <span className="relative flex-shrink-0">
          <Avatar
            name={node.name}
            photo={node.photo}
            ring={Boolean(node.highlight)}
            size={node.highlight ? 44 : depth === 0 ? 36 : 32}
            theme={theme}
            tone={depth === 0 ? "dark" : "soft"}
          />
          {node.fruit ? (
            <span
              className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold text-white"
              style={{ backgroundColor: theme.gold, boxShadow: "0 0 0 2px #FFFFFF" }}
              title={`${node.fruit} fruit markers`}
            >
              {node.fruit}
            </span>
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="break-words text-[14px] font-semibold leading-5" style={{ color: theme.ink }}>
            {node.name}
          </p>
          {node.role || node.meta ? (
            <p className="break-words text-[12px] leading-4" style={{ color: theme.muted }}>
              {[node.role, node.meta].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
      {node.children && node.children.length > 0 ? (
        <ul className="ml-4 border-l-2 pl-4" style={{ borderColor: node.highlight ? theme.accent : theme.line }}>
          {node.children.map((child) => (
            <TreeList depth={depth + 1} key={child.name} node={child} theme={theme} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function MultiplicationTree({ network, theme }: { network: AdvisorExampleNetwork; theme: ExampleTheme }) {
  return (
    <div>
      <div className="hidden sm:block">
        <TreeSvg network={network} theme={theme} />
      </div>
      <ul className="sm:hidden">
        <TreeList depth={0} node={network.root} theme={theme} />
      </ul>
    </div>
  );
}

export function GenerationBars({
  items,
  theme,
}: {
  items: NonNullable<AdvisorExampleNetwork["generations"]>;
  theme: ExampleTheme;
}) {
  const max = Math.max(...items.map((item) => item.value)) || 1;

  return (
    <ol className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => {
        const opacity = 1 - (i / Math.max(items.length - 1, 1)) * 0.55;

        return (
          <li key={item.label} title={`${item.label}: ${item.value}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 break-words text-[13px]" style={{ color: theme.ink }}>
                {item.label}
              </span>
              <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: theme.ink }}>
                {item.value}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full" style={{ backgroundColor: theme.surfaceAlt, borderRadius: theme.radiusPx ? 4 : 0 }}>
              <div
                className="h-full"
                style={{
                  backgroundColor: theme.accent,
                  borderRadius: theme.radiusPx ? "0 4px 4px 0" : 0,
                  opacity,
                  width: `${(item.value / max) * 100}%`,
                }}
              />
            </div>
            {item.note ? (
              <p className="mt-1 text-[12px] leading-4" style={{ color: theme.muted }}>
                {item.note}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
