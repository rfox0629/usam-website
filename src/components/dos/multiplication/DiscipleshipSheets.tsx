"use client";

import { useId, useState, type FormEvent } from "react";
import { Field, fieldControlClass } from "@/src/components/dos/forms/primitives";
import { DosDetailSection, DosDetailSheet, Sheet } from "@/src/components/dos/overlays/DosSurfaces";
import { Button } from "@/src/components/dos/ui";
import {
  dosDiscipleNameMaxLength,
  dosNoActivityState,
  dosNormalizedPersonName,
  type DosAppDiscipleship,
  type DosAppDiscipleshipAccount,
  type DosAppDiscipleshipConfirmation,
  type DosAppDiscipleshipDecision,
  type DosAppDiscipleshipIncomingRequest,
  type DosDiscipleEntry,
} from "@/src/lib/dos/discipleship-graph";

/* USA-275 — the few forms Multiplication needs. Each writes through
 * /api/dos/app/discipleship via `onSubmit` / `onAction`, which return an
 * error message or null. Copy stays compact: no cadence, no start date, no
 * narrative, no "Recorded by". */

export type DiscipleshipAction = (action: string, payload: Record<string, unknown>) => Promise<string | null>;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function ErrorLine({ message }: { message: string | null }) {
  return message ? <p className="text-dos-meta font-semibold text-dos-red" role="alert">{message}</p> : null;
}

/* ---------- Add ---------- */

export function AddDiscipleshipConnectionSheet({
  candidates,
  initialName = "",
  mentorName,
  onClose,
  onSubmit,
}: {
  /* Active People in this workspace, the mentor already excluded. */
  candidates: Array<{ id: string; name: string }>;
  initialName?: string;
  mentorName: string;
  onClose: () => void;
  onSubmit: (input: { discipleName: string; disciplePersonId: string | null }) => Promise<string | null>;
}) {
  const inputId = useId();
  const [query, setQuery] = useState(initialName);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const normalized = dosNormalizedPersonName(query);
  /* Same-name People are listed, never chosen for the user: two people can
     share a name. */
  const matches = normalized
    ? candidates.filter((candidate) => dosNormalizedPersonName(candidate.name).includes(normalized)).slice(0, 6)
    : [];

  async function submit(event: FormEvent) {
    event.preventDefault();

    const name = selected?.name ?? query.replace(/\s+/g, " ").trim();

    if (!name) {
      setError("Choose a person or enter a name.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const message = await onSubmit({ discipleName: name, disciplePersonId: selected?.id ?? null });

    setIsSaving(false);

    if (message) {
      setError(message);
      return;
    }

    onClose();
  }

  return (
    <Sheet kind="editable" isDirty={() => Boolean(selected || query.trim() !== initialName.trim())} onClose={onClose} title="Add to Multiplication">
      <form className="grid gap-4" noValidate onSubmit={submit}>
        <p className="text-dos-body text-dos-secondary">Someone {firstName(mentorName)} disciples.</p>
        {selected ? (
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-dos-2 border border-dos-line bg-white px-3">
            <span className="min-w-0 truncate text-dos-body font-semibold text-dos-primary">{selected.name}</span>
            <Button compact onClick={() => setSelected(null)} variant="text">Change</Button>
          </div>
        ) : (
          <>
            <Field error={error} helper="Choose from your People, or enter a name." htmlFor={inputId} id={inputId} label="Name">
              <input
                aria-describedby={`${inputId}-helper`}
                autoComplete="off"
                className={fieldControlClass({ error: Boolean(error) })}
                id={inputId}
                maxLength={dosDiscipleNameMaxLength}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setError(null);
                }}
                value={query}
              />
            </Field>
            {matches.length ? (
              <ul aria-label="People in your workspace" className="-mt-2 divide-y divide-dos-rule rounded-dos-2 border border-dos-line bg-white" role="list">
                {matches.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
                      onClick={() => setSelected(candidate)}
                      type="button"
                    >
                      <span className="min-w-0 truncate text-dos-body font-semibold text-dos-primary">{candidate.name}</span>
                      <span className="shrink-0 text-dos-meta text-dos-secondary">In your People</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        {selected ? <ErrorLine message={error} /> : null}
        <Button disabled={isSaving} fullWidth type="submit" variant="primary">{isSaving ? "Adding…" : "Add"}</Button>
      </form>
    </Sheet>
  );
}

/* ---------- One entry: open, end, or correct ---------- */

export function DiscipleshipEntrySheet({
  entry,
  initialConfirming = null,
  onClose,
  onEnd,
  onOpen,
  onRemove,
}: {
  entry: DosDiscipleEntry;
  /* USA-280 follow-up: the row menu now names the action, so the sheet opens
     on that action's confirmation rather than making the reader choose the
     same thing twice. End and Remove stay distinct, and each still states
     what it does before it does it. */
  initialConfirming?: "end" | "remove" | null;
  onClose: () => void;
  onEnd: (() => Promise<string | null>) | null;
  onOpen: (() => void) | null;
  onRemove: (() => Promise<string | null>) | null;
}) {
  const [confirming, setConfirming] = useState<"end" | "remove" | null>(initialConfirming);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function run(action: (() => Promise<string | null>) | null) {
    if (!action) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const message = await action();

    setIsSaving(false);

    if (message) {
      setError(message);
    } else {
      onClose();
    }
  }

  const actions = confirming ? (
    <div className="grid gap-2">
      <Button disabled={isSaving} fullWidth onClick={() => void run(confirming === "end" ? onEnd : onRemove)} variant={confirming === "end" ? "primary" : "danger"}>
        {confirming === "end" ? "End connection" : "Remove entry"}
      </Button>
      <Button disabled={isSaving} fullWidth onClick={() => setConfirming(null)} variant="text">Cancel</Button>
    </div>
  ) : (
    <div className="grid gap-2">
      {onOpen ? <Button fullWidth onClick={onOpen}>Open</Button> : null}
      {onEnd ? <Button fullWidth onClick={() => setConfirming("end")}>End discipleship connection</Button> : null}
      {onRemove ? <Button fullWidth onClick={() => setConfirming("remove")} variant="danger">Remove, added by mistake</Button> : null}
    </div>
  );

  return (
    <DosDetailSheet actions={actions} onClose={onClose} title={entry.name}>
      {entry.state !== "confirmed" ? (
        <DosDetailSection label="Status">
          <p>{entry.state === "awaiting_confirmation" ? "Awaiting confirmation" : "Not confirmed"}</p>
        </DosDetailSection>
      ) : null}
      {entry.ref.kind === "name" ? (
        <DosDetailSection label="Activity">
          <p className="text-dos-secondary">{dosNoActivityState}</p>
        </DosDetailSection>
      ) : null}
      {confirming === "end" ? (
        <DosDetailSection label="End discipleship connection">
          <p>It stops counting now and stays in history.</p>
        </DosDetailSection>
      ) : null}
      {confirming === "remove" ? (
        <DosDetailSection label="Remove entry">
          <p>For an entry added by mistake. It stops counting and is not kept as history.</p>
        </DosDetailSection>
      ) : null}
      <ErrorLine message={error} />
    </DosDetailSheet>
  );
}

/* ---------- Mentor side: connect this Person's own DOS account ---------- */

export function InviteAccountSheet({
  defaultEmail,
  onClose,
  onSubmit,
  personName,
}: {
  defaultEmail: string;
  onClose: () => void;
  onSubmit: (email: string) => Promise<string | null>;
  personName: string;
}) {
  const inputId = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const first = firstName(personName);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const message = await onSubmit(email.trim());

    setIsSaving(false);

    if (message) {
      setError(message);
    } else {
      onClose();
    }
  }

  return (
    <Sheet kind="editable" isDirty={() => email.trim() !== defaultEmail.trim()} onClose={onClose} title="Connect DOS account">
      <form className="grid gap-4" noValidate onSubmit={submit}>
        <p className="text-dos-body text-dos-secondary">
          When {first} accepts, {first}&rsquo;s DOS account connects to this record. You can then view {first}&rsquo;s DOS information read-only, and so can anyone who already views yours. {first} keeps using DOS as usual.
        </p>
        <Field error={error} helper={`The email ${first} signs in to DOS with. ${first} sees the invitation after signing in.`} htmlFor={inputId} id={inputId} label="Email">
          <input
            autoComplete="off"
            className={fieldControlClass({ error: Boolean(error) })}
            id={inputId}
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            type="email"
            value={email}
          />
        </Field>
        <Button disabled={isSaving || !email.trim()} fullWidth type="submit" variant="primary">{isSaving ? "Saving…" : "Create invitation"}</Button>
      </form>
    </Sheet>
  );
}

/* ---------- Details tab: the Person's DOS account ---------- */

export function PersonDosAccountSection({
  account,
  decisions,
  isDiscipling,
  isReadable,
  onCancelInvite,
  onDisconnect,
  onEndDiscipleship,
  onInvite,
  onUndoDecision,
  onViewActivity,
  personName,
  supported,
}: {
  account: DosAppDiscipleshipAccount | null;
  decisions: DosAppDiscipleshipDecision[];
  isDiscipling: boolean;
  isReadable: boolean;
  onCancelInvite: (accountConnectionId: string) => Promise<string | null>;
  onDisconnect: (accountConnectionId: string) => Promise<string | null>;
  onEndDiscipleship: () => Promise<string | null>;
  onInvite: () => void;
  onUndoDecision: (matchId: string) => Promise<string | null>;
  onViewActivity: () => void;
  personName: string;
  supported: boolean;
}) {
  const [confirming, setConfirming] = useState<"disconnect" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const first = firstName(personName);

  async function run(action: () => Promise<string | null>) {
    setIsSaving(true);
    setError(null);

    const message = await action();

    setIsSaving(false);
    setConfirming(null);

    if (message) {
      setError(message);
    }
  }

  const status = account?.status === "accepted" ? "Connected" : account?.status === "pending" ? "Invitation waiting" : "Not connected";

  return (
    <section aria-label="DOS account" className="mt-6 border-t border-dos-rule pt-5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-dos-primary">DOS account</h3>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-bold leading-[1.3] text-dos-primary">{status}</p>
          {account?.status === "pending" && account.inviteEmail ? <p className="mt-0.5 break-words text-[13px] font-semibold text-dos-secondary">{account.inviteEmail}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {account?.status === "accepted" && isReadable ? <Button compact onClick={onViewActivity} variant="tinted">View activity</Button> : null}
          {account?.status === "accepted" ? <Button compact onClick={() => setConfirming("disconnect")}>Disconnect</Button> : null}
          {account?.status === "pending" ? <Button compact disabled={isSaving} onClick={() => void run(() => onCancelInvite(account.id))}>Cancel invitation</Button> : null}
          {!account && supported ? <Button compact onClick={onInvite}>Connect account</Button> : null}
        </div>
      </div>
      {confirming === "disconnect" && account ? (
        <div className="mt-3 rounded-dos-2 bg-dos-surface2 p-3">
          <p className="text-dos-body text-dos-primary">Disconnect {first}&rsquo;s DOS account? Access through this connection ends; everyone&rsquo;s records stay with their owners.</p>
          <div className="mt-2 flex gap-2">
            <Button compact disabled={isSaving} onClick={() => void run(() => onDisconnect(account.id))} variant="danger">Disconnect</Button>
            <Button compact onClick={() => setConfirming(null)} variant="text">Cancel</Button>
          </div>
        </div>
      ) : null}
      {isDiscipling && supported ? (
        <div className="mt-4">
          {confirming === "end" ? (
            <div className="rounded-dos-2 bg-dos-surface2 p-3">
              <p className="text-dos-body text-dos-primary">End discipleship connection? {first} becomes Walking With and stops counting in your Multiplication. Access through this connection ends. History, Fruit and circles stay as they are.</p>
              <div className="mt-2 flex gap-2">
                <Button compact disabled={isSaving} onClick={() => void run(onEndDiscipleship)} variant="primary">End connection</Button>
                <Button compact onClick={() => setConfirming(null)} variant="text">Cancel</Button>
              </div>
            </div>
          ) : (
            <Button compact onClick={() => setConfirming("end")} variant="text">End discipleship connection</Button>
          )}
        </div>
      ) : null}
      {decisions.map((decision) => (
        <div className="mt-3 flex items-center justify-between gap-3" key={decision.id}>
          <p className="min-w-0 text-[13.5px] leading-[1.45] text-dos-body">Linked to {decision.mentorWorkspaceName}&rsquo;s entry for {decision.discipleName}.</p>
          <Button compact disabled={isSaving} onClick={() => void run(() => onUndoDecision(decision.id))} variant="text">Undo link</Button>
        </div>
      ))}
      <div className="mt-2"><ErrorLine message={error} /></div>
    </section>
  );
}

/* ---------- Disciple side: requests, confirmations, connections ---------- */

function RequestCard({ onAction, request }: { onAction: DiscipleshipAction; request: DosAppDiscipleshipIncomingRequest }) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inviter, ...indirect] = request.upstreamViewerNames;

  async function respond(action: "accept_account" | "decline_account") {
    setIsSaving(true);
    setError(null);
    setError(await onAction(action, { accountConnectionId: request.id, visibilityExplained: action === "accept_account" }));
    setIsSaving(false);
  }

  return (
    <li className="rounded-dos-2 border border-dos-line bg-white p-4">
      <p className="text-dos-body font-semibold text-dos-primary">{request.mentorWorkspaceName} wants to connect your DOS account</p>
      <p className="mt-1 text-dos-meta text-dos-secondary">As {request.personName}</p>
      <div className="mt-3 text-dos-body text-dos-primary">
        <p>If you accept, these can view your DOS information, read-only:</p>
        <ul className="mt-1 list-disc pl-5">
          <li>{inviter ?? request.mentorWorkspaceName}</li>
          {indirect.map((name) => <li key={name}>{name}, who views {inviter ?? request.mentorWorkspaceName}</li>)}
        </ul>
        <p className="mt-2 text-dos-meta text-dos-secondary">That includes meetings, notes, prayer, accountability, Journeys, groups and attendance, Fruit, feedback and your discipleship meetings, now and in future. No one can change your records. The accounts of people you disciple stay private unless they accept a connection of their own. You can disconnect at any time.</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button compact disabled={isSaving} onClick={() => void respond("accept_account")} variant="primary">Accept</Button>
        <Button compact disabled={isSaving} onClick={() => void respond("decline_account")} variant="text">Decline</Button>
      </div>
      <div className="mt-2"><ErrorLine message={error} /></div>
    </li>
  );
}

function ConfirmationCard({ confirmation, onAction, people }: { confirmation: DosAppDiscipleshipConfirmation; onAction: DiscipleshipAction; people: Array<{ id: string; name: string }> }) {
  const groupName = useId();
  const selectId = useId();
  const sameName = confirmation.sameNamePersonIds.map((id) => people.find((person) => person.id === id)).filter((person): person is { id: string; name: string } => Boolean(person));
  const [choice, setChoice] = useState<string>("");
  const [otherPersonId, setOtherPersonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const base = { accountConnectionId: confirmation.accountConnectionId, connectionId: confirmation.connectionId };
    let message: string | null;

    setIsSaving(true);
    setError(null);

    if (choice.startsWith("same:")) {
      message = await onAction("confirm_match", { ...base, mode: "existing", personId: choice.slice(5) });
    } else if (choice === "other") {
      message = otherPersonId ? await onAction("confirm_match", { ...base, mode: "existing", personId: otherPersonId }) : "Choose the person in your People.";
    } else if (choice === "create") {
      message = await onAction("confirm_match", { ...base, mode: "create" });
    } else if (choice === "decline") {
      message = await onAction("decline_match", base);
    } else {
      message = "Choose one option.";
    }

    setIsSaving(false);
    setError(message);
  }

  const option = (value: string, label: string) => (
    <label className="flex min-h-11 items-center gap-3 text-dos-body text-dos-primary" key={value}>
      <input checked={choice === value} className="h-4 w-4 accent-[#2251E8]" name={groupName} onChange={() => setChoice(value)} type="radio" value={value} />
      <span>{label}</span>
    </label>
  );

  return (
    <li className="rounded-dos-2 border border-dos-line bg-white p-4">
      <p className="text-dos-body font-semibold text-dos-primary">{confirmation.discipleName}</p>
      <p className="mt-1 text-dos-meta text-dos-secondary">{confirmation.mentorWorkspaceName} listed {confirmation.discipleName} as someone you disciple.</p>
      <fieldset className="mt-2">
        <legend className="sr-only">Who is {confirmation.discipleName}?</legend>
        {sameName.map((person) => option(`same:${person.id}`, `${person.name} in your People`))}
        {option("other", "Someone else in your People")}
        {choice === "other" ? (
          <div className="mb-2 ml-7">
            <label className="sr-only" htmlFor={selectId}>Person</label>
            <select className={fieldControlClass()} id={selectId} onChange={(event) => setOtherPersonId(event.target.value)} value={otherPersonId}>
              <option value="">Choose a person</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </div>
        ) : null}
        {option("create", `Add ${confirmation.discipleName} to your People`)}
        {option("decline", "Not someone I disciple")}
      </fieldset>
      <div className="mt-2 flex items-center gap-3">
        <Button compact disabled={isSaving || !choice} onClick={() => void save()} variant="primary">Save</Button>
        <ErrorLine message={error} />
      </div>
    </li>
  );
}

export function DiscipleshipConnectionsSheet({
  discipleship,
  onAction,
  onClose,
  people,
}: {
  discipleship: DosAppDiscipleship;
  onAction: DiscipleshipAction;
  onClose: () => void;
  people: Array<{ id: string; name: string }>;
}) {
  const [confirmingLeave, setConfirmingLeave] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameOf = (personId: string | null) => people.find((person) => person.id === personId)?.name ?? "a person";
  const hasAnything = discipleship.incomingRequests.length || discipleship.confirmations.length || discipleship.mentorAccounts.length || discipleship.decisions.length;

  async function run(action: string, payload: Record<string, unknown>) {
    setError(await onAction(action, payload));
    setConfirmingLeave(null);
  }

  return (
    <Sheet onClose={onClose} title="Discipleship connections">
      <div className="grid gap-5">
        {discipleship.incomingRequests.length ? (
          <section aria-label="Requests">
            <h3 className="text-dos-eyebrow uppercase text-dos-eyebrowSection">Requests</h3>
            <ul className="mt-2 grid gap-3" role="list">
              {discipleship.incomingRequests.map((request) => <RequestCard key={request.id} onAction={onAction} request={request} />)}
            </ul>
          </section>
        ) : null}
        {discipleship.confirmations.length ? (
          <section aria-label="To confirm">
            <h3 className="text-dos-eyebrow uppercase text-dos-eyebrowSection">To confirm</h3>
            <ul className="mt-2 grid gap-3" role="list">
              {discipleship.confirmations.map((confirmation) => <ConfirmationCard confirmation={confirmation} key={confirmation.connectionId} onAction={onAction} people={people} />)}
            </ul>
          </section>
        ) : null}
        {discipleship.mentorAccounts.length ? (
          <section aria-label="Connected">
            <h3 className="text-dos-eyebrow uppercase text-dos-eyebrowSection">Connected</h3>
            <ul className="mt-2 divide-y divide-dos-rule" role="list">
              {discipleship.mentorAccounts.map((account) => (
                <li className="py-3" key={account.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-dos-body font-semibold text-dos-primary">{account.mentorWorkspaceName}</p>
                      <p className="mt-0.5 text-dos-meta text-dos-secondary">Can view, read-only: {account.upstreamViewerNames.join(", ")}</p>
                    </div>
                    {confirmingLeave === account.id ? null : <Button compact onClick={() => setConfirmingLeave(account.id)}>Disconnect</Button>}
                  </div>
                  {confirmingLeave === account.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-dos-meta text-dos-primary">Their access to your DOS ends now.</p>
                      <Button compact onClick={() => void run("leave_account", { accountConnectionId: account.id })} variant="danger">Disconnect</Button>
                      <Button compact onClick={() => setConfirmingLeave(null)} variant="text">Cancel</Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {discipleship.decisions.length ? (
          <section aria-label="Answered">
            <h3 className="text-dos-eyebrow uppercase text-dos-eyebrowSection">Answered</h3>
            <ul className="mt-2 divide-y divide-dos-rule" role="list">
              {discipleship.decisions.map((decision) => (
                <li className="flex items-center justify-between gap-3 py-3" key={decision.id}>
                  <p className="min-w-0 text-dos-body text-dos-primary">
                    {decision.discipleName}: {decision.status === "confirmed" ? `linked to ${nameOf(decision.matchedPersonId)}` : "not someone you disciple"}
                  </p>
                  <Button compact onClick={() => void run("undo_match", { matchId: decision.id })} variant="text">Undo</Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {hasAnything ? null : <p className="text-dos-body text-dos-secondary">No connection requests.</p>}
        <ErrorLine message={error} />
      </div>
    </Sheet>
  );
}
