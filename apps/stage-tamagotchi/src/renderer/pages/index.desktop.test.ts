import type { ChatProvider } from '@xsai-ext/providers/utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  dispatchDesktopVoiceTurn,
  resetDesktopLayoutState,
  resolveDesktopMouseCaptureState,
  runStageStartupOnboardingCheck,
} from './index.desktop'

function createMockChatProvider(): ChatProvider {
  return {
    chat: model => ({
      baseURL: 'https://example.invalid/v1/',
      model: String(model),
    }),
  }
}

describe('stage desktop page helpers', () => {
  describe('resolveDesktopMouseCaptureState', () => {
    it('forces mouse capture during active stage interactions even on blank pixels', () => {
      expect(resolveDesktopMouseCaptureState({
        fadeOnHoverEnabled: true,
        hearingDialogOpen: false,
        insideControls: false,
        insideDialogueOverlay: false,
        insideStageRecoveryPanel: false,
        emergencyPanelHovered: false,
        isOutsideWindow: false,
        stageCharacterHovered: false,
        stageInteractionActive: true,
        stageCapturePixel: false,
        stagePaused: false,
      })).toEqual({
        shouldCaptureMouse: true,
        shouldFadeOnCursorWithin: false,
      })
    })

    it('keeps the desktop click-through on blank areas', () => {
      expect(resolveDesktopMouseCaptureState({
        fadeOnHoverEnabled: true,
        hearingDialogOpen: false,
        insideControls: false,
        insideDialogueOverlay: false,
        insideStageRecoveryPanel: false,
        emergencyPanelHovered: false,
        isOutsideWindow: true,
        stageCharacterHovered: false,
        stageInteractionActive: false,
        stageCapturePixel: false,
        stagePaused: false,
      })).toEqual({
        shouldCaptureMouse: false,
        shouldFadeOnCursorWithin: false,
      })
    })

    it('only fades on hover when the cursor is actually over the rendered character', () => {
      expect(resolveDesktopMouseCaptureState({
        fadeOnHoverEnabled: true,
        hearingDialogOpen: false,
        insideControls: false,
        insideDialogueOverlay: false,
        insideStageRecoveryPanel: false,
        emergencyPanelHovered: false,
        isOutsideWindow: false,
        stageCharacterHovered: true,
        stageInteractionActive: false,
        stageCapturePixel: false,
        stagePaused: false,
      })).toEqual({
        shouldCaptureMouse: false,
        shouldFadeOnCursorWithin: true,
      })
    })

    it('still captures the dialogue overlay while fade-on-hover is enabled', () => {
      expect(resolveDesktopMouseCaptureState({
        fadeOnHoverEnabled: true,
        hearingDialogOpen: false,
        insideControls: false,
        insideDialogueOverlay: true,
        insideStageRecoveryPanel: false,
        emergencyPanelHovered: false,
        isOutsideWindow: false,
        stageCharacterHovered: true,
        stageInteractionActive: false,
        stageCapturePixel: true,
        stagePaused: false,
      })).toEqual({
        shouldCaptureMouse: true,
        shouldFadeOnCursorWithin: false,
      })
    })

    it('does not fade when only broad stage capture is true but character hover is false', () => {
      expect(resolveDesktopMouseCaptureState({
        fadeOnHoverEnabled: true,
        hearingDialogOpen: false,
        insideControls: false,
        insideDialogueOverlay: false,
        insideStageRecoveryPanel: false,
        emergencyPanelHovered: false,
        isOutsideWindow: false,
        stageCharacterHovered: false,
        stageInteractionActive: false,
        stageCapturePixel: true,
        stagePaused: false,
      })).toEqual({
        shouldCaptureMouse: false,
        shouldFadeOnCursorWithin: false,
      })
    })

    it('captures mouse while emergency panel is hovered without enabling stage fade', () => {
      expect(resolveDesktopMouseCaptureState({
        fadeOnHoverEnabled: true,
        hearingDialogOpen: false,
        insideControls: false,
        insideDialogueOverlay: false,
        insideStageRecoveryPanel: false,
        emergencyPanelHovered: true,
        isOutsideWindow: false,
        stageCharacterHovered: false,
        stageInteractionActive: false,
        stageCapturePixel: false,
        stagePaused: false,
      })).toEqual({
        shouldCaptureMouse: true,
        shouldFadeOnCursorWithin: false,
      })
    })

    it('captures mouse while the stage recovery panel is hovered', () => {
      expect(resolveDesktopMouseCaptureState({
        fadeOnHoverEnabled: true,
        hearingDialogOpen: false,
        insideControls: false,
        insideDialogueOverlay: false,
        insideStageRecoveryPanel: true,
        emergencyPanelHovered: false,
        isOutsideWindow: false,
        stageCharacterHovered: false,
        stageInteractionActive: false,
        stageCapturePixel: false,
        stagePaused: false,
      })).toEqual({
        shouldCaptureMouse: true,
        shouldFadeOnCursorWithin: false,
      })
    })
  })

  describe('resetDesktopLayoutState', () => {
    it('resets live2d, vrm and dialogue layout back to desktop defaults', () => {
      const stageDialogue = {
        resetLayout: vi.fn(),
      }
      const live2d = {
        position: { x: 42, y: -18 },
        scale: 1.7,
      }
      const model = {
        bootstrapCameraDistance: 2.4,
        cameraDistance: 4.9,
        modelOffset: { x: 0.5, y: -0.2, z: 0.1 },
      }

      resetDesktopLayoutState({
        live2d,
        model,
        stageDialogue,
      })

      expect(live2d).toEqual({
        position: { x: 0, y: 0 },
        scale: 1,
      })
      expect(model).toEqual({
        bootstrapCameraDistance: 2.4,
        cameraDistance: 2.4,
        modelOffset: { x: 0, y: 0, z: 0 },
      })
      expect(stageDialogue.resetLayout).toHaveBeenCalledOnce()
    })

    it('keeps the current vrm distance when no bootstrap distance is available yet', () => {
      const model = {
        bootstrapCameraDistance: 0,
        cameraDistance: 3.2,
        modelOffset: { x: 1, y: 2, z: 3 },
      }

      resetDesktopLayoutState({
        live2d: {
          position: { x: 1, y: 1 },
          scale: 1.2,
        },
        model,
        stageDialogue: {
          resetLayout: vi.fn(),
        },
      })

      expect(model.cameraDistance).toBe(3.2)
    })
  })

  describe('startup onboarding order', () => {
    const startupMocks = {
      initializeSetupCheck: vi.fn(),
      openOnboarding: vi.fn(),
      needsOnboarding: false,
    }

    beforeEach(() => {
      startupMocks.initializeSetupCheck.mockClear()
      startupMocks.openOnboarding.mockClear()
      startupMocks.needsOnboarding = false
    })

    it('initializes onboarding state before checking whether to open onboarding', async () => {
      runStageStartupOnboardingCheck({
        initializeSetupCheck: startupMocks.initializeSetupCheck,
        get needsOnboarding() {
          return startupMocks.needsOnboarding
        },
        openOnboarding: startupMocks.openOnboarding,
      })

      expect(startupMocks.initializeSetupCheck).toHaveBeenCalledOnce()
      expect(startupMocks.openOnboarding).not.toHaveBeenCalled()
    })

    it('opens onboarding after initialization when onboarding becomes needed', async () => {
      startupMocks.initializeSetupCheck.mockImplementationOnce(() => {
        startupMocks.needsOnboarding = true
      })
      runStageStartupOnboardingCheck({
        initializeSetupCheck: startupMocks.initializeSetupCheck,
        get needsOnboarding() {
          return startupMocks.needsOnboarding
        },
        openOnboarding: startupMocks.openOnboarding,
      })

      expect(startupMocks.initializeSetupCheck).toHaveBeenCalledOnce()
      expect(startupMocks.openOnboarding).toHaveBeenCalledOnce()
    })
  })

  describe('desktop voice turn dispatch', () => {
    it('dispatches voice through the central memory-owned dialogue entry without renderer reply governance', async () => {
      const ingest = vi.fn(async () => undefined)

      await dispatchDesktopVoiceTurn({
        text: '继续把这轮记忆测试推进',
        providerId: 'mock-provider',
        model: 'mock-model',
        chatProvider: createMockChatProvider(),
        providerConfig: { apiKey: 'test-key' },
        origin: 'ui-user',
        ingest,
      })

      expect(ingest).toHaveBeenCalledWith('继续把这轮记忆测试推进', expect.objectContaining({
        providerId: 'mock-provider',
        model: 'mock-model',
        chatProvider: expect.objectContaining({
          chat: expect.any(Function),
        }),
        providerConfig: { apiKey: 'test-key' },
        origin: 'ui-user',
      }))
    })
  })
})
