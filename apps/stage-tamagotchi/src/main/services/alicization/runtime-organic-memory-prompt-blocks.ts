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
  if (
    /\bcurrent continuity\b|\bcontinuity identity\b/iu.test(normalized)
    || /\b(?:same[-_ ]her|identity[-_ ]continuity|continuity state|phase\s*1|runtime_personhood|project[-_ ]state)\b/iu.test(normalized)
  ) {
    return ''
  }
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

function projectMemorySelection(context: OrganicMemoryPromptContext) {
  const deliberation = context.memoryDeliberation
  const speech = context.recollectionSpeechPlan
  const plan = context.recollectionPlan
  if (!deliberation && !speech && !plan)
    return null

  return {
    deliberation: deliberation
      ? {
          shouldRecall: deliberation.shouldRecall,
          selectedEraIds: deliberation.selectedEraIds.slice(0, 8),
          selectedConsolidationIds: deliberation.selectedConsolidationIds.slice(0, 8),
          selectedWindowIds: deliberation.selectedWindowIds.slice(0, 8),
          selectedProcedureIds: deliberation.selectedProcedureIds.slice(0, 8),
          selectedEpisodeIds: deliberation.selectedEpisodeIds.slice(0, 8),
          selectedConversationTurnIds: deliberation.selectedConversationTurnIds.slice(0, 8),
          selectedEras: deliberation.selectedEras.slice(0, 6).map(item => ({
            id: item.id,
            facet: item.facet,
            summary: sanitizeOrganicMemoryEvidenceText(item.summary, 260) || null,
          })),
          selectedPeriods: deliberation.selectedPeriods.slice(0, 6).map(item => ({
            id: item.id,
            kind: item.kind,
            summary: sanitizeOrganicMemoryEvidenceText(item.summary, 260) || null,
          })),
          selectedEpisodes: deliberation.selectedEpisodes.slice(0, 8).map(item => ({
            id: item.id,
            summary: sanitizeOrganicMemoryEvidenceText(item.summary, 280) || null,
            provenance: item.provenance,
            reconsolidatedFromTraceId: item.reconsolidatedFromTraceId ?? null,
          })),
          selectedProcedures: deliberation.selectedProcedures.slice(0, 6).map(item => ({
            id: item.id,
            label: sanitizeOrganicMemoryEvidenceText(item.label, 140) || null,
            approach: sanitizeOrganicMemoryEvidenceText(item.approach, 280) || null,
          })),
          selectedBundles: deliberation.selectedBundles.slice(0, 4).map(item => ({
            id: item.id,
            summary: sanitizeOrganicMemoryEvidenceText(item.summary, 320) || null,
            confidence: item.confidence,
            periodId: item.periodId ?? null,
            episodeId: item.episodeId ?? null,
            procedureId: item.procedureId ?? null,
            conversationTurnId: item.conversationTurnId ?? null,
          })),
          selectedChains: deliberation.selectedChains.slice(0, 4).map(item => ({
            id: item.id,
            kind: item.kind,
            summary: sanitizeOrganicMemoryEvidenceText(item.summary, 320) || null,
            confidence: item.confidence,
            taskCue: sanitizeOrganicMemoryEvidenceText(item.taskCue, 140) || null,
            periodSummary: sanitizeOrganicMemoryEvidenceText(item.periodSummary, 220) || null,
            eventSummary: sanitizeOrganicMemoryEvidenceText(item.eventSummary, 220) || null,
            procedureSummary: sanitizeOrganicMemoryEvidenceText(item.procedureSummary, 220) || null,
            relationshipMeaning: sanitizeOrganicMemoryEvidenceText(item.relationshipMeaning, 220) || null,
            lesson: sanitizeOrganicMemoryEvidenceText(item.lesson, 220) || null,
          })),
          ambiguityPosture: deliberation.ambiguityPosture ?? null,
          conflictSeverity: deliberation.conflictSeverity ?? 'none',
          stableCore: sanitizeOrganicMemoryEvidenceList(deliberation.stableCore, 6, 220),
          surfacePolicy: deliberation.surfacePolicy,
          confidence: deliberation.confidence,
          followUp: deliberation.followUpAffordance
            ? {
                intrusionRisk: deliberation.followUpAffordance.intrusionRisk,
                payoffDependency: deliberation.followUpAffordance.payoffDependency,
                preferredTiming: deliberation.followUpAffordance.preferredTiming,
              }
            : null,
        }
      : null,
    plan: plan
      ? {
          selectedConsolidationIds: plan.selectedConsolidationIds.slice(0, 8),
          selectedWindowIds: plan.selectedWindowIds.slice(0, 8),
          selectedProceduralIds: plan.selectedProceduralIds.slice(0, 8),
          selectedEpisodeIds: plan.selectedEpisodeIds.slice(0, 8),
          selectedConversationTurnIds: plan.selectedConversationTurnIds.slice(0, 8),
          certainty: plan.certainty,
          confidence: plan.confidence,
        }
      : null,
    speech: speech
      ? {
          shouldSurface: speech.shouldSurface,
          surfaceMode: speech.surfaceMode,
          placement: speech.placement,
          certainty: speech.certainty,
          confidence: speech.confidence,
        }
      : null,
  }
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
  const recollectionIntent = context.recollectionIntent
    ? {
        mode: context.recollectionIntent.mode,
        temporalFocus: context.recollectionIntent.temporalFocus,
        searchEpisodes: context.recollectionIntent.searchEpisodes,
        searchConversations: context.recollectionIntent.searchConversations,
        searchProceduralExperience: context.recollectionIntent.searchProceduralExperience,
        confidence: context.recollectionIntent.confidence,
        agenda: context.recollectionIntent.recollectionAgenda
          ? {
              goalSimilarity: context.recollectionIntent.recollectionAgenda.goalSimilarity,
              relationshipNeed: context.recollectionIntent.recollectionAgenda.relationshipNeed,
              affectivePull: context.recollectionIntent.recollectionAgenda.affectivePull,
              sceneFamiliarity: context.recollectionIntent.recollectionAgenda.sceneFamiliarity,
              candidateTimeScopes: context.recollectionIntent.recollectionAgenda.candidateTimeScopes
                .slice(0, 6)
                .map(item => ({
                  scope: item.scope,
                  weight: item.weight,
                })),
              candidateEraFacets: context.recollectionIntent.recollectionAgenda.candidateEraFacets
                .slice(0, 6)
                .map(item => ({
                  facet: item.facet,
                  weight: item.weight,
                })),
              uncertaintyTolerance: context.recollectionIntent.recollectionAgenda.uncertaintyTolerance,
            }
          : null,
      }
    : null
  const surface = context.memoryResolutionLedger
    ? {
        retrievalQuality: context.memoryResolutionLedger.retrievalQuality,
        visibleCarryMode: context.memoryResolutionLedger.visibleCarryMode,
        surfaceConfidence: context.memoryResolutionLedger.surfaceConfidence,
        conflictPressure: context.memoryResolutionLedger.conflictPressure,
        shouldStayInward: context.memoryResolutionLedger.shouldStayInward,
        shouldDelayUntilAfterPayoff: context.memoryResolutionLedger.shouldDelayUntilAfterPayoff,
        stableCoreOnly: context.memoryResolutionLedger.stableCoreOnly,
        shouldLabelUncertainty: context.memoryResolutionLedger.shouldLabelUncertainty,
        suppressionTags: context.memoryResolutionLedger.suppressionTags.slice(0, 8),
      }
    : null
  const selection = projectMemorySelection(context)

  if (
    retrievedFacts.length > 0
    || recalledFragments.length > 0
    || recalledEpisodes.length > 0
    || consolidatedMemories.length > 0
    || proceduralMemories.length > 0
    || recollectionIntent
    || selection
    || surface
  ) {
    blocks.push(buildAlicizationProviderFactBlock('alicization-long-term-memory-recall', {
      owner: 'LongTermMemoryRecall',
      retrievedFacts,
      recalledFragments,
      recalledEpisodes,
      consolidatedMemories,
      proceduralMemories,
      recollectionIntent,
      selection,
      surface,
    }))
  }

  return blocks
}
