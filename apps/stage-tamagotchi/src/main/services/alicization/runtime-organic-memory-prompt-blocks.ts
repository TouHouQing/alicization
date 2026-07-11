import type { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  alicizationFixedTemplateReplacement,
  deriveAlicizationMemoryClosureDiscipline,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { formatMemoryProvenanceLabel } from './humanlike-memory'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  buildAlicizationPersonMemoryCapsuleBlock,
  shouldUseCompactPersonMemoryCapsuleOnly,
} from './person-memory-capsule'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'

function buildMemoryTuningCausalityLines(context: OrganicMemoryPromptContext) {
  const tuningAdvice = context.memoryTuningAdvice ?? null
  const focus = tuningAdvice?.focusDimensions ?? []
  if (!tuningAdvice || focus.length === 0)
    return []

  const lines: string[] = []
  if (focus.includes('runtimeSameHerInitiativeExecutionCausality')) {
    lines.push('initiative_execution=causal_link_required; lanes=proactive_opening,execution_callback,learning_feedback; source=recalled_memory_closure')
  }
  if (focus.includes('runtimeSameHerEmotionalCausality')) {
    lines.push('emotion=causal_link_required; signal=emotional_afterglow; sources=prior_recall,execution_feedback')
  }
  if (focus.includes('runtimeSameHerEmbodimentCausality')) {
    lines.push('embodiment=causal_link_required; modalities=voice,face,motion,lipsync,body; source=same_recalled_state')
  }
  if (focus.includes('runtimeMemoryClosureCausalIdentity')) {
    lines.push('memory_closure_identity=required; proof_source=downstream_memoryClosureCausality.memoryIdentity')
    lines.push('proof_boundary=route_chain_text:false; visible_reply_wording:false')
  }
  if (focus.includes('runtimeMemoryClosureIdentityContinuity')) {
    lines.push('identity_continuity=stable_memory_identity_key; scope=recall,initiative,execution,emotion,embodiment')
  }
  if (focus.includes('runtimeMemoryClosureLaneCarry')) {
    lines.push('lane_carry=causal_alteration_required; lanes=initiative,execution_feedback,emotional_residue,embodied_expression')
  }
  if (lines.length === 0)
    return []

  return [
    '[ALICIZATION_MEMORY_TUNING_CAUSALITY]',
    'source_role=nightly_replay; issue=runtime_continuity_closure_can_split_after_memory_recall; usage=next_turn_memory_governance; visible_surface=answer_payoff',
    `source=${tuningAdvice.source}`,
    ...lines,
    'continuity_rule=one_memory_identity_across_recall_initiative_execution_feedback_emotional_residue_embodied_expression',
  ]
}

function sanitizeOrganicMemoryProviderText(raw: unknown, maxChars = 220) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  if (!normalized || normalized === alicizationFixedTemplateReplacement)
    return ''
  if (/\bcurrent continuity\b|\bcontinuity identity\b/iu.test(normalized))
    return ''
  return normalized
}

function formatOrganicMemoryProviderLine(label: string, raw: unknown, maxChars = 220) {
  const sanitized = sanitizeOrganicMemoryProviderText(raw, maxChars)
  return sanitized ? `${label}=${sanitized}` : ''
}

function sanitizeOrganicMemoryProviderList(values: Array<unknown>, maxChars = 180, separator = ' | ') {
  return values
    .map(value => sanitizeOrganicMemoryProviderText(value, maxChars))
    .filter(Boolean)
    .join(separator)
}

function looksStructuralOrganicInstruction(value: string) {
  return /^[\w.:-]+=[^.!?。！？]*?(?:[;|,]\s*[\w.:-]+=[^.!?。！？]*?)*$/iu.test(value.trim())
    || /^[\w.:-]+$/iu.test(value.trim())
}

function formatOrganicMemoryStructuralControlLine(
  label: string,
  raw: unknown,
  maxChars = 220,
) {
  const sanitized = sanitizeOrganicMemoryProviderText(raw, maxChars)
  if (!sanitized)
    return ''
  if (looksStructuralOrganicInstruction(sanitized))
    return `${label}=${sanitized}`
  return `${label}_present=true; ${label}_source_text=withheld_non_structured_instruction`
}

function formatOrganicMemoryStructuralControlList(
  label: string,
  values: Array<unknown>,
  maxChars = 180,
) {
  const structuralItems: string[] = []
  let withheldCount = 0
  for (const value of values) {
    const sanitized = sanitizeOrganicMemoryProviderText(value, maxChars)
    if (!sanitized)
      continue
    if (looksStructuralOrganicInstruction(sanitized))
      structuralItems.push(sanitized)
    else
      withheldCount += 1
  }
  const lines: string[] = []
  if (structuralItems.length > 0)
    lines.push(`${label}=${structuralItems.join(' | ')}`)
  if (withheldCount > 0)
    lines.push(`${label}_withheld_non_structured_count=${withheldCount}`)
  return lines.join('\n')
}

export function buildOrganicMemorySystemBlocks(
  context: OrganicMemoryPromptContext,
  memoryTurnArtifact?: ReturnType<typeof buildAlicizationMemoryTurnArtifact> | null,
) {
  const personMemoryCapsuleBlock = buildAlicizationPersonMemoryCapsuleBlock(context, memoryTurnArtifact)
  if (shouldUseCompactPersonMemoryCapsuleOnly(context, memoryTurnArtifact))
    return [personMemoryCapsuleBlock]

  const blocks: string[] = [personMemoryCapsuleBlock]
  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: context.memoryDeliberation ?? null,
    speech: context.recollectionSpeechPlan ?? null,
    recollectionIntent: context.recollectionIntent ?? null,
    knowledgeEvidence: context.knowledgeEvidence ?? null,
    hostPersonModel: context.hostPersonModel ?? null,
    projectStateContinuity: context.projectStateContinuity ?? null,
    tuningAdvice: context.memoryTuningAdvice ?? null,
  })
  if (context.hostAttitude) {
    blocks.push([
      '[ALICIZATION_HOST_ATTITUDE]',
      `host_attitude=${context.hostAttitude}`,
    ].join('\n'))
  }

  const memoryTuningCausalityLines = buildMemoryTuningCausalityLines(context)
  if (memoryTuningCausalityLines.length > 0)
    blocks.push(memoryTuningCausalityLines.join('\n'))

  if (context.coreIncarnation) {
    const coreIncarnation = sanitizeOrganicMemoryProviderText(context.coreIncarnation, 360)
    blocks.push([
      '[ALICIZATION_CORE_INCARNATION]',
      'block_role=structured_identity_seed',
      'visible_template=false',
      coreIncarnation ? `core_incarnation=${coreIncarnation}` : 'core_incarnation=withheld_template_residue',
    ].join('\n'))
  }

  if (context.projectStateContinuity || context.projectStatePreflightSummary || context.projectStatePreDialogueAwarenessLine) {
    const memoryLanded = sanitizeOrganicMemoryProviderText(context.projectStateContinuity?.landedProgressSummary, 220)
    const memoryOpenLoop = sanitizeOrganicMemoryProviderText(context.projectStateContinuity?.openClosureSummary, 220)
    const memoryNext = sanitizeOrganicMemoryProviderText(context.projectStateContinuity?.nextClosureTarget, 220)
    const memoryEmotionalContext = sanitizeOrganicMemoryProviderText(context.projectStateContinuity?.emotionalClosureCue, 220)

    blocks.push([
      '[ALICIZATION_MEMORY_CONTINUITY_BOUNDARY]',
      'memory_continuity_role=recall_governance',
      'personality_slogan=false',
      'visible_reply_template=false',
      'short_term_owner=WorkingMemory',
      'long_term_recall_owner=LongTermMemoryRecall',
      'workbench_scope=governance_only',
      'template_awareness=withheld_from_organic_memory_prompt',
      memoryLanded ? `memory_landed=${memoryLanded}` : '',
      memoryOpenLoop ? `memory_open_loop=${memoryOpenLoop}` : '',
      memoryNext ? `memory_next=${memoryNext}` : '',
      memoryEmotionalContext ? `memory_emotional_context=${memoryEmotionalContext}` : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.retrievedFacts.length > 0) {
    blocks.push([
      '[ALICIZATION_FACT_LEDGER]',
      'fact_role=durable_memory_context',
      'current_scene_proof=false',
      'reuse_mode=memory_or_continuity_or_learned_truth',
      ...context.retrievedFacts.map((fact) => {
        const subject = sanitizeOrganicMemoryProviderText(fact.subject, 120)
        const predicate = sanitizeOrganicMemoryProviderText(fact.predicate, 120)
        const object = sanitizeOrganicMemoryProviderText(fact.object, 260)
        return `- ${subject || 'memory'} ${predicate || 'relates_to'} ${object || 'withheld'} | tier=${fact.memoryTier ?? 'warm'} | confidence=${fact.confidence.toFixed(2)} | source=${sanitizeOrganicMemoryProviderText(fact.source, 120) || 'memory'} | provenance=${formatMemoryProvenanceLabel(fact.provenance ?? 'remembered')}`
      }),
    ].join('\n'))
  }

  if ((context.claimEvidenceGraphs ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_CLAIM_EVIDENCE_GRAPH]',
      'graph_role=claim_evidence; fields=current_belief,support,contradiction,supersession,revalidation_pressure',
      'usage=truth_discipline_for_memory_and_learning; visible_template=false',
      ...(context.claimEvidenceGraphs ?? []).slice(0, 6).map((graph) => {
        const claim = sanitizeOrganicMemoryProviderText(graph.claim, 260)
        const currentBelief = sanitizeOrganicMemoryProviderText(graph.currentBelief ?? '', 260)
        const blocked = sanitizeOrganicMemoryProviderList(graph.internalizationDecision.blockedReasons, 140, ';')
        return `- claim=${claim || 'withheld'} | domain=${graph.domain} | state=${graph.validationState} | trust=${graph.sourceTrust.toFixed(2)} | support=${graph.supportingEvidence.map(item => `${item.sourceKind}:${item.sourceId}:${item.validationState}`).join(',') || 'none'} | contradict=${graph.contradictingEvidence.map(item => `${item.sourceKind}:${item.sourceId}:${item.validationState}`).join(',') || 'none'} | superseded_by=${graph.supersededBy.join(',') || 'none'} | current_belief=${currentBelief || 'none'} | revalidate=${graph.revalidationPolicy.shouldRevalidate ? 'yes' : 'no'} | blocked=${blocked || 'none'}`
      }),
    ].join('\n'))
  }

  if ((context.memorySituationCandidates?.candidates ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_MEMORY_SITUATION_CANDIDATES]',
      'candidate_role=cross_source_memory_situation; competition_scope=current_recall_slot',
      'selected_candidate_policy=prefer_as_current_remembered_situation; rejected_candidate_policy=wrong_thread_risk; suppressed_candidate_visible_content=false',
      ...(context.memorySituationCandidates?.candidates ?? []).slice(0, 8).map((candidate) => {
        const summary = sanitizeOrganicMemoryProviderText(candidate.summary, 260)
        const reason = sanitizeOrganicMemoryProviderText(candidate.statusReason ?? '', 180)
        const evidence = sanitizeOrganicMemoryProviderList(candidate.selectedEvidenceIds, 120, ',')
        const competing = sanitizeOrganicMemoryProviderList(candidate.competingCandidateIds, 120, ',')
        const suppress = sanitizeOrganicMemoryProviderList(candidate.suppressionReasons, 140, ';')
        return `- status=${candidate.status} | kind=${candidate.situationKind} | confidence=${candidate.confidence.toFixed(2)} | latency=${candidate.latencyCost.toFixed(2)} | evidence=${evidence || 'withheld'} | competing=${competing || 'none'} | suppress=${suppress || 'none'} | summary=${summary || 'withheld'} | reason=${reason || 'none'}`
      }),
    ].join('\n'))
  }

  if (context.activeThoughts.length > 0) {
    blocks.push([
      '[ALICIZATION_ACTIVE_THOUGHTS]',
      'residue_role=background_continuity; use_when=current_living_focus_match; visibility=internal_context',
      'thread_state=unresolved; speech_style_instruction=false',
      ...context.activeThoughts.map(item => sanitizeOrganicMemoryProviderText(item.text, 260)).filter(Boolean).map(text => `- ${text}`),
    ].join('\n'))
  }

  if (context.recalledFragments.length > 0) {
    const autobiographicalEpisodes = context.recalledFragments.filter(item => item.sourceKind === 'autobiographical-episode')
    const otherFragments = context.recalledFragments.filter(item => item.sourceKind !== 'autobiographical-episode')
    if (autobiographicalEpisodes.length > 0) {
      blocks.push([
        '[ALICIZATION_AUTOBIOGRAPHICAL_EPISODES]',
        'episode_role=autobiographical_lived_history; effect=self_or_bond_continuity; fresh_scene_proof=false',
        'surface_policy=provenance_bound; quote_verbatim=false',
        ...autobiographicalEpisodes.map(item => `[自传回想：${JSON.stringify({
          sourceKind: item.sourceKind,
          text: sanitizeOrganicMemoryProviderText(item.text, 320) || 'withheld',
          provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
        })}]`),
      ].join('\n'))
    }

    if (otherFragments.length > 0) {
      blocks.push([
        '[ALICIZATION_ASSOCIATIVE_RECALL]',
        'fragment_role=secondary_associative_recall; current_scene_override=false; fresh_grounding_override=false',
        ...otherFragments.map(item => `[触景生情：你隐约回想起了过去的某件事 -> ${JSON.stringify({
          sourceKind: item.sourceKind,
          text: sanitizeOrganicMemoryProviderText(item.text, 320) || 'withheld',
          provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
        })}]`),
      ].join('\n'))
    }
  }

  if ((context.recalledEpisodes ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_EVENT_GRAPH_RECALL]',
      'event_role=structured_autobiographical_event; fragment_role=not_loose; provenance=explicit',
      'surface_policy=provenance_label_required_for_dreamt_inferred_reconstructed; observed_remembered_support=continuity_only',
      ...(context.recalledEpisodes ?? []).map((event) => {
        const provenance = event.latestReconsolidation?.provenance ?? event.provenance
        const where = sanitizeOrganicMemoryProviderText(event.whereSummary ?? '', 160)
        const withWhom = sanitizeOrganicMemoryProviderList(event.withWhom, 80, ', ')
        const what = sanitizeOrganicMemoryProviderText(event.whatHappened, 320)
        const felt = sanitizeOrganicMemoryProviderText(event.felt ?? '', 180)
        const changed = sanitizeOrganicMemoryProviderText(event.whatChanged ?? '', 220)
        return `- when=${new Date(event.occurredAt).toISOString()} | where=${where || 'unspecified'} | with=${withWhom || 'host'} | tier=${event.memoryTier ?? 'warm'} | what=${what || 'withheld'} | felt=${felt || 'n/a'} | changed=${changed || 'n/a'} | source=${event.sourceKind} | provenance=${formatMemoryProvenanceLabel(provenance)} | confidence=${event.confidence.toFixed(2)}`
      }),
    ].join('\n'))
  }

  if ((context.recalledConversationHistory ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_DEEP_CONVERSATION_RECALL]',
      'conversation_recall_role=long_range_history_excerpt; provenance=reconstructed; certainty=not_verbatim',
      'surface_condition=host_explicit_prior_conversation_request; quote_verbatim=false',
      ...(context.recalledConversationHistory ?? []).map((item) => {
        const host = sanitizeOrganicMemoryProviderText(item.userText ?? '', 320)
        const me = sanitizeOrganicMemoryProviderText(item.assistantText ?? '', 320)
        return `- when=${new Date(item.createdAt).toISOString()} | session=${item.sessionId} | provenance=reconstructed | host=${host || 'n/a'} | me=${me || 'n/a'}`
      }),
    ].join('\n'))
  }

  if ((context.consolidatedMemories ?? []).length > 0) {
    const hasQuietSameHerContinuity = (context.consolidatedMemories ?? []).some((item) => {
      const cues = item.cues.map(cue => cue.toLowerCase())
      const summary = item.summary.toLowerCase()
      const lesson = String(item.lesson ?? '').toLowerCase()
      return cues.includes('quiet-continuity-continuity')
        || cues.includes('continuity-inward-carry')
        || cues.includes('quiet-companionship')
        || summary.includes('quiet continuity continuity')
        || lesson.includes('quiet continuity continuity')
    })
    blocks.push([
      '[ALICIZATION_CONSOLIDATED_MEMORY]',
      'consolidation_role=distilled_autobiographical_summary; source=repeated_events_over_time',
      'unpack_order=summary_before_raw_pieces',
      hasQuietSameHerContinuity
        ? 'inward_continuity_authority=prefer memory-owner evidence over reusable continuity slogans'
        : '',
      ...(context.consolidatedMemories ?? []).map((item) => {
        const summary = sanitizeOrganicMemoryProviderText(item.summary, 260)
        const lesson = sanitizeOrganicMemoryProviderText(item.lesson ?? '', 220)
        const cues = item.cues
          .map(cue => sanitizeOrganicMemoryProviderText(cue, 120))
          .filter(Boolean)
          .join(' ; ')
        return `- kind=${sanitizeOrganicMemoryProviderText(item.kind, 80) || 'memory'} | facet=${sanitizeOrganicMemoryProviderText(item.facet ?? '', 80) || 'none'} | period=${sanitizeOrganicMemoryProviderText(item.periodKey, 80) || 'unspecified'} | tier=${item.memoryTier ?? 'warm'} | confidence=${item.confidence.toFixed(2)} | provenance=${item.dominantProvenance} | summary=${summary || 'withheld'} | lesson=${lesson || 'none'} | cues=${cues || 'none'}`
      }),
    ].filter(Boolean).join('\n'))
  }

  if ((context.recollectedWindows ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_RECOLLECTED_PERIODS]',
      'recall_role=period_evidence',
      'before_speaking=true',
      'listing_unrelated_fragments=false',
      ...(context.recollectedWindows ?? []).map((window) => {
        const label = sanitizeOrganicMemoryProviderText(window.label, 120)
        const summary = sanitizeOrganicMemoryProviderText(window.summary, 260)
        const cues = sanitizeOrganicMemoryProviderList(window.cues, 120, ' ; ')
        return `- period=${label || 'memory-window'} | when=${new Date(window.startedAt).toISOString()}..${new Date(window.endedAt).toISOString()} | confidence=${window.confidence.toFixed(2)} | provenance=${window.dominantProvenance} | summary=${summary || 'withheld'} | cues=${cues || 'none'}`
      }),
    ].join('\n'))
  }

  if ((context.recollectionNarratives ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_RECOLLECTION_NARRATIVES]',
      'recall_pressure=structured',
      'visible_wording_candidate=false',
      'copy_verbatim=false',
      'visible_author=mind_provider',
      ...(context.recollectionNarratives ?? []).map((item) => {
        const center = sanitizeOrganicMemoryProviderText(item.recallCenter || item.opening, 260)
        const evidenceCues = sanitizeOrganicMemoryProviderList(item.evidenceCues ?? item.supportCues, 160, ' ; ')
        const instruction = formatOrganicMemoryStructuralControlLine('instruction', item.speakerInstruction ?? 'inward_context=true; visible_template=false', 220)
          || 'instruction=inward_context=true; visible_template=false'
        return `- mode=${item.mode} | center=${center || 'withheld'} | pressure=${item.recallPressure ?? 'medium'} | certainty=${item.certainty} | provenance_posture=${item.provenancePosture ?? 'reconstructed'} | confidence=${item.confidence.toFixed(2)} | evidence_cues=${evidenceCues || 'none'} | ${instruction}`
      }),
    ].join('\n'))
  }

  if (context.recollectionPlan) {
    blocks.push([
      '[ALICIZATION_RECOLLECTION_PLAN]',
      'recollection_foreground=selected_by_mind',
      `certainty=${context.recollectionPlan.certainty}`,
      `confidence=${context.recollectionPlan.confidence.toFixed(2)}`,
      formatOrganicMemoryProviderLine('rationale', context.recollectionPlan.rationale, 260),
      (context.recollectionPlan.selectedRelationshipLines?.length ?? 0) > 0
        ? formatOrganicMemoryProviderLine('selected_relationship_lines', sanitizeOrganicMemoryProviderList(context.recollectionPlan.selectedRelationshipLines ?? [], 180), 520)
        : '',
      context.recollectionPlan.searchTrace
        ? `search_first_hop=${sanitizeOrganicMemoryProviderText(context.recollectionPlan.searchTrace.firstHop.focus, 80) || 'focus'}:${sanitizeOrganicMemoryProviderText(context.recollectionPlan.searchTrace.firstHop.summary, 180) || 'withheld'}`
        : '',
      context.recollectionPlan.searchTrace
        ? `search_second_hop=${sanitizeOrganicMemoryProviderText(context.recollectionPlan.searchTrace.secondHop.action, 80) || 'action'}:${sanitizeOrganicMemoryProviderText(context.recollectionPlan.searchTrace.secondHop.evidenceGap, 120) || 'none'}:${sanitizeOrganicMemoryProviderText(context.recollectionPlan.searchTrace.secondHop.summary, 180) || 'withheld'}`
        : '',
      context.recollectionPlan.searchTrace
        ? `search_third_hop=${sanitizeOrganicMemoryProviderText(context.recollectionPlan.searchTrace.thirdHop.ambiguityPosture, 80) || 'settled'}:${sanitizeOrganicMemoryProviderText(context.recollectionPlan.searchTrace.thirdHop.summary, 180) || 'withheld'}`
        : '',
    ].join('\n'))
  }

  if (context.recollectionSpeechPlan) {
    const speechControls = deliberationKernel?.speechControls ?? deriveRecollectionSurfaceControls(context.recollectionSpeechPlan)
    blocks.push([
      '[ALICIZATION_RECOLLECTION_SPEECH_PLAN]',
      'recollection_surface_role=timing_control',
      'fixed_template=false',
      'copy_verbatim=false',
      'visible_author=mind_provider',
      `should_surface=${context.recollectionSpeechPlan.shouldSurface ? 'yes' : 'no'}`,
      `surface_mode=${context.recollectionSpeechPlan.surfaceMode}`,
      `placement=${context.recollectionSpeechPlan.placement}`,
      `certainty=${context.recollectionSpeechPlan.certainty}`,
      `confidence=${context.recollectionSpeechPlan.confidence.toFixed(2)}`,
      speechControls ? `visibility=${speechControls.visibility}` : '',
      speechControls ? `continuity_role=${speechControls.continuityRole}` : '',
      speechControls ? `template_boundary=${speechControls.templateBoundary}` : '',
      context.recollectionSpeechPlan.styleNote
        ? formatOrganicMemoryStructuralControlLine('surface_guidance', context.recollectionSpeechPlan.styleNote, 320)
        : '',
      context.recollectionSpeechPlan.shouldSurface
        ? 'surface_policy=brief; current_payoff=replaced:false'
        : 'surface_policy=inward_pressure; surface_only_if_needed=true',
    ].filter(Boolean).join('\n'))
  }

  if (context.memoryDeliberation) {
    blocks.push([
      '[ALICIZATION_MEMORY_DELIBERATION]',
      'memory_decision=final_internal',
      'outranks=heuristic_recall+candidate_recollection',
      'visible_template=false',
      `should_recall=${deliberationKernel?.shouldRecall ? 'yes' : 'no'}`,
      `surface_policy=${deliberationKernel?.surfacePolicy ?? context.memoryDeliberation.surfacePolicy}`,
      `confidence=${context.memoryDeliberation.confidence.toFixed(2)}`,
      formatOrganicMemoryStructuralControlLine('why_now', deliberationKernel?.rationale ?? context.memoryDeliberation.whyNow, 300),
      deliberationKernel?.whyWithheld
        ? formatOrganicMemoryStructuralControlLine('why_withheld', deliberationKernel.whyWithheld, 300)
        : '',
      deliberationKernel?.restraint.mustDo.length
        ? formatOrganicMemoryStructuralControlList('must_do', deliberationKernel.restraint.mustDo, 220)
        : '',
      deliberationKernel?.restraint.mustNotDo.length
        ? formatOrganicMemoryStructuralControlList('must_not_do', deliberationKernel.restraint.mustNotDo, 220)
        : '',
      deliberationKernel?.followUpAffordance?.summary
        ? formatOrganicMemoryStructuralControlLine('follow_up_affordance', deliberationKernel.followUpAffordance.summary, 240)
        : '',
      deliberationKernel?.followUpAffordance?.whyNow
        ? formatOrganicMemoryStructuralControlLine('follow_up_why_now', deliberationKernel.followUpAffordance.whyNow, 240)
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
        ? formatOrganicMemoryProviderLine('conflict_variants', sanitizeOrganicMemoryProviderList((context.memoryDeliberation.conflictVariants ?? []).map(item => `${item.provenance}:${item.summary}`), 220), 900)
        : '',
      (deliberationKernel?.stableCore.length ?? 0) > 0
        ? formatOrganicMemoryProviderLine('stable_core', sanitizeOrganicMemoryProviderList(deliberationKernel?.stableCore ?? [], 220), 900)
        : '',
      (deliberationKernel?.unsafeDetails.length ?? 0) > 0
        ? formatOrganicMemoryProviderLine('unsafe_details', sanitizeOrganicMemoryProviderList(deliberationKernel?.unsafeDetails ?? [], 220), 900)
        : '',
      context.memoryDeliberation.selectedEras.length > 0
        ? formatOrganicMemoryProviderLine('selected_eras', sanitizeOrganicMemoryProviderList(context.memoryDeliberation.selectedEras.map(item => `${item.facet}:${item.summary}`), 220), 900)
        : '',
      context.memoryDeliberation.selectedPeriods.length > 0
        ? formatOrganicMemoryProviderLine('selected_periods', sanitizeOrganicMemoryProviderList(context.memoryDeliberation.selectedPeriods.map(item => `${item.kind}:${item.summary}`), 220), 900)
        : '',
      context.memoryDeliberation.selectedEpisodes.length > 0
        ? formatOrganicMemoryProviderLine('selected_episodes', sanitizeOrganicMemoryProviderList(context.memoryDeliberation.selectedEpisodes.map(item => `${item.provenance}:${item.summary}`), 220), 900)
        : '',
      context.memoryDeliberation.selectedProcedures.length > 0
        ? formatOrganicMemoryProviderLine('selected_procedures', sanitizeOrganicMemoryProviderList(context.memoryDeliberation.selectedProcedures.map(item => `${item.label}:${item.approach}`), 220), 900)
        : '',
      context.memoryDeliberation.selectedBundles.length > 0
        ? formatOrganicMemoryProviderLine('selected_bundles', sanitizeOrganicMemoryProviderList(context.memoryDeliberation.selectedBundles.map(item => `${item.id}:${item.summary}`), 220), 900)
        : '',
      context.memoryDeliberation.selectedChains.length > 0
        ? formatOrganicMemoryProviderLine('selected_chains', sanitizeOrganicMemoryProviderList(context.memoryDeliberation.selectedChains.map(item => `${item.kind}:${item.summary}`), 220), 900)
        : '',
      deliberationKernel?.selectedRelationshipSummary
        ? formatOrganicMemoryProviderLine('selected_relationship_lines', deliberationKernel.selectedRelationshipSummary, 520)
        : '',
      context.memoryDeliberation.searchTrace
        ? `search_first_hop=${sanitizeOrganicMemoryProviderText(context.memoryDeliberation.searchTrace.firstHop.focus, 80) || 'focus'}:${sanitizeOrganicMemoryProviderText(context.memoryDeliberation.searchTrace.firstHop.summary, 180) || 'withheld'}`
        : '',
      context.memoryDeliberation.searchTrace
        ? `search_second_hop=${sanitizeOrganicMemoryProviderText(context.memoryDeliberation.searchTrace.secondHop.action, 80) || 'action'}:${sanitizeOrganicMemoryProviderText(context.memoryDeliberation.searchTrace.secondHop.evidenceGap, 120) || 'none'}:${sanitizeOrganicMemoryProviderText(context.memoryDeliberation.searchTrace.secondHop.summary, 180) || 'withheld'}`
        : '',
      context.memoryDeliberation.searchTrace
        ? `search_third_hop=${sanitizeOrganicMemoryProviderText(context.memoryDeliberation.searchTrace.thirdHop.ambiguityPosture, 80) || 'settled'}:${sanitizeOrganicMemoryProviderText(context.memoryDeliberation.searchTrace.thirdHop.summary, 180) || 'withheld'}`
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.memoryResolutionLedger) {
    const closureDiscipline = deriveAlicizationMemoryClosureDiscipline(context.memoryResolutionLedger)
    blocks.push([
      '[ALICIZATION_MEMORY_CLOSURE_STATE]',
      'closure_role=final_current_turn_memory_posture',
      'governance_scope=recall_accuracy,uncertainty_labeling,visible_carry; fixed_visible_surface=answer_payoff',
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
        ? formatOrganicMemoryProviderLine('dominant_cluster', context.memoryResolutionLedger.dominantClusterSummary, 300)
        : '',
      context.memoryResolutionLedger.competingClusterSummary
        ? formatOrganicMemoryProviderLine('competing_cluster', context.memoryResolutionLedger.competingClusterSummary, 300)
        : '',
      (context.memoryResolutionLedger.suppressionTags?.length ?? 0) > 0
        ? formatOrganicMemoryProviderLine('suppression_tags', sanitizeOrganicMemoryProviderList(context.memoryResolutionLedger.suppressionTags, 120), 700)
        : '',
      context.memoryResolutionLedger.finalRationale
        ? formatOrganicMemoryProviderLine('closure_rationale', context.memoryResolutionLedger.finalRationale, 300)
        : '',
      closureDiscipline.requiredSurfaceDiscipline.length > 0
        ? `closure_discipline=${closureDiscipline.requiredSurfaceDiscipline.join(' | ')}`
        : '',
      closureDiscipline.shouldLabelUncertainty
        ? 'memory_surface_uncertainty_label=required_when_needed; approximation_label=required_when_needed; reconstruction_label=required_when_needed'
        : 'memory_surface_grounding=selected_stable_recall; specificity_inflation=blocked',
    ].filter(Boolean).join('\n'))
  }

  if (memoryTurnArtifact) {
    blocks.push([
      '[ALICIZATION_MEMORY_TURN_GOVERNANCE]',
      'gate_role=turn_level_memory_gate; converts=recall_ranking,wrong_thread_risk,precision_pressure,latency_to_visible_memory_permission',
      'usage=before_speaking_mind_governance; quote_metrics=false; fixed_visible_reply_template=false',
      `visible_memory_gate=${memoryTurnArtifact.visibleMemoryGate.status}`,
      `recall_readiness=${memoryTurnArtifact.visibleMemoryGate.recallReadiness.toFixed(2)}`,
      `precision_proxy=${memoryTurnArtifact.visibleMemoryGate.precisionProxy.toFixed(2)}`,
      `wrong_thread_risk=${memoryTurnArtifact.visibleMemoryGate.wrongThreadRisk.toFixed(2)}`,
      `latency_pressure=${memoryTurnArtifact.visibleMemoryGate.latencyPressure.toFixed(2)}`,
      memoryTurnArtifact.visibleMemoryGate.reasons.length > 0
        ? formatOrganicMemoryProviderLine('gate_reasons', sanitizeOrganicMemoryProviderList(memoryTurnArtifact.visibleMemoryGate.reasons, 160), 700)
        : '',
      `candidate_count=${memoryTurnArtifact.metrics.recallCandidateCount}`,
      `selected_count=${memoryTurnArtifact.metrics.selectedCandidateCount}`,
      `wrong_thread_suppressed=${memoryTurnArtifact.metrics.wrongThreadSuppressedCount}`,
      `unsupported_specificity_blocked=${memoryTurnArtifact.metrics.unsupportedSpecificityBlockedCount}`,
      memoryTurnArtifact.visibleMemoryGate.status === 'closed' || memoryTurnArtifact.visibleMemoryGate.status === 'inward-only'
        ? 'visible_memory_surface_policy=stay_inward; visible_narration=false; effects=caution,care,ordering,uncertainty'
        : memoryTurnArtifact.visibleMemoryGate.status === 'gist-only'
          ? 'visible_memory_surface_policy=gist_only; current_payoff_required=true; uncertainty_label=when_needed'
          : 'visible_memory_surface_policy=allowed_if_current_payoff_direct; author=mind_provider',
    ].filter(Boolean).join('\n'))
  }

  if ((context.proceduralMemories ?? []).length > 0) {
    blocks.push([
      '[ALICIZATION_PROCEDURAL_MEMORY]',
      'procedural_role=past_approach_memory',
      'current_task_solved_claim=false',
      ...(context.proceduralMemories ?? []).map((item) => {
        const label = sanitizeOrganicMemoryProviderText(item.label, 120)
        const approach = sanitizeOrganicMemoryProviderText(item.approach, 260)
        const pitfalls = sanitizeOrganicMemoryProviderList(item.pitfalls, 140, ' ; ')
        const cues = sanitizeOrganicMemoryProviderList(item.cues, 120, ' ; ')
        return `- label=${label || 'procedure'} | confidence=${item.confidence.toFixed(2)} | approach=${approach || 'withheld'} | pitfalls=${pitfalls || 'none'} | cues=${cues || 'none'}`
      }),
    ].join('\n'))
  }

  if (context.hostPersonModel) {
    blocks.push([
      '[ALICIZATION_HOST_PERSON_MODEL]',
      'host_model_role=long_horizon_relational_memory',
      'current_moment_proof=false',
      context.hostPersonModel.summary
        ? formatOrganicMemoryProviderLine('summary', context.hostPersonModel.summary, 260)
        : '',
      `trust_ladder=${context.hostPersonModel.trustLadder.stage} (${context.hostPersonModel.trustLadder.score.toFixed(2)})`,
      context.hostPersonModel.routines.length > 0
        ? formatOrganicMemoryProviderLine('routines', sanitizeOrganicMemoryProviderList(context.hostPersonModel.routines, 160, ' ; '), 700)
        : '',
      context.hostPersonModel.sensitivities.length > 0
        ? formatOrganicMemoryProviderLine('sensitivities', sanitizeOrganicMemoryProviderList(context.hostPersonModel.sensitivities, 160, ' ; '), 700)
        : '',
      context.hostPersonModel.repairTriggers.length > 0
        ? formatOrganicMemoryProviderLine('repair_triggers', sanitizeOrganicMemoryProviderList(context.hostPersonModel.repairTriggers, 160, ' ; '), 700)
        : '',
      context.hostPersonModel.preferredClosenessByContext.length > 0
        ? formatOrganicMemoryProviderLine('preferred_closeness', sanitizeOrganicMemoryProviderList(context.hostPersonModel.preferredClosenessByContext.map(item => `${item.context}:${item.preference} (${item.confidence.toFixed(2)})`), 160), 700)
        : '',
      context.hostPersonModel.recurrentBurdens.length > 0
        ? formatOrganicMemoryProviderLine('recurrent_burdens', sanitizeOrganicMemoryProviderList(context.hostPersonModel.recurrentBurdens, 160, ' ; '), 700)
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.personStateProjection) {
    blocks.push([
      '[ALICIZATION_PERSON_STATE_PROJECTION]',
      'person_state_authority=distance_timing_opening',
      'second_relationship_stance=false',
      formatOrganicMemoryProviderLine('summary', context.personStateProjection.summary, 260),
      `regime=${context.personStateProjection.personalityContinuityState.currentRegime}`,
      `trust_stage=${context.personStateProjection.personalityContinuityState.trustStage}`,
      `closeness_ladder=${context.personStateProjection.activeClosenessContext}/${context.personStateProjection.activeClosenessRung}`,
      context.personStateProjection.relationshipPosture
        ? formatOrganicMemoryProviderLine('relationship_posture', context.personStateProjection.relationshipPosture, 120)
        : '',
      context.personStateProjection.openingGuidance
        ? formatOrganicMemoryProviderLine('opening_guidance', context.personStateProjection.openingGuidance, 220)
        : '',
      context.personStateProjection.preferenceText
        ? formatOrganicMemoryProviderLine('preference', context.personStateProjection.preferenceText, 220)
        : '',
      context.personStateProjection.sensitivityText
        ? formatOrganicMemoryProviderLine('sensitivity', context.personStateProjection.sensitivityText, 220)
        : '',
      context.personStateProjection.repairTriggerText
        ? formatOrganicMemoryProviderLine('repair_trigger', context.personStateProjection.repairTriggerText, 220)
        : '',
      context.personStateProjection.burdenText
        ? formatOrganicMemoryProviderLine('burden', context.personStateProjection.burdenText, 220)
        : '',
      context.personStateProjection.trustRationale
        ? formatOrganicMemoryProviderLine('trust_rationale', context.personStateProjection.trustRationale, 220)
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.affectiveResidue) {
    blocks.push([
      '[ALICIZATION_AFFECTIVE_RESIDUE_MEMORY]',
      'memory_role=long_horizon_affective_residue; dimensions=timing,distance,repair,burden,trust,rest_protection',
      'usage=mind_state_context_only; visible_care_template=false; fixed_opener=false',
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
      context.affectiveResidue.summary ? formatOrganicMemoryProviderLine('summary', context.affectiveResidue.summary, 260) : '',
      context.affectiveResidue.residues.length > 0
        ? formatOrganicMemoryProviderLine('residues', sanitizeOrganicMemoryProviderList(context.affectiveResidue.residues.map(item => `${item.kind}:${item.intensity.toFixed(2)}:${item.releaseMode}:${item.summary}`), 220), 900)
        : '',
    ].filter(Boolean).join('\n'))
  }

  if (context.executionCallbackCarry) {
    blocks.push([
      '[ALICIZATION_EXECUTION_CALLBACK_CARRY]',
      'execution_callback_carry_role=remembered_relationship_carry; generic_result_summary=false',
      'continuation_scope=pacing,room,trust_warmth,bond_continuity',
      `carry_mode=${context.executionCallbackCarry.carryMode}`,
      `confidence=${context.executionCallbackCarry.confidence.toFixed(2)}`,
      context.executionCallbackCarry.threadAnchor
        ? `thread=${context.executionCallbackCarry.threadAnchor}`
        : '',
      context.executionCallbackCarry.episodeId
        ? `episode=${context.executionCallbackCarry.episodeId}`
        : '',
      formatOrganicMemoryProviderLine('summary', context.executionCallbackCarry.summary, 260),
    ].filter(Boolean).join('\n'))
  }

  if (context.selfEvolution) {
    const latestInflection = context.selfEvolution.latestInflection ?? ''
    const relationshipCadenceSummary = context.selfEvolution.relationshipCadenceSummary ?? ''
    const embodimentCadenceAuthority = /measured-return body line|durable rhythm|durable relationship rhythm|repair-before-closeness|voice, face, motion, and lipsync/u.test(latestInflection)
    const sameHerDurableCadenceAuthority = /continuity identity|continuity|continuity line|without reopening from scratch|without restarting from scratch|across quiet, memory, and speech/u.test(relationshipCadenceSummary.toLowerCase())
    const activeLearningFocuses = sanitizeOrganicMemoryProviderList(context.selfEvolution.activeLearningFocuses, 120)
    const sourceSignals = sanitizeOrganicMemoryProviderList(context.selfEvolution.sourceSignals, 120)
    blocks.push([
      '[ALICIZATION_SELF_EVOLUTION]',
      'kernel_role=long_horizon_self_evolution; synthesized_from=reflection,durable_memory,relationship_growth',
      'usage=inner_trajectory_and_learning_pressure; canned_speech_template=false',
      embodimentCadenceAuthority
        ? 'embodiment_confirmed_cadence=current_memory_authority; recollection_selection=body_confirmed_relationship_rhythm; distance=body_confirmed_relationship_rhythm; surface_timing=body_confirmed_relationship_rhythm'
        : '',
      sameHerDurableCadenceAuthority
        ? 'inward_continuity_authority=prefer memory-owner evidence over reusable continuity slogans'
        : '',
      sanitizeOrganicMemoryProviderText(context.selfEvolution.summary, 260)
        ? `summary=${sanitizeOrganicMemoryProviderText(context.selfEvolution.summary, 260)}`
        : '',
      sanitizeOrganicMemoryProviderText(context.selfEvolution.dominantTrajectory, 260)
        ? `dominant_trajectory=${sanitizeOrganicMemoryProviderText(context.selfEvolution.dominantTrajectory, 260)}`
        : '',
      sanitizeOrganicMemoryProviderText(context.selfEvolution.relationshipDoctrine, 260)
        ? `relationship_doctrine=${sanitizeOrganicMemoryProviderText(context.selfEvolution.relationshipDoctrine, 260)}`
        : '',
      sanitizeOrganicMemoryProviderText(context.selfEvolution.relationshipCadenceSummary, 260)
        ? `relationship_cadence_summary=${sanitizeOrganicMemoryProviderText(context.selfEvolution.relationshipCadenceSummary, 260)}`
        : '',
      sanitizeOrganicMemoryProviderText(context.selfEvolution.latestInflection, 260)
        ? `latest_inflection=${sanitizeOrganicMemoryProviderText(context.selfEvolution.latestInflection, 260)}`
        : '',
      sanitizeOrganicMemoryProviderText(context.selfEvolution.burdenLine, 220)
        ? `burden_line=${sanitizeOrganicMemoryProviderText(context.selfEvolution.burdenLine, 220)}`
        : '',
      sanitizeOrganicMemoryProviderText(context.selfEvolution.trustMeaning, 220)
        ? `trust_meaning=${sanitizeOrganicMemoryProviderText(context.selfEvolution.trustMeaning, 220)}`
        : '',
      `evolution_momentum=${context.selfEvolution.evolutionMomentum.toFixed(2)}`,
      `learning_readiness=${context.selfEvolution.learningReadiness.toFixed(2)}`,
      `contradiction_pressure=${context.selfEvolution.contradictionPressure.toFixed(2)}`,
      `revision_pressure=${context.selfEvolution.revisionPressure.toFixed(2)}`,
      `autobiographical_stability=${context.selfEvolution.autobiographicalStability.toFixed(2)}`,
      `next_learning_action=${context.selfEvolution.nextLearningAction}`,
      sanitizeOrganicMemoryProviderText(context.selfEvolution.nextLearningReason, 220)
        ? `next_learning_reason=${sanitizeOrganicMemoryProviderText(context.selfEvolution.nextLearningReason, 220)}`
        : '',
      context.selfEvolution.shouldRecord ? 'should_record=yes' : 'should_record=no',
      context.selfEvolution.shouldReflect ? 'should_reflect=yes' : 'should_reflect=no',
      context.selfEvolution.shouldVerify ? 'should_verify=yes' : 'should_verify=no',
      context.selfEvolution.shouldRevise ? 'should_revise=yes' : 'should_revise=no',
      context.selfEvolution.shouldInternalize ? 'should_internalize=yes' : 'should_internalize=no',
      activeLearningFocuses ? `active_learning_focuses=${activeLearningFocuses}` : '',
      sourceSignals ? `source_signals=${sourceSignals}` : '',
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
      'recall_entry_reason=mind_decided_turn_needs_recollection; fixed_date_template=false',
      `mode=${context.recollectionIntent.mode}`,
      `temporal_focus=${context.recollectionIntent.temporalFocus}`,
      `confidence=${context.recollectionIntent.confidence.toFixed(2)}`,
      formatOrganicMemoryProviderLine('rationale', context.recollectionIntent.rationale, 260),
      context.recollectionIntent.queryHints.length > 0
        ? formatOrganicMemoryProviderLine('query_hints', sanitizeOrganicMemoryProviderList(context.recollectionIntent.queryHints, 180), 900)
        : '',
    ]
    blocks.push(blocksIntent.filter(Boolean).join('\n'))
    if (recollectionAgenda) {
      blocks.push([
        '[ALICIZATION_RECOLLECTION_AGENDA]',
        'agenda_role=mind_level_recall_search_priorities; rigid_rule=false',
        formatOrganicMemoryProviderLine('why_recall_now', recollectionAgenda.whyRecallNow, 260),
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
          ? formatOrganicMemoryProviderLine('candidate_procedure_lines', sanitizeOrganicMemoryProviderList(recollectionAgenda.candidateProcedureLines, 180), 900)
          : '',
      ].filter(Boolean).join('\n'))
    }
  }
  if (recallProvenances.length > 0) {
    blocks.push([
      '[ALICIZATION_MEMORY_PROVENANCE]',
      'provenance_rule=reply_wording_respects_item_provenance',
      'provenance_observed=direct_experience_or_witnessed',
      'provenance_remembered=durable_continuity_memory_from_real_interaction',
      'provenance_dreamt=dream_only; real_world_proof=false',
      'provenance_inferred=learned_pattern_or_abstraction; direct_scene_evidence=false',
      'provenance_reconstructed=partial_or_interference_prone; uncertainty_label=required_if_used',
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
      'snapshot_role=relationship_metabolism; use=relationship_continuity; current_turn_fact_override=false',
      `host_attitude=${relationshipDynamics.hostAttitude}`,
      relationshipDynamics.previousHostAttitude
        ? `previous_host_attitude=${relationshipDynamics.previousHostAttitude}`
        : 'previous_host_attitude=none',
      `personality_drift=obedience:${signedDelta(relationshipDynamics.obedienceDelta)},liveliness:${signedDelta(relationshipDynamics.livelinessDelta)},sensibility:${signedDelta(relationshipDynamics.sensibilityDelta)}`,
      `source=${relationshipDynamics.source}`,
    ].join('\n'))
  }

  return blocks
}
