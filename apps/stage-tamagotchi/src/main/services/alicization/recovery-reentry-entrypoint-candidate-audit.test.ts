import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationRecoveryReentryAuditedFiles,
} from './recovery-reentry-entrypoint-audit'
import {
  collectAlicizationRecoveryReentryCandidateFiles,
} from './recovery-reentry-entrypoint-candidate-audit'

describe('recovery reentry entrypoint candidate audit', () => {
  it('keeps broader recovery reentry candidate discovery sourced from the shared audited helper instead of re-encoding one more local start-result or timeout-recovery scan', () => {
    const source = readFileSync(new URL('./recovery-reentry-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./recovery-reentry-entrypoint-audit\'')
    expect(source).toContain('resolveAlicizationRecoveryReentryAuditedFiles()')
    expect(/^function resolveAlicizationRecoveryReentryAuditedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader recovery reentry candidate discovery broad enough to catch accepted-start settlement, timeout fallback reconstruction, lifecycle recovery finish, start-result owner, and background recovery driver instead of only one recovery seam flavor', () => {
    const source = readFileSync(new URL('./recovery-reentry-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const startResultSource = readFileSync(new URL('./main-chat-start-result.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const timeoutFallbackSource = readFileSync(new URL('./main-chat-timeout-fallback.ts', import.meta.url), 'utf8')
    const lifecycleSource = readFileSync(new URL('./main-chat-run-lifecycle.ts', import.meta.url), 'utf8')
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')

    expect(startResultSource).toContain('export async function resolveAlicizationMainChatStartResult(')
    expect(runtimeSource).toContain('resolveAlicizationMainChatStartResult({')
    expect(timeoutFallbackSource).toContain('export function buildAlicizationMainGatewayTimeoutFallbackReply(')
    expect(lifecycleSource).toContain('export async function handleAlicizationMainChatRunFailure(')
    expect(backgroundSource).toContain('handleAlicizationMainChatRunFailure({')
    expect(source).toContain('export async function resolveAlicizationMainChatStartResult\\(')
    expect(source).toContain('resolveAlicizationMainChatStartResult\\(\\{')
    expect(source).toContain('export function buildAlicizationMainGatewayTimeoutFallbackReply\\(')
    expect(source).toContain('export async function handleAlicizationMainChatRunFailure\\(')
    expect(source).toContain('handleAlicizationMainChatRunFailure\\(\\{')
  })

  it('keeps the current recovery reentry candidate set equal to the explicit audited files so the broader scan and explicit registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationRecoveryReentryCandidateFiles(rootDir)).toEqual(
      resolveAlicizationRecoveryReentryAuditedFiles().slice().sort(),
    )
  })

  it('makes the current boundary explicit: broader recovery reentry candidates now feed the same top-level completeness guard, while future recovery reentry families still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./recovery-reentry-entrypoint-audit\'')
    expect(routeAuthoritySource).toContain('from \'./recovery-reentry-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationRecoveryReentryCandidateFiles(')
    expect(coverageSource).toContain('recovery-reentry-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('recovery-reentry-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future recovery reentry families still need explicit classification')
  })
})
