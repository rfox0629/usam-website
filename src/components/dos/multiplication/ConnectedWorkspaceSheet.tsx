"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MultiplicationSummaryLine, MultiplicationTree } from "@/src/components/dos/multiplication/MultiplicationTree";
import { DosDetailSection, DosDetailSheet } from "@/src/components/dos/overlays/DosSurfaces";
import type { DosConnectedWorkspaceView } from "@/src/lib/dos/discipleship-connected-view";
import { dosNoActivityState, type DosDiscipleEntry, type DosDiscipleRef, type DosDiscipleshipGraph } from "@/src/lib/dos/discipleship-graph";
import { canonicalFruitLabel } from "@/src/lib/dos/fruit-vocabulary";
import { dosMinistryMeetingLabel, formatDosMinistryMinutes } from "@/src/lib/dos/ministry-report";

/* USA-275 — the read-only connected view.
 *
 * What an authorized upstream viewer can open for a connected account: that
 * account's Multiplication, its DOS information by category, its People, and
 * every record read-only. Navigation stays inside this sheet (Back walks the
 * path), so Dirk can go Ryan → Tanner → Aaron and back without losing his
 * place. Everything comes from the server's authorized projection; nothing
 * here writes. */

export type ConnectedCategory = "meetings" | "notes" | "prayer" | "accountability" | "journeys" | "groups" | "fruit" | "feedback" | "discipleship" | "people";

export type ConnectedViewLoader = (workspaceId: string) => Promise<DosConnectedWorkspaceView>;

type Level =
  | { kind: "workspace"; workspaceId: string }
  | { kind: "person"; personId: string; workspaceId: string }
  | { kind: "name"; name: string }
  | { category: ConnectedCategory; kind: "category"; personId: string | null; workspaceId: string }
  | { category: ConnectedCategory; itemId: string; kind: "item"; workspaceId: string };

const categoryOrder: ConnectedCategory[] = ["meetings", "notes", "prayer", "accountability", "journeys", "groups", "fruit", "feedback", "discipleship"];

export const connectedCategoryLabels: Record<ConnectedCategory, string> = {
  accountability: "Accountability",
  discipleship: "Discipleship meetings",
  feedback: "Feedback",
  fruit: "Fruit",
  groups: "Groups & attendance",
  journeys: "Journeys",
  meetings: "Meetings",
  notes: "Notes",
  people: "People",
  prayer: "Prayer",
};

export function connectedDateLabel(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);

  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function humanize(value: string) {
  const text = value.replace(/[_-]+/g, " ").trim();

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

type Item = { id: string; meta: string | null; title: string };

function namesOf(view: DosConnectedWorkspaceView, ids: string[]) {
  const byId = new Map(view.people.map((person) => [person.id, person.name]));

  return ids.map((id) => byId.get(id)).filter(Boolean).join(", ");
}

function fruitTitle(fruit: DosConnectedWorkspaceView["fruit"][number]) {
  return fruit.title?.trim() || canonicalFruitLabel(fruit.fruitType) || humanize(fruit.fruitType) || "Fruit";
}

export function connectedCategoryItems(
  view: DosConnectedWorkspaceView,
  category: ConnectedCategory,
  personId: string | null,
  resourceTitle: (slug: string) => string,
): Item[] {
  const forPerson = (ids: Array<string | null>) => !personId || ids.includes(personId);

  switch (category) {
    case "meetings":
      return view.meetings.filter((meeting) => forPerson(meeting.personIds)).map((meeting) => ({
        id: meeting.id,
        meta: [meeting.meetingStatus === "scheduled" ? "Scheduled" : meeting.minutes ? formatDosMinistryMinutes(meeting.minutes) : null, personId ? null : namesOf(view, meeting.personIds) || null].filter(Boolean).join(" · ") || null,
        title: `${dosMinistryMeetingLabel(meeting)} · ${connectedDateLabel(meeting.date)}`,
      }));
    case "notes":
      return view.people.filter((person) => person.notes?.trim() && forPerson([person.id])).map((person) => ({
        id: person.id,
        meta: person.notes?.trim().split("\n")[0] ?? null,
        title: person.name,
      }));
    case "prayer":
      return view.prayer.filter((request) => forPerson(request.personIds)).map((request) => ({
        id: request.id,
        meta: [humanize(request.status), connectedDateLabel(request.createdAt)].join(" · "),
        title: request.title?.trim() || request.request,
      }));
    case "accountability":
      return view.accountability.filter((item) => forPerson([item.personId])).map((item) => ({
        id: item.id,
        meta: [item.kind === "check_in" ? null : humanize(item.status), connectedDateLabel(item.date)].filter(Boolean).join(" · "),
        title: item.title,
      }));
    case "journeys":
      return view.journeys.filter((journey) => forPerson([journey.personId])).map((journey) => ({
        id: journey.id,
        meta: [humanize(journey.status), connectedDateLabel(journey.startDate)].join(" · "),
        title: resourceTitle(journey.resourceSlug),
      }));
    case "groups":
      return view.groups
        .filter((group) => forPerson([...group.memberPersonIds, ...group.gatherings.flatMap((gathering) => gathering.presentPersonIds)]))
        .map((group) => ({
          id: group.id,
          meta: `${group.gatherings.filter((gathering) => gathering.status === "completed").length} gatherings`,
          title: group.name,
        }));
    case "fruit":
      return view.fruit.filter((fruit) => forPerson([fruit.personId])).map((fruit) => ({
        id: fruit.id,
        meta: [connectedDateLabel(fruit.date), personId ? null : namesOf(view, fruit.personId ? [fruit.personId] : []) || null].filter(Boolean).join(" · "),
        title: fruitTitle(fruit),
      }));
    case "feedback":
      return view.feedback.filter((feedback) => forPerson([feedback.personId])).map((feedback) => ({
        id: feedback.id,
        meta: [connectedDateLabel(feedback.submittedAt), personId ? null : namesOf(view, feedback.personId ? [feedback.personId] : []) || null].filter(Boolean).join(" · "),
        title: feedback.overallRating?.trim() || "Feedback",
      }));
    case "discipleship":
      return personId ? [] : view.discipleshipMeetings.map((meeting) => ({
        id: meeting.id,
        meta: meeting.minutes ? formatDosMinistryMinutes(meeting.minutes) : null,
        title: `With ${meeting.mentorName} · ${connectedDateLabel(meeting.date)}`,
      }));
    default:
      return view.people.map((person) => ({
        id: person.id,
        meta: humanize(person.relationshipTypeValue === "mentor" ? "discipling_me" : person.relationshipTypeValue),
        title: person.name,
      }));
  }
}

function Facts({ items }: { items: Array<[string, ReactNode] | null> }) {
  const shown = items.filter((item): item is [string, ReactNode] => Boolean(item && item[1] !== null && item[1] !== undefined && item[1] !== ""));

  return (
    <dl className="grid gap-2">
      {shown.map(([label, value]) => (
        <div className="flex items-baseline justify-between gap-4" key={label}>
          <dt className="shrink-0 text-dos-meta text-dos-secondary">{label}</dt>
          <dd className="min-w-0 text-right text-dos-body text-dos-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Prose({ label, text }: { label: string; text: string | null | undefined }) {
  return text?.trim() ? (
    <DosDetailSection label={label}>
      <p className="whitespace-pre-line text-dos-body text-dos-primary">{text.trim()}</p>
    </DosDetailSection>
  ) : null;
}

function ItemDetail({ category, itemId, resourceTitle, view }: { category: ConnectedCategory; itemId: string; resourceTitle: (slug: string) => string; view: DosConnectedWorkspaceView }) {
  switch (category) {
    case "meetings": {
      const meeting = view.meetings.find((item) => item.id === itemId);

      return meeting ? (
        <>
          <DosDetailSection label="Meeting">
            <Facts items={[["Date", connectedDateLabel(meeting.date)], ["How", dosMinistryMeetingLabel(meeting)], ["Duration", meeting.minutes ? formatDosMinistryMinutes(meeting.minutes) : "Not logged"], ["With", namesOf(view, meeting.personIds) || "—"]]} />
          </DosDetailSection>
          <Prose label="What happened" text={meeting.whatHappened} />
          <Prose label="Notes" text={meeting.notes} />
          <Prose label="Prayer" text={meeting.prayerNeeds} />
        </>
      ) : null;
    }
    case "notes": {
      const person = view.people.find((item) => item.id === itemId);

      return person ? <Prose label="Notes" text={person.notes} /> : null;
    }
    case "prayer": {
      const request = view.prayer.find((item) => item.id === itemId);

      return request ? (
        <>
          <DosDetailSection label="Prayer">
            <Facts items={[["Status", humanize(request.status)], ["Added", connectedDateLabel(request.createdAt)], request.answeredAt ? ["Answered", connectedDateLabel(request.answeredAt)] : null, ["For", namesOf(view, request.personIds) || "—"]]} />
          </DosDetailSection>
          <Prose label="Request" text={request.request} />
        </>
      ) : null;
    }
    case "accountability": {
      const item = view.accountability.find((entry) => entry.id === itemId);

      return item ? (
        <>
          <DosDetailSection label="Accountability">
            <Facts items={[["For", namesOf(view, [item.personId]) || "—"], item.kind === "check_in" ? null : ["Status", humanize(item.status)], ["Date", connectedDateLabel(item.date)], item.minutes ? ["Duration", formatDosMinistryMinutes(item.minutes)] : null]} />
          </DosDetailSection>
          <Prose label={item.kind === "check_in" ? "Update" : "Details"} text={item.kind === "schedule" ? humanize(item.detail ?? "") : item.detail} />
        </>
      ) : null;
    }
    case "journeys": {
      const journey = view.journeys.find((item) => item.id === itemId);

      return journey ? (
        <DosDetailSection label="Journey">
          <Facts items={[["Journey", resourceTitle(journey.resourceSlug)], ["For", namesOf(view, [journey.personId]) || "—"], ["Status", humanize(journey.status)], ["Started", connectedDateLabel(journey.startDate)], journey.completedAt ? ["Completed", connectedDateLabel(journey.completedAt)] : null]} />
        </DosDetailSection>
      ) : null;
    }
    case "groups": {
      const group = view.groups.find((item) => item.id === itemId);

      return group ? (
        <>
          <DosDetailSection label="Members">
            <p className="text-dos-body text-dos-primary">{namesOf(view, group.memberPersonIds) || "—"}</p>
          </DosDetailSection>
          <DosDetailSection label="Attendance">
            {group.gatherings.length ? (
              <ul className="grid gap-2">
                {group.gatherings.map((gathering) => (
                  <li key={gathering.id}>
                    <p className="text-dos-body font-semibold text-dos-primary">{connectedDateLabel(gathering.date)} · {humanize(gathering.status)}</p>
                    {gathering.presentPersonIds.length ? <p className="text-dos-meta text-dos-secondary">{namesOf(view, gathering.presentPersonIds)}</p> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="text-dos-body text-dos-secondary">{dosNoActivityState}</p>}
          </DosDetailSection>
        </>
      ) : null;
    }
    case "fruit": {
      const fruit = view.fruit.find((item) => item.id === itemId);

      return fruit ? (
        <>
          <DosDetailSection label="Fruit">
            <Facts items={[["Date", connectedDateLabel(fruit.date)], ["Person", namesOf(view, fruit.personId ? [fruit.personId] : []) || "—"]]} />
          </DosDetailSection>
          <Prose label="Details" text={fruit.description} />
        </>
      ) : null;
    }
    case "feedback": {
      const feedback = view.feedback.find((item) => item.id === itemId);

      return feedback ? (
        <>
          <DosDetailSection label="Feedback">
            <Facts items={[["Submitted", connectedDateLabel(feedback.submittedAt)], ["From", namesOf(view, feedback.personId ? [feedback.personId] : []) || "—"], feedback.wantsFollowUp ? ["Follow-up", humanize(feedback.wantsFollowUp)] : null]} />
          </DosDetailSection>
          <Prose label="Comments" text={feedback.comments} />
        </>
      ) : null;
    }
    case "discipleship": {
      const meeting = view.discipleshipMeetings.find((item) => item.id === itemId);

      return meeting ? (
        <>
          <DosDetailSection label="Discipleship meeting">
            <Facts items={[["With", meeting.mentorName], ["Date", connectedDateLabel(meeting.date)], ["Duration", meeting.minutes ? formatDosMinistryMinutes(meeting.minutes) : "Not logged"]]} />
          </DosDetailSection>
          <Prose label="Discussed" text={meeting.discussed} />
        </>
      ) : null;
    }
    default:
      return null;
  }
}

function ListButton({ meta, onClick, title }: { meta?: string | null; onClick: () => void; title: string }) {
  return (
    <button className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue" onClick={onClick} type="button">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-dos-body font-semibold text-dos-primary">{title}</span>
        {meta ? <span className="mt-0.5 block truncate text-dos-meta text-dos-secondary">{meta}</span> : null}
      </span>
      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-dos-eyebrow" strokeWidth={2} />
    </button>
  );
}

export function ConnectedWorkspaceSheet({
  graph,
  initial,
  loadView,
  onClose,
  onOpenOwnPerson,
  resourceTitle,
  viewerWorkspaceId,
}: {
  graph: DosDiscipleshipGraph;
  initial: { personId: string | null; workspaceId: string };
  loadView: ConnectedViewLoader;
  onClose: () => void;
  /* A person in the viewer's own workspace opens the viewer's full record. */
  onOpenOwnPerson: (personId: string) => void;
  resourceTitle: (slug: string) => string;
  viewerWorkspaceId: string;
}) {
  const [stack, setStack] = useState<Level[]>(() => (initial.personId
    ? [{ kind: "person", personId: initial.personId, workspaceId: initial.workspaceId }]
    : [{ kind: "workspace", workspaceId: initial.workspaceId }]));
  const [views, setViews] = useState<Record<string, { status: "error" } | { status: "ready"; view: DosConnectedWorkspaceView }>>({});
  const top = stack[stack.length - 1];
  const topWorkspaceId = top.kind === "name" ? null : top.workspaceId;
  const loaded = topWorkspaceId ? views[topWorkspaceId] : undefined;

  useEffect(() => {
    if (!topWorkspaceId || views[topWorkspaceId]) {
      return undefined;
    }

    let cancelled = false;

    loadView(topWorkspaceId)
      .then((view) => {
        if (!cancelled) {
          setViews((current) => ({ ...current, [topWorkspaceId]: { status: "ready", view } }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setViews((current) => ({ ...current, [topWorkspaceId]: { status: "error" } }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadView, topWorkspaceId, views]);

  const push = (level: Level) => setStack((current) => [...current, level]);
  const back = () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));

  const openEntry = (entry: DosDiscipleEntry) => {
    if (entry.ref.kind === "name") {
      push({ kind: "name", name: entry.name });
      return;
    }

    const account = graph.readableAccountFor(entry.ref.personId);

    if (account?.discipleWorkspaceId) {
      push({ kind: "workspace", workspaceId: account.discipleWorkspaceId });
    } else if (entry.ref.workspaceId === viewerWorkspaceId) {
      onOpenOwnPerson(entry.ref.personId);
    } else {
      push({ kind: "person", personId: entry.ref.personId, workspaceId: entry.ref.workspaceId });
    }
  };

  const view = loaded?.status === "ready" ? loaded.view : null;
  let title = "Connected activity";
  let identity: string | null = "Read-only";
  let body: ReactNode;

  if (top.kind === "name") {
    title = top.name;
    body = (
      <DosDetailSection label="Activity">
        <p className="text-dos-body text-dos-secondary">{dosNoActivityState}</p>
      </DosDetailSection>
    );
  } else if (!loaded) {
    body = <p className="text-dos-body text-dos-secondary" role="status">Loading…</p>;
  } else if (!view) {
    body = <p className="text-dos-body text-dos-secondary" role="status">This connected activity isn&rsquo;t available to you.</p>;
  } else if (top.kind === "workspace" || top.kind === "person") {
    const personId = top.kind === "person" ? top.personId : null;
    const person = personId ? view.people.find((item) => item.id === personId) ?? null : null;
    const reference: DosDiscipleRef | null = personId ? { kind: "person", personId, workspaceId: top.workspaceId } : null;
    const disciples = reference ? graph.directDisciples(reference) : graph.ownerDisciples(top.workspaceId);
    const counts = categoryOrder
      .map((category) => ({ category, count: connectedCategoryItems(view, category, personId, resourceTitle).length }))
      .filter((entry) => !(personId && entry.category === "discipleship"));
    const hasActivity = counts.some((entry) => entry.count > 0);

    title = person?.name ?? view.ownerName;
    identity = person ? `Read-only · ${view.ownerName}` : "Read-only";
    body = (
      <>
        <DosDetailSection label="Multiplication">
          <MultiplicationTree entries={disciples} graph={graph} onOpen={openEntry} />
          {reference ? <MultiplicationSummaryLine graph={graph} reference={reference} /> : null}
        </DosDetailSection>
        <DosDetailSection label="Activity">
          {hasActivity ? null : <p className="mb-1 text-dos-body text-dos-secondary">{dosNoActivityState}</p>}
          <ul className="divide-y divide-dos-rule" role="list">
            {counts.map(({ category, count }) => (
              <li key={category}>
                <ListButton meta={count ? String(count) : dosNoActivityState} onClick={() => push({ category, kind: "category", personId, workspaceId: top.workspaceId })} title={connectedCategoryLabels[category]} />
              </li>
            ))}
          </ul>
        </DosDetailSection>
        {person ? null : (
          <DosDetailSection label="People">
            <ListButton meta={String(view.people.length)} onClick={() => push({ category: "people", kind: "category", personId: null, workspaceId: top.workspaceId })} title="People" />
          </DosDetailSection>
        )}
      </>
    );
  } else if (top.kind === "category") {
    const items = connectedCategoryItems(view, top.category, top.personId, resourceTitle);
    const person = top.personId ? view.people.find((item) => item.id === top.personId) : null;

    title = connectedCategoryLabels[top.category];
    identity = `Read-only · ${person?.name ?? view.ownerName}`;
    body = items.length ? (
      <ul className="divide-y divide-dos-rule" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <ListButton
              meta={item.meta}
              onClick={() => push(top.category === "people"
                ? { kind: "person", personId: item.id, workspaceId: top.workspaceId }
                : { category: top.category, itemId: item.id, kind: "item", workspaceId: top.workspaceId })}
              title={item.title}
            />
          </li>
        ))}
      </ul>
    ) : <p className="text-dos-body text-dos-secondary">{dosNoActivityState}</p>;
  } else {
    const item = connectedCategoryItems(view, top.category, null, resourceTitle).find((entry) => entry.id === top.itemId);

    title = item?.title ?? connectedCategoryLabels[top.category];
    identity = `Read-only · ${view.ownerName}`;
    body = <ItemDetail category={top.category} itemId={top.itemId} resourceTitle={resourceTitle} view={view} />;
  }

  return (
    <DosDetailSheet identity={identity} onClose={onClose} title={title}>
      <div data-connected-view="read-only">
        {stack.length > 1 ? (
          <button className="-mt-1 mb-2 inline-flex min-h-11 items-center gap-1.5 text-dos-label font-semibold text-dos-blueText focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue" onClick={back} type="button">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            Back
          </button>
        ) : null}
        {body}
      </div>
    </DosDetailSheet>
  );
}
