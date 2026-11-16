import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Bricolage Grotesque Variable", "sans-serif"],
        body: ["Inter Variable", "sans-serif"],
      },
    },
  },
} satisfies Config;
