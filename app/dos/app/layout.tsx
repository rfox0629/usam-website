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
              background: #EDEAE3 !important;
              color: #1E1D1A;
            }

            body:has(.dos-app-route) > footer {
              display: none !important;
            }

            body:has(.dos-app-route) > div:first-child {
              min-height: 100dvh;
            }
          `,
        }}
      />
      {children}
    </div>
  );
}
