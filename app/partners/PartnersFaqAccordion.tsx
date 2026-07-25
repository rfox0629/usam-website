"use client";

import { useState } from "react";

const font = { oswald: "'Oswald', sans-serif" };

type FaqItem = {
  answer: string;
  question: string;
};

const faqItems: readonly FaqItem[] = [
  {
    question: "Will we lose our ministry name?",
    answer:
      "No, not unless your leadership decides that is best. At the Strategic Partner and Integrated Ministry levels, your name and public identity are entirely yours. Even in full integration, ministries commonly continue under their existing name as a DBA or division, presented as “A Ministry of USA Missionaries.” Your name carries your history, and that history is an asset to the whole system.",
  },
  {
    question: "Will our board still have a role?",
    answer:
      "Yes. In the first two partnership levels, your board remains fully in place with all of its authority. In a full integration, the legal board structure consolidates, but leaders typically continue serving through advisory councils, ministry leadership roles, or seats within the USA Missionaries governance structure. The exact shape is designed together, and reviewed by counsel, before any decision is made.",
  },
  {
    question: "What happens to our donors?",
    answer:
      "Donors are shepherded, never absorbed silently. Any transition includes a clear communication plan: donors are told what is changing, why, and how their giving continues to support the ministry they love. In shared-services arrangements, donations continue flowing to your organization as they do today. In full integration, gifts can be designated to your ministry as a fund or division so donor intent is honored.",
  },
  {
    question: "What happens to restricted funds?",
    answer:
      "Restricted funds remain legally bound to their restricted purpose regardless of structure. In any integration, restricted funds are inventoried during discovery and handled according to donor intent and applicable law. This is one of the areas where nonprofit legal counsel and a CPA are required. No restricted fund is moved or repurposed without qualified professional review.",
  },
  {
    question: "Who owns assets after integration?",
    answer:
      "It depends on the structure chosen. In shared services, each organization keeps its own assets. Nothing transfers. In a full integration, assets typically transfer to USA Missionaries and are stewarded for the continuing work of the ministry division. Every asset transfer is documented, board-approved by both organizations, and structured by nonprofit legal counsel.",
  },
  {
    question: "What happens to existing leases or liabilities?",
    answer:
      "Leases, debts, contracts, and potential liabilities are inventoried in Phase 2 (Discovery & Assessment) before any commitment is made. Some liabilities can be assumed, some are resolved before integration, and some may change the recommended structure entirely. This is precisely why the roadmap puts discovery before decision, and why counsel reviews every obligation.",
  },
  {
    question: "Can this begin as a pilot before full integration?",
    answer:
      "Yes, and in most cases it should. The Shared Services Pilot (Phase 3) exists so both ministries can prove the partnership in practice with low-risk operational support before any structural decision. A pilot is a legitimate long-term arrangement in itself, not just a waiting room for merger.",
  },
  {
    question: "What if we decide not to move forward?",
    answer:
      "Then we part as friends and continue as ministry allies. The process is designed with clear decision points where either organization can pause or step back. Shared services agreements include exit terms from the start. Discernment that leads to “no” or “not yet” is a successful outcome. The goal is God's direction, not a closed deal.",
  },
  {
    question: "How long does full integration take?",
    answer:
      "Realistically, nine to eighteen months from first conversation to a legal integration decision, with operational integration continuing beyond that. The roadmap above shows the phase-by-phase timing. The pace is set by trust, prayer, board readiness, and counsel, not by a calendar target.",
  },
  {
    question: "Who makes the final legal decision?",
    answer:
      "The boards of both organizations, acting on the advice of qualified nonprofit legal counsel and a CPA. USA Missionaries never makes a unilateral decision about another ministry's legal future. Any merger, asset transfer, dissolution, or governance change requires formal board action by each organization, documented and reviewed by professionals.",
  },
  {
    question: "What role does DOS play?",
    answer:
      "DOS, the Discipleship Operating System, is the shared technology backbone of the system. It handles referrals between ministries, follow-up workflows, discipleship tracking, prayer requests, events, testimonies, and outcome reporting. In practice, DOS is what makes a coordinated discipleship journey possible: when a missionary refers someone to Ministry of Reconciliation, DOS carries the context so no one falls through the cracks.",
  },
  {
    question: "Can this model scale to other states?",
    answer:
      "That is the design intent. Phase 6 of the roadmap uses the first integration as a documented, repeatable model: the agreements, workflows, DOS configurations, and lessons learned become the playbook for future partnerships across Minnesota and eventually all 50 states. Each new partnership should be easier, faster, and safer than the last.",
  },
  {
    question: "Is USA Missionaries trying to control other ministries?",
    answer:
      "No. Control is not the mission; coordination is. Two of the three partnership levels involve no change of control at all, and full integration happens only when a ministry's own leadership and board, with independent counsel, conclude it is the best path for their calling. The commitments in “What USA Missionaries Does Not Take Away” are the standing guardrails: we do not move faster than trust, prayer, and counsel allow.",
  },
];

export function PartnersFaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-12 border-t border-stone-800">
      {faqItems.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div className="border-b border-stone-800" key={item.question}>
            <button
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-6 text-left"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              type="button"
            >
              <span
                className="text-lg font-medium text-stone-100 sm:text-xl"
                style={{ fontFamily: font.oswald }}
              >
                {item.question}
              </span>
              <span
                aria-hidden="true"
                className={`h-3 w-3 flex-shrink-0 border-b-[1.5px] border-r-[1.5px] border-usam-gold transition-transform duration-200 ${
                  isOpen ? "translate-y-0.5 -rotate-[135deg]" : "rotate-45"
                }`}
              />
            </button>
            <div
              className="grid overflow-hidden transition-all duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="max-w-3xl pb-6 text-[15px] leading-7 text-stone-400">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
