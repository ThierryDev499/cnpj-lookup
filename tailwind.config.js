/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        surface: "#f9fafb",
        panel: "#ffffff",
        border: "#e5e7eb",
        text: "#111827",
        muted: "#6b7280",
        subtle: "#9ca3af",
        accent: "#2563eb",
        accentHover: "#1d4ed8",
        danger: "#b91c1c",
        dangerBg: "#fef2f2",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
