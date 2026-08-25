import { describe, expect, it, vi } from 'vitest'

import {
  activateUtilityWindow,
  ensureStageWindowVisible,
  promoteStageWindowAboveDesktop,
  promoteUtilityWindowAboveStage,
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
      moveTop: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      setVisibleOnAllWorkspaces: vi.fn(),
    }

    promoteUtilityWindowAboveStage(window)

    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver', 2)
    expect(window.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true)
    expect(window.moveTop).toHaveBeenCalledOnce()
  })
})

describe('activateUtilityWindow', () => {
  it('activates Alicization before raising and focusing a utility window', () => {
    const app = {
      focus: vi.fn(),
    }
    const window = {
      focus: vi.fn(),
      moveTop: vi.fn(),
      show: vi.fn(),
    }

    activateUtilityWindow(window, app)

    expect(app.focus).toHaveBeenCalledWith({ steal: true })
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.moveTop).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })
})

describe('ensureStageWindowVisible', () => {
  it('shows a hidden stage window after restoring app visibility', () => {
    const app = {
      show: vi.fn(),
    }
    const window = {
      focus: vi.fn(),
      isVisible: vi.fn(() => false),
      moveTop: vi.fn(),
      show: vi.fn(),
    }

    ensureStageWindowVisible(window, app)

    expect(app.show).toHaveBeenCalledOnce()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.moveTop).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })

  it('does not show an already visible stage window a second time', () => {
    const app = {
      show: vi.fn(),
    }
    const window = {
      focus: vi.fn(),
      isVisible: vi.fn(() => true),
      moveTop: vi.fn(),
      show: vi.fn(),
    }

    ensureStageWindowVisible(window, app)

    expect(app.show).toHaveBeenCalledOnce()
    expect(window.show).not.toHaveBeenCalled()
    expect(window.moveTop).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })
})

describe('transparentWindowBackgroundColor', () => {
  it('uses a fully transparent background color', () => {
    expect(transparentWindowBackgroundColor).toBe('#00000000')
  })
})
