import { describe, expect, it, vi } from 'vitest'

import {
  promoteStageWindowAboveDesktop,
  promoteUtilityWindowAboveStage,
  showStageWindow,
  transparentWindowBackgroundColor,
} from './window-layer'

describe('promoteStageWindowAboveDesktop', () => {
  it('keeps the transparent stage visible in the active and full-screen spaces', () => {
    const window = {
      moveTop: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      setVisibleOnAllWorkspaces: vi.fn(),
    }

    promoteStageWindowAboveDesktop(window)

    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver', 1)
    expect(window.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true,
    })
    expect(window.moveTop).toHaveBeenCalledOnce()
  })
})

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

describe('showStageWindow', () => {
  it('restores app visibility before activating the stage window', () => {
    const app = {
      show: vi.fn(),
    }
    const window = {
      focus: vi.fn(),
      moveTop: vi.fn(),
      show: vi.fn(),
    }

    showStageWindow(window, app)

    expect(app.show).toHaveBeenCalledOnce()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.moveTop).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })
})

describe('transparentWindowBackgroundColor', () => {
  it('uses a fully transparent background color', () => {
    expect(transparentWindowBackgroundColor).toBe('#00000000')
  })
})
