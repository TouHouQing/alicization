import type { CharacterActionCapability } from '../../stores/alicization-bridge'

const live2dManifestFallbackActionCapabilities: CharacterActionCapability[] = [
  {
    key: 'steady_focus',
    label: 'Steady Focus',
    description: 'steady focused idle hold',
    source: 'builtin',
  },
  {
    key: 'observe_focus',
    label: 'Observe Focus',
    description: 'gentle observe focus',
    source: 'builtin',
  },
  {
    key: 'idle_settle',
    label: 'Idle Settle',
    description: 'quiet idle settle',
    source: 'builtin',
  },
]

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

export function resolveLive2DManifestActionCapabilities(input: {
  motionCapabilities: CharacterActionCapability[]
  runtimeSupportedActions: CharacterActionCapability[]
}) {
  return dedupeCapabilityItemsByKey([
    ...input.motionCapabilities,
    ...input.runtimeSupportedActions,
    ...live2dManifestFallbackActionCapabilities.map(item => ({ ...item })),
  ])
}
