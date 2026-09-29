"use client";

import { useRef, useState } from "react";
import { dosWalkthroughChapters, dosWalkthroughVideo, walkthroughClock } from "@/src/lib/dos/walkthrough";

// The 2-minute walkthrough on the sign-in page, before anyone signs in. Only
// the poster loads until the play button is pressed. Demo workspace only.
export function DosSignInVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setStarted(true);
    void video.play().catch(() => undefined);
    video.focus({ preventScroll: true });
  }

  return (
    <section aria-labelledby="dsi-video-title" className="video">
      <h2 id="dsi-video-title">New to DOS? Watch the 2-minute walkthrough</h2>
      <p className="sub">Signing in, Home, People, Meetings, Prayer, and adding DOS to your phone.</p>
      <div className="frame">
        <video
          aria-describedby="dsi-video-steps"
          aria-label="Getting started with DOS, a 2-minute walkthrough with no sound"
          controls={started}
          height={1080}
          onPlay={() => setStarted(true)}
          playsInline
          poster={dosWalkthroughVideo.poster}
          preload="none"
          ref={videoRef}
          width={1920}
        >
          {dosWalkthroughVideo.sources.map((source) => (
            <source key={source.src} media={"media" in source ? source.media : undefined} src={source.src} type={source.type} />
          ))}
          <track default={false} kind="captions" label="English" src={dosWalkthroughVideo.captions} srcLang="en" />
        </video>
        {started ? null : (
          <button aria-label={`Play the ${dosWalkthroughVideo.duration} DOS walkthrough`} className="play" onClick={play} type="button">
            <span>
              <svg aria-hidden="true" height="34" viewBox="0 0 24 24" width="34"><path d="M8 5v14l11-7z" fill="#fff" /></svg>
            </span>
          </button>
        )}
      </div>
      <details>
        <summary>Read the steps ({dosWalkthroughVideo.duration}, no sound, captions available)</summary>
        <ol id="dsi-video-steps">
          {dosWalkthroughChapters.map((chapter) => (
            <li key={chapter.title}><b>{walkthroughClock(chapter.at)} {chapter.title}.</b> {chapter.detail}</li>
          ))}
        </ol>
      </details>
      <p className="note">The people shown are a made-up demo workspace.</p>
    </section>
  );
}
