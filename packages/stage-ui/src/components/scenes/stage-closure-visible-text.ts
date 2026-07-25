const internalClosureMarkerPattern
  = /\b(?:content_withheld|fixed-template-excluded|internal-only|internal response policy|internal-structured|renderer-internal)\b/iu
const internalClosureTokenLinePattern
  = /^(?:continuity evidence|identity-continuity(?:-[\w-]+)?|one continuous her|one living her|phase1_local_digital_life|project-state|renderer continuity|same living line|same-her|phase\s*1\s+same-her\s+identity-continuity|同一个\s*her|同一个她|同一条数字生命线|数字生命主线|普通项目播报)$/iu
const internalClosureCuePattern
  = /^(?:structured continuity digest\.?|(?:active embodiment lanes|pending lanes):|next,\s*help me close:|下一步(?:还要继续收住|状态：|：))/iu
const internalClosureRecoveryPattern
  = /\b(?:recovery|rejoin)@[\p{L}\p{N}_:+-]+(?=$|[\s|;,，；。])/iu
const internalClosureFieldPattern
  = /^[\p{L}_][\p{L}\p{N}_-]*\s*=\s*(?:[\p{L}\p{N}_./:+-]+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')$/u
const internalClosureKnownFieldPattern
  = /^(?:content|continuity|continuity_anchor|embodiment_lanes|focus|lane|memory-tuning-advice|missing_lanes|next|owner|pending|pending[_-]rejoin|project|project_anchor|reason|signature|source|status|surface|visibility)\s*=/iu
const internalClosureLabelPattern
  = /^(?:debug|details?|diagnostic|internal|meta(?:data)?|说明|详情|诊断|内部)\s*[:：]\s*/iu

function findTopLevelJsonArrayEnd(line: string) {
  if (!line.startsWith('['))
    return -1

  let depth = 0
  let quote: '"' | null = null
  let escaped = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (quote) {
      if (escaped) {
        escaped = false
      }
      else if (character === '\\') {
        escaped = true
      }
      else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '"') {
      quote = character
      continue
    }

    if (character === '[') {
      depth += 1
      continue
    }

    if (character === ']') {
      depth -= 1
      if (depth === 0)
        return index
    }
  }

  return -1
}

function isStructuredMetadataPayload(line: string) {
  try {
    JSON.parse(line)
    return true
  }
  catch {
    const closingBracketIndex = findTopLevelJsonArrayEnd(line)
    if (
      closingBracketIndex > 0
      && /^\s+\S/u.test(line.slice(closingBracketIndex + 1))
    ) {
      try {
        const prefix = JSON.parse(line.slice(0, closingBracketIndex + 1))
        return Array.isArray(prefix)
          && (prefix.length !== 1 || typeof prefix[0] !== 'number')
      }
      catch {
        const label = line.slice(1, closingBracketIndex).trim()
        return !/^[\p{L}\p{N}\s._:+/-]+$/u.test(label)
      }
    }

    const arrayPayload = line.startsWith('[')
      ? line.slice(1).trimStart()
      : ''

    return /^\{\s*"/u.test(line)
      || ['"', '[', '{'].includes(arrayPayload[0] ?? '')
      || /^-?\d/u.test(arrayPayload)
      || /^(?:false|null|true)(?:\s*[,}\]]|$)/u.test(arrayPayload)
  }
}

function splitStructuredMetadataSegments(payload: string) {
  const segments: string[] = []
  let segmentStart = 0
  let quote: '"' | '\'' | null = null
  let escaped = false

  for (let index = 0; index < payload.length; index += 1) {
    const character = payload[index]
    if (quote) {
      if (escaped) {
        escaped = false
      }
      else if (character === '\\') {
        escaped = true
      }
      else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '"' || character === '\'') {
      quote = character
      continue
    }

    if (';,|，；'.includes(character)) {
      segments.push(payload.slice(segmentStart, index).trim())
      segmentStart = index + 1
    }
  }

  segments.push(payload.slice(segmentStart).trim())
  return segments.filter(Boolean)
}

function isStructuredMetadataLine(line: string) {
  const payload = line.replace(internalClosureLabelPattern, '').trim()
  if (!payload)
    return false
  if (internalClosureKnownFieldPattern.test(payload))
    return true
  if (internalClosureFieldPattern.test(payload))
    return true

  const segments = splitStructuredMetadataSegments(payload)

  return segments.length > 1
    && segments.every(segment =>
      internalClosureFieldPattern.test(segment)
      || internalClosureKnownFieldPattern.test(segment),
    )
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
    || internalClosureMarkerPattern.test(normalized)
    || internalClosureTokenLinePattern.test(normalized)
    || internalClosureCuePattern.test(normalized)
    || internalClosureRecoveryPattern.test(normalized)
    || isStructuredMetadataPayload(normalized)
    || isStructuredMetadataLine(normalized)
  ) {
    return null
  }

  return normalized.slice(0, maxLength)
}
