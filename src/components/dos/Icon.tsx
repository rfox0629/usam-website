/* The production DOS icon set. Moved verbatim from app/dos/app/DosMvpAppClient.tsx
 * in USA-211 so shared primitives can use it. The bottom-navigation icons
 * (`home`, `meetings`, `apps`) are protected: do not redraw them. */

export type IconName = "add" | "apps" | "arrow" | "bell" | "calendar" | "commitment" | "fruit" | "home" | "library" | "log" | "meetings" | "more" | "people" | "prayer" | "search" | "send" | "settings" | "upload";

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const commonProps = {
    "aria-hidden": true,
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: size,
  };

  switch (name) {
    case "add":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...commonProps}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "apps":
      return (
        <svg {...commonProps}>
          <rect height="5.5" rx="1.5" width="5.5" x="4" y="4" />
          <rect height="5.5" rx="1.5" width="5.5" x="14.5" y="4" />
          <rect height="5.5" rx="1.5" width="5.5" x="4" y="14.5" />
          <path d="M17.25 14.5v5.5" />
          <path d="M14.5 17.25h5.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps}>
          <path d="M7 3v3" />
          <path d="M17 3v3" />
          <path d="M4 8h16" />
          <rect height="16" rx="3" width="16" x="4" y="5" />
        </svg>
      );
    case "commitment":
      return (
        <svg {...commonProps}>
          <path d="M9 5h6" />
          <path d="M9.5 3.5h5a1.5 1.5 0 0 1 1.5 1.5v1H8V5a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M6 5.5h12a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z" />
          <path d="m8 13 2 2 5-5" />
        </svg>
      );
    case "fruit":
      return (
        <svg {...commonProps}>
          <path d="M12 21V10" />
          <path d="M12 13.5c-3.7 0-6.2-2.3-7-6.6 4 .1 6.5 2.2 7 6.6Z" />
          <path d="M12 11.5c.9-3.8 3.4-5.8 7.2-5.9-.4 4.3-3 6.4-7.2 5.9Z" />
          <path d="M12 18c2.3-.4 4-1.7 5.1-3.9" />
        </svg>
      );
    case "home":
      return (
        <svg {...commonProps}>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M6.5 10.5V20h11v-9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "log":
      return (
        <svg {...commonProps}>
          <path d="M8 6h10" />
          <path d="M8 12h10" />
          <path d="M8 18h7" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </svg>
      );
    case "meetings":
      return (
        <svg {...commonProps}>
          <path d="M7 3v3" />
          <path d="M17 3v3" />
          <rect height="16" rx="3" width="18" x="3" y="5" />
          <path d="M3 9h18" />
          <circle cx="9" cy="14" r="2" />
          <path d="M5.8 19c.7-1.6 1.8-2.4 3.2-2.4s2.5.8 3.2 2.4" />
          <circle cx="15.7" cy="14.4" r="1.5" />
          <path d="M13.7 18.6c.5-1 1.2-1.5 2.1-1.5.8 0 1.5.4 2 1.3" />
        </svg>
      );
    case "more":
      return (
        <svg {...commonProps}>
          <rect height="6" rx="1.5" width="6" x="4" y="4" />
          <rect height="6" rx="1.5" width="6" x="14" y="4" />
          <rect height="6" rx="1.5" width="6" x="4" y="14" />
          <rect height="6" rx="1.5" width="6" x="14" y="14" />
        </svg>
      );
    case "library":
      return (
        <svg {...commonProps}>
          <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12v16H7a2.5 2.5 0 0 0-2.5 2.5v-16Z" />
          <path d="M7 3v16" />
          <path d="M10 7h5.5" />
          <path d="M10 10h4" />
        </svg>
      );
    case "people":
      return (
        <svg {...commonProps}>
          <path d="M16 20v-1.5c0-1.7-1.8-3-4-3s-4 1.3-4 3V20" />
          <circle cx="12" cy="9" r="3" />
          <path d="M20 20v-1.2c0-1.2-1-2.2-2.5-2.7" />
          <path d="M17 6.2a2.5 2.5 0 0 1 0 4.6" />
        </svg>
      );
    case "prayer":
      return (
        <svg {...commonProps}>
          <path d="M12 20s-7-4.4-7-10.2A4.2 4.2 0 0 1 12 6a4.2 4.2 0 0 1 7 3.8C19 15.6 12 20 12 20Z" />
          <path d="M9 11h6" />
        </svg>
      );
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "send":
      return (
        <svg {...commonProps}>
          <path d="m4 12 16-7-7 16-2-7-7-2Z" />
          <path d="m13 11-4 4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="m4.2 4.2 1.4 1.4" />
          <path d="m18.4 18.4 1.4 1.4" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="m4.2 19.8 1.4-1.4" />
          <path d="m18.4 5.6 1.4-1.4" />
        </svg>
      );
    case "upload":
      return (
        <svg {...commonProps}>
          <path d="M12 16V5" />
          <path d="m8 9 4-4 4 4" />
          <path d="M5 19h14" />
        </svg>
      );
    default:
      return null;
  }
}
