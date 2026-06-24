import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-turn-persistence-continuity',
    file: './runtime-turn-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that guarded turn persistence preserves same-her project awareness across runtime authority callback delivery and deferred proactive carry',
      'expect.objectContaining({ entry: \'runtime-persisted-turn-awareness-preference\' })',
      'expect.objectContaining({ entry: \'deferred-proactive-repair-first-persistence-carry\' })',
    ],
  },
  {
    entry: 'runtime-persisted-turn-project-state-audit',
    file: './runtime.test.ts',
    snippets: [
      'expect(structuredRealization?.projectStateAudit).toEqual(expect.objectContaining({',
      'preDialogueAwarenessSummary: expect.any(String)',
      'expect(replayedStructured?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({',
    ],
  },
  {
    entry: 'runtime-replay-emission-richer-awareness-precedence',
    file: './runtime.test.ts',
    snippets: [
      'expect(String(emittedProjectStateAudit?.preDialogueAwarenessSummary ?? \'\')).toMatch(/Alicization is a local-first digital life project|same local-first digital life project/)',
      'expect(String(emittedProjectStateAudit?.preDialogueAwarenessSummary ?? \'\')).toMatch(/Phase 1: Local Digital Life|unfinished Phase 1 closure seam/)',
      'expect(String(emittedProjectStateAudit?.preDialogueAwarenessSummary ?? \'\')).not.toContain(olderPayloadReminder)',
    ],
  },
  {
    entry: 'runtime-replay-emission-richer-same-her-precedence',
    file: './runtime.test.ts',
    snippets: [
      'expect(String((emittedEvent as any)?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? \'\')).toContain(`same-her=${richerStructuredSameHerSummary}`)',
      'expect(String((emittedEvent as any)?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? \'\')).toMatch(/Before answering, keep the same digital life project in view|Phase 1 closure seam|one living her|local-first digital life project/)',
      'still-voiced face line',
    ],
  },
  {
    entry: 'runtime-replay-emission-motion-line-precedence',
    file: './runtime.test.ts',
    snippets: [
      'prefers a fresher structured still-voiced motion-line sameHerSummary over an older payload generic project shell when emitting the host-visible dialogue payload',
      'still-voiced motion line',
      'body, face, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished',
    ],
  },
  {
    entry: 'runtime-replay-emission-body-voice-precedence',
    file: './runtime.test.ts',
    snippets: [
      'prefers a fresher structured body-plus-voice sameHerSummary over an older payload generic project shell when emitting the host-visible dialogue payload',
      'resident body line is still keeping this one living her coherent',
      'face, motion, and lipsync rejoin',
    ],
  },
  {
    entry: 'runtime-replay-emission-body-lipsync-precedence',
    file: './runtime.test.ts',
    snippets: [
      'prefers a fresher structured body-plus-lipsync sameHerSummary over an older payload generic project shell when emitting the host-visible dialogue payload',
      'living mouth line',
      'face, motion, and voice rejoin',
    ],
  },
  {
    entry: 'runtime-replay-helper-body-voice-merge',
    file: './runtime.test.ts',
    snippets: [
      'rebuilds helper-level project-state continuity summary with fresher body-plus-voice same-her truth when mixed audit sources disagree',
      'resident body line is still keeping this one living her coherent',
      'face, motion, and lipsync rejoin',
    ],
  },
  {
    entry: 'runtime-replay-helper-body-lipsync-merge',
    file: './runtime.test.ts',
    snippets: [
      'rebuilds helper-level project-state continuity summary with fresher body-plus-lipsync same-her truth when mixed audit sources disagree',
      'living mouth line are still intact',
      'face, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished',
    ],
  },
  {
    entry: 'runtime-replay-helper-motion-line-merge',
    file: './runtime.test.ts',
    snippets: [
      'rebuilds helper-level project-state continuity summary with phase and fresher embodied same-her truth when mixed audit sources disagree',
      'still-voiced motion line',
      'body, face, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished',
    ],
  },
  {
    entry: 'runtime-replay-normalizer-thin-shell-repair',
    file: './runtime.test.ts',
    snippets: [
      'expect(String(normalizedAudit?.preDialogueAwarenessSummary ?? \'\')).toBe(',
      'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
    ],
  },
  {
    entry: 'replay-pack-closure-cue-preservation',
    file: './main-chat-session-replay-harness.test.ts',
    snippets: [
      'preserves project-state closure cues in sampled replay benchmark packs when structured prefixes are noisy',
      'summaryLine: \'本地优先数字生命 | Phase 1 | landed=记忆连续性和项目状态提示已经能在回答前稳定落进运行时准备层。 | open=情绪、主动性和身体表达还没闭环 | next=继续把情绪、主动性和身体表达闭环收住。\'',
      'sameHerSelfLine: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
    ],
  },
  {
    entry: 'replay-benchmark-landed-open-lane-distinction',
    file: './replay-benchmark-runtime.test.ts',
    snippets: [
      'does not treat landed progress and open closure as interchangeable pre-dialogue briefing cues',
      'latestLandedProgress: \'Keep the unfinished digital-life closure work explicit in the answer.\'',
      'primaryOpenLoop: \'Project-state continuity already survives into runtime preparation.\'',
    ],
  },
  {
    entry: 'replay-benchmark-project-state-audit-feedback',
    file: './replay-benchmark-runtime.test.ts',
    snippets: [
      'treats same-her project-state pass-through without rewrite as fully carried in replay benchmark feedback',
      'projectStateAuditSummary',
      'projectStateAuditDrift',
    ],
  },
  {
    entry: 'replay-benchmark-body-lipsync-project-state-audit-feedback',
    file: './replay-benchmark-runtime.test.ts',
    snippets: [
      'counts body-plus-lipsync project-state audit carry inside replay benchmark feedback when the living mouth line is still holding the same her without voice yet',
      'Shared body-plus-lipsync continuity now survives into replay sampling backlog.',
      'projectStateAuditDrift',
    ],
  },
  {
    entry: 'replay-benchmark-body-voice-project-state-audit-feedback',
    file: './replay-benchmark-runtime.test.ts',
    snippets: [
      'counts body-plus-voice project-state audit carry inside replay benchmark feedback when the resident body line is still keeping the same her coherent',
      'Shared body-plus-voice continuity now survives into replay sampling backlog.',
      'projectStateAuditDrift',
    ],
  },
] as const

describe('replay emission project awareness audit', () => {
  it('keeps one explicit route-level proof that persisted and replayed turns preserve same-her project awareness before re-emission', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-turn-persistence-continuity' }),
      expect.objectContaining({ entry: 'runtime-persisted-turn-project-state-audit' }),
      expect.objectContaining({ entry: 'runtime-replay-emission-richer-awareness-precedence' }),
      expect.objectContaining({ entry: 'runtime-replay-emission-richer-same-her-precedence' }),
      expect.objectContaining({ entry: 'runtime-replay-emission-motion-line-precedence' }),
      expect.objectContaining({ entry: 'runtime-replay-emission-body-voice-precedence' }),
      expect.objectContaining({ entry: 'runtime-replay-emission-body-lipsync-precedence' }),
      expect.objectContaining({ entry: 'runtime-replay-helper-body-voice-merge' }),
      expect.objectContaining({ entry: 'runtime-replay-helper-body-lipsync-merge' }),
      expect.objectContaining({ entry: 'runtime-replay-helper-motion-line-merge' }),
      expect.objectContaining({ entry: 'runtime-replay-normalizer-thin-shell-repair' }),
      expect.objectContaining({ entry: 'replay-pack-closure-cue-preservation' }),
      expect.objectContaining({ entry: 'replay-benchmark-landed-open-lane-distinction' }),
      expect.objectContaining({ entry: 'replay-benchmark-project-state-audit-feedback' }),
      expect.objectContaining({ entry: 'replay-benchmark-body-lipsync-project-state-audit-feedback' }),
      expect.objectContaining({ entry: 'replay-benchmark-body-voice-project-state-audit-feedback' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the replay emission continuity claim to real current tests instead of only broad normalization registry wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: replay emission now has route-level project-awareness proof, but this still does not prove every future replay family will inherit the same chain automatically', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')

    expect(runtimeSource).toContain(
      'expect(String(emittedProjectStateAudit?.preDialogueAwarenessSummary ?? \'\')).toMatch(/Alicization is a local-first digital life project|same local-first digital life project/)',
    )
  })
})
