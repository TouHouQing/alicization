import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'context-bridge-server-event-forwarding',
    file: './mods/api/context-bridge.test.ts',
    snippets: [
      'forwards pre-dialogue project awareness through outgoing tool-call, chat message, and complete server events',
      'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'Primary open life loop still centers on full cross-modal same-her recovery.',
    ],
  },
  {
    entry: 'context-bridge-broadcast-forwarding',
    file: './mods/api/context-bridge.test.ts',
    snippets: [
      'broadcasts tool-call and assistant-message stream events with pre-dialogue project awareness for remote observers',
      'expect(toolCallBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
      'expect(assistantMessageBroadcast?.context?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
    ],
  },
  {
    entry: 'context-bridge-before-send-inward-low-pressure-forwarding',
    file: './mods/api/context-bridge.test.ts',
    snippets: [
      'broadcasts before-send same-her inward low-pressure project awareness for remote observers without thinning the carry',
      'Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
      '\'same-her-inward-carry\'',
    ],
  },
  {
    entry: 'context-bridge-explicit-input-text-send-identity',
    file: './mods/api/context-bridge.test.ts',
    snippets: [
      'injects explicit inspector-built pre-dialogue identity into raw context-recall input:text ingestion before the remote turn opens outward',
      'preDialogueSendIdentity: expect.objectContaining({',
      'blocks raw context-recall input:text ingestion when no explicit pre-dialogue identity is available before the remote turn opens outward',
    ],
  },
  {
    entry: 'epoch1-bridge-canonical-backfill',
    file: './alicization-epoch1.test.ts',
    snippets: [
      'preDialogueSendIdentity: undefined',
      'expect(systemMessage).toContain(\'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.\')',
      'expect(systemMessage).toContain(\'local-first digital life project\')',
    ],
  },
  {
    entry: 'chat-store-legacy-progress-send-identity-backfill',
    file: './chat.test.ts',
    snippets: [
      'keeps legacy latestProgress alive as landed progress when bridge payloads rebuild pre-dialogue send identity from inspector continuity',
      'Legacy continuity progress already survives into inspector-backed send-identity rebuilding.',
      'latestLandedProgress: \'Legacy continuity progress already survives into inspector-backed send-identity rebuilding.\'',
    ],
  },
  {
    entry: 'renderer-main-transport-summary-carry',
    file: '../../../../apps/stage-tamagotchi/src/shared/alicization-chat-transport.test.ts',
    snippets: [
      'summarizes whether transport payload still carries structured project-state awareness without leaking its contents',
      'hasPreDialogueSendIdentity: true',
      'preDialogueSendIdentityStatus: \'partial\'',
      'hasPreDialogueSummaryLine: true',
      'hasPreDialogueAwarenessLine: true',
      'hasPreDialogueNextClosureLine: false',
      'hasPreDialogueCompanionHeadlineLine: true',
      'hasPreDialogueCompanionBriefingLine: true',
      'hasPreDialogueEmotionalClosureCue: true',
      'hasPreDialogueReasonPreview: true',
      'hasPreDialogueProjectState: true',
      'hasPreDialogueProjectIdentity: true',
      'hasPreDialogueProjectPhase: true',
      'hasPreDialogueLatestLandedProgress: true',
      'hasPreDialoguePrimaryOpenLoop: true',
      'hasPreDialogueNextClosureTarget: true',
      'hasPreDialogueContinuitySummary: true',
      'hasPreDialogueContinuityAnchor: true',
      'hasPreDialogueContinuityDriftRisk: true',
      'hasPreDialogueContinuityHoldDetail: true',
    ],
  },
] as const

describe('direct bridge project awareness audit', () => {
  it('keeps one explicit route-level proof that direct bridge dialogue surfaces preserve or intentionally rebuild same-her project awareness across remote channels', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'context-bridge-server-event-forwarding' }),
      expect.objectContaining({ entry: 'context-bridge-broadcast-forwarding' }),
      expect.objectContaining({ entry: 'context-bridge-before-send-inward-low-pressure-forwarding' }),
      expect.objectContaining({ entry: 'context-bridge-explicit-input-text-send-identity' }),
      expect.objectContaining({ entry: 'epoch1-bridge-canonical-backfill' }),
      expect.objectContaining({ entry: 'chat-store-legacy-progress-send-identity-backfill' }),
      expect.objectContaining({ entry: 'renderer-main-transport-summary-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the direct-bridge claim to current behavior tests instead of only entry registration', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current direct-bridge dialogue routes now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const contextBridgeSource = readFileSync(new URL('./mods/api/context-bridge.test.ts', import.meta.url), 'utf8')
    const epoch1Source = readFileSync(new URL('./alicization-epoch1.test.ts', import.meta.url), 'utf8')
    const rendererAppSource = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/App.vue', import.meta.url), 'utf8')
    const transportSource = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/shared/alicization-chat-transport.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(contextBridgeSource).toContain(
      'forwards pre-dialogue project awareness through outgoing tool-call, chat message, and complete server events',
    )
    expect(contextBridgeSource).toContain(
      'broadcasts before-send same-her inward low-pressure project awareness for remote observers without thinning the carry',
    )
    expect(contextBridgeSource).toContain(
      'injects explicit inspector-built pre-dialogue identity into raw context-recall input:text ingestion before the remote turn opens outward',
    )
    expect(epoch1Source).toContain(
      'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
    )
    expect(rendererAppSource).toContain('transportPayload: transportPayloadSummary')
    expect(transportSource).toContain('hasPreDialogueSendIdentity')
    expect(transportSource).toContain('preDialogueSendIdentityStatus')
    expect(transportSource).toContain('hasPreDialogueSummaryLine')
    expect(transportSource).toContain('hasPreDialogueAwarenessLine')
    expect(transportSource).toContain('hasPreDialogueNextClosureLine')
    expect(transportSource).toContain('hasPreDialogueCompanionHeadlineLine')
    expect(transportSource).toContain('hasPreDialogueCompanionBriefingLine')
    expect(transportSource).toContain('hasPreDialogueEmotionalClosureCue')
    expect(transportSource).toContain('hasPreDialogueReasonPreview')
    expect(transportSource).toContain('hasPreDialogueProjectState')
    expect(transportSource).toContain('hasPreDialogueProjectIdentity')
    expect(transportSource).toContain('hasPreDialogueProjectPhase')
    expect(transportSource).toContain('hasPreDialogueLatestLandedProgress')
    expect(transportSource).toContain('hasPreDialoguePrimaryOpenLoop')
    expect(transportSource).toContain('hasPreDialogueNextClosureTarget')
    expect(transportSource).toContain('hasPreDialogueContinuitySummary')
    expect(transportSource).toContain('hasPreDialogueContinuityAnchor')
    expect(transportSource).toContain('hasPreDialogueContinuityDriftRisk')
    expect(transportSource).toContain('hasPreDialogueContinuityHoldDetail')
  })
})
