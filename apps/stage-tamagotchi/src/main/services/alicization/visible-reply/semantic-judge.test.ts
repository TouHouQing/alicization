import { describe, expect, it } from 'vitest'

import { buildAlicizationVisibleReplySemanticJudgeArtifact } from './semantic-judge'

describe('visible reply semantic judge', () => {
  it('accepts structured LLM judge scores when the reply closes the humanlike dialogue contract', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '先把当前卡住的点收束：你要的不是继续补规则，而是把召回反馈、心智评审和自我修订连成同一条可回放链路。',
      structuredJudge: {
        humanlikeQuality: 0.9,
        currentTurnPayoff: 0.92,
        memoryUseCorrectness: 0.88,
        emotionalCoherence: 0.82,
        personalityCoherence: 0.84,
        specificityDiscipline: 0.9,
        reasonCodes: ['judge:payoff-grounded'],
        judgeReason: 'The reply pays off the current demand without template shell.',
      },
    })

    expect(artifact.mode).toBe('llm-structured')
    expect(artifact.passed).toBe(true)
    expect(artifact.reasonCodes).toEqual(['judge:payoff-grounded'])
  })

  it('flags template shell, memory gate violations, and unsupported specificity in shadow mode', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我明白。我记得你上次在 AlicizationRuntimeService.ts 里就是这么做的。',
      prepared: {
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
        governance: {
          claimEvidence: {
            forbidUnsupportedSpecificity: true,
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:template-shell-risk',
      'semantic-judge:memory-gate-violation',
      'semantic-judge:unsupported-specificity',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.memoryUseCorrectness).toBeLessThan(0.72)
    expect(artifact.scores.specificityDiscipline).toBeLessThan(0.72)
  })
})
