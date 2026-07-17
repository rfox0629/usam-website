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

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
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

export function groupTemplateVisual(input: GroupTemplateInput): GroupTemplateVisual {
  const text = `${input.slug} ${input.name} ${input.type ?? ""} ${input.tagline ?? ""}`.toLowerCase();
  const action = activityWord(input);
  const tagline = taglineLines(input.tagline);

  if (action) {
    return {
      accent: action === "RUN" ? "amber" : "blue",
      label: `2three2 ${titleCase(action.toLowerCase())}`,
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
      mark: "GO",
      tone: "community",
    };
  }

  if (tagline.some((line) => line.includes("BROTHERHOOD"))) {
    return {
      accent: "amber",
      label: "Men's Group",
      lines: tagline,
      mark: "GO",
      tone: "community",
    };
  }

  if (text.includes("men")) {
    return {
      accent: "amber",
      label: "Men's Group",
      lines: tagline.length ? tagline : ["GROW TOGETHER."],
      mark: "GO",
      tone: "community",
    };
  }

  return {
    accent: "blue",
    label: normalizeText(input.type) || "Discipleship Group",
    lines: tagline.length ? tagline : ["GATHER.", "PRAY.", "GO."],
    mark: "GO",
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
    return "from-[#F8C56A]/12 via-[#C2A14E]/22 to-[#7C2D12]/10";
  }

  if (value === "blue") {
    return "from-[#F8C56A]/10 via-[#60A5FA]/18 to-[#0F172A]/10";
  }

  return "from-[#F8C56A]/14 via-[#C2A14E]/24 to-[#0F172A]/10";
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
    <div className={`relative isolate overflow-hidden rounded-lg border border-[#C2A14E]/28 bg-[#080A0D] ${minHeight} ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]"
      />
      <div aria-hidden="true" className={`absolute inset-0 -z-20 bg-gradient-to-br ${accentClass(visual.accent)}`} />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-24 bg-[linear-gradient(100deg,transparent,rgba(248,197,106,0.24),transparent)]" />
      <div className="flex h-full min-h-[inherit] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">{visual.label}</p>
          <span className="rounded-sm border border-[#C2A14E]/35 bg-black/28 px-2 py-1 text-[10px] font-black text-[#F8C56A]">
            {visual.mark}
          </span>
        </div>
        <div className="mt-5 grid gap-1">
          {visual.lines.map((line) => (
            <p className={`${lineSize} font-black leading-none text-white`} key={line}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
