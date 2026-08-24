export type MeetingWorkflowIds = {
  meetingId: string;
  prayerRequestId: string;
  reflectionId: string;
  reminderId: string;
};

export type MeetingWorkflowStepName = "meeting" | "prayer" | "reflection" | "reminder";
export type MeetingWorkflowStepStatus = "failed" | "not_requested" | "partial" | "pending" | "saved" | "skipped";

export type MeetingWorkflowResult = {
  complete: boolean;
  errors: Partial<Record<MeetingWorkflowStepName, string>>;
  ids: MeetingWorkflowIds;
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
  prayer?: MeetingWorkflowStep;
  reflection?: MeetingWorkflowStep;
  reminder?: MeetingWorkflowStep;
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
  ids,
  requestPrayer,
  requestReflection,
  requestReminder,
  steps,
}: {
  ids: MeetingWorkflowIds;
  requestPrayer: boolean;
  requestReflection: boolean;
  requestReminder: boolean;
  steps: MeetingWorkflowSteps;
}): Promise<MeetingWorkflowResult> {
  const errors: MeetingWorkflowResult["errors"] = {};
  const statuses: MeetingWorkflowResult["statuses"] = {
    meeting: "pending",
    prayer: requestPrayer ? "pending" : "not_requested",
    reflection: requestReflection ? "pending" : "not_requested",
    reminder: requestReminder ? "pending" : "not_requested",
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

    return { complete: false, errors, ids, statuses };
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

  return {
    complete: Object.keys(errors).length === 0,
    errors,
    ids,
    statuses,
  };
}
