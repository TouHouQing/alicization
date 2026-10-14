import { describe, expect, it } from 'vitest'

import { createExecutionInterruptRegistry } from './execution-interrupt-registry'

describe('bounded execution interruption', () => {
  it('cancels the selected card and task without interrupting another task', async () => {
    const registry = createExecutionInterruptRegistry()
    const signals: AbortSignal[] = []
    const finishes: Array<() => void> = []
    const work = (signal: AbortSignal) => new Promise<void>((resolve) => {
      signals.push(signal)
      finishes.push(resolve)
    })
    const first = registry.run({ cardId: 'alice', threadId: 'one' }, work)
    const second = registry.run({ cardId: 'bob', threadId: 'one' }, work)
    await expect(registry.run({ cardId: 'alice', threadId: 'one' }, work)).rejects.toThrow('active execution owner')
    registry.cancel('alice', 'one')
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    finishes.forEach(finish => finish())
    await Promise.all([first, second])
    await registry.run({ cardId: 'alice', threadId: 'one' }, async signal => expect(signal.aborted).toBe(false))
  })
})
