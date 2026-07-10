interface SelfEvolutionFocusHistoryPattern {
  patternKey: string
  occurrenceCount: number
  summaryLine: string
  focusCardTransition: string
  traceEventTransition: string
  evidenceGained: string[]
  evidenceLost: string[]
  traceTargetsGained: string[]
  traceTargetsLost: string[]
  occurrences: Array<{
    currentCapturedAt: number
    previousCapturedAt: number
  }>
}

type SelfEvolutionBodyContinuityPhase
  = | 'body-only-hold'
    | 'body-carried-to-renderer-rejoin'
    | 'full-cross-modal-lock'
    | 'renderer-rejoin-without-body'
    | null

type SelfEvolutionRendererRejoinSurfaceKey
  = | 'authority:renderer-rejoin:speech'
    | 'authority:renderer-rejoin:live2d'
    | 'authority:renderer-rejoin:vrm'
    | null

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function readPatternKeyValue(patternKey: string, field: string) {
  const match = patternKey.match(new RegExp(`(?:^|\\|)${field}:([^|]+)`))
  return match?.[1] ?? null
}

function resolveBodyContinuityPhase(
  pattern: SelfEvolutionFocusHistoryPattern,
): SelfEvolutionBodyContinuityPhase {
  const phase = readPatternKeyValue(pattern.patternKey, 'phase')

  if (
    phase === 'body-only-hold'
    || phase === 'body-carried-to-renderer-rejoin'
    || phase === 'full-cross-modal-lock'
    || phase === 'renderer-rejoin-without-body'
  ) {
    return phase
  }

  if (pattern.summaryLine.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body'
  if (pattern.summaryLine.includes('跨模态重锁态'))
    return 'full-cross-modal-lock'
  if (
    pattern.summaryLine.includes('身体独撑态')
    || pattern.summaryLine.includes('独自托住同一段 living segment')
  ) {
    return 'body-only-hold'
  }
  if (
    pattern.summaryLine.includes('身体承接态 ->')
    || pattern.summaryLine.includes('身体连续性承接 ->')
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  return null
}

function resolveRendererRejoinSurfaceKey(pattern: SelfEvolutionFocusHistoryPattern) {
  const surfaceKey = readPatternKeyValue(pattern.patternKey, 'surface')
  if (
    surfaceKey === 'authority:renderer-rejoin:speech'
    || surfaceKey === 'authority:renderer-rejoin:live2d'
    || surfaceKey === 'authority:renderer-rejoin:vrm'
  ) {
    return surfaceKey
  }

  if (pattern.summaryLine.includes('speech 显形权威补回') || pattern.summaryLine.includes('speech 显形补回态') || pattern.summaryLine.includes('（speech）'))
    return 'authority:renderer-rejoin:speech' as const
  if (pattern.summaryLine.includes('Live2D 显形权威补回') || pattern.summaryLine.includes('Live2D 显形补回态') || pattern.summaryLine.includes('（Live2D）'))
    return 'authority:renderer-rejoin:live2d' as const
  if (pattern.summaryLine.includes('VRM 显形权威补回') || pattern.summaryLine.includes('VRM 显形补回态') || pattern.summaryLine.includes('（VRM）'))
    return 'authority:renderer-rejoin:vrm' as const
  return null
}

function resolveSurvivingVisibleLane(
  pattern: SelfEvolutionFocusHistoryPattern,
): SelfEvolutionSurvivingVisibleLane {
  const lane = readPatternKeyValue(pattern.patternKey, 'lane')

  if (lane === 'face+lipsync+voice-only')
    return 'face+lipsync+voice-only'
  if (lane === 'motion+lipsync+voice-only')
    return 'motion+lipsync+voice-only'
  if (lane === 'face+lipsync-only')
    return 'face+lipsync-only'
  if (lane === 'motion+lipsync-only')
    return 'motion+lipsync-only'

  if (pattern.summaryLine.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only'
  if (pattern.summaryLine.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only'
  if (pattern.summaryLine.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线'))
    return 'face+lipsync-only'
  if (pattern.summaryLine.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线'))
    return 'motion+lipsync-only'

  return null
}

function formatRendererRejoinSurfaceLabel(
  rendererRejoinSurfaceKey: SelfEvolutionRendererRejoinSurfaceKey,
) {
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech 显形权威'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D 显形权威'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM 显形权威'
  return '显形权威'
}

export function buildSelfEvolutionFocusHistoryPatternGuidance(
  pattern: SelfEvolutionFocusHistoryPattern,
) {
  const evidence = new Set([...pattern.evidenceGained, ...pattern.evidenceLost])
  const traceTargets = new Set([...pattern.traceTargetsGained, ...pattern.traceTargetsLost])
  const projectStateContinuityEvidence = (
    evidence.has('internalization-readiness-summary')
    && evidence.has('candidate-trajectory-summary')
    && evidence.has('proactive-decision-consumption-summary')
    && evidence.has('identity-drift-governance-summary')
  )

  const continuityEvidence = (
    evidence.has('candidate-trajectory-summary')
    && evidence.has('proactive-decision-consumption-summary')
    && evidence.has('identity-drift-governance-summary')
  )
  const bodyContinuityPhase = resolveBodyContinuityPhase(pattern)
  const survivingVisibleLane = resolveSurvivingVisibleLane(pattern)
  const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceKey(pattern)
  const rendererRejoinSurfaceLabel = formatRendererRejoinSurfaceLabel(rendererRejoinSurfaceKey)
  const bodyContinuityPattern = pattern.patternKey.includes('signature:body-continuity')
  const bodyContinuityEvidence = (
    evidence.has('renderer-authority-projection')
    && evidence.has('runtime-continuity-projection')
    && (
      traceTargets.has('trace-timeline')
      || traceTargets.has('selected-trace-event')
    )
  )

  if (projectStateContinuityEvidence) {
    return {
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
      summaryLine: '这更像项目状态连续性治理反复失稳，而不是普通 identity-continuity 漂移修复。先核对项目身份是否被继续带着，再确认 Phase 1 本地主continuity evidence和未闭环 open loops 是否稳定延续。',
    }
  }

  if (continuityEvidence) {
    return {
      governanceLayer: 'identity-continuity-continuity',
      governanceLayerDisplay: '身份连续性连续性层',
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
      summaryLine: '这更像身份连续性的连续性治理反复被确认，而不是漂移修复。先核对熟悉感是否仍停留在记忆层，再确认 identity-continuity room 与 bounded-growth 治理是否保持一致。',
    }
  }

  if (bodyContinuityPattern || bodyContinuityEvidence) {
    if (bodyContinuityPhase === 'full-cross-modal-lock') {
      return {
        governanceLayer: 'body-continuity',
        governanceLayerDisplay: '身体连续性层',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: `优先核对当前片段的身体线是否仍托住同一段 living segment，再确认 ${rendererRejoinSurfaceLabel}是否仍稳定锁在同一段 living segment 上。`,
        rendererRejoinSurfaceKey,
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
        summaryLine: `这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线与 ${rendererRejoinSurfaceLabel}是否仍稳定锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。`,
      }
    }

    if (bodyContinuityPhase === 'renderer-rejoin-without-body') {
      if (survivingVisibleLane === 'face+lipsync+voice-only') {
        return {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: '优先核对当前是否仍只有 face、lipsync 和 voice 这条 identity-continuity 生命线与同一段 living segment 对齐，再确认为什么 body、motion 还没有重新接回这条表情口型声音线。',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane,
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 face、lipsync 和 voice 这条 identity-continuity 生命线与同一段 living segment 对齐，再核对为什么 body、motion 还没有重新接回这条表情口型声音线，避免把这次 quieter carry 误写成修复完成。',
        }
      }

      if (survivingVisibleLane === 'motion+lipsync+voice-only') {
        return {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: '优先核对当前是否仍只有 motion、lipsync 和 voice 这条 identity-continuity 生命线与同一段 living segment 对齐，再确认为什么 body、face 还没有重新接回这条动作口型声音线。',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane,
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 motion、lipsync 和 voice 这条 identity-continuity 生命线与同一段 living segment 对齐，再核对为什么 body、face 还没有重新接回这条动作口型声音线，避免把这次 quieter carry 误写成修复完成。',
        }
      }

      if (survivingVisibleLane === 'face+lipsync-only') {
        return {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: '优先核对当前是否仍只有 face 和 lipsync 这条 identity-continuity 生命线与同一段 living segment 对齐，再确认为什么 body、motion 和 voice 还没有重新接回这条表情口型线。',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane,
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 face 和 lipsync 这条 identity-continuity 生命线与同一段 living segment 对齐，再核对为什么 body、motion 和 voice 还没有重新接回这条表情口型线，避免把这次 quieter carry 误写成修复完成。',
        }
      }

      if (survivingVisibleLane === 'motion+lipsync-only') {
        return {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: '优先核对当前是否仍只有 motion 和 lipsync 这条 identity-continuity 生命线与同一段 living segment 对齐，再确认为什么 body、face 和 voice 还没有重新接回这条动作口型线。',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane,
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 motion 和 lipsync 这条 identity-continuity 生命线与同一段 living segment 对齐，再核对为什么 body、face 和 voice 还没有重新接回这条动作口型线，避免把这次 quieter carry 误写成修复完成。',
        }
      }

      return {
        governanceLayer: 'body-continuity',
        governanceLayerDisplay: '身体连续性层',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: `优先核对当前片段的身体线是否仍托住同一段 living segment，再确认为什么 ${rendererRejoinSurfaceLabel}已经回接、但身体线没有继续托住同一段 living segment。`,
        rendererRejoinSurfaceKey,
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
        summaryLine: `这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认为什么 ${rendererRejoinSurfaceLabel}已经回接、但身体线没有继续托住同一段 living segment，避免把这次可见回接误写成修复完成。`,
      }
    }

    if (bodyContinuityPhase === 'body-only-hold') {
      return {
        governanceLayer: 'body-continuity',
        governanceLayerDisplay: '身体连续性层',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: '优先核对当前片段的身体线是否仍在独自托住同一段 living segment，再确认为什么显形层还没有完整回到这条连续身体线。',
        rendererRejoinSurfaceKey,
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
      }
    }

    return {
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: `优先核对当前片段的身体线是否仍托住同一段 living segment，再确认${rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech' ? ' ' : ''}${rendererRejoinSurfaceLabel}是否正在沿同一条连续身体线补回。`,
      rendererRejoinSurfaceKey,
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
      summaryLine: `这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线是否仍托住同一段 living segment，再核对${rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech' ? ' ' : ''}${rendererRejoinSurfaceLabel}是否沿着同一条连续身体线补回。`,
    }
  }

  if (pattern.focusCardTransition === 'repair-path -> repair-owner') {
    return {
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
    }
  }

  if (pattern.focusCardTransition === 'repair-owner -> repair-path' || evidence.has('private-thought-governance-chain')) {
    return {
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
    }
  }

  if (evidence.has('renderer-authority-projection') || traceTargets.has('trace-timeline')) {
    return {
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
    }
  }

  return null
}
