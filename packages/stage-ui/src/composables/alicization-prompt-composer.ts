import type { Message } from '@xsai/shared-chat'

import type { ContextMessage } from '../types/chat'

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

interface AlicizationPreDialogueAwarenessSnapshot {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  awarenessLine?: string | null
  emotionalClosureCue?: string | null
  reasonPreview?: string[]
}

interface AlicizationPreDialogueClosureSnapshot {
  status: 'grounded' | 'partial' | 'drift' | 'rewritten' | null
  summaryLine: string | null
  companionHeadlineLine?: string | null
  sameHerDriftRiskLine?: string | null
  companionshipReasonLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  emotionalClosureCue?: string | null
  briefingLines?: string[]
  reasons: string[]
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

function resolveProjectStateLatestLandedProgress(snapshot: AlicizationProjectStateContinuitySnapshot) {
  return [
    snapshot.latestLandedProgress,
    snapshot.latestProgress,
    snapshot.landedProgressSummary,
  ]
    .map(value => typeof value === 'string' ? value.trim() : '')
    .find(value => value.length > 0) ?? null
}

export function composeAlicizationPromptMessages(input: {
  messages: Message[]
  soulContent?: string | null
  hostName?: string | null
  personalityState?: AlicizationPersonalityState | null
  contextsSnapshot?: Record<string, ContextMessage[]>
  projectStateContinuitySnapshot?: AlicizationProjectStateContinuitySnapshot | null
  preDialogueAwarenessSnapshot?: AlicizationPreDialogueAwarenessSnapshot | null
  preDialogueClosureSnapshot?: AlicizationPreDialogueClosureSnapshot | null
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
      projectStateContinuitySnapshot.sameHerDriftRisk
        ? `- Same-her drift risk: ${projectStateContinuitySnapshot.sameHerDriftRisk}`
        : null,
      projectStateContinuitySnapshot.proactiveSameHerGap
        ? `- Proactive same-her gap: ${projectStateContinuitySnapshot.proactiveSameHerGap}`
        : null,
      `- Emotional closure cue: ${projectStateContinuitySnapshot.emotionalClosureCue ?? 'none recorded'}`,
      '- Treat this as same-thread project continuity, not as disposable metadata.',
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
      `Status: ${preDialogueClosureSnapshot.status ?? 'partial'}`,
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
