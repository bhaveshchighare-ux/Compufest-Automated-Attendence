/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
      },
      colors: {
        primary: "#5B4FF5",
        "primary-dark": "#4A3FE0",
        "primary-light": "#7B6FF7",
        "primary-50": "#F0EEFF",
        dark: "#0D1117",
        "dark-card": "#12181F",
        "dark-border": "#1E2733",
        "off-white": "#F7FAF7",
        muted: "#8B95A1",
        "text-dark": "#1a1a2e",
        "text-mid": "#4a4a6a",
        "text-light": "#8888aa",
        "border-light": "#e8e8f0",
        "bg-light": "#f8f7ff",
      },
    },
  },
  plugins: [],
}