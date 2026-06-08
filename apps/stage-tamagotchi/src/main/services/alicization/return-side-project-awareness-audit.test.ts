import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  alicizationReturnSideBrowserObservationPersistenceFiles,
  alicizationReturnSideChatStreamIngestFiles,
  alicizationReturnSideProjectStateObservationReducerFiles,
  alicizationReturnSideRendererMetaBridgeFiles,
  alicizationReturnSideSessionSanitizationFiles,
  alicizationReturnSideStructuredNormalizationFiles,
  resolveAlicizationReturnSideProjectAwarenessAuditFiles,
  resolveAlicizationReturnSideProjectAwarenessAuditMode,
  resolveAlicizationReturnSideProjectAwarenessAuditRegistry,
} from './return-side-project-awareness-audit'

describe('return-side-project-awareness-audit', () => {
  it('keeps return-side registry sourced from the shared route-authority helper instead of a local parallel array', () => {
    const source = readFileSync(new URL('./return-side-project-awareness-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./project-state-brief\'')
    expect(source).toContain('resolveAlicizationProjectRouteAuthorityRegistry()')
    expect(source).not.toContain('const alicizationReturnSideProjectAwarenessAuditRegistry = [')
  })

  it('keeps every return-side project-awareness bridge explicitly registered', () => {
    const expectedFiles = [
      '../../../renderer/App.vue',
      '../../../renderer/alicization-chat-stream-bridge.ts',
      '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.ts',
      '../../../../../../packages/stage-ui/src/stores/alicization-browser-bridge.ts',
      '../../../../../../packages/stage-ui/src/stores/chat.ts',
      '../../../../../../packages/stage-ui/src/stores/chat/session-store.ts',
      '../../../../../../packages/stage-ui/src/stores/project-state-observation.ts',
    ].sort()

    expect(resolveAlicizationReturnSideProjectAwarenessAuditFiles().slice().sort()).toEqual(expectedFiles)
    expect(resolveAlicizationReturnSideProjectAwarenessAuditRegistry().map(entry => entry.relativePath).sort()).toEqual(expectedFiles)
  })

  it('requires renderer meta bridges to normalize project state and pre-dialogue awareness before emitting stream meta', () => {
    for (const relativePath of alicizationReturnSideRendererMetaBridgeFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath)).toBe('renderer-meta-bridge')
      expect(source).toContain('normalizeStructuredProjectStatePayload(')
      expect(source).toContain('normalizeStructuredPreDialogueAwarenessPayload(')
      expect(source).toContain('normalizeStructuredPreDialogueClosurePayload(')
    }
  })

  it('requires desktop observation bridges to preserve richer project-state observation and continuity snapshots before later turns reopen', () => {
    for (const relativePath of resolveAlicizationReturnSideProjectAwarenessAuditFiles().filter(path => path === '../../../renderer/App.vue')) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath)).toBe('renderer-observation-bridge')
      expect(source).toContain('readConversationTurnProjectStateObservation({')
      expect(source).toContain('getProjectStateContinuitySnapshot: async () => projectStateObservationToContinuitySnapshot(')
    }
  })

  it('requires structured normalization authorities to define the canonical project-awareness payload normalizers', () => {
    for (const relativePath of alicizationReturnSideStructuredNormalizationFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath)).toBe('structured-normalization')
      expect(source).toContain('export function normalizeStructuredProjectStatePayload(')
      expect(source).toContain('export function normalizeStructuredPreDialogueAwarenessPayload(')
      expect(source).toContain('export function normalizeStructuredPreDialogueClosurePayload(')
    }
  })

  it('requires chat-stream ingest boundaries to keep return-side project awareness alive in active turn state', () => {
    for (const relativePath of alicizationReturnSideChatStreamIngestFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath)).toBe('chat-stream-ingest')
      expect(source).toContain('turnProjectState = normalizeStructuredProjectStatePayload(')
      expect(source).toContain('turnPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(')
      expect(source).toContain('event.projectState ?? event.runtimeDigest?.projectState')
    }
  })

  it('requires session sanitization boundaries to preserve project awareness on rebuilt assistant history', () => {
    for (const relativePath of alicizationReturnSideSessionSanitizationFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath)).toBe('session-sanitization')
      expect(source).toContain('normalizeStructuredProjectStatePayload(')
      expect(source).toContain('normalizeStructuredPreDialogueAwarenessPayload(')
      expect(source).toContain('maybeBackfillRestoredPreDialogueAwareness(')
      expect(source).toContain('projectState: restoredProjectState')
      expect(source).toContain('preDialogueAwareness: restoredPreDialogueAwareness')
    }
  })

  it('requires browser observation persistence boundaries to retain project awareness and closure snapshots for later continuity', () => {
    for (const relativePath of alicizationReturnSideBrowserObservationPersistenceFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath)).toBe('browser-observation-persistence')
      expect(source).toContain('readConversationTurnProjectStateObservation(')
      expect(source).toContain('projectStateObservationToContinuitySnapshot(')
    }
  })

  it('requires project-state observation reducers to preserve richer return-side project awareness before continuity snapshots are rebuilt', () => {
    for (const relativePath of alicizationReturnSideProjectStateObservationReducerFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath)).toBe('project-state-observation-reducer')
      expect(source).toContain('export function readConversationTurnProjectStateObservation(')
      expect(source).toContain('normalizeStructuredProjectStatePayload(projectState)')
      expect(source).toContain('normalizeStructuredPreDialogueAwarenessPayload(preDialogueAwareness)')
      expect(source).toContain('projectStateAudit?.preDialogueAwarenessSummary')
      expect(source).toContain('projectStateAudit?.continuitySummary')
      expect(source).toContain('const strongerPreDialogueAwarenessSummary')
      expect(source).toContain('const strongerContinuitySummary')
      expect(source).toContain('const summaryLine = shouldPreferRicherProjectAwareSummary')
      expect(source).toContain('? strongerContinuitySummary')
      expect(source).toContain(': preferredAwarenessSummaryLine')
      expect(source).toContain('|| strongerContinuitySummary')
      expect(source).toContain('export function projectStateObservationToContinuitySnapshot(')
    }
  })
})
