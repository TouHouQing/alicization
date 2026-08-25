import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { registerAppExitSignalHandlers } from './app-exit-signal-handlers'

describe('registerAppExitSignalHandlers', () => {
  it('routes SIGTERM through the ordered app exit handler', async () => {
    const processEvents = new EventEmitter()
    const handleAppExit = vi.fn().mockResolvedValue(undefined)

    registerAppExitSignalHandlers(processEvents, handleAppExit)
    processEvents.emit('SIGTERM')

    await vi.waitFor(() => {
      expect(handleAppExit).toHaveBeenCalledTimes(1)
    })
  })
})
