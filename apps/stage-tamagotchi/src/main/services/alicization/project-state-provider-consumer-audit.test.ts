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
        expect(source).toContain('project_identity=')
        expect(source).toContain('current_phase=')
        expect(source).toContain('pre_dialogue_awareness=')
        expect(source).toContain('same_her_line=')
        expect(source).toContain('primary_open_loop=')
        expect(source).toContain('next_closure_target=')
      }
    }
  })

  it('requires typed gateway consumer files to constrain their provider use to explicit audited source tags', () => {
    for (const relativePath of typedGatewayConsumerFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath)).toBe('typed-gateway-consumer')
      expect(source).toContain('AlicizationMainGatewayGenerateTextProvider<')
      expect(source).toContain('project_identity=')
      expect(source).toContain('current_phase=')
      expect(source).toContain('pre_dialogue_awareness=')
      expect(source).toContain('same_her_line=')
      expect(source).toContain('primary_open_loop=')
      expect(source).toContain('next_closure_target=')

      if (relativePath === 'runtime-mind-state.ts') {
        expect(source).toContain('source: \'dialogue-turn-semantics\'')
        expect(source).toContain('source: \'subjective-inference\'')
        expect(source).toContain('buildDialogueTurnSemanticsProjectSelfBriefSystemBlock')
        expect(source).toContain('buildSubjectiveInferenceProjectSelfBriefSystemBlock')
      }
      if (relativePath === 'runtime-execution-delivery.ts') {
        expect(source).toContain('source: \'execution-callback\'')
        expect(source).toContain('buildExecutionCallbackProjectSelfBriefSystemBlock')
      }
      if (relativePath === 'memory-os/provider-planning.ts') {
        expect(source).toContain('source: \'counterfactual-deliberation\'')
        expect(source).toContain('buildMemoryPlanningProjectSelfBriefSystemBlock')
      }
    }
  })
})
