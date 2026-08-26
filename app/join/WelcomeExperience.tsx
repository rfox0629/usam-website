"use client";

import type { CSSProperties } from "react";

import { ecosystemEntries } from "./ecosystem";
import { productMarks } from "./ProductMarks";
import { WatershedMap } from "./WatershedMap";

/**
 * USA-191: the opening.
 *
 * Built to the approved reference. A wordmark and a label sit on the top line
 * and nothing else does: the app tile and the specification strip that used to
 * run above the headline are gone, because they made the first thing an
 * applicant met a set of instructions. How long it takes and that it saves as
 * you go are true and useful, but they belong further in, where somebody is
 * actually deciding whether to stop for the night.
 *
 * What is left is the sentence, the map, and the works this team is already
 * doing. The map is the argument: many streams, one river.
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
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function WelcomeExperience({ onStart, returning }: WelcomeExperienceProps) {
  return (
    <div className="join-welcome">
      {/* The landscape sits under the whole page and is masked back to almost
          nothing at the top, so it reads as depth rather than as a photograph. */}
      <div aria-hidden="true" className="join-landscape" />

      <header className="join-topline">
        <div className="join-topline-inner">
          <p className="join-wordmark">USA Missionaries</p>
          <p className="join-topline-meta">Missionary Application</p>
        </div>
      </header>

      <div className="join-hero">
        <div className="join-hero-copy">
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

          <span aria-hidden="true" className="join-rule join-lift" style={{ animationDelay: "0.5s" }} />

          <div className="join-mask" style={{ animationDelay: "0.56s" }}>
            <p className="join-hero-sub" style={{ animationDelay: "0.56s" }}>
              You are stepping toward a movement of missionaries reaching people here
              at home, and toward the work God is building through this team.
            </p>
          </div>

          <div className="join-hero-actions join-lift" style={{ animationDelay: "0.7s" }}>
            <button className="join-button join-button-primary" onClick={onStart} type="button">
              {returning ? "Continue application" : "Begin application"}
              <ArrowRight />
            </button>

            <p className="join-hero-note">
              {returning
                ? "Your answers are where you left them"
                : "A real person reads every application"}
            </p>
          </div>
        </div>

        <div className="join-hero-map">
          <WatershedMap />
        </div>
      </div>

      <section className="join-suite" aria-labelledby="join-suite-label">
        <div className="join-suite-head">
          <p id="join-suite-label">Part of something greater</p>
          <span aria-hidden="true" className="join-rule join-rule-center" />
        </div>

        <ul className="join-suite-grid">
          {ecosystemEntries.map((entry, index) => {
            const Mark = productMarks[entry.mark];

            return (
              <li
                className="join-work"
                data-open={entry.open ? "true" : undefined}
                key={entry.name}
                style={{ "--i": index } as CSSProperties}
              >
                <span className="join-work-ring">
                  <Mark />
                </span>

                <p className="join-work-name">{entry.name}</p>

                <span aria-hidden="true" className="join-rule join-rule-tiny" />

                <div className="join-work-lines">
                  {entry.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
