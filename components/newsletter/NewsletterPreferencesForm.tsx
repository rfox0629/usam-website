"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { newsletterFrequencyOptions, newsletterPreferenceTopics } from "@/src/data/newsletter-fixtures";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type SaveStatus = "error" | "idle" | "saved" | "saving";

/**
 * Presentation-only preference form (USA-46). `onSave` is a stub for USA-47
 * to replace with a real call once the token/subscriber model from USA-45
 * lands — this component never talks to an API on its own.
 */
async function defaultSaveStub(_topics: readonly string[], _frequency: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
}

export function NewsletterPreferencesForm({
  onSave = defaultSaveStub,
  subscriberEmail,
}: {
  onSave?: (topics: readonly string[], frequency: string) => Promise<void>;
  subscriberEmail: string;
}) {
  const [selectedTopics, setSelectedTopics] = useState<readonly string[]>(
    newsletterPreferenceTopics.filter((topic) => topic.defaultChecked).map((topic) => topic.id),
  );
  const [frequency, setFrequency] = useState(newsletterFrequencyOptions[1]?.id ?? "monthly");
  const [status, setStatus] = useState<SaveStatus>("idle");

  function toggleTopic(topicId: string) {
    setStatus("idle");
    setSelectedTopics((current) =>
      current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    try {
      await onSave(selectedTopics, frequency);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Managing preferences for</p>
      <p className="mt-1 text-lg font-semibold text-stone-100">{subscriberEmail}</p>

      <fieldset className="mt-8">
        <legend className="text-xs font-bold uppercase tracking-[0.16em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
          What would you like to hear about?
        </legend>
        <div className="mt-3 grid gap-3">
          {newsletterPreferenceTopics.map((topic) => {
            const checked = selectedTopics.includes(topic.id);

            return (
              <label
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  checked ? "border-usam-gold/60 bg-usam-gold/[0.06]" : "border-stone-800 bg-white/[0.02]"
                }`}
                key={topic.id}
              >
                <input
                  checked={checked}
                  className="mt-1 h-4 w-4 shrink-0 accent-usam-gold"
                  onChange={() => toggleTopic(topic.id)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-stone-100">{topic.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-stone-500">{topic.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-xs font-bold uppercase tracking-[0.16em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
          How often?
        </legend>
        <div className="mt-3 grid gap-3">
          {newsletterFrequencyOptions.map((option) => (
            <label
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                frequency === option.id ? "border-usam-gold/60 bg-usam-gold/[0.06]" : "border-stone-800 bg-white/[0.02]"
              }`}
              key={option.id}
            >
              <input
                checked={frequency === option.id}
                className="mt-1 h-4 w-4 shrink-0 accent-usam-gold"
                name="frequency"
                onChange={() => {
                  setStatus("idle");
                  setFrequency(option.id);
                }}
                type="radio"
              />
              <span>
                <span className="block text-sm font-semibold text-stone-100">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-stone-500">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-usam-gold bg-usam-gold px-7 text-xs uppercase leading-5 tracking-[0.2em] text-usam-black shadow-sm transition-all duration-300 hover:bg-usam-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "saving" || selectedTopics.length === 0}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="submit"
        >
          {status === "saving" ? "Saving…" : "Save Preferences"}
        </button>

        {status === "saved" ? (
          <span className="text-sm font-semibold text-usam-success" role="status">Preferences saved.</span>
        ) : null}
        {status === "error" ? (
          <span className="text-sm font-semibold text-red-400" role="alert">Couldn't save — please try again.</span>
        ) : null}
        {selectedTopics.length === 0 ? (
          <span className="text-sm text-stone-500">
            Choose at least one topic, or <a className="underline decoration-stone-600 hover:text-usam-gold" href="/newsletter/unsubscribe">unsubscribe from everything</a>.
          </span>
        ) : null}
      </div>
    </form>
  );
}
