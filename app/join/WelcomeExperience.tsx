"use client";

import type { CSSProperties } from "react";

import { ecosystemEntries } from "./ecosystem";
import { MovementField } from "./MovementField";

/**
 * USA-191: the opening.
 *
 * The founder direction is that receiving this application means someone is
 * stepping toward becoming part of USA Missionaries, and that opening the link
 * should feel like entering something crafted rather than opening a form. So
 * the first screen says the one thing worth saying, shows what is already
 * being built, and offers exactly one way forward.
 *
 * Everything the old start screen said about review, privacy and saving is
 * still said, but after the welcome rather than instead of it. The four
 * paragraphs of administrative preamble that used to be the first thing an
 * applicant read are now two lines and a link into the detail.
 */

type WelcomeExperienceProps = {
  onStart: () => void;
  /** Set when a resume link brought them back to an application in progress. */
  returning: boolean;
};

function ArrowRight() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 12h15m0 0-6-6m6 6-6 6"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function WelcomeExperience({ onStart, returning }: WelcomeExperienceProps) {
  return (
    <div className="join-screen join-welcome">
      <MovementField />

      <div className="join-screen-inner">
        <p className="join-welcome-mark">USA Missionaries</p>

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

        <div className="join-mask" style={{ animationDelay: "0.5s" }}>
          <p className="join-welcome-sub" style={{ animationDelay: "0.5s" }}>
            You are not filling out a form. You are stepping toward a movement of
            missionaries sent to reach people here at home, and toward the work God
            is building through this team.
          </p>
        </div>

        <p className="join-welcome-note join-lift" style={{ animationDelay: "0.66s" }}>
          {returning
            ? "Your application is exactly where you left it. Pick it back up whenever you are ready."
            : "A real person on our team reads every application. Take your time, answer honestly, and save whenever you need to stop."}
        </p>

        <div className="join-welcome-actions join-lift" style={{ animationDelay: "0.78s" }}>
          <button className="join-button join-button-primary" onClick={onStart} type="button">
            {returning ? "Continue application" : "Begin application"}
            <ArrowRight />
          </button>
        </div>

        <section className="join-ecosystem" aria-labelledby="join-ecosystem-label">
          <p className="join-ecosystem-label" id="join-ecosystem-label">
            What this team is already building
          </p>

          <ul className="join-ecosystem-list">
            {ecosystemEntries.map((entry, index) => (
              <li
                className="join-ecosystem-item"
                data-open={entry.open ? "true" : undefined}
                key={entry.name}
                style={{ "--i": index } as CSSProperties}
              >
                <span aria-hidden="true" className="join-ecosystem-node" />
                <span className="join-ecosystem-name">{entry.name}</span>
                <span className="join-ecosystem-note">{entry.note}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
