import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionTriageView } from './performance-visualizer-self-evolution-triage-view'

describe('performance visualizer self evolution triage view', () => {
  it('extracts triage cards from repair-oriented summary entries while keeping other entries in overview', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '部分闭环 | 漂移=显形', technicalValue: 'partial | drift=renderer' },
      { key: 'persona', label: '人格基线', value: '观察者 | 善于观察 | 静默观察', technicalValue: 'observer | observant | silent-observe' },
      { key: 'drift-start', label: '起漂层', value: 'renderer | renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority' },
      { key: 'repair-owner', label: '修复归属', value: 'renderer | renderer authority' },
      { key: 'first-check', label: '首查点', value: 'renderer | renderer authority binding -> playback cues -> driver execution' },
      { key: 'repair-path', label: '修复路径', value: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry' },
      { key: 'dominant-drift', label: '主漂移', value: '显形漂移：resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority', technicalValue: 'renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority' },
    ])

    expect(view.overviewLines).toEqual([
      'status: 部分闭环 | 漂移=显形',
      'persona: 观察者 | 善于观察 | 静默观察',
      'drift-start: renderer | renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority',
      'dominant-drift: 显形漂移：resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority',
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'renderer',
        detail: 'renderer authority',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'renderer',
        detail: 'renderer authority binding -> playback cues -> driver execution',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry',
      },
    ])
  })

  it('returns empty triage cards when repair-oriented entries are absent', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环稳定 | 漂移=无', technicalValue: 'grounded | drift=none' },
      { key: 'persona', label: '人格基线', value: '观察者 | 善于观察 | 静默观察', technicalValue: 'observer | observant | silent-observe' },
    ])

    expect(view.overviewLines).toEqual([
      'status: 闭环稳定 | 漂移=无',
      'persona: 观察者 | 善于观察 | 静默观察',
    ])
    expect(view.triageCards).toEqual([])
  })

  it('creates continuity-governance triage cards when remembered familiarity is intentionally held memory-first', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环稳定 | 漂移=无', technicalValue: 'grounded | drift=none' },
      { key: 'persona', label: '人格基线', value: '观察者 | 善于观察 | 静默观察', technicalValue: 'observer | observant | silent-observe' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长 | 熟悉感记忆先行', technicalValue: 'runtime-thread-rest-1 | active-dialogue | coding | bounded-growth | remembered-familiarity-memory-first' },
    ])

    expect(view.overviewLines).toEqual([
      'status: 闭环稳定 | 漂移=无',
      'persona: 观察者 | 善于观察 | 静默观察',
      'continuity: runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长 | 熟悉感记忆先行',
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'same-her continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'candidate trajectory -> remembered familiarity restraint -> identity drift governance',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance remembered-familiarity-memory-first -> candidate trajectory same-her room -> identity boundary bounded-growth',
      },
    ])
  })
})
