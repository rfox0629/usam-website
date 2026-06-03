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
          blue: "var(--usam-blue)",
          gold: "rgb(var(--usam-gold-channels) / <alpha-value>)",
          "gold-active": "rgb(var(--usam-gold-active-channels) / <alpha-value>)",
          "gold-hover": "rgb(var(--usam-gold-hover-channels) / <alpha-value>)",
          navy: "var(--usam-navy)",
          surface: "var(--usam-surface)",
          white: "var(--usam-white)",
        },
      },
    },
  },
  plugins: [],
};
