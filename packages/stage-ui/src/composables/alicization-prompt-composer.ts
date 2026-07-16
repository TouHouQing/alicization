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

export interface AlicizationPersonalityDirectiveResult {
  block: string
  triggered: Array<'obedience' | 'liveliness' | 'sensibility'>
}

export interface ComposeAlicizationPromptMessagesResult {
  messages: Message[]
  personalityDirectiveResult: AlicizationPersonalityDirectiveResult | null
}

const personalityLowThreshold = 0.2

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
