const internalClosureMetadataPattern
  = /[\p{L}_][\p{L}\p{N}_-]*\s*=|\b(?:content_withheld|internal-only|internal-structured|renderer-internal)\b/iu
const internalClosureGovernancePattern
  = /\b(?:identity-continuity|phase\s*1|phase1_local_digital_life|project-state|same[- ]her|same living line|one living her|one continuous her|continuity evidence|renderer continuity)\b|同一个\s*her|同一个她|同一条数字生命线|数字生命主线|普通项目播报/iu
const internalClosureCuePattern
  = /structured continuity digest|^(?:active embodiment lanes|pending lanes):|^next,\s*help me close:|^下一步(?:还要继续收住|状态：|：)/iu
const internalClosureRecoveryPattern
  = /(?:same-segment\s+)?(?:body-only|(?:body|face|motion|lipsync|voice)(?:\+(?:body|face|motion|lipsync|voice))+)\s+recovery@segment-[\p{L}\p{N}_-]+/iu

function isStructuredMetadataPayload(line: string) {
  if (!line.startsWith('{') && !line.startsWith('['))
    return false

  try {
    const value: unknown = JSON.parse(line)
    return typeof value === 'object' && value !== null
  }
  catch {
    return false
  }
}

export function normalizeStageClosureVisibleText(
  line: string | null | undefined,
  maxLength = 720,
) {
  const normalized = typeof line === 'string'
    ? line.trim().replace(/\s+/g, ' ')
    : ''

  if (
    !normalized
    || internalClosureMetadataPattern.test(normalized)
    || internalClosureGovernancePattern.test(normalized)
    || internalClosureCuePattern.test(normalized)
    || internalClosureRecoveryPattern.test(normalized)
    || isStructuredMetadataPayload(normalized)
  ) {
    return null
  }

  return normalized.slice(0, maxLength)
}
