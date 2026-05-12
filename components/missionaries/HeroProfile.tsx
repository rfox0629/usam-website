import Image from "next/image";
import type { ReactNode } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
export const sharedMissionaryProfileHeroBackground = "/images/usam/default-hero-background.png";

function isExternalImage(src: string) {
  return /^https?:\/\//.test(src);
}

type HeroProfileProps = {
  name: string;
  location: string;
  description: string;
  image?: string;
  backgroundImage?: string;
  actions?: ReactNode;
  spotlight?: ReactNode;
};

export function HeroProfile({
  actions,
  backgroundImage,
  description,
  image,
  location,
  name,
  spotlight,
}: HeroProfileProps) {
  // USAM default hero background is managed globally for brand consistency.
  const heroBackgroundImage = backgroundImage ?? sharedMissionaryProfileHeroBackground;
  const hasSpotlight = Boolean(spotlight);

  return (
    <section
      className="relative overflow-hidden bg-[#050505] bg-cover bg-center bg-no-repeat px-6 pb-8 pt-20 md:pt-24 lg:min-h-[610px] lg:pb-0"
      style={{ backgroundImage: `url(${heroBackgroundImage})` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.68)_0%,rgba(0,0,0,.42)_34%,rgba(0,0,0,.12)_62%,rgba(0,0,0,0)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_48%,rgba(0,0,0,.38)_78%,#050505_100%)]" />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] [background-size:104px_104px]" />

      <div className="relative z-30 mx-auto grid max-w-6xl gap-6 md:items-center lg:min-h-[535px] lg:grid-cols-[minmax(0,0.96fr)_minmax(300px,360px)] lg:gap-8">
        <div className="max-w-[550px] py-6 md:py-10 lg:py-16">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Missionary Profile
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-[0.95] tracking-tight text-stone-100 md:mt-5 md:text-7xl" style={{ fontFamily: font.oswald }}>
            {name}
          </h1>
          <p className="mt-5 max-w-[34rem] text-base leading-8 text-stone-200 md:text-lg">
            {description}
          </p>
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {location}
          </p>
          {actions ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {actions}
            </div>
          ) : null}
        </div>

        {spotlight ? (
          <div className="relative z-40 w-full pb-2 md:max-w-[420px] lg:max-w-none lg:justify-self-end lg:pb-0">
            {spotlight}
          </div>
        ) : null}
      </div>

      {image ? (
        <div
          className={`pointer-events-none relative z-10 mx-auto mt-3 flex max-w-6xl justify-center lg:absolute lg:bottom-0 lg:top-auto lg:mt-0 lg:max-w-none ${
            hasSpotlight
              ? "lg:left-[max(23rem,calc((100vw-72rem)/2+23rem))] lg:w-[30vw] lg:justify-start xl:left-[max(25rem,calc((100vw-72rem)/2+25rem))]"
              : "lg:right-[max(-3rem,calc((100vw-72rem)/2-4rem))] lg:w-[46vw] lg:justify-end xl:right-[max(-1rem,calc((100vw-72rem)/2-3rem))]"
          }`}
        >
          <div
            className={`relative w-full ${
              hasSpotlight
                ? "h-[180px] max-w-[360px] md:h-[260px] md:max-w-[420px] lg:h-[440px] lg:max-h-[440px] lg:max-w-[500px]"
                : "h-[280px] max-w-[500px] md:h-[470px] md:max-h-[470px] md:max-w-[600px] lg:h-[510px] lg:max-h-[510px] lg:max-w-[660px]"
            }`}
          >
            <Image
              src={image}
              alt={`${name} profile portrait`}
              fill
              priority
              unoptimized={isExternalImage(image)}
              className="object-contain object-bottom drop-shadow-[0_26px_48px_rgba(0,0,0,0.46)]"
              sizes="(min-width: 1024px) 46vw, (min-width: 768px) 48vw, 92vw"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
