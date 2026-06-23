import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'feedback-follow-up-project-state-audit-carry',
    file: './runtime.test.ts',
    snippets: [
      'const secondTurnId = \'turn-proactive-feedback-continuity-follow-up\'',
      'sameHerSummary: expect.stringContaining(\'Same Phase 1 digital life\')',
      'preDialogueAwarenessSummary: expect.stringContaining(\'Alicization is a local-first digital life project\')',
      'expect(String(secondFinishProjectStateAudit?.continuitySummary ?? \'\')).toContain(\'next=\')',
    ],
  },
  {
    entry: 'feedback-third-follow-up-same-thread-continuation',
    file: './runtime.test.ts',
    snippets: [
      'const thirdTurnId = \'turn-callback-afterglow-chat-meta-measured-return-vrm-noisy-third-follow-up\'',
      'expect(thirdMetaSignature.runtimeDigestProjectContinuityArcStage).toBe(\'same-thread-continuation\')',
      'expect(thirdMetaSignature.runtimeDigestProjectContinuityPreferredTiming).toMatch(/same-turn-if-invited|next-open-window/)',
      'expect(thirdMetaSignature.lastSegmentVoiceSummary).toContain(\'reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
    ],
  },
  {
    entry: 'feedback-fourth-detour-resident-presence-hold',
    file: './runtime.test.ts',
    snippets: [
      'expect(fourthState?.runtimeDigest?.projectState?.continuityArcStage).toBe(\'same-thread-continuation\')',
      'expect(fourthMetaSignature.residentPresenceSummary).toContain(\'thread=same-thread-continuation\')',
      'expect(fourthMetaSignature.residentPresenceSummary).toContain(\'style=silent-observe\')',
      'expect(fourthMetaSignature.residentPresenceSummary).toContain(\'speak=false\')',
      'expect(fourthMetaSignature.residentPresenceSummary).toContain(\'timing=next-open-window\')',
    ],
  },
  {
    entry: 'same-her-project-state-answer-contract',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.',
      'Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.',
      'Keep the still-open closure work explicit so the answer says what is not yet closed.',
      'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
    ],
  },
] as const

describe('proactive feedback post-answer detour persistence audit', () => {
  it('keeps one explicit cold proof fragment that settled proactive feedback can survive the next project-state answer and one more noisy detour without dropping the same-her project line', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'feedback-follow-up-project-state-audit-carry' }),
      expect.objectContaining({ entry: 'feedback-third-follow-up-same-thread-continuation' }),
      expect.objectContaining({ entry: 'feedback-fourth-detour-resident-presence-hold' }),
      expect.objectContaining({ entry: 'same-her-project-state-answer-contract' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the post-answer noisy-detour persistence claim to current runtime and session-runtime tests instead of only broader same-her continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: proactive feedback now has a colder post-answer detour persistence fragment, but full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('proactive-feedback-post-answer-detour-persistence-audit.test.ts')
    expect(auditSource).toContain('post-answer detour persistence now also ties settled proactive feedback continuity block')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
