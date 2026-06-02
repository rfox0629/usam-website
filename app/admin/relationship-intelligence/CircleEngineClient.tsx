"use client";

import { RefreshCw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import type { DosCircleData, DosCircleConfig, DosRelationshipScore } from "@/src/lib/dos/circle-scoring";

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
          className="h-1.5 min-w-0 flex-1 accent-usam-gold"
          max={100}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          type="range"
          value={value}
        />
        <input
          className="h-9 w-16 rounded-md border border-stone-700 bg-[#050505] px-2 text-sm text-stone-100 outline-none focus:border-usam-gold"
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

function ScoreRow({ score: item }: { score: DosRelationshipScore }) {
  return (
    <article className="grid gap-3 rounded-lg border border-stone-800 bg-[#080808] p-3 md:grid-cols-[minmax(0,1.5fr)_90px_90px_minmax(0,2fr)] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-stone-100">{item.person.name}</p>
        <p className="mt-1 truncate text-xs text-stone-500">{item.person.relationshipType ?? "Relationship"} · {item.person.engagementLevel ?? "No engagement set"}</p>
      </div>
      <span className="w-fit rounded-full bg-usam-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-usam-gold">
        {circleLabel(item.circle)}
      </span>
      <span className="text-sm font-semibold text-stone-200">{score(item.totalScore)}</span>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {Object.entries(item.breakdown).map(([key, value]) => (
          <span className="rounded-full border border-stone-800 bg-[#050505] px-2 py-1 text-[10px] text-stone-400" key={key}>
            {key.replace(/([A-Z])/g, " $1")} {score(value)}
          </span>
        ))}
        <span className="rounded-full border border-stone-800 bg-[#050505] px-2 py-1 text-[10px] text-stone-400">
          {item.assignmentSource === "manual" ? "Manual" : "Automatic"}
        </span>
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
  const ranked = useMemo(() => data ? [...data.my3, ...data.my12, ...data.my70, ...data.field] : [], [data]);

  async function loadWorkspace(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
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
            className="h-10 rounded-md border border-stone-700 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-usam-gold"
            onChange={(event) => { void loadWorkspace(event.target.value); }}
            value={selectedWorkspaceId}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>{workspace.label}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-700 px-3 text-sm font-medium text-stone-100 disabled:opacity-50" disabled={isWorking} onClick={saveConfig} type="button">
            <Save className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
            Save Config
          </button>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-usam-gold px-3 text-sm font-semibold text-[#111111] disabled:opacity-50" disabled={isWorking} onClick={recalculate} type="button">
            <RefreshCw className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
            Recalculate
          </button>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-usam-gold/30 bg-usam-gold/10 px-3 py-2 text-sm text-usam-gold">{message}</p> : null}

      {config ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {weightFields.map((field) => (
            <WeightInput
              key={field.key}
              label={field.label}
              onChange={(value) => setConfig((current) => current ? { ...current, [field.key]: value } : current)}
              value={config[field.key]}
            />
          ))}
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["My 3", data?.my3.length ?? 0],
          ["My 12", data?.my12.length ?? 0],
          ["My 70", data?.my70.length ?? 0],
          ["Field", data?.field.length ?? 0],
        ].map(([label, value]) => (
          <div className="rounded-lg border border-stone-800 bg-[#080808] p-4" key={label}>
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-100">Preview</h2>
          <span className="text-xs text-stone-500">{data?.metadata.peopleScored ?? 0} scored</span>
        </div>
        <div className="grid gap-2">
          {ranked.length ? ranked.map((item) => <ScoreRow key={item.person.id} score={item} />) : (
            <div className="rounded-lg border border-stone-800 bg-[#080808] p-5 text-sm text-stone-400">
              Recalculate to preview circle assignments.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
