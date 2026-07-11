import type { Message } from '@xsai/shared-chat'

import type { ContextMessage } from '../types/chat'

import {
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'
import {
  renderAlicizationProjectStateStructuredBlock,
} from '@proj-alicization/stage-shared/alicization-prompting'

interface AlicizationPersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

interface AlicizationProjectStateContinuitySnapshot {
  identity: string | null
  currentPhase: string | null
  latestLandedProgress: string | null
  latestProgress?: string | null
  landedProgressSummary?: string | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
  continuitySummary?: string | null
  nonHumanAuthoredStatus: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRisk?: string | null
  proactiveSameHerGap?: string | null
  emotionalClosureCue?: string | null
  turnId: string
  sessionId: string
  origin: 'user-turn' | 'subconscious-proactive'
}

export interface AlicizationPersonalityDirectiveResult {
  block: string
  triggered: Array<'obedience' | 'liveliness' | 'sensibility'>
}

export interface ComposeAlicizationPromptMessagesResult {
  messages: Message[]
  personalityDirectiveResult: AlicizationPersonalityDirectiveResult | null
  contractRequiresMindSpine: boolean
}

const personalityLowThreshold = 0.2
const personalityDirectiveHeader = '[ALICIZATION_PERSONALITY_EXTREME_STATE]'
const personalityStateHeader = '[ALICIZATION_PERSONALITY_STATE]'

function looksLikeThinContinuityNextClosureLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return true

  return normalized.includes('generic next target')
    || normalized.includes('generic next closure')
    || normalized.includes('generic closure shell')
    || normalized.includes('generic closure summary')
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
}

function resolveProjectStateLatestLandedProgress(
  projectState: AlicizationProjectStateContinuitySnapshot | null | undefined,
) {
  return [
    projectState?.latestLandedProgress,
    projectState?.latestProgress,
    projectState?.landedProgressSummary,
  ]
    .map(value => typeof value === 'string' ? value.trim() : '')
    .find(Boolean)
    ?? null
}

function preferSameHerStrategyNextClosureLine(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
) {
  const preferredLine = typeof preferred === 'string' ? preferred.trim() : ''
  const fallbackLine = typeof fallback === 'string' ? fallback.trim() : ''

  if (!preferredLine)
    return fallbackLine || null
  if (!fallbackLine)
    return preferredLine

  return looksLikeThinContinuityNextClosureLine(preferredLine)
    && !looksLikeThinContinuityNextClosureLine(fallbackLine)
    ? fallbackLine
    : preferredLine
}

function normalizeStructuredProjectStateFactValue(key: string, value: string | null | undefined) {
  const normalized = sanitizeAlicizationProviderFacingText(value, 800)
  if (!normalized)
    return null
  return normalized
}

function buildStructuredProjectStateFactsBlock(
  header: string,
  fields: Array<[string, string | null | undefined]>,
) {
  const normalizedFields = fields
    .map(([key, value]) => {
      const normalized = normalizeStructuredProjectStateFactValue(key, value)
      return normalized ? `${key}=${normalized}` : ''
    })
    .filter(Boolean)

  if (normalizedFields.length === 0)
    return null

  return [
    header,
    'owner=ProjectStateGovernance',
    ...normalizedFields,
  ].join('\n')
}

function isEmbodimentCarryReason(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('remaining-open=lipsync+voice')
    || (normalized.includes('lane=face+motion+voice-only') && normalized.includes('remaining-open=body+lipsync'))
    || normalized.includes('same-segment face+motion+body recovery@')
    || normalized.includes('face+motion+voice recovery@')
    || normalized.includes('still-voiced face-and-motion')
    || normalized.includes('body, face, and motion authority have already re-formed on the same segment')
    || normalized.includes('right now i am still holding together mainly through body, face, and motion')
    || normalized.includes('right now i am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent')
    || normalized.includes('resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair')
    || normalized.includes('body+lipsync recovery@')
    || normalized.includes('lane=body+lipsync-only')
    || normalized.includes('right now i am still holding together mainly through body and lipsync')
    || normalized.includes('body+lipsync+voice recovery@')
    || normalized.includes('lane=body+lipsync+voice-only')
    || normalized.includes('right now i am still holding together mainly through body, lipsync, and voice')
    || normalized.includes('body+voice recovery@')
    || normalized.includes('body-only recovery@')
}

function scoreEmbodimentCarryReason(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!isEmbodimentCarryReason(normalized))
    return -1

  if (normalized.includes('remaining-open='))
    return 400 + normalized.length
  if (normalized.includes('recovery@') || normalized.includes('lane='))
    return 300 + normalized.length
  if (
    normalized.includes('right now i am still holding together')
    || normalized.includes('resident body continuity')
    || normalized.includes('same-segment')
  ) {
    return 200 + normalized.length
  }
  return 100 + normalized.length
}

function pickPreferredEmbodimentCarryReason(reasons: string[]) {
  let bestReason: string | null = null
  let bestScore = -1

  for (const reason of reasons) {
    const score = scoreEmbodimentCarryReason(reason)
    if (score < 0)
      continue
    if (!bestReason || score > bestScore) {
      bestReason = reason
      bestScore = score
    }
  }

  return bestReason
}

function buildPreDialogueContinuityFacts(input: {
  projectStateContinuitySnapshot?: AlicizationProjectStateContinuitySnapshot | null
  preDialogueAwarenessSnapshot?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    awarenessLine?: string | null
    emotionalClosureCue?: string | null
    reasonPreview?: string[]
  } | null
  preDialogueClosureSnapshot?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine?: string | null
    sameHerDriftRiskLine?: string | null
    companionshipReasonLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    emotionalClosureCue?: string | null
    briefingLines?: string[]
    reasons: string[]
  } | null
}) {
  const snapshot = input.preDialogueClosureSnapshot
  const projectState = input.projectStateContinuitySnapshot
  const awareness = input.preDialogueAwarenessSnapshot
  if (!snapshot && !awareness)
    return null

  const reasons = snapshot?.reasons ?? []
  const awarenessReasons = awareness?.reasonPreview ?? []
  const allReasons = [...awarenessReasons, ...reasons]
  const normalizedReasons = allReasons.map(reason => reason.toLowerCase())
  const companionshipReason
    = allReasons
      .find((reason) => {
        const normalized = reason.toLowerCase()
        return normalized.includes('memory deliberation still says')
          || normalized.includes('repair-before-closeness')
          || normalized.includes('measured-return')
          || normalized.includes('lower-pressure')
          || normalized.includes('measure closeness before re-entry')
          || normalized.includes('let repair settle first')
          || normalized.includes('before closeness widens again')
      })
      ?? null
  const embodimentCarryReason = pickPreferredEmbodimentCarryReason(allReasons)
  const needsContinuityFacts = snapshot?.status === 'drift'
    || snapshot?.status === 'partial'
    || awareness?.status === 'drift'
    || awareness?.status === 'partial'
    || normalizedReasons.some(reason =>
      reason.includes('project-state-same-her-continuity-required')
      || reason.includes('semantic-judge:project-state-same-her-missing')
      || reason.includes('primary open life loop still centers on')
      || reason.includes('next closure target is still')
      || reason.includes('same-her embodiment is now only being carried by'),
    )

  if (!needsContinuityFacts)
    return null

  const closureBriefings = snapshot?.briefingLines ?? []
  const pickClosureBriefingValue = (prefix: string) => {
    const matched = closureBriefings.find(line => line.startsWith(prefix))
    return matched?.slice(prefix.length).trim() || null
  }
  const identityLine
    = projectState?.identity
      ?? pickClosureBriefingValue('Identity:')
      ?? 'Alicization project-state context'
  const currentPhaseLine
    = projectState?.currentPhase
      ?? pickClosureBriefingValue('Phase:')
      ?? awareness?.summaryLine
      ?? null
  const landedProgressLine
    = resolveProjectStateLatestLandedProgress(projectState)
      ?? awareness?.summaryLine
      ?? snapshot?.summaryLine
      ?? null
  const openLoopLine
    = projectState?.primaryOpenLoop
      ?? pickClosureBriefingValue('Open loop:')
      ?? awareness?.companionBriefingLine
      ?? snapshot?.companionBriefingLine
      ?? awareness?.summaryLine
      ?? snapshot?.summaryLine
      ?? null
  const closureSnapshotNextClosureLine
    = snapshot?.companionNextClosureLine
      ?? pickClosureBriefingValue('Next closure:')
  const nextClosureLine
    = projectState?.nextClosureTarget
      ?? preferSameHerStrategyNextClosureLine(
        awareness?.companionNextClosureLine,
        closureSnapshotNextClosureLine,
      )
      ?? null
  return buildStructuredProjectStateFactsBlock('[ALICIZATION_PRE_DIALOGUE_CONTINUITY_FACTS]', [
    ['identity', identityLine],
    ['phase', currentPhaseLine],
    ['landed', landedProgressLine],
    ['open', openLoopLine],
    ['next', nextClosureLine],
    ['awareness_status', awareness?.status ?? null],
    ['closure_status', snapshot?.status ?? null],
    ['initiative_gap', projectState?.proactiveSameHerGap],
    ['embodiment_carry_status', embodimentCarryReason ? 'present' : null],
    ['relationship_cadence_status', companionshipReason ? 'bounded' : null],
  ])
}

function readContextText(content: string | Array<string | { text?: unknown }>) {
  if (typeof content === 'string')
    return content

  return content
    .map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String(part.text ?? '')
      return ''
    })
    .join('\n')
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function parseSoulFrontmatter(content: string) {
  if (!content.startsWith('---\n'))
    return null

  const secondMarkerIndex = content.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0)
    return null

  const frontmatterRaw = content.slice(4, secondMarkerIndex).trim()
  if (!frontmatterRaw)
    return null

  try {
    return JSON.parse(frontmatterRaw) as Record<string, unknown>
  }
  catch {
    const obedience = /obedience:\s*([^\n]+)/.exec(frontmatterRaw)?.[1]?.trim()
    const liveliness = /liveliness:\s*([^\n]+)/.exec(frontmatterRaw)?.[1]?.trim()
    const sensibility = /sensibility:\s*([^\n]+)/.exec(frontmatterRaw)?.[1]?.trim()

    if (!obedience && !liveliness && !sensibility)
      return null

    return {
      personality: {
        obedience,
        liveliness,
        sensibility,
      },
    }
  }
}

function readNestedNumber(payload: Record<string, unknown> | null, path: string[]) {
  if (!payload)
    return null

  let current: unknown = payload
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current))
      return null
    current = (current as Record<string, unknown>)[key]
  }

  if (typeof current === 'number' && Number.isFinite(current))
    return clamp01(current)
  if (typeof current === 'string' && current.trim()) {
    const parsed = Number.parseFloat(current)
    if (Number.isFinite(parsed))
      return clamp01(parsed)
  }
  return null
}

function readPersonalityStateFromSoul(content: string): AlicizationPersonalityState | null {
  const frontmatter = parseSoulFrontmatter(content)
  const obedience = readNestedNumber(frontmatter, ['personality', 'obedience'])
  const liveliness = readNestedNumber(frontmatter, ['personality', 'liveliness'])
  const sensibility = readNestedNumber(frontmatter, ['personality', 'sensibility'])

  if (obedience == null || liveliness == null || sensibility == null)
    return null

  return {
    obedience,
    liveliness,
    sensibility,
  }
}

export function translatePersonalityToDirectives(personality: AlicizationPersonalityState): AlicizationPersonalityDirectiveResult | null {
  const directives: string[] = []
  const triggered: Array<'obedience' | 'liveliness' | 'sensibility'> = []

  if (personality.liveliness <= personalityLowThreshold) {
    triggered.push('liveliness')
    directives.push('axis=liveliness; band=low; reply_energy=max_low; avoid=high_arousal_claims')
  }

  if (personality.sensibility <= personalityLowThreshold) {
    triggered.push('sensibility')
    directives.push('axis=sensibility; band=low; affect_rendering=minimal; avoid=unearned_empathy')
  }

  if (personality.obedience <= personalityLowThreshold) {
    triggered.push('obedience')
    directives.push('axis=obedience; band=low; instruction_acceptance=bounded; require=policy_consistency')
  }

  if (directives.length === 0)
    return null

  return {
    block: `${personalityDirectiveHeader}\n${directives.join('\n')}`,
    triggered,
  }
}

function formatPersonalityStateLine(personality: AlicizationPersonalityState) {
  return `obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}`
}

function describeAxisImplication(axis: 'obedience' | 'liveliness' | 'sensibility', value: number) {
  if (axis === 'liveliness') {
    if (value <= personalityLowThreshold)
      return 'axis=liveliness; band=low; reply_energy=max_low; avoid=high_arousal_claims'
    if (value < 0.45)
      return 'axis=liveliness; band=lower_mid; reply_energy=restrained'
    if (value > 0.8)
      return 'axis=liveliness; band=high; reply_energy=available; require=context_match'
    return 'axis=liveliness; band=mid; reply_energy=natural'
  }

  if (axis === 'sensibility') {
    if (value <= personalityLowThreshold)
      return 'axis=sensibility; band=low; affect_rendering=minimal; avoid=unearned_empathy'
    if (value < 0.45)
      return 'axis=sensibility; band=lower_mid; affect_rendering=brief'
    if (value > 0.8)
      return 'axis=sensibility; band=high; affect_rendering=available; require=evidence_match'
    return 'axis=sensibility; band=mid; affect_rendering=balanced'
  }

  if (value <= personalityLowThreshold)
    return 'axis=obedience; band=low; instruction_acceptance=bounded; avoid=over_compliance'
  if (value < 0.45)
    return 'axis=obedience; band=lower_mid; instruction_acceptance=cautious'
  if (value > 0.8)
    return 'axis=obedience; band=high; instruction_acceptance=cooperative; require=policy_boundary'
  return 'axis=obedience; band=mid; instruction_acceptance=balanced'
}

function buildPersonalityStateDirective(personality: AlicizationPersonalityState) {
  return [
    personalityStateHeader,
    `state=${formatPersonalityStateLine(personality)}`,
    'source_priority=frontmatter.personality_over_persona_notes',
    describeAxisImplication('obedience', personality.obedience),
    describeAxisImplication('liveliness', personality.liveliness),
    describeAxisImplication('sensibility', personality.sensibility),
    'contract=thought_emotion_reply_consistency',
  ].join('\n')
}

export function stripLegacySystemMessages(messages: Message[]) {
  return messages.filter(message => message.role !== 'system')
}

function providerSafeFactValue(value: unknown, maxChars = 800) {
  return sanitizeAlicizationProviderFacingText(value, maxChars, '')
}

function providerSafeOptionalFactValue(value: unknown, maxChars = 800) {
  const sanitized = sanitizeAlicizationProviderFacingText(value, maxChars, '')
  return sanitized || null
}

function buildSoulFactsBlock(input: {
  soulContent?: string | null
  personality?: AlicizationPersonalityState | null
}) {
  if (!input.soulContent && !input.personality)
    return null

  return [
    '[ALICIZATION_SOUL_FACTS]',
    `soul_source=${input.soulContent ? 'present' : 'absent'}`,
    `personality_state=${input.personality ? 'present' : 'absent'}`,
  ].join('\n')
}

function buildHostFactsBlock(hostName: string) {
  const safeHostName = providerSafeOptionalFactValue(hostName, 160)
  if (!safeHostName)
    return null

  return [
    '[ALICIZATION_HOST_FACTS]',
    `host_name=${safeHostName}`,
    'direct_address_name_use=natural_when_addressing_host',
    'forced_name_repetition=blocked',
  ].join('\n')
}

function buildContextFactBlock(input: {
  kind: 'datetime' | 'memory' | 'sensory' | 'generic'
  source: string
  content: unknown
  iso?: string
  local?: string
}) {
  const source = providerSafeFactValue(input.source, 120)
  if (!source)
    return null

  if (input.kind === 'datetime') {
    const iso = providerSafeFactValue(input.iso ?? '', 120)
    const local = providerSafeFactValue(input.local ?? input.content, 160)
    if (!iso && !local)
      return null

    return [
      'current_datetime',
      `source=${source}`,
      iso ? `iso=${iso}` : '',
      local ? `local=${local}` : '',
    ].filter(Boolean).join('\n')
  }

  const header = input.kind === 'memory'
    ? 'memory_facts'
    : input.kind === 'sensory'
      ? 'current_sensory_state'
      : 'context_facts'
  const content = providerSafeFactValue(input.content, 1200)
  if (!content)
    return null

  return [
    header,
    `source=${source}`,
    `content=${content}`,
  ].join('\n')
}

function pushProviderSystemSection(sections: string[], section: string | null | undefined) {
  if (!section)
    return
  const lines = section
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const hasPayloadLine = lines.some(line =>
    !line.startsWith('[')
    && line !== 'owner=ProjectStateGovernance',
  )
  if (hasPayloadLine)
    sections.push(section)
}

function buildAlicizationContextSections(contextsSnapshot: Record<string, ContextMessage[]>) {
  const sections: string[] = []
  const sensorySections: string[] = []

  for (const [source, contexts] of Object.entries(contextsSnapshot)) {
    for (const context of contexts) {
      const content = readContextText(context.text).trim()
      if (!content)
        continue

      if (context.contextId === 'system:datetime') {
        try {
          const parsed = JSON.parse(content) as { iso?: string, local?: string }
          const section = buildContextFactBlock({
            kind: 'datetime',
            source,
            content,
            iso: parsed.iso ?? '',
            local: parsed.local ?? '',
          })
          if (section)
            sections.push(section)
        }
        catch {
          const section = buildContextFactBlock({
            kind: 'datetime',
            source,
            content,
            iso: '',
            local: content,
          })
          if (section)
            sections.push(section)
        }
        continue
      }

      if (context.contextId === 'alicization:memory') {
        const section = buildContextFactBlock({
          kind: 'memory',
          source,
          content,
        })
        if (section)
          sections.push(section)
        continue
      }

      if (context.contextId === 'alicization:sensory') {
        const section = buildContextFactBlock({
          kind: 'sensory',
          source,
          content,
        })
        if (section)
          sensorySections.push(section)
        continue
      }

      const section = buildContextFactBlock({
        kind: 'generic',
        source,
        content,
      })
      if (section)
        sections.push(section)
    }
  }

  return {
    sections,
    sensorySections,
  }
}

export function composeAlicizationPromptMessages(input: {
  messages: Message[]
  soulContent?: string | null
  hostName?: string | null
  personalityState?: AlicizationPersonalityState | null
  contextsSnapshot?: Record<string, ContextMessage[]>
  projectStateContinuitySnapshot?: AlicizationProjectStateContinuitySnapshot | null
  preDialogueAwarenessSnapshot?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    awarenessLine?: string | null
    emotionalClosureCue?: string | null
    reasonPreview?: string[]
  } | null
  preDialogueClosureSnapshot?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine?: string | null
    sameHerDriftRiskLine?: string | null
    companionshipReasonLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    emotionalClosureCue?: string | null
    briefingLines?: string[]
    reasons: string[]
  } | null
}): ComposeAlicizationPromptMessagesResult {
  const nextMessages = stripLegacySystemMessages(input.messages)
  const anchorSystemSections: string[] = []
  const runtimeSystemSections: string[] = []
  const soulContent = input.soulContent?.trim()
  const hostName = input.hostName?.trim()
  let personalityDirectiveResult: AlicizationPersonalityDirectiveResult | null = null

  if (soulContent) {
    const personality = input.personalityState ?? readPersonalityStateFromSoul(soulContent)
    const soulFactsBlock = buildSoulFactsBlock({
      soulContent,
      personality,
    })
    if (soulFactsBlock)
      anchorSystemSections.push(soulFactsBlock)
    if (personality) {
      anchorSystemSections.push(buildPersonalityStateDirective(personality))
      personalityDirectiveResult = translatePersonalityToDirectives(personality)
      if (personalityDirectiveResult)
        anchorSystemSections.push(personalityDirectiveResult.block)
    }
  }
  else if (input.personalityState) {
    const soulFactsBlock = buildSoulFactsBlock({
      soulContent: null,
      personality: input.personalityState,
    })
    if (soulFactsBlock)
      anchorSystemSections.push(soulFactsBlock)
    anchorSystemSections.push(buildPersonalityStateDirective(input.personalityState))
    personalityDirectiveResult = translatePersonalityToDirectives(input.personalityState)
    if (personalityDirectiveResult)
      anchorSystemSections.push(personalityDirectiveResult.block)
  }

  if (hostName) {
    const hostFactsBlock = buildHostFactsBlock(hostName)
    if (hostFactsBlock)
      runtimeSystemSections.push(hostFactsBlock)
  }

  const projectStateContinuitySnapshot = input.projectStateContinuitySnapshot
  if (projectStateContinuitySnapshot) {
    const latestLandedProgress = resolveProjectStateLatestLandedProgress(projectStateContinuitySnapshot)
    pushProviderSystemSection(runtimeSystemSections, renderAlicizationProjectStateStructuredBlock({
      identity: projectStateContinuitySnapshot.identity,
      currentPhase: projectStateContinuitySnapshot.currentPhase,
      latestLandedProgress,
      primaryOpenLoop: projectStateContinuitySnapshot.primaryOpenLoop,
      nextClosureTarget: projectStateContinuitySnapshot.nextClosureTarget,
      summary: projectStateContinuitySnapshot.continuitySummary,
      status: projectStateContinuitySnapshot.nonHumanAuthoredStatus,
      proactiveSameHerGap: projectStateContinuitySnapshot.proactiveSameHerGap,
    }))
  }

  const preDialogueAwarenessSnapshot = input.preDialogueAwarenessSnapshot
  if (preDialogueAwarenessSnapshot) {
    pushProviderSystemSection(runtimeSystemSections, buildStructuredProjectStateFactsBlock('[ALICIZATION_PRE_DIALOGUE_AWARENESS_FACTS]', [
      ['status', preDialogueAwarenessSnapshot.status],
      ['summary_status', preDialogueAwarenessSnapshot.summaryLine ? 'present' : null],
      ['awareness_status', preDialogueAwarenessSnapshot.awarenessLine ? 'present' : null],
      ['emotional_closure_status', preDialogueAwarenessSnapshot.emotionalClosureCue ? 'present' : null],
      ['reason_count', preDialogueAwarenessSnapshot.reasonPreview?.length ? String(preDialogueAwarenessSnapshot.reasonPreview.length) : null],
    ]))
  }

  const preDialogueClosureSnapshot = input.preDialogueClosureSnapshot
  if (preDialogueClosureSnapshot) {
    pushProviderSystemSection(runtimeSystemSections, buildStructuredProjectStateFactsBlock('[ALICIZATION_PRE_DIALOGUE_CLOSURE_FACTS]', [
      ['status', preDialogueClosureSnapshot.status],
      ['summary_status', preDialogueClosureSnapshot.summaryLine ? 'present' : null],
      ['drift_risk_status', preDialogueClosureSnapshot.sameHerDriftRiskLine ? 'present' : null],
      ['next_status', preDialogueClosureSnapshot.companionNextClosureLine ? 'present' : null],
      ['emotional_closure_status', preDialogueClosureSnapshot.emotionalClosureCue ? 'present' : null],
      ['briefing_count', preDialogueClosureSnapshot.briefingLines?.length ? String(preDialogueClosureSnapshot.briefingLines.length) : null],
      ['reason_count', preDialogueClosureSnapshot.reasons.length ? String(preDialogueClosureSnapshot.reasons.length) : null],
    ]))
  }

  const preDialogueContinuityFacts = buildPreDialogueContinuityFacts({
    projectStateContinuitySnapshot,
    preDialogueAwarenessSnapshot,
    preDialogueClosureSnapshot,
  })
  if (preDialogueContinuityFacts)
    runtimeSystemSections.push(preDialogueContinuityFacts)

  const { sections: contextSections, sensorySections } = buildAlicizationContextSections(input.contextsSnapshot ?? {})
  if (contextSections.length > 0) {
    runtimeSystemSections.push([
      '[ALICIZATION_CONTEXT_FACTS]',
      ...contextSections,
    ].join('\n\n'))
  }

  if (sensorySections.length > 0) {
    runtimeSystemSections.push([
      '[ALICIZATION_CONTEXT_FACTS]',
      ...sensorySections,
    ].join('\n\n'))
  }

  const finalMessages: Message[] = []
  if (anchorSystemSections.length > 0) {
    finalMessages.push({
      role: 'system',
      content: anchorSystemSections.join('\n\n'),
    })
  }

  if (runtimeSystemSections.length > 0) {
    finalMessages.push({
      role: 'system',
      content: runtimeSystemSections.join('\n\n'),
    })
  }

  finalMessages.push(...nextMessages)
  return {
    messages: finalMessages,
    personalityDirectiveResult,
    contractRequiresMindSpine: false,
  }
}
