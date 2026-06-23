import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionTriageView } from './performance-visualizer-self-evolution-triage-view'

describe('performance visualizer self evolution triage view', () => {
  it('extracts triage cards from repair-oriented summary entries while keeping other entries in overview', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=显形', technicalValue: 'drift | drift=renderer' },
      { key: 'persona', label: '人格基线', value: '观察者 | 善于观察 | 静默观察', technicalValue: 'observer | observant | silent-observe' },
      { key: 'drift-start', label: '起漂层', value: 'renderer | renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge' },
      { key: 'repair-owner', label: '修复归属', value: 'renderer | renderer authority' },
      { key: 'first-check', label: '首查点', value: 'renderer | renderer authority binding -> playback cues -> driver execution' },
      { key: 'repair-path', label: '修复路径', value: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry' },
      { key: 'dominant-drift', label: '主漂移', value: '显形漂移：resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge', technicalValue: 'renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge' },
    ])

    expect(view.overviewLines).toEqual([
      'status: 闭环漂移 | 漂移=显形',
      'persona: 观察者 | 善于观察 | 静默观察',
      'drift-start: renderer | renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
      'dominant-drift: 显形漂移：resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'renderer',
        detail: 'renderer authority',
        rendererRejoinSurfaceKey: null,
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'renderer',
        detail: 'renderer authority binding -> playback cues -> driver execution',
        rendererRejoinSurfaceKey: null,
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry',
        rendererRejoinSurfaceKey: null,
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

  it('creates relationship-cadence triage cards when companionship transition drift is the active continuity risk', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长 | companionship-measured-return', technicalValue: 'runtime-thread-rest-1 | active-dialogue | coding | bounded-growth | companionship-measured-return' },
      { key: 'dominant-drift', label: '主漂移', value: 'transition-companionship:measured-return' },
    ])

    expect(view.overviewLines).toEqual([
      'status: 闭环漂移 | 漂移=连续性',
      'continuity: runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长 | companionship-measured-return',
      'dominant-drift: transition-companionship:measured-return',
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'relationship cadence governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'companionship transition summary -> resident projection -> renderer authority',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance companionship-measured-return -> companionship transition settle cadence -> resident projection bounded-return',
      },
    ])
  })

  it('creates project-state continuity triage cards when same-her internalization is blocked by Project identity carry, Phase 1 route carry, and Unresolved closure carry drift', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-project-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift', technicalValue: 'runtime-thread-project-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift' },
      { key: 'dominant-drift', label: '主漂移', value: 'project-state continuity drift', technicalValue: 'project-state-continuity-drift' },
    ])

    expect(view.overviewLines).toEqual([
      'status: 闭环漂移 | 漂移=连续性',
      'continuity: runtime-thread-project-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift',
      'dominant-drift: project-state continuity drift',
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'project-state continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance project-state-continuity-drift -> Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
    ])
  })

  it('routes pre-dialogue briefing drift into the same project-state continuity triage branch', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-briefing-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift', technicalValue: 'runtime-thread-briefing-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift' },
      { key: 'dominant-drift', label: '主漂移', value: 'pre-dialogue briefing drift', technicalValue: 'project-state-continuity-drift' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'project-state continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance project-state-continuity-drift -> Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
    ])
  })

  it('creates body-continuity triage cards when the body line still carries the living segment before face motion and lipsync return', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-body-led-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线', technicalValue: 'runtime-thread-body-led-1 | active-dialogue | coding | authority-body:yes | lane=body-only | 身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线' },
      { key: 'dominant-drift', label: '主漂移', value: 'body-led partial recovery', technicalValue: 'body-led partial recovery' },
    ])

    expect(view.overviewLines).toEqual([
      'status: 闭环漂移 | 漂移=连续性',
      'continuity: runtime-thread-body-led-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线',
      'dominant-drift: body-led partial recovery',
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> renderer rejoin -> playback cue binding',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> speech authority recovery -> cue bridge recovery',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
    ])
  })

  it('marks live2d renderer rejoin explicitly when body continuity fallback already knows the same living segment is being re-manifested there', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-body-live2d-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，Live2D 正在沿同一条连续身体线补回显形权威', technicalValue: 'runtime-thread-body-live2d-1 | active-dialogue | coding | authority-body:yes | lane=body-only | Live2D 正在沿同一条连续身体线补回显形权威' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> renderer rejoin -> playback cue binding',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> Live2D authority recovery -> cue bridge recovery',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
    ])
  })

  it('marks vrm renderer rejoin explicitly when body continuity fallback already knows the same living segment is being re-manifested there', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-body-vrm-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，VRM 正在沿同一条连续身体线补回显形权威', technicalValue: 'runtime-thread-body-vrm-1 | active-dialogue | coding | authority-body:yes | lane=body-only | VRM 正在沿同一条连续身体线补回显形权威' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> renderer rejoin -> playback cue binding',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> VRM authority recovery -> cue bridge recovery',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
    ])
  })

  it('marks speech renderer rejoin explicitly when body continuity fallback already knows the same living segment is being re-manifested there', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-body-speech-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，speech 正在沿同一条连续身体线补回显形权威', technicalValue: 'runtime-thread-body-speech-1 | active-dialogue | coding | authority-body:yes | lane=body-only | speech 正在沿同一条连续身体线补回显形权威' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> renderer rejoin -> playback cue binding',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> speech authority recovery -> cue bridge recovery',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
    ])
  })

  it('keeps the renderer rejoin surface unknown when body continuity is explicit but the returning manifestation surface has not been identified yet', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-body-generic-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，显形权威仍在沿同一条连续身体线补回', technicalValue: 'runtime-thread-body-generic-1 | active-dialogue | coding | authority-body:yes | lane=body-only | 身体线已经先把这段 living segment 托住，显形权威仍在沿同一条连续身体线补回' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> renderer rejoin -> playback cue binding',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> authority recovery -> cue bridge recovery',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
      },
    ])
  })

  it('creates body-continuity triage cards for body-only-hold so the held same-segment line is not dropped before focus planning', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-body-only-1 | 主动对话 | 编码中 | 身体线仍在独自托住同一段 living segment', technicalValue: 'runtime-thread-body-only-1 | active-dialogue | coding | 身体线仍在独自托住同一段 living segment' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body-only hold -> renderer recovery gap -> playback cue binding',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance body-only-hold -> body authority carry -> renderer recovery gap -> cue bridge recovery',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
      },
    ])
  })

  it('creates body-continuity triage cards for full-cross-modal-lock so same-segment lock survives into the workflow', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-lock-1 | 主动对话 | 编码中 | 身体线与 Live2D 显形权威已经共同锁回同一段 living segment', technicalValue: 'runtime-thread-lock-1 | active-dialogue | coding | 身体线与 Live2D 显形权威已经共同锁回同一段 living segment' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body and live2d same-segment lock -> playback cue binding -> lock stability audit',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance full-cross-modal-lock -> body-and-live2d-same-segment-lock -> cue bridge stability',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
    ])
  })

  it('creates body-continuity triage cards for renderer-rejoin-without-body so visible recovery without body carry stays auditable', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-body-loss-1 | 主动对话 | 编码中 | VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment', technicalValue: 'runtime-thread-body-loss-1 | active-dialogue | coding | VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'vrm renderer rejoin without body carry -> playback cue binding -> body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer-rejoin-without-body -> vrm rejoin without body carry -> cue bridge body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
    ])
  })

  it('creates quieter face+lipsync body-continuity triage cards so the surviving same-her visible line stays explicit before repair planning', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-face-lipsync-triage-1 | 主动对话 | 编码中 | 边界越线 | 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线', technicalValue: 'runtime-thread-face-lipsync-triage-1 | active-dialogue | coding | boundary-violation | lane=face+lipsync-only | 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync-only',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'quieter face+lipsync same-her line still visible -> body motion voice pending rejoin -> body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync-only',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance quieter-face-lipsync-same-her-line -> body motion voice pending rejoin -> cue bridge body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync-only',
      },
    ])
  })

  it('creates quieter motion+lipsync body-continuity triage cards so the surviving same-her visible line stays explicit before repair planning', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-motion-lipsync-triage-1 | 主动对话 | 编码中 | 边界越线 | 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线', technicalValue: 'runtime-thread-motion-lipsync-triage-1 | active-dialogue | coding | boundary-violation | lane=motion+lipsync-only | 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'motion+lipsync-only',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'quieter motion+lipsync same-her line still visible -> body face voice pending rejoin -> body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'motion+lipsync-only',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance quieter-motion-lipsync-same-her-line -> body face voice pending rejoin -> cue bridge body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'motion+lipsync-only',
      },
    ])
  })

  it('creates quieter face+lipsync+voice body-continuity triage cards so the surviving same-her visible line keeps voice explicit before repair planning', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-face-lipsync-voice-triage-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩表情、口型、声音维持同一段连续性', technicalValue: 'runtime-thread-face-lipsync-voice-triage-1 | active-dialogue | coding | boundary-violation | lane=face+lipsync+voice-only | 当前仅剩表情、口型、声音维持同一段连续性' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'quieter face+lipsync+voice same-her line still visible -> body motion pending rejoin -> body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance quieter-face-lipsync-voice-same-her-line -> body motion pending rejoin -> cue bridge body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
    ])
  })

  it('creates quieter motion+lipsync+voice body-continuity triage cards so the surviving same-her visible line keeps voice explicit before repair planning', () => {
    const view = buildSelfEvolutionTriageView([
      { key: 'status', label: '闭环状态', value: '闭环漂移 | 漂移=连续性', technicalValue: 'drift | drift=continuity' },
      { key: 'continuity', label: '连续线程', value: 'runtime-thread-motion-lipsync-voice-triage-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩动作、口型、声音维持同一段连续性', technicalValue: 'runtime-thread-motion-lipsync-voice-triage-1 | active-dialogue | coding | boundary-violation | lane=motion+lipsync+voice-only | 当前仅剩动作、口型、声音维持同一段连续性' },
    ])

    expect(view.triageCards).toEqual([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'motion+lipsync+voice-only',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'quieter motion+lipsync+voice same-her line still visible -> body face pending rejoin -> body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'motion+lipsync+voice-only',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance quieter-motion-lipsync-voice-same-her-line -> body face pending rejoin -> cue bridge body-loss audit',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'motion+lipsync+voice-only',
      },
    ])
  })
})
