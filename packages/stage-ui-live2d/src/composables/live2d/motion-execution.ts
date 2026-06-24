import type {
  AlicizationDialogueEmbodimentRendererHints,
  AlicizationDialogueSpeechRendererSettleHints,
} from '@proj-alicization/stage-shared'
import type { ComputedRef } from 'vue'

import { computed, shallowRef } from 'vue'

export interface Live2DMotionExecutionCueSnapshot {
  id?: string | null
  emotion?: string | null
  facialCue?: string | null
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  rendererSettle?: AlicizationDialogueSpeechRendererSettleHints | null
}

export interface Live2DMotionExecutionState {
  group: string | null
  index: number | null
  segmentId: string | null
  cue: Live2DMotionExecutionCueSnapshot | null
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeIndex(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Math.max(0, Math.floor(Number(value)))
}

export function createIdleLive2DMotionExecutionState(): Live2DMotionExecutionState {
  return {
    group: null,
    index: null,
    segmentId: null,
    cue: null,
  }
}

function cloneMotionExecutionCue(
  cue: Live2DMotionExecutionCueSnapshot | null | undefined,
): Live2DMotionExecutionCueSnapshot | null {
  if (!cue)
    return null

  return {
    id: normalizeText(cue.id) || null,
    emotion: normalizeText(cue.emotion) || null,
    facialCue: normalizeText(cue.facialCue) || null,
    rendererHints: cue.rendererHints
      ? {
          ...cue.rendererHints,
          preferredExpressionAliases: cue.rendererHints.preferredExpressionAliases
            ? [...cue.rendererHints.preferredExpressionAliases]
            : undefined,
          preferredMotionAliases: cue.rendererHints.preferredMotionAliases
            ? [...cue.rendererHints.preferredMotionAliases]
            : undefined,
          reasonTags: cue.rendererHints.reasonTags
            ? [...cue.rendererHints.reasonTags]
            : undefined,
        }
      : null,
    rendererSettle: cue.rendererSettle
      ? { ...cue.rendererSettle }
      : null,
  }
}

export function resolveLive2DMotionExecutionState(input: {
  group?: string | null
  index?: number | null
  segmentId?: string | null
  cue?: Live2DMotionExecutionCueSnapshot | null
}) {
  const group = normalizeText(input.group)
  const index = normalizeIndex(input.index)
  if (!group || index == null)
    return createIdleLive2DMotionExecutionState()

  return {
    group,
    index,
    segmentId: normalizeText(input.segmentId) || null,
    cue: cloneMotionExecutionCue(input.cue),
  }
}

export function createLive2DMotionExecutionStateController() {
  const state = shallowRef<Live2DMotionExecutionState>(
    createIdleLive2DMotionExecutionState(),
  )

  function handleMotionStart(
    group: string,
    index?: number,
    segmentId?: string | null,
    cue?: Live2DMotionExecutionCueSnapshot | null,
  ) {
    state.value = resolveLive2DMotionExecutionState({
      group,
      index,
      segmentId,
      cue,
    })
  }

  function handleMotionFinish() {
    state.value = createIdleLive2DMotionExecutionState()
  }

  function reset() {
    state.value = createIdleLive2DMotionExecutionState()
  }

  return {
    state: computed(() => state.value) as ComputedRef<Live2DMotionExecutionState>,
    handleMotionFinish,
    handleMotionStart,
    reset,
  }
}
