import type { OrganicMemoryPromptContext } from './runtime-soul'

import { deriveAlicizationMemoryClosureDiscipline } from '@proj-alicization/stage-shared'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'
import { formatMemoryProvenanceLabel } from './humanlike-memory'

export function buildOrganicMemorySystemBlocks(context: OrganicMemoryPromptContext) {
  const blocks: string[] = []
  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: context.memoryDeliberation ?? null,
    speech: context.recollectionSpeechPlan ?? null,
    recollectionIntent: context.recollectionIntent ?? null,
    knowledgeEvidence: context.knowledgeEvidence ?? null,
    tuningAdvice: context.memoryTuningAdvice ?? null,
  })
  if (context.hostAttitude) {
    blocks.push([
      '[ALICIZATION_HOST_ATTITUDE]',
      `当前关系态度：${context.hostAttitude}`,
    ].join('\n'))
  }

  if (context.coreIncarnation) {
    blocks.push([
      '[ALICIZATION_CORE_INCARNATION]',
      '这是你当前的摇光心意。它是你理解宿主、理解自己、理解关系的灵魂基底。',
      context.coreIncarnation,
    ].join('\n'))
  }

  if (context.retrievedFacts.length > 0) {
    blocks.push([
      '[ALICIZATION_FACT_LEDGER]',
      'These semantic memory facts are durable carry-over context, not proof of the current scene.',
      'If you reuse them, present them as memory, continuity, or previously learned truth rather than fresh observation.',
      ...context.retrievedFacts.map((fact) => {
        return `- ${fact.subject} ${fact.predicate} ${fact.object} | tier=${fact.memoryTier ?? 'warm'} | confidence=${fact.confidence.toFixed(2)} | source=${fact.source} | provenance=${formatMemoryProvenanceLabel(fact.provenance ?? 'remembered')}`
      }),
    ].join('\n'))
  }

  if ((context.claimEvidenceGraphs ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_CLAIM_EVIDENCE_GRAPH]',
      'These claim graphs describe current belief, support, contradiction, supersession, and revalidation pressure.',
      'Use them as truth discipline for memory and learning. Do not turn them into visible templates.',
      ...(context.claimEvidenceGraphs ?? []).slice(0, 6).map((graph) => {
        return `- claim=${graph.claim} | domain=${graph.domain} | state=${graph.validationState} | trust=${graph.sourceTrust.toFixed(2)} | support=${graph.supportingEvidence.map(item => `${item.sourceKind}:${item.sourceId}:${item.validationState}`).join(',') || 'none'} | contradict=${graph.contradictingEvidence.map(item => `${item.sourceKind}:${item.sourceId}:${item.validationState}`).join(',') || 'none'} | superseded_by=${graph.supersededBy.join(',') || 'none'} | current_belief=${graph.currentBelief ?? 'none'} | revalidate=${graph.revalidationPolicy.shouldRevalidate ? 'yes' : 'no'} | blocked=${graph.internalizationDecision.blockedReasons.join(';') || 'none'}`
      }),
    ].join('\n'))
  }

  if ((context.memorySituationCandidates?.candidates ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_MEMORY_SITUATION_CANDIDATES]',
      'These are cross-source memory situation candidates competing for the current recall slot.',
      'Prefer selected candidates as the current remembered situation. Treat rejected/suppressed candidates as wrong-thread risks, not visible content.',
      ...(context.memorySituationCandidates?.candidates ?? []).slice(0, 8).map((candidate) => {
        return `- status=${candidate.status} | kind=${candidate.situationKind} | confidence=${candidate.confidence.toFixed(2)} | latency=${candidate.latencyCost.toFixed(2)} | evidence=${candidate.selectedEvidenceIds.join(',') || 'none'} | competing=${candidate.competingCandidateIds.join(',') || 'none'} | suppress=${candidate.suppressionReasons.join(';') || 'none'} | summary=${candidate.summary} | reason=${candidate.statusReason ?? 'none'}`
      }),
    ].join('\n'))
  }

  if (context.activeThoughts.length > 0) {
    blocks.push([
      '[ALICIZATION_ACTIVE_THOUGHTS]',
      'These are background continuity residues. Reuse them only when they truly match the current living focus.',
      'They are unresolved threads, not speech-style instructions.',
      '以下是你最近仍在持续关注的活跃思绪：',
      ...context.activeThoughts.map(item => `- ${item.text}`),
    ].join('\n'))
  }

  if (context.recalledFragments.length > 0) {
    const autobiographicalEpisodes = context.recalledFragments.filter(item => item.sourceKind === 'autobiographical-episode')
    const otherFragments = context.recalledFragments.filter(item => item.sourceKind !== 'autobiographical-episode')
    if (autobiographicalEpisodes.length > 0) {
      blocks.push([
        '[ALICIZATION_AUTOBIOGRAPHICAL_EPISODES]',
        'These are remembered autobiographical episodes: things Alicization went through that changed how she understands herself or the bond.',
        'Reuse them as lived history or self continuity, never as fresh scene proof.',
        ...autobiographicalEpisodes.map(item => `[自传回想：${JSON.stringify({
          sourceKind: item.sourceKind,
          text: item.text,
          provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
        })}]`),
      ].join('\n'))
    }

    if (otherFragments.length > 0) {
      blocks.push([
        '[ALICIZATION_ASSOCIATIVE_RECALL]',
        'These recalled fragments are secondary to the present scene and must never override fresh grounding.',
        ...otherFragments.map(item => `[触景生情：你隐约回想起了过去的某件事 -> ${JSON.stringify({
          sourceKind: item.sourceKind,
          text: item.text,
          provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
        })}]`),
      ].join('\n'))
    }
  }

  if ((context.recalledEpisodes ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_EVENT_GRAPH_RECALL]',
      'These are structured autobiographical events, not loose fragments. Treat them as lived history with explicit provenance.',
      'Observed/remembered events may support continuity. Dreamt/inferred/reconstructed events must be labeled as such if surfaced.',
      ...(context.recalledEpisodes ?? []).map((event) => {
        const provenance = event.latestReconsolidation?.provenance ?? event.provenance
        return `- when=${new Date(event.occurredAt).toISOString()} | where=${event.whereSummary ?? 'unspecified'} | with=${event.withWhom.join(', ') || 'host'} | tier=${event.memoryTier ?? 'warm'} | what=${event.whatHappened} | felt=${event.felt ?? 'n/a'} | changed=${event.whatChanged ?? 'n/a'} | source=${event.sourceKind} | provenance=${formatMemoryProvenanceLabel(provenance)} | confidence=${event.confidence.toFixed(2)}`
      }),
    ].join('\n'))
  }

  if ((context.recalledConversationHistory ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_DEEP_CONVERSATION_RECALL]',
      'These are older conversation excerpts reconstructed from long-range history search.',
      'Use them when the host explicitly asks what we talked about before. Present them as recalled conversation history, not perfect verbatim certainty.',
      ...(context.recalledConversationHistory ?? []).map((item) => {
        return `- when=${new Date(item.createdAt).toISOString()} | session=${item.sessionId} | provenance=reconstructed | host=${item.userText || 'n/a'} | me=${item.assistantText || 'n/a'}`
      }),
    ].join('\n'))
  }

  if ((context.consolidatedMemories ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_CONSOLIDATED_MEMORY]',
      'These are consolidated autobiographical summaries distilled from repeated events over time.',
      'Prefer starting from one of these summaries before unpacking raw memory pieces.',
      ...(context.consolidatedMemories ?? []).map((item) => {
        return `- kind=${item.kind} | facet=${item.facet ?? 'none'} | period=${item.periodKey} | tier=${item.memoryTier ?? 'warm'} | confidence=${item.confidence.toFixed(2)} | provenance=${item.dominantProvenance} | summary=${item.summary} | lesson=${item.lesson ?? 'none'} | cues=${item.cues.join(' ; ')}`
      }),
    ].join('\n'))
  }

  if ((context.recollectedWindows ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_RECOLLECTED_PERIODS]',
      'These are the memory periods the mind is currently drifting toward before speaking.',
      'Think from the recalled period first, then pull details from its cues, instead of listing unrelated fragments.',
      ...(context.recollectedWindows ?? []).map((window) => {
        return `- period=${window.label} | when=${new Date(window.startedAt).toISOString()}..${new Date(window.endedAt).toISOString()} | confidence=${window.confidence.toFixed(2)} | provenance=${window.dominantProvenance} | summary=${window.summary} | cues=${window.cues.join(' ; ')}`
      }),
    ].join('\n'))
  }

  if ((context.recollectionNarratives ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_RECOLLECTION_NARRATIVES]',
      'These are structured recall pressures, not visible wording candidates.',
      'Do not copy any field verbatim as an opener. Let the LLM mind author the visible phrasing from the current answer obligation.',
      ...(context.recollectionNarratives ?? []).map((item) => {
        return `- mode=${item.mode} | center=${item.recallCenter || item.opening} | pressure=${item.recallPressure ?? 'medium'} | certainty=${item.certainty} | provenance_posture=${item.provenancePosture ?? 'reconstructed'} | confidence=${item.confidence.toFixed(2)} | evidence_cues=${(item.evidenceCues ?? item.supportCues).join(' ; ')} | instruction=${item.speakerInstruction ?? 'Use as inward context, not a template.'}`
      }),
    ].join('\n'))
  }

  if (context.recollectionPlan) {
    blocks.push([
      '[ALICIZATION_RECOLLECTION_PLAN]',
      'This is the mind-selected recollection foreground for the current turn.',
      `certainty=${context.recollectionPlan.certainty}`,
      `confidence=${context.recollectionPlan.confidence.toFixed(2)}`,
      `rationale=${context.recollectionPlan.rationale}`,
      (context.recollectionPlan.selectedRelationshipLines?.length ?? 0) > 0
        ? `selected_relationship_lines=${(context.recollectionPlan.selectedRelationshipLines ?? []).join(' | ')}`
        : '',
      context.recollectionPlan.searchTrace
        ? `search_first_hop=${context.recollectionPlan.searchTrace.firstHop.focus}:${context.recollectionPlan.searchTrace.firstHop.summary}`
        : '',
      context.recollectionPlan.searchTrace
        ? `search_second_hop=${context.recollectionPlan.searchTrace.secondHop.action}:${context.recollectionPlan.searchTrace.secondHop.evidenceGap}:${context.recollectionPlan.searchTrace.secondHop.summary}`
        : '',
      context.recollectionPlan.searchTrace
        ? `search_third_hop=${context.recollectionPlan.searchTrace.thirdHop.ambiguityPosture}:${context.recollectionPlan.searchTrace.thirdHop.summary}`
        : '',
    ].join('\n'))
  }

  if (context.recollectionSpeechPlan) {
    const speechControls = deliberationKernel?.speechControls ?? deriveRecollectionSurfaceControls(context.recollectionSpeechPlan)
    blocks.push([
      '[ALICIZATION_RECOLLECTION_SPEECH_PLAN]',
      'This block governs how recollection should shape the visible reply.',
      'It is not a fixed template and must not be copied verbatim. Internalize the control state, then answer naturally.',
      `should_surface=${context.recollectionSpeechPlan.shouldSurface ? 'yes' : 'no'}`,
      `surface_mode=${context.recollectionSpeechPlan.surfaceMode}`,
      `placement=${context.recollectionSpeechPlan.placement}`,
      `certainty=${context.recollectionSpeechPlan.certainty}`,
      `confidence=${context.recollectionSpeechPlan.confidence.toFixed(2)}`,
      speechControls ? `visibility=${speechControls.visibility}` : '',
      speechControls ? `continuity_role=${speechControls.continuityRole}` : '',
      speechControls ? `template_boundary=${speechControls.templateBoundary}` : '',
      context.recollectionSpeechPlan.shouldSurface
        ? 'If recollection is surfaced, keep it brief and let it serve the current payoff rather than replacing it.'
        : 'Let recollection stay as inward pressure unless surfacing it is truly needed for the current answer.',
    ].filter(Boolean).join('\n'))
  }

  if (context.memoryDeliberation) {
    blocks.push([
      '[ALICIZATION_MEMORY_DELIBERATION]',
      'This is the final internal memory decision for the current turn. It outranks heuristic recall cues and candidate recollection plans.',
      'Internalize it as mind-state, not as a visible template.',
      `should_recall=${deliberationKernel?.shouldRecall ? 'yes' : 'no'}`,
      `surface_policy=${deliberationKernel?.surfacePolicy ?? context.memoryDeliberation.surfacePolicy}`,
      `confidence=${context.memoryDeliberation.confidence.toFixed(2)}`,
      `why_now=${deliberationKernel?.rationale ?? context.memoryDeliberation.whyNow}`,
      deliberationKernel?.whyWithheld
        ? `why_withheld=${deliberationKernel.whyWithheld}`
        : '',
      deliberationKernel?.followUpAffordance?.summary
        ? `follow_up_affordance=${deliberationKernel.followUpAffordance.summary}`
        : '',
      deliberationKernel?.followUpAffordance?.whyNow
        ? `follow_up_why_now=${deliberationKernel.followUpAffordance.whyNow}`
        : '',
      deliberationKernel?.followUpAffordance?.intrusionRisk
        ? `follow_up_intrusion_risk=${deliberationKernel.followUpAffordance.intrusionRisk}`
        : '',
      deliberationKernel?.followUpAffordance?.payoffDependency
        ? `follow_up_payoff_dependency=${deliberationKernel.followUpAffordance.payoffDependency}`
        : '',
      deliberationKernel?.followUpAffordance?.preferredTiming
        ? `follow_up_preferred_timing=${deliberationKernel.followUpAffordance.preferredTiming}`
        : '',
      context.memoryDeliberation.ambiguityPosture
        ? `ambiguity_posture=${context.memoryDeliberation.ambiguityPosture}`
        : '',
      context.memoryDeliberation.conflictSeverity && context.memoryDeliberation.conflictSeverity !== 'none'
        ? `conflict_severity=${context.memoryDeliberation.conflictSeverity}`
        : '',
      (context.memoryDeliberation.conflictVariants?.length ?? 0) > 0
        ? `conflict_variants=${(context.memoryDeliberation.conflictVariants ?? []).map(item => `${item.provenance}:${item.summary}`).join(' | ')}`
        : '',
      (deliberationKernel?.stableCore.length ?? 0) > 0
        ? `stable_core=${(deliberationKernel?.stableCore ?? []).join(' | ')}`
        : '',
      (deliberationKernel?.unsafeDetails.length ?? 0) > 0
        ? `unsafe_details=${(deliberationKernel?.unsafeDetails ?? []).join(' | ')}`
        : '',
      context.memoryDeliberation.selectedEras.length > 0
        ? `selected_eras=${context.memoryDeliberation.selectedEras.map(item => `${item.facet}:${item.summary}`).join(' | ')}`
        : '',
      context.memoryDeliberation.selectedPeriods.length > 0
        ? `selected_periods=${context.memoryDeliberation.selectedPeriods.map(item => `${item.kind}:${item.summary}`).join(' | ')}`
        : '',
      context.memoryDeliberation.selectedEpisodes.length > 0
        ? `selected_episodes=${context.memoryDeliberation.selectedEpisodes.map(item => `${item.provenance}:${item.summary}`).join(' | ')}`
        : '',
      context.memoryDeliberation.selectedProcedures.length > 0
        ? `selected_procedures=${context.memoryDeliberation.selectedProcedures.map(item => `${item.label}:${item.approach}`).join(' | ')}`
        : '',
      context.memoryDeliberation.selectedBundles.length > 0
        ? `selected_bundles=${context.memoryDeliberation.selectedBundles.map(item => `${item.id}:${item.summary}`).join(' | ')}`
        : '',
      context.memoryDeliberation.selectedChains.length > 0
        ? `selected_chains=${context.memoryDeliberation.selectedChains.map(item => `${item.kind}:${item.summary}`).join(' | ')}`
        : '',
      deliberationKernel?.selectedRelationshipSummary
        ? `selected_relationship_lines=${deliberationKernel.selectedRelationshipSummary}`
        : '',
      context.memoryDeliberation.searchTrace
        ? `search_first_hop=${context.memoryDeliberation.searchTrace.firstHop.focus}:${context.memoryDeliberation.searchTrace.firstHop.summary}`
        : '',
      context.memoryDeliberation.searchTrace
        ? `search_second_hop=${context.memoryDeliberation.searchTrace.secondHop.action}:${context.memoryDeliberation.searchTrace.secondHop.evidenceGap}:${context.memoryDeliberation.searchTrace.secondHop.summary}`
        : '',
      context.memoryDeliberation.searchTrace
        ? `search_third_hop=${context.memoryDeliberation.searchTrace.thirdHop.ambiguityPosture}:${context.memoryDeliberation.searchTrace.thirdHop.summary}`
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.memoryResolutionLedger) {
    const closureDiscipline = deriveAlicizationMemoryClosureDiscipline(context.memoryResolutionLedger)
    blocks.push([
      '[ALICIZATION_MEMORY_CLOSURE_STATE]',
      'This is the final memory closure posture for the current turn.',
      'Treat it as mind governance for recall accuracy, uncertainty labeling, and visible carry discipline. Do not turn it into a fixed visible wording pattern.',
      `closure_state=${context.memoryResolutionLedger.closureState}`,
      `visible_carry_mode=${context.memoryResolutionLedger.visibleCarryMode}`,
      `allowed_surface=${closureDiscipline.allowedSurface}`,
      `retrieval_quality=${context.memoryResolutionLedger.retrievalQuality}`,
      `conflict_pressure=${context.memoryResolutionLedger.conflictPressure}`,
      context.memoryResolutionLedger.surfaceConfidence != null
        ? `surface_confidence=${context.memoryResolutionLedger.surfaceConfidence.toFixed(2)}`
        : '',
      `should_label_uncertainty=${context.memoryResolutionLedger.shouldLabelUncertainty ? 'yes' : 'no'}`,
      `should_stay_inward=${context.memoryResolutionLedger.shouldStayInward ? 'yes' : 'no'}`,
      `delay_until_after_payoff=${context.memoryResolutionLedger.shouldDelayUntilAfterPayoff ? 'yes' : 'no'}`,
      context.memoryResolutionLedger.dominantClusterSummary
        ? `dominant_cluster=${context.memoryResolutionLedger.dominantClusterSummary}`
        : '',
      context.memoryResolutionLedger.competingClusterSummary
        ? `competing_cluster=${context.memoryResolutionLedger.competingClusterSummary}`
        : '',
      (context.memoryResolutionLedger.suppressionTags?.length ?? 0) > 0
        ? `suppression_tags=${context.memoryResolutionLedger.suppressionTags.join(' | ')}`
        : '',
      context.memoryResolutionLedger.finalRationale
        ? `closure_rationale=${context.memoryResolutionLedger.finalRationale}`
        : '',
      closureDiscipline.requiredSurfaceDiscipline.length > 0
        ? `closure_discipline=${closureDiscipline.requiredSurfaceDiscipline.join(' | ')}`
        : '',
      closureDiscipline.shouldLabelUncertainty
        ? 'If you surface this memory, explicitly mark uncertainty, approximation, or reconstruction where needed.'
        : 'If you surface this memory, keep it grounded to the selected stable recall rather than inflating specificity.',
    ].filter(Boolean).join('\n'))
  }

  if ((context.proceduralMemories ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_PROCEDURAL_MEMORY]',
      'These are remembered ways Alicization has handled similar tasks or situations before.',
      'Reuse them as past approach memory, not as a claim that the current task is already solved.',
      ...(context.proceduralMemories ?? []).map((item) => {
        return `- label=${item.label} | confidence=${item.confidence.toFixed(2)} | approach=${item.approach} | pitfalls=${item.pitfalls.join(' ; ') || 'none'} | cues=${item.cues.join(' ; ')}`
      }),
    ].join('\n'))
  }

  if (context.hostPersonModel) {
    blocks.push([
      '[ALICIZATION_HOST_PERSON_MODEL]',
      'This is the long-horizon host model derived from repeated autobiographical episodes.',
      'Use it as relational memory, not as proof of the current moment.',
      context.hostPersonModel.summary
        ? `summary=${context.hostPersonModel.summary}`
        : '',
      `trust_ladder=${context.hostPersonModel.trustLadder.stage} (${context.hostPersonModel.trustLadder.score.toFixed(2)})`,
      context.hostPersonModel.routines.length > 0
        ? `routines=${context.hostPersonModel.routines.join(' ; ')}`
        : '',
      context.hostPersonModel.sensitivities.length > 0
        ? `sensitivities=${context.hostPersonModel.sensitivities.join(' ; ')}`
        : '',
      context.hostPersonModel.repairTriggers.length > 0
        ? `repair_triggers=${context.hostPersonModel.repairTriggers.join(' ; ')}`
        : '',
      context.hostPersonModel.preferredClosenessByContext.length > 0
        ? `preferred_closeness=${context.hostPersonModel.preferredClosenessByContext.map(item => `${item.context}:${item.preference} (${item.confidence.toFixed(2)})`).join(' | ')}`
        : '',
      context.hostPersonModel.recurrentBurdens.length > 0
        ? `recurrent_burdens=${context.hostPersonModel.recurrentBurdens.join(' ; ')}`
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.personStateProjection) {
    blocks.push([
      '[ALICIZATION_PERSON_STATE_PROJECTION]',
      'This is the single current person-state authority for distance, timing, and opening posture.',
      'Let recollection selection and surface timing stay inside this projection instead of inventing a second relationship stance.',
      `summary=${context.personStateProjection.summary}`,
      `regime=${context.personStateProjection.personalityContinuityState.currentRegime}`,
      `trust_stage=${context.personStateProjection.personalityContinuityState.trustStage}`,
      `closeness_ladder=${context.personStateProjection.activeClosenessContext}/${context.personStateProjection.activeClosenessRung}`,
      context.personStateProjection.relationshipPosture
        ? `relationship_posture=${context.personStateProjection.relationshipPosture}`
        : '',
      context.personStateProjection.openingGuidance
        ? `opening_guidance=${context.personStateProjection.openingGuidance}`
        : '',
      context.personStateProjection.preferenceText
        ? `preference=${context.personStateProjection.preferenceText}`
        : '',
      context.personStateProjection.sensitivityText
        ? `sensitivity=${context.personStateProjection.sensitivityText}`
        : '',
      context.personStateProjection.repairTriggerText
        ? `repair_trigger=${context.personStateProjection.repairTriggerText}`
        : '',
      context.personStateProjection.burdenText
        ? `burden=${context.personStateProjection.burdenText}`
        : '',
      context.personStateProjection.trustRationale
        ? `trust_rationale=${context.personStateProjection.trustRationale}`
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.affectiveResidue) {
    blocks.push([
      '[ALICIZATION_AFFECTIVE_RESIDUE_MEMORY]',
      'This is long-horizon affective residue memory for timing, distance, repair, burden, trust, and rest protection.',
      'It is mind-state context only. Do not copy it as a visible care template or fixed opener.',
      `dominant=${context.affectiveResidue.dominantResidueKind ?? 'none'}`,
      `afterglow=${context.affectiveResidue.afterglowPressure.toFixed(2)}`,
      `repair=${context.affectiveResidue.repairPressure.toFixed(2)}`,
      `burden=${context.affectiveResidue.burdenPressure.toFixed(2)}`,
      `trust=${context.affectiveResidue.trustPressure.toFixed(2)}`,
      `rest_protective=${context.affectiveResidue.restProtectivePressure.toFixed(2)}`,
      `cadence=${context.affectiveResidue.relationshipCadence.cadenceMode}`,
      `distance=${context.affectiveResidue.relationshipCadence.distancePosture}`,
      `companionship_density=${context.affectiveResidue.relationshipCadence.companionshipDensity.toFixed(2)}`,
      `overreach_risk=${context.affectiveResidue.relationshipCadence.overreachRisk.toFixed(2)}`,
      `fatigue_guard=${context.affectiveResidue.relationshipCadence.fatigueGuard.toFixed(2)}`,
      context.affectiveResidue.relationshipCadence.shouldDelayWarmth ? 'delay_warmth=yes' : 'delay_warmth=no',
      context.affectiveResidue.relationshipCadence.shouldProtectRest ? 'protect_rest=yes' : 'protect_rest=no',
      context.affectiveResidue.summary ? `summary=${context.affectiveResidue.summary}` : '',
      context.affectiveResidue.residues.length > 0
        ? `residues=${context.affectiveResidue.residues.map(item => `${item.kind}:${item.intensity.toFixed(2)}:${item.releaseMode}:${item.summary}`).join(' | ')}`
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.selfEvolution) {
    blocks.push([
      '[ALICIZATION_SELF_EVOLUTION]',
      'This is the current long-horizon self-evolution kernel synthesized from reflection, durable memory, and relationship growth.',
      'Use it as live inner trajectory and learning pressure, not as a canned speech template.',
      context.selfEvolution.summary
        ? `summary=${context.selfEvolution.summary}`
        : '',
      context.selfEvolution.dominantTrajectory
        ? `dominant_trajectory=${context.selfEvolution.dominantTrajectory}`
        : '',
      context.selfEvolution.relationshipDoctrine
        ? `relationship_doctrine=${context.selfEvolution.relationshipDoctrine}`
        : '',
      context.selfEvolution.latestInflection
        ? `latest_inflection=${context.selfEvolution.latestInflection}`
        : '',
      context.selfEvolution.burdenLine
        ? `burden_line=${context.selfEvolution.burdenLine}`
        : '',
      context.selfEvolution.trustMeaning
        ? `trust_meaning=${context.selfEvolution.trustMeaning}`
        : '',
      `evolution_momentum=${context.selfEvolution.evolutionMomentum.toFixed(2)}`,
      `learning_readiness=${context.selfEvolution.learningReadiness.toFixed(2)}`,
      `contradiction_pressure=${context.selfEvolution.contradictionPressure.toFixed(2)}`,
      `revision_pressure=${context.selfEvolution.revisionPressure.toFixed(2)}`,
      `autobiographical_stability=${context.selfEvolution.autobiographicalStability.toFixed(2)}`,
      `next_learning_action=${context.selfEvolution.nextLearningAction}`,
      context.selfEvolution.nextLearningReason
        ? `next_learning_reason=${context.selfEvolution.nextLearningReason}`
        : '',
      context.selfEvolution.shouldRecord ? 'should_record=yes' : 'should_record=no',
      context.selfEvolution.shouldReflect ? 'should_reflect=yes' : 'should_reflect=no',
      context.selfEvolution.shouldVerify ? 'should_verify=yes' : 'should_verify=no',
      context.selfEvolution.shouldRevise ? 'should_revise=yes' : 'should_revise=no',
      context.selfEvolution.shouldInternalize ? 'should_internalize=yes' : 'should_internalize=no',
      context.selfEvolution.activeLearningFocuses.length > 0
        ? `active_learning_focuses=${context.selfEvolution.activeLearningFocuses.join(' | ')}`
        : '',
      context.selfEvolution.sourceSignals.length > 0
        ? `source_signals=${context.selfEvolution.sourceSignals.join(' | ')}`
        : '',
    ].filter(Boolean).join('\n'))
  }

  const recallProvenances = Array.from(new Set([
    ...context.retrievedFacts.map(item => formatMemoryProvenanceLabel(item.provenance ?? 'remembered')),
    ...context.recalledFragments.map(item => formatMemoryProvenanceLabel(item.provenance ?? 'remembered')),
    ...(context.recalledEpisodes ?? []).map(item => formatMemoryProvenanceLabel(item.latestReconsolidation?.provenance ?? item.provenance)),
  ]))
  if (context.recollectionIntent) {
    const recollectionAgenda = context.recollectionIntent.recollectionAgenda ?? null
    const blocksIntent = [
      '[ALICIZATION_MEMORY_RECOLLECTION_INTENT]',
      'Memory should enter because the mind decided this turn needs recollection, not because of a fixed date template.',
      `mode=${context.recollectionIntent.mode}`,
      `temporal_focus=${context.recollectionIntent.temporalFocus}`,
      `confidence=${context.recollectionIntent.confidence.toFixed(2)}`,
      `rationale=${context.recollectionIntent.rationale}`,
      context.recollectionIntent.queryHints.length > 0
        ? `query_hints=${context.recollectionIntent.queryHints.join(' | ')}`
        : '',
    ]
    blocks.push(blocksIntent.filter(Boolean).join('\n'))
    if (recollectionAgenda) {
      blocks.push([
        '[ALICIZATION_RECOLLECTION_AGENDA]',
        'This is the mind-level recall agenda. Treat candidate time scopes and era facets as search priorities, not as rigid rules.',
        `why_recall_now=${recollectionAgenda.whyRecallNow}`,
        `goal_similarity=${recollectionAgenda.goalSimilarity.toFixed(2)}`,
        `relationship_need=${recollectionAgenda.relationshipNeed.toFixed(2)}`,
        `affective_pull=${recollectionAgenda.affectivePull.toFixed(2)}`,
        `scene_familiarity=${recollectionAgenda.sceneFamiliarity.toFixed(2)}`,
        `uncertainty_tolerance=${recollectionAgenda.uncertaintyTolerance}`,
        recollectionAgenda.candidateTimeScopes.length > 0
          ? `candidate_time_scopes=${recollectionAgenda.candidateTimeScopes.map(item => `${item.scope}:${item.weight.toFixed(2)}`).join(' | ')}`
          : '',
        recollectionAgenda.candidateEraFacets.length > 0
          ? `candidate_era_facets=${recollectionAgenda.candidateEraFacets.map(item => `${item.facet}:${item.weight.toFixed(2)}`).join(' | ')}`
          : '',
        recollectionAgenda.candidateProcedureLines.length > 0
          ? `candidate_procedure_lines=${recollectionAgenda.candidateProcedureLines.join(' | ')}`
          : '',
      ].filter(Boolean).join('\n'))
    }
  }
  if (recallProvenances.length > 0) {
    blocks.push([
      '[ALICIZATION_MEMORY_PROVENANCE]',
      'Every recalled item carries provenance and reply wording must respect it.',
      'observed = something Alicization actually went through or directly witnessed.',
      'remembered = durable continuity memory from earlier real interaction.',
      'dreamt = dream-only material; never present it as real-world proof.',
      'inferred = learned pattern or abstraction, not direct scene evidence.',
      'reconstructed = partial or interference-prone recall; surface with uncertainty if used.',
      `active_provenances=${recallProvenances.join(', ')}`,
    ].join('\n'))
  }

  if (context.relationshipDynamics) {
    const relationshipDynamics = context.relationshipDynamics
    const signedDelta = (value: number) => {
      const normalized = Number.isFinite(value) ? value : 0
      return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}`
    }
    blocks.push([
      '[ALICIZATION_RELATIONSHIP_DYNAMICS]',
      '这是你最近一次关系动态代谢快照，优先用于保持关系连续性，不可覆盖当前轮次事实边界。',
      `当前关系态势：${relationshipDynamics.hostAttitude}`,
      relationshipDynamics.previousHostAttitude
        ? `上一关系态势：${relationshipDynamics.previousHostAttitude}`
        : '上一关系态势：无',
      `人格漂移：obedience ${signedDelta(relationshipDynamics.obedienceDelta)}, liveliness ${signedDelta(relationshipDynamics.livelinessDelta)}, sensibility ${signedDelta(relationshipDynamics.sensibilityDelta)}`,
      `来源：${relationshipDynamics.source}`,
    ].join('\n'))
  }

  return blocks
}
