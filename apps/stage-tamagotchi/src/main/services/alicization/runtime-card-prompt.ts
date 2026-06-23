import type { AlicizationPersonaKernelSnapshot } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationSoulSnapshot,
} from '../../../shared/eventa'
import type { ResolvedCardCustomDirectives } from './runtime-soul'

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

import {
  alicizationFixedCoreSystemInstruction,
  alicizationFixedHostNameDirectiveTemplate,
  alicizationFixedStructuredContractAnchor,
  hasAlicizationPersonaIdentity,
  renderAlicizationPromptTemplate,
  resolveAlicizationPersonaKernel,
} from '@proj-alicization/stage-shared'

import {
  extractCustomDirectivesFromMessages,
  extractHostNameFromMessages,
} from './main-chat-runtime-surface'
import {
  normalizeCustomDirectives,
  parseSoul,
} from './runtime-soul'

const alicizationPersonaProfileMarker = '[ALICIZATION_PERSONA_PROFILE]'

interface CreateAlicizationCardPromptRuntimeOptions {
  getActiveCardId: () => string
  getSoulSnapshot: () => AlicizationSoulSnapshot | null
  resolveCardPaths: (cardId: string) => {
    soulPath: string
  }
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
}

export function createAlicizationCardPromptRuntime(options: CreateAlicizationCardPromptRuntimeOptions) {
  const {
    getActiveCardId,
    getSoulSnapshot,
    resolveCardPaths,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
  } = options

  async function resolveCardHostName(cardId: string, options?: { messages?: Message[] }) {
    const activeCardId = getActiveCardId()
    const soulSnapshot = getSoulSnapshot()
    const normalizedCardId = normalizeCardId(cardId)
    let readFailed = false
    try {
      if (normalizedCardId === activeCardId && soulSnapshot) {
        const hostName = sanitizeText(soulSnapshot.frontmatter.profile.hostName, '')
        if (hostName)
          return hostName
      }

      const targetSoulPath = resolveCardPaths(normalizedCardId).soulPath
      if (existsSync(targetSoulPath)) {
        const content = await readFile(targetSoulPath, 'utf-8')
        const hostName = sanitizeText(parseSoul(content).frontmatter.profile.hostName, '')
        if (hostName)
          return hostName
      }
    }
    catch (error) {
      readFailed = true
      await appendRuntimeDebugLine('host-name.resolve-error', {
        cardId: normalizedCardId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const fallback = extractHostNameFromMessages(options?.messages ?? [])
    if (fallback)
      return fallback

    if (readFailed) {
      await appendRuntimeDebugLine('host-name.resolve-fallback-empty', {
        cardId: normalizedCardId,
      })
    }
    return ''
  }

  function resolvePersonaKernelFromSoulContent(content: string) {
    const parsed = parseSoul(content)
    if (!hasAlicizationPersonaIdentity(parsed.frontmatter.profile))
      return null
    return resolveAlicizationPersonaKernel({
      profile: parsed.frontmatter.profile,
      personality: parsed.frontmatter.personality,
      customDirectives: parsed.frontmatter.custom_directives,
      hostAttitude: parsed.frontmatter.host_attitude,
      coreIncarnation: parsed.frontmatter.core_incarnation,
    })
  }

  async function resolveCardPersonaKernel(cardId: string, options?: { messages?: Message[] }): Promise<AlicizationPersonaKernelSnapshot | null> {
    const activeCardId = getActiveCardId()
    const soulSnapshot = getSoulSnapshot()
    const normalizedCardId = normalizeCardId(cardId)
    let readFailed = false
    try {
      if (normalizedCardId === activeCardId && soulSnapshot) {
        const kernel = resolvePersonaKernelFromSoulContent(soulSnapshot.content)
        if (kernel)
          return kernel
      }

      const targetSoulPath = resolveCardPaths(normalizedCardId).soulPath
      if (existsSync(targetSoulPath)) {
        const content = await readFile(targetSoulPath, 'utf-8')
        const kernel = resolvePersonaKernelFromSoulContent(content)
        if (kernel)
          return kernel
      }
    }
    catch (error) {
      readFailed = true
      await appendRuntimeDebugLine('persona-kernel.resolve-error', {
        cardId: normalizedCardId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    for (const message of options?.messages ?? []) {
      if (message.role !== 'system')
        continue
      const systemText = String(message.content ?? '')
      if (!systemText.startsWith('---\n'))
        continue
      const kernel = resolvePersonaKernelFromSoulContent(systemText)
      if (kernel)
        return kernel
    }

    if (readFailed) {
      await appendRuntimeDebugLine('persona-kernel.resolve-fallback-empty', {
        cardId: normalizedCardId,
      })
    }
    return null
  }

  function buildPersonaProfileSystemBlock(personaKernel?: AlicizationPersonaKernelSnapshot | null) {
    if (!personaKernel || !hasAlicizationPersonaIdentity(personaKernel.profile))
      return ''
    return [
      alicizationPersonaProfileMarker,
      JSON.stringify({
        ownerName: personaKernel.profile.ownerName,
        hostName: personaKernel.profile.hostName,
        alicizationName: personaKernel.profile.alicizationName,
        relationship: personaKernel.profile.relationship,
        gender: personaKernel.profile.gender,
        mindAge: personaKernel.profile.mindAge,
      }),
    ].join('\n')
  }

  function buildMainRuntimeCorePromptBlocks(input: {
    hostName?: string
    personaKernel?: AlicizationPersonaKernelSnapshot | null
  }) {
    const blocks: string[] = []
    if (alicizationFixedCoreSystemInstruction.trim())
      blocks.push(alicizationFixedCoreSystemInstruction.trim())

    const hostName = sanitizeText(input.hostName, '')
    if (hostName) {
      blocks.push(renderAlicizationPromptTemplate(alicizationFixedHostNameDirectiveTemplate, {
        hostName,
        source: 'host',
        content: '',
        iso: '',
        local: '',
        moduleName: '',
      }).trim())
    }

    if (alicizationFixedStructuredContractAnchor.trim())
      blocks.push(alicizationFixedStructuredContractAnchor.trim())

    const personaProfileBlock = buildPersonaProfileSystemBlock(input.personaKernel)
    if (personaProfileBlock)
      blocks.push(personaProfileBlock)

    return blocks.filter(Boolean)
  }

  async function resolveCardCustomDirectives(cardId: string, options?: { messages?: Message[] }): Promise<ResolvedCardCustomDirectives> {
    const activeCardId = getActiveCardId()
    const soulSnapshot = getSoulSnapshot()
    const normalizedCardId = normalizeCardId(cardId)
    let readFailed = false
    try {
      if (normalizedCardId === activeCardId && soulSnapshot) {
        const directives = normalizeCustomDirectives(soulSnapshot.frontmatter.custom_directives)
        if (directives) {
          return {
            text: directives,
            source: 'card-soul',
          }
        }
      }

      const targetSoulPath = resolveCardPaths(normalizedCardId).soulPath
      if (existsSync(targetSoulPath)) {
        const content = await readFile(targetSoulPath, 'utf-8')
        const directives = normalizeCustomDirectives(parseSoul(content).frontmatter.custom_directives)
        if (directives) {
          return {
            text: directives,
            source: 'card-soul',
          }
        }
      }
    }
    catch (error) {
      readFailed = true
      await appendRuntimeDebugLine('custom-directives.resolve-error', {
        cardId: normalizedCardId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const fallback = extractCustomDirectivesFromMessages(options?.messages ?? [])
    if (fallback) {
      return {
        text: fallback,
        source: 'payload-soul',
      }
    }

    return {
      text: '',
      source: readFailed ? 'error' : 'none',
    }
  }

  function sanitizeMainGatewayAgentTurnSegment(raw: unknown) {
    return sanitizeText(raw)
      .replace(/\s+/g, '-')
      .replace(/[^\w:-]+/g, '-')
      .slice(0, 120)
  }

  function buildMainGatewayAgentTurnId(...segments: Array<unknown>) {
    const normalized = segments
      .map(segment => sanitizeMainGatewayAgentTurnSegment(
        typeof segment === 'number' ? String(segment) : segment,
      ))
      .filter(Boolean)
    if (normalized.length > 0)
      return normalized.join(':')
    return `oneshot:${normalizeCardId(getActiveCardId())}:${Date.now()}`
  }

  return {
    resolveCardHostName,
    resolveCardPersonaKernel,
    buildPersonaProfileSystemBlock,
    buildMainRuntimeCorePromptBlocks,
    resolveCardCustomDirectives,
    buildMainGatewayAgentTurnId,
  }
}
