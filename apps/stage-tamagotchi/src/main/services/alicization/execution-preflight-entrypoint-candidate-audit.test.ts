import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectAlicizationExecutionPreflightGovernedFiles,
} from './execution-preflight-entrypoint-audit'
import {
  collectAlicizationExecutionPreflightCandidateFiles,
} from './execution-preflight-entrypoint-candidate-audit'

describe('execution preflight entrypoint candidate audit', () => {
  it('keeps broader execution-preflight candidate discovery sourced from the shared governed helper instead of re-encoding one more local execution-runtime-context scan', () => {
    const source = readFileSync(new URL('./execution-preflight-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./execution-preflight-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationExecutionPreflightGovernedFiles(')
    expect(/^function collectExecutionPreflightGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader execution-preflight candidate discovery broad enough to catch briefing authority, runtime-context authority, runtime-owned direct dispatch bridge, session bridge, subconscious autonomy execution bridge, resume bridge, capability briefing surface, dispatch persistence, and blocked-dispatch safety gates instead of only one execution seam flavor', () => {
    const source = readFileSync(new URL('./execution-preflight-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const agentRuntimeSource = readFileSync(new URL('./agent-runtime.ts', import.meta.url), 'utf8')
    const runtimeContextSource = readFileSync(new URL('./execution-runtime-context.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')
    const runtimeSubconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')
    const executorRuntimeSource = readFileSync(new URL('./executor-runtime.ts', import.meta.url), 'utf8')
    const executionSurfaceSource = readFileSync(new URL('./main-chat-execution-surface.ts', import.meta.url), 'utf8')
    const dispatcherSource = readFileSync(new URL('./task-thread-dispatcher.ts', import.meta.url), 'utf8')
    const codexAdapterSource = readFileSync(new URL('./executor-adapters/codex.ts', import.meta.url), 'utf8')
    const claudeCodeAdapterSource = readFileSync(new URL('./executor-adapters/claude-code.ts', import.meta.url), 'utf8')

    expect(agentRuntimeSource).toContain('buildAlicizationExecutionRuntimeContext(')
    expect(runtimeContextSource).toContain('buildAlicizationExecutionRuntimeContext(')
    expect(runtimeSource).toContain('async function ensureDispatchInvocationRuntimeContext(')
    expect(runtimeSource).toContain('buildRuntimeOwnedExecutionRuntimeContext({')
    expect(sessionRuntimeSource).toContain('buildExecutionRuntimeContext: async (toolContext) => {')
    expect(runtimeSubconsciousSource).toContain('buildExecutionRuntimeContext: async ({')
    expect(runtimeSubconsciousSource).toContain('}) => await backgroundAgentTurn.buildExecutionRuntimeContext({')
    expect(executorRuntimeSource).toContain('function buildResumeDispatchPayload(input: {')
    expect(executionSurfaceSource).toContain('[ALICIZATION_PROJECT_BRIEFING]')
    expect(dispatcherSource).toContain('persistExecutionRuntimeContext(')
    expect(codexAdapterSource).toContain('function buildBlockedDispatchSafetyGate(')
    expect(claudeCodeAdapterSource).toContain('function buildBlockedDispatchSafetyGate(')
    expect(source).toContain('buildAlicizationExecutionRuntimeContext\\(')
    expect(source).toContain('ensureDispatchInvocationRuntimeContext\\(')
    expect(source).toContain('buildExecutionRuntimeContext:')
    expect(source).toContain('buildResumeDispatchPayload\\(')
    expect(source).toContain('\\[ALICIZATION_PROJECT_BRIEFING\\]')
    expect(source).toContain('persistExecutionRuntimeContext\\(')
    expect(source).toContain('buildBlockedDispatchSafetyGate\\(')
  })

  it('keeps the current execution-preflight candidate set equal to the explicit governed files so the broader scan and audited registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationExecutionPreflightCandidateFiles(rootDir)).toEqual(
      collectAlicizationExecutionPreflightGovernedFiles(rootDir),
    )
  })

  it('makes the current boundary explicit: broader execution-preflight candidates now feed the same top-level completeness guard, while future execution-preflight families still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./execution-preflight-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationExecutionPreflightCandidateFiles(')
    expect(coverageSource).toContain('execution-preflight-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('execution-preflight-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('runtime-owned direct dispatch bridge')
    expect(matrixSource).toContain('subconscious-autonomy execution bridge')
    expect(matrixSource).toContain('blocked-dispatch safety gates')
    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')
  })
})
