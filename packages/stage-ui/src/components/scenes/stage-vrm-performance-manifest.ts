import type {
  VrmActionBinding,
  VrmCustomExpressionBinding,
} from '@proj-alicization/stage-ui-three'

import type {
  AlicizationEmotion,
  CharacterActionCapability,
  CharacterFacialCapability,
} from '../../stores/alicization-bridge'

function dedupeCapabilityItemsByKey<T extends { key: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.key.trim()
    if (!key || seen.has(key))
      return false

    seen.add(key)
    return true
  })
}

export function resolveVrmManifestFacialCapabilities(input: {
  runtimeSupportedFacialCues: CharacterFacialCapability[]
  customExpressionBindings: VrmCustomExpressionBinding[]
  fallbackFacialCues: CharacterFacialCapability[]
}) {
  return dedupeCapabilityItemsByKey([
    ...input.customExpressionBindings.map(item => ({
      key: item.facialKey,
      label: item.label,
      description: item.description,
      source: 'custom' as const,
      affectsMouth: item.affectsMouth,
    })),
    ...(input.runtimeSupportedFacialCues.length > 0
      ? input.runtimeSupportedFacialCues
      : input.fallbackFacialCues),
  ])
}

export function resolveVrmManifestBaseEmotions(input: {
  runtimeSupportedBaseEmotions: AlicizationEmotion[]
  fallbackBaseEmotions: AlicizationEmotion[]
}) {
  const nextBaseEmotions = input.runtimeSupportedBaseEmotions.length > 0
    ? [
        ...input.runtimeSupportedBaseEmotions,
        ...input.fallbackBaseEmotions,
      ]
    : input.fallbackBaseEmotions

  return [...new Set(nextBaseEmotions)]
}

export function resolveVrmManifestActionCapabilities(input: {
  runtimeSupportedActions: CharacterActionCapability[]
  actionBindings: VrmActionBinding[]
}) {
  return dedupeCapabilityItemsByKey([
    ...input.actionBindings.map(item => ({
      key: item.actionKey,
      label: item.label,
      description: item.description,
      source: item.source,
    })),
    ...input.runtimeSupportedActions,
  ])
}
