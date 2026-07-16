import { describe, expect, it } from 'vitest'

import { collectAlicizationAutonomousDialogueGovernedFiles } from './autonomous-dialogue-entrypoint-audit'
import {
  assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain,
  resolveAlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps,
  resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries,
  resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles,
  resolveAlicizationProjectEntrypointGovernanceAuditRegistry,
} from './entrypoint-governance-registry-audit'
import { collectAlicizationExecutionPreflightGovernedFiles } from './execution-preflight-entrypoint-audit'
import { collectAlicizationProviderConsumerGovernedFiles } from './provider-consumer-entrypoint-audit'

const governedDomains = [
  'chat-start',
  'pre-dialogue-transport',
  'chat-entry',
  'provider-consumer',
  'autonomous-dialogue',
  'execution-preflight',
  'execution-dispatch',
  'recovery-reentry',
  'execution-follow-up-continuity',
] as const

describe('entrypoint governance project awareness audit', () => {
  it('validates every registered entry against its domain ownership rules without proof-of-proof fixtures', () => {
    const registry = resolveAlicizationProjectEntrypointGovernanceAuditRegistry()

    expect([...new Set(registry.map(entry => entry.domain))].sort())
      .toEqual([...governedDomains].sort())

    for (const entry of registry) {
      expect(entry.relativePath.length).toBeGreaterThan(0)
      expect(entry.responsibility.length).toBeGreaterThan(0)
      expect(() => assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain(entry))
        .not
        .toThrow()
    }
  })

  it('keeps provider and autonomous ownership attached to real runtime seams', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('provider-consumer'))
      .toEqual(collectAlicizationProviderConsumerGovernedFiles(rootDir))
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('autonomous-dialogue'))
      .toEqual(collectAlicizationAutonomousDialogueGovernedFiles(rootDir))

    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries('provider-consumer'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ mode: 'authority', relativePath: 'runtime-main-gateway-one-shot.ts' }),
        expect.objectContaining({ mode: 'dispatch-owner', relativePath: 'runtime.ts' }),
        expect.objectContaining({ mode: 'typed-consumer' }),
      ]))
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries('autonomous-dialogue'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ mode: 'authority', relativePath: 'runtime.ts' }),
        expect.objectContaining({ relativePath: 'runtime-delivery-reminders.ts' }),
        expect.objectContaining({ relativePath: 'runtime-subconscious-tick.ts' }),
      ]))
  })

  it('keeps execution preflight limited to files that still own runtime context or safety work', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const registeredFiles = resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-preflight')

    expect(registeredFiles).toEqual(collectAlicizationExecutionPreflightGovernedFiles(rootDir))
    expect(registeredFiles).not.toContain('main-chat-execution-surface.ts')
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries('execution-preflight'))
      .not
      .toContainEqual(expect.objectContaining({ mode: 'capability-project-briefing-surface' }))
  })

  it('registers cross-domain overlap from actual ownership instead of narrative proof text', () => {
    const registry = resolveAlicizationProjectEntrypointGovernanceAuditRegistry()
    const registeredOverlaps = resolveAlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps()
    const discoveredOverlaps = [...registry
      .reduce((map, entry) => {
        const domains = map.get(entry.relativePath) ?? []
        domains.push(entry.domain)
        map.set(entry.relativePath, domains)
        return map
      }, new Map<string, string[]>())
      .entries()]
      .filter(([, domains]) => new Set(domains).size > 1)
      .map(([relativePath, domains]) => ({
        relativePath,
        domains: [...new Set(domains)].sort(),
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

    expect(registeredOverlaps.map(({ relativePath, domains }) => ({
      relativePath,
      domains: domains.slice().sort(),
    }))).toEqual(discoveredOverlaps)
  })
})
