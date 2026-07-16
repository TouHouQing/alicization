import { describe, expect, it } from 'vitest'

import {
  isAlicizationRegisteredMainGatewaySource,
  isAlicizationUnregisteredMainGatewaySource,
  resolveAlicizationMainGatewayAuditFamilyForSource,
} from './main-gateway-contract'

describe('main-gateway-contract', () => {
  it('classifies every registered source without coupling source registration to project-state injection', () => {
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('dream')).toBe('background-life')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('reminder')).toBe('background-life')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('proactive')).toBe('background-life')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('counterfactual-deliberation')).toBe('memory-planning')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('dialogue-turn-semantics')).toBe('mind-state')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('subjective-inference')).toBe('mind-state')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('execution-callback')).toBe('execution-callback')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('screen-semantic')).toBe('screen-understanding')
    expect(resolveAlicizationMainGatewayAuditFamilyForSource('scene-appraisal')).toBe('screen-understanding')
  })

  it('rejects unknown runtime source tags without requiring canonical prompt prose', () => {
    expect(isAlicizationRegisteredMainGatewaySource('dream')).toBe(true)
    expect(isAlicizationUnregisteredMainGatewaySource('dream')).toBe(false)
    expect(isAlicizationRegisteredMainGatewaySource('unknown-source')).toBe(false)
    expect(isAlicizationUnregisteredMainGatewaySource('unknown-source')).toBe(true)
    expect(resolveAlicizationMainGatewayAuditFamilyForSource(null)).toBeNull()
  })
})
