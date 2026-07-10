import type {
  AlicizationChatEntryIngest,
  AlicizationChatEntryPreDialogueSendIdentity,
} from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

import {
  assertAlicizationChatEntryPreDialogueSendIdentity,
  sanitizeAlicizationChatEntryPreDialogueSendIdentity,
} from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

export interface DesktopMouseCaptureStateInput {
  fadeOnHoverEnabled: boolean
  hearingDialogOpen: boolean
  insideControls: boolean
  insideDialogueOverlay: boolean
  insideStageRecoveryPanel: boolean
  emergencyPanelHovered: boolean
  isOutsideWindow: boolean
  stageCharacterHovered: boolean
  stageInteractionActive: boolean
  stageCapturePixel: boolean
  stagePaused: boolean
}

export interface DesktopLayoutResetInput {
  live2d: {
    position: { x: number, y: number }
    scale: number
  }
  model: {
    bootstrapCameraDistance: number
    cameraDistance: number
    modelOffset: { x: number, y: number, z: number }
  }
  stageDialogue: {
    resetLayout: () => void
  }
}

export interface StageStartupOnboardingInput {
  initializeSetupCheck: () => void
  needsOnboarding: boolean
  openOnboarding: () => void
}

type DesktopVoiceTurnOrigin = 'ui-user' | 'tool-output' | 'context-recall' | 'system'

export interface DesktopVoiceTurnDispatchInput<
  TPreDialogueSendIdentity = AlicizationChatEntryPreDialogueSendIdentity | null | undefined,
  TChatProvider = unknown,
> {
  text: string
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  preDialogueSendIdentity: TPreDialogueSendIdentity
  origin?: DesktopVoiceTurnOrigin
  ingest: AlicizationChatEntryIngest<AlicizationChatEntryPreDialogueSendIdentity, TChatProvider>
}

export function resolveDesktopMouseCaptureState(input: DesktopMouseCaptureStateInput) {
  const shouldCaptureStagePixels = input.stageCapturePixel && !input.fadeOnHoverEnabled
  const shouldCaptureMouse = input.stagePaused
    || input.hearingDialogOpen
    || input.stageInteractionActive
    || input.insideControls
    || input.insideDialogueOverlay
    || input.insideStageRecoveryPanel
    || input.emergencyPanelHovered
    || shouldCaptureStagePixels

  if (input.stagePaused || input.hearingDialogOpen) {
    return {
      shouldCaptureMouse,
      shouldFadeOnCursorWithin: false,
    }
  }

  return {
    shouldCaptureMouse,
    shouldFadeOnCursorWithin: input.fadeOnHoverEnabled
      && !input.stageInteractionActive
      && !input.insideControls
      && !input.insideDialogueOverlay
      && !input.insideStageRecoveryPanel
      && !input.isOutsideWindow
      && input.stageCharacterHovered,
  }
}

export function resetDesktopLayoutState(input: DesktopLayoutResetInput) {
  input.live2d.position = { x: 0, y: 0 }
  input.live2d.scale = 1
  input.model.modelOffset = { x: 0, y: 0, z: 0 }
  input.model.cameraDistance = input.model.bootstrapCameraDistance > 1e-6
    ? input.model.bootstrapCameraDistance
    : input.model.cameraDistance
  input.stageDialogue.resetLayout()
}

export function runStageStartupOnboardingCheck(input: StageStartupOnboardingInput) {
  input.initializeSetupCheck()
  if (input.needsOnboarding)
    input.openOnboarding()
}

export async function dispatchDesktopVoiceTurn<TPreDialogueSendIdentity, TChatProvider>(
  input: DesktopVoiceTurnDispatchInput<TPreDialogueSendIdentity, TChatProvider>,
) {
  assertAlicizationChatEntryPreDialogueSendIdentity(
    input.preDialogueSendIdentity as AlicizationChatEntryPreDialogueSendIdentity | null | undefined,
    'dispatchDesktopVoiceTurn',
  )
  const preDialogueSendIdentity = sanitizeAlicizationChatEntryPreDialogueSendIdentity(
    input.preDialogueSendIdentity as AlicizationChatEntryPreDialogueSendIdentity,
  )

  return input.ingest(input.text, {
    providerId: input.providerId,
    model: input.model,
    chatProvider: input.chatProvider,
    providerConfig: input.providerConfig,
    preDialogueSendIdentity,
    origin: input.origin,
  })
}
