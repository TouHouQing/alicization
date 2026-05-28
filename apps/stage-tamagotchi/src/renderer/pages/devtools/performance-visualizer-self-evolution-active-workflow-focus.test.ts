import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionActiveWorkflowFocus } from './performance-visualizer-self-evolution-active-workflow-focus'

describe('performance visualizer self evolution active workflow focus', () => {
  it('returns null when no recurring-pattern workflow context is active', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: null,
      patternContextByKey: {},
      patternGuidanceByKey: {},
    })).toBeNull()
  })

  it('projects an active persona-thought workflow focus into a compact repair heading and target sets', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-persona',
      patternContextByKey: {
        'pattern-persona': {
          currentCapturedAt: 400,
          previousCapturedAt: 300,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-persona': {
          governanceLayer: 'persona-thought',
          governanceLayerDisplay: '人格/思绪层',
          repairOwnerHint: '私有思绪治理',
          prosodyAuthorityHint: null,
          recommendedEvidencePanels: [
            'private-thought-governance-chain',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-details',
            'selected-trace-event',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
            'governance-normalized',
          ],
          summaryLine: '疑似反复出现的人格/思绪漂移。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：人格/思绪层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '私有思绪治理',
      prosodyAuthorityHint: null,
      evidencePanels: new Set([
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-details',
        'selected-trace-event',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
        'governance-normalized',
      ]),
    })
  })

  it('returns null when an active pattern key cannot be resolved to both context and guidance', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-missing',
      patternContextByKey: {
        'pattern-missing': {
          currentCapturedAt: 500,
          previousCapturedAt: 400,
          side: 'previous',
          summaryLine: '将工作流应用到 1970-01-01T00:00:00.400Z -> 1970-01-01T00:00:00.500Z 的前一侧。',
        },
      },
      patternGuidanceByKey: {},
    })).toBeNull()
  })
})
