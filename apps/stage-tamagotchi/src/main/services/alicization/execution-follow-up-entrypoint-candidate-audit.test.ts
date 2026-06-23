import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationExecutionFollowUpContinuityAuditFiles,
} from './execution-follow-up-entrypoint-audit'
import {
  collectAlicizationExecutionFollowUpCandidateFiles,
} from './execution-follow-up-entrypoint-candidate-audit'

describe('execution follow-up entrypoint candidate audit', () => {
  it('keeps broader execution follow-up continuity candidate discovery sourced from the shared audited helper instead of re-encoding one more local callback or follow-up scan', () => {
    const source = readFileSync(new URL('./execution-follow-up-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./execution-follow-up-entrypoint-audit\'')
    expect(source).toContain('resolveAlicizationExecutionFollowUpContinuityAuditFiles()')
    expect(/^function resolveExecutionFollowUpContinuityAuditFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader execution follow-up continuity candidate discovery broad enough to catch callback runtime, callback doctrine, callback payoff, ledger reopen, live follow-up assembly, afterglow learning, and callback persistence seams instead of only one callback-return flavor', () => {
    const source = readFileSync(new URL('./execution-follow-up-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const callbackRuntimeSource = readFileSync(new URL('./execution-callback-runtime.ts', import.meta.url), 'utf8')
    const consciousFrameSource = readFileSync(new URL('./current-conscious-frame.ts', import.meta.url), 'utf8')
    const deliveryRuntimeSource = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')
    const deliverySurfaceSource = readFileSync(new URL('./execution-delivery-surface.ts', import.meta.url), 'utf8')
    const obligationSource = readFileSync(new URL('./main-chat-execution-reply-obligation.ts', import.meta.url), 'utf8')
    const responseContractSource = readFileSync(new URL('./response-surface-contract.ts', import.meta.url), 'utf8')
    const ledgerSource = readFileSync(new URL('./memory-ledger-runtime.ts', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')
    const learningSource = readFileSync(new URL('./execution-interaction-learning.ts', import.meta.url), 'utf8')
    const remindersSource = readFileSync(new URL('./runtime-delivery-reminders.ts', import.meta.url), 'utf8')

    expect(callbackRuntimeSource).toContain('export function createAlicizationExecutionCallbackRuntime(')
    expect(consciousFrameSource).toContain('execution-callback-doctrine:')
    expect(deliveryRuntimeSource).toContain('Execution callback delivery must stay inside the same digital life project line')
    expect(deliverySurfaceSource).toContain('export function buildAlicizationExecutionPayoffPrompt(')
    expect(obligationSource).toContain('export function deriveMainChatExecutionReplyObligation(')
    expect(responseContractSource).toContain('executionReplyObligation?: AlicizationMainChatExecutionReplyObligation | null')
    expect(responseContractSource).toContain('execution-callback-doctrine:')
    expect(ledgerSource).toContain('export function createAlicizationMemoryLedgerRuntime(')
    expect(sessionRuntimeSource).toContain('buildMainChatExecutionReplyObligationSystemBlock(')
    expect(sessionRuntimeSource).toContain('deriveMainChatExecutionReplyObligation({')
    expect(learningSource).toContain('callback-afterglow-hold')
    expect(remindersSource).toContain('const callbackAfterglowHold = deliveryPolicy.reasonTags.includes(\'callback-afterglow-hold\')')
    expect(remindersSource).toContain('kind: \'execution-callback\'')
    expect(source).toContain('export function createAlicizationExecutionCallbackRuntime\\(')
    expect(source).toContain('execution-callback-doctrine:')
    expect(source).toContain('Execution callback delivery must stay inside the same digital life project line')
    expect(source).toContain('export function buildAlicizationExecutionPayoffPrompt\\(')
    expect(source).toContain('export function deriveMainChatExecutionReplyObligation\\(')
    expect(source).toContain('buildMainChatExecutionReplyObligationSystemBlock\\(')
    expect(source).toContain('export function createAlicizationMemoryLedgerRuntime\\(')
    expect(source).toContain('callback-afterglow-hold')
  })

  it('keeps broader execution follow-up continuity candidate discovery independently aware of callback capability briefing and response-surface callback carry surfaces instead of only inheriting them from the explicit registry union', () => {
    const source = readFileSync(new URL('./execution-follow-up-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const executionSurfaceSource = readFileSync(new URL('./main-chat-execution-surface.ts', import.meta.url), 'utf8')
    const responseContractSource = readFileSync(new URL('./response-surface-contract.ts', import.meta.url), 'utf8')

    expect(executionSurfaceSource).toContain('Before answering execution capability or routing questions, keep this project-state briefing explicit.')
    expect(responseContractSource).toContain('executionReplyObligation: input.executionReplyObligation ?? null')
    expect(source).toContain('Before answering execution capability or routing questions, keep this project-state briefing explicit\\.')
    expect(source).toContain('executionReplyObligation: input\\.executionReplyObligation \\?\\? null')
  })

  it('keeps the current execution follow-up continuity candidate set equal to the explicit audited files so the broader callback-return scan and explicit registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationExecutionFollowUpCandidateFiles(rootDir)).toEqual(
      resolveAlicizationExecutionFollowUpContinuityAuditFiles().slice().sort(),
    )
  })

  it('makes the current boundary explicit: broader execution follow-up continuity candidates now feed the same top-level completeness guard, while future execution follow-up families still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./execution-follow-up-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationExecutionFollowUpCandidateFiles(')
    expect(coverageSource).toContain('execution-follow-up-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('execution-follow-up-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future execution follow-up families still need explicit registration')
  })
})
