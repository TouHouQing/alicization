import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectRendererChatEntryGovernedFiles,
  resolveRendererChatEntryAwarenessAuditFiles,
} from '../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit'
import { collectAlicizationAutonomousDialogueGovernedFiles } from './autonomous-dialogue-entrypoint-audit'
import { collectAlicizationAutonomousDialogueCandidateFiles } from './autonomous-dialogue-entrypoint-candidate-audit'
import { resolveAlicizationChatEntryComposerSurfaceAuditFiles } from './chat-entry-composer-surface-entrypoint-audit'
import { resolveAlicizationChatStartPayloadAuditedFiles } from './chat-start-awareness-audit'
import { resolveAlicizationChatStartDeepHelperOwnerAuditFiles } from './chat-start-deep-helper-owner-audit'
import { collectAlicizationChatStartGovernedFiles } from './chat-start-entrypoint-audit'
import { collectAlicizationChatStartCandidateFiles } from './chat-start-entrypoint-candidate-audit'
import {
  resolveAlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps,
  resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles,
  resolveAlicizationProjectEntrypointGovernanceAuditRegistry,
} from './entrypoint-governance-registry-audit'
import { collectAlicizationExecutionDispatchCandidateFiles } from './execution-dispatch-entrypoint-candidate-audit'
import {
  resolveAlicizationExecutionFollowUpContinuityAuditFiles,
} from './execution-follow-up-entrypoint-audit'
import {
  collectAlicizationExecutionFollowUpCandidateFiles,
} from './execution-follow-up-entrypoint-candidate-audit'
import { resolveAlicizationExecutionPreflightAuditedFiles } from './execution-preflight-audit'
import { collectAlicizationExecutionPreflightGovernedFiles } from './execution-preflight-entrypoint-audit'
import { collectAlicizationExecutionPreflightCandidateFiles } from './execution-preflight-entrypoint-candidate-audit'
import { resolveAlicizationPreDialogueTransportAuditFiles } from './pre-dialogue-transport-audit'
import { collectAlicizationPreDialogueTransportGovernedFiles } from './pre-dialogue-transport-entrypoint-audit'
import { collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles } from './project-awareness-cross-surface-entrypoint-audit'
import {
  resolveAlicizationProjectAwarenessTopLevelCompletenessGuardFamilies,
  resolveAlicizationProjectEntrypointGovernedFiles,
  resolveAlicizationProjectRouteAuthorityFiles,
} from './project-state-brief'
import {
  collectAlicizationDirectProviderImportFiles,
  resolveAlicizationDirectProviderImportAuditFiles,
} from './project-state-gateway-entrypoint-audit'
import { resolveAlicizationProjectStateProviderConsumerAuditFiles } from './project-state-provider-consumer-audit'
import { collectAlicizationProviderConsumerGovernedFiles } from './provider-consumer-entrypoint-audit'
import { collectAlicizationProviderConsumerCandidateFiles } from './provider-consumer-entrypoint-candidate-audit'
import { resolveAlicizationRecoveryReentryAuditedFiles } from './recovery-reentry-entrypoint-audit'
import { collectAlicizationRecoveryReentryCandidateFiles } from './recovery-reentry-entrypoint-candidate-audit'
import { resolveAlicizationReturnSideProjectAwarenessAuditFiles } from './return-side-project-awareness-audit'
import { collectAlicizationReturnSideProjectAwarenessCandidateFiles } from './return-side-project-awareness-entrypoint-candidate-audit'
import { resolveAlicizationRuntimeDialogueNormalizationAuditedFiles } from './runtime-dialogue-normalization-audit'
import { collectAlicizationRuntimeDialogueNormalizationFiles } from './runtime-dialogue-normalization-entrypoint-audit'
import { resolveAlicizationRuntimeTurnPersistenceAuditedFiles } from './runtime-turn-persistence-audit'
import { collectAlicizationRuntimeTurnPersistenceFiles } from './runtime-turn-persistence-entrypoint-audit'
import {
  collectAlicizationExecutionDispatchOwnerFiles,
  resolveAlicizationTaskThreadDispatchOwnerAuditFiles,
} from './task-thread-dispatch-owner-audit'

describe('project awareness route authority audit', () => {
  it('does not retain an unused generic local source walker once route-authority discovery has been shared into dedicated governance scanners', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const staleSourceWalkerDefinition = 'function collect' + 'SourceFiles(rootDir: string) {'
    const staleRelativePathDefinition = 'function toService' + 'RelativePath(absolutePath: string) {'

    expect(source.includes(staleSourceWalkerDefinition)).toBe(false)
    expect(source.includes(staleRelativePathDefinition)).toBe(false)
  })

  it('keeps dialogue normalization discovery sourced from the shared helper instead of a stale local scan', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./runtime-dialogue-normalization-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationRuntimeDialogueNormalizationFiles(')
    expect(/^function collectRuntimeDialogueNormalizationFiles\(/m.test(source)).toBe(false)
  })

  it('keeps guarded turn persistence discovery sourced from the shared helper instead of a stale local scan', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./runtime-turn-persistence-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationRuntimeTurnPersistenceFiles(')
    expect(/^function collectRuntimeTurnPersistenceFiles\(/m.test(source)).toBe(false)
  })

  it('keeps chat-start authority discovery sourced from the shared candidate helper instead of a stale local scan', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./chat-start-entrypoint-candidate-audit\'')
    expect(source).toContain('collectAlicizationChatStartCandidateFiles(')
    expect(/^function collectChatStartCandidateFiles\(/m.test(source)).toBe(false)
  })

  it('keeps a broader chat-start candidate scan aligned with explicit audit registries so future main-process start seams are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationChatStartCandidateFiles(rootDir)
    const auditedFiles = new Set([
      ...resolveAlicizationChatStartPayloadAuditedFiles(),
      ...resolveAlicizationChatStartDeepHelperOwnerAuditFiles(),
      ...resolveAlicizationRecoveryReentryAuditedFiles(),
    ])
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(10)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps the governed chat-start discovery synchronized with the explicit entrypoint-governance chat-start domain registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationChatStartGovernedFiles(rootDir))
      .toEqual(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-start').slice().sort())
  })

  it('keeps autonomous dialogue authority discovery sourced from the shared governance helper instead of stale hardcoded turn-shape strings', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./autonomous-dialogue-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationAutonomousDialogueGovernedFiles(')
    expect(/^function collectAutonomousDialogueAuthorityFiles\(/m.test(source)).toBe(false)
  })

  it('keeps a broader autonomous-dialogue candidate scan aligned with explicit audit registries so future runtime-owned dialogue shapes are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationAutonomousDialogueCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('autonomous-dialogue'))
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(2)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps the governed autonomous-dialogue discovery synchronized with the explicit governance domain registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationAutonomousDialogueGovernedFiles(rootDir))
      .toEqual(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('autonomous-dialogue').slice().sort())
  })

  it('keeps provider-consumer authority discovery sourced from the shared governance helper instead of a stale local provider scan', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./provider-consumer-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationProviderConsumerGovernedFiles(')
    expect(/^function collectProviderConsumerFiles\(/m.test(source)).toBe(false)
  })

  it('keeps a broader provider-consumer candidate scan aligned with explicit audit registries so future provider-facing generation shapes are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationProviderConsumerCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set([
      ...resolveAlicizationProjectStateProviderConsumerAuditFiles(),
      ...resolveAlicizationDirectProviderImportAuditFiles(),
    ])
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(4)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps the governed provider-consumer discovery synchronized with the explicit provider-consumer audit registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationProviderConsumerGovernedFiles(rootDir))
      .toEqual(resolveAlicizationProjectStateProviderConsumerAuditFiles().slice().sort())
  })

  it('keeps the governed provider-consumer discovery synchronized with the explicit entrypoint-governance provider-consumer domain registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationProviderConsumerGovernedFiles(rootDir))
      .toEqual(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('provider-consumer').slice().sort())
  })

  it('keeps direct provider import discovery sourced from the shared gateway entrypoint helper instead of leaving one-shot or stream provider entries outside the top-level completeness guard', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./project-state-gateway-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationDirectProviderImportFiles(')
    expect(source).toContain('resolveAlicizationDirectProviderImportAuditFiles(')
    expect(/^function collectDirectProviderImportFiles\(/m.test(source)).toBe(false)
  })

  it('keeps the current direct provider import entry set aligned with the explicit audit registry so new stream or one-shot provider routes are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationDirectProviderImportFiles(rootDir)
    const auditedFiles: Set<string> = new Set(resolveAlicizationDirectProviderImportAuditFiles())
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(2)
    expect(uncoveredCandidates).toEqual([])
  })

  it('keeps cross-surface pre-dialogue discovery sourced from shared helpers instead of leaving renderer/store boundaries outside the top-level completeness guard', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./pre-dialogue-transport-entrypoint-audit\'')
    expect(source).toContain('from \'./chat-entry-composer-surface-entrypoint-audit\'')
    expect(source).toContain('from \'./pre-dialogue-transport-audit\'')
    expect(source).toContain('from \'../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit\'')
    expect(source).toContain('collectAlicizationPreDialogueTransportGovernedFiles(')
    expect(source).toContain('resolveAlicizationChatEntryComposerSurfaceAuditFiles(')
    expect(source).toContain('resolveAlicizationPreDialogueTransportAuditFiles(')
    expect(source).toContain('collectRendererChatEntryGovernedFiles(')
    expect(source).toContain('resolveRendererChatEntryAwarenessAuditFiles(')
    expect(/^function collectPreDialogueTransportFiles\(/m.test(source)).toBe(false)
    expect(/^function collectChatEntryFiles\(/m.test(source)).toBe(false)
  })

  it('keeps the governed pre-dialogue transport discovery synchronized with the explicit entrypoint-governance pre-dialogue-transport domain registry', () => {
    expect(collectAlicizationPreDialogueTransportGovernedFiles())
      .toEqual(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('pre-dialogue-transport').slice().sort())
  })

  it('keeps the governed chat-entry discovery synchronized with the explicit entrypoint-governance chat-entry domain registry', () => {
    expect(collectRendererChatEntryGovernedFiles())
      .toEqual(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-entry').slice().sort())
  })

  it('keeps the governed dialogue-normalization discovery synchronized with the explicit normalization audit registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationRuntimeDialogueNormalizationFiles(rootDir))
      .toEqual(resolveAlicizationRuntimeDialogueNormalizationAuditedFiles().slice().sort())
  })

  it('keeps the governed guarded-persistence discovery synchronized with the explicit persistence audit registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationRuntimeTurnPersistenceFiles(rootDir))
      .toEqual(resolveAlicizationRuntimeTurnPersistenceAuditedFiles().slice().sort())
  })

  it('keeps return-side route-authority discovery sourced from the shared helper instead of leaving rebuild-time identity-continuity', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./project-state-brief\'')
    expect(source).toContain('from \'./return-side-project-awareness-audit\'')
    expect(source).toContain('from \'./return-side-project-awareness-entrypoint-candidate-audit\'')
    expect(source).toContain('resolveAlicizationProjectRouteAuthorityFiles(')
    expect(source).toContain('resolveAlicizationReturnSideProjectAwarenessAuditFiles(')
    expect(source).toContain('collectAlicizationReturnSideProjectAwarenessCandidateFiles(')
    expect(/^function collectReturnSideRouteAuthorityFiles\(/m.test(source)).toBe(false)
  })

  it('keeps a broader return-side project-awareness candidate scan aligned with the explicit audit registry so future reopen-time continuity rebuild shapes are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationReturnSideProjectAwarenessCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set(resolveAlicizationReturnSideProjectAwarenessAuditFiles())
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(4)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps the shared route-authority file set synchronized with the adjacent route-domain audit registries', () => {
    const expectedRouteAuthorityFiles = [...new Set([
      ...resolveAlicizationPreDialogueTransportAuditFiles(),
      ...resolveAlicizationReturnSideProjectAwarenessAuditFiles(),
      ...resolveAlicizationRuntimeDialogueNormalizationAuditedFiles(),
      ...resolveAlicizationRuntimeTurnPersistenceAuditedFiles(),
    ])].sort()

    expect(resolveAlicizationProjectRouteAuthorityFiles())
      .toEqual(expectedRouteAuthorityFiles)
  })

  it('keeps the shared entrypoint-governance file set synchronized with the explicit governance domain registries', () => {
    const expectedEntrypointGovernedFiles = [
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-start'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('pre-dialogue-transport'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-entry'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('provider-consumer'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('autonomous-dialogue'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-preflight'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-dispatch'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('recovery-reentry'),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-follow-up-continuity'),
    ].sort()

    expect(resolveAlicizationProjectEntrypointGovernedFiles())
      .toEqual(expectedEntrypointGovernedFiles)
  })

  it('keeps the shared entrypoint-governance overlap set synchronized with the explicit multi-domain bridge registry', () => {
    const registry = resolveAlicizationProjectEntrypointGovernanceAuditRegistry()
    const allowedOverlaps = resolveAlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps()

    const discoveredOverlaps = [...registry
      .reduce((map, entry) => {
        const existing = map.get(entry.relativePath) ?? []
        existing.push(entry.domain)
        map.set(entry.relativePath, existing)
        return map
      }, new Map<string, string[]>())
      .entries()]
      .filter(([, domains]) => new Set(domains).size > 1)
      .map(([relativePath, domains]) => ({
        relativePath,
        domains: [...new Set(domains)].sort(),
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

    expect(allowedOverlaps.map(({ relativePath, domains }) => ({
      relativePath,
      domains: domains.slice().sort(),
    }))).toEqual(discoveredOverlaps)
  })

  it('keeps a broader cross-surface entrypoint candidate scan aligned with explicit audit registries so future renderer/store dialogue entry shapes are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set([
      ...collectAlicizationPreDialogueTransportGovernedFiles(),
      ...resolveAlicizationChatEntryComposerSurfaceAuditFiles(),
      ...resolveAlicizationPreDialogueTransportAuditFiles(),
      ...collectRendererChatEntryGovernedFiles(),
      ...resolveRendererChatEntryAwarenessAuditFiles(),
    ])
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(10)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps the route-authority execution-dispatch discovery breadth synchronized with the dedicated dispatch-owner registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationExecutionDispatchOwnerFiles(rootDir))
      .toEqual(resolveAlicizationTaskThreadDispatchOwnerAuditFiles().slice().sort())
  })

  it('keeps the governed execution-dispatch discovery synchronized with the explicit entrypoint-governance execution-dispatch domain registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationExecutionDispatchOwnerFiles(rootDir))
      .toEqual(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-dispatch').slice().sort())
  })

  it('keeps execution-preflight authority discovery sourced from the shared candidate helper instead of a stale local execution-runtime-context scan', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./execution-preflight-entrypoint-candidate-audit\'')
    expect(source).toContain('from \'./execution-preflight-audit\'')
    expect(source).toContain('collectAlicizationExecutionPreflightCandidateFiles(')
    expect(source).toContain('resolveAlicizationExecutionPreflightAuditedFiles(')
    expect(/^function collectExecutionPreflightCandidateFiles\(/m.test(source)).toBe(false)
  })

  it('keeps a broader execution-preflight candidate scan aligned with the explicit audit registry so future execution-preflight shapes are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationExecutionPreflightCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set(resolveAlicizationExecutionPreflightAuditedFiles())
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(4)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps the governed execution-preflight discovery synchronized with the explicit entrypoint-governance execution-preflight domain registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationExecutionPreflightGovernedFiles(rootDir))
      .toEqual(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-preflight').slice().sort())
  })

  it('keeps a broader execution-dispatch candidate scan aligned with explicit audit registries so future execution bridge shapes are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationExecutionDispatchCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set(resolveAlicizationTaskThreadDispatchOwnerAuditFiles())
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(4)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps execution follow-up continuity discovery sourced from the shared candidate helper instead of a stale local callback-return scan', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./execution-follow-up-entrypoint-candidate-audit\'')
    expect(source).toContain('from \'./execution-follow-up-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationExecutionFollowUpCandidateFiles(')
    expect(source).toContain('resolveAlicizationExecutionFollowUpContinuityAuditFiles(')
    expect(/^function collectExecutionFollowUpCandidateFiles\(/m.test(source)).toBe(false)
  })

  it('keeps a broader execution follow-up continuity candidate scan aligned with the explicit audit registry so future callback, follow-up, ledger, afterglow, and callback-persistence seams are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationExecutionFollowUpCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set(resolveAlicizationExecutionFollowUpContinuityAuditFiles())
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(8)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps recovery reentry discovery sourced from the shared candidate helper instead of a stale local timeout-recovery or start-result scan', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./recovery-reentry-entrypoint-audit\'')
    expect(source).toContain('from \'./recovery-reentry-entrypoint-candidate-audit\'')
    expect(source).toContain('collectAlicizationRecoveryReentryCandidateFiles(')
    expect(source).toContain('resolveAlicizationRecoveryReentryAuditedFiles(')
    expect(/^function collectRecoveryReentryCandidateFiles\(/m.test(source)).toBe(false)
  })

  it('keeps a broader recovery reentry candidate scan aligned with the explicit audit registry so future accepted-start, timeout-fallback, or lifecycle-recovery reopen seams are harder to add without classification', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const candidateFiles = collectAlicizationRecoveryReentryCandidateFiles(rootDir)
    const auditedFiles: Set<string> = new Set(resolveAlicizationRecoveryReentryAuditedFiles())
    const uncoveredCandidates = candidateFiles.filter(relativePath => !auditedFiles.has(relativePath))

    expect(candidateFiles.length).toBeGreaterThan(4)
    expect(uncoveredCandidates).toEqual([])
  }, 20_000)

  it('keeps the shared top-level completeness-guard family registry synchronized with the adjacent route-authority scanners so new families cannot register in one place and disappear from the other', () => {
    const source = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const familySourceAnchors = {
      'chat-start': [
        'collectAlicizationChatStartCandidateFiles(',
        'resolveAlicizationChatStartPayloadAuditedFiles(',
      ],
      'cross-surface-dialogue-entry': [
        'collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles(',
        'collectAlicizationPreDialogueTransportGovernedFiles(',
        'collectRendererChatEntryGovernedFiles(',
      ],
      'return-side-project-awareness': [
        'collectAlicizationReturnSideProjectAwarenessCandidateFiles(',
        'resolveAlicizationReturnSideProjectAwarenessAuditFiles(',
      ],
      'recovery-reentry': [
        'collectAlicizationRecoveryReentryCandidateFiles(',
        'resolveAlicizationRecoveryReentryAuditedFiles(',
      ],
      'provider-consumer': [
        'collectAlicizationProviderConsumerCandidateFiles(',
        'resolveAlicizationProjectStateProviderConsumerAuditFiles(',
        'collectAlicizationDirectProviderImportFiles(',
      ],
      'autonomous-dialogue': [
        'collectAlicizationAutonomousDialogueCandidateFiles(',
        'collectAlicizationAutonomousDialogueGovernedFiles(',
      ],
      'execution-preflight': [
        'collectAlicizationExecutionPreflightCandidateFiles(',
        'resolveAlicizationExecutionPreflightAuditedFiles(',
      ],
      'execution-dispatch': [
        'collectAlicizationExecutionDispatchCandidateFiles(',
        'resolveAlicizationTaskThreadDispatchOwnerAuditFiles(',
      ],
      'execution-follow-up-continuity': [
        'collectAlicizationExecutionFollowUpCandidateFiles(',
        'resolveAlicizationExecutionFollowUpContinuityAuditFiles(',
      ],
      'runtime-dialogue-normalization': [
        'collectAlicizationRuntimeDialogueNormalizationFiles(',
        'resolveAlicizationRuntimeDialogueNormalizationAuditedFiles(',
      ],
    } as const

    const families = resolveAlicizationProjectAwarenessTopLevelCompletenessGuardFamilies()

    expect(families.map(entry => entry.id)).toEqual(Object.keys(familySourceAnchors))

    for (const family of families) {
      const anchors = familySourceAnchors[family.id]
      expect(anchors.length).toBeGreaterThan(0)

      for (const anchor of anchors)
        expect(source).toContain(anchor)
    }
  })

  it('keeps every current project-awareness route-authority seam, including cross-surface pre-dialogue boundaries, covered by at least one explicit audit registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    const discoveredFiles = [
      ...collectAlicizationChatStartCandidateFiles(rootDir),
      ...collectAlicizationCrossSurfaceProjectAwarenessEntrypointCandidateFiles(rootDir),
      ...collectAlicizationReturnSideProjectAwarenessCandidateFiles(rootDir),
      ...collectAlicizationPreDialogueTransportGovernedFiles(),
      ...collectRendererChatEntryGovernedFiles(),
      ...resolveAlicizationProjectRouteAuthorityFiles(),
      ...collectAlicizationRuntimeDialogueNormalizationFiles(rootDir),
      ...collectAlicizationRuntimeTurnPersistenceFiles(rootDir),
      ...collectAlicizationDirectProviderImportFiles(rootDir),
      ...collectAlicizationProviderConsumerCandidateFiles(rootDir),
      ...collectAlicizationAutonomousDialogueCandidateFiles(rootDir),
      ...collectAlicizationExecutionPreflightCandidateFiles(rootDir),
      ...collectAlicizationExecutionDispatchCandidateFiles(rootDir),
      ...collectAlicizationExecutionFollowUpCandidateFiles(rootDir),
      ...collectAlicizationRecoveryReentryCandidateFiles(rootDir),
    ].sort()

    const auditedFiles: Set<string> = new Set([
      ...resolveAlicizationChatStartPayloadAuditedFiles(),
      ...resolveAlicizationChatStartDeepHelperOwnerAuditFiles(),
      ...resolveAlicizationChatEntryComposerSurfaceAuditFiles(),
      ...resolveAlicizationPreDialogueTransportAuditFiles(),
      ...resolveAlicizationReturnSideProjectAwarenessAuditFiles(),
      ...resolveAlicizationRuntimeDialogueNormalizationAuditedFiles(),
      ...resolveAlicizationRuntimeTurnPersistenceAuditedFiles(),
      ...resolveAlicizationDirectProviderImportAuditFiles(),
      ...resolveAlicizationProjectStateProviderConsumerAuditFiles(),
      ...resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('autonomous-dialogue'),
      ...resolveAlicizationExecutionPreflightAuditedFiles(),
      ...resolveAlicizationTaskThreadDispatchOwnerAuditFiles(),
      ...resolveAlicizationExecutionFollowUpContinuityAuditFiles(),
      ...resolveAlicizationRecoveryReentryAuditedFiles(),
      ...resolveRendererChatEntryAwarenessAuditFiles(),
    ])

    const missing = [...new Set(discoveredFiles)]
      .filter(relativePath => !auditedFiles.has(relativePath))
      .sort()

    expect(discoveredFiles.length).toBeGreaterThan(20)
    expect(missing).toEqual([])
  }, 20_000)

  it('keeps the documented matrix on memory ownership and transparent failure boundaries', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('WorkingMemory')
    expect(matrixSource).toContain('LongTermMemoryRecall')
    expect(matrixSource).toContain('MemoryWorkbench')
    expect(matrixSource).toContain('Report timeout, provider failure, tool failure, and invalid structured output directly.')
    expect(matrixSource).toContain('Fixed reply openings.')
  })
})
