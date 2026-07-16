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

const removedSelfBriefToken = ['Project', 'SelfBrief'].join('')
const removedOwnerBoundaryToken = ['OWNER', 'BOUNDARY'].join('_')
const removedSelfBriefMarkerToken = ['SELF', 'BRIEF'].join('_')
const removedCanonicalProjectStateToken = ['Canonical', 'ProjectState'].join('')

describe('project-state-provider-consumer-audit', () => {
  it('reuses the shared provider-consumer scanner instead of maintaining a duplicate signature scan', () => {
    const source = readFileSync(new URL('./project-state-provider-consumer-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./provider-consumer-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationProviderConsumerGovernedFiles(')
    expect(/^function collectProviderConsumerFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every current main-gateway provider consumer explicitly registered', () => {
    const discoveredFiles = collectAlicizationProviderConsumerGovernedFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationProjectStateProviderConsumerAuditFiles().slice().sort())
    expect(resolveAlicizationProjectStateProviderConsumerAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('fails closed when a provider-consumer row uses an unrelated governance mode', () => {
    expect(() => classifyAlicizationProjectStateProviderConsumerAuditMode({
      relativePath: 'unexpected.ts',
      mode: 'read-only-downstream',
    })).toThrowError('Unexpected Alicization provider-consumer governance mode')
  })

  it('keeps the direct one-shot Provider wrapper source-tagged, typed-fact-only, and failure-transparent', () => {
    for (const relativePath of providerWrapperAuthorityFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath)).toBe('provider-wrapper-authority')
      expect(source).toContain('from \'@xsai/generate-text\'')
      expect(source).toContain('function sanitizeOneShotProviderSystemBlock')
      expect(source).toContain('const parsed = JSON.parse(text)')
      expect(source).toContain('typeof parsed.type !== \'string\'')
      expect(source).toContain('parsed.data === undefined')
      expect(source).toContain('main-gateway.one-shot-missing-source')
      expect(source).toContain('action: \'unregistered-main-gateway-source\'')
      expect(source).toContain('action: \'one-shot-failed\'')
      expect(source).toContain('category: \'alicization.main-gateway\'')
      expect(source).not.toContain(removedCanonicalProjectStateToken)
      expect(source).not.toContain(removedSelfBriefToken)
      expect(source).not.toContain(removedOwnerBoundaryToken)
      expect(source).not.toContain(removedSelfBriefMarkerToken)
    }
  })

  it('keeps runtime composition on the shared Provider wrapper and sends one-shot memory as typed facts', () => {
    for (const relativePath of providerDispatchOwnerFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath)).toBe('provider-dispatch-owner')
      expect(source).toContain('const mainGatewayTextProvider: AlicizationMainGatewayTextProvider = generateMainGatewayText')
      expect(source).toContain('generateMainGatewayText: mainGatewayTextProvider')
      expect(source).toContain('buildOrganicMemoryProviderFactBlocks(organicPromptContext)')
      expect(source).not.toContain(removedSelfBriefToken)
      expect(source).not.toContain(removedOwnerBoundaryToken)
      expect(source).not.toContain(removedSelfBriefMarkerToken)
    }
  })

  it('keeps typed consumers on explicit source tags without provider-facing governance templates', () => {
    const requiredSourcesByFile: Record<string, string[]> = {
      'runtime-mind-state.ts': [
        'source: \'dialogue-turn-semantics\'',
        'source: \'subjective-inference\'',
      ],
      'memory-os/provider-planning.ts': [
        'source: \'counterfactual-deliberation\'',
      ],
      'runtime-execution-delivery.ts': [
        'source: \'execution-callback\'',
      ],
    }

    for (const relativePath of typedGatewayConsumerFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath)).toBe('typed-gateway-consumer')
      expect(source).toContain('AlicizationMainGatewayGenerateTextProvider<')
      for (const requiredSource of requiredSourcesByFile[relativePath] ?? [])
        expect(source).toContain(requiredSource)
      expect(source).not.toContain(removedSelfBriefToken)
      expect(source).not.toContain(removedOwnerBoundaryToken)
      expect(source).not.toContain(removedSelfBriefMarkerToken)
      expect(source).not.toContain(removedCanonicalProjectStateToken)
    }
  })
})
