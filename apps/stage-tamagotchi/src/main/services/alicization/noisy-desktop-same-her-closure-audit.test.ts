import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('noisy desktop identity-continuity', () => {
  it('keeps the desktop continuity target explicit as what the project is, how far phase 1 has landed, and what is still open', () => {
    const runtimeSource = readFileSync(new URL('./main-chat-session-runtime.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(runtimeSource).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(runtimeSource).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(runtimeSource).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(runtimeSource).toContain('Answer project-state questions from one identity-continuity')
    expect(runtimeSource).toContain('Emotion, memory, initiative, and embodiment still need to close as one same-life seam.')
    expect(runtimeSource).toContain('Keep extending cross-modal identity-continuity')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('Cross-modal embodiment-facing proof is still weaker than the core text/runtime proof under long-run noisy use, but it is now materially stronger than the original sparse route set.')
  })
})
