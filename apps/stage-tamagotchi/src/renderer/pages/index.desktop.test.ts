import { describe, expect, it, vi } from 'vitest'

import {
  resetDesktopLayoutState,
  resolveDesktopMouseCaptureState,
} from './index.desktop'

const startupMocks = vi.hoisted(() => ({
  initializeSetupCheck: vi.fn(),
  needsOnboarding: false,
  openOnboarding: vi.fn(),
  onMountedCallbacks: [] as Array<() => void>,
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (callback: () => void) => {
      startupMocks.onMountedCallbacks.push(callback)
    },
  }
})

vi.mock('@proj-alicization/stage-ui/stores/onboarding', () => ({
  useOnboardingStore: () => ({
    initializeSetupCheck: startupMocks.initializeSetupCheck,
    get needsOnboarding() {
      return startupMocks.needsOnboarding
    },
  }),
}))

vi.mock('@proj-alicization/electron-vueuse', () => ({
  useElectronEventaInvoke: () => startupMocks.openOnboarding,
  useElectronMouseInElement: () => ({ isOutside: { value: false } }),
  useElectronMouseInWindow: () => ({ isOutside: { value: false } }),
  useElectronRelativeMouse: () => ({ x: { value: 0 }, y: { value: 0 } }),
}))

vi.mock('@proj-alicization/electron-eventa', () => ({
  electron: {
    window: {
      setIgnoreMouseEvents: 'setIgnoreMouseEvents',
    },
    ipcRenderer: {
      send: vi.fn(),
    },
  },
}))

vi.mock('@proj-alicization/stage-ui-three', () => ({
  useModelStore: () => ({}),
  useThreeSceneIsTransparentAtPoint: () => ({ value: false }),
}))

vi.mock('@proj-alicization/stage-ui/components/scenes', () => ({
  WidgetStage: {},
}))

vi.mock('@proj-alicization/stage-ui/composables/audio/audio-recorder', () => ({
  useAudioRecorder: () => ({
    startRecord: vi.fn(),
    stopRecord: vi.fn(),
    onStopRecord: vi.fn(),
  }),
}))

vi.mock('@proj-alicization/stage-ui/composables/canvas-alpha', () => ({
  useCanvasPixelIsTransparentAtPoint: () => ({ value: false }),
}))

vi.mock('@proj-alicization/stage-ui/stores/ai/models/vad', () => ({
  useVAD: () => ({
    init: vi.fn(),
    dispose: vi.fn(),
    loaded: { value: false },
  }),
}))

vi.mock('@proj-alicization/stage-ui/stores/chat', () => ({
  useChatOrchestratorStore: () => ({}),
}))

vi.mock('@proj-alicization/stage-ui/stores/display-models', () => ({
  useDisplayModelsStore: () => ({}),
}))

vi.mock('@proj-alicization/stage-ui/stores/live2d', () => ({
  useLive2d: () => ({
    scale: { value: 1 },
    position: { value: { x: 0, y: 0 } },
  }),
}))

vi.mock('@proj-alicization/stage-ui/stores/modules/consciousness', () => ({
  useConsciousnessStore: () => ({}),
}))

vi.mock('@proj-alicization/stage-ui/stores/modules/hearing', () => ({
  useHearingSpeechInputPipeline: () => ({
    supportsStreamInput: { value: false },
    transcribeForRecording: vi.fn(),
    transcribeForMediaStream: vi.fn(),
    stopStreamingTranscription: vi.fn(),
  }),
}))

vi.mock('@proj-alicization/stage-ui/stores/providers', () => ({
  useProvidersStore: () => ({}),
}))

vi.mock('@proj-alicization/stage-ui/stores/settings', () => ({
  useSettings: () => ({
    stageModelRenderer: { value: 'live2d' },
    stageModelSelectedUrl: { value: '' },
  }),
  useSettingsAudioDevice: () => ({
    stream: { value: null },
    enabled: { value: false },
    askPermission: vi.fn(),
  }),
}))

vi.mock('@proj-alicization/stage-ui/stores/stage-dialogue', () => ({
  useStageDialogueStore: () => ({}),
}))

vi.mock('@proj-alicization/stage-ui/stores/controls-island', () => ({
  useControlsIslandStore: () => ({
    fadeOnHoverEnabled: { value: false },
  }),
}))

vi.mock('@proj-alicization/stage-ui/stores/stage-window-lifecycle', () => ({
  useStageWindowLifecycleStore: () => ({
    stagePaused: { value: false },
  }),
}))

vi.mock('@proj-alicization/stage-ui/stores/window', () => ({
  useWindowStore: () => ({
    live2dLookAtX: { value: 0 },
    live2dLookAtY: { value: 0 },
  }),
}))

vi.mock('@proj-alicization/stage-shared', () => ({
  createLazyBroadcastPoster: () => ({
    close: vi.fn(),
    post: vi.fn(),
  }),
}))

vi.mock('../../shared/eventa', () => ({
  electronMainStageStartupStatusChannel: 'startup-status',
  electronOpenOnboarding: 'open-onboarding',
}))

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
    beforeEach(() => {
      startupMocks.initializeSetupCheck.mockClear()
      startupMocks.needsOnboarding = false
      startupMocks.openOnboarding.mockClear()
      startupMocks.onMountedCallbacks.length = 0
    })

    it('initializes onboarding state before checking whether to open onboarding', async () => {
      await import('./index.vue')

      expect(startupMocks.onMountedCallbacks).toHaveLength(1)

      startupMocks.onMountedCallbacks[0]()

      expect(startupMocks.initializeSetupCheck).toHaveBeenCalledOnce()
      expect(startupMocks.openOnboarding).not.toHaveBeenCalled()
    })

    it('opens onboarding after initialization when onboarding becomes needed', async () => {
      startupMocks.initializeSetupCheck.mockImplementationOnce(() => {
        startupMocks.needsOnboarding = true
      })

      await import('./index.vue')

      expect(startupMocks.onMountedCallbacks).toHaveLength(1)

      startupMocks.onMountedCallbacks[0]()

      expect(startupMocks.initializeSetupCheck).toHaveBeenCalledOnce()
      expect(startupMocks.openOnboarding).toHaveBeenCalledOnce()
    })
  })

})
