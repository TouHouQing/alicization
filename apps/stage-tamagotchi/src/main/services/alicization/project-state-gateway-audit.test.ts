import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateDirectGatewayAuditTargets } from './project-state-brief'
import {
  callsiteCarriesProjectStateContext,
  deriveAlicizationProjectStateGatewayAuditFromSources,
  isAlicizationProjectStateAuditedMainGatewaySource,
  isAlicizationProjectStateUnauditedMainGatewaySource,
  resolveAlicizationProjectStateAuditFamilyForMainGatewaySource,
  resolveAlicizationProjectStateGatewayInjectionMode,
} from './project-state-gateway-audit'

describe('project-state-gateway-audit', () => {
  it('derives the audited gateway family set from real source-shaped callsites', () => {
    const derived = deriveAlicizationProjectStateGatewayAuditFromSources({
      runtimeSource: `
        async function x() {
          await generateMainGatewayText({ source: 'dream', extraSystemBlocks: [projectStateSystemBlock] })
          await generateMainGatewayText({ source: 'reminder', extraSystemBlocks: [projectStateSystemBlock] })
          await generateMainGatewayText({ source: 'proactive', extraSystemBlocks: [projectStateSystemBlock] })
        }
      `,
      providerPlanningSource: `
        async function x(input) {
          await input.generateMainGatewayText({ source: 'counterfactual-deliberation', system: withProjectStateSystem(['a'].join('\\n')) })
        }
      `,
      mindStateSource: `
        async function x() {
          await generateMainGatewayText({ source: 'dialogue-turn-semantics', extraSystemBlocks: [projectStateSystemBlock] })
          await generateMainGatewayText({ source: 'subjective-inference', extraSystemBlocks: [projectStateSystemBlock] })
        }
      `,
      executionDeliverySource: `
        async function x(options) {
          await options.generateMainGatewayText({ source: 'execution-callback', extraSystemBlocks: [buildAlicizationProjectStateSystemBlock()] })
        }
      `,
      oneShotSource: `
        async function x() {
          await generateMainGatewayText({ source: 'screen-semantic', extraSystemBlocks: [buildAlicizationProjectStateSystemBlock()] })
          await generateMainGatewayText({ source: 'scene-appraisal', extraSystemBlocks: [buildAlicizationProjectStateSystemBlock()] })
        }
      `,
    })

    expect(derived.families).toEqual([...resolveAlicizationProjectStateDirectGatewayAuditTargets()].sort())
    expect(derived.evidence.length).toBe(9)
  })

  it('recognizes the supported project-state injection styles for audited callsites', () => {
    const localExtraBlockEvidence = {
      family: 'runtime.ts:dream-reminder-proactive-reforge',
      source: 'dream',
      extraSystemBlocks: ['projectStateSystemBlock'],
      extraSystemBlocksExpression: '[projectStateSystemBlock]',
      system: null,
      callText: 'generateMainGatewayText({ source: "dream" })',
    } as const
    expect(callsiteCarriesProjectStateContext(localExtraBlockEvidence)).toBe(true)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(localExtraBlockEvidence)).toBe('extra-system-block-local')

    const systemWrapperEvidence = {
      family: 'memory-os/provider-planning.ts:recollection-and-deliberation',
      source: 'counterfactual-deliberation',
      extraSystemBlocks: [],
      extraSystemBlocksExpression: null,
      system: 'withProjectStateSystem([...])',
      callText: 'input.generateMainGatewayText({ source: "counterfactual-deliberation" })',
    } as const
    expect(callsiteCarriesProjectStateContext(systemWrapperEvidence)).toBe(true)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(systemWrapperEvidence)).toBe('system-wrapper')

    const systemWrapperSelfBriefEvidence = {
      family: 'memory-os/provider-planning.ts:recollection-and-deliberation',
      source: 'counterfactual-deliberation',
      extraSystemBlocks: [],
      extraSystemBlocksExpression: null,
      system: 'withProjectStateSystem(`[ALICIZATION_MEMORY_PLANNING_SELF_BRIEF]\\npre_dialogue_awareness=aware\\nsame_her_line=line\\nprimary_open_loop=open\\nnext_closure_target=next`)',
      callText: 'input.generateMainGatewayText({ source: "counterfactual-deliberation" })',
    } as const
    expect(callsiteCarriesProjectStateContext(systemWrapperSelfBriefEvidence)).toBe(true)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(systemWrapperSelfBriefEvidence)).toBe('system-wrapper-self-brief')

    const concatEvidence = {
      family: 'runtime.ts:dream-reminder-proactive-reforge',
      source: 'dream',
      extraSystemBlocks: [],
      extraSystemBlocksExpression: 'buildOrganicMemorySystemBlocks(...).concat(projectStateSystemBlock)',
      system: null,
      callText: 'generateMainGatewayText({ source: "dream" })',
    } as const
    expect(callsiteCarriesProjectStateContext(concatEvidence)).toBe(true)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(concatEvidence)).toBe('extra-system-block-local')

    const helperEvidence = {
      family: 'runtime-execution-delivery.ts:execution-callback',
      source: 'execution-callback',
      extraSystemBlocks: [],
      extraSystemBlocksExpression: 'buildAlicizationProjectStateExtraSystemBlocks()',
      system: null,
      callText: 'options.generateMainGatewayText({ source: "execution-callback" })',
    } as const
    expect(callsiteCarriesProjectStateContext(helperEvidence)).toBe(true)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(helperEvidence)).toBe('extra-system-block-helper')

    const helperSelfBriefEvidence = {
      family: 'runtime-execution-delivery.ts:execution-callback',
      source: 'execution-callback',
      extraSystemBlocks: [],
      extraSystemBlocksExpression: '[...buildAlicizationProjectStateExtraSystemBlocks(), `pre_dialogue_awareness=aware\\nsame_her_line=line\\nprimary_open_loop=open\\nnext_closure_target=next`, buildExecutionCallbackProjectSelfBriefSystemBlock()]',
      system: null,
      callText: 'options.generateMainGatewayText({ source: "execution-callback" })',
    } as const
    expect(callsiteCarriesProjectStateContext(helperSelfBriefEvidence)).toBe(true)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(helperSelfBriefEvidence)).toBe('extra-system-block-self-brief')

    const oneShotEvidence = {
      family: 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
      source: 'screen-semantic',
      extraSystemBlocks: [],
      extraSystemBlocksExpression: null,
      system: 'buildScreenSemanticClassifierSystemPrompt()',
      callText: 'generateMainGatewayText({ source: "screen-semantic" })',
      sourceText: `
        const projectStateSystemBlock = buildAlicizationProjectStateSystemBlock()
        const projectStateClosureDashboard = buildAlicizationProjectStateClosureDashboard({
          architecture: oneShotDigitalLifeArchitecture,
        })
        const systemMessages = [
          { role: 'system', content: projectStateSystemBlock } as Message,
          { role: 'system', content: projectStateClosureDashboard } as Message,
          ...buildOneShotSourceProjectSelfBriefs({
            source: generateOptions.source,
          }).map(content => ({ role: 'system', content }) as Message),
        ]
        const projectSelfBrief = buildOneShotSourceProjectSelfBriefs({
          source: generateOptions.source,
        })[0]
        projectSelfBrief.includes('project_identity=')
        projectSelfBrief.includes('current_phase=')
        projectSelfBrief.includes('pre_dialogue_awareness=')
        projectSelfBrief.includes('same_her_line=')
        projectSelfBrief.includes('primary_open_loop=')
        projectSelfBrief.includes('next_closure_target=')
        if (!carriesAlicizationCanonicalProjectState(generationMessages)) {
          await options.appendRuntimeDebugLine('main-gateway.one-shot-missing-project-state-context', {
            cardId: oneShotCardId,
          })
          await options.appendAuditLog({
            action: 'missing-main-gateway-project-state-context',
          }, oneShotCardId)
          return null
        }
      `,
    } as const
    expect(callsiteCarriesProjectStateContext(oneShotEvidence)).toBe(true)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(oneShotEvidence)).toBe('one-shot-unified-runtime')

    const oneShotEvidenceWithoutFailCloseGuard = {
      family: 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
      source: 'screen-semantic',
      extraSystemBlocks: [],
      extraSystemBlocksExpression: null,
      system: 'buildScreenSemanticClassifierSystemPrompt()',
      callText: 'generateMainGatewayText({ source: "screen-semantic" })',
      sourceText: `
        const projectStateSystemBlock = buildAlicizationProjectStateSystemBlock()
        const projectStateClosureDashboard = buildAlicizationProjectStateClosureDashboard({
          architecture: oneShotDigitalLifeArchitecture,
        })
        const systemMessages = [
          { role: 'system', content: projectStateSystemBlock } as Message,
          { role: 'system', content: projectStateClosureDashboard } as Message,
        ]
      `,
    } as const
    expect(callsiteCarriesProjectStateContext(oneShotEvidenceWithoutFailCloseGuard)).toBe(false)
    expect(resolveAlicizationProjectStateGatewayInjectionMode(oneShotEvidenceWithoutFailCloseGuard)).toBe('missing')
  })

  it('maps audited main gateway sources to shared project-state audit families', () => {
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('dream')).toBe('runtime.ts:dream-reminder-proactive-reforge')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('reminder')).toBe('runtime.ts:dream-reminder-proactive-reforge')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('proactive')).toBe('runtime.ts:dream-reminder-proactive-reforge')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('counterfactual-deliberation')).toBe('memory-os/provider-planning.ts:recollection-and-deliberation')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('dialogue-turn-semantics')).toBe('runtime-mind-state.ts:dialogue-semantics-and-subjective-inference')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('subjective-inference')).toBe('runtime-mind-state.ts:dialogue-semantics-and-subjective-inference')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('execution-callback')).toBe('runtime-execution-delivery.ts:execution-callback')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('screen-semantic')).toBe('runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal')
    expect(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource('scene-appraisal')).toBe('runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal')
    expect(isAlicizationProjectStateAuditedMainGatewaySource('scene-appraisal')).toBe(true)
    expect(isAlicizationProjectStateUnauditedMainGatewaySource('scene-appraisal')).toBe(false)
    expect(isAlicizationProjectStateUnauditedMainGatewaySource('screen-semantic')).toBe(false)
    expect(isAlicizationProjectStateAuditedMainGatewaySource('screen-semantic')).toBe(true)
  })

  it('treats only truly unmapped main gateway sources as fail-closed candidates', () => {
    const unauditedSources: string[] = []
    const auditedSources = [
      'dream',
      'reminder',
      'proactive',
      'counterfactual-deliberation',
      'dialogue-turn-semantics',
      'subjective-inference',
      'execution-callback',
      'screen-semantic',
      'scene-appraisal',
    ]

    expect(unauditedSources.every(source => isAlicizationProjectStateUnauditedMainGatewaySource(source as any))).toBe(true)
    expect(auditedSources.every(source => !isAlicizationProjectStateUnauditedMainGatewaySource(source as any))).toBe(true)
  })

  it('keeps shared provider-facing entry layers anchored to pre-dialogue project-state self-awareness', () => {
    const runtimeSurfaceSource = readFileSync(
      new URL('./main-chat-runtime-surface.ts', import.meta.url),
      'utf8',
    )
    const executiveBriefSource = readFileSync(
      new URL('./executive-answer-brief.ts', import.meta.url),
      'utf8',
    )

    expect(runtimeSurfaceSource).toContain('export const alicizationLivingSelfMarker = \'[ALICIZATION_LIVING_SELF]\'')
    expect(runtimeSurfaceSource).toContain('Pre-dialogue closure briefing:')
    expect(runtimeSurfaceSource).toContain('How the living project is still shaping her before she speaks:')
    expect(runtimeSurfaceSource).toContain('What this turn should quietly keep moving toward:')
    expect(runtimeSurfaceSource).toContain('Project same-her self line:')

    expect(executiveBriefSource).toContain('Project preflight self-awareness:')
    expect(executiveBriefSource).toContain('Latest landed continuity progress:')
    expect(executiveBriefSource).toContain('Still-open life loop pressure:')
    expect(executiveBriefSource).toContain('Next closure target:')
    expect(executiveBriefSource).toContain('Project same-her self line:')
  })

  it('anchors audited runtime gateway families to real prompt-injection coverage instead of only family-shape derivation', () => {
    const runtimeSource = readFileSync(
      new URL('./runtime.test.ts', import.meta.url),
      'utf8',
    )

    expect(runtimeSource).toContain('expect(reminderSystemTexts.every(text => text.includes(\'[ALICIZATION_PROJECT_STATE]\'))).toBe(true)')
    expect(runtimeSource).toContain('expect(proactiveSystemText).toContain(\'[ALICIZATION_PROJECT_STATE]\')')
    expect(runtimeSource).toContain('expect(dreamSystemTexts[0]).toContain(\'[ALICIZATION_PROJECT_STATE]\')')
    expect(runtimeSource).toContain('expect(dreamSystemTexts[0]).toContain(\'[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]\')')
    expect(runtimeSource).toContain('expect(dreamSystemTexts[0]).toContain(\'phase=Phase 1: Local Digital Life\')')
    expect(runtimeSource).toContain('expect(dreamSystemTexts[0]).toContain(\'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs\')')
    expect(runtimeSource).toContain(`expect(dreamSystemTexts[0]).toContain('one continuous "her"')`)
    expect(runtimeSource).toContain('expect(dreamSystemTexts[0]).toContain(\'same digital life\')')
  })
})
