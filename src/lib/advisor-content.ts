import "server-only";

/**
 * The advisor briefing is private: names, financial figures, ministry detail,
 * partner lists, and meeting questions never live in this repository, which is
 * public. The layout in `app/advisor` is generic and content-driven; the
 * content itself arrives at runtime from ADVISOR_BRIEFING_CONTENT, a
 * server-side Vercel environment variable holding base64-encoded JSON.
 *
 * Base64 is transport encoding only. it is not a secret. The privacy comes
 * from the variable being server-side and encrypted at rest in Vercel, and
 * from `getAdvisorBriefingContent()` only ever being called after the access
 * cookie has been validated.
 *
 * Deliberately NOT a NEXT_PUBLIC_ variable: that would inline the payload into
 * the client bundle and defeat the whole design.
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
  stats: AdvisorExampleStat[];
  segments?: AdvisorExampleSegment[];
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

function isExampleStat(value: unknown): value is AdvisorExampleStat {
  return (
    isRecord(value)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.value)
    && optionalString(value.note)
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
  ) {
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

/**
 * Only call this once the advisor access cookie has been validated.
 *
 * Returns null. never throws and never logs the payload. when the variable
 * is missing, is not valid base64, is not valid JSON, or does not match the
 * schema above. The page renders a generic "unavailable" state in that case,
 * so a misconfiguration can never leak a partial payload or a stack trace
 * containing one.
 */
export function getAdvisorBriefingContent(): AdvisorBriefingContent | null {
  const encoded = process.env.ADVISOR_BRIEFING_CONTENT?.trim();

  if (!encoded) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");

    return parseAdvisorBriefingContent(JSON.parse(decoded));
  } catch {
    return null;
  }
}

/** Only call after the access cookie has been validated. */
export function getAdvisorExample(slug: string): AdvisorExample | null {
  const content = getAdvisorBriefingContent();

  return content?.examples?.find((example) => example.slug === slug) ?? null;
}

export function isAdvisorBriefingContentConfigured() {
  return Boolean(process.env.ADVISOR_BRIEFING_CONTENT?.trim());
}
