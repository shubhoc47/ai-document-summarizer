/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#F7F8FA",
          card: "#FFFFFF",
          text: "#0F172A",
          muted: "#475569",
          border: "#E2E8F0",
          primary: "#2563EB",
          primaryHover: "#1D4ED8",
          success: "#16A34A",
          warning: "#D97706",
          danger: "#DC2626",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 20px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        xl: "0.9rem",
      },
    },
  },
  plugins: [],
};

