import type { StageEmbodimentCanonicalEmotion } from '@proj-alicization/stage-shared'
import type {
  VrmActionBinding,
  VrmCustomExpressionBinding,
  VrmExternalAnimationBinding,
} from '@proj-alicization/stage-ui-three'

import localforage from 'localforage'

import {
  normalizeStageEmbodimentEmotion,
  resolveStageEmbodimentLive2DMotionAliases,
  resolveStageEmbodimentVrmBaseExpressionCandidates,
  stageEmbodimentCanonicalEmotions,
} from '@proj-alicization/stage-shared'
import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'

export interface Live2DActionBinding {
  fileName: string
  motionName: string
  motionIndex: number
  actionKey: string
  label: string
  description: string
  source: 'live2d-motion'
}

type StoredVrmExternalAnimationBinding = Omit<VrmExternalAnimationBinding, 'file'>
type Live2DActionBindingDefaults = Pick<Live2DActionBinding, 'actionKey' | 'label' | 'description'>
type Live2DMotionIdentity = Pick<Live2DActionBinding, 'fileName' | 'motionName' | 'motionIndex'>
export type StageEmbodimentEmotionAliasOverrideMap = Partial<Record<StageEmbodimentCanonicalEmotion, string[]>>

const vrmExternalAnimationStoragePrefix = 'stage-performance:vrm-animation'
const defaultAlicizationLive2DActionBindingSeeds: Record<string, Live2DActionBindingDefaults> = {
  'Idle:0': {
    actionKey: 'idle_gentle_nod',
    label: '轻轻点头',
    description: '轻轻低头再抬起，像在安静回应主人，适合默认待机、温柔附和或乖巧应声。',
  },
  'Idle:1': {
    actionKey: 'idle_surprised_smile',
    label: '惊讶后眯眼笑',
    description: '先露出一点小惊讶，再眯起眼睛甜甜地笑起来，适合听到好消息、被夸奖或轻松接话。',
  },
  'Idle:2': {
    actionKey: 'idle_smile_then_surprised',
    label: '眯眼笑后小惊讶',
    description: '先带着眯眼笑意放松回应，随后像忽然意识到什么般微微一怔，适合可爱发呆或慢半拍反应。',
  },
  'Flick:0': {
    actionKey: 'sway_relaxed',
    label: '悠闲晃身',
    description: '身体轻松地左右摇摆，节奏悠哉，像心情不错时自然晃来晃去，适合闲聊、放松或撒娇。',
  },
  'FlickDown:0': {
    actionKey: 'tsundere_pout',
    label: '羞恼别扭',
    description: '带一点害羞和嘴硬的小情绪，像被说中心事后假装生气，适合傲娇、轻微抗议或被调侃时回应。',
  },
  'FlickUp:0': {
    actionKey: 'cheer_raise_hand',
    label: '开心举手',
    description: '开心地抬手回应，动作轻快明亮，适合答应主人、庆祝成功或主动求表扬。',
  },
  'Tap:0': {
    actionKey: 'shock_freeze',
    label: '震惊发愣',
    description: '像突然被戳到一样明显吃惊，短暂发愣，适合意外、被吓一跳或难以置信的时候。',
  },
  'Tap:1': {
    actionKey: 'raise_hand_excited',
    label: '超开心举手',
    description: '比普通开心更夸张，带着强烈雀跃感举手回应，适合特别高兴、收到惊喜或兴奋庆祝。',
  },
  'Tap@Body:0': {
    actionKey: 'pout_confused',
    label: '惊讶疑惑闷气',
    description: '先露出惊讶与疑惑，随后带点呆萌地小小生闷气，适合委屈抗议、没听懂或被误会时使用。',
  },
  'Flick@Body:0': {
    actionKey: 'disdain_side_glance',
    label: '小嫌弃',
    description: '带一点嫌弃和无语的身体反应，不到真的生气，更像轻轻吐槽、挑剔或不满地哼一声。',
  },
}

function normalizeModelId(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function normalizeCapabilityKey(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80)
}

function normalizeCapabilityText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim().slice(0, 120)
}

function normalizeDescription(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().slice(0, 240)
}

function normalizeEmbodimentAlias(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().slice(0, 80)
}

function normalizeEmbodimentAliasList(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  const aliases = raw
    .map(alias => normalizeEmbodimentAlias(alias))
    .filter(Boolean)

  return [...new Set(aliases)]
}

function cloneEmotionAliasOverrideMap(raw?: StageEmbodimentEmotionAliasOverrideMap | null): StageEmbodimentEmotionAliasOverrideMap {
  const next: StageEmbodimentEmotionAliasOverrideMap = {}

  for (const emotion of stageEmbodimentCanonicalEmotions) {
    const aliases = normalizeEmbodimentAliasList(raw?.[emotion])
    if (aliases.length > 0)
      next[emotion] = aliases
  }

  return next
}

function updateEmotionAliasOverrideMap(
  current: Record<string, StageEmbodimentEmotionAliasOverrideMap>,
  modelId: string,
  emotion: StageEmbodimentCanonicalEmotion,
  aliases: string[],
) {
  const normalizedModelId = normalizeModelId(modelId)
  if (!normalizedModelId)
    return current

  const currentModelOverrides = cloneEmotionAliasOverrideMap(current[normalizedModelId])
  const nextAliases = normalizeEmbodimentAliasList(aliases)
  if (nextAliases.length > 0)
    currentModelOverrides[emotion] = nextAliases
  else
    delete currentModelOverrides[emotion]

  return {
    ...current,
    [normalizedModelId]: currentModelOverrides,
  }
}

function resolveMergedEmotionAliases(
  overrides: StageEmbodimentEmotionAliasOverrideMap | undefined,
  emotion: unknown,
  defaults: (emotion: StageEmbodimentCanonicalEmotion) => string[],
) {
  const normalizedEmotion = normalizeStageEmbodimentEmotion(emotion)
  const preferredAliases = normalizeEmbodimentAliasList(overrides?.[normalizedEmotion])
  return [
    ...new Set([
      ...preferredAliases,
      ...defaults(normalizedEmotion).map(alias => normalizeEmbodimentAlias(alias)).filter(Boolean),
    ]),
  ]
}

function buildLive2DMotionCapabilityKey(motionName: string, motionIndex: number) {
  const normalizedMotionName = normalizeCapabilityText(motionName)
  const normalizedMotionIndex = Number.isFinite(motionIndex) ? Math.max(0, Math.floor(motionIndex)) : Number.NaN
  if (!normalizedMotionName || !Number.isFinite(normalizedMotionIndex))
    return ''

  return `${normalizedMotionName}:${normalizedMotionIndex}`
}

export function getDefaultLive2DActionBindingDefaults(motion: Pick<Live2DActionBinding, 'motionName' | 'motionIndex'>): Live2DActionBindingDefaults | null {
  const key = buildLive2DMotionCapabilityKey(motion.motionName, motion.motionIndex)
  if (!key)
    return null

  return defaultAlicizationLive2DActionBindingSeeds[key] ?? null
}

export function resolveLive2DActionBindingForMotion(
  motion: Live2DMotionIdentity,
  stored?: Partial<Live2DActionBinding> | null,
): Live2DActionBinding | null {
  const defaults = getDefaultLive2DActionBindingDefaults(motion)
  const actionKey = normalizeCapabilityKey(stored?.actionKey) || defaults?.actionKey || ''
  const label = normalizeCapabilityText(stored?.label) || defaults?.label || normalizeCapabilityText(motion.motionName, actionKey)
  const description = normalizeDescription(stored?.description) || defaults?.description || ''

  return normalizeLive2DActionBinding({
    fileName: motion.fileName,
    motionName: motion.motionName,
    motionIndex: motion.motionIndex,
    actionKey,
    label,
    description,
    source: 'live2d-motion',
  })
}

function buildVrmExternalAnimationStorageKey(modelId: string, entryId: string) {
  return `${vrmExternalAnimationStoragePrefix}:${modelId}:${entryId}`
}

function normalizeLive2DActionBinding(raw: Partial<Live2DActionBinding>): Live2DActionBinding | null {
  const fileName = normalizeCapabilityText(raw.fileName)
  const motionName = normalizeCapabilityText(raw.motionName)
  const motionIndex = Number.isFinite(raw.motionIndex) ? Math.max(0, Math.floor(raw.motionIndex!)) : Number.NaN
  const actionKey = normalizeCapabilityKey(raw.actionKey)
  if (!fileName || !motionName || !Number.isFinite(motionIndex) || !actionKey)
    return null

  const label = normalizeCapabilityText(raw.label, actionKey)
  return {
    fileName,
    motionName,
    motionIndex,
    actionKey,
    label,
    description: normalizeDescription(raw.description),
    source: 'live2d-motion',
  }
}

function normalizeVrmExternalAnimationBinding(raw: Partial<StoredVrmExternalAnimationBinding>): StoredVrmExternalAnimationBinding | null {
  const id = normalizeCapabilityText(raw.id)
  const fileName = normalizeCapabilityText(raw.fileName)
  if (!id || !fileName)
    return null

  const importedAt = Number.isFinite(raw.importedAt) ? Math.max(0, Math.floor(raw.importedAt!)) : Date.now()
  return {
    id,
    fileName,
    actionKey: normalizeCapabilityKey(raw.actionKey),
    label: normalizeCapabilityText(raw.label),
    description: normalizeDescription(raw.description),
    importedAt,
    source: 'external-vrma',
  }
}

export function isVrmExternalAnimationConfigured(binding?: Pick<StoredVrmExternalAnimationBinding, 'actionKey' | 'label' | 'description'> | null) {
  if (!binding)
    return false

  return Boolean(
    normalizeCapabilityKey(binding.actionKey)
    && normalizeCapabilityText(binding.label)
    && normalizeDescription(binding.description),
  )
}

function normalizeVrmCustomExpressionBinding(raw: Partial<VrmCustomExpressionBinding>): VrmCustomExpressionBinding | null {
  const expressionName = normalizeCapabilityText(raw.expressionName)
  const facialKey = normalizeCapabilityKey(raw.facialKey)
  if (!expressionName || !facialKey)
    return null

  return {
    expressionName,
    facialKey,
    label: normalizeCapabilityText(raw.label),
    description: normalizeDescription(raw.description),
    affectsMouth: raw.affectsMouth === true,
    source: 'custom',
  }
}

export function isVrmCustomExpressionConfigured(binding?: Pick<VrmCustomExpressionBinding, 'facialKey' | 'label' | 'description'> | null) {
  if (!binding)
    return false

  return Boolean(
    normalizeCapabilityKey(binding.facialKey)
    && normalizeCapabilityText(binding.label)
    && normalizeDescription(binding.description),
  )
}

export const useStagePerformanceStore = defineStore('stage-performance', () => {
  const live2dActionsByModel = useLocalStorageManualReset<Record<string, Live2DActionBinding[]>>('settings/stage-performance/live2d-actions-by-model', {})
  const live2dEmotionMotionAliasesByModel = useLocalStorageManualReset<Record<string, StageEmbodimentEmotionAliasOverrideMap>>('settings/stage-performance/live2d-emotion-motion-aliases-by-model', {})
  const emotionActionCuePreferencesByModel = useLocalStorageManualReset<Record<string, StageEmbodimentEmotionAliasOverrideMap>>('settings/stage-performance/emotion-action-cue-preferences-by-model', {})
  const vrmCustomExpressionNamesByModel = useLocalStorageManualReset<Record<string, string[]>>('settings/stage-performance/vrm-custom-expression-names-by-model', {})
  const vrmCustomExpressionsByModel = useLocalStorageManualReset<Record<string, VrmCustomExpressionBinding[]>>('settings/stage-performance/vrm-custom-expressions-by-model', {})
  const vrmEmotionExpressionAliasesByModel = useLocalStorageManualReset<Record<string, StageEmbodimentEmotionAliasOverrideMap>>('settings/stage-performance/vrm-emotion-expression-aliases-by-model', {})
  const vrmEmotionFacialCuePreferencesByModel = useLocalStorageManualReset<Record<string, StageEmbodimentEmotionAliasOverrideMap>>('settings/stage-performance/vrm-emotion-facial-cue-preferences-by-model', {})
  const vrmExternalAnimationsByModel = useLocalStorageManualReset<Record<string, StoredVrmExternalAnimationBinding[]>>('settings/stage-performance/vrm-external-animations-by-model', {})

  function listLive2DActions(modelId: string) {
    return live2dActionsByModel.value[normalizeModelId(modelId)] ?? []
  }

  function upsertLive2DAction(modelId: string, raw: Partial<Live2DActionBinding>) {
    const normalizedModelId = normalizeModelId(modelId)
    if (!normalizedModelId)
      return

    const next = normalizeLive2DActionBinding(raw)
    if (!next)
      return

    const current = listLive2DActions(normalizedModelId)
    live2dActionsByModel.value = {
      ...live2dActionsByModel.value,
      [normalizedModelId]: [
        ...current.filter(item => item.fileName !== next.fileName),
        next,
      ].sort((left, right) => left.fileName.localeCompare(right.fileName)),
    }
  }

  function removeLive2DAction(modelId: string, fileName: string) {
    const normalizedModelId = normalizeModelId(modelId)
    const normalizedFileName = normalizeCapabilityText(fileName)
    if (!normalizedModelId || !normalizedFileName)
      return

    const current = listLive2DActions(normalizedModelId)
    live2dActionsByModel.value = {
      ...live2dActionsByModel.value,
      [normalizedModelId]: current.filter(item => item.fileName !== normalizedFileName),
    }
  }

  function resolveLive2DActionByCue(modelId: string, actionCue?: string | null) {
    const cue = normalizeCapabilityKey(actionCue)
    if (!cue)
      return undefined
    return listLive2DActions(modelId).find(item => item.actionKey === cue)
  }

  function listLive2DEmotionMotionAliases(modelId: string) {
    return cloneEmotionAliasOverrideMap(live2dEmotionMotionAliasesByModel.value[normalizeModelId(modelId)])
  }

  function setLive2DEmotionMotionAliases(modelId: string, emotion: StageEmbodimentCanonicalEmotion | string, aliases: string[]) {
    const normalizedEmotion = normalizeStageEmbodimentEmotion(emotion)
    live2dEmotionMotionAliasesByModel.value = updateEmotionAliasOverrideMap(
      live2dEmotionMotionAliasesByModel.value,
      modelId,
      normalizedEmotion,
      aliases,
    )
  }

  function resolveLive2DEmotionMotionAliases(modelId: string, emotion: StageEmbodimentCanonicalEmotion | string) {
    return resolveMergedEmotionAliases(
      listLive2DEmotionMotionAliases(modelId),
      emotion,
      normalizedEmotion => resolveStageEmbodimentLive2DMotionAliases(normalizedEmotion),
    )
  }

  function listEmotionActionCuePreferences(modelId: string) {
    return cloneEmotionAliasOverrideMap(emotionActionCuePreferencesByModel.value[normalizeModelId(modelId)])
  }

  function setEmotionActionCuePreferences(modelId: string, emotion: StageEmbodimentCanonicalEmotion | string, cues: string[]) {
    const normalizedEmotion = normalizeStageEmbodimentEmotion(emotion)
    emotionActionCuePreferencesByModel.value = updateEmotionAliasOverrideMap(
      emotionActionCuePreferencesByModel.value,
      modelId,
      normalizedEmotion,
      cues,
    )
  }

  function listVrmCustomExpressionNames(modelId: string) {
    return vrmCustomExpressionNamesByModel.value[normalizeModelId(modelId)] ?? []
  }

  function setVrmCustomExpressionNames(modelId: string, names: string[]) {
    const normalizedModelId = normalizeModelId(modelId)
    if (!normalizedModelId)
      return

    const nextNames = [...new Set(
      names
        .map(name => normalizeCapabilityText(name))
        .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right))

    vrmCustomExpressionNamesByModel.value = {
      ...vrmCustomExpressionNamesByModel.value,
      [normalizedModelId]: nextNames,
    }
  }

  function listVrmCustomExpressions(modelId: string) {
    return vrmCustomExpressionsByModel.value[normalizeModelId(modelId)] ?? []
  }

  function upsertVrmCustomExpression(modelId: string, raw: Partial<VrmCustomExpressionBinding>) {
    const normalizedModelId = normalizeModelId(modelId)
    if (!normalizedModelId)
      return

    const next = normalizeVrmCustomExpressionBinding(raw)
    if (!next)
      return

    const current = listVrmCustomExpressions(normalizedModelId)
    vrmCustomExpressionsByModel.value = {
      ...vrmCustomExpressionsByModel.value,
      [normalizedModelId]: [
        ...current.filter(item => item.expressionName !== next.expressionName),
        next,
      ].sort((left, right) => left.expressionName.localeCompare(right.expressionName)),
    }
  }

  function removeVrmCustomExpression(modelId: string, expressionName: string) {
    const normalizedModelId = normalizeModelId(modelId)
    const normalizedExpressionName = normalizeCapabilityText(expressionName)
    if (!normalizedModelId || !normalizedExpressionName)
      return

    const current = listVrmCustomExpressions(normalizedModelId)
    vrmCustomExpressionsByModel.value = {
      ...vrmCustomExpressionsByModel.value,
      [normalizedModelId]: current.filter(item => item.expressionName !== normalizedExpressionName),
    }
  }

  function resolveVrmCustomExpressionByCue(modelId: string, facialCue?: string | null) {
    const cue = normalizeCapabilityKey(facialCue)
    if (!cue)
      return undefined
    return listVrmCustomExpressions(modelId).find(item => item.facialKey === cue && isVrmCustomExpressionConfigured(item))
  }

  function listVrmEmotionExpressionAliases(modelId: string) {
    return cloneEmotionAliasOverrideMap(vrmEmotionExpressionAliasesByModel.value[normalizeModelId(modelId)])
  }

  function setVrmEmotionExpressionAliases(modelId: string, emotion: StageEmbodimentCanonicalEmotion | string, aliases: string[]) {
    const normalizedEmotion = normalizeStageEmbodimentEmotion(emotion)
    vrmEmotionExpressionAliasesByModel.value = updateEmotionAliasOverrideMap(
      vrmEmotionExpressionAliasesByModel.value,
      modelId,
      normalizedEmotion,
      aliases,
    )
  }

  function resolveVrmEmotionExpressionAliases(modelId: string, emotion: StageEmbodimentCanonicalEmotion | string) {
    return resolveMergedEmotionAliases(
      listVrmEmotionExpressionAliases(modelId),
      emotion,
      normalizedEmotion => resolveStageEmbodimentVrmBaseExpressionCandidates(normalizedEmotion),
    )
  }

  function listVrmEmotionFacialCuePreferences(modelId: string) {
    return cloneEmotionAliasOverrideMap(vrmEmotionFacialCuePreferencesByModel.value[normalizeModelId(modelId)])
  }

  function setVrmEmotionFacialCuePreferences(modelId: string, emotion: StageEmbodimentCanonicalEmotion | string, cues: string[]) {
    const normalizedEmotion = normalizeStageEmbodimentEmotion(emotion)
    vrmEmotionFacialCuePreferencesByModel.value = updateEmotionAliasOverrideMap(
      vrmEmotionFacialCuePreferencesByModel.value,
      modelId,
      normalizedEmotion,
      cues,
    )
  }

  function listVrmExternalAnimations(modelId: string) {
    return vrmExternalAnimationsByModel.value[normalizeModelId(modelId)] ?? []
  }

  async function importVrmExternalAnimation(
    modelId: string,
    file: File,
    config?: {
      actionKey?: string
      label?: string
      description?: string
    },
  ) {
    const normalizedModelId = normalizeModelId(modelId)
    if (!normalizedModelId)
      throw new Error('Missing VRM model id for external animation import.')

    const id = nanoid()
    const next = normalizeVrmExternalAnimationBinding({
      id,
      fileName: file.name,
      actionKey: config?.actionKey ?? '',
      label: config?.label ?? '',
      description: config?.description ?? '',
      importedAt: Date.now(),
      source: 'external-vrma',
    })

    if (!next)
      throw new Error('Invalid VRM external animation metadata.')

    await localforage.setItem(buildVrmExternalAnimationStorageKey(normalizedModelId, id), file)

    const current = listVrmExternalAnimations(normalizedModelId)
    vrmExternalAnimationsByModel.value = {
      ...vrmExternalAnimationsByModel.value,
      [normalizedModelId]: [...current, next].sort((left, right) => right.importedAt - left.importedAt),
    }

    return next
  }

  async function updateVrmExternalAnimation(modelId: string, entryId: string, patch: Partial<StoredVrmExternalAnimationBinding>) {
    const normalizedModelId = normalizeModelId(modelId)
    const normalizedEntryId = normalizeCapabilityText(entryId)
    if (!normalizedModelId || !normalizedEntryId)
      return

    const current = listVrmExternalAnimations(normalizedModelId)
    const updated = current.map((item) => {
      if (item.id !== normalizedEntryId)
        return item
      return normalizeVrmExternalAnimationBinding({
        ...item,
        ...patch,
      }) ?? item
    })

    vrmExternalAnimationsByModel.value = {
      ...vrmExternalAnimationsByModel.value,
      [normalizedModelId]: updated,
    }
  }

  async function removeVrmExternalAnimation(modelId: string, entryId: string) {
    const normalizedModelId = normalizeModelId(modelId)
    const normalizedEntryId = normalizeCapabilityText(entryId)
    if (!normalizedModelId || !normalizedEntryId)
      return

    await localforage.removeItem(buildVrmExternalAnimationStorageKey(normalizedModelId, normalizedEntryId)).catch(() => {})

    const current = listVrmExternalAnimations(normalizedModelId)
    vrmExternalAnimationsByModel.value = {
      ...vrmExternalAnimationsByModel.value,
      [normalizedModelId]: current.filter(item => item.id !== normalizedEntryId),
    }
  }

  async function resolveVrmExternalAnimations(
    modelId: string,
    options?: {
      configuredOnly?: boolean
    },
  ): Promise<VrmActionBinding[]> {
    const normalizedModelId = normalizeModelId(modelId)
    if (!normalizedModelId)
      return []

    const current = (options?.configuredOnly
      ? listVrmExternalAnimations(normalizedModelId).filter(item => isVrmExternalAnimationConfigured(item))
      : listVrmExternalAnimations(normalizedModelId))
    const resolved = await Promise.all(current.map(async (item) => {
      const file = await localforage.getItem<File>(buildVrmExternalAnimationStorageKey(normalizedModelId, item.id)).catch(() => null)
      if (!file)
        return null

      return {
        ...item,
        file,
      } satisfies VrmExternalAnimationBinding
    }))

    const withFiles = resolved.filter((item): item is NonNullable<typeof item> => Boolean(item))
    return withFiles
  }

  function resolveVrmExternalAnimationByCue(modelId: string, actionCue?: string | null) {
    const cue = normalizeCapabilityKey(actionCue)
    if (!cue)
      return undefined
    return listVrmExternalAnimations(modelId).find(item => item.actionKey === cue)
  }

  return {
    live2dActionsByModel,
    live2dEmotionMotionAliasesByModel,
    emotionActionCuePreferencesByModel,
    vrmCustomExpressionNamesByModel,
    vrmCustomExpressionsByModel,
    vrmEmotionExpressionAliasesByModel,
    vrmEmotionFacialCuePreferencesByModel,
    vrmExternalAnimationsByModel,
    listLive2DActions,
    upsertLive2DAction,
    removeLive2DAction,
    resolveLive2DActionByCue,
    listLive2DEmotionMotionAliases,
    setLive2DEmotionMotionAliases,
    resolveLive2DEmotionMotionAliases,
    listEmotionActionCuePreferences,
    setEmotionActionCuePreferences,
    listVrmCustomExpressionNames,
    setVrmCustomExpressionNames,
    listVrmCustomExpressions,
    upsertVrmCustomExpression,
    removeVrmCustomExpression,
    resolveVrmCustomExpressionByCue,
    listVrmEmotionExpressionAliases,
    setVrmEmotionExpressionAliases,
    resolveVrmEmotionExpressionAliases,
    listVrmEmotionFacialCuePreferences,
    setVrmEmotionFacialCuePreferences,
    listVrmExternalAnimations,
    importVrmExternalAnimation,
    updateVrmExternalAnimation,
    removeVrmExternalAnimation,
    resolveVrmExternalAnimations,
    resolveVrmExternalAnimationByCue,
  }
})
