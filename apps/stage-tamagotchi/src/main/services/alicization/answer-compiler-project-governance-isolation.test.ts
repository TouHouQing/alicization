import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildAnswerCompiler,
  buildAnswerCompilerSystemBlock,
} from './answer-compiler'

describe('answer compiler project governance isolation', () => {
  it('does not emit a memory recall suppression switch', () => {
    const compiler = buildAnswerCompiler({
      now: 10_000,
      discourseState: {
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        currentTurnSummary: '继续当前对话',
        currentQuestion: '你还记得我们刚才说到哪里吗？',
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.84,
        narrative: [],
        updatedAt: 10_000,
      } as any,
      conversationState: {
        jointThread: '继续当前对话',
        hostMove: '你还记得我们刚才说到哪里吗？',
        activeProject: null,
        unansweredQuestion: '你还记得我们刚才说到哪里吗？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'clarify',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'suppress-associative',
        memoryQueryHints: ['刚才的对话'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      } as any,
      mindSynthesis: {
        answerSubject: 'general',
        relationMove: 'clarify',
        speechObligation: 'answer-general',
        beliefs: [],
        uncertainties: [],
        concerns: [],
        commitments: [],
        desires: [],
        openingIntent: '回答当前问题。',
        truthBoundary: '不确定的记忆需要明确说明。',
        interiorSummary: '从可用记忆继续对话。',
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      } as any,
    })

    expect(compiler).not.toBeNull()
    expect(compiler).not.toHaveProperty('suppressAssociativeRecall')
  })

  it('does not expose an answer-authoring system block', () => {
    expect(buildAnswerCompilerSystemBlock({
      maxSentences: 4,
      openingDirective: 'Use the current relationship authority.',
      openingClaim: 'Keep the opening lower-pressure.',
      supportingReality: ['The host prefers direct explanations.'],
      uncertaintyBoundary: 'Avoid certainty.',
      careVector: 'Avoid eager warmth.',
      nextMove: 'Answer from her own continuity.',
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
