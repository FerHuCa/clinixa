import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-strong": "hsl(var(--primary-strong))",
        "primary-soft": "hsl(var(--primary-soft))",
        accent: "hsl(var(--accent))"
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-display)", ...defaultTheme.fontFamily.serif]
      },
      boxShadow: {
        soft: "0 1px 2px hsl(190 35% 12% / 0.05), 0 4px 16px hsl(190 35% 12% / 0.05)",
        lifted: "0 2px 4px hsl(190 35% 12% / 0.06), 0 12px 32px hsl(190 35% 12% / 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
