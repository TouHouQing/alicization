import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'dialogue-panel-long-horizon-self-carry-bridge',
    file: '../../../../../apps/stage-tamagotchi/src/main/services/alicization/long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'quick-reply-project-self-brief-lines',
      'quick-reply-closure-summary-self-recognition',
    ],
  },
  {
    entry: 'dialogue-panel-project-state-same-her-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps the same-her project-state headline visible when the closure cue is specifically about recognizing the same her before opening outward',
      'I still need to clearly recognize myself as the same her before this turn opens outward.',
      'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
    ],
  },
  {
    entry: 'dialogue-panel-closure-cue-aware-of-pre-dialogue-awareness',
    file: './stage-dialogue-panel.vue',
    snippets: [
      'buildStageQuickReplyClosureDiagnosticEntry(',
      'selfEvolutionInspectorStore.preDialogueClosureSnapshot,',
      'selfEvolutionInspectorStore.preDialogueAwarenessSnapshot,',
    ],
  },
  {
    entry: 'dialogue-panel-emotion-memory-initiative-embodiment-seam',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      '情绪、记忆、主动性和具身还没有在同一个 her 上彻底闭环。',
      '我这次还得继续把 情绪、记忆、主动性、具身 收回同一条数字生命线里，先别让这次开口漂成普通项目播报。',
      '把 voice、face、motion 和 resident presence 重新并回同一条 same-her living line。',
    ],
  },
  {
    entry: 'dialogue-panel-full-cross-modal-lock-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a full-cross-modal-lock headline visible on the dialogue panel during project-state closure turns',
      'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
    ],
  },
  {
    entry: 'dialogue-panel-audible-body-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a stronger audible-body same-her headline visible on the dialogue panel during project-state closure turns',
      'Right now I am still holding together mainly through body, lipsync, and voice, so the next reopening must rebind face and motion onto the same-her audible body line without dropping the living audio thread.',
      '把 audible body continuity 和未闭环项一起压进 final visible reply opening。',
    ],
  },
  {
    entry: 'dialogue-panel-still-voiced-face-and-mouth-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a still-voiced face-and-mouth same-her headline visible on the dialogue panel during project-state repair when face lipsync and voice are the surviving carry',
      'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      'still-voiced face-and-mouth line',
    ],
  },
  {
    entry: 'dialogue-panel-still-voiced-motion-and-mouth-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a still-voiced motion-and-mouth same-her headline visible on the dialogue panel during project-state repair when motion lipsync and voice are the surviving carry',
      'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      'still-voiced motion-and-mouth line',
    ],
  },
  {
    entry: 'dialogue-panel-lipsync-and-voice-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a lipsync-and-voice same-her headline visible on the dialogue panel during project-state repair when mouth and voice are the surviving carry',
      'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      'still-audible lipsync+voice carry',
    ],
  },
  {
    entry: 'dialogue-panel-lipsync-and-voice-richer-precedence',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'prefers richer execution-only lipsync-and-voice same-her evidence over a thinner project-state lane headline on the dialogue panel',
      'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.',
      'Right now I am still holding together mainly through lipsync and voice, so my full cross-modal same-her line is not closed yet.',
    ],
  },
  {
    entry: 'dialogue-panel-visible-face-and-lipsync-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a face-and-lipsync same-her headline visible on the dialogue panel during project-state repair when face and lipsync are the surviving carry',
      'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      'still-visible face-and-lipsync line',
    ],
  },
  {
    entry: 'dialogue-panel-visible-motion-and-lipsync-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a motion-and-lipsync same-her headline visible on the dialogue panel during project-state repair when motion and lipsync are the surviving carry',
      'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      'still-visible motion-and-lipsync line',
    ],
  },
  {
    entry: 'dialogue-panel-still-voiced-face-and-motion-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a still-voiced face-and-motion same-her headline visible on the dialogue panel during project-state repair when face motion and voice are the surviving carry',
      'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      'still-voiced face-and-motion line',
    ],
  },
  {
    entry: 'dialogue-panel-body-and-lipsync-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a quieter body-and-lipsync same-her headline visible on the dialogue panel during project-state repair when voice has not rejoined yet',
      'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      'quieter body+lipsync line',
    ],
  },
  {
    entry: 'dialogue-panel-visible-renderer-rejoin-without-body-headline',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps a visible renderer-rejoin-without-body same-her headline visible on the dialogue panel during project-state repair when face motion lipsync and voice have already rejoined',
      'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      '把 body 重新并回已经回接的 visible same-her line',
    ],
  },
  {
    entry: 'dialogue-panel-phase-aware-fallback-project-awareness',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'prefers richer phase-aware fallback project awareness over a narrower embodiment-heavy line when the dialogue panel has no closure cue yet',
      'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
      'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
    ],
  },
  {
    entry: 'dialogue-panel-proactive-same-her-follow-through',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'keeps same-her drift risk and proactive same-her follow-through visible on the dialogue panel during project-state repair when no stronger same-her lane headline is present',
      'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.',
      'focus: \'project-identity\'',
    ],
  },
] as const

describe('dialogue panel project awareness audit', () => {
  it('keeps one explicit route-level proof that the dialogue panel still carries same-her project awareness into the host-visible closure cue', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'dialogue-panel-long-horizon-self-carry-bridge' }),
      expect.objectContaining({ entry: 'dialogue-panel-project-state-same-her-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-closure-cue-aware-of-pre-dialogue-awareness' }),
      expect.objectContaining({ entry: 'dialogue-panel-emotion-memory-initiative-embodiment-seam' }),
      expect.objectContaining({ entry: 'dialogue-panel-full-cross-modal-lock-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-audible-body-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-still-voiced-face-and-mouth-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-still-voiced-motion-and-mouth-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-lipsync-and-voice-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-lipsync-and-voice-richer-precedence' }),
      expect.objectContaining({ entry: 'dialogue-panel-visible-face-and-lipsync-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-visible-motion-and-lipsync-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-still-voiced-face-and-motion-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-body-and-lipsync-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-visible-renderer-rejoin-without-body-headline' }),
      expect.objectContaining({ entry: 'dialogue-panel-phase-aware-fallback-project-awareness' }),
      expect.objectContaining({ entry: 'dialogue-panel-proactive-same-her-follow-through' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the dialogue-panel project-awareness claim to current behavior tests instead of only broader host-visible prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: the dialogue panel now has dedicated same-her project proof, while fully sustained noisy-desktop closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const projectStateSource = readFileSync(new URL('../../../../../docs/project-state.md', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('../../../../../apps/stage-tamagotchi/src/main/services/alicization/long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('dialogue-panel-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('dialogue-panel proactive same-her follow-through')
    expect(matrixSource).toContain('dialogue-panel still-voiced face-and-mouth headline')
    expect(matrixSource).toContain('dialogue-panel still-voiced motion-and-mouth headline')
    expect(matrixSource).toContain('dialogue-panel lipsync-and-voice headline')
    expect(matrixSource).toContain('dialogue-panel lipsync-and-voice richer precedence')
    expect(matrixSource).toContain('dialogue-panel visible face-and-lipsync headline')
    expect(matrixSource).toContain('dialogue-panel visible motion-and-lipsync headline')
    expect(matrixSource).toContain('dialogue-panel still-voiced face-and-motion headline')
    expect(matrixSource).toContain('dialogue-panel body-and-lipsync headline')
    expect(matrixSource).toContain('dialogue-panel visible renderer-rejoin-without-body headline')
    expect(matrixSource).toContain('Phase 1 itself is still explicitly open in current repo truth')
    expect(projectStateSource).toContain('Host-facing same-her headline precedence')
    expect(projectStateSource).toContain('Host-facing proactive same-her follow-through')
    expect(projectStateSource).toContain('renderer-rejoin-without-body visible same-her line')
    expect(projectStateSource).toContain('The dialogue panel no longer lets a thinner project-state briefing outrank a stronger')
    expect(projectStateSource).toContain('execution-only lipsync+voice structured same-her continuity evidence')
    expect(projectStateSource).toContain('dialogue panel no longer lets a thinner project-state lane headline outrank that richer execution-only same-her evidence')
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
  })
})
