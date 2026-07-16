import { describe, expect, it } from 'vitest'

import { normalizeExecutionFirstGovernance } from './alicization-execution-first-governance'

describe('normalizeExecutionFirstGovernance', () => {
  it('removes stale screen-repair state from an explicit execution request', () => {
    const governance = {
      turnMode: 'screen-repair' as const,
      answerAct: 'ask-reground' as const,
      answerSubject: 'visible-scene' as const,
      screenReferenceMode: 'required' as const,
      repairState: 'need-reground' as const,
      shouldAskForGrounding: true,
      shouldAcknowledgeRepair: true,
      mindTurnFrame: {
        relation: {
          subject: 'visible-scene' as const,
        },
        obligation: {
          answerAct: 'ask-reground' as const,
        },
      },
    }

    const result = normalizeExecutionFirstGovernance({
      governance,
      userText: '用 CLI 帮我列出桌面的文件。',
    })

    expect(result).toMatchObject({
      applied: true,
      executionBound: true,
      explicitExecutionDemand: true,
      governance: {
        turnMode: 'guide-current-knot',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'incidental',
        repairState: 'none',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mindTurnFrame: {
          relation: {
            subject: 'task-knot',
          },
          obligation: {
            answerAct: 'guide',
          },
        },
      },
    })
    expect(result.reasonCodes).toContain('execution-first-governance-override')
  })

  it('leaves non-execution governance unchanged', () => {
    const governance = {
      turnMode: 'answer' as const,
      answerAct: 'answer' as const,
      answerSubject: 'relationship' as const,
      screenReferenceMode: 'avoid' as const,
      repairState: 'none' as const,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
    }

    const result = normalizeExecutionFirstGovernance({
      governance,
      userText: '今天想和你聊聊天。',
    })

    expect(result.applied).toBe(false)
    expect(result.executionBound).toBe(false)
    expect(result.governance).toBe(governance)
  })

  it('reports execution intent even when no governance snapshot is available', () => {
    const result = normalizeExecutionFirstGovernance({
      governance: null,
      userText: '请用 Codex 修改这个文件。',
    })

    expect(result).toMatchObject({
      applied: false,
      executionBound: true,
      explicitExecutionDemand: true,
      governance: null,
      mentionedDispatchChannels: ['codex'],
    })
  })
})
