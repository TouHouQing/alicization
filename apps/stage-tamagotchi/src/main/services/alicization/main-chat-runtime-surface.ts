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
import type {
  AlicizationMainChatReplyAuthoritySurface,
  AlicizationMainChatReplyExecutionPlanSurface,
} from './visible-reply/facade'

import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import {
  normalizeCustomDirectives,
  parseSoul,
} from './runtime-soul'
import {
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

const alicizationProviderFactTypes = new Set([
  'alicization-execution-callbacks',
  'alicization-execution-capabilities',
  'alicization-execution-ledger',
  'alicization-execution-reply-context',
  'alicization-execution-routing',
  'alicization-host',
  'alicization-inspection',
  'alicization-persona-profile',
  'alicization-perception',
  'alicization-spark-event',
  'alicization-turn-memory-context',
]) as ReadonlySet<string>

function readAlicizationProviderFactType(content: string) {
  try {
    const parsed = JSON.parse(content) as {
      data?: unknown
      type?: unknown
    }
    return typeof parsed?.type === 'string' && parsed.data !== undefined
      ? parsed.type
      : null
  }
  catch {
    return null
  }
}

export function filterAlicizationProviderSystemMessages(messages: Message[]) {
  return messages.filter((message) => {
    if (message.role !== 'system' || typeof message.content !== 'string')
      return true

    const type = readAlicizationProviderFactType(message.content)
    return Boolean(type && alicizationProviderFactTypes.has(type))
  })
}

interface MainChatRuntimeSurfaceToolDescriptor {
  function?: {
    name?: unknown
  }
}

export interface BuildAlicizationMainChatRuntimeSurfaceInput {
  actionObligation?: AlicizationMainChatActionObligation | null
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
  const promptBlocks = normalizeSystemBlocks([
    ...input.runtimeCorePromptBlocks,
    ...input.perceptionPromptSystemBlocks,
    ...(input.perceptionSystemBlocks ?? []),
    input.executionReplyObligationSystemBlock ?? '',
    ...input.executionCapabilitySystemBlocks,
    input.executionRoutingEnforcementSystemBlock ?? '',
    ...(input.executionCallbackSystemBlocks ?? []),
    ...(input.executionLedgerSystemBlocks ?? []),
  ])

  const messages = filterAlicizationProviderSystemMessages(
    prependSystemBlocksToMessages(input.baseMessages, promptBlocks),
  )

  const enforcedToolNames = extractAllowedToolNamesFromToolChoice(input.toolChoice, input.tools)
  const hasVisualGrounding = input.hasVisualGrounding
  const expectedVisibleReplyAuthority = resolveAlicizationMainChatNormalVisibleReplyAuthority(input.governance)
  const replyRealizationMode = 'provider-mind-required' as const
  const whyProviderMindRequired = 'provider-settlement-required'
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
