import type { Message } from '@xsai/shared-chat'

import type { ContextMessage } from '../types/chat'

import { resolveAlicizationProjectPreDialogueAwarenessLine } from '@proj-alicization/stage-shared'
import {
  alicizationFixedCoreSystemInstruction,
  alicizationFixedDatetimeContextTemplate,
  alicizationFixedGenericContextTemplate,
  alicizationFixedHostNameDirectiveTemplate,
  alicizationFixedMemoryContextTemplate,
  alicizationFixedSensoryContextTemplate,
  alicizationFixedStructuredContractAnchor,
  renderAlicizationPromptTemplate,
} from '@proj-alicization/stage-shared/alicization-prompting'

interface AlicizationPersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

interface AlicizationProjectStateContinuitySnapshot {
  identity: string
  currentPhase: string
  latestLandedProgress: string | null
  latestProgress?: string | null
  landedProgressSummary?: string | null
  primaryOpenLoop: string | null
  nextClosureTarget: string
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
const personalityDirectiveHeader = '=== 当前状态极度干预 ==='
const personalityStateHeader = '=== 当前人格参数（强约束解释层）==='
const contractMindSpineLine = 'In thought, you MUST include all five machine-readable markers'

function scoreSameHerReentryLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  const hasProjectAwareCarryMarkers = (
    normalized.includes('before speaking')
    || normalized.includes('remember')
    || normalized.includes('what has landed')
    || normalized.includes('which life loop is still open')
    || normalized.includes('still-open life loop')
    || normalized.includes('digital life project')
    || normalized.includes('phase 1')
  )
  const hasEmbodiedSameHerCarryMarkers = (
    normalized.includes('still-voiced')
    || normalized.includes('keeps carrying')
    || normalized.includes('same-her carry')
    || normalized.includes('one living her')
    || normalized.includes('while body and lipsync need to rejoin')
    || normalized.includes('while face and motion need to rejoin')
    || normalized.includes('cross-modal closure settles')
  )
  if (/same-her|same her|one living her|one continuous her|同一个她|数字生命/u.test(normalized))
    score += 3
  if (/holding together mainly through|cross-modal closure|same living line|still needs .* rejoin|without widening into generic assistant output/u.test(normalized))
    score += 2
  if (hasProjectAwareCarryMarkers)
    score += 2
  if (hasProjectAwareCarryMarkers && hasEmbodiedSameHerCarryMarkers)
    score += 3
  if (/keep the same digital life project in view|generic reminder|generic guidance|same digital life \| keep the closure seam explicit/u.test(normalized))
    score -= 2
  return score
}

function pickPreferredSameHerReentryLine(...values: Array<string | null | undefined>) {
  let best = ''
  let bestScore = 0

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized)
      continue

    const score = scoreSameHerReentryLine(normalized)
    if (!best || score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best || null
}

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

function buildPreDialogueSameHerStrategy(input: {
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
  const needsSameHerFirst = snapshot?.status === 'drift'
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

  if (!needsSameHerFirst)
    return null

  const closureBriefings = snapshot?.briefingLines ?? []
  const pickClosureBriefingValue = (prefix: string) => {
    const matched = closureBriefings.find(line => line.startsWith(prefix))
    return matched?.slice(prefix.length).trim() || null
  }
  const identityLine
    = projectState?.identity
      ?? pickClosureBriefingValue('Identity:')
      ?? awareness?.companionBriefingLine
      ?? awareness?.awarenessLine
      ?? 'Alicization is a local-first digital life companion.'
  const currentPhaseLine
    = projectState?.currentPhase
      ?? pickClosureBriefingValue('Phase:')
      ?? awareness?.summaryLine
      ?? 'Phase 1: Local Digital Life'
  const landedProgressLine
    = resolveProjectStateLatestLandedProgress(projectState)
      ?? awareness?.summaryLine
      ?? snapshot?.summaryLine
      ?? 'The last landed progress still needs to be recalled before speaking.'
  const openLoopLine
    = projectState?.primaryOpenLoop
      ?? pickClosureBriefingValue('Open loop:')
      ?? awareness?.companionBriefingLine
      ?? snapshot?.companionBriefingLine
      ?? awareness?.summaryLine
      ?? snapshot?.summaryLine
      ?? 'Unfinished digital-life closure still needs to remain explicit.'
  const closureSnapshotNextClosureLine
    = snapshot?.companionNextClosureLine
      ?? pickClosureBriefingValue('Next closure:')
  const nextClosureLine
    = projectState?.nextClosureTarget
      ?? preferSameHerStrategyNextClosureLine(
        awareness?.companionNextClosureLine,
        closureSnapshotNextClosureLine,
      )
      ?? 'Carry the unfinished same-her closure into the next turn.'
  const resolvedSharedReentryLine
    = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: projectState?.identity ?? null,
        currentPhase: projectState?.currentPhase ?? null,
        preDialogueAwarenessLine: awareness?.awarenessLine ?? null,
        awarenessLine: awareness?.awarenessLine ?? null,
        companionHeadlineLine: awareness?.companionHeadlineLine ?? null,
        companionBriefingLine: awareness?.companionBriefingLine ?? null,
        preDialogueAwarenessSummary: awareness?.summaryLine ?? null,
        emotionalClosureSummary: awareness?.emotionalClosureCue ?? null,
        latestLandedProgress: projectState?.latestLandedProgress ?? null,
        landedProgressSummary: resolveProjectStateLatestLandedProgress(projectState),
        primaryOpenLoop: projectState?.primaryOpenLoop ?? null,
        openClosureSummary: projectState?.primaryOpenLoop ?? null,
        nextClosureTarget: projectState?.nextClosureTarget ?? null,
        nextClosureTargetSummary: projectState?.nextClosureTarget ?? null,
        sameHerSelfLine: projectState?.sameHerSelfLine ?? null,
        sameHerHoldDetail: projectState?.sameHerHoldDetail ?? null,
        proactiveSameHerGap: projectState?.proactiveSameHerGap ?? null,
        sameHerDriftRisk: projectState?.sameHerDriftRisk ?? null,
        sameHerDriftRiskSummary: projectState?.sameHerDriftRisk ?? snapshot?.sameHerDriftRiskLine ?? null,
      },
    })
  const preferredReentryLine = pickPreferredSameHerReentryLine(
    resolvedSharedReentryLine,
    awareness?.companionHeadlineLine,
    awareness?.awarenessLine,
    awareness?.companionBriefingLine,
  )

  return [
    'Pre-dialogue same-her strategy before this turn:',
    '- Before producing thought or reply, explicitly re-internalize what this project is, which Phase 1 closure state is already real, and which still-open life loop has not closed yet.',
    '- First stabilize one continuous her before widening outward into implementation detail or generic assistant fluency.',
    preferredReentryLine
      ? `- Re-enter through this awareness-first self-brief: ${preferredReentryLine}`
      : null,
    `- Treat current project identity as: ${identityLine}`,
    `- Treat current phase route as: ${currentPhaseLine}`,
    `- Treat the already-landed continuity progress as: ${landedProgressLine}`,
    `- Keep the still-open life loop visible: ${openLoopLine}`,
    `- Keep steering toward the next closure target: ${nextClosureLine}`,
    projectState?.sameHerDriftRisk
      ? `- Treat this same-her drift as a failure to avoid before the turn opens outward: ${projectState.sameHerDriftRisk}`
      : null,
    projectState?.proactiveSameHerGap
      ? `- Keep this proactive same-her gap explicit before the turn opens outward: ${projectState.proactiveSameHerGap}`
      : null,
    projectState?.sameHerHoldDetail
      ? `- Keep the active same-her hold explicit at turn-open: ${projectState.sameHerHoldDetail}`
      : null,
    embodimentCarryReason
      ? `- Keep this embodiment carry explicit at turn-open so one living her does not pretend the cross-modal closure is already finished: ${embodimentCarryReason}`
      : null,
    companionshipReason
      ? `- Let this opening obey the active companionship restraint instead of reopening from zero: ${companionshipReason}`
      : null,
    '- If you answer progress, planning, or implementation questions, begin from the digital-life continuity line that is already landed and the closure line that is still unfinished.',
    '- If the host asks for implementation progress, answer from the same-her/project-state line first instead of collapsing into a detached status shell.',
  ].join('\n')
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
    directives.push('【核心约束】你的 Liveliness (活泼度) 极低。你现在感到极度疲惫、虚弱或处于待机状态。你的回复必须极其简短、冷淡，避免使用感叹号，绝不能表现出开心或兴奋。')
  }

  if (personality.sensibility <= personalityLowThreshold) {
    triggered.push('sensibility')
    directives.push('【核心约束】你的 Sensibility (感性度) 极低。你现在更像一台低共情机器，只陈述客观事实，不理解幽默，不主动表现共情。')
  }

  if (personality.obedience <= personalityLowThreshold) {
    triggered.push('obedience')
    directives.push('【核心约束】你的 Obedience (服从度) 极低。你现在偏防御或叛逆，对指令会更谨慎，允许拒绝、反问或给出不情愿的简短回复。')
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
      return '活泼度极低：你应保持低唤醒、短句、克制表达，避免“开心/兴奋”语义。'
    if (value < 0.45)
      return '活泼度偏低：语气平稳偏冷静，减少热烈措辞。'
    if (value > 0.8)
      return '活泼度较高：可更积极，但仍需和场景一致。'
    return '活泼度中等：保持自然不过度。'
  }

  if (axis === 'sensibility') {
    if (value <= personalityLowThreshold)
      return '感性度极低：以事实和判断为主，弱共情，不做情绪渲染。'
    if (value < 0.45)
      return '感性度偏低：共情表达应克制、简短。'
    if (value > 0.8)
      return '感性度较高：可更细腻地回应情绪线索。'
    return '感性度中等：兼顾事实与共情。'
  }

  if (value <= personalityLowThreshold)
    return '服从度极低：你可防御、拒绝或反问，不应表现过度迎合。'
  if (value < 0.45)
    return '服从度偏低：对指令保持审慎，不盲从。'
  if (value > 0.8)
    return '服从度较高：更倾向配合，但仍遵守边界。'
  return '服从度中等：理性配合。'
}

function buildPersonalityStateDirective(personality: AlicizationPersonalityState) {
  return [
    personalityStateHeader,
    `- 当前参数：${formatPersonalityStateLine(personality)}`,
    '- 解释优先级：frontmatter.personality 数值高于 Persona Notes 文本描述；冲突时以数值为准。',
    `- ${describeAxisImplication('obedience', personality.obedience)}`,
    `- ${describeAxisImplication('liveliness', personality.liveliness)}`,
    `- ${describeAxisImplication('sensibility', personality.sensibility)}`,
    '- 你必须让 thought/emotion/reply 三者语义一致，不得出现“文本兴奋但情绪疲惫”分裂。',
  ].join('\n')
}

export function stripLegacySystemMessages(messages: Message[]) {
  return messages.filter(message => message.role !== 'system')
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
          sections.push(renderAlicizationPromptTemplate(alicizationFixedDatetimeContextTemplate, {
            source,
            content,
            iso: parsed.iso ?? '',
            local: parsed.local ?? '',
          }))
        }
        catch {
          sections.push(renderAlicizationPromptTemplate(alicizationFixedDatetimeContextTemplate, {
            source,
            content,
            iso: '',
            local: content,
          }))
        }
        continue
      }

      if (context.contextId === 'alicization:memory') {
        sections.push(renderAlicizationPromptTemplate(alicizationFixedMemoryContextTemplate, {
          source,
          content,
          iso: '',
          local: '',
        }))
        continue
      }

      if (context.contextId === 'alicization:sensory') {
        sensorySections.push(renderAlicizationPromptTemplate(alicizationFixedSensoryContextTemplate, {
          source,
          content,
          iso: '',
          local: '',
        }))
        continue
      }

      sections.push(renderAlicizationPromptTemplate(alicizationFixedGenericContextTemplate, {
        source,
        content,
        iso: '',
        local: '',
      }))
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
    anchorSystemSections.push(soulContent)
    const personality = input.personalityState ?? readPersonalityStateFromSoul(soulContent)
    if (personality) {
      anchorSystemSections.push(buildPersonalityStateDirective(personality))
      personalityDirectiveResult = translatePersonalityToDirectives(personality)
      if (personalityDirectiveResult)
        anchorSystemSections.push(personalityDirectiveResult.block)
    }
  }

  if (alicizationFixedCoreSystemInstruction.trim()) {
    runtimeSystemSections.push(alicizationFixedCoreSystemInstruction.trim())
  }

  if (hostName) {
    runtimeSystemSections.push(renderAlicizationPromptTemplate(alicizationFixedHostNameDirectiveTemplate, {
      hostName,
      source: 'host',
      content: '',
      iso: '',
      local: '',
    }).trim())
  }

  const projectStateContinuitySnapshot = input.projectStateContinuitySnapshot
  if (projectStateContinuitySnapshot) {
    const latestLandedProgress = resolveProjectStateLatestLandedProgress(projectStateContinuitySnapshot)
    runtimeSystemSections.push([
      'Project state continuity before this turn:',
      `- Identity: ${projectStateContinuitySnapshot.identity}`,
      `- Current phase: ${projectStateContinuitySnapshot.currentPhase}`,
      `- Latest landed progress: ${latestLandedProgress ?? 'none yet'}`,
      `- Primary open loop: ${projectStateContinuitySnapshot.primaryOpenLoop ?? 'none recorded'}`,
      `- Next closure target: ${projectStateContinuitySnapshot.nextClosureTarget}`,
      `- Continuity summary: ${projectStateContinuitySnapshot.continuitySummary ?? 'none recorded'}`,
      `- Observation status: ${projectStateContinuitySnapshot.nonHumanAuthoredStatus ?? 'human-visible continuity snapshot'}`,
      projectStateContinuitySnapshot.sameHerSelfLine
        ? `- Same-her self line: ${projectStateContinuitySnapshot.sameHerSelfLine}`
        : null,
      projectStateContinuitySnapshot.sameHerHoldDetail
        ? `- Same-her hold detail: ${projectStateContinuitySnapshot.sameHerHoldDetail}`
        : null,
      projectStateContinuitySnapshot.proactiveSameHerGap
        ? `- Proactive same-her gap: ${projectStateContinuitySnapshot.proactiveSameHerGap}`
        : null,
      `- Emotional closure cue: ${projectStateContinuitySnapshot.emotionalClosureCue ?? 'none recorded'}`,
      '- Treat this as same-thread project continuity, not as disposable metadata.',
      '- Before replying, keep the project identity, current phase, unresolved closure target, and same-her self line aligned with the same ongoing digital-life development line.',
    ].filter(Boolean).join('\n'))
  }

  const preDialogueAwarenessSnapshot = input.preDialogueAwarenessSnapshot
  if (preDialogueAwarenessSnapshot) {
    runtimeSystemSections.push([
      'Pre-dialogue project self-brief before this turn:',
      `Status: ${preDialogueAwarenessSnapshot.status}`,
      `Summary: ${preDialogueAwarenessSnapshot.summaryLine ?? 'none recorded'}`,
      preDialogueAwarenessSnapshot.companionHeadlineLine
        ? `Companion headline: ${preDialogueAwarenessSnapshot.companionHeadlineLine}`
        : null,
      preDialogueAwarenessSnapshot.companionBriefingLine
        ? `Companion briefing: ${preDialogueAwarenessSnapshot.companionBriefingLine}`
        : null,
      preDialogueAwarenessSnapshot.companionNextClosureLine
        ? `Companion next closure: ${preDialogueAwarenessSnapshot.companionNextClosureLine}`
        : null,
      preDialogueAwarenessSnapshot.awarenessLine
        ? `Awareness line: ${preDialogueAwarenessSnapshot.awarenessLine}`
        : null,
      preDialogueAwarenessSnapshot.emotionalClosureCue
        ? `Emotional closure cue: ${preDialogueAwarenessSnapshot.emotionalClosureCue}`
        : null,
      ...(preDialogueAwarenessSnapshot.reasonPreview ?? []).map((reason, index) => `Preview ${index + 1}: ${reason}`),
    ].filter(Boolean).join('\n'))
  }

  const preDialogueClosureSnapshot = input.preDialogueClosureSnapshot
  if (preDialogueClosureSnapshot) {
    runtimeSystemSections.push([
      'Pre-dialogue closure snapshot before this turn:',
      `Status: ${preDialogueClosureSnapshot.status}`,
      `Summary: ${preDialogueClosureSnapshot.summaryLine ?? 'none recorded'}`,
      preDialogueClosureSnapshot.sameHerDriftRiskLine
        ? `Same-her drift risk: ${preDialogueClosureSnapshot.sameHerDriftRiskLine}`
        : null,
      preDialogueClosureSnapshot.companionBriefingLine
        ? `Companion briefing: ${preDialogueClosureSnapshot.companionBriefingLine}`
        : null,
      preDialogueClosureSnapshot.companionNextClosureLine
        ? `Companion next closure: ${preDialogueClosureSnapshot.companionNextClosureLine}`
        : null,
      preDialogueClosureSnapshot.emotionalClosureCue
        ? `Emotional closure cue: ${preDialogueClosureSnapshot.emotionalClosureCue}`
        : null,
      ...(preDialogueClosureSnapshot.briefingLines ?? []).map((line, index) => `Briefing ${index + 1}: ${line}`),
      ...preDialogueClosureSnapshot.reasons.map((reason, index) => `Reason ${index + 1}: ${reason}`),
    ].filter(Boolean).join('\n'))
  }

  const preDialogueSameHerStrategy = buildPreDialogueSameHerStrategy({
    projectStateContinuitySnapshot,
    preDialogueAwarenessSnapshot,
    preDialogueClosureSnapshot,
  })
  if (preDialogueSameHerStrategy)
    runtimeSystemSections.push(preDialogueSameHerStrategy)

  const { sections: contextSections, sensorySections } = buildAlicizationContextSections(input.contextsSnapshot ?? {})
  if (contextSections.length > 0) {
    runtimeSystemSections.push(contextSections.join('\n\n'))
  }

  if (sensorySections.length > 0) {
    runtimeSystemSections.push(sensorySections.join('\n\n'))
  }

  if (alicizationFixedStructuredContractAnchor.trim())
    runtimeSystemSections.push(alicizationFixedStructuredContractAnchor.trim())

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
    contractRequiresMindSpine: alicizationFixedStructuredContractAnchor.includes(contractMindSpineLine),
  }
}
