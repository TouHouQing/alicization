import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  classifyAlicizationProjectStateProviderConsumerAuditMode,
  providerDispatchOwnerFiles,
  providerWrapperAuthorityFiles,
  resolveAlicizationProjectStateProviderConsumerAuditFiles,
  resolveAlicizationProjectStateProviderConsumerAuditMode,
  resolveAlicizationProjectStateProviderConsumerAuditRegistry,
  typedGatewayConsumerFiles,
} from './project-state-provider-consumer-audit'
import { collectAlicizationProviderConsumerGovernedFiles } from './provider-consumer-entrypoint-audit'

describe('project-state-provider-consumer-audit', () => {
  it('reuses the shared provider-consumer entrypoint scanner instead of maintaining a local provider signature scan copy', () => {
    const source = readFileSync(new URL('./project-state-provider-consumer-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./provider-consumer-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationProviderConsumerGovernedFiles(')
    expect(/^function collectProviderConsumerFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every current main-gateway provider consumer file explicitly registered', () => {
    const discoveredFiles = collectAlicizationProviderConsumerGovernedFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationProjectStateProviderConsumerAuditFiles().slice().sort())
    expect(resolveAlicizationProjectStateProviderConsumerAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('fails closed when a provider-consumer governance row carries a mode that does not belong to provider-consumer mapping', () => {
    expect(() => classifyAlicizationProjectStateProviderConsumerAuditMode({
      relativePath: 'unexpected.ts',
      mode: 'read-only-downstream',
    })).toThrowError('Unexpected Alicization provider-consumer governance mode')
  })

  it('requires provider wrapper authority files to own direct provider imports and canonical project-state fail-close guards', () => {
    for (const relativePath of providerWrapperAuthorityFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath)).toBe('provider-wrapper-authority')
      expect(source).toContain('from \'@xsai/generate-text\'')
      expect(source).toContain('carriesAlicizationCanonicalProjectState')
      expect(source).toContain('main-gateway.one-shot-missing-project-state-context')
      expect(source).toContain('ProjectSelfBrief')
    }
  })

  it('requires provider dispatch owner files to wire only the audited main gateway text provider through runtime composition', () => {
    for (const relativePath of providerDispatchOwnerFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath)).toBe('provider-dispatch-owner')
      expect(source).toContain('const mainGatewayTextProvider: AlicizationMainGatewayTextProvider = generateMainGatewayText')
      expect(source).toContain('generateMainGatewayText: mainGatewayTextProvider')

      if (relativePath === 'runtime.ts') {
        expect(source).toContain('function buildReminderProjectSelfBriefSystemBlock()')
        expect(source).toContain('function buildProactiveProjectSelfBriefSystemBlock()')
        expect(source).toContain('function buildDreamProjectSelfBriefSystemBlock()')
        expect(source).toContain('function buildMemoryConsolidationProjectSelfBriefSystemBlock()')
        expect(source).toContain('[ALICIZATION_REMINDER_SELF_BRIEF]')
        expect(source).toContain('[ALICIZATION_PROACTIVE_SELF_BRIEF]')
        expect(source).toContain('[ALICIZATION_DREAM_SELF_BRIEF]')
        expect(source).toContain('[ALICIZATION_MEMORY_CONSOLIDATION_SELF_BRIEF]')
        expect(source).toContain('short_term_owner=${facts.shortTermOwner}')
        expect(source).toContain('long_term_recall_owner=${facts.longTermRecallOwner}')
        expect(source).toContain('visible_governance_entry=${facts.visibleGovernanceEntry}')
        expect(source).toContain('failure_surface=${facts.failureSurface}')
        expect(source).toContain('template_policy=${facts.templatePolicy}')
        expect(source).toContain('primary_open_loop=')
        expect(source).toContain('next_closure_target=')
        expect(source).not.toContain('project_context=phase1_local_digital_life')
        expect(source).not.toContain('Do not let reminder delivery collapse')
        expect(source).not.toContain('Do not let proactive initiative collapse')
        expect(source).not.toContain('Do not let dream metabolism collapse')
        expect(source).not.toContain('Do not let consolidation refinement collapse')
      }
    }
  })

  it('requires typed gateway consumer files to constrain their provider use to explicit audited source tags', () => {
    for (const relativePath of typedGatewayConsumerFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath)).toBe('typed-gateway-consumer')
      expect(source).toContain('AlicizationMainGatewayGenerateTextProvider<')

      if (relativePath === 'runtime-mind-state.ts') {
        expect(source).toContain('source: \'dialogue-turn-semantics\'')
        expect(source).toContain('source: \'subjective-inference\'')
        expect(source).toContain('buildDialogueTurnSemanticsProjectSelfBriefSystemBlock')
        expect(source).toContain('buildSubjectiveInferenceProjectSelfBriefSystemBlock')
        expect(source).toContain('[ALICIZATION_DIALOGUE_TURN_SEMANTICS_OWNER_BOUNDARY]')
        expect(source).toContain('[ALICIZATION_SUBJECTIVE_INFERENCE_OWNER_BOUNDARY]')
        expect(source).toContain('short_term_owner=WorkingMemory')
        expect(source).toContain('long_term_recall_owner=LongTermMemoryRecall')
        expect(source).toContain('project_state_policy=withheld_for_turn_semantics_unless_explicitly_requested')
        continue
      }

      if (relativePath === 'memory-os/provider-planning.ts') {
        expect(source).toContain('source: \'counterfactual-deliberation\'')
        expect(source).toContain('buildMemoryPlanningProjectSelfBriefSystemBlock')
        expect(source).toContain('[ALICIZATION_MEMORY_PLANNING_OWNER_BOUNDARY]')
        expect(source).toContain('short_term_owner=WorkingMemory')
        expect(source).toContain('long_term_recall_owner=LongTermMemoryRecall')
        expect(source).toContain('workbench_role=governance_surface_only')
        expect(source).toContain('project_state_policy=withheld_for_memory_planning_unless_explicitly_requested')
        continue
      }

      if (relativePath === 'runtime-execution-delivery.ts') {
        expect(source).toContain('source: \'execution-callback\'')
        expect(source).toContain('buildExecutionCallbackProjectSelfBriefSystemBlock')
        expect(source).toContain('[ALICIZATION_EXECUTION_CALLBACK_SELF_BRIEF]')
        expect(source).toContain('short_term_owner=WorkingMemory')
        expect(source).toContain('long_term_recall_owner=LongTermMemoryRecall')
        expect(source).toContain('visible_governance_entry=MemoryWorkbench')
        expect(source).toContain('template_policy=no_fixed_persona_templates')
        expect(source).toContain('error_policy=surface_execution_blockers_provider_failures_and_tool_failures_directly')
        expect(source).not.toContain('runtime_context=alicization_phase1')
        expect(source).not.toContain('Do not cover execution blockers')
      }
    }
  })
})
