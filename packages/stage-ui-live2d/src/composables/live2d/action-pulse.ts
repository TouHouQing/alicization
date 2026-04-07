export interface Live2DActionPulseBinding {
  actionKey: string
  motionName: string
  motionIndex: number
  label?: string
  description?: string
  source?: string
}

function normalizeActionCue(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80)
}

export function resolveLive2DActionPulseBinding(
  bindings: Iterable<Live2DActionPulseBinding>,
  actionCue?: string | null,
) {
  const normalizedCue = normalizeActionCue(actionCue)
  if (!normalizedCue)
    return undefined

  for (const binding of bindings) {
    if (normalizeActionCue(binding.actionKey) === normalizedCue)
      return binding
  }

  return undefined
}
