import type { Message } from '@xsai/shared-chat'

import type { ContextMessage } from '../types/chat'

import {
  buildAlicizationProviderFactBlock,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

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
}

const personalityLowThreshold = 0.2

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
  if (/\b[a-z][\w-]+\s*=/iu.test(normalized))
    return null
  return normalized
}

function buildStructuredProjectStateFactsBlock(
  type: string,
  fields: Array<[string, string | null | undefined]>,
) {
  const data = Object.fromEntries(fields
    .map(([key, value]) => {
      const normalized = normalizeStructuredProjectStateFactValue(key, value)
      return normalized ? [key, normalized] : null
    })
    .filter((entry): entry is [string, string] => entry !== null))

  if (Object.keys(data).length === 0)
    return null

  return buildAlicizationProviderFactBlock(type, data)
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
      reason.includes('project-state-continuity-required')
      || reason.includes('semantic-judge:project-state-continuity-missing')
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
  return buildStructuredProjectStateFactsBlock('alicization-pre-dialogue-continuity', [
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
  const triggered: Array<'obedience' | 'liveliness' | 'sensibility'> = []

  if (personality.liveliness <= personalityLowThreshold)
    triggered.push('liveliness')

  if (personality.sensibility <= personalityLowThreshold)
    triggered.push('sensibility')

  if (personality.obedience <= personalityLowThreshold)
    triggered.push('obedience')

  if (triggered.length === 0)
    return null

  return {
    block: buildAlicizationProviderFactBlock('alicization-personality-thresholds', {
      lowAxes: triggered,
    }),
    triggered,
  }
}

function buildPersonalityStateFact(personality: AlicizationPersonalityState) {
  return buildAlicizationProviderFactBlock('alicization-personality-state', {
    obedience: personality.obedience,
    liveliness: personality.liveliness,
    sensibility: personality.sensibility,
  })
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

function compactContextFactValue(value: unknown, maxChars = 1200) {
  if (typeof value !== 'string')
    return ''
  const compacted = value.trim().replace(/\s+/gu, ' ').slice(0, maxChars)
  return containsAlicizationFixedTemplateResidue(compacted) ? '' : compacted
}

function buildHostFactsBlock(hostName: string) {
  const safeHostName = providerSafeOptionalFactValue(hostName, 160)
  if (!safeHostName)
    return null

  return buildAlicizationProviderFactBlock('alicization-host', {
    name: safeHostName,
  })
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

    return buildAlicizationProviderFactBlock('alicization-datetime', {
      source,
      iso: iso || null,
      local: local || null,
    })
  }

  const content = compactContextFactValue(input.content, 1200)
  if (!content)
    return null

  return buildAlicizationProviderFactBlock(
    input.kind === 'memory'
      ? 'alicization-memory-context'
      : input.kind === 'sensory'
        ? 'alicization-sensory-context'
        : 'alicization-generic-context',
    {
      source,
      content,
    },
  )
}

function pushProviderSystemSection(sections: string[], section: string | null | undefined) {
  const normalized = section?.trim()
  if (!normalized)
    return
  sections.push(normalized)
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
    anchorSystemSections.push(soulContent)
    if (personality)
      personalityDirectiveResult = translatePersonalityToDirectives(personality)
  }
  else if (input.personalityState) {
    anchorSystemSections.push(buildPersonalityStateFact(input.personalityState))
    personalityDirectiveResult = translatePersonalityToDirectives(input.personalityState)
  }

  if (hostName) {
    const hostFactsBlock = buildHostFactsBlock(hostName)
    if (hostFactsBlock)
      runtimeSystemSections.push(hostFactsBlock)
  }

  const projectStateContinuitySnapshot = input.projectStateContinuitySnapshot
  if (projectStateContinuitySnapshot) {
    const latestLandedProgress = resolveProjectStateLatestLandedProgress(projectStateContinuitySnapshot)
    pushProviderSystemSection(runtimeSystemSections, buildStructuredProjectStateFactsBlock(
      'alicization-project-state',
      [
        ['identity', projectStateContinuitySnapshot.identity],
        ['currentPhase', projectStateContinuitySnapshot.currentPhase],
        ['latestLandedProgress', latestLandedProgress],
        ['primaryOpenLoop', projectStateContinuitySnapshot.primaryOpenLoop],
        ['nextClosureTarget', projectStateContinuitySnapshot.nextClosureTarget],
        ['summary', projectStateContinuitySnapshot.continuitySummary],
        ['status', projectStateContinuitySnapshot.nonHumanAuthoredStatus],
        ['initiativeGap', projectStateContinuitySnapshot.proactiveSameHerGap],
      ],
    ))
  }

  const preDialogueAwarenessSnapshot = input.preDialogueAwarenessSnapshot
  if (preDialogueAwarenessSnapshot) {
    pushProviderSystemSection(runtimeSystemSections, buildStructuredProjectStateFactsBlock('alicization-pre-dialogue-awareness', [
      ['status', preDialogueAwarenessSnapshot.status],
      ['summary_status', preDialogueAwarenessSnapshot.summaryLine ? 'present' : null],
      ['awareness_status', preDialogueAwarenessSnapshot.awarenessLine ? 'present' : null],
      ['emotional_closure_status', preDialogueAwarenessSnapshot.emotionalClosureCue ? 'present' : null],
      ['reason_count', preDialogueAwarenessSnapshot.reasonPreview?.length ? String(preDialogueAwarenessSnapshot.reasonPreview.length) : null],
    ]))
  }

  const preDialogueClosureSnapshot = input.preDialogueClosureSnapshot
  if (preDialogueClosureSnapshot) {
    pushProviderSystemSection(runtimeSystemSections, buildStructuredProjectStateFactsBlock('alicization-pre-dialogue-closure', [
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
  runtimeSystemSections.push(...contextSections, ...sensorySections)

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
  }
}
