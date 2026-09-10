export type MeetingWorkflowIds = {
  meetingId: string;
  prayerRequestId: string;
  reflectionId: string;
  reminderId: string;
};

export type MeetingWorkflowStepName = "meeting" | "prayer" | "reflection" | "reminder";
export type MeetingWorkflowStepStatus = "failed" | "not_requested" | "partial" | "pending" | "saved" | "skipped";

/* One repeatable child of a meeting: a prayer request or a reminder. Each
   carries its own operation id, generated when the draft was created, so a
   retry re-sends the same id for the same item and the route treats it as the
   same record. Reordering or removing another draft cannot shift an id onto a
   different item, which an index-based key would allow. */
export type MeetingWorkflowItem = {
  label: string;
  operationId: string;
  run: MeetingWorkflowStep;
};

export type MeetingWorkflowItemFailure = {
  kind: "prayer" | "reminder";
  label: string;
  message: string;
  operationId: string;
};

export type MeetingWorkflowResult = {
  complete: boolean;
  errors: Partial<Record<MeetingWorkflowStepName, string>>;
  ids: MeetingWorkflowIds;
  /* Which individual repeatable items failed, so the surface can name them and
     keep every entered value on screen. Empty when nothing repeatable failed. */
  itemFailures: MeetingWorkflowItemFailure[];
  /* Operation ids that saved, so a retry can skip them even though the drafts
     are still on screen. */
  savedItemOperationIds: string[];
  statuses: Record<MeetingWorkflowStepName, MeetingWorkflowStepStatus>;
};

type MeetingWorkflowStep = (input: { meetingId: string; operationId: string }) => Promise<unknown>;

export class PersistedWorkflowStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistedWorkflowStepError";
  }
}

export type MeetingWorkflowSteps = {
  meeting: MeetingWorkflowStep;
  /* The original single-item steps. Still supported unchanged so an existing
     caller keeps working; a caller that captures several uses the arrays. */
  prayer?: MeetingWorkflowStep;
  prayers?: MeetingWorkflowItem[];
  reflection?: MeetingWorkflowStep;
  reminder?: MeetingWorkflowStep;
  reminders?: MeetingWorkflowItem[];
};

export function createMeetingWorkflowIds(randomUuid: () => string = () => crypto.randomUUID()): MeetingWorkflowIds {
  return {
    meetingId: randomUuid(),
    prayerRequestId: randomUuid(),
    reflectionId: randomUuid(),
    reminderId: randomUuid(),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save.";
}

export async function runMeetingWorkflow({
  alreadySavedItemOperationIds = [],
  ids,
  requestPrayer,
  requestReflection,
  requestReminder,
  steps,
}: {
  /* Items that saved on an earlier attempt. A retry skips them rather than
     relying on the route to dedupe, so a partial failure never re-posts work
     that already succeeded. */
  alreadySavedItemOperationIds?: string[];
  ids: MeetingWorkflowIds;
  requestPrayer: boolean;
  requestReflection: boolean;
  requestReminder: boolean;
  steps: MeetingWorkflowSteps;
}): Promise<MeetingWorkflowResult> {
  const errors: MeetingWorkflowResult["errors"] = {};
  const itemFailures: MeetingWorkflowItemFailure[] = [];
  const savedItemOperationIds = [...alreadySavedItemOperationIds];
  const alreadySaved = new Set(alreadySavedItemOperationIds);
  const prayerItems = steps.prayers ?? [];
  const reminderItems = steps.reminders ?? [];
  const statuses: MeetingWorkflowResult["statuses"] = {
    meeting: "pending",
    prayer: requestPrayer || prayerItems.length ? "pending" : "not_requested",
    reflection: requestReflection ? "pending" : "not_requested",
    reminder: requestReminder || reminderItems.length ? "pending" : "not_requested",
  };

  try {
    await steps.meeting({ meetingId: ids.meetingId, operationId: ids.meetingId });
    statuses.meeting = "saved";
  } catch (error) {
    statuses.meeting = error instanceof PersistedWorkflowStepError ? "partial" : "failed";
    errors.meeting = errorMessage(error);

    (["prayer", "reflection", "reminder"] as const).forEach((step) => {
      if (statuses[step] === "pending") {
        statuses[step] = "skipped";
      }
    });

    return { complete: false, errors, ids, itemFailures, savedItemOperationIds, statuses };
  }

  const childSteps: Array<{
    name: Exclude<MeetingWorkflowStepName, "meeting">;
    operationId: string;
    requested: boolean;
    run?: MeetingWorkflowStep;
  }> = [
    { name: "reflection", operationId: ids.reflectionId, requested: requestReflection, run: steps.reflection },
    { name: "prayer", operationId: ids.prayerRequestId, requested: requestPrayer, run: steps.prayer },
    { name: "reminder", operationId: ids.reminderId, requested: requestReminder, run: steps.reminder },
  ];

  for (const child of childSteps) {
    if (!child.requested) {
      continue;
    }

    if (!child.run) {
      statuses[child.name] = "failed";
      errors[child.name] = "This workflow step is unavailable.";
      continue;
    }

    try {
      await child.run({ meetingId: ids.meetingId, operationId: child.operationId });
      statuses[child.name] = "saved";
    } catch (error) {
      statuses[child.name] = "failed";
      errors[child.name] = errorMessage(error);
    }
  }

  /* Every repeatable item is its own record, so one failure must not stop the
     others: each is attempted, and the ones that fail are named. */
  for (const [kind, items] of [["prayer", prayerItems], ["reminder", reminderItems]] as const) {
    if (!items.length) {
      continue;
    }

    let failed = 0;

    for (const item of items) {
      if (alreadySaved.has(item.operationId)) {
        continue;
      }

      try {
        await item.run({ meetingId: ids.meetingId, operationId: item.operationId });
        savedItemOperationIds.push(item.operationId);
      } catch (error) {
        failed += 1;
        itemFailures.push({ kind, label: item.label, message: errorMessage(error), operationId: item.operationId });
      }
    }

    if (failed) {
      statuses[kind] = "failed";
      errors[kind] = itemFailures
        .filter((failure) => failure.kind === kind)
        .map((failure) => `${failure.label}: ${failure.message}`)
        .join("; ");
    } else if (statuses[kind] === "pending") {
      statuses[kind] = "saved";
    }
  }

  return {
    complete: Object.keys(errors).length === 0,
    errors,
    ids,
    itemFailures,
    savedItemOperationIds,
    statuses,
  };
}
