"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const ktg = {
  bg: "#160F0A",
  bgAlt: "#100A06",
  panel: "#1E140D",
  panelBorder: "rgba(230,196,180,0.14)",
  accentSoft: "#9CC7EF",
  accentDim: "rgba(55,138,221,0.5)",
};

const testimonials = [
  {
    tag: "TABLE ENCOUNTER",
    quote:
      "I have been Christian most of my life and have never experienced discipleship in this way. The Lord impressed His heart for His children upon me as we sat unrushed with no agenda other than to experience His love.",
  },
  {
    tag: "DISCIPLESHIP",
    quote:
      "Our kitchen table night exceeded anything we could have imagined. We left stirred up to seek Jesus more deeply and embrace the gifts of the Spirit. This ministry is exactly what America needs.",
  },
  {
    tag: "REAL RELATIONSHIP",
    quote:
      "Being vulnerable allowed God to work and move in our meeting. Something very much needed in the body of Christ that cannot be done on a Sunday. Very intimate.",
  },
  {
    tag: "EVERYDAY FAITH",
    quote:
      "This was a confirmation on what God is wanting to do in the homes. He is wanting to transform us from Sunday Christians to everyday Christians.",
  },
  {
    tag: "PRAYER FOR FREEDOM",
    quote:
      "We both felt the evening opened our eyes to the spiritual battle going on inside our home. After we prayed for freedom from lies of the enemy, I literally felt lighter.",
  },
  {
    tag: "ENCOURAGEMENT",
    quote:
      "What struck me most was how life-giving our time together was. Ryan and Brooke are authentic and humble servants of the Lord. Our meeting was like a spiritual checkup that was needed.",
  },
] as const;

function TestimonialSection() {
  return (
    <section
      aria-labelledby="stories-from-the-table"
      className="border-b px-6 py-24 md:px-10 md:py-32"
      style={{ background: ktg.bg, borderColor: ktg.panelBorder }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p
            className="mb-4 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: ktg.accentSoft, fontFamily: font.rajdhani }}
          >
            <span className="h-px w-8" style={{ background: ktg.accentDim }} />
            Stories From the Table
          </p>
          <h2
            id="stories-from-the-table"
            className="text-3xl font-bold leading-[1.05] tracking-tight text-stone-100 md:text-5xl"
            style={{ fontFamily: font.oswald }}
          >
            It Happens Around the Table.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-stone-400 md:text-lg">
            Ordinary people. Honest conversations. Jesus at the center. These are real words from people who have experienced a Kitchen Table Encounter firsthand.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.quote}
              className={`border p-6 md:p-7 ${index === 0 ? "md:col-span-2 lg:col-span-2" : ""}`}
              style={{ background: ktg.panel, borderColor: ktg.panelBorder }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: ktg.accentSoft, fontFamily: font.rajdhani }}
              >
                {testimonial.tag}
              </p>
              <blockquote className="mt-5 border-l-2 pl-5" style={{ borderColor: ktg.accentDim }}>
                <p className={`${index === 0 ? "text-xl md:text-2xl" : "text-[16px]"} italic leading-[1.65] text-stone-200`}>
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>
              <p
                className="mt-6 text-[10px] uppercase tracking-[0.2em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                — Kitchen Table Encounter, 2026
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KitchenTableTestimonials() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const joinSection = document.getElementById("join");
    if (!joinSection?.parentElement) return;

    const portalHost = document.createElement("div");
    portalHost.setAttribute("data-ktg-testimonials", "true");
    joinSection.parentElement.insertBefore(portalHost, joinSection);
    setHost(portalHost);

    return () => {
      portalHost.remove();
    };
  }, []);

  return host ? createPortal(<TestimonialSection />, host) : null;
}
