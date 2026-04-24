"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif", oswald: "'Oswald', sans-serif" };

export function WaitingListCTA() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    organization: "",
    message: "",
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");

    const formData = new FormData();
    formData.append("_subject", "New USAM System Waiting List Signup");
    formData.append("name", formValues.name);
    formData.append("email", formValues.email);
    formData.append("organization", formValues.organization);
    formData.append("message", formValues.message);

    try {
      const response = await fetch("https://formspree.io/f/mojyreor", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setFormValues({
        name: "",
        email: "",
        organization: "",
        message: "",
      });
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-9">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setIsOpen((current) => !current);
            setStatus("idle");
          }}
          className="inline-flex min-h-12 items-center justify-center border border-amber-400 bg-amber-400 px-7 py-3 text-xs uppercase tracking-[0.26em] text-stone-950 transition-all duration-300 hover:border-amber-300 hover:bg-amber-300"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Join The Waiting List
        </button>
        <Link
          href="/system/preview"
          className="inline-flex min-h-12 items-center justify-center border border-stone-600 bg-transparent px-7 py-3 text-xs uppercase tracking-[0.26em] text-stone-100 transition-all duration-300 hover:border-stone-300 hover:bg-white/[0.04]"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Sneak Peek
        </Link>
      </div>

      <p className="mt-4 max-w-md text-xs leading-6 text-stone-600">
        Dashboard access is restricted to active operators and leadership.
      </p>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
          onMouseDown={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="relative max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto border border-stone-700/70 bg-[#070707] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.75)] md:p-8"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-waitlist-title"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:40px_40px]" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center border border-stone-700 text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-100"
                aria-label="Close waiting list modal"
              >
                ×
              </button>

              <div className="border-b border-stone-800 pb-6 pr-12">
                <p className="text-[10px] uppercase tracking-[0.32em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
                  Early Access
                </p>
                <h2
                  id="system-waitlist-title"
                  className="mt-4 text-4xl uppercase leading-none text-stone-100 md:text-5xl"
                  style={{ fontFamily: font.oswald }}
                >
                  Join the Waiting List
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-stone-400 md:text-base">
                  Be among the first to see the discipleship system being built for tables, teams, and cities.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <input type="hidden" name="_subject" value="New USAM System Waiting List Signup" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="system-waitlist-name"
                      className="text-[11px] uppercase tracking-[0.22em] text-stone-300"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      Name
                    </label>
                    <input
                      id="system-waitlist-name"
                      type="text"
                      name="name"
                      value={formValues.name}
                      onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Name optional"
                      className="mt-2 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-500/70"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="system-waitlist-email"
                      className="text-[11px] uppercase tracking-[0.22em] text-stone-300"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      Email
                    </label>
                    <input
                      id="system-waitlist-email"
                      type="email"
                      name="email"
                      required
                      value={formValues.email}
                      onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Email"
                      className="mt-2 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="system-waitlist-organization"
                    className="text-[11px] uppercase tracking-[0.22em] text-stone-300"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    Role or organization
                  </label>
                  <input
                    id="system-waitlist-organization"
                    type="text"
                    name="organization"
                    value={formValues.organization}
                    onChange={(event) => setFormValues((current) => ({ ...current, organization: event.target.value }))}
                    placeholder="Pastor, leader, church, school, or organization"
                    className="mt-2 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-500/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="system-waitlist-message"
                    className="text-[11px] uppercase tracking-[0.22em] text-stone-300"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    Message
                  </label>
                  <textarea
                    id="system-waitlist-message"
                    name="message"
                    rows={5}
                    value={formValues.message}
                    onChange={(event) => setFormValues((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Tell us where you hope to use this system."
                    className="mt-2 w-full resize-none border border-stone-700 bg-[#050505] px-4 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-500/70"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center bg-amber-400 px-6 py-3 text-xs uppercase tracking-[0.22em] text-stone-950 transition-all duration-300 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  >
                    {isSubmitting ? "Joining..." : "Join Waiting List"}
                  </button>

                  {status === "success" && (
                    <p className="text-sm leading-6 text-stone-300">
                      You’re on the list. We’ll keep you updated as the system comes online.
                    </p>
                  )}

                  {status === "error" && (
                    <p className="text-sm leading-6 text-amber-500/80">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
