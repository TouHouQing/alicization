import { containsAlicizationFixedTemplateResidue } from './alicization-fixed-template-sanitizer'

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

function normalizeProjectStateAwarenessValue(key: string, raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''

  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
  if (!normalized)
    return ''

  const keyPrefixPattern = new RegExp(`^${key}\\s*=\\s*`, 'iu')
  const withoutDuplicatedKey = keyPrefixPattern.test(normalized)
    ? normalized.replace(keyPrefixPattern, '').split('|')[0]?.trim() ?? ''
    : normalized
  if (/\b[a-z][\w-]+\s*=/iu.test(withoutDuplicatedKey))
    return ''

  const lower = withoutDuplicatedKey.toLowerCase()
  const carriesRawFixedTemplateResidue = containsAlicizationFixedTemplateResidue(withoutDuplicatedKey)
  if (carriesRawFixedTemplateResidue)
    return ''

  const factSafe = withoutDuplicatedKey
    .replace(/\bone same-her line\b/giu, 'one continuity line')
    .replace(/\bsame-her line\b/giu, 'continuity line')
    .replace(/\bsame living Phase\s*1 line\b/giu, 'continuity line')
    .replace(/\bsame Phase\s*1 living line\b/giu, 'continuity line')
    .replace(/\bsame living line\b/giu, 'continuity line')
    .replace(/\bproject-aware living line\b/giu, 'continuity line')
    .replace(/\bliving line\b/giu, 'continuity line')
    .replace(/\bsame digital life line\b/giu, 'continuity line')
    .replace(/同一个\s*her/giu, 'continuity identity')
    .replace(/同一个她/gu, 'continuity identity')
    .replace(/数字生命主线/gu, 'local desktop continuity')
    .replace(/数字生命项目/gu, 'local desktop continuity')
    .replace(/\bone-continuous-her\b/giu, 'project state continuity')
    .replace(/\bcross-modal same-her proof\b/giu, 'cross-modal continuity proof')
    .replace(/\bsame-her proof\b/giu, 'continuity proof')
    .replace(/\bsame-her closure seam\b/giu, 'continuity closure')
    .replace(/\bsame-her closure\b/giu, 'continuity closure')
    .replace(/\bsame-her\b/giu, 'continuity identity')
    .replace(/\bsame her\b/giu, 'continuity identity')
    .replace(/^Keep extending\s+/iu, 'extend ')
  const carriesNeutralizedTemplateResidue = /\b(?:continuity_identity|continuity_line|local_desktop_life_loop|project_state_continuity|continuity identity|continuity line|local desktop continuity|project state continuity)\b/iu.test(factSafe)
    && /\b(?:should|needs?|must|keep|rather than|before|after|reopen|widen|follow-through|drift|preserved closure)\b/iu.test(factSafe)
  if (carriesNeutralizedTemplateResidue)
    return ''

  if (key === 'identity' && (
    /\balicization is .*local-first digital life\b/iu.test(factSafe)
    || /\balicization is .*local-first digital life\b/iu.test(withoutDuplicatedKey)
    || /\blocal_desktop_life_loop\b/iu.test(factSafe)
    || /本地优先数字生命项目|数字生命项目/u.test(withoutDuplicatedKey)
    || /phase1_local_digital_life/u.test(factSafe)
  )) {
    return ''
  }

  if (
    key === 'phase'
    && (
      /\bphase\s*1\b|\blocal digital life\b|第一阶段|阶段一|project_phase=life_core/iu.test(factSafe)
      || /\bphase\s*1\b|\blocal digital life\b|第一阶段|阶段一|project_phase=life_core/iu.test(withoutDuplicatedKey)
      || /^phase1_local_digital_life(?:\b|;)/iu.test(withoutDuplicatedKey)
      || /\bphase1_local_digital_life(?:_anchor)?\b/iu.test(withoutDuplicatedKey)
      || /^local_desktop_life_loop(?:\b|[.;])/iu.test(withoutDuplicatedKey)
    )
  ) {
    return ''
  }

  if (!['open', 'next', 'continuity_drift_risk', 'continuity_hold', 'emotional_closure'].includes(key)) {
    const structuredEmbodimentFact = extractStructuredEmbodimentFact(lower)
    if (structuredEmbodimentFact && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe)))
      return ''
  }

  if (key === 'open' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    return ''
  }

  if (key === 'next' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    return ''
  }

  if (key === 'continuity_anchor') {
    const structuredAnchor = factSafe.split('|')[0]?.trim() ?? ''
    if (/^phase1_local_digital_life(?:\b|;)/iu.test(structuredAnchor))
      return ''
    if (/\bphase1_local_digital_life(?:_anchor)?\b/iu.test(structuredAnchor))
      return ''
    if (/\blocal_desktop_life_loop\b/iu.test(structuredAnchor))
      return ''
    if (/^continuity_anchor\s*=/iu.test(normalized) && structuredAnchor)
      return structuredAnchor
    if (
      (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)
      && (/phase\s*1|local[- ]first|digital life|数字生命/u.test(lower)
        || /local_desktop_life_loop|project_state_continuity|continuity_identity|continuity_line|project state continuity|continuity identity|continuity line/u.test(factSafe))
    ) {
      return ''
    }
  }

  if (key === 'continuity_hold' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe))) {
    return ''
  }

  if (key === 'continuity_drift_risk' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    if (/detached project-status shell|detached project status shell|project-status shell|project status shell/u.test(lower)
      || /detached project-status shell|detached project status shell|project-status shell|project status shell/u.test(factSafe)) {
      return 'detached project-status shell risk'
    }
    if (/generic assistant|generic project|generic guidance|generic shell|generic task shell|generic status narration|status narration|status recap|project-summary voice|project summary voice/u.test(lower)
      || /generic assistant|generic project|generic guidance|generic shell|generic task shell|generic status narration|status narration|status recap|project-summary voice|project summary voice/u.test(factSafe)) {
      return 'generic shell risk'
    }
    return 'continuity residue risk'
  }

  if (key === 'initiative_gap' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    return ''
  }

  if (key === 'emotional_closure' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe))) {
    return ''
  }

  if (
    carriesRawFixedTemplateResidue
    || carriesNeutralizedTemplateResidue
    || containsAlicizationFixedTemplateResidue(factSafe)
    || /\bSame Phase 1 digital life\b/iu.test(factSafe)
    || /^Before (?:answering|speaking|acting)\b/iu.test(factSafe)
    || /\bWhat has already landed is\b/iu.test(factSafe)
    || /\bThe still-open closure is\b/iu.test(factSafe)
    || /\bThis reply should keep moving toward\b/iu.test(factSafe)
    || /\bsame-her (?:hold|carry|line|closure|strategy)\s*[:=]/iu.test(factSafe)
    || /\bsame_her(?:\b|_)/iu.test(factSafe)
    || /^same digital life\s*\|\s*keep(?: the)?(?: desktop)? closure(?: seam| line)? explicit\b/iu.test(factSafe)
  ) {
    return ''
  }

  return factSafe
}

function extractStructuredEmbodimentFact(lower: string) {
  const mentionedLanes = [
    /\bbody\b|身体/u.test(lower) ? 'body' : '',
    /\bface\b|表情/u.test(lower) ? 'face' : '',
    /\bmotion\b|动作/u.test(lower) ? 'motion' : '',
    /\blipsync\b|lip sync|唇型/u.test(lower) ? 'lipsync' : '',
    /\bvoice\b|声音/u.test(lower) ? 'voice' : '',
  ].filter(Boolean)
  if (!mentionedLanes.length)
    return ''

  const pendingSource = lower.match(/(?:while|but)\s+([^.!?。]+?)\s+(?:need|needs|still need|still needs|还要|需要)\s+(?:to\s+)?(?:rejoin|close|接回|闭环)/u)?.[1] ?? ''
  const pendingLanes = [
    /\bbody\b|身体/u.test(pendingSource) ? 'body' : '',
    /\bface\b|表情/u.test(pendingSource) ? 'face' : '',
    /\bmotion\b|动作/u.test(pendingSource) ? 'motion' : '',
    /\blipsync\b|lip sync|唇型/u.test(pendingSource) ? 'lipsync' : '',
    /\bvoice\b|声音/u.test(pendingSource) ? 'voice' : '',
  ].filter(Boolean)
  const activeLanes = mentionedLanes.filter(lane => !pendingLanes.includes(lane))
  const status = /already locked|already rejoined|already.*together|已经.*接/u.test(lower)
    ? 'rejoined'
    : pendingLanes.length
      ? 'pending rejoin'
      : 'partial'

  const activeLaneLabel = (activeLanes.length ? activeLanes : mentionedLanes).join(' + ')
  const pendingLaneLabel = pendingLanes.length ? pendingLanes.join(' + ') : ''
  return [
    `Embodiment lanes: ${activeLaneLabel}.`,
    pendingLaneLabel ? `Pending lanes: ${pendingLaneLabel}.` : '',
    `Status: ${status}.`,
  ].filter(Boolean).join(' ')
}

function projectStateAwarenessLabel(key: string) {
  switch (key) {
    case 'identity':
      return 'Identity'
    case 'currentPhase':
      return 'Current phase'
    case 'landed':
      return 'Latest landed progress'
    case 'open':
      return 'Primary open loop'
    case 'next':
      return 'Next closure target'
    case 'continuityAnchor':
      return 'Continuity anchor'
    case 'status':
      return 'Status'
    case 'summary':
      return 'Summary'
    default:
      return key.replace(/_/gu, ' ')
  }
}

function projectStateAwarenessField(key: string, value: unknown, maxChars: number) {
  const normalized = normalizeProjectStateAwarenessValue(key, value, maxChars)
  const text = normalized.replace(/[.。!！?？]+$/u, '')
  return text ? `${projectStateAwarenessLabel(key)}: ${text}.` : ''
}

export function formatAlicizationProjectStateAwarenessFields(
  input: AlicizationProjectStateAwarenessFieldsInput,
) {
  const maxChars = Number.isFinite(input.maxChars)
    ? Math.max(80, Math.min(2400, Number(input.maxChars)))
    : 800
  const latestLandedProgress = input.latestLandedProgress ?? input.landed
  const primaryOpenLoop = input.primaryOpenLoop ?? input.open
  const nextClosureTarget = input.nextClosureTarget ?? input.next

  return [
    projectStateAwarenessField('identity', input.identity, maxChars),
    projectStateAwarenessField('currentPhase', input.currentPhase, maxChars),
    projectStateAwarenessField('landed', latestLandedProgress, maxChars),
    projectStateAwarenessField('open', primaryOpenLoop, maxChars),
    projectStateAwarenessField('next', nextClosureTarget, maxChars),
    projectStateAwarenessField('continuityAnchor', input.continuityAnchor, maxChars),
    projectStateAwarenessField('status', input.status, maxChars),
    projectStateAwarenessField('summary', input.summary, maxChars),
  ].filter(Boolean).join(' ')
}

export function renderAlicizationProjectStateStructuredBlock(
  input: AlicizationProjectStateAwarenessFieldsInput,
) {
  const facts = formatAlicizationProjectStateAwarenessFields(input)
  if (!facts)
    return ''

  return [
    'Relevant continuity context:',
    facts,
  ].join('\n')
}
