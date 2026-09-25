"use client";

import Link from "next/link";
import { useRef } from "react";

const video = {
  large: "/videos/dos/dos-walkthrough-v1-1080p.mp4",
  poster: "/videos/dos/dos-walkthrough-v1-poster.jpg",
  small: "/videos/dos/dos-walkthrough-v1-720p.mp4",
};

// Seconds into the video where each step starts.
const chapters = [
  {
    at: 4.4,
    detail: "Open DOS from your welcome email. New to DOS? Choose Email me a sign-in link and open the link on the same device. Used DOS before? Sign in the way you usually do.",
    title: "Sign in",
  },
  { at: 24, detail: "Home shows who needs you today: birthdays, meetings, and check-ins.", title: "Home" },
  {
    at: 35.7,
    detail: "People keeps everyone you're discipling. Open a person to see your last and next meeting, the Journey you're walking through, and what you've committed to.",
    title: "People",
  },
  { at: 59.7, detail: "Meetings shows what's coming up and what still needs logging. Tap Log Meeting when you're done.", title: "Meetings" },
  { at: 77.3, detail: "Prayer keeps every request you've promised to pray, with the people it belongs to, and what God has answered.", title: "Prayer" },
  {
    at: 89.4,
    detail: "DOS is a web app, so there's nothing to download. iPhone, in Safari: tap Share, then Add to Home Screen, then Add. Android, in Chrome: tap ⋮, then Install app or Add to Home screen.",
    title: "Add DOS to your phone",
  },
];

function clock(seconds: number) {
  const whole = Math.floor(seconds);

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const css = `
.dwk{--navy:#0A1622;--blue:#378ADD;--blue-hi:#6FB2F0;--blue-ink:#1E6FBF;--ink:#0E1822;--muted:#5E6B78;--line:#E6EAEE;--dline:rgba(255,255,255,.12);
  min-height:100vh;display:flex;flex-direction:column;background:#fff;color:var(--ink);font-family:'Inter',system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-wrap:break-word}
.dwk *{box-sizing:border-box}
.dwk .wrap{width:100%;max-width:1040px;margin:0 auto;padding:0 1.25rem}
@media (min-width:768px){.dwk .wrap{padding:0 2rem}}
.dwk .top{background:#000;border-bottom:1px solid var(--dline)}
.dwk .top .wrap{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.9rem;padding-bottom:.9rem}
.dwk .ident{display:flex;align-items:center;gap:.7rem;color:#fff;text-decoration:none}
.dwk .ident .word{font-family:'Oswald',sans-serif;font-weight:700;font-size:1.05rem;letter-spacing:.06em;text-transform:uppercase;line-height:1.1}
.dwk .ident .attrib{display:block;font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#8FA3B6}
@media (max-width:479px){.dwk .ident .word{font-size:.9rem}}
.dwk .hero{background:radial-gradient(70% 70% at 30% 0%,rgba(55,138,221,.2),transparent 60%),var(--navy);color:#fff;padding:2.75rem 0 3rem}
.dwk .eyebrow{font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--blue-hi);margin:0}
.dwk h1{font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2rem,5.4vw,3rem);line-height:1.06;margin:.8rem 0 0;color:#fff}
.dwk .lede{margin:.9rem 0 0;color:#C3D0DC;font-size:1.05rem;max-width:40rem}
.dwk .player{margin-top:1.75rem;border:1px solid var(--dline);background:#070D14;aspect-ratio:16/9}
.dwk video{display:block;width:100%;height:100%;background:#070D14}
.dwk .note{margin:.8rem 0 0;font-size:.9rem;color:#93A5B6}
.dwk .section{padding:2.25rem 0 3rem}
.dwk h2{font-family:'Oswald',sans-serif;font-weight:700;font-size:1.6rem;margin:0}
/* app/globals.css gives bare h2, p, and li a pale site color; this page is on white. */
.dwk .section h2,.dwk li,.dwk li button,.dwk .ct{color:var(--ink)}
.dwk ol{list-style:none;margin:1.1rem 0 0;padding:0;border:1px solid var(--line)}
.dwk li{border-bottom:1px solid var(--line)}
.dwk li:last-child{border-bottom:0}
.dwk li button{display:grid;grid-template-columns:3.2rem 1fr;gap:.9rem;width:100%;text-align:left;background:#fff;border:0;padding:1rem 1.1rem;cursor:pointer;font:inherit;color:inherit}
.dwk li button:hover{background:#F6FAFE}
.dwk li button:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
.dwk .t{font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:.08em;color:var(--blue-ink);padding-top:.1rem}
.dwk .ct{display:block;font-weight:700}
.dwk .cd{display:block;margin-top:.2rem;color:var(--muted);font-size:.95rem}
.dwk .actions{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;margin-top:1.75rem}
.dwk .btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:.85rem 1.5rem;background:var(--blue-ink);border:1px solid var(--blue-ink);color:#fff;text-decoration:none;
  font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.dwk .btn:hover{background:#255F97}
.dwk .help{color:var(--muted);font-size:.95rem;margin:0}
.dwk .foot{margin-top:auto;background:var(--navy);padding:1.25rem 0}
.dwk .foot .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem 1.5rem;font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#8FA3B6}
body:has(.dwk){background:#fff !important}
body:has(.dwk) > footer{display:none !important}
`;

export function DosWalkthroughClient() {
  const videoRef = useRef<HTMLVideoElement>(null);

  function jump(at: number) {
    const player = videoRef.current;

    if (!player) {
      return;
    }

    player.currentTime = at;
    void player.play().catch(() => undefined);
    player.focus({ preventScroll: true });
    player.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="dwk">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header className="top">
        <div className="wrap">
          <Link className="ident" href="/dos">
            <svg aria-hidden="true" fill="none" height="28" viewBox="0 0 52 52" width="28">
              <circle cx="26" cy="26" fill="#378ADD" r="4.5" />
              <circle cx="26" cy="26" fill="none" r="11" stroke="#FFFFFF" strokeWidth="3.5" />
              <path d="M40.7 36.3 A18 18 0 1 1 40.7 15.7" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3.5" />
            </svg>
            <span>
              <span className="word">Discipleship Operating System</span>
              <span className="attrib">An initiative of USA Missionaries</span>
            </span>
          </Link>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="wrap">
            <p className="eyebrow">Welcome to DOS</p>
            <h1>Getting started in two minutes</h1>
            <p className="lede">Sign in, find your way around Home, People, Meetings, and Prayer, and add DOS to your phone.</p>
            <div className="player">
              <video
                aria-describedby="dos-walkthrough-steps"
                aria-label="Getting started with DOS, a 2-minute walkthrough with no sound"
                controls
                height={1080}
                playsInline
                poster={video.poster}
                preload="none"
                ref={videoRef}
                width={1920}
              >
                <source media="(max-width: 900px)" src={video.small} type="video/mp4" />
                <source src={video.large} type="video/mp4" />
              </video>
            </div>
            <p className="note">No sound. Each step is written on screen and below. The people shown are a made-up demo workspace.</p>
          </div>
        </section>
        <section className="section">
          <div className="wrap">
            <h2 id="dos-walkthrough-steps-title">In this walkthrough</h2>
            <ol aria-labelledby="dos-walkthrough-steps-title" id="dos-walkthrough-steps">
              {chapters.map((chapter, index) => (
                <li key={chapter.title}>
                  <button aria-label={`Play step ${index + 1}, ${chapter.title}, from ${clock(chapter.at)}`} onClick={() => jump(chapter.at)} type="button">
                    <span aria-hidden="true" className="t">{clock(chapter.at)}</span>
                    <span>
                      <span className="ct">{index + 1}. {chapter.title}</span>
                      <span className="cd">{chapter.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="actions">
              <a className="btn" href="/dos">Open DOS</a>
              <p className="help">Need help? Reply to your DOS welcome email.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="foot">
        <div className="wrap">
          <span>Meet. Minister. Multiply.</span>
          <span>An initiative of USA Missionaries</span>
        </div>
      </footer>
    </div>
  );
}
