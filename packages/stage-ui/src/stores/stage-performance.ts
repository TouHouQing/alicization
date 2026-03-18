import type {
  VrmActionBinding,
  VrmCustomExpressionBinding,
  VrmExternalAnimationBinding,
} from '@proj-alicization/stage-ui-three'

import localforage from 'localforage'

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

const vrmExternalAnimationStoragePrefix = 'stage-performance:vrm-animation'

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
  const vrmCustomExpressionNamesByModel = useLocalStorageManualReset<Record<string, string[]>>('settings/stage-performance/vrm-custom-expression-names-by-model', {})
  const vrmCustomExpressionsByModel = useLocalStorageManualReset<Record<string, VrmCustomExpressionBinding[]>>('settings/stage-performance/vrm-custom-expressions-by-model', {})
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
    vrmCustomExpressionNamesByModel,
    vrmCustomExpressionsByModel,
    vrmExternalAnimationsByModel,
    listLive2DActions,
    upsertLive2DAction,
    removeLive2DAction,
    resolveLive2DActionByCue,
    listVrmCustomExpressionNames,
    setVrmCustomExpressionNames,
    listVrmCustomExpressions,
    upsertVrmCustomExpression,
    removeVrmCustomExpression,
    resolveVrmCustomExpressionByCue,
    listVrmExternalAnimations,
    importVrmExternalAnimation,
    updateVrmExternalAnimation,
    removeVrmExternalAnimation,
    resolveVrmExternalAnimations,
    resolveVrmExternalAnimationByCue,
  }
})
