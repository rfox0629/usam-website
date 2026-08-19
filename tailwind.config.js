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
        // DOS text ladder — see src/lib/dos/text-tokens.ts for the rule.
        // Hierarchy comes from size, weight, and position; color only
        // separates kinds of text. Nothing lighter than `dos-secondary`
        // may carry a date, a count, or a sentence.
        dos: {
          primary: "#0F1520",
          body: "#3D4654",
          secondary: "#5A6473",
          eyebrow: "#6B7686",
          disabled: "#B4BBC5",
          blue: "#2450C8",
          hairline: "#E7E9ED",
          rule: "#EDEFF2",
          band: "#FBFAF8",
        },
      },
    },
  },
  plugins: [],
};
