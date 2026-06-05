"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

type FirstPerson = {
  address: string;
  email: string;
  name: string;
  phone: string;
  relationshipType: string;
};

type OrganizationChoice = "independent" | "other" | "usam";

type SetupForm = {
  city: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationChoice: OrganizationChoice;
  organizationName: string;
  organizationRole: string;
  phone: string;
  spouseEmail: string;
  spouseName: string;
  spousePhone: string;
  state: string;
};

type UsamSetupApplication = {
  callingReason: string;
  location: string;
  ministryFocus: string;
  monthlyBudget: string;
  prayerNeeds: string;
  profilePhotoUrl: string;
  referencesText: string;
  storyTestimony: string;
};

type SetupStepId =
  | "finish"
  | "my3"
  | "organization"
  | "usam_budget"
  | "usam_calling"
  | "usam_focus"
  | "usam_location"
  | "usam_photo"
  | "usam_prayer"
  | "usam_references"
  | "usam_review"
  | "usam_story"
  | "welcome"
  | "workspace";

type SetupStep = {
  id: SetupStepId;
  label: string;
};

const initialPeople: FirstPerson[] = Array.from({ length: 3 }, () => ({
  address: "",
  email: "",
  name: "",
  phone: "",
  relationshipType: "",
}));

const initialForm: SetupForm = {
  city: "",
  email: "",
  firstName: "",
  lastName: "",
  organizationChoice: "independent",
  organizationName: "",
  organizationRole: "",
  phone: "",
  spouseEmail: "",
  spouseName: "",
  spousePhone: "",
  state: "",
};

const initialApplication: UsamSetupApplication = {
  callingReason: "",
  location: "",
  ministryFocus: "",
  monthlyBudget: "",
  prayerNeeds: "",
  profilePhotoUrl: "",
  referencesText: "",
  storyTestimony: "",
};

const relationshipTypes = ["Friend", "Family", "Neighbor", "Coworker", "Church", "New contact"];
const baseSteps: SetupStep[] = [
  { id: "welcome", label: "Welcome" },
  { id: "workspace", label: "Workspace" },
  { id: "my3", label: "My 3" },
  { id: "organization", label: "Organization" },
];
const usamApplicationSteps: SetupStep[] = [
  { id: "usam_calling", label: "Calling" },
  { id: "usam_story", label: "Story" },
  { id: "usam_focus", label: "Focus" },
  { id: "usam_location", label: "Location" },
  { id: "usam_photo", label: "Photo" },
  { id: "usam_budget", label: "Budget" },
  { id: "usam_prayer", label: "Prayer" },
  { id: "usam_references", label: "References" },
  { id: "usam_review", label: "Review" },
];

function setupStepsFor(choice: OrganizationChoice) {
  if (choice === "usam") {
    return [...baseSteps, ...usamApplicationSteps];
  }

  return [...baseSteps, { id: "finish", label: "Finish" } satisfies SetupStep];
}

function personName(form: SetupForm) {
  return [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
}

function locationFromForm(form: SetupForm) {
  return [form.city, form.state].filter(Boolean).join(", ");
}

function buildUsamCallingFocus(application: UsamSetupApplication) {
  return [
    ["Calling", application.callingReason],
    ["Ministry focus", application.ministryFocus],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join("\n\n");
}

export function DosSetupClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SetupForm>(initialForm);
  const [application, setApplication] = useState<UsamSetupApplication>(initialApplication);
  const [people, setPeople] = useState<FirstPerson[]>(initialPeople);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceHref, setWorkspaceHref] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const requiredPeopleCount = useMemo(() => people.filter((person) => person.name.trim()).length, [people]);
  const setupSteps = useMemo(() => setupStepsFor(form.organizationChoice), [form.organizationChoice]);
  const currentStep = setupSteps[Math.min(step, setupSteps.length - 1)] ?? setupSteps[0];
  const isLastStep = step >= setupSteps.length - 1;
  const usamStepIndex = usamApplicationSteps.findIndex((item) => item.id === currentStep.id);

  function update<K extends keyof SetupForm>(key: K, value: SetupForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateApplication<K extends keyof UsamSetupApplication>(key: K, value: UsamSetupApplication[K]) {
    setApplication((current) => ({ ...current, [key]: value }));
  }

  function updatePerson(index: number, key: keyof FirstPerson, value: string) {
    setPeople((current) => current.map((person, personIndex) => (
      personIndex === index ? { ...person, [key]: value } : person
    )));
  }

  function addPerson() {
    setPeople((current) => [...current, {
      address: "",
      email: "",
      name: "",
      phone: "",
      relationshipType: "",
    }]);
  }

  function validationMessage(stepId: SetupStepId) {
    switch (stepId) {
      case "workspace":
        return "Add your name and email to continue.";
      case "my3":
        return "Add at least three people to continue.";
      case "organization":
        return form.organizationChoice === "other" ? "Add the organization name to continue." : "Choose an organization path.";
      case "usam_calling":
        return "Tell us why you feel called to USA Missionaries.";
      case "usam_story":
        return "Share your story or testimony.";
      case "usam_focus":
        return "Add who you feel called to reach or disciple.";
      case "usam_location":
        return "Add where you are based.";
      case "usam_budget":
        return "Add your monthly support goal.";
      case "usam_prayer":
        return "Add how people can be praying for you.";
      default:
        return "Complete this step first.";
    }
  }

  function canContinueStep(stepId: SetupStepId) {
    switch (stepId) {
      case "welcome":
        return true;
      case "workspace":
        return Boolean(form.firstName.trim() && form.lastName.trim() && form.email.trim());
      case "my3":
        return requiredPeopleCount >= 3;
      case "organization":
        return form.organizationChoice !== "other" || Boolean(form.organizationName.trim());
      case "usam_calling":
        return Boolean(application.callingReason.trim());
      case "usam_story":
        return Boolean(application.storyTestimony.trim());
      case "usam_focus":
        return Boolean(application.ministryFocus.trim());
      case "usam_location":
        return Boolean(application.location.trim() || locationFromForm(form));
      case "usam_budget":
        return Boolean(application.monthlyBudget.trim());
      case "usam_prayer":
        return Boolean(application.prayerNeeds.trim());
      case "finish":
      case "usam_photo":
      case "usam_references":
      case "usam_review":
        return true;
      default:
        return false;
    }
  }

  function nextStep() {
    if (!canContinueStep(currentStep.id)) {
      setError(validationMessage(currentStep.id));
      return;
    }

    setError("");
    setStep((current) => Math.min(current + 1, setupSteps.length - 1));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canContinueStep(currentStep.id)) {
      setError(validationMessage(currentStep.id));
      return;
    }

    setError("");
    setIsSaving(true);

    const isUsamPath = form.organizationChoice === "usam";
    const fallbackLocation = locationFromForm(form);
    const monthlyGoal = application.monthlyBudget.trim();

    try {
      const response = await fetch("/api/dos/portal/workspaces", {
        body: JSON.stringify({
          city: form.city,
          email: form.email,
          firstName: form.firstName,
          firstThreePeople: people.filter((person) => person.name.trim()),
          lastName: form.lastName,
          organizationName: form.organizationChoice === "other" ? form.organizationName : undefined,
          organizationRole: form.organizationChoice === "other" ? form.organizationRole : undefined,
          phone: form.phone,
          roleCalling: isUsamPath
            ? "usa_missionary"
            : form.organizationChoice === "other"
              ? "ministry_partner"
              : "disciple_maker",
          setupType: form.organizationChoice === "other" ? "ministry_team" : "personal",
          spouseEmail: form.spouseEmail,
          spouseName: form.spouseName,
          spousePhone: form.spousePhone,
          state: form.state,
          teamStatus: form.spouseName.trim() ? "married_team" : "individual",
          usamApplication: isUsamPath
            ? {
              callingFocus: buildUsamCallingFocus(application),
              location: application.location || fallbackLocation,
              monthlyBudget: monthlyGoal,
              prayerNeeds: application.prayerNeeds,
              profilePhotoUrl: application.profilePhotoUrl,
              referencesText: application.referencesText,
              storyTestimony: application.storyTestimony,
              supportGoal: monthlyGoal,
            }
            : undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as { applicationSubmitted?: boolean; error?: string; workspaceHref?: string };

      if (!response.ok || !payload.workspaceHref) {
        throw new Error(payload.error ?? "Unable to finish setup.");
      }

      setWorkspaceHref(payload.workspaceHref);
      setCompletionMessage(payload.applicationSubmitted
        ? "Application submitted. Pending review."
        : "Your DOS workspace is ready.");
      router.push(payload.workspaceHref);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to finish setup.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="dos-setup-route min-h-screen bg-white text-[#0F172A]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.dos-setup-route) {
              background: #FFFFFF !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            body:has(.dos-setup-route) > footer {
              display: none !important;
            }
          `,
        }}
      />
      <div className="mx-auto flex min-h-screen max-w-[760px] flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link className="text-[18px] font-black tracking-[-0.035em] text-[#1D4ED8]" href="/dos/onboarding">
            DOS
          </Link>
          <Link className="rounded-full border border-[#DCEBFF] px-4 py-2 text-xs font-bold text-[#0F172A]" href="/dos">
            Sign In
          </Link>
        </header>

        <section className="mt-8 rounded-[32px] border border-[#EAF2FF] bg-[#FBFDFF] p-4 shadow-[0_24px_70px_rgba(37,99,235,0.075)] sm:p-6">
          <div className="flex flex-wrap gap-2">
            {setupSteps.map((title, index) => (
              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  index === step ? "bg-[#2563EB] text-white" : index < step ? "bg-[#EBF2FF] text-[#2563EB]" : "bg-white text-[#94A3B8]"
                }`}
                key={`${title.id}-${index}`}
              >
                {title.label}
              </span>
            ))}
          </div>

          {workspaceHref ? (
            <div className="mt-7 rounded-[26px] border border-[#BFDBFE] bg-white p-5">
              <h1 className="text-3xl font-black tracking-[-0.035em] text-[#020617]">{completionMessage || "Your DOS workspace is ready."}</h1>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">
                {completionMessage.includes("Application")
                  ? "Your USA Missionaries application is pending review. You can keep using DOS while the Command Center team reviews it."
                  : "Your first people were saved locally. Continue into DOS and sign in with the same email when prompted."}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white" href={workspaceHref}>
                  Open DOS
                </Link>
                <Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-5 text-sm font-bold text-[#0F172A]" href={`/login?next=${encodeURIComponent(workspaceHref)}`}>
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form className="mt-7" onSubmit={submit}>
              {currentStep.id === "welcome" ? <WelcomeStep /> : null}
              {currentStep.id === "workspace" ? <WorkspaceStep form={form} onUpdate={update} /> : null}
              {currentStep.id === "my3" ? <PeopleStep onAddPerson={addPerson} onUpdate={updatePerson} people={people} /> : null}
              {currentStep.id === "organization" ? (
                <OrganizationsStep
                  choice={form.organizationChoice}
                  organizationName={form.organizationName}
                  organizationRole={form.organizationRole}
                  onUpdateChoice={(choice) => update("organizationChoice", choice)}
                  onUpdateOrganizationName={(value) => update("organizationName", value)}
                  onUpdateOrganizationRole={(value) => update("organizationRole", value)}
                />
              ) : null}
              {currentStep.id.startsWith("usam_") ? (
                <UsamSetupApplicationStep
                  application={application}
                  fallbackLocation={locationFromForm(form)}
                  form={form}
                  onUpdate={updateApplication}
                  stepId={currentStep.id}
                  stepNumber={usamStepIndex + 1}
                />
              ) : null}
              {currentStep.id === "finish" ? <FinishStep choice={form.organizationChoice} organizationName={form.organizationName} peopleCount={requiredPeopleCount} /> : null}

              {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

              <div className="mt-6 flex gap-2">
                {step > 0 ? (
                  <button
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-5 text-sm font-bold text-[#0F172A]"
                    onClick={previousStep}
                    type="button"
                  >
                    Back
                  </button>
                ) : null}
                {!isLastStep ? (
                  <button
                    className="inline-flex min-h-12 flex-[1.6] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-5 text-sm font-bold text-white disabled:opacity-50"
                    disabled={!canContinueStep(currentStep.id)}
                    onClick={nextStep}
                    type="button"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    className="inline-flex min-h-12 flex-[1.6] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-5 text-sm font-bold text-white disabled:opacity-50"
                    disabled={isSaving || !canContinueStep(currentStep.id)}
                    type="submit"
                  >
                    {isSaving
                      ? "Finishing"
                      : form.organizationChoice === "usam"
                        ? "Submit Application"
                        : "Finish into DOS"}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function WelcomeStep() {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2563EB]">Welcome</p>
      <h1 className="mt-3 text-[42px] font-black leading-[0.92] tracking-[-0.045em] text-[#020617]">Set up DOS in minutes.</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-[#64748B]">
        Create one DOS workspace, add your first three people, then choose whether you are independent, connected to another organization, or applying to USA Missionaries.
      </p>
    </div>
  );
}

function WorkspaceStep({
  form,
  onUpdate,
}: {
  form: SetupForm;
  onUpdate: <K extends keyof SetupForm>(key: K, value: SetupForm[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <StepHeading eyebrow="Workspace" title="Create or confirm your workspace." />
      <div className="grid grid-cols-2 gap-3">
        <Input label="First name" onChange={(value) => onUpdate("firstName", value)} required value={form.firstName} />
        <Input label="Last name" onChange={(value) => onUpdate("lastName", value)} required value={form.lastName} />
      </div>
      <Input label="Email" onChange={(value) => onUpdate("email", value)} required type="email" value={form.email} />
      <Input label="Phone" onChange={(value) => onUpdate("phone", value)} type="tel" value={form.phone} />
      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3">
        <Input label="City" onChange={(value) => onUpdate("city", value)} value={form.city} />
        <Input label="State" maxLength={2} onChange={(value) => onUpdate("state", value.toUpperCase())} value={form.state} />
      </div>
      <div className="rounded-[24px] border border-[#EAF2FF] bg-white p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">Household member optional</p>
        <div className="mt-3 grid gap-3">
          <Input label="Spouse / household member" onChange={(value) => onUpdate("spouseName", value)} value={form.spouseName} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" onChange={(value) => onUpdate("spouseEmail", value)} type="email" value={form.spouseEmail} />
            <Input label="Phone" onChange={(value) => onUpdate("spousePhone", value)} type="tel" value={form.spousePhone} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PeopleStep({
  onAddPerson,
  onUpdate,
  people,
}: {
  onAddPerson: () => void;
  onUpdate: (index: number, key: keyof FirstPerson, value: string) => void;
  people: FirstPerson[];
}) {
  return (
    <div className="space-y-4">
      <StepHeading eyebrow="My 3" title="Add your first three." />
      <p className="text-sm leading-6 text-[#64748B]">
        Start with My 3. You can add more later as you grow toward My 12.
      </p>
      <div className="grid gap-3">
        {people.map((person, index) => (
          <article className="rounded-[24px] border border-[#EAF2FF] bg-white p-3" key={index}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]">Person {index + 1}</p>
            <div className="mt-3 grid gap-3">
              <Input label="Name" onChange={(value) => onUpdate(index, "name", value)} required={index < 3} value={person.name} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" onChange={(value) => onUpdate(index, "phone", value)} type="tel" value={person.phone} />
                <Input label="Email" onChange={(value) => onUpdate(index, "email", value)} type="email" value={person.email} />
              </div>
              <Input label="Address optional" onChange={(value) => onUpdate(index, "address", value)} value={person.address} />
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">Relationship</span>
                <select
                  className="min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#2563EB] focus:bg-white"
                  onChange={(event) => onUpdate(index, "relationshipType", event.target.value)}
                  value={person.relationshipType}
                >
                  <option value="">Choose one</option>
                  {relationshipTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
      <button className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-bold text-[#2563EB]" onClick={onAddPerson} type="button">
        Add Another Person
      </button>
    </div>
  );
}

function OrganizationsStep({
  choice,
  onUpdateChoice,
  onUpdateOrganizationName,
  onUpdateOrganizationRole,
  organizationName,
  organizationRole,
}: {
  choice: OrganizationChoice;
  onUpdateChoice: (choice: OrganizationChoice) => void;
  onUpdateOrganizationName: (value: string) => void;
  onUpdateOrganizationRole: (value: string) => void;
  organizationName: string;
  organizationRole: string;
}) {
  return (
    <div className="space-y-4">
      <StepHeading eyebrow="Organizations" title="Are you connected to an organization?" />
      <div className="grid gap-3">
        <ChoiceButton
          description="Start the USA Missionaries application now. Approval happens later in the Command Center."
          isSelected={choice === "usam"}
          label="I'm applying to USA Missionaries"
          onClick={() => onUpdateChoice("usam")}
        />
        <ChoiceButton
          description="Add the church or ministry you are connected to. This stays pending for now."
          isSelected={choice === "other"}
          label="I'm connected to another church or organization"
          onClick={() => onUpdateChoice("other")}
        />
        <ChoiceButton
          description="Use DOS as your personal discipleship workspace. You can apply later from Organizations."
          isSelected={choice === "independent"}
          label="I'm using DOS independently for now"
          onClick={() => onUpdateChoice("independent")}
        />
      </div>
      {choice === "other" ? (
        <div className="grid gap-3 rounded-[24px] border border-[#EAF2FF] bg-white p-3">
          <Input label="Church or organization name" onChange={onUpdateOrganizationName} placeholder="Church or organization name" required value={organizationName} />
          <Input label="Your role" onChange={onUpdateOrganizationRole} placeholder="Volunteer, pastor, leader..." value={organizationRole} />
        </div>
      ) : null}
    </div>
  );
}

function UsamSetupApplicationStep({
  application,
  fallbackLocation,
  form,
  onUpdate,
  stepId,
  stepNumber,
}: {
  application: UsamSetupApplication;
  fallbackLocation: string;
  form: SetupForm;
  onUpdate: <K extends keyof UsamSetupApplication>(key: K, value: UsamSetupApplication[K]) => void;
  stepId: SetupStepId;
  stepNumber: number;
}) {
  const stepLabel = `Question ${stepNumber} of ${usamApplicationSteps.length}`;

  switch (stepId) {
    case "usam_calling":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="Tell us briefly why you feel called to USA Missionaries.">
          <TextArea autoFocus label="Calling" onChange={(value) => onUpdate("callingReason", value)} placeholder="A few sentences is enough." required value={application.callingReason} />
        </ApplicationQuestion>
      );
    case "usam_story":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="Share your story or testimony.">
          <TextArea label="Story / testimony" onChange={(value) => onUpdate("storyTestimony", value)} placeholder="What has the Lord done in your life?" required rows={7} value={application.storyTestimony} />
        </ApplicationQuestion>
      );
    case "usam_focus":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="Who do you feel called to reach or disciple?">
          <TextArea label="Ministry focus" onChange={(value) => onUpdate("ministryFocus", value)} placeholder="People, places, communities, or relationships you feel called to serve." required value={application.ministryFocus} />
        </ApplicationQuestion>
      );
    case "usam_location":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="Where are you based?">
          <Input label="Location" onChange={(value) => onUpdate("location", value)} placeholder={fallbackLocation || "City, State"} required value={application.location || fallbackLocation} />
        </ApplicationQuestion>
      );
    case "usam_photo":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="Add a profile photo.">
          <Input label="Profile photo URL" onChange={(value) => onUpdate("profilePhotoUrl", value)} placeholder="https://..." type="url" value={application.profilePhotoUrl} />
          <p className="mt-3 text-sm leading-6 text-[#64748B]">Upload can come later. A URL is enough for this draft.</p>
        </ApplicationQuestion>
      );
    case "usam_budget":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="What is your monthly support goal?">
          <Input inputMode="decimal" label="Monthly support goal" onChange={(value) => onUpdate("monthlyBudget", value)} placeholder="Monthly amount" required value={application.monthlyBudget} />
        </ApplicationQuestion>
      );
    case "usam_prayer":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="How can people be praying for you?">
          <TextArea label="Prayer needs" onChange={(value) => onUpdate("prayerNeeds", value)} placeholder="Share a few current prayer needs." required value={application.prayerNeeds} />
        </ApplicationQuestion>
      );
    case "usam_references":
      return (
        <ApplicationQuestion eyebrow={stepLabel} title="Add optional references or a pastor/church contact.">
          <TextArea label="References" onChange={(value) => onUpdate("referencesText", value)} placeholder="Names, emails, churches, or notes." value={application.referencesText} />
        </ApplicationQuestion>
      );
    case "usam_review":
      return (
        <ApplicationQuestion eyebrow="Review and submit" title="Submit your USA Missionaries application.">
          <div className="grid gap-2">
            <SummaryRow label="Applicant" value={personName(form)} />
            <SummaryRow label="Email" value={form.email} />
            <SummaryRow label="Location" value={application.location || fallbackLocation || "Not provided"} />
            <SummaryRow label="Monthly goal" value={application.monthlyBudget ? `$${application.monthlyBudget}` : "Not provided"} />
            <SummaryRow label="Status after submit" value="Pending review" />
          </div>
          <p className="mt-4 rounded-[20px] border border-[#DCEBFF] bg-white px-3 py-3 text-sm leading-6 text-[#64748B]">
            Submitting creates a draft USA Missionaries Profile for admin review. It does not make the profile public and it does not activate USA Missionaries membership.
          </p>
        </ApplicationQuestion>
      );
    default:
      return null;
  }
}

function FinishStep({ choice, organizationName, peopleCount }: { choice: OrganizationChoice; organizationName: string; peopleCount: number }) {
  const organizationPath = choice === "other"
    ? organizationName || "Other organization"
    : "Independent";

  return (
    <div>
      <StepHeading eyebrow="Finish" title="Ready to open DOS." />
      <div className="mt-4 grid gap-2">
        <SummaryRow label="People added" value={String(peopleCount)} />
        <SummaryRow label="Organization path" value={organizationPath} />
        <SummaryRow label="Next" value="Open Home, Table, and More" />
      </div>
    </div>
  );
}

function StepHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2563EB]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-[#020617]">{title}</h1>
    </div>
  );
}

function ApplicationQuestion({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <div>
      <StepHeading eyebrow={eyebrow} title={title} />
      <div className="mt-5 rounded-[26px] border border-[#EAF2FF] bg-white p-4">
        {children}
      </div>
    </div>
  );
}

function ChoiceButton({
  description,
  isSelected,
  label,
  onClick,
}: {
  description: string;
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-[24px] border p-4 text-left transition ${
        isSelected ? "border-[#2563EB] bg-[#EBF2FF]" : "border-[#EAF2FF] bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="block text-base font-black text-[#0F172A]">{label}</span>
      <span className="mt-1 block text-sm leading-6 text-[#64748B]">{description}</span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
      <span className="text-xs font-semibold text-[#64748B]">{label}</span>
      <span className="text-right text-xs font-bold text-[#0F172A]">{value}</span>
    </div>
  );
}

function Input({
  autoFocus = false,
  inputMode,
  label,
  maxLength,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  autoFocus?: boolean;
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">{label}</span>
      <input
        autoFocus={autoFocus}
        className="min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white"
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  autoFocus = false,
  label,
  onChange,
  placeholder,
  required = false,
  rows = 5,
  value,
}: {
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">{label}</span>
      <textarea
        autoFocus={autoFocus}
        className="w-full resize-none rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold leading-6 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
        value={value}
      />
    </label>
  );
}
