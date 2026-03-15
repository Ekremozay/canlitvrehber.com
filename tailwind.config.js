/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#08080c",
        surface: "#111118",
        surface2: "#1a1a24",
        accent: "#00e87b",
        accent2: "#00b4d8",
        danger: "#ff4757",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["Azeret Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
