"use client";

import { CheckCircle2, Plus, Search, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { CompactOptionSelect } from "@/src/components/dos/forms/OptionSelect";
import { DosFormField, DosFormGrid, FieldInputClass, RequiredMark } from "@/src/components/dos/forms/FormPrimitives";
import { Sheet } from "@/src/components/dos/overlays/DosSurfaces";
import { Avatar, Button, StatusPill } from "@/src/components/dos/ui";
import {
  contactImportMaxFileBytes,
  contactPickerAvailable,
  isLikelyVCardFile,
  parseVCardText,
  pickContactsFromDevice,
  splitFullNameForReview,
  type ImportedContact,
} from "@/src/lib/dos/contact-import";
import { normalizeEmailForMatch, normalizePersonNameForMatch } from "@/src/lib/dos/group-member-match";
import { compactNamePart, joinNameParts } from "@/src/lib/dos/person-name";
import { formatPhoneNumber, phoneDigitsOnly } from "@/src/lib/dos/phone-format";

/* USA-283: one sheet for putting someone in a group.
 *
 * The order follows the question a leader is actually answering: who is it?
 * First look for them among the people already in DOS; if they are not there,
 * add them as a new Person (First name / Last name, the People form's own
 * convention) or bring them in from the phone's contacts. How they belong to
 * the group -- role and status -- comes after, as a quiet default the leader
 * can change.
 *
 * Every path ends in the same write: the group-member route, which links an
 * existing Person or creates exactly one, and adds one membership. Nothing
 * here sends a message or creates an account.
 */

export type GroupAddPersonOption = {
  archived: boolean;
  detail: string;
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
};

export type GroupMemberRole = "member" | "co_leader" | "helper" | "guest";
export type GroupMemberStatus = "active" | "invited";

export type GroupAddMemberRequest = {
  confirmNearDuplicate?: boolean;
  email?: string;
  name?: string;
  personId?: string;
  phone?: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
};

export type GroupAddNearDuplicate = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  reason?: "same_name" | "shared_contact";
};

export type GroupAddMemberOutcome =
  | { alreadyMember: boolean; ok: true; personId: string; personName: string }
  | { error: string; nearDuplicate?: GroupAddNearDuplicate; ok: false };

type NewPersonDraft = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

type PersonMatch = {
  person: GroupAddPersonOption;
  reason: "same_name" | "same_person" | "shared_contact";
};

type ReviewedContact = NewPersonDraft & {
  contact: ImportedContact;
  /* The Person this contact should become, when the leader picked one. */
  linkPersonId: string | null;
  /* The leader said this is someone new despite a possible match. */
  confirmedNew: boolean;
  error: string;
  result: "added" | "already" | null;
};

type Mode = "find" | "new" | "contacts";

const roleOptions: ReadonlyArray<{ label: string; value: GroupMemberRole }> = [
  { label: "Member", value: "member" },
  { label: "Co-leader", value: "co_leader" },
  { label: "Helper", value: "helper" },
  { label: "Guest", value: "guest" },
];

const blankDraft: NewPersonDraft = { email: "", firstName: "", lastName: "", phone: "" };

function contactLine(person: Pick<GroupAddPersonOption, "email" | "phone">) {
  return [formatPhoneNumber(person.phone), person.email].filter(Boolean).join(" · ");
}

function searchPeople(people: readonly GroupAddPersonOption[], query: string) {
  const text = query.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");

  if (!text) {
    return people;
  }

  return people.filter((person) => (
    person.name.toLowerCase().includes(text)
    || (person.email ?? "").toLowerCase().includes(text)
    || (digits.length >= 3 && phoneDigitsOnly(person.phone).includes(digits))
    || person.detail.toLowerCase().includes(text)
  ));
}

/* The same question the server asks, answered early so the leader sees it
   before pressing Add: is this someone already in People? A same name, or a
   shared email or phone, is shown for review; nothing is merged here. */
export function findPossibleMatches(people: readonly GroupAddPersonOption[], draft: NewPersonDraft): PersonMatch[] {
  const name = normalizePersonNameForMatch(joinNameParts(draft.firstName, draft.lastName));
  const email = normalizeEmailForMatch(draft.email);
  const phone = phoneDigitsOnly(draft.phone);

  if (!name && !email && phone.length < 7) {
    return [];
  }

  return people
    .filter((person) => !person.archived)
    .map((person) => {
      const sameName = Boolean(name) && normalizePersonNameForMatch(person.name) === name;
      const sharedContact = Boolean(
        (email && normalizeEmailForMatch(person.email) === email)
        || (phone.length >= 7 && phoneDigitsOnly(person.phone) === phone),
      );

      if (!sameName && !sharedContact) {
        return null;
      }

      return { person, reason: sameName && sharedContact ? "same_person" : sameName ? "same_name" : "shared_contact" } as PersonMatch;
    })
    .filter((match): match is PersonMatch => Boolean(match))
    .slice(0, 3);
}

function matchExplanation(match: PersonMatch) {
  if (match.reason === "same_person") {
    return "Same name and contact details.";
  }

  if (match.reason === "same_name") {
    return "Same name.";
  }

  return "Shares an email or phone number.";
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <h3 className="text-dos-question text-dos-primary">{children}</h3>
      {hint ? <p className="mt-1 text-dos-meta text-dos-secondary">{hint}</p> : null}
    </div>
  );
}

function PossibleMatches({
  disabled,
  matches,
  onChooseExisting,
  onConfirmNew,
}: {
  disabled: boolean;
  matches: readonly PersonMatch[];
  onChooseExisting: (person: GroupAddPersonOption) => void;
  onConfirmNew: () => void;
}) {
  if (!matches.length) {
    return null;
  }

  return (
    <div className="rounded-dos-1 border border-dos-amber/40 bg-dos-amberBg px-3.5 py-3" role="status">
      <p className="text-dos-label text-dos-primary">Is this someone already in People?</p>
      <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        {matches.map((match) => (
          <div className="flex min-w-0 items-center gap-3 rounded-dos-1 bg-white px-3 py-2.5" key={match.person.id}>
            <Avatar name={match.person.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-dos-body font-semibold text-dos-primary">{match.person.name}</span>
              <span className="block truncate text-dos-meta text-dos-secondary">{[matchExplanation(match), contactLine(match.person)].filter(Boolean).join(" ")}</span>
            </span>
            <Button compact disabled={disabled} onClick={() => onChooseExisting(match.person)} variant="tinted">Use</Button>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <Button compact disabled={disabled} onClick={onConfirmNew} variant="text">No, this is someone new</Button>
      </div>
    </div>
  );
}

function NewPersonFields({
  draft,
  idPrefix,
  onChange,
}: {
  draft: NewPersonDraft;
  idPrefix: string;
  onChange: (next: NewPersonDraft) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <DosFormGrid>
        <DosFormField labelVariant="sentence" label={<>First name<RequiredMark /></>}>
          <input
            autoComplete="off"
            className={FieldInputClass()}
            id={`${idPrefix}-first`}
            name="first_name"
            onChange={(event) => onChange({ ...draft, firstName: event.target.value })}
            required
            value={draft.firstName}
          />
        </DosFormField>
        <DosFormField labelVariant="sentence" label="Last name">
          <input
            autoComplete="off"
            className={FieldInputClass()}
            name="last_name"
            onChange={(event) => onChange({ ...draft, lastName: event.target.value })}
            value={draft.lastName}
          />
        </DosFormField>
      </DosFormGrid>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <DosFormField labelVariant="sentence" label="Mobile phone">
          <input
            autoComplete="off"
            className={FieldInputClass()}
            inputMode="tel"
            name="phone"
            onChange={(event) => onChange({ ...draft, phone: phoneDigitsOnly(event.target.value) })}
            placeholder="(651) 456-8974"
            type="tel"
            value={formatPhoneNumber(draft.phone)}
          />
        </DosFormField>
        <DosFormField labelVariant="sentence" label="Email">
          <input
            autoComplete="off"
            className={FieldInputClass()}
            name="email"
            onChange={(event) => onChange({ ...draft, email: event.target.value })}
            placeholder="email@example.com"
            type="email"
            value={draft.email}
          />
        </DosFormField>
      </div>
    </div>
  );
}

function ValueChoice({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <DosFormField control="group" labelVariant="sentence" label={label}>
      <div className="mt-1.5">
        <CompactOptionSelect hideLabel label={label} onChange={onChange} options={options} value={value} />
      </div>
    </DosFormField>
  );
}

export function GroupAddPersonSheet({
  groupName,
  isPreview,
  memberPersonIds,
  onAdd,
  onClose,
  onViewPerson,
  people,
}: {
  groupName: string;
  isPreview: boolean;
  /* People with a current (not removed) membership. */
  memberPersonIds: readonly string[];
  onAdd: (request: GroupAddMemberRequest) => Promise<GroupAddMemberOutcome>;
  onClose: () => void;
  onViewPerson: (personId: string) => void;
  people: readonly GroupAddPersonOption[];
}) {
  const [mode, setMode] = useState<Mode>("find");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NewPersonDraft>(blankDraft);
  const [draftNameHint, setDraftNameHint] = useState("");
  const [confirmedNew, setConfirmedNew] = useState(false);
  const [serverMatch, setServerMatch] = useState<GroupAddNearDuplicate | null>(null);
  const [role, setRole] = useState<GroupMemberRole>("member");
  const [status, setStatus] = useState<GroupMemberStatus>("active");
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ alreadyMember: boolean; personId: string; personName: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /* A second tap while the first request is in flight must not create a
     second person; React state is too slow to stop it, a ref is not. */
  const inFlightRef = useRef(false);
  const [addedPersonIds, setAddedPersonIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ImportedContact[]>([]);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContactKeys, setSelectedContactKeys] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState<ReviewedContact[] | null>(null);
  const [contactsError, setContactsError] = useState("");
  const [contactsFileName, setContactsFileName] = useState("");
  const pickerAvailable = useMemo(() => contactPickerAvailable(), []);

  const memberIds = useMemo(() => new Set([...memberPersonIds, ...addedPersonIds]), [addedPersonIds, memberPersonIds]);
  const activePeople = useMemo(() => people.filter((person) => !person.archived), [people]);
  const results = useMemo(() => searchPeople(activePeople, query).slice(0, query.trim() ? 8 : 5), [activePeople, query]);
  const trimmedQuery = compactNamePart(query);
  const queryLooksLikeName = Boolean(trimmedQuery) && !/@|\d{3}/.test(trimmedQuery);
  const draftName = joinNameParts(draft.firstName, draft.lastName);
  const localMatches = useMemo(() => findPossibleMatches(activePeople, draft), [activePeople, draft]);
  const matches: PersonMatch[] = useMemo(() => {
    if (!serverMatch || localMatches.some((match) => match.person.id === serverMatch.id)) {
      return localMatches;
    }

    const known = activePeople.find((person) => person.id === serverMatch.id);

    return [
      ...localMatches,
      {
        person: known ?? { archived: false, detail: "", email: serverMatch.email, id: serverMatch.id, name: serverMatch.name, phone: serverMatch.phone },
        reason: serverMatch.reason === "shared_contact" ? "shared_contact" : "same_name",
      },
    ];
  }, [activePeople, localMatches, serverMatch]);
  const blockedByMatch = matches.length > 0 && !confirmedNew;
  const roleLabel = roleOptions.find((option) => option.value === role)?.label ?? "Member";
  const hasUnsavedDraft = Boolean(
    (mode === "new" && (draft.firstName.trim() || draft.lastName.trim() || draft.phone || draft.email.trim()))
    || (mode === "contacts" && (reviewed?.some((row) => !row.result) || selectedContactKeys.length > 0)),
  );

  function resetMessages() {
    setError("");
    setSuccess(null);
  }

  async function submit(request: GroupAddMemberRequest) {
    if (inFlightRef.current) {
      return null;
    }

    inFlightRef.current = true;
    setIsSaving(true);

    try {
      return await onAdd(request);
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }

  function recordSuccess(outcome: Extract<GroupAddMemberOutcome, { ok: true }>) {
    setAddedPersonIds((current) => (current.includes(outcome.personId) ? current : [...current, outcome.personId]));
    setSuccess({ alreadyMember: outcome.alreadyMember, personId: outcome.personId, personName: outcome.personName });
  }

  async function addExisting(person: GroupAddPersonOption) {
    resetMessages();

    const outcome = await submit({ personId: person.id, role, status });

    if (!outcome) {
      return;
    }

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }

    recordSuccess(outcome);
    setQuery("");

    /* Choosing an existing person from the review panel resolves the new
       person draft too: that draft was this person. */
    if (mode === "new") {
      setDraft(blankDraft);
      setConfirmedNew(false);
      setServerMatch(null);
      setDraftNameHint("");
      setMode("find");
    }
  }

  function startNewPerson(fromQuery: string) {
    resetMessages();

    const typed = compactNamePart(fromQuery);
    const looksLikeName = typed && !/@|\d{3}/.test(typed);
    const split = looksLikeName ? splitFullNameForReview(typed) : { firstName: "", lastName: "", needsReview: false };

    /* The typed text carries over so nobody retypes it. A name of three or
       more words is split at the first space and flagged, never silently
       decided. An email or phone typed in the search goes to its own field. */
    setDraft({
      email: typed.includes("@") ? typed : "",
      firstName: split.firstName,
      lastName: split.lastName,
      phone: !typed.includes("@") && /\d{3}/.test(typed) ? phoneDigitsOnly(typed) : "",
    });
    setDraftNameHint(split.needsReview ? `Check which part of "${typed}" is the last name.` : "");
    setConfirmedNew(false);
    setServerMatch(null);
    setMode("new");
  }

  async function addNewPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!compactNamePart(draft.firstName) || blockedByMatch) {
      return;
    }

    const outcome = await submit({
      confirmNearDuplicate: confirmedNew,
      email: draft.email.trim(),
      name: draftName,
      phone: draft.phone,
      role,
      status,
    });

    if (!outcome) {
      return;
    }

    if (!outcome.ok) {
      /* The server found someone this client did not know about. Show them
         in the same review panel; the draft stays exactly as typed. */
      if (outcome.nearDuplicate) {
        setServerMatch(outcome.nearDuplicate);
        setConfirmedNew(false);
      } else {
        setError(outcome.error);
      }

      return;
    }

    recordSuccess(outcome);
    setDraft(blankDraft);
    setDraftNameHint("");
    setConfirmedNew(false);
    setServerMatch(null);
    setQuery("");
    setMode("find");
  }

  /* ---------- Contacts ---------- */

  function loadContacts(next: ImportedContact[], fileName = "") {
    setContacts(next);
    setContactsFileName(fileName);
    setReviewed(null);
    setContactQuery("");
    /* Only what the leader chooses is imported. A single contact is obviously
       the one they meant; a list starts with nobody selected. */
    setSelectedContactKeys(next.length === 1 ? [next[0].key] : []);
    setContactsError(next.length ? "" : "No contacts with a name, phone or email were found in that file.");
  }

  async function handleContactFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";
    setContactsError("");

    if (!file) {
      return;
    }

    if (!isLikelyVCardFile(file)) {
      setContactsError("Choose a contact card file (.vcf). A spreadsheet of contacts can be imported from People instead.");
      return;
    }

    if (file.size > contactImportMaxFileBytes) {
      setContactsError("That file is too large to read here. Export a smaller list of contacts and try again.");
      return;
    }

    try {
      const parsed = parseVCardText(await file.text());

      loadContacts(parsed.contacts, file.name);
    } catch {
      setContactsError("That file could not be read as contacts.");
    }
  }

  async function handlePickContacts() {
    setContactsError("");

    try {
      loadContacts(await pickContactsFromDevice());
    } catch (pickError) {
      /* Cancelling the picker is not an error worth showing. */
      if (pickError instanceof Error && pickError.name !== "AbortError" && pickError.name !== "InvalidStateError") {
        setContactsError("Contacts could not be opened. You can use a contact file instead.");
      }
    }
  }

  function toggleContact(key: string) {
    setSelectedContactKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function startReview() {
    const chosen = contacts.filter((contact) => selectedContactKeys.includes(contact.key));

    setReviewed(chosen.map((contact) => ({
      confirmedNew: false,
      contact,
      email: contact.emails[0]?.value ?? "",
      error: "",
      firstName: contact.firstName,
      lastName: contact.lastName,
      linkPersonId: null,
      phone: phoneDigitsOnly(contact.phones[0]?.value ?? ""),
      result: null,
    })));
  }

  function updateReviewed(key: string, patch: Partial<ReviewedContact>) {
    setReviewed((current) => current?.map((row) => (row.contact.key === key ? { ...row, ...patch } : row)) ?? null);
  }

  const pendingReviewed = reviewed?.filter((row) => !row.result) ?? [];
  const reviewBlocked = pendingReviewed.some((row) => {
    if (row.linkPersonId) {
      return false;
    }

    return !compactNamePart(row.firstName) || (findPossibleMatches(activePeople, row).length > 0 && !row.confirmedNew);
  });

  async function addReviewedContacts() {
    if (!reviewed || reviewBlocked || inFlightRef.current) {
      return;
    }

    resetMessages();

    let added = 0;
    let lastSuccess: Extract<GroupAddMemberOutcome, { ok: true }> | null = null;

    /* One at a time through the same write as a manual addition, so every
       contact gets the same duplicate handling and a failure stops nothing
       else. */
    for (const row of reviewed) {
      if (row.result) {
        continue;
      }

      const outcome = await submit(row.linkPersonId
        ? { personId: row.linkPersonId, role, status }
        : {
          confirmNearDuplicate: row.confirmedNew,
          email: row.email.trim(),
          name: joinNameParts(row.firstName, row.lastName),
          phone: row.phone,
          role,
          status,
        });

      if (!outcome) {
        continue;
      }

      if (outcome.ok) {
        added += outcome.alreadyMember ? 0 : 1;
        lastSuccess = outcome;
        setAddedPersonIds((current) => (current.includes(outcome.personId) ? current : [...current, outcome.personId]));
        updateReviewed(row.contact.key, { error: "", result: outcome.alreadyMember ? "already" : "added" });
      } else {
        updateReviewed(row.contact.key, {
          confirmedNew: false,
          error: outcome.nearDuplicate
            ? `${outcome.nearDuplicate.name} may already be this person. Choose them, or confirm this is someone new.`
            : outcome.error,
        });
      }
    }

    if (lastSuccess) {
      setSuccess(added > 1
        ? { alreadyMember: false, personId: "", personName: `${added} people` }
        : { alreadyMember: lastSuccess.alreadyMember, personId: lastSuccess.personId, personName: lastSuccess.personName });
    }
  }

  const visibleContacts = contacts.filter((contact) => {
    const text = contactQuery.trim().toLowerCase();

    return !text || contact.displayName.toLowerCase().includes(text) || contact.emails.some((item) => item.value.toLowerCase().includes(text));
  });

  return (
    <Sheet
      description="Adding someone to this group sends them no message and creates no account. Member invitations are separate."
      isDirty={() => hasUnsavedDraft}
      kind="editable"
      onClose={onClose}
      showEyebrow={false}
      title={`Add to ${groupName}`}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 pt-1">
        {success ? (
          <div className="flex items-start gap-3 rounded-dos-1 bg-dos-greenBg px-3.5 py-3" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-dos-green" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <p className="text-dos-body font-semibold text-dos-primary">
                {success.alreadyMember ? `${success.personName} is already in ${groupName}.` : `${success.personName} added to ${groupName}.`}
              </p>
              {isPreview ? <p className="mt-0.5 text-dos-meta text-dos-secondary">Preview only. Nothing was saved.</p> : null}
              {/* A person the preview invented in memory has no record to open. */}
              {success.personId && !(isPreview && success.personId.startsWith("preview-person-")) ? (
                <div className="mt-2">
                  <Button compact onClick={() => onViewPerson(success.personId)} variant="secondary">View person</Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {error ? <p className="rounded-dos-1 bg-dos-redBg px-3.5 py-3 text-dos-label text-dos-red" role="alert">{error}</p> : null}

        {mode === "find" ? (
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
            <SectionTitle>Find an existing person</SectionTitle>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dos-secondary" strokeWidth={2} />
              <input
                aria-label="Find an existing person"
                autoComplete="off"
                className="h-12 w-full rounded-dos-1 border border-dos-line bg-white pl-10 pr-11 text-dos-body text-dos-primary outline-none placeholder:text-dos-secondary focus-visible:border-dos-blue focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-offset-2 [&::-webkit-search-cancel-button]:appearance-none"
                data-unsaved="ignore"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, phone, or email"
                type="search"
                value={query}
              />
              {query ? (
                <button aria-label="Clear search" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-dos-3 text-dos-secondary hover:text-dos-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue" onClick={() => setQuery("")} type="button">
                  <X aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
            {results.length ? (
              <div className="rounded-dos-1 border border-dos-line px-3">
                {results.map((person) => {
                  const inGroup = memberIds.has(person.id);

                  return (
                    <div className="flex min-h-[60px] min-w-0 items-center gap-3 border-t border-dos-line py-2.5 first:border-t-0" key={person.id}>
                      <Avatar name={person.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-dos-body font-semibold text-dos-primary">{person.name}</span>
                        {contactLine(person) || person.detail ? <span className="block truncate text-dos-meta text-dos-secondary">{contactLine(person) || person.detail}</span> : null}
                      </span>
                      {inGroup ? (
                        <StatusPill tone="green">In group</StatusPill>
                      ) : (
                        <Button compact disabled={isSaving} onClick={() => void addExisting(person)} variant="tinted">Add</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : trimmedQuery ? (
              <p className="text-dos-body text-dos-secondary">No one in People matches “{trimmedQuery}”.</p>
            ) : (
              <p className="text-dos-body text-dos-secondary">No people yet. Add someone new below.</p>
            )}
            {trimmedQuery && queryLooksLikeName ? (
              <button
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-dos-3 px-[18px] py-3 text-center text-dos-body font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-offset-2 ${
                  results.length ? "border border-dos-line bg-white text-dos-primary hover:border-dos-blue100" : "bg-dos-blue50 text-dos-blueText hover:bg-dos-blue100"
                }`}
                onClick={() => startNewPerson(trimmedQuery)}
                type="button"
              >
                <Plus aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="min-w-0 break-words">{`Add “${trimmedQuery}” as a new person`}</span>
              </button>
            ) : null}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-t border-dos-line pt-4 min-[420px]:grid-cols-2">
              <Button fullWidth icon="add" onClick={() => startNewPerson(queryLooksLikeName ? "" : trimmedQuery)} variant="secondary">Add a new person</Button>
              <Button fullWidth icon="upload" onClick={() => { resetMessages(); setMode("contacts"); }} variant="secondary">Import a contact file</Button>
            </div>
          </section>
        ) : null}

        {mode === "new" ? (
          <form className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" onSubmit={addNewPerson}>
            <SectionTitle hint="Creates one Person in People and adds them to this group.">Add a new person</SectionTitle>
            {draftNameHint ? <p className="text-dos-meta font-semibold text-dos-amber">{draftNameHint}</p> : null}
            <NewPersonFields
              draft={draft}
              idPrefix="group-add-new"
              onChange={(next) => {
                if (next.firstName !== draft.firstName || next.lastName !== draft.lastName) {
                  setDraftNameHint("");
                }

                setDraft(next);
                setConfirmedNew(false);
                setServerMatch(null);
              }}
            />
            <PossibleMatches
              disabled={isSaving}
              matches={confirmedNew ? [] : matches}
              onChooseExisting={(person) => void addExisting(person)}
              onConfirmNew={() => setConfirmedNew(true)}
            />
            {confirmedNew && matches.length ? (
              <p className="text-dos-meta text-dos-secondary">A new person will be created, separate from {matches.map((match) => match.person.name).join(", ")}.</p>
            ) : null}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 min-[420px]:grid-cols-[auto_1fr]">
              <Button onClick={() => { resetMessages(); setMode("find"); }} variant="text">Back</Button>
              <Button disabled={isSaving || !compactNamePart(draft.firstName) || blockedByMatch} fullWidth type="submit" variant="primary">
                <span className="min-w-0 truncate">{isSaving ? "Adding…" : draftName ? `Add ${draftName}` : "Add person"}</span>
              </Button>
            </div>
          </form>
        ) : null}

        {mode === "contacts" ? (
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
            {/* USA-283: this is a contact FILE import, not Apple Contacts
                integration. Picking straight from the phone's address book
                needs the browser Contact Picker, which iOS keeps behind an
                experimental flag, so the button below appears only where the
                browser really has it. The copy says which one you are using
                rather than implying the other. */}
            <SectionTitle hint="Choose the people to add. You check each one before anything is saved.">{pickerAvailable ? "Import from contacts" : "Import a contact file"}</SectionTitle>
            {!reviewed ? (
              <>
                {pickerAvailable ? (
                  <Button fullWidth icon="people" onClick={() => void handlePickContacts()} variant="tinted">Choose from this phone’s contacts</Button>
                ) : null}
                <label className="grid cursor-pointer gap-1 rounded-dos-1 border border-dashed border-dos-blue100 bg-dos-blue50 px-4 py-3.5 focus-within:ring-2 focus-within:ring-dos-blue">
                  <span className="text-dos-body font-semibold text-dos-blueText">Choose a contact file (.vcf)</span>
                  <span className="text-dos-meta text-dos-secondary">{contactsFileName ? `Loaded ${contactsFileName}` : "Export contacts from the Contacts app first, then choose that file"}</span>
                  <input accept=".vcf,.vcard,text/vcard,text/x-vcard" className="sr-only" data-unsaved="ignore" onChange={(event) => void handleContactFile(event)} type="file" />
                </label>
                <details className="rounded-dos-1 border border-dos-line px-4 py-3 text-dos-meta text-dos-body">
                  <summary className="cursor-pointer text-dos-label text-dos-primary">How to get a contact file on iPhone</summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>One person: in Contacts, open them, tap <strong>Share Contact</strong>, then <strong>Save to Files</strong>.</li>
                    <li>Several people: in Contacts, tap <strong>Lists</strong>, touch and hold a list, tap <strong>Export</strong>, then <strong>Save to Files</strong>.</li>
                    <li>Come back here and choose that file. Only the people you tick are added.</li>
                  </ol>
                  {!pickerAvailable ? <p className="mt-2 text-dos-secondary">On iPhone, Safari does not let a website open your address book, so this route goes through an exported file. Picking people straight from Contacts needs a separate piece of work.</p> : null}
                </details>
                {contactsError ? <p className="text-dos-label text-dos-red" role="alert">{contactsError}</p> : null}
                {contacts.length > 1 ? (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-dos-label text-dos-primary">{contacts.length} contacts · {selectedContactKeys.length} selected</p>
                      {selectedContactKeys.length ? <Button compact onClick={() => setSelectedContactKeys([])} variant="text">Clear</Button> : null}
                    </div>
                    {contacts.length > 8 ? (
                      <input
                        aria-label="Search contacts"
                        className={FieldInputClass(false)}
                        data-unsaved="ignore"
                        onChange={(event) => setContactQuery(event.target.value)}
                        placeholder="Search these contacts"
                        type="search"
                        value={contactQuery}
                      />
                    ) : null}
                    <div className="max-h-[320px] overflow-y-auto rounded-dos-1 border border-dos-line px-3">
                      {visibleContacts.slice(0, 200).map((contact) => (
                        <label className="flex min-h-[52px] cursor-pointer items-center gap-3 border-t border-dos-line py-2 first:border-t-0" key={contact.key}>
                          <input
                            checked={selectedContactKeys.includes(contact.key)}
                            className="h-5 w-5 shrink-0 accent-dos-blue"
                            data-unsaved="ignore"
                            onChange={() => toggleContact(contact.key)}
                            type="checkbox"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-dos-body font-semibold text-dos-primary">{contact.displayName}</span>
                            <span className="block truncate text-dos-meta text-dos-secondary">{[contact.phones[0]?.value, contact.emails[0]?.value].filter(Boolean).join(" · ") || "No phone or email"}</span>
                          </span>
                        </label>
                      ))}
                      {visibleContacts.length > 200 ? <p className="py-2 text-dos-meta text-dos-secondary">Showing 200. Search to find someone else.</p> : null}
                    </div>
                  </div>
                ) : null}
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 min-[420px]:grid-cols-[auto_1fr]">
                  <Button onClick={() => { setMode("find"); setContacts([]); setSelectedContactKeys([]); setContactsFileName(""); }} variant="text">Back</Button>
                  <Button disabled={!selectedContactKeys.length} fullWidth onClick={startReview} variant="primary">
                    {selectedContactKeys.length ? `Review ${selectedContactKeys.length === 1 ? "1 person" : `${selectedContactKeys.length} people`}` : "Choose who to add"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
                  {reviewed.map((row) => {
                    const rowMatches = row.result || row.linkPersonId ? [] : findPossibleMatches(activePeople, row);
                    const linked = row.linkPersonId ? activePeople.find((person) => person.id === row.linkPersonId) ?? null : null;

                    return (
                      <article className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-dos-1 border border-dos-line px-3.5 py-3.5" key={row.contact.key}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 text-dos-body font-semibold text-dos-primary">{row.contact.displayName}</p>
                          {row.result ? (
                            <StatusPill tone="green">{row.result === "added" ? "Added" : "Already in"}</StatusPill>
                          ) : (
                            <Button compact onClick={() => setReviewed((current) => current?.filter((item) => item.contact.key !== row.contact.key) ?? null)} variant="text">Remove</Button>
                          )}
                        </div>
                        {row.result ? null : linked ? (
                          <div className="flex items-center justify-between gap-3 rounded-dos-1 bg-dos-blue50 px-3 py-2.5">
                            <p className="min-w-0 text-dos-meta text-dos-blueText">Will add {linked.name}, already in People.</p>
                            <Button compact onClick={() => updateReviewed(row.contact.key, { linkPersonId: null })} variant="text">Undo</Button>
                          </div>
                        ) : (
                          <>
                            {row.contact.nameNeedsReview ? (
                              <p className="text-dos-meta font-semibold text-dos-amber">
                                {row.contact.nameSource === "organization"
                                  ? "This card is a company name. Enter the person's name."
                                  : row.contact.nameSource === "none"
                                    ? "This contact has no name. Enter one to add them."
                                    : "Check which part is the last name."}
                              </p>
                            ) : null}
                            <DosFormGrid>
                              <DosFormField labelVariant="sentence" label={<>First name<RequiredMark /></>}>
                                <input className={FieldInputClass()} onChange={(event) => updateReviewed(row.contact.key, { confirmedNew: false, firstName: event.target.value })} required value={row.firstName} />
                              </DosFormField>
                              <DosFormField labelVariant="sentence" label="Last name">
                                <input className={FieldInputClass()} onChange={(event) => updateReviewed(row.contact.key, { confirmedNew: false, lastName: event.target.value })} value={row.lastName} />
                              </DosFormField>
                            </DosFormGrid>
                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                              {row.contact.phones.length > 1 ? (
                                <ValueChoice
                                  label="Mobile phone"
                                  onChange={(value) => updateReviewed(row.contact.key, { confirmedNew: false, phone: value })}
                                  options={[
                                    ...row.contact.phones.map((item) => ({ label: `${formatPhoneNumber(item.value) || item.value}${item.label ? ` · ${item.label}` : ""}`, value: phoneDigitsOnly(item.value) })),
                                    { label: "No phone", value: "" },
                                  ]}
                                  value={row.phone}
                                />
                              ) : (
                                <DosFormField labelVariant="sentence" label="Mobile phone">
                                  <input className={FieldInputClass()} inputMode="tel" onChange={(event) => updateReviewed(row.contact.key, { confirmedNew: false, phone: phoneDigitsOnly(event.target.value) })} type="tel" value={formatPhoneNumber(row.phone)} />
                                </DosFormField>
                              )}
                              {row.contact.emails.length > 1 ? (
                                <ValueChoice
                                  label="Email"
                                  onChange={(value) => updateReviewed(row.contact.key, { confirmedNew: false, email: value })}
                                  options={[
                                    ...row.contact.emails.map((item) => ({ label: `${item.value}${item.label ? ` · ${item.label}` : ""}`, value: item.value })),
                                    { label: "No email", value: "" },
                                  ]}
                                  value={row.email}
                                />
                              ) : (
                                <DosFormField labelVariant="sentence" label="Email">
                                  <input className={FieldInputClass()} onChange={(event) => updateReviewed(row.contact.key, { confirmedNew: false, email: event.target.value })} type="email" value={row.email} />
                                </DosFormField>
                              )}
                            </div>
                            <PossibleMatches
                              disabled={isSaving}
                              matches={row.confirmedNew ? [] : rowMatches}
                              onChooseExisting={(person) => updateReviewed(row.contact.key, { error: "", linkPersonId: person.id })}
                              onConfirmNew={() => updateReviewed(row.contact.key, { confirmedNew: true, error: "" })}
                            />
                          </>
                        )}
                        {row.error ? <p className="text-dos-meta font-semibold text-dos-red" role="alert">{row.error}</p> : null}
                      </article>
                    );
                  })}
                </div>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 min-[420px]:grid-cols-[auto_1fr]">
                  <Button onClick={() => setReviewed(null)} variant="text">Back</Button>
                  {pendingReviewed.length ? (
                    <Button disabled={isSaving || reviewBlocked} fullWidth onClick={() => void addReviewedContacts()} variant="primary">
                      {isSaving ? "Adding…" : `Add ${pendingReviewed.length === 1 ? "1 person" : `${pendingReviewed.length} people`} to group`}
                    </Button>
                  ) : (
                    <Button fullWidth onClick={() => { setReviewed(null); setContacts([]); setSelectedContactKeys([]); setContactsFileName(""); setMode("find"); }} variant="secondary">Done</Button>
                  )}
                </div>
              </>
            )}
          </section>
        ) : null}

        <section className="border-t border-dos-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-dos-label text-dos-secondary">
              Joins as <span className="text-dos-primary">{roleLabel}</span> · <span className="text-dos-primary">{status === "active" ? "Active" : "Invited"}</span>
            </p>
            <Button compact onClick={() => setIsRoleOpen((open) => !open)} variant="text">{isRoleOpen ? "Done" : "Change"}</Button>
          </div>
          {isRoleOpen ? (
            <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 min-[420px]:grid-cols-2">
              <ValueChoice label="Role in this group" onChange={(value) => setRole(value as GroupMemberRole)} options={roleOptions} value={role} />
              <DosFormField control="group" labelVariant="sentence" label="Status">
                <div className="mt-1.5 flex h-12 rounded-dos-3 border border-dos-line bg-white p-1" role="radiogroup">
                  {(["active", "invited"] as const).map((option) => (
                    <button
                      aria-checked={status === option}
                      className={`flex-1 rounded-dos-3 px-3 text-dos-label transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue ${status === option ? "bg-dos-blue text-white" : "text-dos-secondary hover:text-dos-primary"}`}
                      key={option}
                      onClick={() => setStatus(option)}
                      role="radio"
                      type="button"
                    >
                      {option === "active" ? "Active" : "Invited"}
                    </button>
                  ))}
                </div>
              </DosFormField>
              <p className="text-dos-meta text-dos-secondary min-[420px]:col-span-2">Invited marks someone you expect to join. It still sends nothing.</p>
            </div>
          ) : null}
        </section>
      </div>
    </Sheet>
  );
}
