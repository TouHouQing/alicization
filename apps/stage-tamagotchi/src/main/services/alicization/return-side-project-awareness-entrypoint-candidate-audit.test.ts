import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationReturnSideProjectAwarenessAuditFiles,
} from './return-side-project-awareness-audit'
import {
  collectAlicizationReturnSideProjectAwarenessCandidateFiles,
} from './return-side-project-awareness-entrypoint-candidate-audit'

describe('return-side project awareness entrypoint candidate audit', () => {
  it('keeps broader return-side project-awareness candidate discovery sourced from the shared audited helper instead of re-encoding one more local reopen-time scan', () => {
    const source = readFileSync(new URL('./return-side-project-awareness-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./return-side-project-awareness-audit\'')
    expect(source).toContain('resolveAlicizationReturnSideProjectAwarenessAuditFiles(')
    expect(/^function collectReturnSideProjectAwarenessAuditFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader return-side project-awareness candidate discovery broad enough to catch renderer observation bridges, renderer meta normalization, structured payload normalization, chat-stream ingest, session sanitization, browser-side observation persistence, observation reducers, and inspector fallback rebuild seams instead of only one rebuild seam flavor', () => {
    const source = readFileSync(new URL('./return-side-project-awareness-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const appSource = readFileSync(new URL('../../../renderer/App.vue', import.meta.url), 'utf8')
    const streamBridgeSource = readFileSync(new URL('../../../renderer/alicization-chat-stream-bridge.ts', import.meta.url), 'utf8')
    const structuredOutputSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/composables/alicization-structured-output.ts', import.meta.url), 'utf8')
    const chatStoreSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat.ts', import.meta.url), 'utf8')
    const sessionStoreSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat/session-store.ts', import.meta.url), 'utf8')
    const browserBridgeSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/alicization-browser-bridge.ts', import.meta.url), 'utf8')
    const observationSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/project-state-observation.ts', import.meta.url), 'utf8')
    const inspectorSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/alicization-self-evolution-inspector.ts', import.meta.url), 'utf8')

    expect(appSource).toContain('readConversationTurnProjectStateObservation({')
    expect(appSource).toContain('getProjectStateContinuitySnapshot: async () => projectStateObservationToContinuitySnapshot(')
    expect(streamBridgeSource).toContain('normalizeStructuredPreDialogueClosurePayload(')
    expect(structuredOutputSource).toContain('export function normalizeStructuredProjectStatePayload(')
    expect(structuredOutputSource).toContain('export function normalizeStructuredPreDialogueAwarenessPayload(')
    expect(structuredOutputSource).toContain('export function normalizeStructuredPreDialogueClosurePayload(')
    expect(chatStoreSource).toContain('turnProjectState = normalizeStructuredProjectStatePayload(')
    expect(chatStoreSource).toContain('turnPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(')
    expect(sessionStoreSource).toContain('maybeBackfillRestoredPreDialogueAwareness(')
    expect(browserBridgeSource).toContain('readConversationTurnProjectStateObservation(turns[index])')
    expect(observationSource).toContain('export function projectStateObservationToContinuitySnapshot(')
    expect(inspectorSource).toContain('getLatestProjectStateObservation')
    expect(inspectorSource).toContain('projectStateObservationToContinuitySnapshot(')
    expect(source).toContain('readConversationTurnProjectStateObservation\\\\(')
    expect(source).toContain('normalizeStructuredPreDialogueClosurePayload\\\\(')
    expect(source).toContain('export function normalizeStructuredProjectStatePayload\\\\(')
    expect(source).toContain('turnProjectState = normalizeStructuredProjectStatePayload\\\\(')
    expect(source).toContain('maybeBackfillRestoredPreDialogueAwareness\\\\(')
    expect(source).toContain('projectStateObservationToContinuitySnapshot\\\\(nextProjectStateObservation\\\\)')
    expect(source).toContain('getLatestProjectStateObservation')
  })

  it('keeps the current return-side project-awareness candidate set equal to the explicit audited files so the broader reopen-time scan and audit registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationReturnSideProjectAwarenessCandidateFiles(rootDir)).toEqual(
      resolveAlicizationReturnSideProjectAwarenessAuditFiles().slice().sort(),
    )
  }, 15000)

  it('makes the current boundary explicit: broader return-side project-awareness candidates now feed the same top-level completeness guard, while future reopen-time route shapes still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./return-side-project-awareness-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationReturnSideProjectAwarenessCandidateFiles(')
    expect(coverageSource).toContain('return-side-project-awareness-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('return-side-project-awareness-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future reopen-time route shapes still need explicit classification')
  })
})
