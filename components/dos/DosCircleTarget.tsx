import type { ReactNode } from "react";

/**
 * The DOS discipleship circle target — the 3 / 12 / 70 / 120 visual on the DOS
 * home screen, and the loading indicator in `DosTargetLoader`.
 *
 * This component holds no state so it renders in either environment: the home
 * screen passes `onSelectLayer` and drives `focusedLayer` from its own hover
 * state, while the loading screen renders it with neither and ships no JS.
 */
export type DosCircleLayer = "my_120" | "seventy" | "three" | "twelve";

export type DosCircleTargetCounts = {
  my3: number;
  my12: number;
  my70: number;
  my120: number;
};

/** The target is drawn at a fixed 236px so the ring geometry stays exact. */
export const dosCircleTargetSize = 236;

type LabelSpec = {
  color: string;
  layer: DosCircleLayer;
  name: string;
  position: string;
  value: string;
};

const outerLabels: LabelSpec[] = [
  {
    color: "text-[#60A5FA]",
    layer: "my_120",
    name: "My 120",
    position: "top-[5px] min-w-12 max-[350px]:top-[4px]",
    value: "120",
  },
  {
    color: "text-[#3B82F6]",
    layer: "seventy",
    name: "My 70",
    position: "top-[31px] min-w-11 max-[350px]:top-[28px]",
    value: "70",
  },
  {
    color: "text-[#2563EB]",
    layer: "twelve",
    name: "My 12",
    position: "top-[61px] min-w-11 max-[350px]:top-[54px]",
    value: "12",
  },
];

const interactiveLabelClass =
  "transition-all duration-200 hover:bg-[#EFF6FF] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25";

export function DosCircleTarget({
  counts,
  focusedLayer = null,
  onFocusLayer,
  onSelectLayer,
}: {
  counts: DosCircleTargetCounts;
  focusedLayer?: DosCircleLayer | null;
  onFocusLayer?: (layer: DosCircleLayer | null) => void;
  onSelectLayer?: (layer: DosCircleLayer) => void;
}) {
  const isMy3Focused = focusedLayer === "three";
  const isMy12Focused = focusedLayer === "twelve";
  const isMy70Focused = focusedLayer === "seventy";
  const isMy120Focused = focusedLayer === "my_120";
  const countByLayer: Record<DosCircleLayer, number> = {
    my_120: counts.my120,
    seventy: counts.my70,
    three: counts.my3,
    twelve: counts.my12,
  };

  /** Interactive mode wraps each label in a button; the loader renders plain text. */
  function label(spec: LabelSpec, children: ReactNode) {
    const shared = `absolute left-1/2 z-20 flex h-5 -translate-x-1/2 items-center justify-center rounded-full px-2 text-center text-[14px] font-extrabold leading-none max-[350px]:text-[13px] ${spec.position} ${spec.color}`;

    if (!onSelectLayer) {
      return (
        <span aria-hidden="true" className={shared} key={spec.layer}>
          {children}
        </span>
      );
    }

    return (
      <button
        aria-label={`Open ${spec.name}, ${countByLayer[spec.layer]} people`}
        className={`${shared} ${interactiveLabelClass}`}
        key={spec.layer}
        onClick={(event) => {
          event.stopPropagation();
          onSelectLayer(spec.layer);
        }}
        onFocus={() => onFocusLayer?.(spec.layer)}
        onMouseEnter={() => onFocusLayer?.(spec.layer)}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <div
      aria-label="Discipleship circle target"
      className="relative mx-auto mt-1 h-[236px] w-[236px] rounded-full max-[350px]:h-[220px] max-[350px]:w-[220px]"
      onBlur={
        onSelectLayer
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                onFocusLayer?.(null);
              }
            }
          : undefined
      }
      onMouseLeave={onSelectLayer ? () => onFocusLayer?.(null) : undefined}
    >
      <span
        className={`absolute inset-0 rounded-full border bg-white transition-all duration-200 ${
          isMy120Focused
            ? "border-[#2563EB]/55 shadow-[0_0_0_5px_rgba(37,99,235,0.055),0_18px_42px_rgba(37,99,235,0.08)]"
            : "border-[#DCEBFF] shadow-[0_16px_34px_rgba(37,99,235,0.045)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[184px] w-[184px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#F8FBFF] transition-all duration-200 max-[350px]:h-[172px] max-[350px]:w-[172px] ${
          isMy70Focused
            ? "border-[#2563EB]/60 shadow-[0_0_0_5px_rgba(37,99,235,0.06),inset_0_8px_26px_rgba(255,255,255,0.82),0_14px_30px_rgba(37,99,235,0.10)]"
            : "border-[#CFE0FF]/90 shadow-[inset_0_6px_26px_rgba(255,255,255,0.82)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[126px] w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#EBF2FF]/78 transition-all duration-200 max-[350px]:h-[118px] max-[350px]:w-[118px] ${
          isMy12Focused
            ? "border-[#2563EB]/60 shadow-[0_0_0_4px_rgba(37,99,235,0.075),inset_0_8px_24px_rgba(255,255,255,0.78)]"
            : "border-[#CFE0FF]/85 shadow-[inset_0_8px_24px_rgba(255,255,255,0.68)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#BFDBFE] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] transition-all duration-200 max-[350px]:h-[62px] max-[350px]:w-[62px] ${
          isMy3Focused
            ? "scale-[1.03] shadow-[0_14px_28px_rgba(37,99,235,0.36),inset_0_5px_14px_rgba(255,255,255,0.28)]"
            : "shadow-[0_12px_24px_rgba(37,99,235,0.30),inset_0_5px_14px_rgba(255,255,255,0.22)]"
        }`}
        aria-hidden="true"
      />
      {onSelectLayer ? (
        <svg
          aria-hidden="true"
          className="absolute inset-0 z-10 h-full w-full"
          viewBox="0 0 236 236"
        >
          {[
            { layer: "my_120" as const, radius: 108, width: 24 },
            { layer: "seventy" as const, radius: 83, width: 30 },
            { layer: "twelve" as const, radius: 55, width: 34 },
          ].map(({ layer, radius, width }) => (
            <circle
              className="cursor-pointer"
              cx="118"
              cy="118"
              fill="none"
              key={layer}
              onClick={() => onSelectLayer(layer)}
              onMouseEnter={() => onFocusLayer?.(layer)}
              pointerEvents="stroke"
              r={radius}
              stroke="transparent"
              strokeWidth={width}
            />
          ))}
          <circle
            className="cursor-pointer"
            cx="118"
            cy="118"
            fill="transparent"
            onClick={() => onSelectLayer("three")}
            onMouseEnter={() => onFocusLayer?.("three")}
            r="33"
          />
        </svg>
      ) : null}
      {outerLabels.map((spec) => label(spec, spec.value))}
      {onSelectLayer ? (
        <button
          aria-label={`Open My 3, ${counts.my3} people`}
          className="absolute left-1/2 top-1/2 z-30 flex h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center transition-colors duration-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 max-[350px]:h-[62px] max-[350px]:w-[62px]"
          onClick={(event) => {
            event.stopPropagation();
            onSelectLayer("three");
          }}
          onFocus={() => onFocusLayer?.("three")}
          onMouseEnter={() => onFocusLayer?.("three")}
          type="button"
        >
          <span className="text-[17px] font-extrabold leading-none text-white max-[350px]:text-[16px]">3</span>
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-30 flex h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center text-[17px] font-extrabold leading-none text-white max-[350px]:h-[62px] max-[350px]:w-[62px] max-[350px]:text-[16px]"
        >
          3
        </span>
      )}
    </div>
  );
}
