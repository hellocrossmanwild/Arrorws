/** One completed (or abandoned) run at the JDC Challenge. */
export interface JdcAttempt {
  gameId: string
  /** When the attempt finished. */
  endedAt: string
  score: number
  grade: string
  /** Points banked in each of the three parts. */
  parts: [number, number, number]
  shanghais: number
  /** Doubles hit in part 2, the bull included. Out of 21. */
  doublesHit: number
  /** True when the attempt fulfilled a training programme assessment block. */
  fromProgramme: boolean
}

/** A belt on the JDC ladder, and whether it has been earned. */
export interface JdcBelt {
  name: string
  min: number
  earned: boolean
  /** When it was first reached. Null while unearned. */
  earnedAt: string | null
  /** True for the belt the player currently holds. */
  current: boolean
}

/** The `/jdc` screen's whole view model. Derived, never stored. */
export interface JdcSummary {
  attempts: JdcAttempt[]
  /** The best attempt ever thrown. It is what sets the belt. */
  best: JdcAttempt | null
  /** The most recent attempt. */
  latest: JdcAttempt | null
  /** Change in score from the previous attempt to the latest. Null below two attempts. */
  latestDelta: number | null
  /** The belt ladder, White through Black, in order. */
  belts: JdcBelt[]
  /** The belt currently held — the one the best score reaches. */
  belt: JdcBelt | null
  /** The belt above it, and the points still to find. Null once on Black. */
  nextBelt: { name: string; pointsAway: number } | null
  /** Best points banked in each part, across all attempts. */
  partBests: [number, number, number]
  /** The theoretical maximum of each part, for the bars to scale against. */
  partMaximums: [number, number, number]
  /**
   * The best attempt's running score by dart index, so a live attempt can
   * be shown against it ("PB pace"). Null until an attempt exists.
   */
  bestCumulative: number[] | null
}
