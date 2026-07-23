export interface AlicizationProjectStateAwarenessFieldsInput {
  identity?: unknown
  currentPhase?: unknown
  phase?: unknown
  latestLandedProgress?: unknown
  landed?: unknown
  primaryOpenLoop?: unknown
  open?: unknown
  nextClosureTarget?: unknown
  next?: unknown
  continuityAnchor?: unknown
  sameHerSelfLine?: unknown
  sameHerHoldDetail?: unknown
  continuityDriftRisk?: unknown
  sameHerDriftRisk?: unknown
  proactiveSameHerGap?: unknown
  emotionalClosureCue?: unknown
  status?: unknown
  summary?: unknown
  visibility?: string
  maxChars?: number
}

/**
 * Project-state awareness was an old governance/prompt channel.
 * Keep the contract during migration, but never create provider or reply text.
 */
export function formatAlicizationProjectStateAwarenessFields(
  _input: AlicizationProjectStateAwarenessFieldsInput,
) {
  return ''
}

export function renderAlicizationProjectStateStructuredBlock(
  _input: AlicizationProjectStateAwarenessFieldsInput,
) {
  return ''
}
