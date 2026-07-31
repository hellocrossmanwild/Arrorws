import type { GameMode } from "@/lib/types"

/**
 * In-app guides (spec 0009). Static product content: what each game is,
 * how to actually throw it at the board, how it scores, and what it
 * trains. House tone — plain, no exclamation marks.
 */

export interface GameGuide {
  title: string
  /** What this game is, in a sentence or two. */
  what: string
  /** Concrete steps at the board and on the pad. */
  how: string[]
  /** How the score works. */
  scoring: string
  /** What it trains. */
  trains: string
  /** One honest tip. */
  tip: string
}

/**
 * The one thing everyone gets wrong in a per-dart app, stated everywhere:
 * you record where the dart landed, not where you aimed.
 */
export const ENTRY_RULE =
  "Enter where each dart actually lands, not where you aimed. In drills the app already knows the target — honest misses are what make your stats worth reading."

export const PAD_PRIMER: string[] = [
  "Tap a number for a single. Tap Double or Treble first to arm it, then the number — the whole grid recolours while armed, and the modifier clears after one dart.",
  "25 is the outer bull. BULL is the fifty. MISS is a dart off the board — it still counts as a dart thrown.",
  "Undo removes the last dart, at any point, including a bust or a winning dart.",
  "When a finish exists in 501, the route appears above the pad as one-tap keys.",
]

export const GAME_GUIDES: Record<GameMode, GameGuide> = {
  x01: {
    title: "501, double out",
    what: "The match game. Start on 501 and race to exactly zero, finishing on a double or the bull.",
    how: [
      "Throw three darts a visit and enter each one as it lands.",
      "Going below zero, landing on exactly one, or reaching zero without a double is a bust — the visit scores nothing and your score resets to where the visit began.",
      "When a finish exists, the suggested route shows above the pad. You can take it or ignore it.",
    ],
    scoring: "Your three-dart average is total scored divided by darts thrown, times three. Busted visits score nothing but the darts still count.",
    trains: "Everything at once: scoring, pressure, and finishing arithmetic.",
    tip: "On an odd number with darts in hand, fix the parity early — an odd single now beats a scramble later.",
  },
  "around-the-clock": {
    title: "Around the clock",
    what: "Board coverage. Hit 1 through 20 in order, then the outer 25, then the bull.",
    how: [
      "Aim at the big single of the current number — any ring of it counts and moves you on.",
      "The target shows at the top of the screen and advances automatically when you hit it.",
      ENTRY_RULE,
    ],
    scoring: "Total darts to complete all 22 targets. Lower is better.",
    trains: "Moving around the whole board instead of living on the 20.",
    tip: "Set a rhythm and keep it. Rushing the easy numbers is where the score goes.",
  },
  "doubles-round-the-board": {
    title: "Doubles round the board",
    what: "The finishing ring, in order. D1 through D20, then the bull to finish.",
    how: [
      "Only the thin outer double ring of the current number counts. Everything else is a miss for this game.",
      "Enter every dart where it lands — singles and misses included. Those attempts are what build your doubles heatmap.",
    ],
    scoring: "Total darts to complete all 21 targets. Lower is better.",
    trains: "Every double, not just your favourite. The heatmap on the stats page is fed directly by this drill.",
    tip: "Aim at the inside wire of the double, not the middle of the bed. A miss inside still leaves you throwing; a miss outside is gone.",
  },
  "bobs-27": {
    title: "Bob's 27",
    what: "Doubles under a running score. Twenty rounds, round n targets double n, starting with 27 points in the bank.",
    how: [
      "Three darts per round at the round's double. Each dart that hits it adds twice the number to your score.",
      "Miss with all three and you lose twice the number instead.",
      "Drop below zero at any point and you are out — the game ends there.",
    ],
    scoring: "The final total. A perfect run — every double hit once — scores 447. Surviving to the end at all is respectable.",
    trains: "Doubles when missing costs something. The late rounds punish hardest, exactly like a match dart at D16.",
    tip: "The early rounds are cheap to miss and cheap to bank. Do not panic before D10 — the game is decided from D14 up.",
  },
  shanghai: {
    title: "Shanghai",
    what: "Twenty rounds, round n targets the number n. Points for hits, and one perfect round ends it outright.",
    how: [
      "Three darts per round at the round's number. Any ring counts and scores its real value — a treble 7 in round 7 scores 21.",
      "Hit the single, double and treble of the number within one round and that is a shanghai: the game ends immediately as a win.",
    ],
    scoring: "Total points, higher is better — unless you shanghai, which beats everything.",
    trains: "Precision on every segment and the discipline of switching targets each round.",
    tip: "Chase the treble first. If it lands, the single and double are suddenly worth going for.",
  },
  "halve-it": {
    title: "Halve it",
    what: "Seven rounds of targets where missing costs half your score: 20, 19, 18, any double, 41, any treble, bull.",
    how: [
      "Three darts per round. Darts that satisfy the round's target add their real value.",
      "Miss the target with all three and your score halves, rounded down.",
      "The 41 round is different: your three darts must total exactly 41 — 20, 20, 1 is the classic route.",
    ],
    scoring: "The final total. Higher is better.",
    trains: "Throwing under a penalty. Halving 200 hurts more than halving 40, so the better you are doing, the heavier every round gets.",
    tip: "Bank the round with your first dart if you can. Two free darts beats three nervous ones.",
  },
  "checkout-ladder": {
    title: "Checkout ladder",
    what: "Finishing, one rung at a time. Start on 41 and climb one checkout per success.",
    how: [
      "Three darts to take out the current number exactly, ending on a double. The suggested route shows above the pad.",
      "Success moves you up one. Failure repeats the same number. Three failures in a row ends the game.",
      "Impossible checkouts (159, 162, 163, 165, 166, 168, 169) are skipped automatically.",
    ],
    scoring: "The highest checkout you take out. Higher is better.",
    trains: "Finishing routes and the arithmetic of leaving a double.",
    tip: "Take the suggested route until you disagree with it for a reason you can say out loud.",
  },
  "random-checkout": {
    title: "Random checkout",
    what: "Finishing cold. Twenty random scores between 41 and 170, three darts each.",
    how: [
      "Work out the route yourself — the suggested finish is hidden by default, because the arithmetic is half the drill.",
      "Take the checkout exactly, ending on a double. Bust or run out of darts and the round is gone; the next score arrives either way.",
    ],
    scoring: "Checkouts taken out of twenty. Higher is better.",
    trains: "Seeing a number and knowing the route, the way a leg demands it.",
    tip: "First dart sets up, last dart finishes. If the number is odd, kill the odd number first.",
  },
  "scoring-drill": {
    title: "Scoring drill",
    what: "Twenty visits at treble 20. Nothing else, no story.",
    how: [
      "Sixty darts, every one aimed at T20.",
      ENTRY_RULE,
    ],
    scoring: "Your three-dart average over the sixty darts, plus your exact treble-20 strike rate.",
    trains: "The scoring floor. This is the number that moves your 501 average.",
    tip: "Watch where the misses go. Drifting into the 5 and the 1 tells you which side your throw is leaking.",
  },
  "jdc-challenge": {
    title: "JDC Challenge",
    what: "The graded assessment, borrowed from the Junior Darts Corporation academies. Fifty-seven darts, one score, a grade from White to Black.",
    how: [
      "Part one: three darts at each number from 10 to 15. Hits score their face value; hit the single, double and treble of a number in one round and that round scores 100.",
      "Part two: one dart at every double, D1 up to D20, then one at the bull. Each double hit is worth 50, the bull 100.",
      "Part three: as part one, on 15 to 20.",
    ],
    scoring: "Total points. Grades: White 0, Purple 150, Yellow 300, Green 450, Blue 600, Red 700, Black 850.",
    trains: "It does not train — it measures. Same test every fortnight, so the grade trend is the honest answer to whether the programme is working.",
    tip: "Do not chase shanghais in parts one and three. Three steady singles beat two wild trebles.",
  },
  "target-switching": {
    title: "Target switching",
    what: "The warm-up. Six rounds of three darts with the target cycling 20, 19, 18.",
    how: [
      "Aim the big single of the round's number. Any ring of it scores its value; everything else scores nothing.",
      "The point is the switch — settling on a new segment every round instead of grooving on one.",
    ],
    scoring: "Total points across the rounds. Higher is better, but this one is about loosening the arm.",
    trains: "The 20-to-19 switch every 501 leg demands after a blocked 20.",
    tip: "Slow down on the first dart after each switch. That dart is the drill.",
  },
  "pressure-doubles": {
    title: "Pressure doubles",
    what: "The session finisher. D16, D20, D18, D10 in order, and the board decides when you are done.",
    how: [
      "Throw at the current double until you have hit it twice. Only then does the next one unlock.",
      "There is no dart limit and no way out except through — that is the pressure.",
    ],
    scoring: "Total darts taken to clear all four. Lower is better.",
    trains: "Doubles when you are tired and want to go home — which is exactly the state you hit match darts in.",
    tip: "Same routine every dart: breathe, sight the wire, throw. The routine is what holds when the arm is done.",
  },
}

export const TRAINING_EXPLAINER: string[] = [
  "The programme is a queue, not a calendar. The next session is simply waiting whenever you open the app — no fixed days, no missed-day guilt.",
  "A session is two or three blocks: a switching warm-up, the main work, and usually a pressure finisher. Each block opens the normal pad; finishing a block returns you here and ticks it off. Skip a block if you have to — the session still completes.",
  "The weekly target is four sessions. Hit it and the week counts toward your streak; the streak is consecutive weeks at target.",
  "Every second week the match session is replaced by the JDC Challenge, the graded assessment. The grade trend is how you know four weeks of this moved you.",
  "Every dart you throw in training lands in the same log as everything else, so the stats page and the doubles heatmap get better with every session.",
]
