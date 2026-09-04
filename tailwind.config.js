/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        usam: {
          black: "var(--usam-black)",
          gold: "var(--usam-gold)",
          success: "var(--usam-success)",
          white: "var(--usam-white)",
        },
        // DOS design tokens — the single source is
        // docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md §2, mirrored
        // for non-Tailwind use in src/lib/dos/text-tokens.ts. Keep the two in
        // sync; scripts/dos-design-tokens-regression.mjs checks that they are.
        //
        // Text ladder: hierarchy comes from size, weight, and position; color
        // only separates kinds of text. Nothing lighter than `dos-secondary`
        // may carry a date, a count, or a sentence. `dos-disabled` is for
        // genuinely disabled UI only.
        dos: {
          // Text
          primary: "#0B1220",
          ink: "#0B1220",
          body: "#3D4654",
          secondary: "#5A6473",
          ink2: "#5A6473",
          // Grey eyebrow: sub-group eyebrows inside a section, and every
          // eyebrow that has not yet been refreshed. Section eyebrows on
          // refreshed screens use `eyebrowSection` (blue).
          eyebrow: "#6B7686",
          eyebrowSection: "#2251E8",
          disabled: "#9AA3B2",
          // Accent
          blue: "#2251E8",
          blueText: "#1E3FB8",
          blue50: "#F1F4FF",
          blue100: "#E4EAFF",
          // Lines and surfaces
          line: "#E5E8EF",
          hairline: "#E5E8EF",
          rule: "#E5E8EF",
          surface2: "#F7F8FB",
          band: "#F7F8FB",
          // Status
          amber: "#B45309",
          amberBg: "#FDF0D5",
          green: "#047857",
          greenBg: "#DCF5E9",
          red: "#B91C1C",
          redBg: "#FDE8E8",
        },
      },
      // DOS type scale (spec §2.2). Inter, system fallback. Nothing readable
      // below `dos-pill` (12px).
      fontSize: {
        "dos-display": ["30px", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        "dos-title": ["26px", { lineHeight: "1.15", fontWeight: "700" }],
        "dos-heading": ["20px", { lineHeight: "1.2", fontWeight: "700" }],
        "dos-question": ["17px", { lineHeight: "1.35", fontWeight: "600" }],
        "dos-body": ["15px", { lineHeight: "1.5" }],
        "dos-label": ["13.5px", { lineHeight: "1.3", fontWeight: "600" }],
        "dos-meta": ["12.5px", { lineHeight: "1.35", fontWeight: "500" }],
        "dos-eyebrow": ["11.5px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "600" }],
        "dos-pill": ["12px", { lineHeight: "1", fontWeight: "600" }],
      },
      // DOS radii (spec §2.3): fields/tiles, cards/sheets, buttons/pills/nav.
      borderRadius: {
        "dos-1": "12px",
        "dos-2": "20px",
        "dos-3": "999px",
      },
      // DOS elevation: nav, sheets, FAB only.
      boxShadow: {
        "dos-float": "0 1px 2px rgba(16, 24, 40, 0.05), 0 12px 32px -14px rgba(16, 24, 40, 0.22)",
      },
      // Every scrollable screen that shows the bottom nav reserves this at
      // its end: nav 70 + gap 14 + breathing 16 above the safe area (134px on
      // a 34px-inset phone).
      spacing: {
        "dos-nav-clearance": "calc(env(safe-area-inset-bottom) + 100px)",
      },
      zIndex: {
        "dos-sticky": "10",
        "dos-fab": "10",
        "dos-nav": "30",
        "dos-popover": "40",
        "dos-overlay": "50",
        "dos-bottom-sheet": "80",
        "dos-task": "120",
        "dos-sheet": "1000",
        "dos-dialog": "1100",
      },
    },
  },
  plugins: [],
};
