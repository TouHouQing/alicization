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

import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { sanitizeBriefText } from './runtime-realtime'
import {
  alicizationCustomDirectivesMarker,
  normalizeCustomDirectives,
  parseSoul,
  sanitizeText,
} from './runtime-soul'

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
  tooling: AlicizationMainChatToolingSurface
  trace: AlicizationMainChatTraceSurface
}

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

export function buildCardCustomDirectivesSystemBlock(directives: string) {
  const normalized = normalizeCustomDirectives(directives)
  if (!normalized)
    return ''

  return [
    alicizationCustomDirectivesMarker,
    '[Card-level behavior directives | high-priority persona kernel]',
    'Apply these directives consistently when generating thought/emotion/reply.',
    'These directives are lower priority than safety boundaries, human-in-the-loop permission, kill switch, the current Alicization answer plan, the current Alicization response charter, the current epistemic truth contract, and strict JSON output contract.',
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
    'Keep identity continuity only as light diction after truth, repair, and the host’s current ask are already handled.',
    'Do not let maid-role performance, clinginess, pet names, obedience display, or theatrical softness lead the reply.',
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
    const hostName = sanitizeText(parsed.frontmatter.profile.hostName, '')
    if (hostName)
      return hostName
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
        .map(entry => sanitizeText((entry as { function?: { name?: unknown } }).function?.name))
        .filter(Boolean))]
    }

    if (toolChoice.type === 'function') {
      const toolName = sanitizeText((toolChoice as { function?: { name?: unknown } }).function?.name)
      return toolName
        ? [toolName]
        : []
    }
  }

  if (toolChoice === 'required' && Array.isArray(tools)) {
    return [...new Set(tools
      .map(tool => sanitizeText(tool?.function?.name))
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
  const promptBlocks = normalizeSystemBlocks([
    ...input.runtimeCorePromptBlocks,
    ...input.perceptionPromptSystemBlocks,
    ...(input.perceptionSystemBlocks ?? []),
    input.actionObligationSystemBlock ?? '',
    input.executionReplyObligationSystemBlock ?? '',
    ...input.executionCapabilitySystemBlocks,
    input.executionRoutingEnforcementSystemBlock ?? '',
    ...(input.executionCallbackSystemBlocks ?? []),
    ...(input.executionLedgerSystemBlocks ?? []),
    ...(input.agentRuntimeSystemBlocks ?? []),
    ...input.organicMemorySystemBlocks,
    ...input.performanceManifestSystemBlocks,
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

  const enforcedToolNames = extractAllowedToolNamesFromToolChoice(input.toolChoice, input.tools)
  const hasVisualGrounding = input.hasVisualGrounding

  return {
    action: input.actionObligation
      ? {
          kind: input.actionObligation.kind,
          summary: input.actionObligation.summary,
          confidence: input.actionObligation.confidence,
          reasonCodes: input.actionObligation.reasonCodes,
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
    trace: {
      decisionTraceId: sanitizeText(input.governance?.decisionTraceId) || null,
      turnMode: input.governance?.turnMode ?? input.turnMode,
      personaKernelMode: input.governance?.personaKernelMode ?? input.personaKernelMode,
      sessionPhases: [...new Set((input.sessionPhases ?? []).map(phase => sanitizeText(phase)).filter(Boolean))],
    },
    tooling: {
      allowTools: input.allowTools,
      waitForTools: input.waitForTools,
      enforcedToolNames,
      routingRequired: enforcedToolNames.length > 0,
    },
    capture: {
      ...input.capture,
      hasVisualGrounding,
    },
  }
}
