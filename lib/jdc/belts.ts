/**
 * The seven JDC belt colours. These are the Junior Darts Corporation's own
 * award shirts, not an Arrows invention — the names and thresholds come from
 * the grading table, so do not restyle them into the app palette.
 *
 * `swatch` is the belt's colour; `ink` is what reads on top of it.
 */
export const BELT_COLOURS: Record<string, { swatch: string; ink: string }> = {
  White: { swatch: "#F2EDE3", ink: "#15181C" },
  Purple: { swatch: "#6B3FA0", ink: "#F2EDE3" },
  Yellow: { swatch: "#E8C33A", ink: "#15181C" },
  Green: { swatch: "#1E8A57", ink: "#F2EDE3" },
  Blue: { swatch: "#2C6FB5", ink: "#F2EDE3" },
  Red: { swatch: "#C8102E", ink: "#F2EDE3" },
  Black: { swatch: "#0B0D10", ink: "#F2EDE3" },
}

export function beltColour(name: string): { swatch: string; ink: string } {
  return BELT_COLOURS[name] ?? BELT_COLOURS.White
}

/**
 * The ceiling the trend chart scales against: Black (850) plus headroom, so
 * the top band rule and its label sit inside the plot rather than on its
 * edge. The chart raises it further if an attempt ever beats it.
 */
export const CHART_CEILING = 950
