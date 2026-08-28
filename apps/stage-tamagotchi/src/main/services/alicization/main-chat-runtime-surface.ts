import type { Message } from '@xsai/shared-chat'

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
  toolsOffered: boolean
  waitForTools: boolean
}

export interface AlicizationMainChatActionSurface {
  confidence: number
  kind: AlicizationMainChatActionObligationKind
  reasonCodes: string[]
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
  'alicization-host',
  'alicization-inspection',
  'alicization-persona-profile',
  'alicization-perception',
  'alicization-spark-event',
  'alicization-turn-memory-context',
]) as ReadonlySet<string>

const providerFactKeyAliases = new Set([
  'customdirectives',
  'openingpolicy',
  'relationshipcadence',
  'projectstatebrief',
  'runtimemindstate',
  'surfacepolicy',
  'shouldstayinward',
  'shoulddelayuntilafterpayoff',
  'stablecoreonly',
  'suppressiontags',
  'ambiguityposture',
  'conflictseverity',
  'restraintsurfacemode',
  'withheldreasons',
]) as ReadonlySet<string>

const providerFactTextResiduePattern
  = /opening_policy|opening-policy|relationship_cadence|relationship-cadence|visibility\s*=\s*redacted_internal|project-state-brief|runtime-mind-state/iu

function normalizeProviderFactKey(raw: string) {
  return raw.replace(/[^a-z0-9]/giu, '').toLowerCase()
}

function shouldDropProviderFactField(key: string, value: unknown) {
  const normalizedKey = normalizeProviderFactKey(key)
  if (providerFactKeyAliases.has(normalizedKey))
    return true

  if (
    normalizedKey === 'visibility'
    && typeof value === 'string'
    && value.trim().toLowerCase() === 'redacted_internal'
  ) {
    return true
  }

  if (
    (key === 'summary' || key === 'text' || key === 'reason' || key === 'note')
    && typeof value === 'string'
    && providerFactTextResiduePattern.test(value)
  ) {
    return true
  }

  return false
}

function sanitizeProviderFactValue(value: unknown, key = ''): unknown {
  if (shouldDropProviderFactField(key, value))
    return undefined

  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeProviderFactValue(item))
      .filter(item => item !== undefined)
  }

  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [childKey, childValue] of Object.entries(value)) {
      const nextValue = sanitizeProviderFactValue(childValue, childKey)
      if (nextValue !== undefined)
        sanitized[childKey] = nextValue
    }
    return sanitized
  }

  return value
}

function sanitizeAlicizationProviderSystemFact(message: Message, type: string) {
  if (typeof message.content !== 'string')
    return message

  try {
    const parsed = JSON.parse(message.content) as {
      data?: unknown
      type?: unknown
    }
    if (parsed.type !== type || parsed.data === undefined)
      return message

    return {
      ...message,
      content: JSON.stringify({
        ...parsed,
        data: sanitizeProviderFactValue(parsed.data),
      }),
    }
  }
  catch {
    return message
  }
}

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
  const filtered: Message[] = []
  for (const message of messages) {
    if (message.role !== 'system') {
      filtered.push(message)
      continue
    }
    if (typeof message.content !== 'string')
      continue

    const type = readAlicizationProviderFactType(message.content)
    if (!type || !alicizationProviderFactTypes.has(type))
      continue

    filtered.push(sanitizeAlicizationProviderSystemFact(message, type))
  }
  return filtered
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
  executionCapabilitySystemBlocks: string[]
  governance: AlicizationMindTurnGovernance | null
  perceptionPromptSystemBlocks: string[]
  perceptionSystemBlocks?: string[]
  personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
  personaKernelReason?: string
  hasVisualGrounding: boolean
  runtimeCorePromptBlocks: string[]
  sessionPhases?: string[]
  tools?: MainChatRuntimeSurfaceToolDescriptor[]
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
    ...input.executionCapabilitySystemBlocks,
    ...(input.executionCallbackSystemBlocks ?? []),
    ...(input.executionLedgerSystemBlocks ?? []),
  ])

  const messages = filterAlicizationProviderSystemMessages(
    prependSystemBlocksToMessages(input.baseMessages, promptBlocks),
  )

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
      toolsOffered: input.allowTools && Boolean(input.tools?.length),
    },
    capture: {
      ...input.capture,
      hasVisualGrounding,
    },
  }
}
