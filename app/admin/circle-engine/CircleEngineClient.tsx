"use client";

import { RefreshCw, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
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

function circleLabel(circle: string) {
  return {
    field: "Field",
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

function DistributionCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-[#080808] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-100">{label}</p>
        <span className="rounded-full bg-[#C9A24A]/10 px-2.5 py-1 text-xs font-semibold text-[#E4C465]">{value}</span>
      </div>
    </div>
  );
}

function PersonDiagnostic({ score: item }: { score: DosRelationshipScore }) {
  const strongestSignals = Object.entries(item.breakdown)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 3) as Array<[keyof DosRelationshipScore["breakdown"], number]>;

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
          <span className="rounded-full border border-stone-800 bg-[#050505] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
            {item.assignmentSource === "manual" ? "Manual" : "Automatic"}
          </span>
        </div>
      </div>

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
  const ranked = useMemo(() => data ? [...data.my3, ...data.my12, ...data.my70, ...data.field] : [], [data]);
  const matchingPeople = useMemo(() => {
    const query = personQuery.trim().toLowerCase();

    return query
      ? ranked.filter((item) => item.person.name.toLowerCase().includes(query)).slice(0, 8)
      : ranked.slice(0, 5);
  }, [personQuery, ranked]);
  const selectedPerson = ranked.find((item) => item.person.id === selectedPersonId) ?? null;
  const autoAssignedCount = ranked.filter((item) => item.assignmentSource === "automatic").length;
  const manuallyPinnedCount = data?.metadata.lockedCount ?? ranked.filter((item) => item.assignmentSource === "manual").length;

  async function loadWorkspace(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setSelectedPersonId("");
    setPersonQuery("");
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
      setMessage("Config saved.");
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
      const response = await fetch("/api/dos/circles/recalculate", {
        body: JSON.stringify({ workspaceId: selectedWorkspaceId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to recalculate.");
      }

      setData(result);
      setConfig(result.config);
      setMessage("Scores recalculated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to recalculate.");
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-100">Engine Summary</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryCard label="Total people scored" value={data?.metadata.peopleScored ?? 0} />
          <SummaryCard label="Last recalculated" value={formatDateTime(data?.metadata.calculatedAt)} />
          <SummaryCard label="Auto assigned" value={autoAssignedCount} />
          <SummaryCard label="Manually pinned" value={manuallyPinnedCount} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-100">Circle Distribution</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <DistributionCard label="My 3" value={data?.my3.length ?? 0} />
          <DistributionCard label="My 12" value={data?.my12.length ?? 0} />
          <DistributionCard label="My 70" value={data?.my70.length ?? 0} />
          <DistributionCard label="Field" value={data?.field.length ?? 0} />
        </div>
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
              <PersonDiagnostic score={selectedPerson} />
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
            <div className="grid gap-2 rounded-lg border border-stone-800 bg-[#080808] p-3 sm:grid-cols-[56px_minmax(0,1fr)_90px_70px] sm:items-center" key={item.person.id}>
              <span className="text-xs text-stone-500">#{index + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-stone-100">{item.person.name}</span>
                <span className="mt-0.5 block truncate text-xs text-stone-500">{item.person.relationshipType ?? "Relationship"}</span>
              </span>
              <span className="w-fit rounded-full bg-[#C9A24A]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E4C465]">
                {circleLabel(item.circle)}
              </span>
              <span className="text-sm font-semibold text-stone-200">{score(item.totalScore)}</span>
            </div>
          )) : (
            <div className="rounded-lg border border-stone-800 bg-[#080808] p-5 text-sm text-stone-400">
              Recalculate to preview ranked people.
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
