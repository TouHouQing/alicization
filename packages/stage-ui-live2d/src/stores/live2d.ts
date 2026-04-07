import { resolveStageEmbodimentLive2DMotionAliases } from '@proj-alicization/stage-shared'
import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { useBroadcastChannel } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { Emotion, EMOTION_EmotionMotionName_value } from '../constants/emotions'

type BroadcastChannelEvents
  = | BroadcastChannelEventShouldUpdateView

interface BroadcastChannelEventShouldUpdateView {
  type: 'live2d-should-update-view'
}

export const defaultModelParameters = {
  angleX: 0,
  angleY: 0,
  angleZ: 0,
  leftEyeOpen: 1,
  rightEyeOpen: 1,
  leftEyeSmile: 0,
  rightEyeSmile: 0,
  leftEyebrowLR: 0,
  rightEyebrowLR: 0,
  leftEyebrowY: 0,
  rightEyebrowY: 0,
  leftEyebrowAngle: 0,
  rightEyebrowAngle: 0,
  leftEyebrowForm: 0,
  rightEyebrowForm: 0,
  mouthOpen: 0,
  mouthForm: 0,
  cheek: 0,
  bodyAngleX: 0,
  bodyAngleY: 0,
  bodyAngleZ: 0,
  breath: 0,
}

export interface Live2DAvailableMotion {
  motionName: string
  motionIndex: number
  fileName: string
}

export interface Live2DMotionSelection {
  group: string
  index: number
}

function resolveEmotionMotionName(emotion: Emotion | string) {
  const aliases = resolveStageEmbodimentLive2DMotionAliases(emotion)
  return aliases[0] ?? null
}

function normalizeMotionIdentity(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().toLowerCase()
}

function buildMotionSelectionSignature(motion: Live2DAvailableMotion) {
  return `${normalizeMotionIdentity(motion.motionName)}:${motion.motionIndex}:${normalizeMotionIdentity(motion.fileName)}`
}

function dedupeMotionCandidates(candidates: Live2DAvailableMotion[]) {
  const deduped: Live2DAvailableMotion[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const signature = buildMotionSelectionSignature(candidate)
    if (!signature || seen.has(signature))
      continue
    seen.add(signature)
    deduped.push(candidate)
  }
  return deduped
}

export const useLive2d = defineStore('live2d', () => {
  const { post, data } = useBroadcastChannel<BroadcastChannelEvents, BroadcastChannelEvents>({ name: 'airi-stores-stage-ui-live2d' })
  const shouldUpdateViewHooks = ref(new Set<() => void>())
  const emotionMotionSelectionState = new Map<string, { lastSignature: string, rotationIndex: number }>()

  const onShouldUpdateView = (hook: () => void) => {
    shouldUpdateViewHooks.value.add(hook)
    return () => {
      shouldUpdateViewHooks.value.delete(hook)
    }
  }

  function shouldUpdateView() {
    post({ type: 'live2d-should-update-view' })
    shouldUpdateViewHooks.value.forEach(hook => hook())
  }

  watch(data, (event) => {
    if (event?.type === 'live2d-should-update-view') {
      shouldUpdateViewHooks.value.forEach(hook => hook())
    }
  })

  const position = useLocalStorageManualReset<{ x: number, y: number }>('settings/live2d/position', { x: 0, y: 0 }) // position is relative to the center of the screen, units are %
  const positionInPercentageString = computed(() => ({
    x: `${position.value.x}%`,
    y: `${position.value.y}%`,
  }))
  const currentMotion = useLocalStorageManualReset<{ group: string, index?: number }>('settings/live2d/current-motion', () => ({ group: 'Idle', index: 0 }))
  const availableMotions = useLocalStorageManualReset<Live2DAvailableMotion[]>('settings/live2d/available-motions', () => [])
  const availableMotionsByModel = useLocalStorageManualReset<Record<string, Live2DAvailableMotion[]>>('settings/live2d/available-motions-by-model', () => ({}))
  const motionMap = useLocalStorageManualReset<Record<string, string>>('settings/live2d/motion-map', {})
  const scale = useLocalStorageManualReset('settings/live2d/scale', 1)

  // Live2D model parameters
  const modelParameters = useLocalStorageManualReset<Record<string, number>>('settings/live2d/parameters', defaultModelParameters)

  function normalizeModelId(raw: unknown) {
    return typeof raw === 'string' ? raw.trim() : ''
  }

  function setAvailableMotionsForModel(modelId: string | undefined, motions: Live2DAvailableMotion[]) {
    const normalizedModelId = normalizeModelId(modelId)
    availableMotions.value = motions
    if (!normalizedModelId)
      return

    availableMotionsByModel.value = {
      ...availableMotionsByModel.value,
      [normalizedModelId]: motions,
    }
  }

  function getAvailableMotionsForModel(modelId: string | undefined) {
    const normalizedModelId = normalizeModelId(modelId)
    if (!normalizedModelId)
      return availableMotions.value
    return availableMotionsByModel.value[normalizedModelId] ?? []
  }

  function resolveEmotionMotionCandidates(
    motions: Live2DAvailableMotion[],
    preferredMotionNames: string[],
  ) {
    const normalizedPreferredNames = new Set(
      preferredMotionNames
        .map(name => normalizeMotionIdentity(name))
        .filter(Boolean),
    )
    if (normalizedPreferredNames.size === 0)
      return []

    const mappedCandidates = motions.filter((motion) => {
      return normalizedPreferredNames.has(normalizeMotionIdentity(motionMap.value[motion.fileName]))
    })
    const directCandidates = motions.filter((motion) => {
      return normalizedPreferredNames.has(normalizeMotionIdentity(motion.motionName))
    })
    return dedupeMotionCandidates([
      ...mappedCandidates,
      ...directCandidates,
    ])
  }

  function pickMotionCandidate(selectionKey: string, candidates: Live2DAvailableMotion[]) {
    if (candidates.length === 0)
      return null

    const dedupedCandidates = dedupeMotionCandidates(candidates)
    if (dedupedCandidates.length === 0)
      return null

    const state = emotionMotionSelectionState.get(selectionKey) ?? {
      lastSignature: '',
      rotationIndex: 0,
    }
    const pool = state.lastSignature && dedupedCandidates.length > 1
      ? dedupedCandidates.filter(candidate => buildMotionSelectionSignature(candidate) !== state.lastSignature)
      : dedupedCandidates
    const resolvedPool = pool.length > 0 ? pool : dedupedCandidates
    const index = state.rotationIndex % resolvedPool.length
    const selected = resolvedPool[index] ?? resolvedPool[0] ?? null
    if (!selected)
      return null

    state.rotationIndex += 1
    state.lastSignature = buildMotionSelectionSignature(selected)
    emotionMotionSelectionState.set(selectionKey, state)
    return selected
  }

  function resolveEmotionMotionSelection(
    modelId: string | undefined,
    emotion: Emotion | string,
    options?: {
      preferredMotionAliases?: readonly string[]
    },
  ): Live2DMotionSelection | null {
    const motions = getAvailableMotionsForModel(modelId)
    if (motions.length === 0)
      return null

    const preferredMotionAliases = [
      ...new Set([
        ...(options?.preferredMotionAliases ?? []).map(alias => normalizeMotionIdentity(alias)).filter(Boolean),
        ...resolveStageEmbodimentLive2DMotionAliases(emotion).map(alias => normalizeMotionIdentity(alias)).filter(Boolean),
      ]),
    ]
    const preferredMotionName = preferredMotionAliases[0] ?? resolveEmotionMotionName(emotion)
    if (!preferredMotionName || preferredMotionAliases.length === 0)
      return null

    const normalizedModelId = normalizeModelId(modelId) || '__default__'
    const normalizedPreferred = normalizeMotionIdentity(preferredMotionName)
    const normalizedNeutral = normalizeMotionIdentity(EMOTION_EmotionMotionName_value[Emotion.Neutral])
    const selectionKey = `${normalizedModelId}:${normalizedPreferred}`

    const preferredCandidates = resolveEmotionMotionCandidates(motions, preferredMotionAliases)
    const selectedPreferredMotion = pickMotionCandidate(selectionKey, preferredCandidates)
    if (selectedPreferredMotion) {
      return {
        group: selectedPreferredMotion.motionName,
        index: selectedPreferredMotion.motionIndex,
      }
    }

    if (normalizeMotionIdentity(preferredMotionName) === normalizedNeutral)
      return null

    const neutralCandidates = resolveEmotionMotionCandidates(
      motions,
      resolveStageEmbodimentLive2DMotionAliases(Emotion.Neutral),
    )
    const selectedNeutralMotion = pickMotionCandidate(`${normalizedModelId}:${normalizedNeutral}`, neutralCandidates)
    if (!selectedNeutralMotion)
      return null

    return {
      group: selectedNeutralMotion.motionName,
      index: selectedNeutralMotion.motionIndex,
    }
  }

  function resetState() {
    position.reset()
    currentMotion.reset()
    availableMotions.reset()
    availableMotionsByModel.reset()
    motionMap.reset()
    scale.reset()
    modelParameters.reset()
    emotionMotionSelectionState.clear()
    shouldUpdateView()
  }

  return {
    position,
    positionInPercentageString,
    currentMotion,
    availableMotions,
    availableMotionsByModel,
    motionMap,
    scale,
    modelParameters,
    setAvailableMotionsForModel,
    getAvailableMotionsForModel,
    resolveEmotionMotionSelection,

    onShouldUpdateView,
    shouldUpdateView,
    resetState,
  }
})
