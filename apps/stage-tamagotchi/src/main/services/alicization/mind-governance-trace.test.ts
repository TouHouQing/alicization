import { describe, expect, it } from 'vitest'

import {
  createMindGovernanceDecisionTraceId,
  ensureMindGovernanceDecisionTraceId,
  sanitizeMindGovernanceDecisionTraceId,
} from './mind-governance-trace'

describe('mind-governance-trace', () => {
  it('creates deterministic-format trace ids', () => {
    const traceId = createMindGovernanceDecisionTraceId(1_710_000_000_000)
    expect(traceId).toMatch(/^mind:[a-z0-9]+:[a-f0-9]{12}$/u)
  })

  it('reuses valid trace ids and rejects invalid ones', () => {
    expect(sanitizeMindGovernanceDecisionTraceId('mind:abc123:feedfacecafe')).toBe('mind:abc123:feedfacecafe')
    expect(sanitizeMindGovernanceDecisionTraceId(' trace invalid ')).toBe('')
    expect(ensureMindGovernanceDecisionTraceId('mind:abc123:feedfacecafe')).toBe('mind:abc123:feedfacecafe')
    expect(ensureMindGovernanceDecisionTraceId('invalid')).toMatch(/^mind:[a-z0-9]+:[a-f0-9]{12}$/u)
  })
})
