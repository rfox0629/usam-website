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

  return (
    <section
      className="relative min-h-[620px] overflow-hidden bg-[#050505] bg-cover bg-center bg-no-repeat px-6 pb-0 pt-20 md:min-h-[640px] md:pt-24 lg:min-h-[650px]"
      style={{ backgroundImage: `url(${heroBackgroundImage})` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.68)_0%,rgba(0,0,0,.42)_34%,rgba(0,0,0,.12)_62%,rgba(0,0,0,0)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_48%,rgba(0,0,0,.38)_78%,#050505_100%)]" />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] [background-size:104px_104px]" />

      <div className="relative z-30 mx-auto grid max-w-6xl gap-8 md:min-h-[520px] md:items-center lg:min-h-[550px] lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,380px)]">
        <div className="max-w-[540px] py-10 md:py-16 lg:py-20">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Missionary Profile
          </p>
          <h1 className="mt-5 text-5xl font-bold leading-[0.95] tracking-tight text-stone-100 md:mt-6 md:text-7xl" style={{ fontFamily: font.oswald }}>
            {name}
          </h1>
          <p className="mt-7 max-w-[34rem] text-base leading-8 text-stone-200 md:mt-8 md:text-lg">
            {description}
          </p>
          <p className="mt-5 text-sm uppercase tracking-[0.16em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {location}
          </p>
          {actions}
        </div>

        {spotlight ? (
          <div className="relative z-40 pb-10 md:pb-16 lg:justify-self-end lg:pb-0">
            {spotlight}
          </div>
        ) : null}
      </div>

      {image ? (
        <div className="pointer-events-none relative z-10 mx-auto flex max-w-6xl justify-center md:absolute md:bottom-0 md:right-[-5vw] md:top-auto md:w-[48vw] md:max-w-none md:justify-end lg:right-[max(-3rem,calc((100vw-72rem)/2-4rem))] lg:w-[46vw] xl:right-[max(-1rem,calc((100vw-72rem)/2-3rem))]">
          <div className="relative h-[280px] w-full max-w-[500px] md:h-[470px] md:max-h-[470px] md:max-w-[600px] lg:h-[510px] lg:max-h-[510px] lg:max-w-[660px]">
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
