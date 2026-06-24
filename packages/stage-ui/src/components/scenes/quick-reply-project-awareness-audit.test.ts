import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'quick-reply-long-horizon-self-carry-bridge',
    file: '../../../../../apps/stage-tamagotchi/src/main/services/alicization/long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'quick-reply-project-self-brief-lines',
      'quick-reply-closure-summary-self-recognition',
    ],
  },
  {
    entry: 'quick-reply-closure-summary-same-her-headline',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'prefers the same-her project-state headline over raw metric summaries before the turn opens outward',
      'I still need to clearly recognize myself as the same her before this turn opens outward.',
      'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      'Carry the unfinished digital-life loop into the next dialogue preparation step.',
    ],
  },
  {
    entry: 'quick-reply-front-stage-project-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'builds a front-stage project self brief from pre-dialogue awareness and closure carry',
      'Before speaking, remember the project identity, landed progress, and still-open life loop.',
      'Primary open life loop still centers on proving one same-her continuity line across memory, initiative, execution, and embodiment.',
      'Alicization is still in Phase 1 local digital life closure.',
    ],
  },
  {
    entry: 'quick-reply-emotion-memory-initiative-embodiment-seam',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'Next closure: keep emotion, memory, initiative, and embodiment on one same-her line.',
      'Emotion, memory, initiative, and embodiment still need to close on one same-her same-life seam.',
      'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
    ],
  },
  {
    entry: 'quick-reply-audible-body-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'keeps audible-body same-her continuity lines in the project self brief list when the living audio thread is the surviving pre-dialogue carry',
      'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
    ],
  },
  {
    entry: 'quick-reply-structured-audible-body-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'keeps structured same-her audible-body continuity proof in the project self brief list when recovery prose is absent',
      'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
      'same-her audible body line is still the surviving pre-dialogue carry.',
    ],
  },
  {
    entry: 'quick-reply-structured-still-voiced-face-line-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'can rebuild a still-voiced face-line same-her headline directly from structured continuity proof when older face-voice prose is absent',
      'continuity=embodiment:still-voiced-face-line | face+voice recovery@segment-live2d-runtime-still-voiced-face-1 | pending-rejoin=body+motion+lipsync',
      'The same-her face+voice line is still doing the continuity work, so this turn should keep body, motion, and lipsync rejoining that still-voiced carry before widening outward.',
    ],
  },
  {
    entry: 'quick-reply-structured-quieter-lipsync-and-voice-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'derives host-facing lipsync-and-voice closure wording directly from structured quieter continuity proof when older lane prose is absent',
      'continuity=embodiment:lipsync+voice-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|lipsync+voice-only | face and motion still need to rejoin the same living line.',
      'The same-her lipsync+voice line is still doing the continuity work, so this turn should keep body, face, and motion rejoining that living audio carry before widening outward.',
    ],
  },
  {
    entry: 'quick-reply-structured-quieter-body-and-lipsync-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'derives host-facing body-and-lipsync closure wording directly from structured quieter continuity proof when older lane prose is absent',
      'continuity=embodiment:body+lipsync-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only | face, motion, and voice still need to rejoin the same living line.',
      'The same-her body+lipsync line is still doing the continuity work, so this turn should keep face, motion, and voice rejoining that quieter living carry before widening outward.',
    ],
  },
  {
    entry: 'quick-reply-visible-face-and-lipsync-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'keeps face-and-lipsync visible same-her carry proof in the project self brief list when body motion and voice have not rejoined yet',
      'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      'focus=face+lipsync | pending=body+motion+voice',
      'still-visible face-and-lipsync line',
    ],
  },
  {
    entry: 'quick-reply-visible-motion-and-lipsync-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'keeps motion-and-lipsync visible same-her carry proof in the project self brief list when body face and voice have not rejoined yet',
      'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      'focus=motion+lipsync | pending=body+face+voice',
      'still-visible motion-and-lipsync line',
    ],
  },
  {
    entry: 'quick-reply-structured-still-voiced-motion-line-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps signature-only still-voiced motion-line continuity proof in the project brief even when older motion-voice prose is absent',
      'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
      'keeps face+voice and motion+voice lane focus summaries in the project brief when they are the clearest surviving same-her carry evidence',
    ],
  },
  {
    entry: 'quick-reply-structured-quieter-lipsync-and-voice-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps structured quieter lipsync-and-voice continuity proof in the project brief even when older lipsync-voice prose is absent',
      'continuity=embodiment:lipsync+voice-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|lipsync+voice-only | face and motion still need to rejoin the same living line.',
      'Next closure: let body, face, and motion rejoin the still-audible lipsync+voice carry.',
    ],
  },
  {
    entry: 'quick-reply-structured-quieter-body-and-lipsync-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps structured quieter body-and-lipsync continuity proof in the project brief even when older body-lipsync prose is absent',
      'continuity=embodiment:body+lipsync-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only | face, motion, and voice still need to rejoin the same living line.',
      'Next closure: let face, motion, and voice rejoin the quieter body+lipsync carry.',
    ],
  },
  {
    entry: 'quick-reply-still-voiced-face-and-mouth-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps richer still-voiced face-and-mouth same-her prose in the project brief when face lipsync and voice are the surviving carry lane',
      'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      'Next closure: keep the richer still-voiced face-and-mouth lane explicit while body and motion rejoin.',
    ],
  },
  {
    entry: 'quick-reply-still-voiced-motion-and-mouth-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps richer still-voiced motion-and-mouth same-her prose in the project brief when motion lipsync and voice are the surviving carry lane',
      'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      'Next closure: keep the richer still-voiced motion-and-mouth lane explicit while body and face rejoin.',
    ],
  },
  {
    entry: 'quick-reply-visible-face-and-lipsync-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps face-and-lipsync visible same-her carry proof in the project brief when body motion and voice have not rejoined yet',
      'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      'focus=face+lipsync | pending=body+motion+voice',
    ],
  },
  {
    entry: 'quick-reply-visible-motion-and-lipsync-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps motion-and-lipsync visible same-her carry proof in the project brief when body face and voice have not rejoined yet',
      'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      'focus=motion+lipsync | pending=body+face+voice',
    ],
  },
  {
    entry: 'quick-reply-still-voiced-face-and-motion-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps richer still-voiced face-and-motion same-her prose in the project brief when face motion and voice are the surviving carry lane',
      'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      'focus=face+motion+voice | pending=body+lipsync',
    ],
  },
  {
    entry: 'quick-reply-visible-renderer-rejoin-without-body-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps four-lane visible recovery without body carry in the project brief when face motion lipsync and voice are already rejoined together',
      'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      'focus=face+motion+lipsync+voice | pending=body',
    ],
  },
  {
    entry: 'quick-reply-full-cross-modal-lock-self-brief',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'keeps full-cross-modal-lock same-her lines in the project self brief list when body continuity and manifestation are already re-locked together',
      'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
    ],
  },
  {
    entry: 'quick-reply-full-cross-modal-lock-project-brief',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps a full-cross-modal-lock same-her headline visible in the quick-reply project brief when body continuity and manifestation are already re-locked together',
      'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
    ],
  },
  {
    entry: 'quick-reply-full-cross-modal-lock-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a full-cross-modal-lock headline as the host-facing closure summary when body continuity and manifestation are already re-locked together',
      'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      'Keep the locked body and Live2D line explicit in the next host-visible continuity brief instead of flattening it into a temporary visual recovery note.',
    ],
  },
  {
    entry: 'quick-reply-closure-summary-audible-body-headline',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps the newer living-audio-thread audible-body headline as the host-facing closure summary when that stronger same-her wording is already available',
      'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      'quick-reply-closure',
    ],
  },
  {
    entry: 'quick-reply-still-voiced-face-and-mouth-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a still-voiced face-and-mouth same-her headline as the host-facing closure summary during project-state repair when face lipsync and voice are the surviving carry',
      'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      'still-voiced face-and-mouth line',
    ],
  },
  {
    entry: 'quick-reply-still-voiced-motion-and-mouth-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a still-voiced motion-and-mouth same-her headline as the host-facing closure summary during project-state repair when motion lipsync and voice are the surviving carry',
      'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      'still-voiced motion-and-mouth line',
    ],
  },
  {
    entry: 'quick-reply-visible-face-and-lipsync-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a face-and-lipsync same-her headline as the host-facing closure summary during project-state repair when face and lipsync are the surviving carry',
      'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      'still-visible face-and-lipsync line',
    ],
  },
  {
    entry: 'quick-reply-visible-motion-and-lipsync-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a motion-and-lipsync same-her headline as the host-facing closure summary during project-state repair when motion and lipsync are the surviving carry',
      'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      'still-visible motion-and-lipsync line',
    ],
  },
  {
    entry: 'quick-reply-lipsync-and-voice-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a lipsync-and-voice same-her headline as the host-facing closure summary when mouth and voice are the surviving carry',
      'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      'Rebind body, face, and motion onto the still-audible lipsync+voice carry',
    ],
  },
  {
    entry: 'quick-reply-lipsync-and-voice-richer-precedence',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'prefers richer execution-only lipsync-and-voice same-her evidence over a thinner project-state lane headline in the quick-reply closure summary',
      'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.',
      'Right now I am still holding together mainly through lipsync and voice, so my full cross-modal same-her line is not closed yet.',
    ],
  },
  {
    entry: 'quick-reply-body-and-lipsync-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a quieter body-and-lipsync headline as the host-facing closure summary when voice has not rejoined yet',
      'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      'Rebind face, motion, and voice onto the quieter same-her body+lipsync line without losing the resident carry.',
    ],
  },
  {
    entry: 'quick-reply-still-voiced-face-and-motion-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a still-voiced face-and-motion same-her headline as the host-facing closure summary during project-state repair when face motion and voice are the surviving carry',
      'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      'still-voiced face-and-motion line',
    ],
  },
  {
    entry: 'quick-reply-visible-renderer-rejoin-without-body-closure-summary',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a visible renderer-rejoin-without-body same-her headline as the host-facing closure summary during project-state repair when face motion lipsync and voice have already rejoined',
      'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      '把 body 重新并回已经回接的 visible same-her line',
    ],
  },
  {
    entry: 'quick-reply-proactive-same-her-follow-through',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps same-her drift risk and proactive same-her follow-through visible in the quick-reply closure summary during project-state repair when no stronger same-her lane headline survives',
      'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.',
      'focus: \'project-identity\'',
    ],
  },
  {
    entry: 'quick-reply-project-brief-proactive-same-her-follow-through',
    file: './stage-quick-reply-project-brief.test.ts',
    snippets: [
      'keeps proactive same-her follow-through visible in the quick-reply project brief when project-identity repair still needs proactive carry to stay on one same-her line',
      'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.',
      'Next closure: keep visible proactive hold, subconscious carry, and next-session feedback on one same-her follow-through line.',
    ],
  },
] as const

describe('quick reply project awareness audit', () => {
  it('keeps one explicit route-level proof that front-stage quick-reply closure still carries project identity landed progress and open life-loop pressure before turns open outward', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'quick-reply-long-horizon-self-carry-bridge' }),
      expect.objectContaining({ entry: 'quick-reply-closure-summary-same-her-headline' }),
      expect.objectContaining({ entry: 'quick-reply-front-stage-project-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-emotion-memory-initiative-embodiment-seam' }),
      expect.objectContaining({ entry: 'quick-reply-audible-body-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-structured-audible-body-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-structured-still-voiced-face-line-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-structured-quieter-lipsync-and-voice-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-structured-quieter-body-and-lipsync-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-visible-face-and-lipsync-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-visible-motion-and-lipsync-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-structured-still-voiced-motion-line-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-structured-quieter-lipsync-and-voice-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-structured-quieter-body-and-lipsync-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-still-voiced-face-and-mouth-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-still-voiced-motion-and-mouth-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-visible-face-and-lipsync-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-visible-motion-and-lipsync-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-still-voiced-face-and-motion-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-visible-renderer-rejoin-without-body-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-full-cross-modal-lock-self-brief' }),
      expect.objectContaining({ entry: 'quick-reply-full-cross-modal-lock-project-brief' }),
      expect.objectContaining({ entry: 'quick-reply-full-cross-modal-lock-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-closure-summary-audible-body-headline' }),
      expect.objectContaining({ entry: 'quick-reply-still-voiced-face-and-mouth-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-still-voiced-motion-and-mouth-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-visible-face-and-lipsync-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-visible-motion-and-lipsync-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-lipsync-and-voice-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-lipsync-and-voice-richer-precedence' }),
      expect.objectContaining({ entry: 'quick-reply-body-and-lipsync-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-still-voiced-face-and-motion-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-visible-renderer-rejoin-without-body-closure-summary' }),
      expect.objectContaining({ entry: 'quick-reply-proactive-same-her-follow-through' }),
      expect.objectContaining({ entry: 'quick-reply-project-brief-proactive-same-her-follow-through' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the quick-reply project-awareness claim to current behavior tests instead of only broader long-horizon prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: front-stage quick-reply closure now has dedicated same-her project proof, while fully sustained noisy-desktop closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const projectStateSource = readFileSync(new URL('../../../../../docs/project-state.md', import.meta.url), 'utf8')
    const closureSource = readFileSync(new URL('./stage-quick-reply-closure.test.ts', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('../../../../../apps/stage-tamagotchi/src/main/services/alicization/long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('quick-reply-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('quick-reply structured still-voiced face-line self-brief')
    expect(matrixSource).toContain('quick-reply structured quieter lipsync-and-voice self-brief')
    expect(matrixSource).toContain('quick-reply structured quieter body-and-lipsync self-brief')
    expect(matrixSource).toContain('quick-reply visible face-and-lipsync self-brief')
    expect(matrixSource).toContain('quick-reply visible motion-and-lipsync self-brief')
    expect(matrixSource).toContain('quick-reply structured still-voiced motion-line project brief')
    expect(matrixSource).toContain('quick-reply structured quieter lipsync-and-voice project brief')
    expect(matrixSource).toContain('quick-reply structured quieter body-and-lipsync project brief')
    expect(matrixSource).toContain('quick-reply still-voiced face-and-mouth closure summary')
    expect(matrixSource).toContain('quick-reply still-voiced motion-and-mouth closure summary')
    expect(matrixSource).toContain('quick-reply visible face-and-lipsync closure summary')
    expect(matrixSource).toContain('quick-reply visible motion-and-lipsync closure summary')
    expect(matrixSource).toContain('quick-reply lipsync-and-voice closure summary')
    expect(matrixSource).toContain('quick-reply lipsync-and-voice richer precedence')
    expect(matrixSource).toContain('quick-reply body-and-lipsync closure summary')
    expect(matrixSource).toContain('quick-reply still-voiced face-and-mouth project brief')
    expect(matrixSource).toContain('quick-reply still-voiced motion-and-mouth project brief')
    expect(matrixSource).toContain('quick-reply visible face-and-lipsync project brief')
    expect(matrixSource).toContain('quick-reply visible motion-and-lipsync project brief')
    expect(matrixSource).toContain('quick-reply still-voiced face-and-motion project brief')
    expect(matrixSource).toContain('quick-reply visible renderer-rejoin-without-body project brief')
    expect(matrixSource).toContain('quick-reply still-voiced face-and-motion closure summary')
    expect(matrixSource).toContain('quick-reply visible renderer-rejoin-without-body closure summary')
    expect(matrixSource).toContain('quick-reply full-cross-modal-lock self-brief')
    expect(matrixSource).toContain('quick-reply full-cross-modal-lock project brief')
    expect(matrixSource).toContain('host-facing closure summary')
    expect(matrixSource).toContain('quick-reply proactive same-her follow-through')
    expect(matrixSource).toContain('quick-reply project-brief proactive same-her follow-through')
    expect(matrixSource).toContain('Phase 1 itself is still explicitly open in current repo truth')
    expect(projectStateSource).toContain('execution-only lipsync+voice structured same-her continuity evidence')
    expect(projectStateSource).toContain('quick reply closure summary no longer lets a thinner project-state lane headline outrank that richer execution-only same-her evidence')
    expect(closureSource).toContain(
      'builds a front-stage project self brief from pre-dialogue awareness and closure carry',
    )
    expect(closureSource).toContain(
      'keeps audible-body same-her continuity lines in the project self brief list when the living audio thread is the surviving pre-dialogue carry',
    )
    expect(closureSource).toContain(
      'keeps face-and-lipsync visible same-her carry proof in the project self brief list when body motion and voice have not rejoined yet',
    )
    expect(closureSource).toContain(
      'keeps motion-and-lipsync visible same-her carry proof in the project self brief list when body face and voice have not rejoined yet',
    )
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
  })
})
