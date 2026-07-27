/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/**/*.{html,tsx,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        workbench: {
          bg: "#f4f6fb",
          panel: "#ffffff",
          text: "#0f172a",
          muted: "#64748b",
          border: "#e7eaf0",
          research: "#6366f1",
          work: "#10b981",
          life: "#f59e0b",
          sport: "#8b5cf6",
          finance: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "xl-2": "12px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.04)",
        "panel-md": "0 6px 16px rgba(15,23,42,.07), 0 2px 6px rgba(15,23,42,.04)",
        "panel-lg": "0 20px 48px rgba(15,23,42,.13), 0 6px 16px rgba(15,23,42,.07)",
      },
    },
  },
  plugins: [],
};
