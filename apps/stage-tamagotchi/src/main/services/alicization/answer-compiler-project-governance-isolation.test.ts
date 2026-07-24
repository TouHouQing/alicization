import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildAnswerCompilerSystemBlock } from './answer-compiler'

describe('answer compiler project governance isolation', () => {
  it('does not expose an answer-authoring system block', () => {
    expect(buildAnswerCompilerSystemBlock({
      maxSentences: 4,
      openingDirective: 'Use the current relationship authority.',
      openingClaim: 'Keep the opening lower-pressure.',
      supportingReality: ['The host prefers direct explanations.'],
      uncertaintyBoundary: 'Avoid certainty.',
      careVector: 'Avoid eager warmth.',
      nextMove: 'Answer from her own continuity.',
      suppressAssociativeRecall: false,
      labelCarryAsMemory: false,
    } as any)).toBe('')
  })

  it('does not translate project-state or continuity governance into answer instructions', () => {
    const source = readFileSync(new URL('./answer-compiler.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /resolveAlicizationProjectStateSnapshot|resolveAlicizationProjectPreDialogueAwarenessLine|buildSameHerAntiShellAnswerConstraint|readCurrentConsciousFrameSameHerProjectClosureCallbackLine/u,
    )
    expect(source).not.toMatch(
      /Use the current relationship authority|Use the current self-continuity authority|Answer from her own continuity|Keep the opening lower-pressure|Avoid eager warmth|Avoid theatrical intimacy/u,
    )
    expect(source).not.toMatch(
      /I still need a fresher look|What I was holding a moment ago|The knot itself matters|The host is asking about me directly|This turn needs a direct answer/u,
    )
    expect(source).not.toMatch(
      /hasContinuityRestraintRelationshipSignal|hasNeutralRelationshipSignal/u,
    )
    expect(source).not.toMatch(
      /containsAnswerCompilerFixedTemplateResidue|renderAnswerCompilerControlSegment|readableControlToken|Use \$\{key\} as/u,
    )
  })
})
