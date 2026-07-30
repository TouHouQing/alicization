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

  it('does not serialize continuity governance into the organic-memory recall query', () => {
    const compositionSource = readServiceSource('./runtime-turn-composition.ts')
    const sessionRuntimeSource = readServiceSource('./main-chat-session-runtime.ts')

    expect(compositionSource).not.toContain('buildSessionContinuityRecallSeed')
    expect(compositionSource).not.toMatch(
      /continuity_afterglow:|reason_code=|defer_reason=|model_summary=/u,
    )
    expect(sessionRuntimeSource).not.toContain('buildSessionContinuityRecallSeed')
  })

  it('does not assemble session, organic-memory, or performance governance prompts for main chat', () => {
    const source = readServiceSource('./main-chat-session-runtime.ts')
    const agentRuntimeSource = readServiceSource('./agent-runtime.ts')
    const runtimeSurfaceSource = readServiceSource('./main-chat-runtime-surface.ts')
    const removedBuilderName = ['buildOrganicMemory', 'SystemBlocks'].join('')
    const removedSystemBlockSlots = [
      'agentRuntimeSystemBlocks',
      'organicMemorySystemBlocks',
      'performanceManifestSystemBlocks',
    ]

    expect(source).not.toContain('buildAlicizationDialogueMemoryCarrySystemBlock')
    expect(source).not.toContain('buildSessionMirrorSystemBlock')
    expect(source).not.toContain(removedBuilderName)
    expect(source).not.toContain('buildPerformanceManifestSystemBlocks(performanceManifest)')
    expect(source).not.toContain('agentTurn.buildSessionSystemBlock()')
    expect(agentRuntimeSource).not.toContain('buildSessionSystemBlock')
    expect(agentRuntimeSource).not.toContain('alicization-agent-session')
    for (const slot of removedSystemBlockSlots) {
      expect(source).not.toContain(slot)
      expect(runtimeSurfaceSource).not.toContain(slot)
    }
  })

  it('uses the typed Provider fact allowlist instead of parsing legacy dialogue governance fields', () => {
    const sessionSource = readServiceSource('./main-chat-session-runtime.ts')
    const surfaceSource = readServiceSource('./main-chat-runtime-surface.ts')
    const ordinaryDialogueOnlyFactTypes = [
      'alicization-organic-self-context',
      'alicization-personality-state',
      'alicization-personality-thresholds',
      'alicization-execution-settlement-context',
      'alicization-execution-settlement-request',
    ]

    expect(surfaceSource).toContain('filterAlicizationProviderSystemMessages')
    for (const factType of ordinaryDialogueOnlyFactTypes)
      expect(surfaceSource).not.toContain(`'${factType}'`)
    expect(sessionSource).not.toMatch(
      /sanitizeOrdinaryDialogueProviderMessages|sanitizeOrdinaryDialogueProviderSystemBlock|sanitizeOrdinaryDialogueTypedProviderFact|ordinaryDialogueFixedGovernanceCuePattern|ordinaryDialogueFixedGovernanceFieldNamePattern/u,
    )
  })

  it('keeps one dialogue runtime instead of switching to a tool-suppressing fast path', () => {
    const sources = [
      readServiceSource('./main-chat-runtime-surface.ts'),
      readServiceSource('./main-chat-session-runtime.ts'),
    ].join('\n')

    expect(sources).not.toMatch(
      /dialogueFirstLeanRuntime|dialogueFirstLivingPromptMode|shouldUseDialogueFirstLivingPromptMode|skipExecutionPhaseTracking/u,
    )
  })

  it('does not recover missing required tools through a deterministic execution side path', () => {
    const backgroundRunSource = readServiceSource('./main-chat-background-run.ts')
    const runtimeSurfaceSource = readServiceSource('./main-chat-runtime-surface.ts')
    const removedPaths = [
      './main-chat-required-tool-recovery.ts',
      './main-chat-required-tool-recovery.test.ts',
    ]

    for (const relativePath of removedPaths) {
      const absolutePath = fileURLToPath(new URL(relativePath, serviceRoot))
      expect(existsSync(absolutePath), relativePath).toBe(false)
    }

    expect(backgroundRunSource).not.toMatch(
      /required-tool-recovered|required-tool-provider-payoff|recoverAlicizationRequiredToolDeterministically|resolveDeterministicRequiredToolNames/u,
    )
    expect(runtimeSurfaceSource).not.toContain('alicization-required-tool-facts')
  })

  it('does not send fixed evidence or continuity governance to internal Providers', () => {
    const mindStateSource = readServiceSource('./runtime-mind-state.ts')
    const dreamSource = readServiceSource('./runtime-dream.ts')
    const oneShotSource = readServiceSource('./runtime-main-gateway-one-shot.ts')
    const sessionMirrorSource = readServiceSource('./runtime-agent-session-mirror.ts')

    expect(mindStateSource).not.toContain('evidencePolicy:')
    expect(oneShotSource).not.toContain('evidencePolicy:')
    expect(dreamSource).not.toContain('continuitySystemBlocks')
    expect(sessionMirrorSource).not.toContain('buildAgentTurnContinuitySystemMessages')
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

  it('does not let project-preflight narrative rank memory candidates', () => {
    const source = readServiceSource('./memory-candidate-ranking.ts')

    expect(source).not.toContain('rankByProjectPreflightContinuityBias')
    expect(source).not.toContain('hasProjectPreflightContinuityAuthority')
    expect(source).not.toContain('project-preflight:')
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

  it('keeps screen semantic classification on typed multimodal facts and a native schema', () => {
    const runtimeSource = readServiceSource('./runtime-main-gateway-one-shot.ts')
    const contractSource = readServiceSource('./runtime-screen-semantic-provider-contract.ts')

    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-screen-semantic-context\'',
    )
    expect(runtimeSource).toContain(
      'buildAlicizationProviderFactBlock(\'alicization-screen-semantic-request\'',
    )
    expect(runtimeSource).toContain(
      'responseFormat: alicizationScreenSemanticResponseFormat',
    )
    expect(contractSource).toMatch(
      /name:\s*'alicization_screen_semantic_summary'[\s\S]*strict:\s*true/u,
    )
    expect(runtimeSource).not.toMatch(
      /buildScreenSemanticClassifierSystemPrompt|Classify this screen snapshot|Prefer what is visibly on the screen|Output valid JSON only with keys: workload|summary must be a short factual phrase|Do not mention emotions or advice/u,
    )
  })

  it('keeps long-term memory planning on typed facts and native schemas', () => {
    const planningSource = readServiceSource('./memory-os/provider-planning.ts')
    const contractSource = readServiceSource('./memory-os/provider-contract.ts')

    for (const type of [
      'alicization-memory-recollection-intent',
      'alicization-memory-recollection-plan',
      'alicization-memory-recollection-speech-plan',
      'alicization-memory-deliberation',
    ]) {
      expect(planningSource).toContain(
        `buildAlicizationProviderFactBlock('${type}-context'`,
      )
      expect(planningSource).toContain(
        `buildAlicizationProviderFactBlock('${type}-request'`,
      )
    }
    for (const schemaName of [
      'alicization_memory_recollection_intent',
      'alicization_memory_recollection_plan',
      'alicization_memory_recollection_speech_plan',
      'alicization_memory_deliberation',
    ]) {
      expect(contractSource).toMatch(
        new RegExp(`name:\\s*'${schemaName}'[\\s\\S]*strict:\\s*true`, 'u'),
      )
    }
    expect(planningSource).not.toMatch(
      /Alicization memory recollection intent planner|Alicization memory recollection planner|Alicization memory recollection speech planner|Alicization memory deliberation|Return only the requested JSON object|Use continuation seed as retrieval scope|Recollection intent candidate JSON|Memory recollection candidate JSON|Recollection speech candidate JSON|Memory deliberation candidate JSON/u,
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

  it('does not let legacy continuity cues reshape runtime emotion, embodiment, or memory authority', () => {
    const source = readServiceSource('./runtime-governance.ts')

    expect(source).not.toMatch(
      /pendingSameHerEmbodimentRepairPressure|repairProjectStateCarryOnDigitalLifeSpine|inferProjectStateCarrySourceTagsFromAuthority|readHumanlikeRecallEmbodimentCarry|detectRememberedSeamReinterpretationForGovernance/u,
    )
    expect(source).not.toMatch(
      /concerned-but-restrained|concerned measured-return continuation|gentle and not widen the line|stay concerned but measured-return|humanlike_memory_recall:|embodiment_voice=/u,
    )
    expect(source).not.toContain('buildPrioritizedProjectStateContinuityLines')
  })

  it('removes legacy continuity compatibility slots instead of recursively sanitizing them downstream', () => {
    const governanceSource = readServiceSource('./runtime-governance.ts')
    const mindStateSource = readServiceSource('./runtime-mind-state.ts')
    const selfEvolutionSource = readServiceSource('./runtime-organic-memory-self-evolution-integration.ts')
    const initiativeSource = readServiceSource('./initiative-engine.ts')
    const sharedSources = [
      readRepoSource('packages/stage-shared/src/alicization-transport-contracts.ts'),
      readRepoSource('packages/stage-shared/src/alicization-derived-mind-state-bundle.ts'),
      readRepoSource('packages/stage-shared/src/alicization-memory-decision-trace.ts'),
      readRepoSource('packages/stage-shared/src/alicization-derived-mind-state-reader.ts'),
      readRepoSource('apps/stage-tamagotchi/src/shared/eventa.ts'),
    ].join('\n')

    expect(governanceSource).not.toMatch(
      /stripLegacyEmbodimentGovernanceValue|legacyEmbodimentGovernanceKeys|legacyEmbodimentGovernanceValuePattern/u,
    )
    expect(mindStateSource).not.toMatch(
      /projectOrganicMemoryContext|activeContinuityGovernance:\s*_activeContinuityGovernance|projectStatePreDialogueAwarenessLine:\s*_projectStatePreDialogueAwarenessLine|projectStatePreflightSummary:\s*_projectStatePreflightSummary/u,
    )
    expect(mindStateSource).not.toContain('activeContinuityGovernance: null')
    expect(selfEvolutionSource).not.toMatch(
      /activeContinuityGovernance|legacyProjectGovernancePatch/u,
    )
    expect(initiativeSource).not.toMatch(
      /activeContinuityGovernance|sameHerCausalityRepairPressure|deriveActiveContinuityGovernanceInitiativeBias/u,
    )
    expect(sharedSources).not.toMatch(
      /activeContinuityGovernance|sameHerCausalityRepairPressure|AlicizationSameHerCausalityRepair/u,
    )
  })

  it('keeps replay and inspector UI diagnostics free of legacy continuity narratives', () => {
    const replaySource = readRepoSource('packages/stage-ui/src/stores/alicization-mind-replay.ts')
    const inspectorSource = readRepoSource('packages/stage-ui/src/stores/alicization-self-evolution-inspector.ts')

    expect(inspectorSource).not.toMatch(
      /describeVisibleReplyRealizationReason|describesRememberedFamiliarityRestraint|describeSameHerEmbodimentLaneImpact|hasGroundedSameHerEmbodimentCarry|describeInspectorContinuityMetricDetail/u,
    )
    expect(inspectorSource).not.toMatch(
      /remembered familiarity must stay|remembered familiarity was restrained|identity-continuity room|project-state-continuity-governance:/u,
    )
    expect(replaySource).not.toMatch(
      /Phase 1 route|remembered continuity line|pre-dialogue project-awareness chain/u,
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

  it('keeps legacy project slogans out of runtime surface selection authority', () => {
    const source = readServiceSource('./main-chat-session-runtime.ts')

    expect(source).not.toContain('if (/phase 1: local digital life/u.test(lowerCased))')
    expect(source).not.toContain('if (/phase 1/u.test(lowerCased) && /local digital life/u.test(lowerCased))')
    expect(source).not.toContain('project_state_review/u.test(normalized)')
    expect(source).not.toContain('/what has already landed is|the still-open closure is|this reply should keep moving toward/u')
    expect(source).not.toContain('.includes(\'Phase 1: Local Digital Life\')')
  })

  it('keeps legacy project wording out of replay gates and self-evolution validation', () => {
    const source = readServiceSource('./replay-benchmark-runtime.ts')

    expect(source).not.toContain('buildReplayProjectStateSummary')
    expect(source).not.toContain('\'project-state-continuity-gate\'')
    expect(source).not.toContain('projectStateContinuityDrift')
  })

  it('keeps legacy project wording out of execution interaction learning', () => {
    const source = readServiceSource('./execution-interaction-learning.ts')

    expect(source).not.toContain('readProjectPreflightSignal')
    expect(source).not.toContain('readProjectClosureMemorySignal')
    expect(source).not.toContain('sameHerCarry')
    expect(source).not.toContain('memory-same-her-closure')
    expect(source).not.toContain('project-same-her-drift-risk-pressure')
  })

  it('removes continuity-seed recall fast paths and fixed self-critique recall suppression', () => {
    const preludeSource = readServiceSource('./runtime-organic-memory-search-prelude.ts')
    const retrievalSource = readServiceSource('./memory-search-retrieval-operators.ts')

    expect(preludeSource).not.toMatch(
      /parseRuntimeContinuityCarry|parseHeldAutonomyCarry|parseProjectStateCarry|parseCadenceReconfirmationCarry|parseAfterglowCarry|parseHumanlikeMemoryRecallCarry/u,
    )
    expect(preludeSource).not.toMatch(
      /deriveRuntimeContinuityTriggeredIntent|deriveHeldAutonomyTriggeredIntent|deriveProjectStateTriggeredIntent|deriveCadenceReconfirmationTriggeredIntent|deriveAfterglowTriggeredIntent|deriveHumanlikeMemoryRecallTriggeredIntent/u,
    )
    expect(retrievalSource).not.toContain('isPresentFacingSelfCritiqueRecallSeed')
  })

  it('keeps autonomy and actuation independent from project-state prose templates', () => {
    const autonomySource = readServiceSource('./autonomy-kernel.ts')
    const actuationSource = readServiceSource('./autonomy-actuation.ts')

    expect(autonomySource).not.toMatch(
      /deriveProjectStateAutonomyBias|deriveHabitNarrativeAutonomyBias|carriesProjectStateInwardLine/u,
    )
    expect(actuationSource).not.toMatch(
      /carriesSameHerProjectClosureLine|deriveAutonomyProjectClosureCarry|sameHerCarry|projectClosureCarry/u,
    )
  })

  it('keeps memory candidate ranking independent from legacy recall prose authority', () => {
    const source = readServiceSource('./memory-candidate-ranking.ts')

    expect(source).not.toMatch(
      /deriveHumanlikeRecallAuthority|rankByHumanlikeRecallAuthority|parseHumanlikeRecallTargetList/u,
    )
    expect(source).not.toMatch(
      /deriveEmbodimentCadenceRecallAuthority|rankByEmbodimentCadenceRecallAuthority/u,
    )
  })

  it('keeps runtime memory persistence free from the legacy local humanlike candidate interpreter', () => {
    const source = readServiceSource('./runtime-memory-closure.ts')

    expect(source).not.toMatch(
      /buildHumanlikeMemoryCandidate|buildHumanlikePersistence|buildHumanlikeMetabolism|applyHumanlikeMemoryCandidate/u,
    )
    expect(source).not.toMatch(
      /humanlikeMemoryCandidate|samePersonTest|containsSamePersonTest/u,
    )
  })

  it('keeps recall suppression structural instead of authoring fixed explanatory prose', () => {
    const source = readServiceSource('./recall-planner.ts')

    expect(source).not.toMatch(
      /deriveWhyNotOthers|staleSelfCue|relationshipConfusionCue/u,
    )
    expect(source).not.toMatch(
      /The older self-story is still being revised|Competing relationship eras are still too easy to confuse/u,
    )
  })

  it('does not rebuild project or callback governance templates inside organic memory', () => {
    const organicPromptSource = readServiceSource('./runtime-organic-memory-prompt.ts')

    expect(organicPromptSource).not.toMatch(
      /resolveOrganicMemoryProjectStateContext|sanitizeOrganicProjectStateText/u,
    )
    expect(organicPromptSource).not.toMatch(
      /Project continuity context is present|Continuity remains pending|Carry the execution callback as relationship continuity/u,
    )
    expect(organicPromptSource).not.toMatch(
      /['"`]execution_callback_return=|['"`]execution_feedback_return=|['"`]memory_os_execution_feedback=|['"`]same-body cadence|['"`]measured-return with softened gaze/u,
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

  it('keeps only transparent infrastructure failures and removes legacy memory governance filters', () => {
    const fallbackSource = readRepoSource('packages/stage-shared/src/alicization-mind-fallback-messages.ts')
    const failureSurfaceSource = readRepoSource('packages/stage-shared/src/alicization-chat-failure-surface.ts')
    const memoryAccessSource = readServiceSource('./runtime-organic-memory-access.ts')

    expect(fallbackSource).not.toMatch(/epoch1-strict|low-liveliness/u)
    expect(failureSurfaceSource).not.toContain('epoch1-strict')
    expect(memoryAccessSource).not.toMatch(
      /legacyProjectGovernance|opening_policy|relationship_cadence|redacted_internal|same-her-baseline/u,
    )
  })
})
