import { gameHandlers } from "./games"
import { practiceHandlers } from "./practice"
import { statsHandlers } from "./stats"
import { trainingHandlers } from "./training"

export const handlers = [...gameHandlers, ...practiceHandlers, ...statsHandlers, ...trainingHandlers]
