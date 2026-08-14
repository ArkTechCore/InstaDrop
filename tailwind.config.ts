import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 28px 80px rgba(15, 23, 42, 0.16)"
      },
      animation: {
        "soft-rise": "softRise 420ms ease-out both",
        shimmer: "shimmer 1.8s linear infinite"
      },
      keyframes: {
        softRise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      }
    }
  },
  plugins: []
};

export default config;
