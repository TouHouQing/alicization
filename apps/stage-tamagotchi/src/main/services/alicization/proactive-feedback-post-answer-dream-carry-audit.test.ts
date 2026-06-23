import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

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
    entry: 'feedback-next-dream-project-state-carry',
    file: './runtime.test.ts',
    snippets: [
      'it(\'feeds settled proactive reply feedback into the next dream prompt\'',
      'expect(dreamSystemTexts[0]).toContain(\'[ALICIZATION_PROJECT_STATE]\')',
      'expect(dreamSystemTexts[0]).toContain(\'same-thread-continuation\')',
      'expect(dreamSystemTexts[0]).toContain(\'next-open-window\')',
      'expect(dreamSystemTexts[0]).toContain(\'quiet_same_her_continuity=When the current continuity is inward and lower-pressure, preserve it as quiet same-her continuity rather than flattening it into a generic measured-return helper state.\')',
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

describe('proactive feedback post-answer dream carry audit', () => {
  it('keeps one explicit cold proof fragment that settled proactive feedback can survive the next project-state answer, one more noisy detour, and the next dream prompt without dropping the same-her project line', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'feedback-follow-up-project-state-audit-carry' }),
      expect.objectContaining({ entry: 'feedback-third-follow-up-same-thread-continuation' }),
      expect.objectContaining({ entry: 'feedback-fourth-detour-resident-presence-hold' }),
      expect.objectContaining({ entry: 'feedback-next-dream-project-state-carry' }),
      expect.objectContaining({ entry: 'same-her-project-state-answer-contract' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the post-answer dream carry claim to current runtime and session-runtime tests instead of only broader same-her continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the post-answer dream carry fragment as part of the autonomous proactive same-her closure loop repo truth while keeping the longer noisy-desktop convergence boundary open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-post-answer-dream-carry-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('post-answer dream carry')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('proactive-feedback-post-answer-dream-carry-audit.test.ts')
    expect(auditSource).toContain('post-answer dream carry now also ties settled proactive feedback continuity block')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
