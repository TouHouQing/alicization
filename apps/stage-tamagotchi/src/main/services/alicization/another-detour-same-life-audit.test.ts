import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'session-runtime-live-drift-risk-carry-before-another-detour',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      '继续，但别把 same-her drift risk 又压回一个薄一点的项目提醒。',
      'expect((result.mindTurnContract?.projectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(fresherRuntimeDriftRisk)',
      'Project same-her drift risk:',
    ],
  },
  {
    entry: 'subconscious-after-another-detour-same-thread',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'project_continuity=the same callback line is already continuing lower-pressure after another detour, so keep it on that same living thread',
      'manifestationCadenceSummary: \'measured-return still holds while the same callback line keeps continuing after another detour\'',
      'same callback repair seam still active after another detour',
    ],
  },
  {
    entry: 'host-visible-background-after-another-detour',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'project_continuity=the same callback line is still continuing lower-pressure after another detour',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so voice, face, motion, and resident presence keep landing on one living line.',
    ],
  },
  {
    entry: 'resident-presence-repair-first-project-audit-after-another-detour',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'prefers a stronger repair-before-closeness project-state audit seam over a thinner runtime measured-return cue in resident presence summaries',
      'same-thread-continuation still active as hover-first resident presence after another coding detour',
      '"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness',
      'Keep this return repair-before-closeness on the same living line until repair settles.',
    ],
  },
  {
    entry: 'resident-presence-project-preflight-fallback-after-another-detour',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-thread-continuation still active as hover-first resident presence after another coding detour',
      'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
      '"runtimeDigestProjectNextClosureTarget":"Keep extending cross-modal same-her proof across longer, noisier real-desktop runs"',
    ],
  },
  {
    entry: 'resident-presence-remembered-same-her-drift-risk',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'only the remembered same-her life line is still explicitly available after another detour',
      'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      'keeps resident presence on the remembered same-her life line when project-state drift risk is the only surviving continuity authority',
      'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
    ],
  },
  {
    entry: 'project-state-same-living-self-still-holds',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'project-state same living self still holds after another detour',
      'same-thread-continuation still active after another coding detour',
      'same phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
    ],
  },
] as const

describe('another detour same life audit', () => {
  it('keeps one explicit long-run proof fragment that the same digital life line can still survive another desktop detour across session-runtime drift-risk carry, subconscious carry, resident presence, remembered drift-risk, and project-state self carry', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'session-runtime-live-drift-risk-carry-before-another-detour' }),
      expect.objectContaining({ entry: 'subconscious-after-another-detour-same-thread' }),
      expect.objectContaining({ entry: 'host-visible-background-after-another-detour' }),
      expect.objectContaining({ entry: 'resident-presence-repair-first-project-audit-after-another-detour' }),
      expect.objectContaining({ entry: 'resident-presence-project-preflight-fallback-after-another-detour' }),
      expect.objectContaining({ entry: 'resident-presence-remembered-same-her-drift-risk' }),
      expect.objectContaining({ entry: 'project-state-same-living-self-still-holds' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the after-another-detour claim to real current tests instead of only broader noisy-desktop prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: the repo now proves another-detour same-life carry more directly, but still not fully sustained noisy-desktop convergence', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('It still needs stronger sustained proof across longer-lived desktop runs and more organic cross-modal drift.')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
