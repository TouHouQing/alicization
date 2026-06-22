import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  alicizationRuntimeDialogueNormalizationAuthorityFiles,
  alicizationRuntimeDialogueNormalizedConsumerFiles,
  resolveAlicizationRuntimeDialogueNormalizationAuditedFiles,
  resolveAlicizationRuntimeDialogueNormalizationAuditRegistry,
  resolveAlicizationRuntimeDialogueNormalizationMode,
} from './runtime-dialogue-normalization-audit'
import { collectAlicizationRuntimeDialogueNormalizationFiles } from './runtime-dialogue-normalization-entrypoint-audit'

describe('runtime-dialogue-normalization-audit', () => {
  it('keeps dialogue normalization discovery sourced from a shared helper instead of a local callsite scan', () => {
    const source = readFileSync(new URL('./runtime-dialogue-normalization-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./runtime-dialogue-normalization-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationRuntimeDialogueNormalizationFiles(')
    expect(/^function collectNormalizeDialogueRespondedPayloadCallsiteFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every normalizeDialogueRespondedPayload source file explicitly classified', () => {
    const discoveredFiles = collectAlicizationRuntimeDialogueNormalizationFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationRuntimeDialogueNormalizationAuditedFiles().slice().sort())
    expect(resolveAlicizationRuntimeDialogueNormalizationAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('keeps a single canonical normalization authority and requires every consumer seam to call it explicitly', () => {
    expect(alicizationRuntimeDialogueNormalizationAuthorityFiles).toEqual(['runtime-governance.ts'])

    for (const relativePath of alicizationRuntimeDialogueNormalizationAuthorityFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationRuntimeDialogueNormalizationMode(relativePath)).toBe('normalization-authority')
      expect(source).toContain('export function normalizeDialogueRespondedPayload(')
    }

    for (const relativePath of alicizationRuntimeDialogueNormalizedConsumerFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationRuntimeDialogueNormalizationMode(relativePath)).not.toBe('normalization-authority')
      expect(source).toContain('normalizeDialogueRespondedPayload(')
    }
  })
})
