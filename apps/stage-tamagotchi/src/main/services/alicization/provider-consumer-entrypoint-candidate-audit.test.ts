import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectAlicizationDirectProviderImportFiles,
  resolveAlicizationDirectProviderImportAuditFiles,
} from './project-state-gateway-entrypoint-audit'
import {
  collectAlicizationProviderConsumerGovernedFiles,
} from './provider-consumer-entrypoint-audit'
import {
  collectAlicizationProviderConsumerCandidateFiles,
} from './provider-consumer-entrypoint-candidate-audit'

describe('provider consumer entrypoint candidate audit', () => {
  it('keeps broader provider-consumer candidate discovery sourced from the shared governed and direct-provider helpers instead of re-encoding one more local provider scan', () => {
    const source = readFileSync(new URL('./provider-consumer-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./provider-consumer-entrypoint-audit\'')
    expect(source).toContain('from \'./project-state-gateway-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationProviderConsumerGovernedFiles(')
    expect(source).toContain('collectAlicizationDirectProviderImportFiles(')
    expect(/^function collectProviderConsumerGovernedFiles\(/m.test(source)).toBe(false)
    expect(/^function collectDirectProviderImportFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader provider-consumer candidate discovery broad enough to catch wrapper, dispatch-owner, typed-consumer, and direct one-shot or stream provider entry seams instead of only one ownership flavor', () => {
    const source = readFileSync(new URL('./provider-consumer-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const mindStateSource = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const executionDeliverySource = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')
    const memoryPlanningSource = readFileSync(new URL('./memory-os/provider-planning.ts', import.meta.url), 'utf8')
    const compactOneShotSource = readFileSync(new URL('./main-chat-one-shot.ts', import.meta.url), 'utf8')
    const streamRunnerSource = readFileSync(new URL('./main-chat-stream-runner.ts', import.meta.url), 'utf8')

    expect(oneShotSource).toContain('from \'@xsai/generate-text\'')
    expect(oneShotSource).toContain('generateText({')
    expect(runtimeSource).toContain('const mainGatewayTextProvider: AlicizationMainGatewayTextProvider = generateMainGatewayText')
    expect(mindStateSource).toContain('generateMainGatewayText: AlicizationMainGatewayGenerateTextProvider<')
    expect(executionDeliverySource).toContain('generateMainGatewayText: AlicizationMainGatewayGenerateTextProvider<')
    expect(memoryPlanningSource).toContain('generateMainGatewayText: AlicizationMemoryGatewayTextProvider')
    expect(compactOneShotSource).toContain('from \'@xsai/generate-text\'')
    expect(compactOneShotSource).toContain('invokeGenerateText({')
    expect(streamRunnerSource).toContain('from \'@xsai/stream-text\'')
    expect(streamRunnerSource).toContain('invokeStreamText({')
    expect(source).toContain('from \'@xsai/generate-text\'')
    expect(source).toContain('invokeGenerateText\\(|generateText\\(|invokeStreamText\\(|streamText\\(')
    expect(source).toContain('mainGatewayTextProvider\\(')
    expect(source).toContain('generateMainGatewayText:\\s*Alicization(MainGatewayGenerateTextProvider|MemoryGatewayTextProvider)')
    expect(source).toContain('collectAlicizationDirectProviderImportFiles(')
  })

  it('keeps the current provider-consumer candidate set equal to the explicit governed files plus direct provider entries so the broader provider scan and owner registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationProviderConsumerCandidateFiles(rootDir)
    const expectedFiles = [
      ...new Set([
        ...collectAlicizationProviderConsumerGovernedFiles(rootDir),
        ...collectAlicizationDirectProviderImportFiles(rootDir),
      ]),
    ].sort()

    expect(candidateFiles).toEqual(expectedFiles)
    expect(resolveAlicizationDirectProviderImportAuditFiles().every(relativePath =>
      candidateFiles.includes(relativePath),
    )).toBe(true)
  }, 10_000)

  it('makes the current boundary explicit: broader provider-consumer candidates now feed the same top-level completeness guard, while future provider-facing generation families still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./provider-consumer-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationProviderConsumerCandidateFiles(')
    expect(coverageSource).toContain('provider-consumer-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('provider-consumer-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future provider-facing generation families still need explicit registration')
  })
})
