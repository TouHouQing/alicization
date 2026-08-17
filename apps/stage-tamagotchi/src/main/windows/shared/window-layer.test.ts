import { describe, expect, it, vi } from 'vitest'

import { promoteUtilityWindowAboveStage, transparentWindowBackgroundColor } from './window-layer'

describe('promoteUtilityWindowAboveStage', () => {
  it('places user-facing utility windows above the transparent stage', () => {
    const window = {
      setAlwaysOnTop: vi.fn(),
      setVisibleOnAllWorkspaces: vi.fn(),
    }

    promoteUtilityWindowAboveStage(window)

    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver', 2)
    expect(window.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true)
  })
})

describe('transparentWindowBackgroundColor', () => {
  it('uses a fully transparent background color', () => {
    expect(transparentWindowBackgroundColor).toBe('#00000000')
  })
})
