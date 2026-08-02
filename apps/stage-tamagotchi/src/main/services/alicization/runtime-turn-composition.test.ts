import { describe, expect, it } from 'vitest'

import {
  deriveOrganicMemoryBudgetClass,
  filterMainGatewayToolsForRoutingIntent,
} from './runtime-turn-composition'

describe('runtime turn composition helpers', () => {
  it('derives deep recall budgets only for long-horizon temporal focus', () => {
    expect(deriveOrganicMemoryBudgetClass(null)).toBe('realtime-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'cross-session',
      },
    } as any)).toBe('deep-recall-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'experience-matched',
      },
    } as any)).toBe('deep-recall-reply')
  })

  it('filters tools to required routing names without dropping fallback tools when no match exists', () => {
    const tools = [
      { function: { name: 'search_memory' } },
      { function: { name: 'execute_task' } },
    ]
    expect(filterMainGatewayToolsForRoutingIntent(tools, {
      requiredToolNames: ['execute_task'],
    } as any)).toEqual([
      { function: { name: 'execute_task' } },
    ])
    expect(filterMainGatewayToolsForRoutingIntent(tools, {
      requiredToolNames: ['missing_tool'],
    } as any)).toBe(tools)
  })
})
