"use client";

import type { CSSProperties } from "react";

import { ecosystemEntries } from "./ecosystem";
import { MovementField } from "./MovementField";
import { productMarks } from "./ProductMarks";

/**
 * USA-191: the opening.
 *
 * The founder direction is that receiving this application means someone is
 * stepping toward becoming part of USA Missionaries, and that opening the link
 * should feel like entering a built system rather than opening a form. So the
 * first screen carries a real product bar, states its own facts the way a
 * product does, says the one thing worth saying, shows the works this team has
 * already shipped, and offers exactly one way forward.
 *
 * Everything the old start screen said about review, privacy and saving is
 * still said. The four paragraphs of administrative preamble that used to be
 * the first thing an applicant read are now a spec line and a sentence.
 */

type WelcomeExperienceProps = {
  onStart: () => void;
  /** Set when a resume link brought them back to an application in progress. */
  returning: boolean;
};

/* Facts, stated flatly. A product that declares what it is reads as built. */
const specs = ["9 sections", "About 30 minutes", "Saves as you go", "Resume on any device"];

function ArrowRight() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 12h15m0 0-6-6m6 6-6 6"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function WelcomeExperience({ onStart, returning }: WelcomeExperienceProps) {
  return (
    <div className="join-screen join-welcome">
      <MovementField />

      <header className="join-topbar">
        <div className="join-topbar-inner">
          <span aria-hidden="true" className="join-badge">
            UM
          </span>
          <p className="join-topbar-name">USA Missionaries</p>
          <p className="join-topbar-meta">Missionary Application</p>
        </div>
      </header>

      <div className="join-screen-inner">
        <div className="join-spec join-lift">
          <span data-lead="true">Application</span>
          {specs.map((spec) => (
            <span key={spec}>
              <i aria-hidden="true">/</i> {spec}
            </span>
          ))}
        </div>

        <h1>
          <span className="join-mask">
            <span>Welcome</span>
          </span>
          <span className="join-mask">
            <span>to the</span>
          </span>
          <span className="join-mask">
            <span className="join-gold">team.</span>
          </span>
        </h1>

        <div className="join-mask" style={{ animationDelay: "0.46s" }}>
          <p className="join-welcome-sub" style={{ animationDelay: "0.46s" }}>
            You are not filling out a form. You are stepping toward a movement of
            missionaries sent to reach people here at home, and toward the work God
            is building through this team.
          </p>
        </div>

        <div className="join-welcome-actions join-lift" style={{ animationDelay: "0.62s" }}>
          <button className="join-button join-button-primary" onClick={onStart} type="button">
            {returning ? "Continue application" : "Begin application"}
            <ArrowRight />
          </button>

          <p className="join-welcome-note">
            {returning
              ? "Your answers are exactly where you left them"
              : "A real person reads every application"}
          </p>
        </div>

        <section className="join-suite" aria-labelledby="join-suite-label">
          <div className="join-suite-head">
            <p id="join-suite-label">What this team is already building</p>
            <p className="join-suite-count">USA Missionaries</p>
          </div>

          <ul className="join-suite-grid">
            {ecosystemEntries.map((entry, index) => {
              const Mark = productMarks[entry.mark];

              return (
                <li
                  className="join-product"
                  data-open={entry.open ? "true" : undefined}
                  key={entry.name}
                  style={{ "--i": index } as CSSProperties}
                >
                  <span
                    className="join-product-tile"
                    style={{ background: entry.accent }}
                  >
                    <Mark />
                  </span>

                  <span>
                    <span className="join-product-category">{entry.category}</span>
                    <p className="join-product-name">{entry.name}</p>
                    <p className="join-product-note">{entry.note}</p>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
