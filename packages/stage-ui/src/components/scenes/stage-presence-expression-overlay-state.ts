import type { CSSProperties } from 'vue'

import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'
import type { StageCharacterFrame } from '../../utils'

type PresenceExpression = NonNullable<AlicizationVisualPresenceStateSnapshot['presenceExpression']>
type PresenceExpressionIntensity = PresenceExpression['display']['intensity']

interface Size {
  width: number
  height: number
}

export interface StagePresenceExpressionOverlayState {
  visible: boolean
  text: string
  intensity: PresenceExpressionIntensity
  style: CSSProperties
}

function hiddenStagePresenceExpressionOverlayState(): StagePresenceExpressionOverlayState {
  return {
    visible: false,
    text: '',
    intensity: 'barely-there',
    style: {},
  }
}

function finitePositive(value: number) {
  return Number.isFinite(value) && value > 0
}

function resolveCharacterWidth(frame: StageCharacterFrame) {
  return Math.max(0, frame.right - frame.left)
}

function resolveCharacterHeight(frame: StageCharacterFrame) {
  return Math.max(0, frame.bottom - frame.top)
}

function clampOverlayCoordinate(value: number, max: number) {
  return Math.min(max, Math.max(12, value))
}

export function resolveStagePresenceExpressionOverlayState(input: {
  now: number
  expression: PresenceExpression | null | undefined
  characterFrame: StageCharacterFrame | null | undefined
  hostSize: Size
  dialogueVisible: boolean
  loading: boolean
  streaming: boolean
}): StagePresenceExpressionOverlayState {
  const expression = input.expression
  const text = expression?.text.trim() ?? ''
  if (
    !expression
    || !text
    || expression.display.mode !== 'near-body-whisper'
    || !expression.display.allowAutoShow
    || expression.display.expiresAt <= input.now
    || input.dialogueVisible
    || input.loading
    || input.streaming
    || !input.characterFrame
    || !finitePositive(input.hostSize.width)
    || !finitePositive(input.hostSize.height)
  ) {
    return hiddenStagePresenceExpressionOverlayState()
  }

  const frame = input.characterFrame
  const characterWidth = resolveCharacterWidth(frame)
  const characterHeight = resolveCharacterHeight(frame)
  const left = clampOverlayCoordinate(
    frame.left + characterWidth * 0.58,
    input.hostSize.width - 220,
  )
  const top = clampOverlayCoordinate(
    frame.top + characterHeight * 0.12,
    input.hostSize.height - 96,
  )

  return {
    visible: true,
    text,
    intensity: expression.display.intensity,
    style: {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
    },
  }
}
