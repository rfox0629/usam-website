"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import "./join-experience.css";

/**
 * USA-167: the access screen shown while JOIN_PREVIEW_ACCESS_KEY is set.
 *
 * Deliberately says nothing about DOS, and nothing about who has been invited.
 * It is the first thing an unauthorized visitor sees at a URL that will later
 * be public, so it stays plain.
 *
 * USA-191 gave it the same foundation and field as the application behind it,
 * because it is also the first screen the founder passes through on the way to
 * a review. What it says is unchanged.
 */
export function JoinPreviewGate({ configured = true }: { configured?: boolean }) {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = accessCode.trim();

    if (!trimmed) {
      setError("Please enter your access code.");

      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/join-preview-access", {
        body: JSON.stringify({ accessCode: trimmed }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "That access code was not recognized.");
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "That access code was not recognized.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="join">
      <div className="join-screen join-screen-gate">
        <div aria-hidden="true" className="join-landscape" />

        <div className="join-screen-inner">
          <div className="join-gate">
            <div className="join-mask">
              <p className="join-eyebrow">USA Missionaries</p>
            </div>

            <h1>
              <span className="join-mask">
                <span>This application</span>
              </span>
              <span className="join-mask">
                <span>is in review.</span>
              </span>
            </h1>

            <p className="join-gate-sub join-lift" style={{ animationDelay: "0.4s" }}>
              The USA Missionaries application is not open to the public yet. If you were given an access code, enter it
              below.
            </p>

            {configured ? null : (
              <p className="join-error" style={{ marginTop: 20 }}>
                This preview has no access key configured, so the application is closed. Set JOIN_PREVIEW_ACCESS_KEY on
                the deployment to open it for review.
              </p>
            )}

            <form className="join-gate-form join-lift" onSubmit={handleSubmit} style={{ animationDelay: "0.52s" }}>
              <div>
                <label className="join-eyebrow join-eyebrow-quiet" htmlFor="join-access-code">
                  Access code
                </label>
                <input
                  autoComplete="off"
                  className="join-input"
                  id="join-access-code"
                  onChange={(event) => setAccessCode(event.target.value)}
                  type="password"
                  value={accessCode}
                />
              </div>

              {error ? <p className="join-error">{error}</p> : null}

              <button className="join-button join-button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Checking" : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
