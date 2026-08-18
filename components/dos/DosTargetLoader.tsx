import { DosCircleTarget } from "@/components/dos/DosCircleTarget";

/**
 * The DOS loading screen: the same 3 / 12 / 70 / 120 target as the home screen,
 * starting small and growing toward full size, then holding there.
 *
 * The growth is a short staged CSS progression rather than a percentage. A
 * Suspense fallback has no progress signal to read, so the stages are deliberately
 * coarse and settle at full size (`forwards`) instead of looping, which would
 * imply the app had restarted. Once settled, the centre ring keeps a slow pulse so
 * a long wait still reads as active.
 *
 * Everything is CSS, so the fallback ships no JavaScript. Under
 * `prefers-reduced-motion` the target simply appears at full size.
 */
const loaderStyles = `
  /* Matches the DOS app root shell exactly (white on mobile, #F8FBFF from md up)
     so handing off to the loaded app does not flash a different background. */
  .dos-target-loader {
    align-items: center;
    background: #FFFFFF;
    display: flex;
    justify-content: center;
    min-height: 100dvh;
    padding: 24px;
    width: 100%;
  }

  @media (min-width: 768px) {
    .dos-target-loader {
      background: #F8FBFF;
    }
  }

  .dos-target-loader__target {
    animation: dos-target-grow 2.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
    transform-origin: center;
    will-change: transform, opacity;
  }

  .dos-target-loader__pulse {
    animation: dos-target-settle 2.6s ease-in-out 2.4s infinite;
    transform-origin: center;
  }

  @keyframes dos-target-grow {
    0% {
      opacity: 0;
      transform: scale(0.38);
    }
    22% {
      opacity: 1;
      transform: scale(0.54);
    }
    55% {
      transform: scale(0.78);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes dos-target-settle {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.012);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dos-target-loader__target,
    .dos-target-loader__pulse {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
`;

export function DosTargetLoader() {
  return (
    <main aria-busy="true" className="dos-target-loader">
      <style dangerouslySetInnerHTML={{ __html: loaderStyles }} />
      <div className="dos-target-loader__target">
        <div className="dos-target-loader__pulse">
          <DosCircleTarget counts={{ my3: 0, my12: 0, my70: 0, my120: 0 }} />
        </div>
      </div>
      <span aria-live="polite" className="sr-only">
        Opening DOS
      </span>
    </main>
  );
}
