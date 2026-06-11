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
      },
    },
  },
  plugins: [],
};
