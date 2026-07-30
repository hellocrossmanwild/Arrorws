import { gameHandlers } from "./games"
import { practiceHandlers } from "./practice"
import { statsHandlers } from "./stats"

export const handlers = [...gameHandlers, ...practiceHandlers, ...statsHandlers]
