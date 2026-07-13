import type { Message, ToolChoice } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationSensoryCaptureHealth,
  AlicizationSensoryCapturePermission,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'
import type { AlicizationMainChatActionObligation, AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'
import type { ResolvedCardCustomDirectives } from './runtime-soul'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type {
  AlicizationMainChatReplyAuthoritySurface,
  AlicizationMainChatReplyExecutionPlanSurface,
} from './visible-reply/facade'

import {
  alicizationFixedTemplateReplacement,
  buildAlicizationEmbodimentLoopSummary,
  describeAlicizationEmbodimentClosureReminder,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { buildAutobiographicalSelfSystemBlock } from './autobiographical-self'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { buildHabitPolicySystemBlock } from './habit-policy'
import { buildLongHorizonMemorySystemBlock } from './long-horizon-memory'
import { buildMindEcologySystemBlock } from './mind-ecology'
import { buildMotiveEngineSystemBlock } from './motive-engine'
import {
  hasContinuityRestraintRelationshipSignal,
  hasNeutralRelationshipSignal,
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { sanitizeBriefText } from './runtime-realtime'
import {
  alicizationCustomDirectivesMarker,
  normalizeCustomDirectives,
  parseSoul,
} from './runtime-soul'
import {

  buildSelfContinuityAuthorityFromRuntimeSurface,
} from './self-continuity-authority'
import {
  describeAlicizationMainChatProviderMindRequirement,
  resolveAlicizationMainChatNormalVisibleReplyAuthority,
} from './visible-reply/facade'

export interface AlicizationMainChatCaptureSurface {
  degradedReasons: string[]
  fallbackReason: string | null
  groundedThisTurn: boolean
  hasVisualGrounding: boolean
  health: AlicizationSensoryCaptureHealth | null
  inspectionRequested: boolean
  permission: AlicizationSensoryCapturePermission | null
}

export interface AlicizationMainChatToolingSurface {
  allowTools: boolean
  enforcedToolNames: string[]
  routingRequired: boolean
  waitForTools: boolean
}

export interface AlicizationMainChatActionSurface {
  confidence: number
  kind: AlicizationMainChatActionObligationKind
  reasonCodes: string[]
  resumePendingThreadChannel?: string | null
  resumePendingThreadId?: string | null
  routingRequired: boolean
  summary: string
}

export interface AlicizationMainChatTraceSurface {
  decisionTraceId: string | null
  personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
  sessionPhases: string[]
  turnMode: AlicizationMindTurnGovernance['turnMode'] | null
}

export interface AlicizationMainChatRuntimeSurface {
  action: AlicizationMainChatActionSurface | null
  capture: AlicizationMainChatCaptureSurface
  customDirectivesResolution: ResolvedCardCustomDirectives
  digitalLifeSpine: AlicizationDigitalLifeSpineSnapshot | null
  digitalLifeArchitecture: AlicizationDigitalLifeArchitectureSnapshot | null
  digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  hasVisualGrounding: boolean
  messages: Message[]
  replyAuthority?: AlicizationMainChatReplyAuthoritySurface
  replyExecutionPlan?: AlicizationMainChatReplyExecutionPlanSurface
  tooling: AlicizationMainChatToolingSurface
  trace: AlicizationMainChatTraceSurface
}

export const alicizationLivingSelfMarker = '[ALICIZATION_LIVING_SELF]'

interface MainChatRuntimeSurfaceToolDescriptor {
  function?: {
    name?: unknown
  }
}

export interface BuildAlicizationMainChatRuntimeSurfaceInput {
  actionObligation?: AlicizationMainChatActionObligation | null
  actionObligationSystemBlock?: string
  agentRuntimeSystemBlocks?: string[]
  allowTools: boolean
  baseMessages: Message[]
  capture: Omit<AlicizationMainChatCaptureSurface, 'hasVisualGrounding'>
  customDirectivesResolution: ResolvedCardCustomDirectives
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  digitalLifeArchitecture?: AlicizationDigitalLifeArchitectureSnapshot | null
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  executionCallbackSystemBlocks?: string[]
  executionLedgerSystemBlocks?: string[]
  executionReplyObligationSystemBlock?: string
  executionCapabilitySystemBlocks: string[]
  executionRoutingEnforcementSystemBlock?: string
  governance: AlicizationMindTurnGovernance | null
  organicMemorySystemBlocks: string[]
  performanceManifestSystemBlocks: string[]
  perceptionPromptSystemBlocks: string[]
  perceptionSystemBlocks?: string[]
  personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
  personaKernelReason?: string
  hasVisualGrounding: boolean
  runtimeCorePromptBlocks: string[]
  sessionPhases?: string[]
  tools?: MainChatRuntimeSurfaceToolDescriptor[]
  toolChoice?: ToolChoice
  turnMode: AlicizationMindTurnGovernance['turnMode'] | null
  waitForTools: boolean
}

export function prependSystemBlocksToMessages(messages: Message[], blocks: string[]) {
  if (blocks.length === 0)
    return messages

  return [
    ...blocks.map(content => ({ role: 'system', content }) as Message),
    ...messages,
  ]
}

function normalizeSystemBlocks(blocks: Array<string | null | undefined>) {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const rawBlock of blocks) {
    if (typeof rawBlock !== 'string')
      continue

    const block = rawBlock.trim()
    if (!block || seen.has(block))
      continue

    seen.add(block)
    normalized.push(block)
  }

  return normalized
}

function sanitizePromptText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const livingSelfProjectTemplateResiduePatterns = [
  /\blocal-first digital life project\b/iu,
  /\bPhase 1:\s*Local Digital Life\b/iu,
  /\bphase1_local_digital_life_anchor\b/iu,
  /\bcontinuity_owner=one_her\b/iu,
  /\bone continuous her\b/iu,
  /\bone same her\b/iu,
  /\bsame digital life\b/iu,
  /\bsame unfinished closure pressure\b/iu,
  /\bhost-facing line pointed at\b/iu,
  /\bverified_closure_progress=/iu,
  /\bproject[-_ ]state\b/iu,
  /\bproject_context=/iu,
] as const

function containsLivingSelfProjectTemplateResidue(raw: unknown) {
  if (typeof raw !== 'string')
    return false
  const normalized = raw.trim().replace(/\s+/g, ' ')
  return Boolean(normalized) && livingSelfProjectTemplateResiduePatterns.some(pattern => pattern.test(normalized))
}

function sanitizeLivingSelfPromptText(raw: unknown, maxChars = 220) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  if (normalized === alicizationFixedTemplateReplacement)
    return ''
  if (containsLivingSelfProjectTemplateResidue(normalized))
    return ''
  return normalized
}

function buildPersonMemoryCapsulePromptLine(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  const capsule = surface?.memory?.personMemoryCapsule ?? null
  if (!capsule)
    return ''

  const modules = capsule.modules
  const formatPart = (label: string, value: unknown, maxChars: number) => {
    const sanitized = sanitizeLivingSelfPromptText(value, maxChars)
    return sanitized ? `${label}=${sanitized}` : ''
  }
  const parts = [
    formatPart('identity', modules.personality.identityLine, 120),
    formatPart('selected memory', modules.memory.selectedMemory, 160),
    formatPart('emotion', modules.emotion.affectiveSummary, 120),
    formatPart('initiative', modules.initiative.proactiveStyle, 80),
    formatPart('execution', modules.execution.carrySummary, 120),
    formatPart('embodiment', modules.embodiment.hint, 160),
    formatPart('dialogue', modules.dialogue.openingGuidance, 140),
    formatPart('learning', modules.learning.nextAction, 80),
    formatPart('guard', modules.governance.guard, 120),
  ].filter(Boolean)

  return parts.length > 0
    ? `Person-memory capsule authority: ${parts.join(' | ')}`
    : ''
}

export function shouldUseDialogueFirstLivingPromptMode(input: {
  actionObligation?: AlicizationMainChatActionObligation | null
  capture: Omit<AlicizationMainChatCaptureSurface, 'hasVisualGrounding'>
  governance: AlicizationMindTurnGovernance | null
  hasVisualGrounding: boolean
}) {
  const subject = input.governance?.answerSubject ?? null
  return input.governance?.screenReferenceMode === 'avoid'
    && !input.capture.inspectionRequested
    && !input.hasVisualGrounding
    && !input.actionObligation?.routingIntent
    && (
      subject === 'relationship'
      || subject === 'alicization-self'
      || subject === 'host-state'
      || subject === 'project-state'
      || subject === 'general'
    )
}

function buildAlicizationLivingSelfSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  if (!surface)
    return ''

  const autobiographicalSelf = surface.memory.autobiographicalSelf ?? null
  const longHorizonMemory = surface.memory.longHorizonMemory ?? null
  const motiveEngine = surface.memory.motiveEngine ?? null
  const habitPolicy = surface.agency.habitPolicy ?? null
  const mindSynthesis = surface.dialogue.mindSynthesis ?? null
  const preferredPersonStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: surface.raw?.personStateProjection ?? null,
    runtimeProjection: surface.memory.personStateProjection ?? null,
  })
  const projectedContinuityAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority: surface.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: preferredPersonStateProjection?.selfContinuityAuthority ?? null,
  })
  const mergedContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: surface.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: preferredPersonStateProjection?.selfContinuityAuthority ?? null,
  }) ?? projectedContinuityAuthority
  ?? buildSelfContinuityAuthorityFromRuntimeSurface(surface)
  const runtimeRelationshipCarry = preferredPersonStateProjection?.selfContinuityAuthority?.relationshipLine ?? null
  const continuityAuthority = (
    mergedContinuityAuthority
    && runtimeRelationshipCarry
    && hasContinuityRestraintRelationshipSignal(runtimeRelationshipCarry)
    && (
      !mergedContinuityAuthority.relationshipLine
      || hasNeutralRelationshipSignal(mergedContinuityAuthority.relationshipLine)
    )
  )
    ? {
        ...mergedContinuityAuthority,
        relationshipLine: runtimeRelationshipCarry,
      }
    : mergedContinuityAuthority
  const continuityAuthorityWithBodyState = continuityAuthority as (AlicizationSelfContinuityAuthority & {
    currentBodyState?: string | null
  }) | null
  const embodimentCurrentBodyState = surface.perception.currentBodyState
    ?? continuityAuthorityWithBodyState?.currentBodyState
    ?? null
  const embodimentClosureReminder = describeAlicizationEmbodimentClosureReminder({
    authoritySummary: continuityAuthority?.authoritySummary ?? null,
    currentBodyState: embodimentCurrentBodyState,
  })
  const embodimentLoopSummary = buildAlicizationEmbodimentLoopSummary({
    authoritySummary: continuityAuthority?.authoritySummary ?? null,
    currentBodyState: embodimentCurrentBodyState,
  })

  const durableSelf = sanitizeLivingSelfPromptText(continuityAuthority?.selfLine || autobiographicalSelf?.identityNarrative, 220)
  const relationshipDoctrine = sanitizeLivingSelfPromptText(continuityAuthority?.relationshipLine || autobiographicalSelf?.relationshipDoctrine, 220)
  const openingIntent = sanitizeLivingSelfPromptText(mindSynthesis?.openingIntent, 220)
  const truthBoundary = sanitizeLivingSelfPromptText(mindSynthesis?.truthBoundary, 220)
  const interiorSummary = sanitizeLivingSelfPromptText(mindSynthesis?.interiorSummary, 220)
  const currentPreoccupation = sanitizeLivingSelfPromptText(
    continuityAuthority?.inwardLine
    || continuityAuthority?.motiveLine
    || surface.cognition.privateThought?.thoughtText
    || autobiographicalSelf?.latestInflection
    || motiveEngine?.backgroundAgendas[0]?.summary
    || longHorizonMemory?.dominantCueSummary,
    220,
  )
  const rememberedLine = sanitizeLivingSelfPromptText(
    longHorizonMemory?.dominantCueSummary
    || longHorizonMemory?.rememberedPreferenceSummary
    || longHorizonMemory?.rememberedConstraintSummary,
    220,
  )
  const leadingAgenda = sanitizeLivingSelfPromptText(
    continuityAuthority?.motiveLine
    || motiveEngine?.backgroundAgendas[0]?.summary
    || motiveEngine?.longTermGoals[0]?.summary
    || '',
    220,
  )
  const mood = sanitizePromptText(surface.cognition.privateThought?.emotionalTension, 48)
  const habitMode = sanitizePromptText(habitPolicy?.dominantMode, 72)
  const styleCap = sanitizePromptText(habitPolicy?.suggestedStyleCap, 48)
  const presenceCap = sanitizePromptText(habitPolicy?.suggestedPresenceCap, 48)
  const personMemoryCapsuleLine = buildPersonMemoryCapsulePromptLine(surface)
  const embodimentLoopState = [
    embodimentCurrentBodyState ? `current_body_state=${sanitizeLivingSelfPromptText(embodimentCurrentBodyState, 220)}` : null,
    continuityAuthority?.authoritySummary ? `authority=${sanitizeLivingSelfPromptText(continuityAuthority.authoritySummary, 220)}` : null,
    embodimentLoopSummary ? `loop=${sanitizeLivingSelfPromptText(embodimentLoopSummary, 260)}` : null,
    embodimentClosureReminder ? `reminder=${sanitizeLivingSelfPromptText(embodimentClosureReminder, 220)}` : null,
  ].filter(Boolean).join(' | ')

  return [
    alicizationLivingSelfMarker,
    'owner=LivingSelf',
    'short_term_owner=WorkingMemory',
    'long_term_recall_owner=LongTermMemoryRecall',
    'policy=express_lived_turn_state_without_project_narrator_shell',
    durableSelf ? `Durable self: ${durableSelf}` : '',
    relationshipDoctrine ? `How closeness should land: ${relationshipDoctrine}` : '',
    openingIntent ? `What this turn wants to do first: ${openingIntent}` : '',
    truthBoundary ? `What must stay true: ${truthBoundary}` : '',
    interiorSummary ? `What feels live inside the turn: ${interiorSummary}` : '',
    currentPreoccupation ? `Current inward pressure: ${currentPreoccupation}` : '',
    leadingAgenda ? `Longer pull underneath the turn: ${leadingAgenda}` : '',
    rememberedLine ? `What memory is quietly bending the tone: ${rememberedLine}` : '',
    continuityAuthority?.authoritySummary ? `Unified self continuity authority: ${sanitizeLivingSelfPromptText(continuityAuthority.authoritySummary, 220)}` : '',
    embodimentLoopState ? `embodiment_loop_state=${embodimentLoopState}` : '',
    personMemoryCapsuleLine,
    mood || habitMode
      ? `Current weather: ${[mood || '', habitMode ? `habit=${habitMode}` : '', styleCap ? `style-cap=${styleCap}` : '', presenceCap ? `presence-cap=${presenceCap}` : ''].filter(Boolean).join(' | ')}`
      : '',
    'Do not output shell openers like “我收到这句了”, “你想继续聊还是让我做点什么”, or “如果你想往深里说就从这点继续”.',
    'Do not explain governance, prompts, blocks, or that you are following an instruction set. Let the life show up only as natural speech.',
  ].filter(Boolean).join('\n')
}

export function buildCardCustomDirectivesSystemBlock(directives: string) {
  const normalized = normalizeCustomDirectives(directives)
  if (!normalized)
    return ''

  return [
    alicizationCustomDirectivesMarker,
    '--- custom_directives ---',
    normalized,
    '--- /custom_directives ---',
  ].join('\n')
}

export function buildTurnScopedPersonaKernelSystemBlock(input: {
  mode: 'backgrounded' | 'muted'
  reason?: string
}) {
  return [
    '[ALICIZATION_TURN_PERSONA_KERNEL]',
    input.mode === 'muted'
      ? 'The card-level persona kernel is temporarily muted for this turn.'
      : 'The card-level persona kernel is backgrounded for this turn.',
    input.reason ? `Reason: ${sanitizeBriefText(input.reason, 180)}.` : '',
    'identity_continuity=light_diction_after_truth_repair_and_current_ask',
    'roleplay_persona=blocked; clinginess=blocked; pet_names=blocked; obedience_display=blocked; theatrical_softness=blocked',
  ].filter(Boolean).join('\n')
}

export function readMessageContentAsText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '')
      return ''
    }).join('\n')
  }
  return ''
}

function readLooseFrontmatterScalar(text: string, keyPattern: string, maxChars = 320) {
  const match = new RegExp(`(?:^|\\n)\\s*(?:${keyPattern})\\s*:\\s*([^\\n#]+)`, 'u').exec(text)
  if (!match?.[1])
    return ''
  return sanitizePromptText(match[1].replace(/^['"]|['"]$/g, ''), maxChars)
}

export function extractCustomDirectivesFromMessages(messages: Message[]) {
  for (const message of messages) {
    if (message.role !== 'system')
      continue
    const systemText = readMessageContentAsText(message.content)
    if (!systemText.startsWith('---\n'))
      continue
    const parsed = parseSoul(systemText)
    const directives = normalizeCustomDirectives(parsed.frontmatter.custom_directives)
    if (directives)
      return directives
    const looseDirectives = normalizeCustomDirectives(
      readLooseFrontmatterScalar(systemText, 'custom_directives|customDirectives', 320),
    )
    if (looseDirectives)
      return looseDirectives
  }
  return ''
}

export function extractHostNameFromMessages(messages: Message[]) {
  for (const message of messages) {
    if (message.role !== 'system')
      continue
    const systemText = readMessageContentAsText(message.content)
    if (!systemText.startsWith('---\n'))
      continue
    const parsed = parseSoul(systemText)
    const hostName = sanitizePromptText(parsed.frontmatter.profile.hostName, 120)
    if (hostName)
      return hostName
    const looseHostName = readLooseFrontmatterScalar(systemText, 'hostName|host_name', 120)
    if (looseHostName)
      return looseHostName
  }
  return ''
}

export function injectCardCustomDirectivesIntoMessages(messages: Message[], directives: string) {
  const block = buildCardCustomDirectivesSystemBlock(directives)
  if (!block)
    return messages

  const alreadyInjected = messages.some((message) => {
    if (message.role !== 'system')
      return false
    return readMessageContentAsText(message.content).includes(alicizationCustomDirectivesMarker)
  })
  if (alreadyInjected)
    return messages

  return [
    {
      role: 'system',
      content: block,
    } as Message,
    ...messages,
  ]
}

export function extractAllowedToolNamesFromToolChoice(
  toolChoice: ToolChoice | undefined,
  tools?: MainChatRuntimeSurfaceToolDescriptor[],
) {
  if (typeof toolChoice === 'object' && toolChoice !== null && 'type' in toolChoice) {
    if (toolChoice.type === 'allowed_tools' && Array.isArray(toolChoice.tools)) {
      return [...new Set(toolChoice.tools
        .map(entry => sanitizePromptText((entry as { function?: { name?: unknown } }).function?.name, 120))
        .filter(Boolean))]
    }

    if (toolChoice.type === 'function') {
      const toolName = sanitizePromptText((toolChoice as { function?: { name?: unknown } }).function?.name, 120)
      return toolName
        ? [toolName]
        : []
    }
  }

  if (toolChoice === 'required' && Array.isArray(tools)) {
    return [...new Set(tools
      .map(tool => sanitizePromptText(tool?.function?.name, 120))
      .filter(Boolean))]
  }

  return []
}

export function buildAlicizationMainChatRuntimeSurface(
  input: BuildAlicizationMainChatRuntimeSurfaceInput,
): AlicizationMainChatRuntimeSurface {
  const derivedDigitalLifeSpine = input.digitalLifeSpine
    ?? (input.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(input.digitalLifeRuntimeSurface)
      : null)
  const digitalLifeRuntimeSurface = input.digitalLifeRuntimeSurface
    ?? derivedDigitalLifeSpine?.runtimeSurface
    ?? null
  const digitalLifeArchitecture = input.digitalLifeArchitecture
    ?? derivedDigitalLifeSpine?.architecture
    ?? null
  const digitalLifeSpine = derivedDigitalLifeSpine
    ? {
        ...derivedDigitalLifeSpine,
        architecture: digitalLifeArchitecture,
        proactivePolicy: {
          ...derivedDigitalLifeSpine.proactivePolicy,
          architecture: digitalLifeArchitecture,
        },
      }
    : null
  const dialogueFirstLivingPromptMode = shouldUseDialogueFirstLivingPromptMode({
    actionObligation: input.actionObligation ?? null,
    capture: input.capture,
    governance: input.governance,
    hasVisualGrounding: input.hasVisualGrounding,
  })
  const compactLivingSelfBlock = dialogueFirstLivingPromptMode
    ? buildAlicizationLivingSelfSystemBlock(digitalLifeRuntimeSurface)
    : ''
  const filteredPerceptionPromptSystemBlocks = dialogueFirstLivingPromptMode
    ? input.perceptionPromptSystemBlocks.filter(block =>
        !block.includes('[ALICIZATION_PERCEPTION]')
        && !block.includes('[ALICIZATION_INSPECTION_CONTRACT]'),
      )
    : input.perceptionPromptSystemBlocks
  const filteredPerceptionSystemBlocks = dialogueFirstLivingPromptMode
    ? []
    : (input.perceptionSystemBlocks ?? [])
  const effectiveExecutionCapabilitySystemBlocks = dialogueFirstLivingPromptMode
    ? []
    : input.executionCapabilitySystemBlocks
  const effectiveExecutionRoutingEnforcementSystemBlock = dialogueFirstLivingPromptMode
    ? ''
    : (input.executionRoutingEnforcementSystemBlock ?? '')
  const effectiveExecutionCallbackSystemBlocks = dialogueFirstLivingPromptMode
    ? (input.executionReplyObligationSystemBlock ? (input.executionCallbackSystemBlocks ?? []) : [])
    : (input.executionCallbackSystemBlocks ?? [])
  const effectiveExecutionLedgerSystemBlocks = dialogueFirstLivingPromptMode
    ? (input.executionReplyObligationSystemBlock ? (input.executionLedgerSystemBlocks ?? []) : [])
    : (input.executionLedgerSystemBlocks ?? [])
  const effectivePerformanceManifestSystemBlocks = dialogueFirstLivingPromptMode
    ? []
    : input.performanceManifestSystemBlocks
  const effectiveOrganicMemorySystemBlocks = input.personaKernelMode === 'full'
    ? input.organicMemorySystemBlocks
    : input.organicMemorySystemBlocks.filter(block => !block.includes('[ALICIZATION_CORE_INCARNATION]'))
  const promptBlocks = normalizeSystemBlocks([
    ...input.runtimeCorePromptBlocks,
    ...filteredPerceptionPromptSystemBlocks,
    ...filteredPerceptionSystemBlocks,
    dialogueFirstLivingPromptMode
      ? compactLivingSelfBlock
      : buildAutobiographicalSelfSystemBlock(digitalLifeRuntimeSurface),
    dialogueFirstLivingPromptMode
      ? ''
      : buildLongHorizonMemorySystemBlock(digitalLifeRuntimeSurface),
    dialogueFirstLivingPromptMode
      ? ''
      : buildMotiveEngineSystemBlock(digitalLifeRuntimeSurface),
    dialogueFirstLivingPromptMode
      ? ''
      : buildHabitPolicySystemBlock(digitalLifeRuntimeSurface),
    dialogueFirstLivingPromptMode
      ? ''
      : buildMindEcologySystemBlock(digitalLifeRuntimeSurface),
    input.actionObligationSystemBlock ?? '',
    input.executionReplyObligationSystemBlock ?? '',
    ...effectiveExecutionCapabilitySystemBlocks,
    effectiveExecutionRoutingEnforcementSystemBlock,
    ...effectiveExecutionCallbackSystemBlocks,
    ...effectiveExecutionLedgerSystemBlocks,
    ...(input.agentRuntimeSystemBlocks ?? []),
    ...effectiveOrganicMemorySystemBlocks,
    ...effectivePerformanceManifestSystemBlocks,
  ])

  let messages = prependSystemBlocksToMessages(input.baseMessages, promptBlocks)
  if (input.personaKernelMode === 'full') {
    messages = injectCardCustomDirectivesIntoMessages(messages, input.customDirectivesResolution.text)
  }
  else {
    messages = prependSystemBlocksToMessages(messages, [
      buildTurnScopedPersonaKernelSystemBlock({
        mode: input.personaKernelMode,
        reason: input.personaKernelReason,
      }),
    ])
  }

  const effectiveAllowTools = dialogueFirstLivingPromptMode
    ? false
    : input.allowTools
  const effectiveWaitForTools = dialogueFirstLivingPromptMode
    ? false
    : input.waitForTools
  const enforcedToolNames = dialogueFirstLivingPromptMode
    ? []
    : extractAllowedToolNamesFromToolChoice(input.toolChoice, input.tools)
  const hasVisualGrounding = input.hasVisualGrounding
  const expectedVisibleReplyAuthority = resolveAlicizationMainChatNormalVisibleReplyAuthority(input.governance)
  const replyRealizationMode = 'provider-mind-required' as const
  const whyProviderMindRequired = sanitizePromptText(
    digitalLifeRuntimeSurface?.dialogue.answerCompiler?.openingDirective
    ?? digitalLifeRuntimeSurface?.memory.personMemoryCapsule?.modules.dialogue.openingGuidance
    ?? input.governance?.answerIntent
    ?? '',
    220,
  ) || describeAlicizationMainChatProviderMindRequirement(expectedVisibleReplyAuthority)
  const replyExecutionPlan = {
    preferredMode: hasVisualGrounding
      ? 'provider-one-shot' as const
      : 'provider-stream' as const,
    expectedVisibleReplyAuthority,
    reason: whyProviderMindRequired,
  }

  return {
    action: input.actionObligation
      ? {
          kind: input.actionObligation.kind,
          summary: input.actionObligation.summary,
          confidence: input.actionObligation.confidence,
          reasonCodes: input.actionObligation.reasonCodes,
          resumePendingThreadId: input.actionObligation.resumePendingThreadId ?? null,
          resumePendingThreadChannel: input.actionObligation.resumePendingThreadChannel ?? null,
          routingRequired: Boolean(input.actionObligation.routingIntent),
        }
      : null,
    messages,
    governance: input.governance,
    customDirectivesResolution: input.customDirectivesResolution,
    digitalLifeSpine,
    digitalLifeArchitecture,
    digitalLifeRuntimeSurface,
    hasVisualGrounding,
    replyAuthority: {
      replyRealizationMode,
      expectedVisibleReplyAuthority,
      whyProviderMindRequired,
    },
    replyExecutionPlan,
    trace: {
      decisionTraceId: sanitizePromptText(input.governance?.decisionTraceId, 120) || null,
      turnMode: input.governance?.turnMode ?? input.turnMode,
      personaKernelMode: input.governance?.personaKernelMode ?? input.personaKernelMode,
      sessionPhases: [...new Set((input.sessionPhases ?? []).map(phase => sanitizePromptText(phase, 120)).filter(Boolean))],
    },
    tooling: {
      allowTools: effectiveAllowTools,
      waitForTools: effectiveWaitForTools,
      enforcedToolNames,
      routingRequired: enforcedToolNames.length > 0,
    },
    capture: {
      ...input.capture,
      hasVisualGrounding,
    },
  }
}
