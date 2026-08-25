import { describe, expect, it } from 'vitest'

import { setupMainWindowBeforeRendererLoad } from './main-window-startup'

describe('setupMainWindowBeforeRendererLoad', () => {
  it('registers renderer IPC before loading the renderer', async () => {
    const events: string[] = []

    await setupMainWindowBeforeRendererLoad({
      setupInvokes: async () => {
        events.push('setup-invokes')
      },
      loadRenderer: async () => {
        events.push('load-renderer')
      },
    })

    expect(events).toEqual(['setup-invokes', 'load-renderer'])
  })
})
