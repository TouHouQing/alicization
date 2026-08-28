import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  alicizationFixedTemplateReplacement,
  buildAlicizationProviderFactBlock,
  sanitizeAlicizationMemoryEvidenceText,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

function sanitizeOrganicMemoryProviderText(raw: unknown, maxChars = 220) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  if (!normalized || normalized === alicizationFixedTemplateReplacement)
    return ''
  return normalized
}

function sanitizeOrganicMemoryEvidenceText(raw: unknown, maxChars = 220) {
  return sanitizeAlicizationMemoryEvidenceText(raw, maxChars)
}

function sanitizeOrganicMemoryEvidenceList(
  values: Array<unknown> | null | undefined,
  maxItems: number,
  maxChars = 180,
) {
  return (values ?? [])
    .slice(0, maxItems)
    .map(value => sanitizeOrganicMemoryEvidenceText(value, maxChars))
    .filter(Boolean)
}

export function buildOrganicMemoryProviderFactBlocks(
  context: OrganicMemoryPromptContext,
) {
  const blocks: string[] = []
  const hostAttitude = sanitizeOrganicMemoryProviderText(context.hostAttitude, 180)
  const coreIncarnation = sanitizeOrganicMemoryProviderText(context.coreIncarnation, 500)
  const activeThoughts = context.activeThoughts
    .slice(0, 5)
    .map(item => sanitizeOrganicMemoryProviderText(item.text, 220))
    .filter(Boolean)

  if (hostAttitude || coreIncarnation || activeThoughts.length > 0) {
    blocks.push(buildAlicizationProviderFactBlock('alicization-organic-self-context', {
      hostAttitude: hostAttitude || null,
      coreIncarnation: coreIncarnation || null,
      activeThoughts,
    }))
  }

  const retrievedFacts = context.retrievedFacts
    .slice(0, 12)
    .map(fact => ({
      id: fact.id,
      subject: sanitizeOrganicMemoryEvidenceText(fact.subject, 120) || null,
      predicate: sanitizeOrganicMemoryEvidenceText(fact.predicate, 120) || null,
      object: sanitizeOrganicMemoryEvidenceText(fact.object, 260) || null,
      confidence: fact.confidence,
      memoryTier: fact.memoryTier ?? null,
      provenance: fact.provenance ?? 'remembered',
      source: sanitizeOrganicMemoryEvidenceText(fact.source, 120) || null,
    }))
    .filter(fact => fact.subject || fact.predicate || fact.object)
  const recalledFragments = context.recalledFragments
    .slice(0, 10)
    .map(fragment => ({
      id: fragment.id,
      text: sanitizeOrganicMemoryEvidenceText(fragment.text, 320) || null,
      sourceKind: fragment.sourceKind,
      provenance: fragment.provenance ?? 'remembered',
      createdAt: fragment.createdAt,
    }))
    .filter(fragment => fragment.text)
  const recalledEpisodes = (context.recalledEpisodes ?? [])
    .slice(0, 8)
    .map(episode => ({
      id: episode.id,
      occurredAt: episode.occurredAt,
      whatHappened: sanitizeOrganicMemoryEvidenceText(episode.whatHappened, 320) || null,
      felt: sanitizeOrganicMemoryEvidenceText(episode.felt ?? '', 180) || null,
      whatChanged: sanitizeOrganicMemoryEvidenceText(episode.whatChanged ?? '', 220) || null,
      confidence: episode.confidence,
      memoryTier: episode.memoryTier ?? null,
      provenance: episode.latestReconsolidation?.provenance ?? episode.provenance,
      sourceKind: episode.sourceKind,
    }))
    .filter(episode => episode.whatHappened)
  const consolidatedMemories = (context.consolidatedMemories ?? [])
    .slice(0, 8)
    .map(memory => ({
      id: memory.id,
      kind: memory.kind,
      facet: memory.facet ?? null,
      periodKey: memory.periodKey,
      summary: sanitizeOrganicMemoryEvidenceText(memory.summary, 280) || null,
      lesson: sanitizeOrganicMemoryEvidenceText(memory.lesson ?? '', 220) || null,
      cues: sanitizeOrganicMemoryEvidenceList(memory.cues, 6, 100),
      confidence: memory.confidence,
      memoryTier: memory.memoryTier ?? null,
      provenance: memory.dominantProvenance,
    }))
    .filter(memory => memory.summary)
  const proceduralMemories = (context.proceduralMemories ?? [])
    .slice(0, 8)
    .map(memory => ({
      id: memory.id,
      label: sanitizeOrganicMemoryEvidenceText(memory.label, 140) || null,
      approach: sanitizeOrganicMemoryEvidenceText(memory.approach, 280) || null,
      pitfalls: sanitizeOrganicMemoryEvidenceList(memory.pitfalls, 5, 140),
      confidence: memory.confidence,
      cues: sanitizeOrganicMemoryEvidenceList(memory.cues, 6, 100),
    }))
    .filter(memory => memory.label || memory.approach)
  if (
    retrievedFacts.length > 0
    || recalledFragments.length > 0
    || recalledEpisodes.length > 0
    || consolidatedMemories.length > 0
    || proceduralMemories.length > 0
  ) {
    blocks.push(buildAlicizationProviderFactBlock('alicization-long-term-memory-recall', {
      owner: 'LongTermMemoryRecall',
      retrievedFacts,
      recalledFragments,
      recalledEpisodes,
      consolidatedMemories,
      proceduralMemories,
    }))
  }

  return blocks
}
