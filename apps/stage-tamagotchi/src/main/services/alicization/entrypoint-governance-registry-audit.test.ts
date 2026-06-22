import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectRendererChatEntryGovernedFiles,
  resolveRendererChatEntryOnlyFallbackBoundaryFile,
} from '../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit'
import {
  resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles,
  resolveAlicizationProjectEntrypointGovernanceAuditRegistry,
} from './entrypoint-governance-registry-audit'

describe('entrypoint governance registry audit', () => {
  it('keeps chat-entry discovery sourced from a shared helper instead of a locally re-encoded rg scan', () => {
    const source = readFileSync(new URL('./entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit\'')
    expect(source).toContain('collectRendererChatEntryGovernedFiles(')
    expect(/^function collectChatEntryGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps current renderer chat-entry seams mapped into the repo-level governance registry', () => {
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-entry'))
      .toEqual(collectRendererChatEntryGovernedFiles())
  })

  it('keeps the desktop chat fallback boundary explicitly registered as normalization before use', () => {
    const fallbackBoundary = resolveRendererChatEntryOnlyFallbackBoundaryFile()

    expect(resolveAlicizationProjectEntrypointGovernanceAuditRegistry()).toContainEqual(expect.objectContaining({
      domain: 'chat-entry',
      relativePath: fallbackBoundary,
      mode: 'normalize-before-use',
    }))
  })
})
