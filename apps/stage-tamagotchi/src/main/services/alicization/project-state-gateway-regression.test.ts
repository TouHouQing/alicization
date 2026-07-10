import type { AlicizationMainGatewaySource } from './project-state-gateway-audit'

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationProjectStateSystemBlock,
  resolveAlicizationProjectStateCoverage,
  resolveAlicizationProjectStateDirectGatewayAuditTargets,
} from './project-state-brief'
import {

  callsiteCarriesProjectStateContext,
  deriveAlicizationProjectStateGatewayAuditFromSources,
  resolveAlicizationProjectStateAuditFamilyForMainGatewaySource,
} from './project-state-gateway-audit'
import {
  collectAlicizationDirectProviderImportFiles,
  resolveAlicizationDirectProviderImportAuditFiles,
  resolveAlicizationDirectProviderImportAuditMode,
} from './project-state-gateway-entrypoint-audit'

const directGatewaySourceChecks = {
  'runtime.ts:dream-reminder-proactive-reforge': {
    relativePath: './runtime.ts',
    requiredPatterns: [
      'buildAlicizationProjectStateExtraSystemBlocks',
      'const projectStateSystemBlock = buildAlicizationProjectStateSystemBlock()',
      'extraSystemBlocks: buildAlicizationProjectStateExtraSystemBlocks()',
      'function buildDreamProjectSelfBriefSystemBlock()',
      'function buildProactiveProjectSelfBriefSystemBlock()',
      'function buildReminderProjectSelfBriefSystemBlock()',
      'function buildCoreIncarnationReforgeProjectSelfBriefSystemBlock()',
      '[ALICIZATION_CORE_INCARNATION_REFORGE_SELF_BRIEF]',
      'reforge_scope=core_incarnation',
      'Do not let core incarnation reforge collapse into a detached persona rewrite, generic companion archetype, or abstract assistant shell.',
      'continuity_hold=',
      'buildDreamProjectSelfBriefSystemBlock(),',
      'buildProactiveProjectSelfBriefSystemBlock(),',
      'buildReminderProjectSelfBriefSystemBlock(),',
      'projectStateSystemBlock,',
      'buildCoreIncarnationReforgeProjectSelfBriefSystemBlock(),',
    ],
  },
  'memory-os/provider-planning.ts:recollection-and-deliberation': {
    relativePath: './memory-os/provider-planning.ts',
    requiredPatterns: [
      'function withProjectStateSystem',
      'function buildMemoryPlanningProjectSelfBriefSystemBlock()',
      '[ALICIZATION_MEMORY_PLANNING_OWNER_BOUNDARY]',
      'short_term_owner=WorkingMemory',
      'long_term_recall_owner=LongTermMemoryRecall',
      'workbench_role=governance_surface_only',
      'project_state_policy=withheld_for_memory_planning_unless_explicitly_requested',
      'buildMemoryPlanningProjectSelfBriefSystemBlock(),',
      'system: withProjectStateSystem([',
    ],
  },
  'runtime-mind-state.ts:dialogue-semantics-and-subjective-inference': {
    relativePath: './runtime-mind-state.ts',
    requiredPatterns: [
      'const mindProjectStatePromptSnapshot = buildMindProjectStatePromptSnapshot({',
      'projectState: mindProjectStatePromptSnapshot,',
      'extraSystemBlocks: [',
      'buildDialogueTurnSemanticsProjectSelfBriefSystemBlock(),',
      'buildSubjectiveInferenceProjectSelfBriefSystemBlock(),',
      '[ALICIZATION_DIALOGUE_TURN_SEMANTICS_OWNER_BOUNDARY]',
      '[ALICIZATION_SUBJECTIVE_INFERENCE_OWNER_BOUNDARY]',
      'short_term_owner=WorkingMemory',
      'long_term_recall_owner=LongTermMemoryRecall',
      'project_state_policy=withheld_for_turn_semantics_unless_explicitly_requested',
      'project_state_policy=withheld_for_subjective_inference_unless_explicitly_requested',
    ],
  },
  'runtime-execution-delivery.ts:execution-callback': {
    relativePath: './runtime-execution-delivery.ts',
    requiredPatterns: [
      'buildAlicizationProjectStateExtraSystemBlocks',
      'buildExecutionCallbackProjectSelfBriefSystemBlock(',
      'pre_dialogue_awareness=',
      'continuity_anchor=',
      'primary_open_loop=',
      'next_closure_target=',
    ],
  },
  'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal': {
    relativePath: './runtime-main-gateway-one-shot.ts',
    requiredPatterns: [
      'buildAlicizationProviderFacingProjectStateExtraSystemBlocks',
      'buildAlicizationProviderFacingProjectStateSystemBlock',
      'buildAlicizationProviderFacingProjectStateClosureDashboard',
      'function buildScreenSemanticProjectSelfBriefSystemBlock(',
      'function buildSceneAppraisalProjectSelfBriefSystemBlock(',
      'function buildOneShotSourceProjectSelfBriefs(input: {',
      '[ALICIZATION_SCREEN_SEMANTIC_SELF_BRIEF]',
      '[ALICIZATION_SCENE_APPRAISAL_SELF_BRIEF]',
      'project_identity=',
      'current_phase=',
      '[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]',
      'pre_dialogue_awareness=',
      'continuity_anchor=',
      'continuity_hold=',
      'primary_open_loop=',
      'next_closure_target=',
      'landed=',
      'open=',
      'continuity_anchor=',
      'alicizationProjectStateAnswerMustDo',
      'alicizationProjectStateAnswerContractLines',
      'const projectStateClosureDashboard = buildAlicizationProviderFacingProjectStateClosureDashboard({',
      '{ role: \'system\', content: projectStateSystemBlock } as Message,',
      '{ role: \'system\', content: projectStateClosureDashboard } as Message,',
      '...buildOneShotSourceProjectSelfBriefs({',
      'extraSystemBlocks: buildAlicizationProviderFacingProjectStateExtraSystemBlocks()',
    ],
  },
} as const

function deriveGatewayFamiliesFromCurrentSource() {
  const audit = deriveAlicizationProjectStateGatewayAuditFromSources({
    runtimeSource: readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8'),
    providerPlanningSource: readFileSync(new URL('./memory-os/provider-planning.ts', import.meta.url), 'utf8'),
    mindStateSource: readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8'),
    executionDeliverySource: readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8'),
    oneShotSource: readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8'),
  })

  return {
    families: audit.families,
    evidence: audit.evidence as Parameters<typeof callsiteCarriesProjectStateContext>[0][],
  }
}

function deriveDeclaredMainGatewaySourcesFromAuditSource() {
  const source = readFileSync(new URL('./project-state-gateway-contract.ts', import.meta.url), 'utf8')
  const unionBlockMatch = source.match(/export type AlicizationMainGatewaySource\s*=\s*([\s\S]*?)\n\nexport function resolveAlicizationProjectStateAuditFamilyForMainGatewaySource/)
  expect(unionBlockMatch?.[1]).toBeTruthy()

  return [...unionBlockMatch![1].matchAll(/'([^']+)'/g)]
    .map(match => match[1] as AlicizationMainGatewaySource)
    .sort()
}

describe('project-state gateway regression', () => {
  it('reuses a shared direct-provider-import scanner instead of maintaining a local provider import scan copy', () => {
    const source = readFileSync(new URL('./project-state-gateway-regression.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./project-state-gateway-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationDirectProviderImportFiles(')
    expect(/^function collectDirectProviderImportFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every audited direct gateway family wired to project-state or owner-boundary prompt context in source', () => {
    const targets = resolveAlicizationProjectStateDirectGatewayAuditTargets()

    expect(new Set(targets)).toEqual(new Set(Object.keys(directGatewaySourceChecks)))

    for (const target of targets) {
      const source = readFileSync(new URL(directGatewaySourceChecks[target].relativePath, import.meta.url), 'utf8')
      for (const pattern of directGatewaySourceChecks[target].requiredPatterns)
        expect(source).toContain(pattern)
    }
  })

  it('keeps the audited direct gateway family list aligned with the current source-derived gateway families', () => {
    const targets = [...resolveAlicizationProjectStateDirectGatewayAuditTargets()].sort()
    const { families: derivedFamilies } = deriveGatewayFamiliesFromCurrentSource()

    expect(derivedFamilies).toEqual(targets)
  })

  it('keeps declared main-gateway sources, audited family resolution, and direct-gateway registry synchronized', () => {
    const declaredSources = deriveDeclaredMainGatewaySourcesFromAuditSource()
    const resolvedAuditedFamilies = [...new Set(declaredSources
      .map(source => resolveAlicizationProjectStateAuditFamilyForMainGatewaySource(source))
      .filter((family): family is NonNullable<ReturnType<typeof resolveAlicizationProjectStateAuditFamilyForMainGatewaySource>> => Boolean(family)),
    )].sort()
    const targets = [...resolveAlicizationProjectStateDirectGatewayAuditTargets()].sort()

    expect(new Set(declaredSources)).toEqual(new Set([
      'execution-callback',
      'reminder',
      'proactive',
      'dream',
      'screen-semantic',
      'scene-appraisal',
      'subjective-inference',
      'counterfactual-deliberation',
      'dialogue-turn-semantics',
    ] satisfies AlicizationMainGatewaySource[]))
    expect(resolvedAuditedFamilies).toEqual(targets)
  })

  it('requires canonical project-state coverage truth to keep naming the audited gateway families as verified entrypoints', () => {
    const coverageProof = resolveAlicizationProjectStateCoverage()
      .map(item => item.proof)
      .join('\n')

    expect(coverageProof).toContain('runtime-main-gateway-one-shot.ts')
    expect(coverageProof).toContain('runtime-execution-delivery.ts')
    expect(coverageProof).toContain('memory-os/provider-planning.ts')
    expect(coverageProof).toContain('runtime-mind-state.ts')
    expect(coverageProof).toContain('runtime.ts')
  })

  it('requires every discovered audited gateway callsite source to stay declared, while API-level one-shot-only sources remain explicitly registered', () => {
    const declaredSources = deriveDeclaredMainGatewaySourcesFromAuditSource()
    const { evidence } = deriveGatewayFamiliesFromCurrentSource()
    const discoveredSources = [...new Set(evidence.map(item => item.source))].sort()
    const oneShotTestSource = readFileSync(new URL('./runtime-main-gateway-one-shot.test.ts', import.meta.url), 'utf8')

    expect(declaredSources).toContain('scene-appraisal')
    expect(oneShotTestSource).toContain('source: \'scene-appraisal\'')
    expect(discoveredSources.every(source => declaredSources.includes(source as AlicizationMainGatewaySource))).toBe(true)
  })

  it('requires the unified one-shot main gateway runtime to reject source-less generations before project-state coverage can be bypassed', () => {
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')

    expect(oneShotSource).toContain('source: AlicizationMainGatewaySource')
    expect(oneShotSource).not.toContain('source?: AlicizationMainGatewaySource')
    expect(oneShotSource).toContain('main-gateway.one-shot-missing-project-state-source')
    expect(oneShotSource).toContain('action: \'missing-main-gateway-source\'')
    expect(oneShotSource).toContain('if (!generateOptions.source) {')
  })

  it('requires the unified one-shot main gateway runtime to reject assembled generations that lose canonical project-state context before provider execution', () => {
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')
    const oneShotTestSource = readFileSync(new URL('./runtime-main-gateway-one-shot.test.ts', import.meta.url), 'utf8')

    expect(oneShotSource).toContain('carriesAlicizationCanonicalProjectState')
    expect(oneShotSource).toContain('main-gateway.one-shot-missing-project-state-context')
    expect(oneShotSource).toContain('action: \'missing-main-gateway-project-state-context\'')
    expect(oneShotSource).toContain('if (!carriesAlicizationCanonicalProjectState(generationMessages)) {')
    expect(oneShotSource).toContain('messages: generationMessages')

    expect(oneShotTestSource).toContain('fails closed before provider generation if canonical project-state context is missing from assembled one-shot messages')
    expect(oneShotTestSource).toContain('action: \'missing-main-gateway-project-state-context\'')
  })

  it('requires higher-level gateway provider contracts to demand explicit source tags before one-shot runtime is reached', () => {
    const executionDeliverySource = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')
    const runtimeMindStateSource = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const providerPlanningSource = readFileSync(new URL('./memory-os/provider-planning.ts', import.meta.url), 'utf8')

    expect(executionDeliverySource).not.toContain('generateMainGatewayText: (input: any) => Promise<string | null>')
    expect(executionDeliverySource).toContain('AlicizationMainGatewayGenerateTextProvider<')
    expect(executionDeliverySource).toContain('source: \'execution-callback\'')

    expect(runtimeMindStateSource).toContain('AlicizationMainGatewayGenerateTextProvider<')
    expect(runtimeMindStateSource).not.toContain('source?: \'subjective-inference\' | \'dialogue-turn-semantics\'')
    expect(runtimeMindStateSource).not.toContain('source?: Extract<AlicizationMainGatewaySource, \'subjective-inference\' | \'dialogue-turn-semantics\'>')

    expect(providerPlanningSource).toContain('AlicizationMainGatewayGenerateTextProvider<')
    expect(providerPlanningSource).toContain('source: \'counterfactual-deliberation\'')
    expect(providerPlanningSource).not.toContain('source?: \'counterfactual-deliberation\'')
    expect(providerPlanningSource).not.toContain('source?: Extract<AlicizationMainGatewaySource, \'counterfactual-deliberation\'>')
  })

  it('requires higher-level gateway provider contracts to share the canonical source-tagged gateway input shape', () => {
    const auditSource = readFileSync(new URL('./project-state-gateway-audit.ts', import.meta.url), 'utf8')
    const contractSource = readFileSync(new URL('./project-state-gateway-contract.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const executionDeliverySource = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')
    const runtimeMindStateSource = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const providerPlanningSource = readFileSync(new URL('./memory-os/provider-planning.ts', import.meta.url), 'utf8')
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')

    expect(auditSource).toContain('export type {')
    expect(contractSource).toContain('export interface AlicizationMainGatewayBaseGenerateTextInput<')
    expect(contractSource).toContain('export interface AlicizationMainGatewayGenerateTextProviderOptions<')
    expect(contractSource).toContain('export interface AlicizationMainGatewayGenerateTextProvider<')
    expect(executionDeliverySource).toContain('AlicizationMainGatewayGenerateTextProvider<')
    expect(runtimeMindStateSource).toContain('AlicizationMainGatewayGenerateTextProvider<')
    expect(providerPlanningSource).toContain('AlicizationMainGatewayGenerateTextProvider<')
    expect(oneShotSource).toContain('AlicizationMainGatewayGenerateTextProviderOptions<')
    expect(oneShotSource).toContain('export interface AlicizationMainGatewayTextProviderOptions')
    expect(oneShotSource).toContain('export interface AlicizationMainGatewayTextProvider')
    expect(runtimeSource).toContain('const mainGatewayTextProvider: AlicizationMainGatewayTextProvider =')
    expect(runtimeSource).toContain('generateMainGatewayText: mainGatewayTextProvider')
    expect(runtimeSource).toContain('mainGatewayTextProvider({')
    expect(runtimeSource).toContain('generateMainGatewayText,')
    expect(runtimeSource).toContain('createAlicizationMindStateRuntime({')
    expect(runtimeSource).toContain('createAlicizationRuntimeExecutionDelivery({')
    expect(runtimeSource).toContain('generateMemoryRecollectionIntentWithMemoryOsGateway({')
    expect(runtimeSource).toContain('generateMemoryRecollectionPlanWithMemoryOsGateway({')
    expect(runtimeSource).toContain('generateMemoryRecollectionSpeechPlanWithMemoryOsGateway({')
    expect(runtimeSource).toContain('generateMemoryDeliberationWithMemoryOsGateway({')
  })

  it('keeps runtime gateway modules on a runtime-safe contract module instead of pulling the TypeScript-backed audit parser into Electron startup', () => {
    const auditSource = readFileSync(new URL('./project-state-gateway-audit.ts', import.meta.url), 'utf8')
    const runtimeMindStateSource = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const executionDeliverySource = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')
    const providerPlanningSource = readFileSync(new URL('./memory-os/provider-planning.ts', import.meta.url), 'utf8')
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')

    expect(auditSource).toContain('import ts from \'typescript\'')
    expect(runtimeMindStateSource).toContain('from \'./project-state-gateway-contract\'')
    expect(runtimeMindStateSource).not.toContain('from \'./project-state-gateway-audit\'')
    expect(executionDeliverySource).toContain('from \'./project-state-gateway-contract\'')
    expect(executionDeliverySource).not.toContain('from \'./project-state-gateway-audit\'')
    expect(providerPlanningSource).toContain('from \'../project-state-gateway-contract\'')
    expect(providerPlanningSource).not.toContain('from \'../project-state-gateway-audit\'')
    expect(oneShotSource).toContain('from \'./project-state-gateway-contract\'')
    expect(oneShotSource).not.toContain('from \'./project-state-gateway-audit\'')
  })

  it('requires memory gateway wrapper to attach the live digital-life runtime surface before provider planning', () => {
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const providerPlanningSource = readFileSync(new URL('./memory-os/provider-planning.ts', import.meta.url), 'utf8')

    expect(providerPlanningSource).toContain('digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null')
    expect(providerPlanningSource).toContain('digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface')
    expect(runtimeSource).toContain('async function resolveMemoryGatewayDigitalLifeRuntimeSurface')
    expect(runtimeSource).toContain('const explicitRuntimeSurface = input.digitalLifeRuntimeSurface ?? null')
    expect(runtimeSource).toContain('const liveRuntimeSurface = explicitRuntimeSurface ?? await resolveMemoryGatewayDigitalLifeRuntimeSurface(input.cardId ?? activeCardId)')
    expect(runtimeSource).toContain('digitalLifeRuntimeSurface: liveRuntimeSurface,')
  })

  it('keeps direct provider imports constrained to the audited wrapper entrypoints', () => {
    const directProviderImportFiles = collectAlicizationDirectProviderImportFiles(new URL('.', import.meta.url).pathname)

    expect(directProviderImportFiles).toEqual(resolveAlicizationDirectProviderImportAuditFiles().slice().sort())
    expect(resolveAlicizationDirectProviderImportAuditFiles().slice().sort()).toEqual([
      'main-chat-one-shot.ts',
      'main-chat-stream-runner.ts',
      'runtime-main-gateway-one-shot.ts',
    ])
  })

  it('requires every direct provider import entry to fail closed on canonical same-her project-state context before provider execution', () => {
    for (const relativePath of resolveAlicizationDirectProviderImportAuditFiles()) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(source).toMatch(/from '@xsai\/(generate-text|stream-text)'/)

      if (relativePath === 'main-chat-one-shot.ts') {
        expect(resolveAlicizationDirectProviderImportAuditMode(relativePath)).toBe('one-shot-provider-entry')
        expect(source).toContain('assertAlicizationCanonicalProjectState(providerMessages, \'one-shot\')')
      }

      if (relativePath === 'main-chat-stream-runner.ts') {
        expect(resolveAlicizationDirectProviderImportAuditMode(relativePath)).toBe('stream-provider-entry')
        expect(source).toContain('assertAlicizationCanonicalProjectState(input.prepared.messages, \'stream\')')
      }

      if (relativePath === 'runtime-main-gateway-one-shot.ts') {
        expect(resolveAlicizationDirectProviderImportAuditMode(relativePath)).toBe('main-gateway-provider-wrapper')
        expect(source).toContain('carriesAlicizationCanonicalProjectState(generationMessages)')
        expect(source).toContain('main-gateway.one-shot-missing-project-state-context')
      }
    }
  })

  it('requires every discovered audited gateway callsite to carry project-state prompt context or an owner boundary before generation', () => {
    const { evidence } = deriveGatewayFamiliesFromCurrentSource()

    expect(evidence.length).toBeGreaterThanOrEqual(9)
    for (const entry of evidence)
      expect(callsiteCarriesProjectStateContext(entry)).toBe(true)
  })

  it('keeps runtime mind-state dialogue cognition anchored to memory owner boundaries instead of the canonical project-state dashboard', () => {
    const runtimeMindStateSource = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const canonicalProjectStateBlock = buildAlicizationProjectStateSystemBlock()

    expect(runtimeMindStateSource).toContain('const mindProjectStatePromptSnapshot = buildMindProjectStatePromptSnapshot({')
    expect(runtimeMindStateSource).toContain('projectState: mindProjectStatePromptSnapshot,')
    expect(runtimeMindStateSource).not.toContain('extraSystemBlocks: buildAlicizationProjectStateExtraSystemBlocks().concat(')
    expect(runtimeMindStateSource).toContain('extraSystemBlocks: [\n        buildDialogueTurnSemanticsProjectSelfBriefSystemBlock(),\n      ]')
    expect(runtimeMindStateSource).toContain('extraSystemBlocks: [\n        buildSubjectiveInferenceProjectSelfBriefSystemBlock(),\n      ]')
    expect(runtimeMindStateSource).toContain('source: \'dialogue-turn-semantics\'')
    expect(runtimeMindStateSource).toContain('source: \'subjective-inference\'')
    expect(runtimeMindStateSource).toContain('[ALICIZATION_DIALOGUE_TURN_SEMANTICS_OWNER_BOUNDARY]')
    expect(runtimeMindStateSource).toContain('[ALICIZATION_SUBJECTIVE_INFERENCE_OWNER_BOUNDARY]')
    expect(runtimeMindStateSource).toContain('short_term_owner=WorkingMemory')
    expect(runtimeMindStateSource).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(runtimeMindStateSource).toContain('project_state_policy=withheld_for_turn_semantics_unless_explicitly_requested')
    expect(runtimeMindStateSource).toContain('project_state_policy=withheld_for_subjective_inference_unless_explicitly_requested')
    expect(canonicalProjectStateBlock).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(canonicalProjectStateBlock).toContain('Alicization is a local-first digital life project building one continuous "her"')
    expect(canonicalProjectStateBlock).toContain('current_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(canonicalProjectStateBlock).toContain('project_preflight=Alicization is a local-first digital life project')
    expect(canonicalProjectStateBlock).toContain('open=Memory still needs stronger end-to-end closure')
    expect(canonicalProjectStateBlock).toContain('open_life_loops:')
    expect(canonicalProjectStateBlock).toContain('next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
  })
})
