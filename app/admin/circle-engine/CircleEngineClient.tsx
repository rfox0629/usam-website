"use client";

import { RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DosCircleConfig, DosCircleData, DosRelationshipScore } from "@/src/lib/dos/circle-scoring";

type WorkspaceOption = {
  id: string;
  label: string;
};

const weightFields = [
  { key: "meetingFrequencyWeight", label: "Meeting Frequency" },
  { key: "timeInvestedWeight", label: "Time Invested" },
  { key: "discipleshipProgressWeight", label: "Discipleship Progress" },
  { key: "fruitWeight", label: "Fruit" },
  { key: "momentumWeight", label: "Momentum" },
  { key: "multiplicationWeight", label: "Multiplication" },
] as const;

const breakdownLabels: Record<keyof DosRelationshipScore["breakdown"], string> = {
  discipleshipProgress: "Discipleship progress",
  fruit: "Fruit",
  meetingFrequency: "Meeting frequency",
  momentum: "Momentum",
  multiplication: "Multiplication",
  timeInvested: "Time invested",
};

type CircleOverrideSelection = "auto" | DosRelationshipScore["circle"];

const overrideOptions: Array<{ label: string; value: CircleOverrideSelection }> = [
  { label: "Auto", value: "auto" },
  { label: "My 3", value: "three" },
  { label: "My 12", value: "twelve" },
  { label: "My 70", value: "seventy" },
  { label: "My 120", value: "my_120" },
  { label: "Field", value: "field" },
];

const circleDefinitions: Array<{
  circle: DosRelationshipScore["circle"];
  description: string;
  emptyText: string;
  label: string;
}> = [
  {
    circle: "three",
    description: "Highest-focus people who need close, consistent attention right now.",
    emptyText: "No one is in My 3 yet. The engine will only place people here when scoring or a manual pin warrants it.",
    label: "My 3",
  },
  {
    circle: "twelve",
    description: "Active discipleship relationships with meaningful ongoing activity.",
    emptyText: "No one is in My 12 yet. That is okay for an early or quiet workspace.",
    label: "My 12",
  },
  {
    circle: "seventy",
    description: "Broader field relationships that still have enough activity to stay visible.",
    emptyText: "No one is in My 70 yet. People will appear here after the focused circles and activity support it.",
    label: "My 70",
  },
  {
    circle: "my_120",
    description: "Extended active field relationships beyond My 70 that should remain on the current radar.",
    emptyText: "No one is in My 120 yet. People will appear here after My 70 and activity support it.",
    label: "My 120",
  },
  {
    circle: "field",
    description: "Everyone outside My 3, My 12, My 70, and My 120. Field remains internal and outside the current focused circles.",
    emptyText: "Field is empty because everyone with a score is currently in a focused circle.",
    label: "Field",
  },
];

type CircleHistoryItem = {
  calculatedAt: string | null;
  movementReason: DosRelationshipScore["explanation"] | null;
  newCircle: DosRelationshipScore["circle"];
  newScore: number;
  previousCircle: DosRelationshipScore["circle"] | null;
  previousScore: number | null;
};

type HistoryStatus = "error" | "idle" | "loading" | "ready";

function circleLabel(circle: string) {
  return {
    field: "Field",
    my_120: "My 120",
    seventy: "My 70",
    three: "My 3",
    twelve: "My 12",
  }[circle] ?? "Field";
}

function score(value: number) {
  return String(Math.round(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not calculated yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function WeightInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="grid gap-2 rounded-lg border border-stone-800 bg-[#080808] p-3">
      <span className="text-xs font-medium text-stone-300">{label}</span>
      <div className="flex items-center gap-3">
        <input
          className="h-1.5 min-w-0 flex-1 accent-[#C9A24A]"
          max={100}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          type="range"
          value={value}
        />
        <input
          className="h-9 w-16 rounded-md border border-stone-700 bg-[#050505] px-2 text-sm text-stone-100 outline-none focus:border-[#C9A24A]"
          max={100}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
      </div>
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-[#080808] p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p>
    </div>
  );
}

function DistributionCard({
  description,
  emptyText,
  label,
  value,
}: {
  description: string;
  emptyText: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-[#080808] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-100">{label}</p>
        <span className="rounded-full bg-[#C9A24A]/10 px-2.5 py-1 text-xs font-semibold text-[#E4C465]">{value}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-400">{value === 0 ? emptyText : description}</p>
    </div>
  );
}

function AssignmentBadge({ source }: { source: DosRelationshipScore["assignmentSource"] }) {
  const isManual = source === "manual";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
      isManual
        ? "border-[#C9A24A]/40 bg-[#C9A24A]/10 text-[#E4C465]"
        : "border-stone-700 bg-[#050505] text-stone-300"
    }`}>
      {isManual ? "Manual Pin" : "Auto Assigned"}
    </span>
  );
}

function ScoreHistory({
  error,
  history,
  status,
}: {
  error: string;
  history: CircleHistoryItem[] | null;
  status: HistoryStatus;
}) {
  return (
    <div className="mt-4 rounded-lg border border-stone-800 bg-[#050505] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Score history</p>
      {status === "loading" ? (
        <p className="mt-3 rounded-md border border-stone-800 bg-[#080808] px-3 py-2 text-sm text-stone-400">Loading score history...</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 rounded-md border border-red-900/50 bg-red-950/20 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}
      {status === "ready" && history?.length ? (
        <div className="mt-3 grid gap-2">
          {history.slice(0, 5).map((item, index) => (
            <div className="rounded-md border border-stone-800 bg-[#080808] px-3 py-2" key={`${item.calculatedAt}-${item.newCircle}-${item.newScore}-${index}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-200">
                  {item.previousCircle ? circleLabel(item.previousCircle) : "New"} to {circleLabel(item.newCircle)}
                </p>
                <span className="text-xs text-stone-500">{formatDateTime(item.calculatedAt)}</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Score {item.previousScore === null ? "new" : score(item.previousScore)} to {score(item.newScore)}
              </p>
              {item.movementReason?.summary ? (
                <p className="mt-2 text-xs leading-5 text-stone-400">{item.movementReason.summary}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {status === "ready" && !history?.length ? (
        <p className="mt-3 rounded-md border border-stone-800 bg-[#080808] px-3 py-2 text-sm leading-6 text-stone-400">
          No score history yet. History appears after the engine recalculates and detects a score or circle movement.
        </p>
      ) : null}
    </div>
  );
}

function PersonDiagnostic({
  disabled,
  history,
  historyError,
  historyStatus,
  onSaveOverride,
  score: item,
}: {
  disabled: boolean;
  history: CircleHistoryItem[] | null;
  historyError: string;
  historyStatus: HistoryStatus;
  onSaveOverride: (personId: string, circle: CircleOverrideSelection, reason: string, currentCircle: DosRelationshipScore["circle"]) => Promise<void>;
  score: DosRelationshipScore;
}) {
  const [overrideCircle, setOverrideCircle] = useState<CircleOverrideSelection>(item.assignmentSource === "manual" ? item.circle : "auto");
  const [overrideReason, setOverrideReason] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const strongestSignals = Object.entries(item.breakdown)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 3) as Array<[keyof DosRelationshipScore["breakdown"], number]>;
  const assignmentMode = item.assignmentSource === "manual" ? "Manual Pin" : "Auto Assigned";

  useEffect(() => {
    setOverrideCircle(item.assignmentSource === "manual" ? item.circle : "auto");
    setOverrideReason("");
  }, [item.assignmentSource, item.circle, item.person.id]);

  async function saveOverride() {
    setIsSavingOverride(true);

    try {
      await onSaveOverride(item.person.id, overrideCircle, overrideReason, item.circle);
    } finally {
      setIsSavingOverride(false);
    }
  }

  return (
    <article className="rounded-lg border border-stone-800 bg-[#080808] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-stone-100">{item.person.name}</p>
          <p className="mt-1 text-xs text-stone-500">
            {item.person.relationshipType ?? "Relationship"} · {item.person.engagementLevel ?? "No engagement set"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#C9A24A]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E4C465]">
            {circleLabel(item.circle)}
          </span>
          <AssignmentBadge source={item.assignmentSource} />
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Current assignment: {circleLabel(item.circle)} · {assignmentMode}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <SummaryCard label="Score" value={score(item.totalScore)} />
        <SummaryCard label="Trust" value={score(item.confidenceScore)} />
        <SummaryCard label="Last calculated" value={item.lastCalculatedAt ? formatDateTime(item.lastCalculatedAt) : "Not yet"} />
      </div>

      <div className="mt-4 rounded-lg border border-stone-800 bg-[#050505] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Why this circle?</p>
        <p className="mt-2 text-sm leading-6 text-stone-200">{item.explanation.summary}</p>
        {item.explanation.positive_factors.length ? (
          <div className="mt-3 grid gap-1.5">
            {item.explanation.positive_factors.slice(0, 4).map((factor) => (
              <p className="text-xs leading-5 text-stone-400" key={factor}>+ {factor}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {strongestSignals.map(([key, value]) => (
          <div className="rounded-lg border border-stone-800 bg-[#050505] p-3" key={key}>
            <p className="text-xs text-stone-500">{breakdownLabels[key]}</p>
            <p className="mt-1 text-lg font-semibold text-stone-100">{score(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-stone-800 bg-[#050505] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Manual override</p>
        <p className="mt-2 text-xs leading-5 text-stone-400">
          Auto Assigned follows the scoring model. Manual Pin locks this person into the selected circle until an admin returns them to Auto.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-stone-400">Assignment</span>
            <select
              className="h-10 rounded-md border border-stone-700 bg-[#080808] px-3 text-sm text-stone-100 outline-none focus:border-[#C9A24A]"
              disabled={disabled || isSavingOverride}
              onChange={(event) => setOverrideCircle(event.target.value as CircleOverrideSelection)}
              value={overrideCircle}
            >
              {overrideOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-stone-400">Reason</span>
            <input
              className="h-10 rounded-md border border-stone-700 bg-[#080808] px-3 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-[#C9A24A]"
              disabled={disabled || isSavingOverride || overrideCircle === "auto"}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder={overrideCircle === "auto" ? "Auto uses scoring" : "Optional note"}
              value={overrideReason}
            />
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#C9A24A] px-4 text-sm font-semibold text-[#111111] disabled:opacity-50"
            disabled={disabled || isSavingOverride}
            onClick={() => { void saveOverride(); }}
            type="button"
          >
            {overrideCircle === "auto" ? "Use Auto" : "Save Pin"}
          </button>
        </div>
      </div>

      <ScoreHistory error={historyError} history={history} status={historyStatus} />
    </article>
  );
}

export function CircleEngineClient({
  initialData,
  workspaces,
}: {
  initialData: DosCircleData | null;
  workspaces: WorkspaceOption[];
}) {
  const [data, setData] = useState(initialData);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialData?.config.workspaceId ?? workspaces[0]?.id ?? "");
  const [config, setConfig] = useState<DosCircleConfig | null>(initialData?.config ?? null);
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [personQuery, setPersonQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [history, setHistory] = useState<CircleHistoryItem[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("idle");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const ranked = useMemo(() => data ? [...data.my3, ...data.my12, ...data.my70, ...data.my120, ...data.field] : [], [data]);
  const matchingPeople = useMemo(() => {
    const query = personQuery.trim().toLowerCase();

    return query
      ? ranked.filter((item) => item.person.name.toLowerCase().includes(query)).slice(0, 8)
      : ranked.slice(0, 5);
  }, [personQuery, ranked]);
  const selectedPerson = ranked.find((item) => item.person.id === selectedPersonId) ?? null;
  const autoAssignedCount = ranked.filter((item) => item.assignmentSource === "automatic").length;
  const manuallyPinnedCount = data?.metadata.lockedCount ?? ranked.filter((item) => item.assignmentSource === "manual").length;

  useEffect(() => {
    if (!selectedWorkspaceId || !selectedPersonId) {
      setHistory(null);
      setHistoryError("");
      setHistoryStatus("idle");
      return;
    }

    let isCurrent = true;

    setHistoryStatus("loading");
    setHistoryError("");

    fetch(`/api/dos/circles/person/${encodeURIComponent(selectedPersonId)}?workspaceId=${encodeURIComponent(selectedWorkspaceId)}`)
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load score history.");
        }

        return result as { history?: CircleHistoryItem[] };
      })
      .then((result) => {
        if (!isCurrent) {
          return;
        }

        setHistory(result.history ?? []);
        setHistoryStatus("ready");
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        setHistory([]);
        setHistoryError(error instanceof Error ? error.message : "Unable to load score history.");
        setHistoryStatus("error");
      });

    return () => {
      isCurrent = false;
    };
  }, [historyRefreshKey, selectedPersonId, selectedWorkspaceId]);

  async function fetchRecalculatedData() {
    const response = await fetch("/api/dos/circles/recalculate", {
      body: JSON.stringify({ workspaceId: selectedWorkspaceId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to recalculate.");
    }

    return result as DosCircleData;
  }

  async function loadWorkspace(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setSelectedPersonId("");
    setPersonQuery("");
    setHistory(null);
    setHistoryError("");
    setHistoryStatus("idle");
    setMessage("");
    const response = await fetch(`/api/dos/circles?workspaceId=${encodeURIComponent(workspaceId)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to load workspace.");
    }

    setData(result);
    setConfig(result.config);
  }

  async function saveConfig() {
    if (!config) {
      return;
    }

    setIsWorking(true);
    setMessage("Saving...");

    try {
      const response = await fetch("/api/dos/circles/config", {
        body: JSON.stringify({ ...config, workspaceId: selectedWorkspaceId }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save config.");
      }

      setConfig(result.config);
      try {
        const recalculatedData = await fetchRecalculatedData();

        setData(recalculatedData);
        setConfig(recalculatedData.config);
        setHistoryRefreshKey((current) => current + 1);
        setMessage("Config saved. Scores were recalculated with the latest weights.");
      } catch (recalculateError) {
        setMessage(recalculateError instanceof Error
          ? `Config saved, but recalculation failed: ${recalculateError.message}`
          : "Config saved, but recalculation failed.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save config.");
    } finally {
      setIsWorking(false);
    }
  }

  async function recalculate() {
    setIsWorking(true);
    setMessage("Recalculating...");

    try {
      const result = await fetchRecalculatedData();

      setData(result);
      setConfig(result.config);
      setHistoryRefreshKey((current) => current + 1);
      setMessage("Scores recalculated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to recalculate.");
    } finally {
      setIsWorking(false);
    }
  }

  async function saveOverride(
    personId: string,
    circle: CircleOverrideSelection,
    reason: string,
    currentCircle: DosRelationshipScore["circle"],
  ) {
    setIsWorking(true);
    setMessage(circle === "auto" ? "Removing manual pin..." : "Saving circle pin...");

    try {
      const response = await fetch("/api/dos/circles/override", {
        body: JSON.stringify({
          circle: circle === "auto" ? currentCircle : circle,
          locked: circle !== "auto",
          personId,
          reason,
          workspaceId: selectedWorkspaceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update circle pin.");
      }

      setData(result);
      setConfig(result.config);
      setHistoryRefreshKey((current) => current + 1);
      setMessage(circle === "auto" ? "Manual pin removed and scores recalculated." : "Circle pin saved and scores recalculated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update circle pin.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-lg border border-stone-800 bg-[#070707] p-4 md:flex-row md:items-center md:justify-between">
        <label className="grid gap-2">
          <span className="text-xs font-medium text-stone-500">Workspace</span>
          <select
            className="h-10 rounded-md border border-stone-700 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#C9A24A]"
            onChange={(event) => { void loadWorkspace(event.target.value); }}
            value={selectedWorkspaceId}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>{workspace.label}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-700 px-3 text-sm font-medium text-stone-100 disabled:opacity-50" disabled={isWorking || !config} onClick={saveConfig} type="button">
            <Save className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
            Save Config
          </button>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#C9A24A] px-3 text-sm font-semibold text-[#111111] disabled:opacity-50" disabled={isWorking || !selectedWorkspaceId} onClick={recalculate} type="button">
            <RefreshCw className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
            Recalculate
          </button>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-[#C9A24A]/30 bg-[#C9A24A]/10 px-3 py-2 text-sm text-[#E4C465]">{message}</p> : null}

      <section className="rounded-lg border border-stone-800 bg-[#070707] p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Circle Guide</h2>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              The engine ranks real relationship activity, then keeps the focused circles explainable and easy to override.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[#C9A24A]/30 bg-[#C9A24A]/10 px-3 py-1 text-xs font-semibold text-[#E4C465]">
            Field is outside focused circles
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {circleDefinitions.map((circle) => (
            <div className="rounded-lg border border-stone-800 bg-[#080808] p-3" key={circle.circle}>
              <p className="text-sm font-semibold text-stone-100">{circle.label}</p>
              <p className="mt-2 text-xs leading-5 text-stone-400">{circle.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-100">Engine Summary</h2>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
          <SummaryCard label="Total people scored" value={data?.metadata.peopleScored ?? 0} />
          <SummaryCard label="Last recalculated" value={formatDateTime(data?.metadata.calculatedAt)} />
          <SummaryCard label="Auto Assigned" value={autoAssignedCount} />
          <SummaryCard label="Manual Pins" value={manuallyPinnedCount} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-100">Circle Distribution</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {circleDefinitions.map((circle) => (
            <DistributionCard
              description={circle.description}
              emptyText={circle.emptyText}
              key={circle.circle}
              label={circle.label}
              value={
                circle.circle === "three"
                  ? data?.my3.length ?? 0
                  : circle.circle === "twelve"
                    ? data?.my12.length ?? 0
                    : circle.circle === "seventy"
                      ? data?.my70.length ?? 0
                      : circle.circle === "my_120"
                        ? data?.my120.length ?? 0
                      : data?.field.length ?? 0
              }
            />
          ))}
        </div>
        <p className="mt-3 rounded-lg border border-stone-800 bg-[#070707] px-3 py-2 text-sm leading-6 text-stone-400">
          Field means outside the current focused circles, not ignored. These people remain available for follow up and future activity.
        </p>
      </section>

      {config ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-100">Signal Weights</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {weightFields.map((field) => (
              <WeightInput
                key={field.key}
                label={field.label}
                onChange={(value) => setConfig((current) => current ? { ...current, [field.key]: value } : current)}
                value={config[field.key]}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-100">Person Lookup / Diagnostic</h2>
        <div className="rounded-lg border border-stone-800 bg-[#070707] p-4">
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-stone-800 bg-[#050505] px-3">
            <Search className="h-4 w-4 text-stone-600" aria-hidden="true" strokeWidth={1.8} />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-stone-100 outline-none placeholder:text-stone-600"
              onChange={(event) => setPersonQuery(event.target.value)}
              placeholder="Search person by name"
              value={personQuery}
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {matchingPeople.length ? matchingPeople.map((item) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedPersonId === item.person.id
                    ? "border-[#C9A24A]/60 bg-[#C9A24A]/10 text-[#E4C465]"
                    : "border-stone-800 bg-[#050505] text-stone-400 hover:border-stone-700 hover:text-stone-100"
                }`}
                key={item.person.id}
                onClick={() => setSelectedPersonId(item.person.id)}
                type="button"
              >
                {item.person.name}
              </button>
            )) : (
              <p className="text-sm text-stone-500">No matching scored people.</p>
            )}
          </div>

          <div className="mt-4">
            {selectedPerson ? (
              <PersonDiagnostic
                disabled={isWorking}
                history={history}
                historyError={historyError}
                historyStatus={historyStatus}
                onSaveOverride={saveOverride}
                score={selectedPerson}
              />
            ) : (
              <div className="rounded-lg border border-stone-800 bg-[#080808] p-5 text-sm text-stone-400">
                Choose a person to inspect why the engine assigned their circle.
              </div>
            )}
          </div>
        </div>
      </section>

      <details className="rounded-lg border border-stone-800 bg-[#070707] p-4">
        <summary className="cursor-pointer text-lg font-semibold text-stone-100">Preview ranked people</summary>
        <div className="mt-4 grid gap-2">
          {ranked.length ? ranked.slice(0, 10).map((item, index) => (
            <div className="grid gap-2 rounded-lg border border-stone-800 bg-[#080808] p-3 sm:grid-cols-[56px_minmax(0,1fr)_90px_112px_70px] sm:items-center" key={item.person.id}>
              <span className="text-xs text-stone-500">#{index + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-stone-100">{item.person.name}</span>
                <span className="mt-0.5 block truncate text-xs text-stone-500">{item.person.relationshipType ?? "Relationship"}</span>
              </span>
              <span className="w-fit rounded-full bg-[#C9A24A]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E4C465]">
                {circleLabel(item.circle)}
              </span>
              <AssignmentBadge source={item.assignmentSource} />
              <span className="text-sm font-semibold text-stone-200">{score(item.totalScore)}</span>
            </div>
          )) : (
            <div className="rounded-lg border border-stone-800 bg-[#080808] p-5 text-sm text-stone-400">
              No ranked people yet. Recalculate after relationship activity is logged, or use manual pins when you need a demo-safe focused circle.
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
