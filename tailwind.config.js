export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 700: "#0C3A6B", 500: "#1F4E79", 100: "#E6F0FF" },
        accent: { 500: "#D97706" },
        surface: { 0: "#FFFFFF", 1: "#FBFDFF", 2: "#F1F5F9" },
        textc: { 0: "#0F172A", muted: "#475569" },
        success: { 500: "#10B981" },
        danger: { 500: "#DC2626" },
        warning: { 500: "#F59E0B" },
        focus: { 500: "#2563EB" },
      },
      borderRadius: { sm: "8px", md: "12px", lg: "16px" },
      boxShadow: {
        1: "0 1px 2px rgba(2, 6, 23, 0.06), 0 1px 1px rgba(2, 6, 23, 0.04)",
        2: "0 8px 24px rgba(2, 6, 23, 0.10), 0 2px 6px rgba(2, 6, 23, 0.06)",
      },
    },
  },
  plugins: [],
};
