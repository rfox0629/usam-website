import type { ReactNode } from "react";

/**
 * DISPOSABLE PROTOTYPE ROUTE (founder UX review only).
 *
 * /dos/library-preview exists to visually test a proposed
 * LIBRARY -> RESOURCE -> CONTENT navigation model. It is not production.
 * Delete this whole folder when the review is finished.
 *
 * This layout mirrors app/dos/app/layout.tsx so the prototype renders inside
 * the same mobile-first DOS shell (430px phone column, Inter, no site footer).
 */
export default function DosLibraryPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dos-library-preview-route">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.dos-library-preview-route) {
              background: #FFFFFF !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              overflow-x: hidden;
            }

            .dos-library-preview-route {
              width: 100%;
              max-width: 430px;
              margin: 0 auto;
              min-height: 100dvh;
              flex: 0 1 430px;
              background: #FFFFFF;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            .dos-library-preview-route :where(button, a, input, textarea, select) {
              font-family: inherit;
            }

            .dos-library-preview-route :where(button, a, input, textarea, select):focus {
              outline: none;
            }

            .dos-library-preview-route :where(button, a, input, textarea, select):focus-visible {
              outline: 2px solid rgba(37, 99, 235, 0.34);
              outline-offset: 2px;
            }

            body:has(.dos-library-preview-route) > footer {
              display: none !important;
            }

            body:has(.dos-library-preview-route) > div.flex-1 {
              min-height: 100dvh;
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: stretch;
              background: #FFFFFF;
            }

            @media (max-width: 430px) {
              .dos-library-preview-route {
                max-width: 100%;
                flex-basis: 100%;
              }
            }

            body:has(.dos-library-preview-route) nextjs-portal {
              display: none !important;
            }
          `,
        }}
      />
      {children}
    </div>
  );
}
