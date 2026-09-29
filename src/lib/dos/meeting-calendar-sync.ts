/* USA-273: scheduling a meeting is one save plus one external side effect, and
   the two must never share a fate. Google Calendar is slow or unavailable often
   enough that the user saw "Gateway Timeout" for meetings that had already been
   written, then resubmitted the whole form -- six times, in the 2026-09-12
   incident. The rules below are the contract both the API and the UI follow:

   1. The meeting row is the primary operation. Its outcome decides the HTTP
      status.
   2. Calendar sync is secondary. Its outcome travels in the response body as a
      state, never as a failure status, and never as an exception.
   3. Every state the user can be left in names what actually happened and what
      to do next.

   This module is deliberately dependency-free so the API routes, the client and
   the regression harness all read the same strings and the same decisions. */

export type DosCalendarSyncState =
  /* The user did not ask for a calendar event: nothing to say. */
  | "disabled"
  /* Written to Google and linked. */
  | "synced"
  /* No Google connection in this workspace. Recoverable by connecting. */
  | "not_connected"
  /* Google needs the connection re-authorized. */
  | "needs_reconnect"
  /* Google was slow, errored, or the link could not be written. Recoverable by
     retrying the sync alone -- the meeting itself is already saved. */
  | "failed";

export const dosCalendarSyncStates: DosCalendarSyncState[] = [
  "disabled",
  "failed",
  "needs_reconnect",
  "not_connected",
  "synced",
];

export function isDosCalendarSyncState(value: unknown): value is DosCalendarSyncState {
  return typeof value === "string" && (dosCalendarSyncStates as string[]).includes(value);
}

/* The saved-but-unsynced sentence. It always opens by confirming the meeting
   saved, because that is the question the user is actually asking. */
export const dosCalendarSyncFailedWarning = "Meeting scheduled. Google Calendar sync failed.";
export const dosCalendarSyncNotConnectedWarning = "Meeting scheduled. Connect Google Calendar to add it to your calendar.";
export const dosCalendarSyncReconnectWarning = "Meeting scheduled. Google Calendar needs to be reconnected before it can sync.";

/* Only a failure is worth a retry button: the other recoverable states are
   fixed in Settings, not by trying again. */
export function dosCalendarSyncWarning(state: DosCalendarSyncState) {
  if (state === "failed") {
    return dosCalendarSyncFailedWarning;
  }

  if (state === "not_connected") {
    return dosCalendarSyncNotConnectedWarning;
  }

  if (state === "needs_reconnect") {
    return dosCalendarSyncReconnectWarning;
  }

  return null;
}

export function dosCalendarSyncCanRetry(state: DosCalendarSyncState) {
  return state === "failed";
}

/* A failed Retry is about the calendar only. The meeting is already saved, so
   the message must never say "Nothing was saved" -- that sends the user back to
   schedule it again, which is the duplicate USA-273 exists to prevent. */
export const dosCalendarRetryUnreachableMessage = "Could not reach the server. The meeting is saved. Try Retry again.";
export const dosCalendarRetryFailedMessage = "Google Calendar sync failed. The meeting is saved. Try Retry again.";

export function dosCalendarRetryFailureMessage(status: number | null) {
  return status === null ? dosCalendarRetryUnreachableMessage : dosCalendarRetryFailedMessage;
}

/* The body every successful meeting write answers with. It exists as one
   function so there is a single place that can be shown to always report ok
   for a saved meeting, whatever Google did (USA-273). */
export function dosMeetingSaveResponse(meetingId: string, calendarSync: DosCalendarSyncState) {
  return {
    calendarSync,
    calendarWarning: dosCalendarSyncWarning(calendarSync),
    id: meetingId,
    ok: true,
  };
}

/* A save that never reached the server, or reached it and did not finish, is a
   safe retry: the write is idempotent on the operation id, so resubmitting can
   only ever land on the same meeting. Saying so is the whole point -- the
   generic "Gateway Timeout" gave the user no way to know that. */
export const dosSaveUnreachableMessage = "Could not reach the server. Nothing was saved. Check your connection and try again.";
export const dosSaveTemporaryFailureMessage = "The server did not finish saving. Nothing was lost. Try again.";
export const dosSaveGenericFailureMessage = "Unable to save.";

export function dosSaveFailureMessage(status: number | null) {
  if (status === null) {
    return dosSaveUnreachableMessage;
  }

  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return dosSaveTemporaryFailureMessage;
  }

  return dosSaveGenericFailureMessage;
}

/* Title and description live here rather than in the meetings route so the
   retry endpoint rebuilds the identical event instead of a near-miss copy. */
export function dosMeetingCalendarTitle(participantNames: string[], tableType: string) {
  const named = participantNames.filter((name) => typeof name === "string" && name.trim());

  if (named.length) {
    return `Meeting with ${named.slice(0, 2).join(", ")}${named.length > 2 ? " +" : ""}`;
  }

  return `${String(tableType || "meeting").replace(/_/g, " ")} meeting`;
}

export function dosMeetingCalendarDescription(notes: string | null) {
  return [notes?.trim() ?? "", "Created from DOS."].filter(Boolean).join("\n\n");
}
