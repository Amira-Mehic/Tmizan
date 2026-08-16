/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // KLJUČ za theme switch
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* =========================
         * TMIZAN BRAND COLORS
         * ========================= */

        primary: {
          50: "#eefbf3",
          100: "#d6f5e1",
          200: "#aeeac3",
          300: "#7edda2",
          400: "#4fcd80",
          500: "#22c55e", // MAIN (zelena)
          600: "#16a34a",
          700: "#12803b",
          800: "#0f662f",
          900: "#0c5226",
        },

        secondary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1", // akcentska (plavo-ljubičasta)
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },

        accent: {
          gold: "#f5c542",  
          sand: "#f8f4e3",   // background soft tone
        },

        background: {
          light: "#ffffff",
          dark: "#0b0f14",
        },

        surface: {
          light: "#f8fafc",
          dark: "#111827",
        },

        text: {
          light: "#0f172a",
          dark: "#e5e7eb",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        arabic: ["Amiri", "serif"], //  Kur'an / arapski UI
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },

      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.08)",
        glow: "0 0 25px rgba(34,197,94,0.25)", // primary glow
      },

      screens: {
        xs: "480px",
      },
    },
  },

  plugins: [],
};
