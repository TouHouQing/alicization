import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectAlicizationChatStartGovernedFiles,
} from './chat-start-entrypoint-audit'
import {
  collectAlicizationChatStartCandidateFiles,
} from './chat-start-entrypoint-candidate-audit'

describe('chat-start entrypoint candidate audit', () => {
  it('keeps broader chat-start candidate discovery sourced from the shared governed helper instead of re-encoding one more local main-process start scan', () => {
    const source = readFileSync(new URL('./chat-start-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./chat-start-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationChatStartGovernedFiles(')
    expect(/^function collectChatStartGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader chat-start candidate discovery broad enough to catch typed consumers, normalization callers, and deeper helper owners instead of only one main-process start seam flavor', () => {
    const source = readFileSync(new URL('./chat-start-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const directStartSource = readFileSync(new URL('./main-chat-direct-start.ts', import.meta.url), 'utf8')
    const invokeHandlersSource = readFileSync(new URL('./runtime-invoke-handlers-chat.ts', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')

    expect(directStartSource).toContain('AlicizationChatStartPayload')
    expect(directStartSource).toContain('startMainChatStream(')
    expect(invokeHandlersSource).toContain('startMainChatStream(')
    expect(sessionRuntimeSource).toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity(')
    expect(runtimeSource).toContain('prepareMainChatPrelude(')
    expect(runtimeSource).toContain('prepareMainChatExecution(')
    expect(backgroundSource).toContain('buildAlicizationMainGatewayTimeoutFallbackReply(')
    expect(source).toContain('AlicizationChatStartPayload')
    expect(source).toContain('startMainChatStream\\(')
    expect(source).toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity\\(')
    expect(source).toContain('prepareMainChatPrelude\\(')
    expect(source).toContain('prepareMainChatExecution\\(')
    expect(source).toContain('buildAlicizationMainGatewayTimeoutFallbackReply\\(')
  })

  it('keeps the current chat-start candidate set equal to the explicit governed files so the broader main-process start scan and audit registries stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationChatStartCandidateFiles(rootDir)).toEqual(
      collectAlicizationChatStartGovernedFiles(rootDir),
    )
  }, 20_000)

  it('makes the current boundary explicit: broader chat-start candidates now feed the same top-level completeness guard, while future main-process chat-start entry shapes still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./chat-start-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationChatStartCandidateFiles(')
    expect(coverageSource).toContain('chat-start-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('chat-start-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future main-process chat-start entry shapes still need explicit classification')
  })
})
