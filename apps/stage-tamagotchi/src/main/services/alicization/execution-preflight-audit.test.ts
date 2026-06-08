import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationExecutionPreflightAuditedFiles,
  resolveAlicizationExecutionPreflightAuditRegistry,
  resolveAlicizationExecutionPreflightMode,
} from './execution-preflight-audit'
import { collectAlicizationExecutionPreflightGovernedFiles } from './execution-preflight-entrypoint-audit'

describe('execution-preflight-audit', () => {
  it('reuses the shared execution-preflight entrypoint scanner instead of maintaining a local execution runtime-context scan copy', () => {
    const source = readFileSync(new URL('./execution-preflight-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./execution-preflight-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationExecutionPreflightGovernedFiles(')
    expect(/^function collectExecutionPreflightFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every current execution-preflight authority seam explicitly registered', () => {
    const discoveredFiles = collectAlicizationExecutionPreflightGovernedFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationExecutionPreflightAuditedFiles().slice().sort())
    expect(resolveAlicizationExecutionPreflightAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('requires execution-briefing authority files to build canonical project briefing before execution runtime context exists', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'execution-briefing-authority')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('execution-briefing-authority')
      expect(source).toContain('resolveAlicizationProjectStateBrief()')
      expect(source).toContain('return buildAlicizationExecutionRuntimeContext({')
      expect(source).toContain('projectBriefing: identity?.projectBriefing ?? {')
      expect(source).toContain('sameHerHoldDetail: projectStateBrief?.sameHerHoldDetail ?? null')
      expect(source).toContain('proactiveSameHerGap: projectStateBrief?.proactiveSameHerGap ?? null')
      expect(source).toContain('continuityCue: projectStateBrief?.continuityCue ?? null')
      expect(source).toContain('preDialogueAwarenessLine: projectStateBrief?.preDialogueAwarenessLine ?? null')
    }
  })

  it('requires runtime-context authority files to canonicalize project briefing and same-her awareness before dispatch begins', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'runtime-context-authority')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('runtime-context-authority')
      expect(source).toContain('resolveAlicizationProjectStateSnapshot({')
      expect(source).toContain('proactiveSameHerGap: resolvedProjectBriefing.proactiveSameHerGap ?? null')
      expect(source).toContain('proactiveSameHerGap: fallbackProjectBrief.proactiveSameHerGap ?? null')
      expect(source).toContain('buildAlicizationProjectPreDialogueAwarenessLine({')
      expect(source).toContain('isAlicizationThinProjectAwarenessLine(rawInputAwarenessLine)')
      expect(source).toContain('normalizedProjectBriefing?.preflightSummary')
    }
  })

  it('requires session-bound execution bridge files to request execution runtime context before main-gateway tools open outward', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'session-bound-execution-bridge')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('session-bound-execution-bridge')
      expect(source).toContain('buildExecutionRuntimeContext: async (toolContext) => {')
      expect(source).toContain('return await agentTurn.buildExecutionRuntimeContext({')
      expect(source).toContain('projectBriefing: executionRuntimeProjectBriefing ?? undefined')
      expect(source).toContain('executionRuntimeProjectBriefing = runtimeSurfaceForBuilder')
      expect(source).toContain('buildExecutionRuntimeContext: sessionBoundToolOptions.buildExecutionRuntimeContext,')
    }
  })

  it('requires runtime-owned dispatch bridge files to rebuild canonical execution runtime context before direct execution redispatch opens outward', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'runtime-dispatch-execution-bridge')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('runtime-dispatch-execution-bridge')
      expect(source).toContain('async function ensureDispatchInvocationRuntimeContext(')
      expect(source).toContain('const runtimeContext = await buildRuntimeOwnedExecutionRuntimeContext({')
      expect(source).toContain('if (resolveDispatchPayloadRuntimeContext(invocation.input))')
      expect(source).toContain('if (!thread || resolveStoredDispatchRuntimeContext(thread))')
      expect(source).toContain('action: \'runtime-context-build-failed\'')
    }
  })

  it('requires subconscious autonomy execution bridge files to request canonical execution runtime context before background auto-dispatch opens outward', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'subconscious-autonomy-execution-bridge')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('subconscious-autonomy-execution-bridge')
      expect(source).toContain('autonomyActuation = await runAutonomyActuation({')
      expect(source).toContain('buildExecutionRuntimeContext: async ({')
      expect(source).toContain('}) => await backgroundAgentTurn.buildExecutionRuntimeContext({')
      expect(source).toContain('sensorySnapshot,')
    }
  })

  it('requires resume-dispatch bridge files to keep same-her project briefing explicit before confirmed execution threads resume outward', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.relativePath === 'executor-runtime.ts')

    expect(entries).toHaveLength(1)
    expect(resolveAlicizationExecutionPreflightAuditedFiles()).toContain('executor-runtime.ts')

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('resume-dispatch-bridge')
      expect(source).toContain('function buildResumeDispatchPayload(input: {')
      expect(source).toContain('const storedProjectBriefing = metadata?.execution?.runtimeContext?.projectBriefing')
      expect(source).toContain('const fallbackProjectBrief = resolveAlicizationProjectStateBrief()')
      expect(source).toContain('Execution guidance must stay inside the same digital life project, the same Phase 1 proving ground, and the same still-open closure work.')
    }
  })

  it('requires execution-capability project-briefing surfaces to keep same-her project briefing explicit before answering capability or routing questions', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'capability-project-briefing-surface')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('capability-project-briefing-surface')
      expect(source).toContain('[ALICIZATION_PROJECT_BRIEFING]')
      expect(source).toContain('Before answering execution capability or routing questions, keep this project-state briefing explicit.')
      expect(source).toContain('Execution guidance must stay inside the same digital life project')
    }
  })

  it('requires pre-dispatch persistence files to carry execution runtime context into thread metadata before execution starts', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'pre-dispatch-persistence')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('pre-dispatch-persistence')
      expect(source).toContain('async function persistExecutionRuntimeContext(')
      expect(source).toContain('function preferDispatchProjectSameHerHoldDetail(input: {')
      expect(source).toContain('looksLikeGenericDispatchSameHerHoldDetail(payloadSameHerHoldDetail)')
      expect(source).toContain('runtimeContext: input.runtimeContext,')
      expect(source).toContain('project_continuity=')
    }
  })

  it('requires blocked-dispatch safety gates to audit risk policy, confirmation requirement, interruptibility, and same-her runtime context before adapters refuse execution', () => {
    const entries = resolveAlicizationExecutionPreflightAuditRegistry()
      .filter(entry => entry.mode === 'blocked-dispatch-safety-gate')
    const permissionHelperSource = readFileSync(new URL('./executor-adapters/thread-permission.ts', import.meta.url), 'utf8')

    expect(entries.map(entry => entry.relativePath).sort()).toEqual([
      'executor-adapters/claude-code.ts',
      'executor-adapters/cli.ts',
      'executor-adapters/codex.ts',
      'executor-adapters/openclaw.ts',
    ])

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationExecutionPreflightMode(entry.relativePath)).toBe('blocked-dispatch-safety-gate')
      expect(source).toContain('function buildBlockedDispatchSafetyGate(')
      expect(source).toContain('confirmationRequired: true')
      expect(source).toContain('auditability: \'blocked-before-dispatch\'')
      expect(source).toContain('normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)')
      expect(source).toContain('runtimeContext,')

      if (entry.relativePath === 'executor-adapters/openclaw.ts')
        expect(source).toContain('interruptibility: \'no-network-request-started\'')
      else
        expect(source).toContain('interruptibility: \'no-process-started\'')

      if (entry.relativePath === 'executor-adapters/claude-code.ts' || entry.relativePath === 'executor-adapters/codex.ts')
        expect(source).toContain('isLowRiskAutonomousCodeAgentSelfStartThread(input.thread)')
    }

    expect(permissionHelperSource).toContain('function hasAutonomousThreadOwnershipProof(')
    expect(permissionHelperSource).toContain('hasStructuralOwnership: autonomousDialogueFamily.matchedBy.includes(\'turn-id-prefix\')')
    expect(permissionHelperSource).toContain('if (!autonomousDialogueFamily.isAutonomous || !hasStructuralOwnership)')
  })
})
