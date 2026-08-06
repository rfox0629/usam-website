"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { remnantEmbedUrl, remnantWatchUrl, type RemnantVideo } from "@/src/lib/remnant/content";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function RemnantVideoEmbed({ video }: { video: RemnantVideo }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-800/80 bg-black">
      <div className="relative aspect-video w-full">
        {isPlaying ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            src={remnantEmbedUrl(video)}
            title={video.title}
          />
        ) : (
          <button
            aria-label={`Play message: ${video.speaker}`}
            className="group absolute inset-0 h-full w-full cursor-pointer"
            onClick={() => setIsPlaying(true)}
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-95"
              loading="lazy"
              src={video.thumbnailUrl}
            />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.15),rgba(13,13,13,0.55))]" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-usam-gold/70 bg-usam-black/70 text-usam-gold transition-transform duration-200 group-hover:scale-105">
                <Play aria-hidden="true" className="ml-1 h-6 w-6" fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-stone-800/80 bg-stone-950 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
          {isPlaying ? "Playing on YouTube" : "Video ready to play"}
        </p>
        <a
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-usam-gold hover:text-usam-gold/80"
          href={remnantWatchUrl(video)}
          rel="noopener noreferrer"
          style={{ fontFamily: font.rajdhani }}
          target="_blank"
        >
          Watch on YouTube
          <ExternalLink aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
