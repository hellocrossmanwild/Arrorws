export interface Player {
  id: string
  displayName: string
  isBot: boolean
  botProfileId: string | null
  userId: string | null // Phase 2 only. Links to the Clerk user
  createdAt: string // ISO 8601
}

export interface BotProfile {
  id: string
  name: string
  targetAverage: number
  /** Standard deviation of throw scatter when aiming at a treble. Calibrated by scripts/calibrate-bot.ts. */
  scoringSigmaMm: number | null
  /** Separate, usually larger, scatter when aiming at a double. */
  doubleSigmaMm: number | null
  description: string
}
