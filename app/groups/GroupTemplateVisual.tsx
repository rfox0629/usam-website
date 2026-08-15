type GroupTemplateInput = {
  name: string;
  slug: string;
  tagline?: string | null;
  type?: string | null;
};

type GroupTemplateVisual = {
  accent: string;
  label: string;
  lines: string[];
  mark: string;
  tone: "activity" | "community" | "discipleship";
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function activityWord(input: GroupTemplateInput) {
  const text = `${input.slug} ${input.name} ${input.type ?? ""} ${input.tagline ?? ""}`.toLowerCase();

  if (text.includes("walking") || text.includes("walk")) {
    return "WALK";
  }

  if (text.includes("hiking") || text.includes("hike")) {
    return "HIKE";
  }

  if (text.includes("cycling") || text.includes("cycle") || text.includes("bike")) {
    return "RIDE";
  }

  if (text.includes("running") || text.includes("run") || text.includes("2three2")) {
    return "RUN";
  }

  return "";
}

function taglineLines(value: string | null | undefined) {
  return normalizeText(value)
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => `${part.toUpperCase()}.`);
}

function activityLabel(action: string) {
  if (action === "RUN") {
    return "Running Group";
  }

  if (action === "WALK") {
    return "Walking Group";
  }

  if (action === "HIKE") {
    return "Hiking Group";
  }

  if (action === "RIDE") {
    return "Cycling Group";
  }

  return "Activity Group";
}

export function groupTemplateVisual(input: GroupTemplateInput): GroupTemplateVisual {
  const text = `${input.slug} ${input.name} ${input.type ?? ""} ${input.tagline ?? ""}`.toLowerCase();
  const action = activityWord(input);
  const tagline = taglineLines(input.tagline);

  if (action) {
    return {
      accent: "blue",
      label: activityLabel(action),
      lines: [action, "PRAY", "PURSUE"].map((line) => `${line}.`),
      mark: "2:22",
      tone: "activity",
    };
  }

  if (text.includes("women")) {
    return {
      accent: "rose",
      label: "Women's Group",
      lines: tagline.length ? tagline : ["GROW.", "PRAY.", "TOGETHER."],
      mark: "",
      tone: "community",
    };
  }

  if (tagline.some((line) => line.includes("BROTHERHOOD"))) {
    return {
      accent: "amber",
      label: "Men's Group",
      lines: tagline,
      mark: "",
      tone: "community",
    };
  }

  if (text.includes("men")) {
    return {
      accent: "amber",
      label: "Men's Group",
      lines: tagline.length ? tagline : ["GROW TOGETHER."],
      mark: "",
      tone: "community",
    };
  }

  return {
    accent: "blue",
    label: normalizeText(input.type) || "Discipleship Group",
    lines: tagline.length ? tagline : ["GATHER.", "PRAY.", "GO."],
    mark: "",
    tone: "discipleship",
  };
}

export function formatLeaderLine(leaders: string[]) {
  const visibleLeaders = leaders.map((leader) => leader.trim()).filter(Boolean);

  if (!visibleLeaders.length) {
    return "Led by group leaders";
  }

  if (visibleLeaders.length === 1) {
    return `Led by ${visibleLeaders[0]}`;
  }

  if (visibleLeaders.length === 2) {
    return `Led by ${visibleLeaders[0]} & ${visibleLeaders[1]}`;
  }

  return `Led by ${visibleLeaders.slice(0, -1).join(", ")} & ${visibleLeaders[visibleLeaders.length - 1]}`;
}

function accentClass(value: GroupTemplateVisual["accent"]) {
  if (value === "rose") {
    return "from-[#DBEAFE] via-[#EBF2FF] to-[#FFF4EC]";
  }

  if (value === "blue") {
    return "from-[#DBEAFE] via-[#E0E7FF] to-[#F8FBFF]";
  }

  return "from-[#EBF2FF] via-[#DBEAFE] to-[#F8FBFF]";
}

export function GroupTemplateArtwork({
  className = "",
  input,
  size = "card",
}: {
  className?: string;
  input: GroupTemplateInput;
  size?: "card" | "hero" | "member";
}) {
  const visual = groupTemplateVisual(input);
  const isHero = size === "hero";
  const isMember = size === "member";
  const hasLongLine = visual.lines.some((line) => line.length >= 11);
  const minHeight = isHero ? "min-h-[15rem]" : isMember ? "min-h-[9rem]" : "min-h-[8.5rem]";
  const lineSize = isHero
    ? hasLongLine ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
    : isMember ? "text-2xl" : "text-xl";

  return (
    <div className={`relative isolate overflow-hidden border-b border-[#EAF2FF] bg-[#F8FBFF] ${minHeight} ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]"
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-20 bg-gradient-to-br ${accentClass(visual.accent)}`}
      />
      <div className="flex h-full min-h-[inherit] flex-col justify-between p-4">
        <div className="flex min-w-0 items-start justify-end gap-3">
          {visual.mark ? (
            <span className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-[#1D4ED8]">
              {visual.mark}
            </span>
          ) : null}
        </div>
        <div className="mt-5 grid gap-1">
          {visual.lines.map((line) => (
            <p className={`${lineSize} font-black leading-none text-[#0F172A]`} key={line}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
