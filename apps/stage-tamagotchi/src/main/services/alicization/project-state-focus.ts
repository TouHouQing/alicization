function normalizeProjectStateFocusSource(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim().toLowerCase()
    : ''
}

export function deriveCompactProjectStateOpenFocusSummary(
  primaryOpenLoop: unknown,
  options?: {
    emotionalClosureCue?: unknown
  } | null,
) {
  const normalized = normalizeProjectStateFocusSource(primaryOpenLoop)
  const cue = normalizeProjectStateFocusSource(options?.emotionalClosureCue)
  const combined = [normalized, cue].filter(Boolean).join(' ')

  if (!combined)
    return null

  const focus: string[] = []
  if (
    combined.includes('emotion')
    || combined.includes('emotional closure')
    || cue.includes('low-pressure')
    || cue.includes('warmth again')
  ) {
    focus.push('emotion')
  }
  if (combined.includes('memory'))
    focus.push('memory')
  if (combined.includes('initiative'))
    focus.push('initiative')
  if (
    combined.includes('embodiment')
    || combined.includes('cross-modal')
    || combined.includes('visible reply')
    || combined.includes('voice')
    || combined.includes('face')
    || combined.includes('motion')
    || combined.includes('lipsync')
    || combined.includes('resident presence')
  ) {
    focus.push('embodiment')
  }
  if (combined.includes('same-her') || combined.includes('same living line'))
    focus.push('same-line')
  if (combined.includes('closure seam'))
    focus.push('closure-seam')

  return focus.length > 0 ? focus.join('/') : null
}

export function deriveCompactProjectStateNextFocusSummary(
  nextClosureTarget: unknown,
  options?: {
    emotionalClosureCue?: unknown
  } | null,
) {
  const normalized = normalizeProjectStateFocusSource(nextClosureTarget)
  const cue = normalizeProjectStateFocusSource(options?.emotionalClosureCue)
  const combined = [normalized, cue].filter(Boolean).join(' ')

  if (!combined)
    return null

  const focus: string[] = []
  if (combined.includes('project identity carry'))
    focus.push('project-carry')
  if (combined.includes('phase 1'))
    focus.push('phase-1')
  if (combined.includes('measured-return'))
    focus.push('measured-return')
  if (combined.includes('repair-before-closeness'))
    focus.push('repair-before-closeness')
  if (combined.includes('same living line') || combined.includes('same-her'))
    focus.push('same-line')
  if (combined.includes('initiative'))
    focus.push('initiative')
  if (
    combined.includes('embodiment')
    || combined.includes('cross-modal')
    || combined.includes('visible reply')
    || combined.includes('voice')
    || combined.includes('face')
    || combined.includes('motion')
    || combined.includes('lipsync')
    || combined.includes('resident presence')
  ) {
    focus.push('embodiment')
  }

  return focus.length > 0 ? focus.join('/') : null
}
