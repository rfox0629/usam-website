"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PublicSelect } from "@/components/forms/PublicForm";
import type { MissionaryPrayerRequest } from "@/src/data/missionaries";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const sourceOptions = [
  { label: "Invited by this household", value: "invited_by_me" },
  { label: "Friend", value: "friend_referral" },
  { label: "Church / Ministry", value: "church_ministry" },
  { label: "Social Media", value: "social_media" },
  { label: "Other", value: "other" },
] as const;

type PrayerTeamSource = "" | typeof sourceOptions[number]["value"];

type PrayerTeamSignupResponse = {
  applicationStatus?: string;
  error?: string;
};

type JoinPrayerTeamModalProps = {
  buttonClassName?: string;
  buttonLabel?: string;
  householdId: string;
  householdName: string;
  householdNumber?: string | null;
  initialPrayerRequests?: readonly MissionaryPrayerRequest[];
  profileSlug: string;
  variant?: "gold" | "outline" | "compact";
};

function compactPrimaryButtonClassName() {
  return "inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-transparent bg-[#C2A14E] px-3 py-2.5 text-center text-[10px] uppercase leading-5 tracking-[0.18em] text-black transition-all duration-300 hover:bg-[#C2A14E]";
}

function compactTertiaryButtonClassName() {
  return "inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-white/[0.14] bg-white/[0.03] px-3 py-2 text-center text-[9px] uppercase leading-5 tracking-[0.17em] text-stone-300 transition-all duration-300 hover:border-[#C2A14E]/50 hover:text-[#C2A14E]";
}

function buttonClassName(variant: JoinPrayerTeamModalProps["variant"] = "gold", customClassName?: string) {
  if (customClassName) {
    return customClassName;
  }

  if (variant === "compact") {
    return compactPrimaryButtonClassName();
  }

  if (variant === "outline") {
    return "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#C2A14E]/55 bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.24em] text-[#C2A14E] transition-all duration-300 hover:border-[#C2A14E] hover:bg-[#C2A14E]/10 sm:w-auto sm:min-w-[220px]";
  }

  return "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-transparent bg-[#C2A14E] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.24em] text-black transition-all duration-300 hover:bg-[#C2A14E] hover:shadow-[0_0_22px_rgba(194,161,78,0.24)] sm:w-auto sm:min-w-[220px]";
}

function formatPrayerDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function PrayerRequestList({ requests }: { requests: readonly MissionaryPrayerRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-stone-800 bg-black/25 p-4 text-sm leading-6 text-stone-300">
        Current prayer requests have not been posted yet. You are still on the team, and updates can be sent as they are added.
      </div>
    );
  }

  return (
    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
      {requests.map((request, index) => (
        <article key={request.id} className="rounded-xl border border-stone-800 bg-black/25 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#C2A14E]/35 bg-[#C2A14E]/10 text-xs font-bold text-[#C2A14E]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {formatPrayerDate(request.date)}
                </p>
                {request.category ? (
                  <span className="border border-stone-700 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {request.category}
                  </span>
                ) : null}
              </div>
              <h4 className="mt-2 text-lg font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                {request.title}
              </h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-300">
                {request.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PrayerRequestDetailDialog({
  onClose,
  request,
}: {
  onClose: () => void;
  request: MissionaryPrayerRequest;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
      <article className="w-full max-w-xl rounded-2xl border border-stone-700 bg-[#0D0D0D] p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {formatPrayerDate(request.date)}
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              {request.title}
            </h3>
          </div>
          <button
            aria-label="Close prayer request"
            className="rounded-full border border-stone-700 px-3 py-2 text-xs uppercase tracking-[0.16em] text-stone-300 hover:border-[#C2A14E] hover:text-[#C2A14E]"
            onClick={onClose}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Close
          </button>
        </div>
        {request.category ? (
          <p className="mt-4 inline-flex rounded-full border border-stone-700 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {request.category}
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-stone-300">
          {request.description}
        </p>
      </article>
    </div>
  );
}

export function PrayerRequestPreviewList({
  requests,
}: {
  requests: readonly MissionaryPrayerRequest[];
}) {
  const [selectedRequest, setSelectedRequest] = useState<MissionaryPrayerRequest | null>(null);

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs leading-5 text-stone-400">
        Prayer requests will appear here as they are shared.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {requests.map((request, index) => (
          <button
            className="group flex w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition-colors hover:border-[#C2A14E]/45 hover:bg-[#C2A14E]/10"
            key={request.id}
            onClick={() => setSelectedRequest(request)}
            type="button"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#C2A14E]/35 bg-[#C2A14E]/10 text-xs font-bold text-[#C2A14E]">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                {formatPrayerDate(request.date)}
              </span>
              <span className="mt-1 block text-sm font-bold leading-5 text-stone-100">
                {request.title}
              </span>
              <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-400">
                {request.description}
              </span>
            </span>
          </button>
        ))}
      </div>

      {selectedRequest ? (
        <PrayerRequestDetailDialog
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
        />
      ) : null}
    </>
  );
}

export function PrayerRequestsModalButton({
  buttonLabel = "View All Prayer Requests",
  requests,
}: {
  buttonLabel?: string;
  requests: readonly MissionaryPrayerRequest[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={compactTertiaryButtonClassName()}
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl border border-stone-700 bg-[#0D0D0D] p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Prayer Requests
                </p>
                <h3 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                  Current Requests
                </h3>
              </div>
              <button
                aria-label="Close prayer requests"
                className="rounded-full border border-stone-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-stone-300 hover:border-[#C2A14E] hover:text-[#C2A14E]"
                onClick={() => setIsOpen(false)}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="mt-5">
              <PrayerRequestList requests={requests} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function JoinPrayerTeamModal({
  buttonClassName: customButtonClassName,
  buttonLabel = "Become a Prayer Partner",
  householdId,
  householdName,
  householdNumber,
  profileSlug,
  variant = "gold",
}: JoinPrayerTeamModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("Thank you for partnering with us in prayer! We'll review your request and begin sending updates once you're approved.");
  const [formValues, setFormValues] = useState<{
    email: string;
    emailOptIn: boolean;
    firstName: string;
    lastName: string;
    phone: string;
    source: PrayerTeamSource;
    smsOptIn: boolean;
    state: string;
  }>({
    email: "",
    emailOptIn: true,
    firstName: "",
    lastName: "",
    phone: "",
    source: "",
    smsOptIn: false,
    state: "",
  });
  const hasPhone = formValues.phone.trim().length > 0;
  const sourceLabel = useMemo(
    () => sourceOptions.find((option) => option.value === formValues.source)?.label ?? "Joined from Public Profile",
    [formValues.source],
  );

  function closeModal() {
    if (status === "submitting") {
      return;
    }

    setIsOpen(false);
    setError("");
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    const response = await fetch("/api/prayer-team/join", {
      body: JSON.stringify({
        email: formValues.email,
        emailOptIn: formValues.emailOptIn,
        firstName: formValues.firstName,
        householdId,
        householdName,
        householdNumber,
        howDidYouHear: formValues.source,
        lastName: formValues.lastName,
        name: [formValues.firstName, formValues.lastName].filter(Boolean).join(" ").trim(),
        phone: formValues.phone,
        profileSlug,
        recruitmentSource: formValues.source,
        smsOptIn: hasPhone && formValues.smsOptIn,
        source: formValues.source,
        sourceLabel,
        state: formValues.state,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as PrayerTeamSignupResponse;

    if (!response.ok) {
      setError(result.error ?? "Unable to join the prayer team right now.");
      setStatus("error");
      return;
    }

    setSuccessMessage(result.applicationStatus === "already_received"
      ? "Your prayer partner request is already in review."
      : "Thank you for partnering with us in prayer! We'll review your request and begin sending updates once you're approved.");
    setStatus("success");
  }

  return (
    <>
      <button
        className={buttonClassName(variant, customButtonClassName)}
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-stone-700 bg-[#0D0D0D] p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Prayer Team
                </p>
                <h3 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                  {status === "success" ? "Request Received" : "Become a Prayer Partner"}
                </h3>
              </div>
              <button
                aria-label="Close prayer team signup"
                className="rounded-full border border-stone-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-stone-300 hover:border-[#C2A14E] hover:text-[#C2A14E]"
                onClick={closeModal}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                Close
              </button>
            </div>

            {status === "success" ? (
              <div className="mt-6">
                <p className="text-sm leading-7 text-stone-300">
                  {successMessage}
                </p>
                <button
                  className={`${buttonClassName("outline")} mt-5`}
                  onClick={closeModal}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  Done
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submitForm}>
                <p className="text-sm leading-7 text-stone-300">
                  Stand with our family in prayer as we make disciples across America. Prayer Partners receive ministry updates, prayer requests, and answered prayers.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      First Name
                      <span className="ml-1 text-[#C2A14E]">*</span>
                    </span>
                    <input
                      autoComplete="given-name"
                      className="mt-2 min-h-11 w-full border border-stone-800 bg-[#0D0D0D] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#C2A14E]"
                      onChange={(event) => setFormValues((current) => ({ ...current, firstName: event.target.value }))}
                      required
                      value={formValues.firstName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Last Name
                      <span className="ml-1 text-[#C2A14E]">*</span>
                    </span>
                    <input
                      autoComplete="family-name"
                      className="mt-2 min-h-11 w-full border border-stone-800 bg-[#0D0D0D] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#C2A14E]"
                      onChange={(event) => setFormValues((current) => ({ ...current, lastName: event.target.value }))}
                      required
                      value={formValues.lastName}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Email
                    <span className="ml-1 text-[#C2A14E]">*</span>
                  </span>
                  <input
                    autoComplete="email"
                    className="mt-2 min-h-11 w-full border border-stone-800 bg-[#0D0D0D] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#C2A14E]"
                    onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                    required
                    type="email"
                    value={formValues.email}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Phone Number
                    </span>
                    <input
                      autoComplete="tel"
                      className="mt-2 min-h-11 w-full border border-stone-800 bg-[#0D0D0D] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#C2A14E]"
                      inputMode="tel"
                      onChange={(event) => {
                        const nextPhone = event.target.value;

                        setFormValues((current) => ({
                          ...current,
                          phone: nextPhone,
                          smsOptIn: nextPhone.trim() ? current.smsOptIn : false,
                        }));
                      }}
                      placeholder="Optional"
                      type="tel"
                      value={formValues.phone}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      State
                    </span>
                    <input
                      autoComplete="address-level1"
                      className="mt-2 min-h-11 w-full border border-stone-800 bg-[#0D0D0D] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#C2A14E]"
                      placeholder="Optional"
                      onChange={(event) => setFormValues((current) => ({ ...current, state: event.target.value }))}
                      value={formValues.state}
                    />
                  </label>
                </div>
                <PublicSelect
                  label="How did you hear about us?"
                  name="source"
                  onChange={(value) => setFormValues((current) => ({ ...current, source: value as typeof sourceOptions[number]["value"] }))}
                  tone="dark"
                  value={formValues.source}
                >
                  <option disabled value="">Select one</option>
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </PublicSelect>
                <section className="rounded-2xl border border-stone-800 bg-white/[0.03] p-4">
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Stay Connected
                  </h4>
                  <div className="mt-3 grid gap-2">
                    <label className="flex min-h-11 items-start gap-3 rounded-xl border border-stone-800 bg-black/20 px-3 py-2.5 text-sm leading-6 text-stone-300 transition-colors hover:border-[#C2A14E]/55">
                      <input
                        checked={formValues.emailOptIn}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E]"
                        onChange={(event) => setFormValues((current) => ({ ...current, emailOptIn: event.target.checked }))}
                        type="checkbox"
                      />
                      <span>Email me prayer updates and ministry news.</span>
                    </label>
                    <label className={`flex min-h-11 items-start gap-3 rounded-xl border px-3 py-2.5 text-sm leading-6 transition-colors ${
                      hasPhone
                        ? "border-stone-800 bg-black/20 text-stone-300 hover:border-[#C2A14E]/55"
                        : "cursor-not-allowed border-stone-800/60 bg-black/10 text-stone-600"
                    }`}>
                      <input
                        checked={hasPhone && formValues.smsOptIn}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E] disabled:cursor-not-allowed"
                        disabled={!hasPhone}
                        onChange={(event) => setFormValues((current) => ({ ...current, smsOptIn: event.target.checked }))}
                        type="checkbox"
                      />
                      <span>Text me important prayer updates.</span>
                    </label>
                  </div>
                </section>
                {error ? (
                  <p className="border border-red-500/30 bg-red-950/20 p-3 text-sm leading-6 text-red-100">
                    {error}
                  </p>
                ) : null}
                <button
                  className={buttonClassName("gold")}
                  disabled={status === "submitting"}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="submit"
                >
                  {status === "submitting" ? "Submitting" : "Become a Prayer Partner"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
