import type {
  AlicizationActiveThought,
  AlicizationOrganicMemorySnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { ContextualConversationTurn } from './runtime-soul'

import { filterOrganicMemoryEntries, isPersonaResidueMemoryText } from './organic-memory-hygiene'
import {
  parsePerformanceManifestFromMeta,
  sanitizePerformanceManifest,
} from './runtime-governance'
import {
  buildDirectFts5Query,
  buildFts5QueryFromTerms,
  extractOrganicRecallTerms,
  normalizeOrganicRecallText,
} from './runtime-organic-recall'
import {
  alicizationDreamLastRunMetaKey,
  alicizationPerformanceManifestMetaKey,
} from './runtime-soul'
import { rankSubconsciousRecallFragments } from './subconscious-recall-ranking'

interface CreateAlicizationOrganicMemoryAccessRuntimeOptions {
  getSoulSnapshot: () => AlicizationSoulSnapshot | null
  bootstrap: () => Promise<AlicizationSoulSnapshot>
  listActiveThoughts: () => Promise<AlicizationActiveThought[]>
  countSubconsciousFragments: () => Promise<number>
  listRecentSubconsciousFragments: (limit: number) => Promise<AlicizationSubconsciousFragment[]>
  getMetaValue: (key: string) => Promise<string | undefined>
  replaceActiveThoughts: (items: Array<{ text: string }>) => Promise<void>
  setMetaValue: (key: string, value: string) => Promise<void>
  searchSubconsciousFragments: (query: string, limit: number) => Promise<AlicizationSubconsciousFragment[]>
  listConversationTurnsBySession: (sessionId: string, options: { limit: number }) => Promise<Array<{
    userText?: string | null
    assistantText?: string | null
  }>>
}

export function createAlicizationOrganicMemoryAccessRuntime(options: CreateAlicizationOrganicMemoryAccessRuntimeOptions) {
  async function getOrganicMemorySnapshot() {
    const currentSoul = options.getSoulSnapshot() ?? await options.bootstrap()
    const [rawActiveThoughts, subconsciousCount, rawRecentSubconsciousFragments, rawLastDreamedAt] = await Promise.all([
      options.listActiveThoughts().catch(() => []),
      options.countSubconsciousFragments().catch(() => 0),
      options.listRecentSubconsciousFragments(8).catch(() => []),
      options.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined),
    ])
    const parsedLastDreamedAt = Number.parseInt(String(rawLastDreamedAt ?? ''), 10)
    const activeThoughts = filterOrganicMemoryEntries(rawActiveThoughts)
    const recentSubconsciousFragments = rawRecentSubconsciousFragments.filter(fragment => !isPersonaResidueMemoryText(fragment.text))

    if (activeThoughts.length !== rawActiveThoughts.length) {
      void options.replaceActiveThoughts(activeThoughts.map(item => ({ text: item.text }))).catch(() => {})
    }

    return {
      hostAttitude: currentSoul.frontmatter.host_attitude,
      coreIncarnation: currentSoul.frontmatter.core_incarnation,
      activeThoughts,
      subconsciousCount,
      recentSubconsciousFragments,
      lastDreamedAt: Number.isFinite(parsedLastDreamedAt) ? Math.max(0, parsedLastDreamedAt) : null,
    } satisfies AlicizationOrganicMemorySnapshot
  }

  async function getPerformanceManifest() {
    const raw = await options.getMetaValue(alicizationPerformanceManifestMetaKey).catch(() => undefined)
    return parsePerformanceManifestFromMeta(raw)
  }

  async function setPerformanceManifest(manifest: CharacterPerformanceCapabilitiesManifest | null) {
    if (!manifest) {
      await options.setMetaValue(alicizationPerformanceManifestMetaKey, '').catch(() => {})
      return
    }

    const sanitized = sanitizePerformanceManifest(manifest)
    await options.setMetaValue(
      alicizationPerformanceManifestMetaKey,
      JSON.stringify(sanitized ?? null),
    ).catch(() => {})
  }

  async function searchOrganicSubconsciousFragments(query: string, limit = 12) {
    const extractedTerms = extractOrganicRecallTerms(query)
    const ftsQuery = extractedTerms.length > 0
      ? buildFts5QueryFromTerms(extractedTerms)
      : buildDirectFts5Query(query)
    if (!ftsQuery)
      return []
    return await options.searchSubconsciousFragments(ftsQuery, Math.max(1, Math.min(20, limit))).catch(() => [])
  }

  async function recallSubconsciousFragmentsWithGovernor(input: {
    text: string
    recalledFragmentCap?: number
    recalledFragmentSourceBudget?: AlicizationRecallGovernorSnapshot['recalledFragmentSourceBudget']
  }) {
    const terms = extractOrganicRecallTerms(input.text)
    if (terms.length === 0)
      return []

    const ftsQuery = buildFts5QueryFromTerms(terms)
    if (!ftsQuery)
      return []

    const rows = await options.searchSubconsciousFragments(ftsQuery, 6).catch(() => [])
    return rankSubconsciousRecallFragments({
      rows,
      terms,
      limit: Number.isFinite(input.recalledFragmentCap)
        ? Math.max(1, Math.floor(Number(input.recalledFragmentCap)))
        : 2,
      sourceBudget: input.recalledFragmentSourceBudget ?? [],
    })
  }

  async function resolveRecentContextualTurns(sessionId: string, turnCount: number) {
    if (!sessionId)
      return []

    const rows = await options.listConversationTurnsBySession(sessionId, { limit: 12 }).catch(() => [])
    return rows
      .filter(row => normalizeOrganicRecallText(row.userText ?? '') || normalizeOrganicRecallText(row.assistantText ?? ''))
      .slice(-turnCount)
      .map((row): ContextualConversationTurn => ({
        userText: normalizeOrganicRecallText(row.userText ?? ''),
        assistantText: normalizeOrganicRecallText(row.assistantText ?? ''),
      }))
  }

  return {
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    recallSubconsciousFragmentsWithGovernor,
    resolveRecentContextualTurns,
  }
}
