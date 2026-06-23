import type { Goal, PartiallyComputedPath, Pathfinder } from 'mineflayer-pathfinder'

import 'mineflayer-pathfinder'

declare module 'mineflayer' {
  interface Bot {
    pathfinder: Pathfinder
  }

  interface BotEvents {
    goal_reached: (goal: Goal) => Promise<void> | void
    path_update: (path: PartiallyComputedPath) => Promise<void> | void
    goal_updated: (goal: Goal, dynamic: boolean) => Promise<void> | void
    path_stop: () => Promise<void> | void
  }
}
