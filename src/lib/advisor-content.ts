import "server-only";
import advisorBriefingContent from "@/src/content/advisor-briefing.json";

/**
 * The advisor briefing content is committed with the application by the
 * ministry owner's explicit choice. The website remains protected by the
 * advisor access gate, but the repository itself is public.
 *
 * Keep this module server-only so the content is rendered after the access
 * cookie is validated and is not bundled into client-side JavaScript.
 */

export type AdvisorFigure = {
  label: string;
  value: string;
  note?: string;
};

export type AdvisorLink = {
  label: string;
  href: string;
  description?: string;
};

export type AdvisorQuestion = {
  prompt: string;
  detail?: string;
};

export type AdvisorDashboardMetric = {
  label: string;
  value: string;
  delta?: string;
};

export type AdvisorDashboardRow = {
  label: string;
  value: string;
  meta?: string;
};

export type AdvisorDashboardPanel = {
  title: string;
  rows: AdvisorDashboardRow[];
};

export type AdvisorDashboardProgress = {
  label: string;
  value: number;
  max: number;
};

/** An illustrative still of DOS configured for a given ministry. */
export type AdvisorDashboard = {
  org: string;
  view?: string;
  caption?: string;
  metrics?: AdvisorDashboardMetric[];
  panels?: AdvisorDashboardPanel[];
  progress?: AdvisorDashboardProgress[];
};

export type AdvisorBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "figures"; items: AdvisorFigure[]; note?: string }
  | { type: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { type: "callout"; title?: string; text: string; tone?: "neutral" | "gold" | "warning" }
  | { type: "questions"; items: AdvisorQuestion[] }
  | { type: "tabs"; note?: string; tabs: AdvisorTab[] }
  | { type: "links"; groups: AdvisorLinkGroup[] }
  | { type: "dashboard"; dashboard: AdvisorDashboard }
  | { type: "exampleCards"; note?: string; slugs: string[] };

export type AdvisorTab = {
  id: string;
  label: string;
  caption?: string;
  blocks: AdvisorBlock[];
};

export type AdvisorLinkGroup = {
  title: string;
  note?: string;
  links: AdvisorLink[];
};

export type AdvisorSection = {
  id: string;
  navLabel: string;
  eyebrow?: string;
  heading: string;
  lede?: string;
  variant?: "plain" | "panel" | "feature";
  blocks: AdvisorBlock[];
};


/* ---------------------------------------------------------------------- */
/* DASHBOARD CONCEPTS                                                      */
/* ---------------------------------------------------------------------- */

/*
 * A full-page, illustrative view of what DOS could look like for one
 * organisation.
 *
 * Everything that identifies an organisation lives in the payload: its name,
 * its slug, its figures, its wording. This repository carries only the two
 * visual treatments and the rendering. That keeps organisation names, figures
 * and any partnership assumption out of a public repository, and it means a
 * concept can be added or removed without a deploy.
 */

export type AdvisorExampleStat = {
  label: string;
  value: string;
  note?: string;
  /** Signed change against a named period, for example "+12 vs last period". */
  delta?: string;
  /** Twelve or so points for a sparkline; the last one is the current period. */
  trend?: number[];
  /** A short tag rendered beside the label, for example "Verified". */
  tag?: string;
};

export type AdvisorExampleSegment = {
  /** A campus, a region, a team. */
  name: string;
  stats: AdvisorExampleStat[];
  attention?: string;
};

export type AdvisorExampleProgress = {
  label: string;
  value: number;
  max: number;
  note?: string;
};

export type AdvisorExampleListItem = {
  label: string;
  value?: string;
  meta?: string;
};

export type AdvisorExampleList = {
  title: string;
  note?: string;
  items: AdvisorExampleListItem[];
};

export type AdvisorExampleActivity = {
  when: string;
  what: string;
};

/** One person, shown in place: who they are, which campus, who leads that campus. */
export type AdvisorExampleSpotlight = {
  title: string;
  note?: string;
  person: {
    name: string;
    role: string;
    /** A path under /public. The photo must already be public elsewhere on the site. */
    photo?: string;
  };
  place: {
    name: string;
    detail?: string;
  };
  lead: {
    name: string;
    role: string;
  };
  stats: AdvisorExampleStat[];
  tags?: string[];
};

/** A node in the multiplication tree: one person and the people they disciple. */
export type AdvisorExampleNetworkNode = {
  name: string;
  role?: string;
  photo?: string;
  /** Fruit markers recorded for this person. */
  fruit?: number;
  meta?: string;
  highlight?: boolean;
  children?: AdvisorExampleNetworkNode[];
};

export type AdvisorExampleNetwork = {
  title: string;
  note?: string;
  root: AdvisorExampleNetworkNode;
  /** Optional bars beside the tree, for example people per generation. */
  generations?: { label: string; value: number; note?: string }[];
  /** Optional column headings for the tree, one per generation from the root. */
  columns?: string[];
  legend?: string;
};

/** Meetings by day of the week, to show ministry continuing past Sunday. */
export type AdvisorExampleRhythm = {
  title: string;
  note?: string;
  days: { label: string; value: number; gathering?: boolean }[];
  places?: { label: string; value: string }[];
  callout?: string;
};

/** One measure over time, for example meetings per week. */
export type AdvisorExampleTrend = {
  title: string;
  note?: string;
  labels: string[];
  values: number[];
  unit?: string;
};

/** Real, verified numbers shown beside the illustrative ones, clearly apart. */
export type AdvisorExampleVerified = {
  title: string;
  note: string;
  stats: AdvisorExampleStat[];
};

export type AdvisorExample = {
  slug: string;
  name: string;
  /* Visual treatment only. Carries no organisation identity. */
  theme: "contemporary" | "tactical";
  kicker?: string;
  intro?: string;
  /** Required. States plainly that this is a concept, not a live account. */
  disclaimer: string;
  /** Overrides the default "Illustrative figures" wording. */
  illustrativeLabel?: string;
  segmentLabel?: string;
  /** The reporting period shown in the dashboard chrome, for example "Last 30 days". */
  period?: string;
  /** Decorative navigation labels for the dashboard chrome. The first is the active one. */
  nav?: string[];
  stats: AdvisorExampleStat[];
  segments?: AdvisorExampleSegment[];
  spotlight?: AdvisorExampleSpotlight;
  network?: AdvisorExampleNetwork;
  rhythm?: AdvisorExampleRhythm;
  trend?: AdvisorExampleTrend;
  progress?: AdvisorExampleProgress[];
  lists?: AdvisorExampleList[];
  activity?: AdvisorExampleActivity[];
  verified?: AdvisorExampleVerified;
};

export type AdvisorBriefingContent = {
  meta: {
    title: string;
    subtitle?: string;
    preparedFor?: string;
    preparedBy?: string;
    date?: string;
    confidentialNote?: string;
  };
  sections: AdvisorSection[];
  examples?: AdvisorExample[];
  footerNote?: string;
};

/* ---------------------------------------------------------------------- */
/* VALIDATION                                                              */
/* ---------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function optionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isFigure(value: unknown): value is AdvisorFigure {
  return (
    isRecord(value)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.value)
    && optionalString(value.note)
  );
}

function isLink(value: unknown): value is AdvisorLink {
  return (
    isRecord(value)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.href)
    && optionalString(value.description)
  );
}

function isQuestion(value: unknown): value is AdvisorQuestion {
  return isRecord(value) && isNonEmptyString(value.prompt) && optionalString(value.detail);
}

function isLinkGroup(value: unknown): value is AdvisorLinkGroup {
  return (
    isRecord(value)
    && isNonEmptyString(value.title)
    && optionalString(value.note)
    && Array.isArray(value.links)
    && value.links.every(isLink)
  );
}

function isTab(value: unknown): value is AdvisorTab {
  return (
    isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && optionalString(value.caption)
    && Array.isArray(value.blocks)
    && value.blocks.every(isBlock)
  );
}

function isBlock(value: unknown): value is AdvisorBlock {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "paragraph":
      return isNonEmptyString(value.text);
    case "bullets":
    case "steps":
      return isStringArray(value.items) && value.items.length > 0;
    case "quote":
      return isNonEmptyString(value.text) && optionalString(value.attribution);
    case "figures":
      return Array.isArray(value.items) && value.items.length > 0 && value.items.every(isFigure)
        && optionalString(value.note);
    case "table":
      return (
        isStringArray(value.columns)
        && value.columns.length > 0
        && Array.isArray(value.rows)
        && value.rows.every(isStringArray)
        && optionalString(value.caption)
      );
    case "callout":
      return (
        isNonEmptyString(value.text)
        && optionalString(value.title)
        && (value.tone === undefined || value.tone === "neutral" || value.tone === "gold" || value.tone === "warning")
      );
    case "questions":
      return Array.isArray(value.items) && value.items.length > 0 && value.items.every(isQuestion);
    case "tabs":
      return Array.isArray(value.tabs) && value.tabs.length > 0 && value.tabs.every(isTab)
        && optionalString(value.note);
    case "links":
      return Array.isArray(value.groups) && value.groups.length > 0 && value.groups.every(isLinkGroup);
    case "dashboard":
      return isDashboard(value.dashboard);
    case "exampleCards":
      return isStringArray(value.slugs) && value.slugs.length > 0 && optionalString(value.note);
    default:
      return false;
  }
}

function isDashboardRow(value: unknown): value is AdvisorDashboardRow {
  return (
    isRecord(value)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.value)
    && optionalString(value.meta)
  );
}

function isDashboard(value: unknown): value is AdvisorDashboard {
  if (!isRecord(value) || !isNonEmptyString(value.org)) {
    return false;
  }

  if (!optionalString(value.view) || !optionalString(value.caption)) {
    return false;
  }

  if (
    value.metrics !== undefined
    && !(
      Array.isArray(value.metrics)
      && value.metrics.every(
        (metric) =>
          isRecord(metric)
          && isNonEmptyString(metric.label)
          && isNonEmptyString(metric.value)
          && optionalString(metric.delta),
      )
    )
  ) {
    return false;
  }

  if (
    value.panels !== undefined
    && !(
      Array.isArray(value.panels)
      && value.panels.every(
        (panel) =>
          isRecord(panel)
          && isNonEmptyString(panel.title)
          && Array.isArray(panel.rows)
          && panel.rows.every(isDashboardRow),
      )
    )
  ) {
    return false;
  }

  if (
    value.progress !== undefined
    && !(
      Array.isArray(value.progress)
      && value.progress.every(
        (item) =>
          isRecord(item)
          && isNonEmptyString(item.label)
          && typeof item.value === "number"
          && typeof item.max === "number"
          && item.max > 0,
      )
    )
  ) {
    return false;
  }

  // A dashboard with no content at all is almost certainly a mistake.
  return Boolean(value.metrics || value.panels || value.progress);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

function isExampleStat(value: unknown): value is AdvisorExampleStat {
  return (
    isRecord(value)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.value)
    && optionalString(value.note)
    && optionalString(value.delta)
    && optionalString(value.tag)
    && (value.trend === undefined || (isNumberArray(value.trend) && value.trend.length >= 2))
  );
}

function isExampleSpotlight(value: unknown): value is AdvisorExampleSpotlight {
  return (
    isRecord(value)
    && isNonEmptyString(value.title)
    && optionalString(value.note)
    && isRecord(value.person)
    && isNonEmptyString(value.person.name)
    && isNonEmptyString(value.person.role)
    && optionalString(value.person.photo)
    && isRecord(value.place)
    && isNonEmptyString(value.place.name)
    && optionalString(value.place.detail)
    && isRecord(value.lead)
    && isNonEmptyString(value.lead.name)
    && isNonEmptyString(value.lead.role)
    && Array.isArray(value.stats)
    && value.stats.length > 0
    && value.stats.every(isExampleStat)
    && (value.tags === undefined || isStringArray(value.tags))
  );
}

function isNetworkNode(value: unknown, depth = 0): value is AdvisorExampleNetworkNode {
  // Six generations is far past anything the tree can draw legibly.
  if (depth > 6 || !isRecord(value) || !isNonEmptyString(value.name)) {
    return false;
  }

  return (
    optionalString(value.role)
    && optionalString(value.photo)
    && optionalString(value.meta)
    && (value.fruit === undefined || (typeof value.fruit === "number" && value.fruit >= 0))
    && (value.highlight === undefined || typeof value.highlight === "boolean")
    && (value.children === undefined
      || (Array.isArray(value.children) && value.children.every((child) => isNetworkNode(child, depth + 1))))
  );
}

function isExampleNetwork(value: unknown): value is AdvisorExampleNetwork {
  return (
    isRecord(value)
    && isNonEmptyString(value.title)
    && optionalString(value.note)
    && optionalString(value.legend)
    && (value.columns === undefined || isStringArray(value.columns))
    && isNetworkNode(value.root)
    && (value.generations === undefined
      || (Array.isArray(value.generations)
        && value.generations.every(
          (item) =>
            isRecord(item)
            && isNonEmptyString(item.label)
            && typeof item.value === "number"
            && item.value >= 0
            && optionalString(item.note),
        )))
  );
}

function isExampleRhythm(value: unknown): value is AdvisorExampleRhythm {
  return (
    isRecord(value)
    && isNonEmptyString(value.title)
    && optionalString(value.note)
    && optionalString(value.callout)
    && Array.isArray(value.days)
    && value.days.length > 0
    && value.days.every(
      (day) =>
        isRecord(day)
        && isNonEmptyString(day.label)
        && typeof day.value === "number"
        && day.value >= 0
        && (day.gathering === undefined || typeof day.gathering === "boolean"),
    )
    && (value.places === undefined
      || (Array.isArray(value.places)
        && value.places.every(
          (place) => isRecord(place) && isNonEmptyString(place.label) && isNonEmptyString(place.value),
        )))
  );
}

function isExampleTrend(value: unknown): value is AdvisorExampleTrend {
  return (
    isRecord(value)
    && isNonEmptyString(value.title)
    && optionalString(value.note)
    && optionalString(value.unit)
    && isStringArray(value.labels)
    && isNumberArray(value.values)
    && value.values.length >= 2
    && value.labels.length === value.values.length
  );
}

function isExampleList(value: unknown): value is AdvisorExampleList {
  return (
    isRecord(value)
    && isNonEmptyString(value.title)
    && optionalString(value.note)
    && Array.isArray(value.items)
    && value.items.every(
      (item) =>
        isRecord(item)
        && isNonEmptyString(item.label)
        && optionalString(item.value)
        && optionalString(item.meta),
    )
  );
}

function isExample(value: unknown): value is AdvisorExample {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isNonEmptyString(value.slug)
    || !isNonEmptyString(value.name)
    || !isNonEmptyString(value.disclaimer)
    || (value.theme !== "contemporary" && value.theme !== "tactical")
  ) {
    return false;
  }

  if (
    !optionalString(value.kicker)
    || !optionalString(value.intro)
    || !optionalString(value.illustrativeLabel)
    || !optionalString(value.segmentLabel)
    || !optionalString(value.period)
    || (value.nav !== undefined && !isStringArray(value.nav))
  ) {
    return false;
  }

  if (value.spotlight !== undefined && !isExampleSpotlight(value.spotlight)) {
    return false;
  }

  if (value.network !== undefined && !isExampleNetwork(value.network)) {
    return false;
  }

  if (value.rhythm !== undefined && !isExampleRhythm(value.rhythm)) {
    return false;
  }

  if (value.trend !== undefined && !isExampleTrend(value.trend)) {
    return false;
  }

  if (!Array.isArray(value.stats) || value.stats.length === 0 || !value.stats.every(isExampleStat)) {
    return false;
  }

  if (
    value.segments !== undefined
    && !(
      Array.isArray(value.segments)
      && value.segments.every(
        (segment) =>
          isRecord(segment)
          && isNonEmptyString(segment.name)
          && Array.isArray(segment.stats)
          && segment.stats.every(isExampleStat)
          && optionalString(segment.attention),
      )
    )
  ) {
    return false;
  }

  if (
    value.progress !== undefined
    && !(
      Array.isArray(value.progress)
      && value.progress.every(
        (item) =>
          isRecord(item)
          && isNonEmptyString(item.label)
          && typeof item.value === "number"
          && typeof item.max === "number"
          && item.max > 0
          && optionalString(item.note),
      )
    )
  ) {
    return false;
  }

  if (value.lists !== undefined && !(Array.isArray(value.lists) && value.lists.every(isExampleList))) {
    return false;
  }

  if (
    value.activity !== undefined
    && !(
      Array.isArray(value.activity)
      && value.activity.every(
        (item) => isRecord(item) && isNonEmptyString(item.when) && isNonEmptyString(item.what),
      )
    )
  ) {
    return false;
  }

  if (
    value.verified !== undefined
    && !(
      isRecord(value.verified)
      && isNonEmptyString(value.verified.title)
      && isNonEmptyString(value.verified.note)
      && Array.isArray(value.verified.stats)
      && value.verified.stats.every(isExampleStat)
    )
  ) {
    return false;
  }

  return true;
}

function isSection(value: unknown): value is AdvisorSection {
  return (
    isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.navLabel)
    && isNonEmptyString(value.heading)
    && optionalString(value.eyebrow)
    && optionalString(value.lede)
    && (value.variant === undefined || value.variant === "plain" || value.variant === "panel" || value.variant === "feature")
    && Array.isArray(value.blocks)
    && value.blocks.every(isBlock)
  );
}

export function parseAdvisorBriefingContent(value: unknown): AdvisorBriefingContent | null {
  if (!isRecord(value) || !isRecord(value.meta) || !isNonEmptyString(value.meta.title)) {
    return null;
  }

  const { meta } = value;

  if (
    !optionalString(meta.subtitle)
    || !optionalString(meta.preparedFor)
    || !optionalString(meta.preparedBy)
    || !optionalString(meta.date)
    || !optionalString(meta.confidentialNote)
  ) {
    return null;
  }

  if (!Array.isArray(value.sections) || value.sections.length === 0 || !value.sections.every(isSection)) {
    return null;
  }

  if (!optionalString(value.footerNote)) {
    return null;
  }

  if (value.examples !== undefined && !(Array.isArray(value.examples) && value.examples.every(isExample))) {
    return null;
  }

  return value as unknown as AdvisorBriefingContent;
}

/* ---------------------------------------------------------------------- */
/* LOADER                                                                  */
/* ---------------------------------------------------------------------- */

const committedAdvisorBriefingContent = parseAdvisorBriefingContent(advisorBriefingContent);

/**
 * Only call this once the advisor access cookie has been validated.
 */
export function getAdvisorBriefingContent(): AdvisorBriefingContent | null {
  return committedAdvisorBriefingContent;
}

/** Only call after the access cookie has been validated. */
export function getAdvisorExample(slug: string): AdvisorExample | null {
  return committedAdvisorBriefingContent?.examples?.find((example) => example.slug === slug) ?? null;
}

export function isAdvisorBriefingContentConfigured() {
  return committedAdvisorBriefingContent !== null;
}
