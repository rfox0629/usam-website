import Image from "next/image";
import { resolveVisionImage } from "@/src/lib/vision-media";

const font = { rajdhani: "'Rajdhani', sans-serif" };

const ASPECT_CLASSES = {
  portrait: "aspect-[3/4]",
  square: "aspect-square",
  wide: "aspect-[16/9]",
} as const;

type VisionMediaProps = {
  alt: string;
  aspect?: keyof typeof ASPECT_CLASSES;
  className?: string;
  id: string;
  kind?: "photo" | "screenshot";
  subject: string;
};

/**
 * Renders a real asset if one has been dropped in public/images/vision/<id>.*,
 * otherwise renders a designed placeholder naming the exact subject and file path
 * still needed, so this component never has to change once photos arrive.
 */
export function VisionMedia({
  alt,
  aspect = "wide",
  className = "",
  id,
  kind = "photo",
  subject,
}: VisionMediaProps) {
  const src = resolveVisionImage(id);
  const aspectClass = ASPECT_CLASSES[aspect];

  if (src) {
    return (
      <div className={`relative overflow-hidden border border-stone-800 ${aspectClass} ${className}`}>
        <Image alt={alt} className="object-cover" fill sizes="(min-width: 1024px) 640px, 100vw" src={src} />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden border border-dashed border-stone-700 bg-[radial-gradient(circle_at_30%_20%,rgba(194,161,78,0.12),transparent_55%)] p-6 ${aspectClass} ${className}`}
    >
      <div className="flex items-center gap-2 text-usam-gold">
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          {kind === "photo" ? (
            <>
              <rect height="14" rx="1.5" width="18" x="3" y="5" />
              <circle cx="8.5" cy="10.5" r="1.75" />
              <path d="m4 17 4.5-4.5c.6-.6 1.4-.6 2 0L14 16l1.5-1.5c.6-.6 1.4-.6 2 0L21 17" />
            </>
          ) : (
            <>
              <rect height="16" rx="1.5" width="20" x="2" y="4" />
              <path d="M2 9h20" />
              <circle cx="6" cy="6.5" r=".6" fill="currentColor" stroke="none" />
              <circle cx="8.5" cy="6.5" r=".6" fill="currentColor" stroke="none" />
            </>
          )}
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ fontFamily: font.rajdhani }}>
          {kind === "photo" ? "Photo Needed" : "Screenshot Needed"}
        </span>
      </div>

      <div>
        <p className="text-sm font-medium leading-snug text-stone-300">{subject}</p>
        <p
          className="mt-2 truncate text-[10px] uppercase tracking-[0.1em] text-stone-600"
          style={{ fontFamily: font.rajdhani }}
          title={`public/images/vision/${id}.jpg`}
        >
          public/images/vision/{id}.jpg
        </p>
      </div>
    </div>
  );
}
