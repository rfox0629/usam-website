"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { remnantEmbedUrl, remnantWatchUrl, type RemnantVideo } from "@/src/lib/remnant/content";

export function RemnantVideoEmbed({ video }: { video: RemnantVideo }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#DCEBFF] bg-[#0F172A] shadow-[0_18px_48px_rgba(37,99,235,0.08)]">
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
              className="h-full w-full object-cover opacity-85 transition-opacity duration-200 group-hover:opacity-100"
              loading="lazy"
              src={video.thumbnailUrl}
            />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.15),rgba(15,23,42,0.55))]" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-[#2563EB]/85 text-white transition-transform duration-200 group-hover:scale-105">
                <Play aria-hidden="true" className="ml-1 h-5 w-5" fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#0F172A] px-3.5 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
          {isPlaying ? "Playing" : "Ready to play"}
        </p>
        <a
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#7DD3FC] hover:text-white"
          href={remnantWatchUrl(video)}
          rel="noopener noreferrer"
          target="_blank"
        >
          Watch on YouTube
          <ExternalLink aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
