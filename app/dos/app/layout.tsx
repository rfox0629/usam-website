import type { ReactNode } from "react";

// /dos/app is the mobile-first Field app. Keep Command Center/admin shells,
// navigation, profile management, and analytics panels out of this route.
export default function DosAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dos-app-route">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.dos-app-route) {
              background: #FAFBFD !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              overflow-x: hidden;
            }

            .dos-app-route,
            .dos-app-route * {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            }

            .dos-app-route {
              width: 100%;
              max-width: 430px;
              margin: 0 auto;
              min-height: 100dvh;
              flex: 0 1 430px;
              background: #FAFBFD;
            }

            .dos-app-route :where(button, a, input, textarea, select):focus {
              outline: none;
            }

            .dos-app-route :where(button, a, input, textarea, select):focus-visible {
              outline: 2px solid rgba(37, 99, 235, 0.34);
              outline-offset: 2px;
            }

            body:has(.dos-app-route) > footer {
              display: none !important;
            }

            body:has(.dos-app-route) > div.flex-1 {
              min-height: 100dvh;
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: stretch;
              background: #FAFBFD;
            }

            @media (max-width: 430px) {
              .dos-app-route {
                max-width: 100%;
                flex-basis: 100%;
              }
            }

            body:has(.dos-app-route) nextjs-portal {
              display: none !important;
            }
          `,
        }}
      />
      {children}
    </div>
  );
}
