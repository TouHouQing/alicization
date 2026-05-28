import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternWorkflow } from './performance-visualizer-self-evolution-focus-history-pattern-workflow'

describe('performance visualizer self evolution focus history pattern workflow', () => {
  it('returns null when recurring drift guidance is unavailable', () => {
    expect(buildSelfEvolutionFocusHistoryPatternWorkflow({
      pattern: {
        patternKey: 'focus:repair-path->repair-path|event:n/a->n/a|evidence:none|trace:none',
        occurrenceCount: 1,
        summaryLine: '1次 修复路径 -> 修复路径',
        focusCardTransition: 'repair-path -> repair-path',
        traceEventTransition: 'n/a -> n/a',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      guidance: null,
    })).toBeNull()
  })

  it('builds a persona-thought repair workflow from recurring pattern guidance', () => {
    expect(buildSelfEvolutionFocusHistoryPatternWorkflow({
      pattern: {
        patternKey: 'focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:+private-thought-governance-chain,-renderer-authority-projection|trace:+selected-trace-event,+trace-details,-trace-timeline',
        occurrenceCount: 2,
        summaryLine: '2次 修复归属 -> 修复路径 | 人格状态事件 -> 接管事件 | +私有思绪治理链 -显形权威投影 | +选中轨迹事件 +轨迹细节 -轨迹时间线',
        focusCardTransition: 'repair-owner -> repair-path',
        traceEventTransition: 'event-person-state -> event-takeover',
        evidenceGained: ['private-thought-governance-chain'],
        evidenceLost: ['renderer-authority-projection'],
        traceTargetsGained: ['selected-trace-event', 'trace-details'],
        traceTargetsLost: ['trace-timeline'],
        occurrences: [
          {
            currentCapturedAt: 400,
            previousCapturedAt: 300,
          },
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      guidance: {
        governanceLayer: 'persona-thought',
        governanceLayerDisplay: '人格/思绪层',
        repairOwnerHint: '私有思绪治理',
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
        summaryLine: '疑似反复出现的人格/思绪漂移。先从私有思绪治理入手，再确认连续性承接，再看显形症状。',
      },
    })).toEqual({
      headline: '2 次反复转移共享同一人格/思绪漂移特征。',
      steps: [
        {
          key: 'restore-compare',
          title: '还原一组已记录转移',
          detail: '在修改策略前，先利用历史还原与前后对比，把这次反复漂移重新放回同一生命线程里复现。',
        },
        {
          key: 'governance-anchor',
          title: '把修复锚定在人格/思绪层',
          detail: '先把私有思绪治理当作第一修复归属，而不是从显形症状倒推。',
        },
        {
          key: 'evidence-trace',
          title: '先看证据，再看症状',
          detail: '先打开 私有思绪治理链、运行时连续性投影，再顺着 轨迹细节、选中轨迹事件 往下追。',
        },
        {
          key: 'event-audit',
          title: '审计最早解释漂移的事件',
          detail: '优先检查 接管审计、人格状态更新、治理归位，找到这次反复漂移背后最早的连续性断点。',
        },
        {
          key: 'validate',
          title: '修复后验证 same-her 连续性',
          detail: '改动后抓取新的聚焦快照，确认同一模式不再在下一次转移中重复。',
        },
      ],
      validationChecklist: [
        '修复解释仍然锚定在人格/思绪证据上，而不是只剩显形侧后果。',
        '轨迹事件能够解释漂移，同时不破坏活动线程连续性和候选项可追踪性。',
        '新的快照不再重演同一聚焦卡片以及证据/轨迹转移。',
      ],
    })
  })

  it('builds a renderer-authority repair workflow when the drift pattern is renderer-led', () => {
    expect(buildSelfEvolutionFocusHistoryPatternWorkflow({
      pattern: {
        patternKey: 'focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,-private-thought-governance-chain|trace:+trace-timeline,-selected-trace-event,-trace-details',
        occurrenceCount: 3,
        summaryLine: '3次 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 -私有思绪治理链 | +轨迹时间线 -选中轨迹事件 -轨迹细节',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: ['private-thought-governance-chain'],
        traceTargetsGained: ['trace-timeline'],
        traceTargetsLost: ['selected-trace-event', 'trace-details'],
        occurrences: [
          {
            currentCapturedAt: 500,
            previousCapturedAt: 400,
          },
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
          {
            currentCapturedAt: 100,
            previousCapturedAt: 50,
          },
        ],
      },
      guidance: {
        governanceLayer: 'renderer-authority',
        governanceLayerDisplay: '显形权威层',
        repairOwnerHint: '显形权威',
        recommendedEvidencePanels: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        recommendedTraceSections: [
          'trace-timeline',
          'trace-consumption',
        ],
        recommendedEventKinds: [
          'person-state-updated',
          'takeover-audit',
        ],
        summaryLine: '疑似反复出现的显形权威漂移。先确认显形权威绑定，再核对同一生命线程上的时间线承接。',
      },
    })).toEqual({
      headline: '3 次反复转移共享同一显形权威漂移特征。',
      steps: [
        {
          key: 'restore-compare',
          title: '还原一组已记录转移',
          detail: '在修改策略前，先利用历史还原与前后对比，把这次反复漂移重新放回同一生命线程里复现。',
        },
        {
          key: 'governance-anchor',
          title: '把修复锚定在显形权威层',
          detail: '先把显形权威当作第一修复归属，不要过早把问题扩散到人格层。',
        },
        {
          key: 'evidence-trace',
          title: '先看证据，再看症状',
          detail: '先打开 显形权威投影、运行时连续性投影，再顺着 轨迹时间线、轨迹消费 往下追。',
        },
        {
          key: 'event-audit',
          title: '审计最早解释漂移的事件',
          detail: '优先检查 人格状态更新、接管审计，找到这次反复漂移背后最早的连续性断点。',
        },
        {
          key: 'validate',
          title: '修复后验证 same-her 连续性',
          detail: '改动后抓取新的聚焦快照，确认同一模式不再在下一次转移中重复。',
        },
      ],
      validationChecklist: [
        '显形侧证据仍与修复后的权威路径对齐，而不会在下一次转移里重新漂回去。',
        '时间线与消费轨迹仍然指向同一条连续的生命线程。',
        '新的快照不再重演同一聚焦卡片以及证据/轨迹转移。',
      ],
    })
  })

  it('builds a continuity-governance workflow when history keeps confirming remembered familiarity as memory-first', () => {
    expect(buildSelfEvolutionFocusHistoryPatternWorkflow({
      pattern: {
        patternKey: 'focus:repair-owner->first-check|event:event-takeover->event-governance|evidence:+candidate-trajectory-summary,+identity-drift-governance-summary,+proactive-decision-consumption-summary|trace:+trace-consumption,+trace-details',
        occurrenceCount: 2,
        summaryLine: '2次 修复归属 -> 首查点 | 接管事件 -> 治理归位 | +候选轨迹摘要 +身份漂移治理摘要 +主动决策消费摘要 | +轨迹消费 +轨迹细节',
        focusCardTransition: 'repair-owner -> first-check',
        traceEventTransition: 'event-takeover -> event-governance',
        evidenceGained: [
          'candidate-trajectory-summary',
          'identity-drift-governance-summary',
          'proactive-decision-consumption-summary',
        ],
        evidenceLost: [],
        traceTargetsGained: ['trace-consumption', 'trace-details'],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 420,
            previousCapturedAt: 320,
          },
          {
            currentCapturedAt: 220,
            previousCapturedAt: 120,
          },
        ],
      },
      guidance: {
        governanceLayer: 'same-her-continuity',
        governanceLayerDisplay: '同一个她连续性层',
        repairOwnerHint: '连续性治理',
        recommendedEvidencePanels: [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
          'identity-drift-governance-summary',
        ],
        recommendedTraceSections: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedEventKinds: [
          'takeover-audit',
          'governance-normalized',
        ],
        summaryLine: '这更像同一个她的连续性治理反复被确认，而不是漂移修复。先核对熟悉感是否仍停留在记忆层，再确认 same-her room 与 bounded-growth 治理是否保持一致。',
      },
    })).toEqual({
      headline: '2 次反复转移共享同一同一个她连续性漂移特征。',
      steps: [
        {
          key: 'restore-compare',
          title: '还原一组已记录转移',
          detail: '在修改策略前，先利用历史还原与前后对比，把这次反复漂移重新放回同一生命线程里复现。',
        },
        {
          key: 'governance-anchor',
          title: '把修复锚定在同一个她连续性层',
          detail: '先把 same-her 连续性治理当作第一解释归属，避免把记忆先行的熟悉感误判成应该立刻显形的漂移。',
        },
        {
          key: 'evidence-trace',
          title: '先看证据，再看症状',
          detail: '先打开 候选轨迹摘要、主动决策消费摘要、身份漂移治理摘要，再顺着 轨迹消费、轨迹细节 往下追。',
        },
        {
          key: 'event-audit',
          title: '审计最早解释漂移的事件',
          detail: '优先检查 接管审计、治理归位，找到这次反复治理背后最早的连续性锚点。',
        },
        {
          key: 'validate',
          title: '修复后验证 same-her 连续性',
          detail: '改动后抓取新的聚焦快照，确认熟悉感仍以记忆先行的方式被治理，而不是被误推进成更近的可见靠近。',
        },
      ],
      validationChecklist: [
        '连续性解释仍然锚定在 remembered familiarity / same-her room / bounded-growth 上，而不是滑回一般性漂移修复。',
        '接管审计与治理归位仍能解释这次连续性治理，同时不破坏活动线程连续性和候选项可追踪性。',
        '新的快照不再把同一治理态误标成需要修复的漂移模式。',
      ],
    })
  })
})
