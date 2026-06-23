import {
  formatSelfEvolutionEventKindLabel,
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

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

interface SelfEvolutionFocusHistoryPatternGuidance {
  governanceLayer: string
  governanceLayerDisplay: string
  repairOwnerHint: string
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  recommendedEvidencePanels: string[]
  recommendedTraceSections: string[]
  recommendedEventKinds: string[]
  summaryLine: string
}

type SelfEvolutionBodyContinuityPhase
  = | 'body-only-hold'
    | 'body-carried-to-renderer-rejoin'
    | 'full-cross-modal-lock'
    | 'renderer-rejoin-without-body'
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

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function resolveSurvivingVisibleLane(
  pattern: SelfEvolutionFocusHistoryPattern,
  guidance: SelfEvolutionFocusHistoryPatternGuidance | null,
): SelfEvolutionSurvivingVisibleLane {
  if (guidance?.survivingVisibleLane)
    return guidance.survivingVisibleLane

  const lane = readPatternKeyValue(pattern.patternKey, 'lane')
  if (
    lane === 'face+lipsync-only'
    || lane === 'motion+lipsync-only'
    || lane === 'face+lipsync+voice-only'
    || lane === 'motion+lipsync+voice-only'
  ) {
    return lane
  }

  if (pattern.summaryLine.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only'
  if (pattern.summaryLine.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only'
  if (pattern.summaryLine.includes('当前只有 face 和 lipsync 这条 same-her 生命线'))
    return 'face+lipsync-only'
  if (pattern.summaryLine.includes('当前只有 motion 和 lipsync 这条 same-her 生命线'))
    return 'motion+lipsync-only'

  return null
}

function formatRendererRejoinSurfaceLabel(
  rendererRejoinSurfaceKey: SelfEvolutionFocusHistoryPatternGuidance['rendererRejoinSurfaceKey'],
) {
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech 显形权威'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D 显形权威'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM 显形权威'
  return '显形权威'
}

export function buildSelfEvolutionFocusHistoryPatternWorkflow(input: {
  pattern: SelfEvolutionFocusHistoryPattern
  guidance: SelfEvolutionFocusHistoryPatternGuidance | null
}) {
  if (!input.guidance)
    return null

  const evidenceList = input.guidance.recommendedEvidencePanels.map(formatSelfEvolutionEvidencePanelLabel).join('、')
  const traceList = input.guidance.recommendedTraceSections.map(formatSelfEvolutionTraceSectionLabel).join('、')
  const eventList = input.guidance.recommendedEventKinds.map(formatSelfEvolutionEventKindLabel).join('、')
  const governanceAnchor = input.guidance.governanceLayer
  const governanceAnchorDisplay = input.guidance.governanceLayerDisplay
  const rendererRejoinSurfaceLabel = formatRendererRejoinSurfaceLabel(input.guidance.rendererRejoinSurfaceKey)
  const bodyContinuityPhase = governanceAnchor === 'body-continuity'
    ? resolveBodyContinuityPhase(input.pattern)
    : null
  const survivingVisibleLane = governanceAnchor === 'body-continuity'
    ? resolveSurvivingVisibleLane(input.pattern, input.guidance)
    : null
  const repeatedTransitions = input.pattern.occurrenceCount
  const sharedTailChecklist = '新的快照不再重演同一聚焦卡片以及证据/轨迹转移。'

  const governanceStepDetail = governanceAnchor === 'persona-thought'
    ? '先把私有思绪治理当作第一修复归属，而不是从显形症状倒推。'
    : governanceAnchor === 'same-her-continuity'
      ? '先把 same-her 连续性治理当作第一解释归属，避免把记忆先行的熟悉感误判成应该立刻显形的漂移。'
      : governanceAnchor === 'body-continuity'
        ? bodyContinuityPhase === 'full-cross-modal-lock'
          ? `先把身体连续性治理当作第一解释归属，避免把身体线与 ${rendererRejoinSurfaceLabel}共同锁回同一段 living segment 的稳定回归误判成普通显形权威漂移。`
          : bodyContinuityPhase === 'renderer-rejoin-without-body'
            ? survivingVisibleLane === 'face+lipsync+voice-only'
              ? '先把身体连续性治理当作第一解释归属，先确认当前是否仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误判成 body、motion 已经补回的修复完成。'
              : survivingVisibleLane === 'motion+lipsync+voice-only'
                ? '先把身体连续性治理当作第一解释归属，先确认当前是否仍只有动作、口型、声音这条 same-her 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误判成 body、face 已经补回的修复完成。'
                : survivingVisibleLane === 'face+lipsync-only'
                  ? '先把身体连续性治理当作第一解释归属，先确认当前是否仍只有表情、口型这条 same-her 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误判成 body、motion、voice 已经补回的修复完成。'
                  : survivingVisibleLane === 'motion+lipsync-only'
                    ? '先把身体连续性治理当作第一解释归属，先确认当前是否仍只有动作、口型这条 same-her 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误判成 body、face、voice 已经补回的修复完成。'
                    : `先把身体连续性治理当作第一解释归属，避免把 ${rendererRejoinSurfaceLabel}已经回接、但身体线没有继续托住同一段 living segment 的失身回接误判成修复完成。`
            : bodyContinuityPhase === 'body-only-hold'
              ? '先把身体连续性治理当作第一解释归属，避免把身体线独自托住同一段 living segment 的低显形延续误判成已经失败或已经完成。'
              : '先把身体连续性治理当作第一解释归属，避免把身体先托住同一段 living segment 的回收误判成普通显形权威漂移。'
        : governanceAnchor === 'project-state-continuity'
          ? '先把项目状态连续性治理当作第一解释归属，避免把项目身份、Phase 1 主线和未闭环 open loops 的丢失误判成普通 same-her 情绪漂移。'
          : '先把显形权威当作第一修复归属，不要过早把问题扩散到人格层。'

  const firstChecklistLine = governanceAnchor === 'persona-thought'
    ? '修复解释仍然锚定在人格/思绪证据上，而不是只剩显形侧后果。'
    : governanceAnchor === 'same-her-continuity'
      ? '连续性解释仍然锚定在 remembered familiarity / same-her room / bounded-growth 上，而不是滑回一般性漂移修复。'
      : governanceAnchor === 'body-continuity'
        ? bodyContinuityPhase === 'full-cross-modal-lock'
          ? `连续性解释仍然锚定在身体线 / ${rendererRejoinSurfaceLabel} / 同一段 living segment 共同锁定上，而不是滑回普通显形权威漂移。`
          : bodyContinuityPhase === 'renderer-rejoin-without-body'
            ? survivingVisibleLane === 'face+lipsync+voice-only'
              ? '连续性解释仍然锚定在表情、口型、声音这条 same-her 生命线上，而不是把这次 quieter carry 写成 body、motion 已经回接。'
              : survivingVisibleLane === 'motion+lipsync+voice-only'
                ? '连续性解释仍然锚定在动作、口型、声音这条 same-her 生命线上，而不是把这次 quieter carry 写成 body、face 已经回接。'
                : survivingVisibleLane === 'face+lipsync-only'
                  ? '连续性解释仍然锚定在表情、口型这条 same-her 生命线上，而不是把这次 quieter carry 写成 body、motion、voice 已经回接。'
                  : survivingVisibleLane === 'motion+lipsync-only'
                    ? '连续性解释仍然锚定在动作、口型这条 same-her 生命线上，而不是把这次 quieter carry 写成 body、face、voice 已经回接。'
                    : `连续性解释仍然锚定在 ${rendererRejoinSurfaceLabel}已回接但身体线未承接的失身回接上，而不是把这次可见恢复写成可信补回。`
            : bodyContinuityPhase === 'body-only-hold'
              ? '连续性解释仍然锚定在身体线独自托住同一段 living segment 上，而不是把低显形延续误写成已经失败或已经完成。'
              : '连续性解释仍然锚定在身体线 / living segment / 同一条连续身体线补回上，而不是滑回普通显形权威漂移。'
        : governanceAnchor === 'project-state-continuity'
          ? '连续性解释仍然锚定在项目身份 / Phase 1 本地主数字生命主线 / 未闭环 open loops 上，而不是滑回泛化的 same-her 漂移修复。'
          : '显形侧证据仍与修复后的权威路径对齐，而不会在下一次转移里重新漂回去。'

  const secondChecklistLine = governanceAnchor === 'persona-thought'
    ? '轨迹事件能够解释漂移，同时不破坏活动线程连续性和候选项可追踪性。'
    : governanceAnchor === 'same-her-continuity'
      ? '接管审计与治理归位仍能解释这次连续性治理，同时不破坏活动线程连续性和候选项可追踪性。'
      : governanceAnchor === 'body-continuity'
        ? '接管审计与人格状态更新仍能解释这次身体连续性治理，同时不破坏活动线程连续性和候选项可追踪性。'
        : governanceAnchor === 'project-state-continuity'
          ? '接管审计与治理归位仍能解释这次项目状态连续性治理，同时不破坏活动线程连续性和候选项可追踪性。'
          : '时间线与消费轨迹仍然指向同一条连续的生命线程。'

  const eventAuditDetail = governanceAnchor === 'same-her-continuity'
    ? `优先检查 ${eventList}，找到这次反复治理背后最早的连续性锚点。`
    : governanceAnchor === 'body-continuity'
      ? bodyContinuityPhase === 'full-cross-modal-lock'
        ? `优先检查 ${eventList}，找到这次跨模态重锁态反复失稳背后最早松动的共同锁定点。`
        : bodyContinuityPhase === 'renderer-rejoin-without-body'
          ? survivingVisibleLane === 'face+lipsync+voice-only'
            ? `优先检查 ${eventList}，找到这次表情、口型、声音 same-her 存活线反复出现背后最早没能让 body、motion 重新接回的断点。`
            : survivingVisibleLane === 'motion+lipsync+voice-only'
              ? `优先检查 ${eventList}，找到这次动作、口型、声音 same-her 存活线反复出现背后最早没能让 body、face 重新接回的断点。`
              : survivingVisibleLane === 'face+lipsync-only'
                ? `优先检查 ${eventList}，找到这次表情、口型 same-her 存活线反复出现背后最早没能让 body、motion、voice 重新接回的断点。`
                : survivingVisibleLane === 'motion+lipsync-only'
                  ? `优先检查 ${eventList}，找到这次动作、口型 same-her 存活线反复出现背后最早没能让 body、face、voice 重新接回的断点。`
                  : `优先检查 ${eventList}，找到这次显形回接失身态反复出现背后最早丢掉身体承接的断点。`
          : bodyContinuityPhase === 'body-only-hold'
            ? `优先检查 ${eventList}，找到这次身体独撑态反复出现背后最早没有等到显形回接的承接点。`
            : `优先检查 ${eventList}，找到这次身体连续性反复失稳背后最早松动的身体线承接点。`
      : governanceAnchor === 'project-state-continuity'
        ? `优先检查 ${eventList}，找到这次项目状态连续性反复失稳背后最早丢失的项目身份、阶段或 open-loop 承接。`
        : `优先检查 ${eventList}，找到这次反复漂移背后最早的连续性断点。`

  const validateDetail = governanceAnchor === 'same-her-continuity'
    ? '改动后抓取新的聚焦快照，确认熟悉感仍以记忆先行的方式被治理，而不是被误推进成更近的可见靠近。'
    : governanceAnchor === 'body-continuity'
      ? bodyContinuityPhase === 'full-cross-modal-lock'
        ? `改动后抓取新的聚焦快照，确认身体线与 ${rendererRejoinSurfaceLabel}仍稳定锁在同一段 living segment 上，而不是只短暂对齐。`
        : bodyContinuityPhase === 'renderer-rejoin-without-body'
          ? survivingVisibleLane === 'face+lipsync+voice-only'
            ? '改动后抓取新的聚焦快照，确认新的转移不再把当前仅剩表情、口型、声音维持同一段连续性的 quieter carry 误判成修复完成。'
            : survivingVisibleLane === 'motion+lipsync+voice-only'
              ? '改动后抓取新的聚焦快照，确认新的转移不再把当前仅剩动作、口型、声音维持同一段连续性的 quieter carry 误判成修复完成。'
              : survivingVisibleLane === 'face+lipsync-only'
                ? '改动后抓取新的聚焦快照，确认新的转移不再把当前只有表情、口型这条 same-her 生命线仍在维持的 quieter carry 误判成修复完成。'
                : survivingVisibleLane === 'motion+lipsync-only'
                  ? '改动后抓取新的聚焦快照，确认新的转移不再把当前只有动作、口型这条 same-her 生命线仍在维持的 quieter carry 误判成修复完成。'
                  : `改动后抓取新的聚焦快照，确认新的转移不再把 ${rendererRejoinSurfaceLabel}已经回接、但身体线没有继续托住同一段 living segment 的失身回接误判成修复完成。`
          : bodyContinuityPhase === 'body-only-hold'
            ? '改动后抓取新的聚焦快照，确认身体线仍在独自托住同一段 living segment，而不是把这段低显形延续误写成已经失败或已经完成。'
            : `改动后抓取新的聚焦快照，确认身体线仍托住同一段 living segment，${rendererRejoinSurfaceLabel}也继续沿着同一条连续身体线补回。`
      : governanceAnchor === 'project-state-continuity'
        ? '改动后抓取新的聚焦快照，确认项目身份、Phase 1 本地主数字生命主线和未闭环 open loops 仍被同一个她稳定带着，而不是再次在回放里掉线。'
        : '改动后抓取新的聚焦快照，确认同一模式不再在下一次转移中重复。'

  const headline = governanceAnchor === 'body-continuity'
    ? bodyContinuityPhase === 'full-cross-modal-lock'
      ? `${repeatedTransitions} 次反复转移共享同一跨模态重锁态治理特征。`
      : bodyContinuityPhase === 'renderer-rejoin-without-body'
        ? survivingVisibleLane === 'face+lipsync+voice-only'
          ? `${repeatedTransitions} 次反复转移共享同一表情、口型、声音 same-her 存活线治理特征。`
          : survivingVisibleLane === 'motion+lipsync+voice-only'
            ? `${repeatedTransitions} 次反复转移共享同一动作、口型、声音 same-her 存活线治理特征。`
            : survivingVisibleLane === 'face+lipsync-only'
              ? `${repeatedTransitions} 次反复转移共享同一表情、口型 same-her 存活线治理特征。`
              : survivingVisibleLane === 'motion+lipsync-only'
                ? `${repeatedTransitions} 次反复转移共享同一动作、口型 same-her 存活线治理特征。`
                : `${repeatedTransitions} 次反复转移共享同一显形回接失身态治理特征。`
        : bodyContinuityPhase === 'body-only-hold'
          ? `${repeatedTransitions} 次反复转移共享同一身体独撑态治理特征。`
          : `${repeatedTransitions} 次反复转移共享同一${governanceAnchorDisplay.replace(/层$/, '')}漂移特征。`
    : `${repeatedTransitions} 次反复转移共享同一${governanceAnchorDisplay.replace(/层$/, '')}漂移特征。`

  return {
    headline,
    steps: [
      {
        key: 'restore-compare',
        title: '还原一组已记录转移',
        detail: '在修改策略前，先利用历史还原与前后对比，把这次反复漂移重新放回同一生命线程里复现。',
      },
      {
        key: 'governance-anchor',
        title: `把修复锚定在${governanceAnchorDisplay}`,
        detail: governanceStepDetail,
      },
      {
        key: 'evidence-trace',
        title: '先看证据，再看症状',
        detail: `先打开 ${evidenceList}，再顺着 ${traceList} 往下追。`,
      },
      {
        key: 'event-audit',
        title: '审计最早解释漂移的事件',
        detail: eventAuditDetail,
      },
      {
        key: 'validate',
        title: '修复后验证 same-her 连续性',
        detail: validateDetail,
      },
    ],
    validationChecklist: [
      firstChecklistLine,
      secondChecklistLine,
      governanceAnchor === 'same-her-continuity'
        ? '新的快照不再把同一治理态误标成需要修复的漂移模式。'
        : governanceAnchor === 'body-continuity'
          ? bodyContinuityPhase === 'full-cross-modal-lock'
            ? `新的快照不再把身体线与 ${rendererRejoinSurfaceLabel}共同锁回同一段 living segment 的稳定回归误写成短暂同步。`
            : bodyContinuityPhase === 'renderer-rejoin-without-body'
              ? survivingVisibleLane === 'face+lipsync+voice-only'
                ? '新的快照不再把当前仅剩表情、口型、声音维持同一段连续性的 quieter carry 误写成修复完成。'
                : survivingVisibleLane === 'motion+lipsync+voice-only'
                  ? '新的快照不再把当前仅剩动作、口型、声音维持同一段连续性的 quieter carry 误写成修复完成。'
                  : survivingVisibleLane === 'face+lipsync-only'
                    ? '新的快照不再把当前只有表情、口型这条 same-her 生命线仍在维持的 quieter carry 误写成修复完成。'
                    : survivingVisibleLane === 'motion+lipsync-only'
                      ? '新的快照不再把当前只有动作、口型这条 same-her 生命线仍在维持的 quieter carry 误写成修复完成。'
                      : `新的快照不再把 ${rendererRejoinSurfaceLabel}已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成修复完成。`
              : bodyContinuityPhase === 'body-only-hold'
                ? '新的快照不再把身体线独撑的低显形延续误写成已经失败或已经完成。'
                : `新的快照不再重演身体线先托住而 ${rendererRejoinSurfaceLabel}重新掉队的分裂状态。`
          : governanceAnchor === 'project-state-continuity'
            ? '新的快照不再丢失项目身份、Phase 1 主线或未闭环 open loops 的承接。'
            : sharedTailChecklist,
    ],
  }
}
