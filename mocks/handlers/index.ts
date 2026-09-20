import { gameHandlers } from "./games"
import { jdcHandlers } from "./jdc"
import { practiceHandlers } from "./practice"
import { statsHandlers } from "./stats"
import { trainingHandlers } from "./training"

export const handlers = [
  ...gameHandlers,
  ...practiceHandlers,
  ...statsHandlers,
  ...trainingHandlers,
  ...jdcHandlers,
]
