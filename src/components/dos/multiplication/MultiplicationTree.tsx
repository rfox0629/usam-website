"use client";

import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { useId, useState } from "react";
import {
  dosDiscipleshipGraphLimits,
  dosMultiplicationCountLabel,
  dosMultiplicationEmptyState,
  type DosDiscipleEntry,
  type DosDiscipleRef,
  type DosDiscipleshipGraph,
} from "@/src/lib/dos/discipleship-graph";

/* USA-275 — the Multiplication list: compact names and direct-disciple counts,
 * with expand / collapse for each person's own disciples. Used on the People
 * profile, in the read-only connected view and in Reports, over the one
 * discipleship graph. No descriptions, cadence or creator attribution. */

type TreeProps = {
  entries: DosDiscipleEntry[];
  graph: DosDiscipleshipGraph;
  /* Shown when there are no entries at the top level. */
  emptyText?: string | null;
  /* Row-level manage action (End / Remove), when the viewer may correct it. */
  onManage?: (entry: DosDiscipleEntry) => void;
  onOpen: (entry: DosDiscipleEntry) => void;
};

export function MultiplicationTree({ emptyText = dosMultiplicationEmptyState, entries, graph, onManage, onOpen }: TreeProps) {
  if (!entries.length) {
    return emptyText ? <p className="text-[14.5px] leading-[1.5] text-dos-body">{emptyText}</p> : null;
  }

  return (
    <ul className="divide-y divide-dos-rule" role="list">
      {entries.map((entry) => (
        <MultiplicationNode ancestors={[]} depth={0} entry={entry} graph={graph} key={entry.key} onManage={onManage} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function MultiplicationNode({
  ancestors,
  depth,
  entry,
  graph,
  onManage,
  onOpen,
}: {
  ancestors: string[];
  depth: number;
  entry: DosDiscipleEntry;
  graph: DosDiscipleshipGraph;
  onManage?: (entry: DosDiscipleEntry) => void;
  onOpen: (entry: DosDiscipleEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const childListId = useId();
  const count = entry.counted ? graph.directCount(entry.ref) : 0;
  /* Stored data can never loop the display: a person already on this path,
     or past the depth limit, is not expandable again. */
  const canExpand = count > 0 && depth < dosDiscipleshipGraphLimits.maxDepth - 1 && !ancestors.includes(entry.key);
  const children = expanded && canExpand ? graph.directDisciples(entry.ref) : [];
  const status = entry.state === "awaiting_confirmation" ? "Awaiting confirmation" : entry.state === "declined" ? "Not confirmed" : null;
  const canManage = Boolean(onManage && entry.connectionId);

  return (
    <li className="py-1 first:pt-0 last:pb-0">
      <div className="flex min-h-11 items-center gap-1">
        <button
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-dos-1 py-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
          onClick={() => onOpen(entry)}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-bold leading-[1.25] tracking-[-0.01em] text-dos-primary">
              {entry.name}
              {count ? <span className="font-semibold text-dos-secondary"> · {count}</span> : null}
            </span>
            {status ? <span className="mt-0.5 block text-[12.5px] font-semibold text-dos-secondary">{status}</span> : null}
          </span>
          {canExpand ? null : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-dos-eyebrow" strokeWidth={2} />}
        </button>
        {canExpand ? (
          <button
            aria-controls={childListId}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} the ${dosMultiplicationCountLabel(count)} ${entry.name} disciples`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dos-secondary hover:bg-dos-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded
              ? <ChevronDown aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              : <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />}
          </button>
        ) : null}
        {canManage ? (
          <button
            aria-label={`Manage ${entry.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dos-secondary hover:bg-dos-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
            onClick={() => onManage?.(entry)}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      {expanded && canExpand ? (
        <ul className="mb-1 ml-2 border-l border-dos-rule pl-3" id={childListId} role="list">
          {children.map((child) => (
            <MultiplicationNode
              ancestors={[...ancestors, entry.key]}
              depth={depth + 1}
              entry={child}
              graph={graph}
              key={child.key}
              onManage={undefined}
              onOpen={onOpen}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/* "Discipling 3 people", with the unique total across deeper generations
   stated separately and only when it differs. */
export function multiplicationSummary(graph: DosDiscipleshipGraph, ref: DosDiscipleRef) {
  const direct = graph.directCount(ref);

  if (!direct) {
    return null;
  }

  const { total, truncated } = graph.descendants(ref);

  return {
    direct: `Discipling ${dosMultiplicationCountLabel(direct)}`,
    generations: total > direct ? `${truncated ? "At least " : ""}${dosMultiplicationCountLabel(total)} across all generations` : null,
  };
}

export function MultiplicationSummaryLine({ graph, reference }: { graph: DosDiscipleshipGraph; reference: DosDiscipleRef }) {
  const summary = multiplicationSummary(graph, reference);

  if (!summary) {
    return null;
  }

  return (
    <p className="mt-2 border-t border-dos-rule pt-3 text-[13px] font-semibold text-dos-secondary">
      {summary.direct}
      {summary.generations ? <span className="block text-[12.5px] font-medium">{summary.generations}</span> : null}
    </p>
  );
}
