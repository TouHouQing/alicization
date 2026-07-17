import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const serviceRoot = new URL('./', import.meta.url)
const repositoryRoot = fileURLToPath(new URL('../../../../../../', serviceRoot))

function readServiceSource(relativePath: string) {
  return readFileSync(new URL(relativePath, serviceRoot), 'utf8')
}

function readRepoSource(relativePath: string) {
  return readFileSync(new URL(`../../../../../../${relativePath}`, serviceRoot), 'utf8')
}

function readProductionTree(relativePath: string) {
  const sources: string[] = []
  const visit = (absolutePath: string) => {
    for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
      const entryPath = join(absolutePath, entry.name)
      if (entry.isDirectory()) {
        visit(entryPath)
        continue
      }
      if (!/\.(?:ts|vue)$/u.test(entry.name) || /\.(?:test|spec)\.ts$/u.test(entry.name))
        continue
      sources.push(readFileSync(entryPath, 'utf8'))
    }
  }
  visit(join(repositoryRoot, relativePath))
  return sources.join('\n')
}

describe('fixed reply governance removal', () => {
  it('keeps executive and response-surface planning data-only', () => {
    const executiveSource = readServiceSource('./executive-answer-brief.ts')
    const responseSurfaceSource = readServiceSource('./response-surface-contract.ts')

    expect(executiveSource).not.toContain('systemBlock: [')
    expect(executiveSource).not.toMatch(/\bconst mustDo\b|\bconst mustNotDo\b|normalizeExecutiveControlList/u)
    expect(responseSurfaceSource).not.toContain('systemBlock: [')
    expect(responseSurfaceSource).not.toMatch(/pushUnique\(mustDo|pushUnique\(mustNotDo|Surface must do:|Surface must not do:/u)
    expect(responseSurfaceSource).not.toContain(['recollection', 'Latent', 'Controls'].join(''))
  })

  it('does not inject reply-writing governance blocks into provider messages', () => {
    const perceptionAugmentSource = readServiceSource('./runtime-chat-perception-augment.ts')
    const sessionRuntimeSource = readServiceSource('./main-chat-session-runtime.ts')
    const mindTurnSource = readServiceSource('./mind-turn-contract.ts')

    expect(perceptionAugmentSource).not.toMatch(
      /systemBlocks\.(?:executiveAnswerBrief|responseSurfaceContract|mindTurnContract|responseCharter|answerPlanner)/u,
    )
    expect(sessionRuntimeSource).not.toContain('injectProviderFacingMindTurnContractSystemMessage')
    expect(mindTurnSource).not.toContain('Must do:')
    expect(mindTurnSource).not.toContain('Must not do:')
    expect(mindTurnSource).not.toMatch(/contract\.mustDo\.map|contract\.mustNotDo\.map/u)
  })

  it('does not rebuild answer-planner reply rules from the mind contract', () => {
    const source = readServiceSource('./main-chat-session-runtime.ts')

    expect(source).not.toContain(
      'openingMove: input.contract?.projectState?.preDialogueAwarenessLine',
    )
    expect(source).not.toContain(
      'mustDo: [...(input.contract?.mustDo ?? [])]',
    )
    expect(source).not.toContain(
      'mustNotDo: [...(input.contract?.mustNotDo ?? [])]',
    )
    expect(source).not.toContain('continuity_policy=project_state_required')
  })

  it('does not assemble session, organic-memory, or performance governance prompts for main chat', () => {
    const source = readServiceSource('./main-chat-session-runtime.ts')
    const removedBuilderName = ['buildOrganicMemory', 'SystemBlocks'].join('')

    expect(source).not.toContain('buildAlicizationDialogueMemoryCarrySystemBlock')
    expect(source).not.toContain('buildSessionMirrorSystemBlock')
    expect(source).not.toContain(removedBuilderName)
    expect(source).not.toContain('buildPerformanceManifestSystemBlocks(performanceManifest)')
    expect(source).not.toContain('agentTurn.buildSessionSystemBlock()')
  })

  it('removes the legacy organic-memory system prompt builder and marker blocks', () => {
    const organicPromptSource = readServiceSource('./runtime-organic-memory-prompt.ts')
    const organicPromptBlocksSource = readServiceSource('./runtime-organic-memory-prompt-blocks.ts')
    const removedBuilderName = ['buildOrganicMemory', 'SystemBlocks'].join('')

    expect(organicPromptSource).not.toContain(removedBuilderName)
    expect(organicPromptBlocksSource).not.toContain(removedBuilderName)
    expect(organicPromptBlocksSource).not.toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
    expect(organicPromptBlocksSource).not.toMatch(
      /Use these as|The mind selected|Do not copy them|WorkingMemory owns short-term memory/u,
    )
  })

  it('drops fixed-template residue instead of replacing it with another internal cue', () => {
    const sources = [
      readServiceSource('./digital-life-spine.ts'),
      readServiceSource('./digital-life-architecture.ts'),
      readServiceSource('./runtime-memory-closure.ts'),
      readServiceSource('./humanlike-memory.ts'),
    ].join('\n')
    const replacementCue = ['source', 'template=excluded'].join('_')

    expect(sources).not.toContain(replacementCue)
  })

  it('does not carry authored natural recall lines through memory, transport, bridge, or UI surfaces', () => {
    const sources = [
      readServiceSource('./humanlike-memory.ts'),
      readServiceSource('./humanlike-memory-recall-seed.ts'),
      readServiceSource('./runtime-memory-closure.ts'),
      readRepoSource('packages/stage-shared/src/alicization-transport-contracts.ts'),
      readRepoSource('packages/stage-ui/src/stores/alicization-humanlike-memory-audit.ts'),
      readRepoSource('packages/stage-pages/src/pages/devtools/components/mind-replay-humanlike-memory-audit-panel.vue'),
    ].join('\n')

    expect(sources).not.toContain(['natural', 'RecallLine'].join(''))
  })

  it('does not carry recollection reply drafts or style cues through production memory surfaces', () => {
    const sources = [
      readProductionTree('apps/stage-tamagotchi/src/main/services/alicization'),
      readRepoSource('apps/stage-tamagotchi/src/shared/eventa.ts'),
      readProductionTree('packages/stage-shared/src'),
      readProductionTree('packages/stage-ui/src/stores'),
      readProductionTree('packages/stage-pages/src/pages/devtools/components'),
    ].join('\n')
    const removedCueFields = [
      ['internal', 'Lead'].join(''),
      ['visible', 'Lead'].join(''),
      ['style', 'Note'].join(''),
    ]

    for (const field of removedCueFields)
      expect(sources).not.toMatch(new RegExp(`\\b${field}\\b`, 'u'))
  })

  it('keeps perception augmentation free of reply-shaping system blocks', () => {
    const source = readServiceSource('./runtime-chat-perception-augment.ts')

    expect(source).toContain('const systemBlocks: string[] = []')
    expect(source).not.toMatch(
      /build(?:DialogueActKernel|DiscourseState|MindSynthesis|ConversationState|DialogueWorldThread|AnswerCompiler|CurrentConsciousFrame|ClaimEvidenceLedger|ReplyDeliberation|MemorySearchGovernor|DialogueTurnEncounter|AlicizationDialogueObligation|DialogueFocusGovernance)SystemBlock/u,
    )
    expect(source).not.toMatch(
      /buildAlicizationProviderFacingProjectState(?:SystemBlock|ClosureDashboard)|buildAlicizationRuntimeSystemBlock/u,
    )
  })

  it('keeps visible-reply validation structural instead of content-governed', () => {
    const criticSource = readServiceSource('./visible-reply/critic.ts')
    const semanticJudgePath = fileURLToPath(new URL('./visible-reply/semantic-judge.ts', serviceRoot))

    expect(existsSync(semanticJudgePath)).toBe(false)
    expect(criticSource).not.toMatch(
      /semanticJudge|memoryGateCompliance|truthSpecificity|payoffCompletion|personaAffectCoherence|mindContractCoherence|validation-failed/u,
    )
  })

  it('removes semantic-judge compatibility branches from runtime metadata and UI diagnostics', () => {
    const sources = [
      readServiceSource('./main-chat-stream-meta.ts'),
      readRepoSource('packages/stage-ui/src/composables/alicization-prompt-composer.ts'),
      readRepoSource('packages/stage-ui/src/components/scenes/stage-quick-reply-closure.ts'),
      readRepoSource('apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer-self-evolution-diagnostic-summary.ts'),
    ].join('\n')

    expect(sources).not.toMatch(
      /semantic-judge:|semanticLoopClosed|validation-failed/u,
    )
  })

  it('removes the unused continuity fast-path helper instead of preserving a parallel dialogue policy', () => {
    const source = readServiceSource('./continuity-deliberation.ts')

    expect(source).not.toContain('deriveAlicizationContinuityDeliberationForFastPath')
  })

  it('removes the dead local mind renderer and governed fallback authoring stack', () => {
    const removedPaths = [
      './mind-surface-renderer.ts',
      './mind-surface-renderer.test.ts',
      './governed-mind-fallback-compat.ts',
      '../../../../../../packages/stage-shared/src/alicization-mind-fallback.ts',
      '../../../../../../packages/stage-shared/src/alicization-mind-fallback.test.ts',
      '../../../../../../packages/stage-ui/src/composables/alicization-mind-fallback.ts',
      '../../../../../../packages/stage-ui/src/composables/alicization-mind-fallback.test.ts',
    ]

    for (const relativePath of removedPaths) {
      const absolutePath = fileURLToPath(new URL(relativePath, serviceRoot))
      expect(existsSync(absolutePath), relativePath).toBe(false)
    }

    expect(readRepoSource('packages/stage-shared/src/index.ts')).not.toContain(
      'export * from \'./alicization-mind-fallback\'',
    )
  })

  it('does not synthesize a local proactive mind when the Provider is unavailable', () => {
    const runtimeSource = readServiceSource('./runtime.ts')
    const subconsciousTickSource = readServiceSource('./runtime-subconscious-tick.ts')

    expect(runtimeSource).not.toMatch(
      /function buildProactiveStructured|inferFallbackPersonaTone|Persona tone:|Provider mind unavailable; visible reply held\./u,
    )
    expect(subconsciousTickSource).not.toContain('buildProactiveStructured')
    expect(subconsciousTickSource).not.toMatch(
      /llmStructured\s*\?\?\s*buildProactiveStructured/u,
    )
  })

  it('keeps proactive Provider generation on typed facts and native schema only', () => {
    const runtimeSource = readServiceSource('./runtime.ts')
    const oneShotSource = readServiceSource('./runtime-main-gateway-one-shot.ts')

    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-proactive-turn-context\'',
    )
    expect(runtimeSource).toContain('responseFormat: alicizationProviderResponseFormat')
    expect(oneShotSource).toContain('responseFormat: generateOptions.responseFormat')
    expect(runtimeSource).not.toMatch(
      /\[SYSTEM OVERRIDE: 内部动机触发\]|策略层已经完成|style_constraint=|reply_max_chars=|reply_policy=|Long-horizon learning is currently|Use the person-state projection as the single social authority|This is Alicization short-lived perceptual continuity|When wording a proactive utterance/u,
    )
  })

  it('keeps reminder Provider generation on typed facts and native schema only', () => {
    const runtimeSource = readServiceSource('./runtime.ts')

    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-reminder-turn-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-reminder-generation-request\'',
    )
    expect(runtimeSource).not.toMatch(
      /\[SYSTEM OVERRIDE: 备忘录触发\]|must proactively deliver a due reminder|Reminder trigger delay:|reply must contain the reminder content|Deliver this reminder to the Host now/u,
    )
  })

  it('keeps dream metabolism and core reforge on typed facts and native schemas only', () => {
    const runtimeSource = readServiceSource('./runtime.ts')
    const dreamContractSource = readServiceSource('./runtime-dream-provider-contract.ts')
    const oneShotSource = readServiceSource('./runtime-main-gateway-one-shot.ts')

    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-dream-metabolism-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-dream-metabolism-request\'',
    )
    expect(runtimeSource).toContain(
      'responseFormat: alicizationDreamMetabolismResponseFormat',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-core-reforge-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-core-reforge-request\'',
    )
    expect(runtimeSource).toContain(
      'responseFormat: alicizationCoreIncarnationReforgeResponseFormat',
    )
    expect(dreamContractSource).toMatch(
      /name:\s*'alicization_dream_metabolism'[\s\S]*strict:\s*true/u,
    )
    expect(dreamContractSource).toMatch(
      /name:\s*'alicization_core_incarnation_reforge'[\s\S]*strict:\s*true/u,
    )
    expect(oneShotSource).not.toContain(
      'responseFormat?: typeof alicizationProviderResponseFormat',
    )
    expect(runtimeSource).not.toMatch(
      /\[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑\]|\[SYSTEM OVERRIDE: 摇光心意重铸\]|你的任务是阅读今天的对话记录|你的任务是根据一次强烈的破碎事件|Output must be valid JSON only|No markdown, no extra prose/u,
    )
  })

  it('does not author personality or memory locally when dream Provider generation is unavailable', () => {
    const dreamRuntimeSource = readServiceSource('./runtime-dream.ts')

    expect(dreamRuntimeSource).toContain(
      'skippedReason: \'provider-unavailable\'',
    )
    expect(dreamRuntimeSource).not.toMatch(
      /fallbackMetabolism|fallbackHostAttitude|attitudeScore|hostilitySignals|warmthSignals|hostDenySignals|dream-heuristic|Heuristic dream metabolism|Dream metabolism consolidated recent dialogue|The dream pulled a high-tension memory|The dream quietly settled lingering threads|Dream time should consolidate the unresolved line|态度演变记录/u,
    )
  })

  it('keeps dream memory refinement and autobiographical synthesis on typed facts and native schemas', () => {
    const runtimeSource = readServiceSource('./runtime.ts')
    const dreamContractSource = readServiceSource('./runtime-dream-provider-contract.ts')

    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-memory-consolidation-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-memory-consolidation-request\'',
    )
    expect(runtimeSource).toContain(
      'responseFormat: alicizationMemoryConsolidationRefinementResponseFormat',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-autobiographical-synthesis-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-autobiographical-synthesis-request\'',
    )
    expect(runtimeSource).toContain(
      'responseFormat: alicizationDreamAutobiographicalSummariesResponseFormat',
    )
    expect(runtimeSource).toContain('const allowedIds = new Set(')
    expect(
      runtimeSource.match(
        /if \(input\.serializedTurns\.length === 0 \|\| input\.consolidations\.length === 0\)/gu,
      ),
    ).toHaveLength(2)
    expect(dreamContractSource).toMatch(
      /name:\s*'alicization_memory_consolidation_refinement'[\s\S]*strict:\s*true/u,
    )
    expect(dreamContractSource).toMatch(
      /name:\s*'alicization_dream_autobiographical_summaries'[\s\S]*strict:\s*true/u,
    )
    expect(runtimeSource).not.toMatch(
      /\[ALICIZATION_MEMORY_CONSOLIDATION_REFINEMENT\]|\[ALICIZATION_DREAM_AUTOBIOGRAPHICAL_SUMMARIES\]|provider_role=dream_|task=refine_deterministic_consolidation_summaries|task=period_autobiographical_summary|output_format=json_only|Dream consolidation candidate JSON|Dream autobiographical synthesis JSON/u,
    )
  })

  it('keeps dialogue semantics and subjective inference on typed facts and native schemas', () => {
    const runtimeSource = readServiceSource('./runtime-mind-state.ts')
    const contractSource = readServiceSource('./runtime-mind-state-provider-contract.ts')

    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-dialogue-turn-semantics-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-dialogue-turn-semantics-request\'',
    )
    expect(runtimeSource).toContain(
      'responseFormat: alicizationDialogueTurnSemanticsResponseFormat',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-subjective-inference-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-subjective-inference-request\'',
    )
    expect(runtimeSource).toContain(
      'responseFormat: alicizationSubjectiveInferenceResponseFormat',
    )
    expect(contractSource).toMatch(
      /name:\s*'alicization_dialogue_turn_semantics'[\s\S]*strict:\s*true/u,
    )
    expect(contractSource).toMatch(
      /name:\s*'alicization_subjective_inference'[\s\S]*strict:\s*true/u,
    )
    expect(runtimeSource).not.toMatch(
      /You are Alicization private dialogue cognition|You are Alicization private cognition|Output valid JSON only with keys|Dialogue mind snapshot JSON|Perceptual mind state JSON|Prefer interpretations that preserve coherent personhood|Prefer interpretations that protect coherent personhood/u,
    )
  })

  it('removes second-pass repair vocabulary and rewrite carry fields from the validation transport', () => {
    const sources = [
      readServiceSource('./visible-reply/critic.ts'),
      readServiceSource('./visible-reply/closure-orchestrator.ts'),
      readServiceSource('./visible-reply/realization-engine.ts'),
      readServiceSource('./visible-reply/settlement.ts'),
      readServiceSource('./main-chat-stream-runner.ts'),
      readServiceSource('./runtime.ts'),
      readRepoSource('apps/stage-tamagotchi/src/shared/eventa.ts'),
      readRepoSource('apps/stage-tamagotchi/src/renderer/App.vue'),
      readRepoSource('packages/stage-shared/src/alicization-transport-contracts.ts'),
      readRepoSource('packages/stage-ui/src/stores/alicization-bridge.ts'),
      readRepoSource('packages/stage-ui/src/stores/alicization-browser-bridge.ts'),
      readRepoSource('packages/stage-ui/src/stores/chat.ts'),
    ].join('\n')
    const removedTokens = [
      'repair-required',
      'shouldForceAlicizationVisibleReplyRepair',
      'governed-repair-fallback',
      'repairReasonCodes',
      'mustDropCount',
      'mustPreserveCount',
      'forceBlock',
      'forceReasonCodes',
    ]

    for (const token of removedTokens)
      expect(sources).not.toContain(token)
  })

  it('keeps structural critic transport out of project-state synthesis and legacy compatibility', () => {
    const observationSource = readRepoSource('packages/stage-ui/src/stores/project-state-observation.ts')
    const bridgeSource = readRepoSource('packages/stage-ui/src/stores/alicization-browser-bridge.ts')
    const chatSource = readRepoSource('packages/stage-ui/src/stores/chat.ts')
    const realizationSource = readServiceSource('./visible-reply/realization-engine.ts')

    expect(observationSource).not.toMatch(
      /visibleReplyCritic|visibleReplyClosure|criticReasonFallback|closureReasonFallback/u,
    )
    expect([bridgeSource, chatSource].join('\n')).not.toMatch(
      /compact(?:Browser)?StringList\(raw\.reasons\)|providerMindRequired = raw\.providerMindRequired/u,
    )
    expect(realizationSource).not.toContain('reason-code-withheld')
  })

  it('removes local reply repair and second-pass posture from production state', () => {
    const sources = [
      readServiceSource('./runtime-governance.ts'),
      readServiceSource('./self-evolution/state-revision-bus.ts'),
      readServiceSource('./self-evolution/emotional-self-revision-bridge.ts'),
      readServiceSource('./self-evolution/embodiment-self-revision-bridge.ts'),
      readServiceSource('./runtime-organic-memory-self-evolution-integration.ts'),
      readServiceSource('./runtime-execution-delivery.ts'),
      readRepoSource('packages/stage-shared/src/alicization-transport-contracts.ts'),
      readRepoSource('packages/stage-ui/src/stores/alicization-self-evolution-inspector.ts'),
      readRepoSource('apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer-self-evolution-focus-history-display.ts'),
      readRepoSource('packages/stage-ui/src/stores/chat.ts'),
    ].join('\n')

    expect(sources).not.toMatch(
      /repairDialogueFirstVisibleReply|secondPassRequiredBias|secondPassRequired|repair\/rewrite before visible certainty|second-pass repair|second-pass-required|['"]second-pass['"]/u,
    )
    expect(readServiceSource('./runtime-governance.ts')).not.toContain(
      'buildPrioritizedProjectStateRewritePreserveLines',
    )
  })

  it('keeps response context as facts instead of a fixed reply charter', () => {
    const responseContextSource = readServiceSource('./response-charter.ts')
    const mindTurnSource = readServiceSource('./mind-turn-contract.ts')
    const facadeSource = readServiceSource('./visible-reply/facade.ts')

    expect(responseContextSource).not.toMatch(
      /\bmustDo\b|\bmustNotDo\b|buildAlicizationResponseCharterSystemBlock|Alicization response charter/u,
    )
    expect(responseContextSource).not.toMatch(
      /Let the active self-revision patch|Do not rewrite the still-live line|Keep visible reply alignment/u,
    )
    expect(mindTurnSource).not.toMatch(
      /charter\.mustDo|charter\.mustNotDo|\.\.\.charter\.reasons/u,
    )
    expect(facadeSource).not.toMatch(
      /systemBlocks:\s*\{|responseCharter:\s*''/u,
    )
  })

  it('keeps replay tuning numeric and out of provider-facing reply governance', () => {
    const tuningAdviceSource = readServiceSource('./memory-tuning-advice.ts')
    const organicPromptSource = readServiceSource('./runtime-organic-memory-prompt.ts')
    const organicPromptBlocksSource = readServiceSource('./runtime-organic-memory-prompt-blocks.ts')
    const personMemoryCapsuleSource = readServiceSource('./person-memory-capsule.ts')
    const selfEvolutionIntegrationSource = readServiceSource('./runtime-organic-memory-self-evolution-integration.ts')
    const memoryDeliberationReducerSource = readServiceSource('./runtime-memory-deliberation-reducer.ts')
    const currentConsciousFrameSource = readServiceSource('./current-conscious-frame.ts')
    const memoryDeliberationKernelSource = readServiceSource('./memory-deliberation-kernel.ts')
    const initiativeArbiterSource = readServiceSource('./initiative-arbiter.ts')
    const responseGovernanceSources = [
      currentConsciousFrameSource,
      memoryDeliberationKernelSource,
      initiativeArbiterSource,
    ]
    const providerPlanningSources = [
      readServiceSource('./answer-compiler.ts'),
      readServiceSource('./answer-planner.ts'),
      readServiceSource('./response-charter.ts'),
    ]
    const governedSources = [
      tuningAdviceSource,
      organicPromptSource,
      organicPromptBlocksSource,
      ...responseGovernanceSources,
      ...providerPlanningSources,
    ].join('\n')
    const removedDimensionNames = [
      ['project', 'Emotional', 'Closure', 'Carry'].join(''),
      ['project', 'Emotional', 'Closure', 'RewriteCarry'].join(''),
      ['project', 'Emotional', 'Closure', 'LowPressureCarry'].join(''),
      ['project', 'Emotional', 'Closure', 'AntiRestartCarry'].join(''),
      ['runtime', 'SameHer', 'Memory', 'Carry'].join(''),
      ['runtime', 'SameHer', 'InitiativeExecution', 'Carry'].join(''),
      ['runtime', 'SameHer', 'Emotional', 'Carry'].join(''),
      ['runtime', 'SameHer', 'Embodiment', 'Carry'].join(''),
    ]

    expect(tuningAdviceSource).not.toMatch(
      /preservedTurnCount|rewriteAppliedTurnCount|applyMemoryTuningAdviceToSpeechPlan/u,
    )
    expect(tuningAdviceSource).not.toContain('excludesFixedReplyGovernanceDimension')
    expect(tuningAdviceSource).not.toMatch(
      /If the line still feels unstable|Keep recollection and closeness lighter|Keep the answer low-pressure and do not let memory warmth/u,
    )
    for (const dimensionName of removedDimensionNames)
      expect(governedSources).not.toContain(dimensionName)
    expect(organicPromptSource).not.toContain('applyMemoryTuningAdviceToSpeechPlan')
    expect(organicPromptSource).not.toContain('const tunedRecollectionSpeechPlan')
    expect(organicPromptSource).not.toContain('focusDimensions.includes(')
    expect(organicPromptSource).not.toContain('summarizeRuntimeSameHerTuningCausality')
    expect(organicPromptSource).not.toContain('summarizeRuntimeMemoryClosureTuning')
    expect(organicPromptBlocksSource).not.toContain('buildMemoryTuningCausalityLines')
    expect(organicPromptBlocksSource).not.toContain('Memory tuning causality')
    expect(organicPromptBlocksSource).not.toContain('focusDimensions')
    expect(organicPromptBlocksSource).not.toMatch(
      /tuningAdvice:\s*context\.memoryTuningAdvice/u,
    )
    expect(memoryDeliberationReducerSource).not.toMatch(
      /tuningAdvice:\s*input\.context\.memoryTuningAdvice/u,
    )
    expect(personMemoryCapsuleSource).not.toMatch(
      /memoryTuningAdvice\?\.focusDimensions|focusDimensions\.length/u,
    )
    expect(selfEvolutionIntegrationSource).not.toContain('buildSameHerCausalityRepairPressureFromTuningAdvice')
    expect(selfEvolutionIntegrationSource).not.toContain('findTuningNote')
    expect(selfEvolutionIntegrationSource).not.toContain('input.memoryTuningAdvice')

    for (const source of responseGovernanceSources) {
      expect(source).not.toContain('focusDimensions')
    }
    expect(currentConsciousFrameSource).not.toMatch(/\b(?:memoryTuningAdvice|tuningAdvice)\b/u)
    expect(memoryDeliberationKernelSource).not.toMatch(/\b(?:memoryTuningAdvice|tuningAdvice)\b/u)
    expect(initiativeArbiterSource).not.toMatch(
      /input\.memoryTuningAdvice|memoryTuningAdvice:\s*input\.memoryTuningAdvice/u,
    )
    for (const source of providerPlanningSources) {
      expect(source).not.toMatch(/\b(?:memoryTuningAdvice|learningTuningAdvice)\b/u)
      expect(source).not.toContain('focusDimensions')
    }
  })
})
