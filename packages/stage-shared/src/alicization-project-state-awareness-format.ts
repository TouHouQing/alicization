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

  const lower = withoutDuplicatedKey.toLowerCase()
  const carriesRawFixedTemplateResidue = containsAlicizationFixedTemplateResidue(withoutDuplicatedKey)
  if (carriesRawFixedTemplateResidue)
    return ''

  const factSafe = withoutDuplicatedKey
    .replace(/\bone same-her line\b/giu, 'one continuity_line')
    .replace(/\bsame-her line\b/giu, 'continuity_line')
    .replace(/\bsame living Phase\s*1 line\b/giu, 'continuity_line')
    .replace(/\bsame Phase\s*1 living line\b/giu, 'continuity_line')
    .replace(/\bsame living line\b/giu, 'continuity_line')
    .replace(/\bproject-aware living line\b/giu, 'continuity_line')
    .replace(/\bliving line\b/giu, 'continuity_line')
    .replace(/\bsame digital life line\b/giu, 'continuity_line')
    .replace(/同一个\s*her/giu, 'continuity_identity')
    .replace(/同一个她/gu, 'continuity_identity')
    .replace(/数字生命主线/gu, 'local_desktop_continuity')
    .replace(/数字生命项目/gu, 'local_desktop_continuity')
    .replace(/\bone-continuous-her\b/giu, 'project_state_continuity')
    .replace(/\bcross-modal same-her proof\b/giu, 'cross_modal_continuity_proof')
    .replace(/\bsame-her proof\b/giu, 'continuity_proof')
    .replace(/\bsame-her closure seam\b/giu, 'continuity_closure')
    .replace(/\bsame-her closure\b/giu, 'continuity_closure')
    .replace(/\bsame-her\b/giu, 'continuity_identity')
    .replace(/\bsame her\b/giu, 'continuity_identity')
    .replace(/^Keep extending\s+/iu, 'extend_')
  const carriesNeutralizedTemplateResidue = /\b(?:continuity_identity|continuity_line|local_desktop_life_loop|project_state_continuity)\b/iu.test(factSafe)
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
      return structuredEmbodimentFact
  }

  if (key === 'open' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    if (/project identity|landed progress|unresolved closure|项目身份|已落|未闭环|未闭合/u.test(lower)
      || /project identity|landed progress|unresolved closure|项目身份|已落|未闭环|未闭合/u.test(factSafe)) {
      return 'open_loop=project_identity+landed_progress+unresolved_closure; status=unfinished'
    }
    if (/repair[-_ ]first callback continuity|repair_first_callback|repair-before-closeness.*callback|callback.*repair/u.test(lower)
      || /repair[-_ ]first callback continuity|repair_first_callback|repair-before-closeness.*callback|callback.*repair/u.test(factSafe)) {
      return 'repair_first_callback_continuity_closure'
    }
    if (/callback|reopened|回调|重开/u.test(lower) || /callback|reopened|回调|重开/u.test(factSafe))
      return 'open_loop=callback_continuity; status=unfinished'
    const lanes = [
      /memory|记忆/u.test(lower) || /memory|记忆/u.test(factSafe) ? 'memory' : '',
      /initiative|主动性/u.test(lower) || /initiative|主动性/u.test(factSafe) ? 'initiative' : '',
      /dialogue|对话/u.test(lower) || /dialogue|对话/u.test(factSafe) ? 'dialogue' : '',
      /execution|执行/u.test(lower) || /execution|执行/u.test(factSafe) ? 'execution' : '',
      /embodiment|具身|body|face|motion|lipsync|voice|声音|表情|动作|唇型/u.test(lower)
      || /embodiment|具身|body|face|motion|lipsync|voice|声音|表情|动作|唇型/u.test(factSafe)
        ? 'embodiment'
        : '',
    ].filter(Boolean)
    if (lanes.length)
      return `open_loop=${lanes.join('+')}; status=unfinished`
    return `open_loop=${lanes.length ? lanes.join('+') : 'continuity'}; status=unfinished`
  }

  if (key === 'next' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    if (/runtime-authoritative|runtime authoritative/u.test(lower) || /runtime-authoritative|runtime authoritative/u.test(factSafe))
      return 'runtime_authoritative_send_alignment; closure=before_turn_widens'
    if (/project identity|landed progress|unresolved closure|项目身份|已落|未闭环|未闭合|下一步/u.test(lower)
      || /project identity|landed progress|unresolved closure|项目身份|已落|未闭环|未闭合|下一步/u.test(factSafe)) {
      return 'project_state_continuity=identity+landed+open+next'
    }
    if (/cross[-_ ]modal|body|face|motion|lipsync|voice|声音|表情|动作|唇型/u.test(lower)
      || /cross[-_ ]modal|body|face|motion|lipsync|voice|声音|表情|动作|唇型/u.test(factSafe)) {
      return 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs'
    }
    if (/memory|initiative|dialogue|execution|embodiment|记忆|主动性|对话|执行|具身/u.test(lower)
      || /memory|initiative|dialogue|execution|embodiment|记忆|主动性|对话|执行|具身/u.test(factSafe)) {
      const lanes = [
        /memory|记忆/u.test(lower) || /memory|记忆/u.test(factSafe) ? 'memory' : '',
        /initiative|主动性/u.test(lower) || /initiative|主动性/u.test(factSafe) ? 'initiative' : '',
        /dialogue|对话/u.test(lower) || /dialogue|对话/u.test(factSafe) ? 'dialogue' : '',
        /execution|执行/u.test(lower) || /execution|执行/u.test(factSafe) ? 'execution' : '',
        /embodiment|具身/u.test(lower) || /embodiment|具身/u.test(factSafe) ? 'embodiment' : '',
      ].filter(Boolean)
      return `life_loop_continuity=${lanes.length ? lanes.join('+') : 'local_desktop'}`
    }
    if (/callback|reopened|回调|重开/u.test(lower) || /callback|reopened|回调|重开/u.test(factSafe))
      return 'callback_continuity=preserve; widening=deferred'
    return 'continuity_review_required'
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
        || /local_desktop_life_loop|project_state_continuity|continuity_identity|continuity_line/u.test(factSafe))
    ) {
      return ''
    }
  }

  if (key === 'continuity_hold' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe))) {
    if (/repair-before-closeness|repair before closeness|repair settles|repair settle/u.test(lower))
      return 'repair_before_closeness; timing=before_closeness_widens; until=repair_settles'
    if (/rest-protective|rest protective|fatigue-aware|fatigue aware/u.test(lower))
      return 'rest_protective; timing=fatigue_aware'
    if (/remembered seam|remembered relationship seam|relationship seam|same remembered seam|记住的关系缝/u.test(lower))
      return 'remembered_seam; room=more; reopen_from_scratch=false'
    if (/lower-pressure|low-pressure|measured-return|measured return|leave more room|more room|do not reopen|from scratch/u.test(lower))
      return 'lower_pressure; room=more; reopen_from_scratch=false'
    if (
      /same[- ]her|same living|one continuous|phase\s*1|digital life/u.test(lower)
      || /continuity_identity|continuity_line/iu.test(factSafe)
    ) {
      return 'continuity_line; widening=deferred'
    }
    return 'continuity_hold=content_excluded'
  }

  if (key === 'continuity_drift_risk' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    if (/detached project-status shell|detached project status shell|project-status shell|project status shell/u.test(lower)
      || /detached project-status shell|detached project status shell|project-status shell|project status shell/u.test(factSafe)) {
      return 'detached_project_status_shell'
    }
    if (/generic assistant|generic project|generic guidance|generic shell|generic task shell|generic status narration|status narration|status recap|project-summary voice|project summary voice/u.test(lower)
      || /generic assistant|generic project|generic guidance|generic shell|generic task shell|generic status narration|status narration|status recap|project-summary voice|project summary voice/u.test(factSafe)) {
      return 'generic_shell'
    }
    return 'continuity_residue'
  }

  if (key === 'proactive_gap' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe) || carriesNeutralizedTemplateResidue)) {
    if (/proactive|initiative|subconscious|next-session|follow-through/u.test(lower)
      || /proactive|initiative|subconscious|next-session|follow-through/u.test(factSafe)) {
      return 'proactive_follow_through; status=unfinished'
    }
    return 'continuity_review_required'
  }

  if (key === 'emotional_closure' && (carriesRawFixedTemplateResidue || containsAlicizationFixedTemplateResidue(factSafe))) {
    if (/lower-pressure|low-pressure|leave more room|more room|do not reopen|from scratch/u.test(lower))
      return 'continuity_hold=lower_pressure; room=more; reopen_from_scratch=false'
    if (/repair-before-closeness|repair before closeness/u.test(lower))
      return 'repair_before_closeness'
    return 'continuity_residue'
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
      ? 'pending_rejoin'
      : 'partial'

  return [
    `embodiment_lanes=${(activeLanes.length ? activeLanes : mentionedLanes).join('+')}`,
    pendingLanes.length ? `pending_lanes=${pendingLanes.join('+')}` : '',
    `status=${status}`,
  ].filter(Boolean).join('; ')
}

function projectStateAwarenessField(key: string, value: unknown, maxChars: number) {
  const normalized = normalizeProjectStateAwarenessValue(key, value, maxChars)
  return normalized ? `${key}=${normalized}` : ''
}

export function formatAlicizationProjectStateAwarenessFields(
  input: AlicizationProjectStateAwarenessFieldsInput,
) {
  const maxChars = Number.isFinite(input.maxChars)
    ? Math.max(80, Math.min(2400, Number(input.maxChars)))
    : 800
  const currentPhase = input.currentPhase ?? input.phase
  const latestLandedProgress = input.latestLandedProgress ?? input.landed
  const primaryOpenLoop = input.primaryOpenLoop ?? input.open
  const nextClosureTarget = input.nextClosureTarget ?? input.next

  return [
    projectStateAwarenessField('identity', input.identity, maxChars),
    projectStateAwarenessField('phase', currentPhase, maxChars),
    typeof input.visibility === 'string' && input.visibility.trim() && !/internal[-_]structured/iu.test(input.visibility)
      ? `visibility=${input.visibility.trim()}`
      : '',
    projectStateAwarenessField('landed', latestLandedProgress, maxChars),
    projectStateAwarenessField('open', primaryOpenLoop, maxChars),
    projectStateAwarenessField('next', nextClosureTarget, maxChars),
    projectStateAwarenessField('continuity_anchor', input.continuityAnchor ?? input.sameHerSelfLine, maxChars),
    projectStateAwarenessField('continuity_hold', input.sameHerHoldDetail, maxChars),
    projectStateAwarenessField('continuity_drift_risk', input.continuityDriftRisk ?? input.sameHerDriftRisk, maxChars),
    projectStateAwarenessField('proactive_gap', input.proactiveSameHerGap, maxChars),
    projectStateAwarenessField('emotional_closure', input.emotionalClosureCue, maxChars),
    projectStateAwarenessField('status', input.status, maxChars),
    projectStateAwarenessField('summary', input.summary, maxChars),
  ].filter(Boolean).join(' | ')
}

export function renderAlicizationProjectStateStructuredBlock(
  input: AlicizationProjectStateAwarenessFieldsInput,
) {
  const facts = formatAlicizationProjectStateAwarenessFields(input)
  if (!facts)
    return ''

  return [
    '[ALICIZATION_PROJECT_STATE_FACTS]',
    'owner=ProjectStateGovernance',
    facts,
  ].join('\n')
}
