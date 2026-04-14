import { describe, expect, it } from 'vitest'

import { buildMindGovernedFallbackSurface } from './alicization-mind-fallback'

describe('alicization-mind-fallback', () => {
  it('returns dispatch-only surface for explicit execution-bound turns', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '用 cli 命令帮我查一下桌面有什么文件',
      translate: path => path,
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toEqual(expect.objectContaining({
      reply: '',
      visibleReplyMode: 'dispatch-only',
      emotion: 'thinking',
    }))
    expect(surface?.thought).toContain('obligation=guide')
  })

  it('suppresses visual repair narration for non-inspection dialogue turns even if repair residue exists', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '你好',
      translate: path => path,
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'Code current window',
        focusAnchor: 'current-user-turn',
        answerIntent: 'Answer the host greeting directly.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old screen residue',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toEqual(expect.objectContaining({
      emotion: 'thinking',
    }))
    expect(surface?.reply).not.toContain('repair-stale-anchor')
    expect(surface?.reply).not.toContain('repair-need-reground')
    expect(surface?.reply).not.toContain('carry-memory')
    expect(surface?.reply).not.toContain('reground-note')
  })
})
