import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternGuidance } from './performance-visualizer-self-evolution-focus-history-pattern-guidance'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

describe('performance visualizer self evolution focus history pattern guidance', () => {
  it('returns null when the pattern does not contain enough signal to infer governance guidance', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
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
    })).toBeNull()
  })

  it('maps persona-path recurring drift to a persona/private-thought governance repair hint', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:+private-thought-governance-chain,-renderer-authority-projection|trace:+selected-trace-event,+trace-details,-trace-timeline',
      occurrenceCount: 2,
      summaryLine: '2x repair-owner -> repair-path | event-person-state -> event-takeover | +private-thought-governance-chain -renderer-authority-projection | +selected-trace-event +trace-details -trace-timeline',
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
    })).toEqual({
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
      summaryLine: '疑似反复出现的人格/思绪漂移。先从私有思绪治理入手，再确认连续性承接，再看显形症状。',
    })
  })

  it('maps renderer-heavy recurring drift to renderer authority governance guidance', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,-private-thought-governance-chain|trace:+trace-timeline,-selected-trace-event,-trace-details',
      occurrenceCount: 3,
      summaryLine: '3x repair-path -> repair-owner | event-takeover -> event-person-state | +renderer-authority-projection -private-thought-governance-chain | +trace-timeline -selected-trace-event -trace-details',
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
    })).toEqual({
      governanceLayer: 'renderer-authority',
      governanceLayerDisplay: '显形权威层',
      repairOwnerHint: '显形权威',
      prosodyAuthorityHint: '优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
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
      summaryLine: '疑似反复出现的显形权威漂移。先确认显形权威绑定与当前片段的韵律权威链，再核对同一生命线程上的时间线承接。',
    })
  })

  it('maps remembered-familiarity memory-first recurrence to identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-owner->first-check|event:event-takeover->event-governance|evidence:+candidate-trajectory-summary,+identity-drift-governance-summary,+proactive-decision-consumption-summary|trace:+trace-consumption,+trace-details',
      occurrenceCount: 2,
      summaryLine: '2x repair-owner -> first-check | event-takeover -> event-governance | +candidate-trajectory-summary +identity-drift-governance-summary +proactive-decision-consumption-summary | +trace-consumption +trace-details',
      focusCardTransition: 'repair-owner -> first-check',
      traceEventTransition: 'event-takeover -> event-governance',
      evidenceGained: [
        'candidate-trajectory-summary',
        'identity-drift-governance-summary',
        'proactive-decision-consumption-summary',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-consumption',
        'trace-details',
      ],
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
    })).toEqual({
      governanceLayer: 'same-her-continuity',
      governanceLayerDisplay: '同一个她连续性层',
      repairOwnerHint: '连续性治理',
      prosodyAuthorityHint: null,
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
    })
  })

  it('maps project-state continuity recurrence to project-state governance instead of generic same-her drift repair', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-owner->first-check|event:event-takeover->event-governance|evidence:+candidate-trajectory-summary,+identity-drift-governance-summary,+proactive-decision-consumption-summary,+internalization-readiness-summary|trace:+trace-consumption,+trace-details',
      occurrenceCount: 2,
      summaryLine: '2x repair-owner -> first-check | event-takeover -> event-governance | +candidate-trajectory-summary +identity-drift-governance-summary +proactive-decision-consumption-summary +internalization-readiness-summary | +trace-consumption +trace-details',
      focusCardTransition: 'repair-owner -> first-check',
      traceEventTransition: 'event-takeover -> event-governance',
      evidenceGained: [
        'candidate-trajectory-summary',
        'identity-drift-governance-summary',
        'proactive-decision-consumption-summary',
        'internalization-readiness-summary',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-consumption',
        'trace-details',
      ],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 520,
          previousCapturedAt: 420,
        },
        {
          currentCapturedAt: 320,
          previousCapturedAt: 220,
        },
      ],
    })).toEqual({
      governanceLayer: 'project-state-continuity',
      governanceLayerDisplay: '项目状态连续性层',
      repairOwnerHint: '项目状态连续性治理',
      prosodyAuthorityHint: null,
      recommendedEvidencePanels: [
        'internalization-readiness-summary',
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
      summaryLine: '这更像项目状态连续性治理反复失稳，而不是普通 same-her 漂移修复。先核对项目身份是否被继续带着，再确认 Phase 1 本地主数字生命主线和未闭环 open loops 是否稳定延续。',
    })
  })

  it('maps body-led same-segment recurrence to body continuity governance instead of generic renderer authority drift', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:body-carried-to-renderer-rejoin|surface:authority:renderer-rejoin:speech|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,+runtime-continuity-projection|trace:+trace-timeline,+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 身体承接态 -> speech 显形补回态 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 +运行时连续性投影 | +轨迹时间线 +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-timeline',
        'selected-trace-event',
      ],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认 speech 显形权威是否正在沿同一条连续身体线补回。',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线是否仍托住同一段 living segment，再核对 speech 显形权威是否沿着同一条连续身体线补回。',
    })
  })

  it('keeps body continuity guidance generic when the returning manifestation surface is still unknown', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:derived|surface:unknown|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,+runtime-continuity-projection|trace:+trace-timeline,+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 身体连续性承接 -> 显形权威补回 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 +运行时连续性投影 | +轨迹时间线 +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-timeline',
        'selected-trace-event',
      ],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认显形权威是否正在沿同一条连续身体线补回。',
      rendererRejoinSurfaceKey: null,
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线是否仍托住同一段 living segment，再核对显形权威是否沿着同一条连续身体线补回。',
    })
  })

  it('keeps full-cross-modal-lock guidance anchored on the same-segment lock instead of flattening it into renderer drift', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:full-cross-modal-lock|surface:authority:renderer-rejoin:live2d|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 跨模态重锁态（Live2D） | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: [],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认 Live2D 显形权威是否仍稳定锁在同一段 living segment 上。',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线与 Live2D 显形权威是否仍稳定锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。',
    })
  })

  it('keeps renderer-rejoin-without-body guidance anchored on body-loss instead of narrating it as a trusted renderer recovery', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|surface:authority:renderer-rejoin:vrm|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 显形回接失身态（VRM） | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: [],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认为什么 VRM 显形权威已经回接、但身体线没有继续托住同一段 living segment。',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认为什么 VRM 显形权威已经回接、但身体线没有继续托住同一段 living segment，避免把这次可见回接误写成修复完成。',
    })
  })

  it('keeps quieter face+lipsync identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|lane:face+lipsync-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: [],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前是否仍只有 face 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、motion 和 voice 还没有重新接回这条表情口型线。',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync-only',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 face 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、motion 和 voice 还没有重新接回这条表情口型线，避免把这次 quieter carry 误写成修复完成。',
    })
  })

  it('keeps quieter motion+lipsync identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|lane:motion+lipsync-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: [],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前是否仍只有 motion 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、face 和 voice 还没有重新接回这条动作口型线。',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync-only',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 motion 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、face 和 voice 还没有重新接回这条动作口型线，避免把这次 quieter carry 误写成修复完成。',
    })
  })

  it('keeps quieter face+lipsync+voice identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|lane:face+lipsync+voice-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 当前仅剩表情、口型、声音维持同一段连续性 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: [],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前是否仍只有 face、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、motion 还没有重新接回这条表情口型声音线。',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 face、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、motion 还没有重新接回这条表情口型声音线，避免把这次 quieter carry 误写成修复完成。',
    })
  })

  it('keeps quieter motion+lipsync+voice identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|lane:motion+lipsync+voice-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: '2次 当前仅剩动作、口型、声音维持同一段连续性 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: [],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前是否仍只有 motion、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、face 还没有重新接回这条动作口型声音线。',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync+voice-only',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 motion、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、face 还没有重新接回这条动作口型声音线，避免把这次 quieter carry 误写成修复完成。',
    })
  })

  it('keeps legacy note-only body continuity recurrence anchored on body-only-hold instead of generic renderer recovery language', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'signature:body-continuity|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,+runtime-continuity-projection|trace:+trace-timeline,+selected-trace-event',
      occurrenceCount: 2,
      summaryLine: `2次 ${legacyNote} | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 +运行时连续性投影 | +轨迹时间线 +选中轨迹事件`,
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-timeline',
        'selected-trace-event',
      ],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
        },
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
      ],
    })).toEqual({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: '优先核对当前片段的身体线是否仍在独自托住同一段 living segment，再确认为什么显形层还没有完整回到这条连续身体线。',
      rendererRejoinSurfaceKey: null,
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
      ],
      summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线是否仍在独自托住同一段 living segment，而不是把这段低显形延续误写成已经失败或已经完成。',
    })
  })
})
