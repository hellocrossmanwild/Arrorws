import type { Config } from "tailwindcss"

/**
 * The Arrows palette follows the throw pad prototype: chalk on slate,
 * brass wire hairlines, red for doubles, green for trebles. Dark is the
 * only theme in the throwing UI.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate2: "#15181C",
        bed: "#20252B",
        chalk: "#F2EDE3",
        wire: "#B08D57",
        dbl: "#C8102E",
        trb: "#0E6B45",
        tung: "#8A9099",
        background: "#15181C",
        foreground: "#F2EDE3",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
export default config
