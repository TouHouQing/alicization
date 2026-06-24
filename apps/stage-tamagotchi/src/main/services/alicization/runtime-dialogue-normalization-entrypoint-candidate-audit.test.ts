import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationRuntimeDialogueNormalizationAuditedFiles,
} from './runtime-dialogue-normalization-audit'
import {
  collectAlicizationRuntimeDialogueNormalizationFiles,
} from './runtime-dialogue-normalization-entrypoint-audit'

describe('runtime dialogue normalization entrypoint candidate audit', () => {
  it('keeps broader runtime dialogue-normalization candidate discovery sourced from the shared audited helper instead of re-encoding one more local host-visible normalization scan', () => {
    const source = readFileSync(new URL('./runtime-dialogue-normalization-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./runtime-dialogue-normalization-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationRuntimeDialogueNormalizationFiles(')
    expect(/^function collectNormalizeDialogueRespondedPayloadCallsiteFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader runtime dialogue-normalization candidate discovery broad enough to catch normalization authority, background delivery fallback, stream-finish fallback, proactive normalization before persistence, and replay emission normalization instead of only one host-visible seam flavor', () => {
    const source = readFileSync(new URL('./runtime-dialogue-normalization-entrypoint-audit.ts', import.meta.url), 'utf8')
    const governanceSource = readFileSync(new URL('./runtime-governance.ts', import.meta.url), 'utf8')
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')
    const streamRunnerSource = readFileSync(new URL('./main-chat-stream-runner.ts', import.meta.url), 'utf8')
    const subconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(governanceSource).toContain('export function normalizeDialogueRespondedPayload(')
    expect(backgroundSource).toContain('normalizeDialogueRespondedPayload(')
    expect(streamRunnerSource).toContain('normalizeDialogueRespondedPayload(')
    expect(subconsciousSource).toContain('normalizeDialogueRespondedPayload(')
    expect(runtimeSource).toContain('normalizeDialogueRespondedPayload(')
    expect(source).toContain('normalizeDialogueRespondedPayload(')
    expect(source).toContain('runtime-governance.ts')
  })

  it('keeps the current runtime dialogue-normalization candidate set equal to the explicit audited files so the broader host-visible normalization scan and audit registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationRuntimeDialogueNormalizationFiles(rootDir)).toEqual(
      resolveAlicizationRuntimeDialogueNormalizationAuditedFiles().slice().sort(),
    )
  })

  it('makes the current boundary explicit: broader runtime dialogue-normalization candidates now feed the same top-level completeness guard, while future host-visible normalization seams still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./runtime-dialogue-normalization-entrypoint-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationRuntimeDialogueNormalizationFiles(')
    expect(coverageSource).toContain('runtime-dialogue-normalization-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('runtime-dialogue-normalization-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future host-visible normalization seams still need explicit classification')
  })
})
