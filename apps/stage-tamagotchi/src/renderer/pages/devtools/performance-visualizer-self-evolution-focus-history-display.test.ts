import { describe, expect, it } from 'vitest'

import {
  buildSelfEvolutionFocusHistoryPatternGuidanceDisplay,
  buildSelfEvolutionFocusSnapshotDisplay,
  buildSelfEvolutionFocusSnapshotHistoryDisplay,
  formatSelfEvolutionRepairSurfaceLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

import * as selfEvolutionDisplay from './performance-visualizer-self-evolution-focus-history-display'

describe('performance visualizer self evolution focus history display', () => {
  it('maps a latest snapshot focus card id into a Chinese-first display label', () => {
    expect(buildSelfEvolutionFocusSnapshotDisplay({
      capturedAt: 300,
      candidateId: 'candidate-3',
      decisionTraceId: 'trace-3',
      activeThreadId: 'thread-3',
      selectedCardId: 'repair-owner',
    })).toEqual({
      capturedAt: 300,
      candidateId: 'candidate-3',
      decisionTraceId: 'trace-3',
      activeThreadId: 'thread-3',
      selectedCardId: 'repair-owner',
      focusLabel: '修复归属',
    })
  })

  it('maps snapshot history rows into Chinese-first focus labels while preserving routing fields', () => {
    expect(buildSelfEvolutionFocusSnapshotHistoryDisplay([
      {
        capturedAt: 300,
        decisionTraceId: 'trace-3',
        selectedCardId: 'repair-owner',
      },
      {
        capturedAt: 200,
        decisionTraceId: 'trace-2',
        selectedCardId: 'repair-path',
      },
    ])).toEqual([
      {
        capturedAt: 300,
        decisionTraceId: 'trace-3',
        selectedCardId: 'repair-owner',
        focusLabel: '修复归属',
      },
      {
        capturedAt: 200,
        decisionTraceId: 'trace-2',
        selectedCardId: 'repair-path',
        focusLabel: '修复路径',
      },
    ])
  })

  it('maps pattern guidance detail lists into Chinese-first human-facing labels', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidanceDisplay({
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
      summaryLine: '疑似反复出现的人格/思绪漂移。',
    })).toEqual({
      governanceLayerLabel: '人格/思绪层',
      repairOwnerHintLabel: '私有思绪治理',
      evidenceLabels: '私有思绪治理链，运行时连续性投影',
      traceLabels: '轨迹细节，选中轨迹事件',
      eventLabels: '接管审计，人格状态更新，治理归位',
    })
  })

  it('maps identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidanceDisplay({
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
      summaryLine: '这更像同一个她的连续性治理反复被确认。',
    })).toEqual({
      governanceLayerLabel: '同一个她连续性层',
      repairOwnerHintLabel: '连续性治理',
      evidenceLabels: '候选轨迹摘要，主动决策消费摘要，身份漂移治理摘要',
      traceLabels: '轨迹消费，轨迹细节',
      eventLabels: '接管审计，治理归位',
    })
  })

  it('maps body-continuity guidance labels into Chinese-first human-facing labels without collapsing them back into renderer authority', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidanceDisplay({
      governanceLayer: 'body-continuity',
      governanceLayerDisplay: '身体连续性层',
      repairOwnerHint: '身体连续性治理',
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
      summaryLine: '这更像身体连续性治理反复失稳。',
    })).toEqual({
      governanceLayerLabel: '身体连续性层',
      repairOwnerHintLabel: '身体连续性治理',
      evidenceLabels: '显形权威投影，运行时连续性投影',
      traceLabels: '轨迹时间线，选中轨迹事件，轨迹消费',
      eventLabels: '接管审计，人格状态更新',
    })
  })

  it('adds a project-state continuity prefix to repair surface labels when the route is explicitly checking Project identity carry, Phase 1 route carry, and Unresolved closure carry', () => {
    expect(formatSelfEvolutionRepairSurfaceLabel({
      targetType: 'event',
      targetId: 'takeover-audit',
      projectStateContinuity: true,
    })).toBe('项目状态连续性检查 / 事件 / 接管审计')
  })

  it('formats body-continuity governance and repair owner labels through the generic display helpers', () => {
    const formatSelfEvolutionGovernanceLayerLabel = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionGovernanceLayerLabel
    const formatSelfEvolutionRepairOwnerHint = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionRepairOwnerHint
    const formatRendererRejoinSurfaceLabel = (selfEvolutionDisplay as Record<string, unknown>).formatRendererRejoinSurfaceLabel
    const formatSelfEvolutionDisplayText = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionDisplayText

    expect(typeof formatSelfEvolutionGovernanceLayerLabel).toBe('function')
    expect(typeof formatSelfEvolutionRepairOwnerHint).toBe('function')
    expect(typeof formatRendererRejoinSurfaceLabel).toBe('function')
    expect(typeof formatSelfEvolutionDisplayText).toBe('function')

    if (
      typeof formatSelfEvolutionGovernanceLayerLabel !== 'function'
      || typeof formatSelfEvolutionRepairOwnerHint !== 'function'
      || typeof formatRendererRejoinSurfaceLabel !== 'function'
      || typeof formatSelfEvolutionDisplayText !== 'function'
    ) {
      return
    }

    expect(formatSelfEvolutionGovernanceLayerLabel('body-continuity')).toBe('身体连续性层')
    expect(formatSelfEvolutionRepairOwnerHint('身体连续性治理')).toBe('身体连续性治理')
    expect(formatRendererRejoinSurfaceLabel('authority:renderer-rejoin:speech')).toBe('speech')
    expect(formatRendererRejoinSurfaceLabel('authority:renderer-rejoin:live2d')).toBe('Live2D')
    expect(formatRendererRejoinSurfaceLabel('authority:renderer-rejoin:vrm')).toBe('VRM')
    expect(formatRendererRejoinSurfaceLabel(null)).toBe('renderer')
    expect(formatSelfEvolutionDisplayText('body-only-hold')).toBe('身体独撑态')
    expect(formatSelfEvolutionDisplayText('body-carried-to-renderer-rejoin')).toBe('身体承接态 -> 显形补回态')
    expect(formatSelfEvolutionDisplayText('full-cross-modal-lock')).toBe('跨模态重锁态')
    expect(formatSelfEvolutionDisplayText('renderer-rejoin-without-body')).toBe('显形回接失身态')
  })

  it('maps fixed self-evolution panel labels, field labels, and closure states into Chinese-first display text', () => {
    const formatSelfEvolutionDisplayText = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionDisplayText
    const formatSelfEvolutionClosureStatus = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionClosureStatus
    const formatSelfEvolutionRuntimeStatus = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionRuntimeStatus
    const formatSelfEvolutionRuntimeValue = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionRuntimeValue
    const formatSelfEvolutionBooleanValue = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionBooleanValue
    const formatSelfEvolutionGovernanceValue = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionGovernanceValue
    const formatSelfEvolutionLearningValue = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionLearningValue
    const formatSelfEvolutionMemoryResolutionValue = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionMemoryResolutionValue
    const formatSelfEvolutionTraceListValue = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionTraceListValue

    expect(typeof formatSelfEvolutionDisplayText).toBe('function')
    expect(typeof formatSelfEvolutionClosureStatus).toBe('function')
    expect(typeof formatSelfEvolutionRuntimeStatus).toBe('function')
    expect(typeof formatSelfEvolutionRuntimeValue).toBe('function')
    expect(typeof formatSelfEvolutionBooleanValue).toBe('function')
    expect(typeof formatSelfEvolutionGovernanceValue).toBe('function')
    expect(typeof formatSelfEvolutionLearningValue).toBe('function')
    expect(typeof formatSelfEvolutionMemoryResolutionValue).toBe('function')
    expect(typeof formatSelfEvolutionTraceListValue).toBe('function')

    if (
      typeof formatSelfEvolutionDisplayText !== 'function'
      || typeof formatSelfEvolutionClosureStatus !== 'function'
      || typeof formatSelfEvolutionRuntimeStatus !== 'function'
      || typeof formatSelfEvolutionRuntimeValue !== 'function'
      || typeof formatSelfEvolutionBooleanValue !== 'function'
      || typeof formatSelfEvolutionGovernanceValue !== 'function'
      || typeof formatSelfEvolutionLearningValue !== 'function'
      || typeof formatSelfEvolutionMemoryResolutionValue !== 'function'
      || typeof formatSelfEvolutionTraceListValue !== 'function'
    ) {
      return
    }

    expect(formatSelfEvolutionDisplayText('latest-snapshot')).toBe('最新快照')
    expect(formatSelfEvolutionDisplayText('snapshot-history')).toBe('快照历史')
    expect(formatSelfEvolutionDisplayText('focus-history-summary')).toBe('聚焦历史摘要')
    expect(formatSelfEvolutionDisplayText('repair-session-checklist')).toBe('修复会话检查清单')
    expect(formatSelfEvolutionDisplayText('repair-guidance')).toBe('修复指引')
    expect(formatSelfEvolutionDisplayText('trace-consumption-evidence')).toBe('轨迹消费证据')
    expect(formatSelfEvolutionDisplayText('cross-turn-candidate-consumption')).toBe('跨轮候选消费')
    expect(formatSelfEvolutionDisplayText('candidate-stability')).toBe('候选稳定性')
    expect(formatSelfEvolutionDisplayText('runtime-reasons')).toBe('运行时原因')
    expect(formatSelfEvolutionDisplayText('self-evolution-runtime')).toBe('自演化运行时')
    expect(formatSelfEvolutionDisplayText('snapshot')).toBe('快照')
    expect(formatSelfEvolutionDisplayText('active-candidate-id')).toBe('当前候选项 ID')
    expect(formatSelfEvolutionDisplayText('shadow-count')).toBe('影子候选数')
    expect(formatSelfEvolutionDisplayText('active-count')).toBe('激活候选数')
    expect(formatSelfEvolutionDisplayText('rejected-count')).toBe('拒绝候选数')
    expect(formatSelfEvolutionDisplayText('rolled-back-count')).toBe('回滚候选数')
    expect(formatSelfEvolutionDisplayText('candidates')).toBe('候选项列表')
    expect(formatSelfEvolutionDisplayText('selected-details')).toBe('选中详情')
    expect(formatSelfEvolutionDisplayText('active-summary')).toBe('当前摘要')
    expect(formatSelfEvolutionDisplayText('selected-candidate')).toBe('选中候选项')
    expect(formatSelfEvolutionDisplayText('source-turn-id')).toBe('来源轮次 ID')
    expect(formatSelfEvolutionDisplayText('source-event-id')).toBe('来源事件 ID')
    expect(formatSelfEvolutionDisplayText('activated-at')).toBe('激活时间')
    expect(formatSelfEvolutionDisplayText('rolled-back-at')).toBe('回滚时间')
    expect(formatSelfEvolutionDisplayText('replay-passed')).toBe('回放通过')
    expect(formatSelfEvolutionDisplayText('replay-required')).toBe('需要回放')
    expect(formatSelfEvolutionDisplayText('rollback-supported')).toBe('支持回滚')
    expect(formatSelfEvolutionDisplayText('final-replay-gate-passed')).toBe('最终回放闸门通过')
    expect(formatSelfEvolutionDisplayText('production-gold-sample-count')).toBe('生产金样本数')
    expect(formatSelfEvolutionDisplayText('production-gold-coverage')).toBe('生产金样本覆盖率')
    expect(formatSelfEvolutionDisplayText('patch-domain')).toBe('补丁域')
    expect(formatSelfEvolutionDisplayText('patch-action')).toBe('补丁动作')
    expect(formatSelfEvolutionDisplayText('reason-codes')).toBe('原因码')
    expect(formatSelfEvolutionDisplayText('blocked-reasons')).toBe('阻塞原因')
    expect(formatSelfEvolutionDisplayText('rollback-plan')).toBe('回滚计划')
    expect(formatSelfEvolutionDisplayText('candidate-consumption-preview')).toBe('候选消费预览')
    expect(formatSelfEvolutionDisplayText('memory')).toBe('记忆')
    expect(formatSelfEvolutionDisplayText('verification-strictness')).toBe('校验严格度')
    expect(formatSelfEvolutionDisplayText('top-k-expansion-active')).toBe('Top-K 扩展已启用')
    expect(formatSelfEvolutionDisplayText('wrong-thread-suppression-raised')).toBe('错误线程抑制已提升')
    expect(formatSelfEvolutionDisplayText('provenance-labeling-raised')).toBe('来源标注已提升')
    expect(formatSelfEvolutionDisplayText('source-weight-shift')).toBe('来源权重偏移')
    expect(formatSelfEvolutionDisplayText('resolved-posture')).toBe('已解析姿态')
    expect(formatSelfEvolutionDisplayText('repair-window-raised')).toBe('修复窗口已抬升')
    expect(formatSelfEvolutionDisplayText('closeness-capped')).toBe('亲密度已封顶')
    expect(formatSelfEvolutionDisplayText('warmth-may-release')).toBe('温度可释放')
    expect(formatSelfEvolutionDisplayText('hypothesis-labeling-raised')).toBe('假设标注已提升')
    expect(formatSelfEvolutionDisplayText('specificity-clamp-raised')).toBe('具体性钳制已提升')
    expect(formatSelfEvolutionDisplayText('template-shell-suppressed')).toBe('模板外壳已抑制')
    expect(formatSelfEvolutionDisplayText('hold-likely')).toBe('可能保持')
    expect(formatSelfEvolutionDisplayText('learning-proposal-raised')).toBe('学习提案已提升')
    expect(formatSelfEvolutionDisplayText('restraint-raised')).toBe('克制已提升')
    expect(formatSelfEvolutionDisplayText('cooldown-raised')).toBe('冷却已提升')
    expect(formatSelfEvolutionDisplayText('authority-surfaces')).toBe('权威表面')
    expect(formatSelfEvolutionDisplayText('persistent-mind-state')).toBe('持续心智状态')
    expect(formatSelfEvolutionDisplayText('host-person-model-present')).toBe('宿主人格模型已存在')
    expect(formatSelfEvolutionDisplayText('affective-residue-present')).toBe('情感残留已存在')
    expect(formatSelfEvolutionDisplayText('self-evolution-present')).toBe('自演化已存在')
    expect(formatSelfEvolutionDisplayText('learning-execution-present')).toBe('学习执行已存在')
    expect(formatSelfEvolutionDisplayText('recall-latency-policy-present')).toBe('召回延迟策略已存在')
    expect(formatSelfEvolutionDisplayText('derived-mind-state-bundle-present')).toBe('派生心智状态包已存在')
    expect(formatSelfEvolutionDisplayText('dominant-trajectory')).toBe('主导轨迹')
    expect(formatSelfEvolutionDisplayText('next-learning-action')).toBe('下一学习动作')
    expect(formatSelfEvolutionDisplayText('active-focuses')).toBe('活跃焦点')
    expect(formatSelfEvolutionDisplayText('activeFocuses')).toBe('activeFocuses')
    expect(formatSelfEvolutionDisplayText('turn-trace-state')).toBe('轮次轨迹状态')
    expect(formatSelfEvolutionDisplayText('memory-stage-replay-present')).toBe('记忆阶段回放已存在')
    expect(formatSelfEvolutionDisplayText('memory-resolution-ledger-present')).toBe('记忆解析账本已存在')
    expect(formatSelfEvolutionDisplayText('latest-trace-stage')).toBe('最近轨迹阶段')
    expect(formatSelfEvolutionDisplayText('latest-trace-closure-state')).toBe('最近轨迹闭环状态')
    expect(formatSelfEvolutionDisplayText('latest-trace-surface-policy')).toBe('最近轨迹表面策略')
    expect(formatSelfEvolutionDisplayText('suppression-tags')).toBe('抑制标签')
    expect(formatSelfEvolutionDisplayText('runtime-alignment')).toBe('运行时对齐')
    expect(formatSelfEvolutionDisplayText('relationship')).toBe('关系')
    expect(formatSelfEvolutionDisplayText('response')).toBe('响应')
    expect(formatSelfEvolutionDisplayText('proactive')).toBe('主动性')
    expect(formatSelfEvolutionDisplayText('learning')).toBe('学习')
    expect(formatSelfEvolutionDisplayText('birth-persona-authority')).toBe('初生人格权威')
    expect(formatSelfEvolutionDisplayText('persona-authority-mapping')).toBe('人格权威映射')
    expect(formatSelfEvolutionDisplayText('personality-trajectory')).toBe('人格轨迹')
    expect(formatSelfEvolutionDisplayText('identity-drift-governance')).toBe('身份漂移治理')
    expect(formatSelfEvolutionDisplayText('candidate-impact-summary')).toBe('候选影响摘要')
    expect(formatSelfEvolutionDisplayText('baseline-anchor-audit')).toBe('基线锚点审计')
    expect(formatSelfEvolutionDisplayText('self-evolution-summary')).toBe('自演化摘要')
    expect(formatSelfEvolutionDisplayText('focus-repair-path')).toBe('聚焦修复路径')
    expect(formatSelfEvolutionDisplayText('capture-focus-snapshot')).toBe('捕获聚焦快照')
    expect(formatSelfEvolutionDisplayText('id')).toBe('ID')
    expect(formatSelfEvolutionDisplayText('expected-posture')).toBe('预期姿态')
    expect(formatSelfEvolutionDisplayText('planner-posture')).toBe('规划器姿态')
    expect(formatSelfEvolutionDisplayText('compiler-posture')).toBe('编译器姿态')
    expect(formatSelfEvolutionDisplayText('confirmed-signals')).toBe('确认信号')
    expect(formatSelfEvolutionDisplayText('expected-signals')).toBe('预期信号')
    expect(formatSelfEvolutionDisplayText('observed-signals')).toBe('观测信号')
    expect(formatSelfEvolutionDisplayText('expected-hold')).toBe('预期保持')
    expect(formatSelfEvolutionDisplayText('should-speak')).toBe('应当发声')
    expect(formatSelfEvolutionDisplayText('selected-action')).toBe('选中动作')
    expect(formatSelfEvolutionDisplayText('expected-action')).toBe('预期动作')
    expect(formatSelfEvolutionDisplayText('runtime-action')).toBe('运行时动作')
    expect(formatSelfEvolutionDisplayText('kernel-action')).toBe('内核动作')
    expect(formatSelfEvolutionDisplayText('open-selected-candidate-trace')).toBe('打开选中候选项轨迹')
    expect(formatSelfEvolutionDisplayText('open-trace-short')).toBe('打开轨迹')
    expect(formatSelfEvolutionDisplayText('trace-events-count')).toBe('轨迹事件数')
    expect(formatSelfEvolutionDisplayText('trace-records-count')).toBe('轨迹记录数')
    expect(formatSelfEvolutionDisplayText('trace-summary')).toBe('轨迹摘要')
    expect(formatSelfEvolutionDisplayText('trace-coverage')).toBe('轨迹覆盖')
    expect(formatSelfEvolutionDisplayText('trace-event-kinds')).toBe('轨迹事件类型')
    expect(formatSelfEvolutionDisplayText('trace-timeline')).toBe('轨迹时间线')
    expect(formatSelfEvolutionDisplayText('selected-trace-event')).toBe('选中轨迹事件')
    expect(formatSelfEvolutionDisplayText('no-drilled-trace-events-yet')).toBe('暂无下钻轨迹事件。')
    expect(formatSelfEvolutionDisplayText('inspect-event')).toBe('检查事件')
    expect(formatSelfEvolutionDisplayText('inspect-short')).toBe('检查')
    expect(formatSelfEvolutionDisplayText('no-structured-event-details')).toBe('暂无结构化事件细节。')
    expect(formatSelfEvolutionDisplayText('candidate')).toBe('候选项')
    expect(formatSelfEvolutionDisplayText('trace')).toBe('轨迹')
    expect(formatSelfEvolutionDisplayText('owner')).toBe('归属')
    expect(formatSelfEvolutionDisplayText('matched-candidate-id')).toBe('匹配候选项 ID')
    expect(formatSelfEvolutionDisplayText('matched-active-candidate-id')).toBe('匹配当前候选项 ID')
    expect(formatSelfEvolutionDisplayText('trace-patch-id')).toBe('轨迹补丁 ID')
    expect(formatSelfEvolutionDisplayText('trace-patch-decision-trace-id')).toBe('轨迹补丁决策轨迹 ID')
    expect(formatSelfEvolutionDisplayText('matched-patch-id')).toBe('匹配补丁 ID')
    expect(formatSelfEvolutionDisplayText('matched-decision-trace-id')).toBe('匹配决策轨迹 ID')
    expect(formatSelfEvolutionDisplayText('trace-lanes')).toBe('轨迹通道')
    expect(formatSelfEvolutionDisplayText('trace-reason-codes')).toBe('轨迹原因码')
    expect(formatSelfEvolutionDisplayText('missing-signals')).toBe('缺失信号')
    expect(formatSelfEvolutionDisplayText('drifting-signals')).toBe('漂移信号')
    expect(formatSelfEvolutionDisplayText('decision-trace-id')).toBe('决策轨迹 ID')
    expect(formatSelfEvolutionDisplayText('turn-id')).toBe('轮次 ID')
    expect(formatSelfEvolutionDisplayText('consumed-at')).toBe('消费时间')
    expect(formatSelfEvolutionDisplayText('lanes')).toBe('通道')
    expect(formatSelfEvolutionDisplayText('trajectory-summary')).toBe('轨迹摘要')
    expect(formatSelfEvolutionDisplayText('consumed-turn-count')).toBe('已消费轮次数')
    expect(formatSelfEvolutionDisplayText('latest-consumed-at')).toBe('最近消费时间')
    expect(formatSelfEvolutionDisplayText('latest-decision-trace-id')).toBe('最近决策轨迹 ID')
    expect(formatSelfEvolutionDisplayText('dominant-learning-action')).toBe('主导学习动作')
    expect(formatSelfEvolutionDisplayText('lane-coverage')).toBe('通道覆盖')
    expect(formatSelfEvolutionDisplayText('drift-detected')).toBe('检测到漂移')
    expect(formatSelfEvolutionDisplayText('trace-turn-mode')).toBe('轨迹轮次模式')
    expect(formatSelfEvolutionDisplayText('trace-truth-state')).toBe('轨迹真值状态')
    expect(formatSelfEvolutionDisplayText('trace-repair-state')).toBe('轨迹修复状态')
    expect(formatSelfEvolutionDisplayText('trace-answer-subject')).toBe('轨迹回答主体')
    expect(formatSelfEvolutionDisplayText('trace-screen-reference-mode')).toBe('轨迹屏幕引用模式')
    expect(formatSelfEvolutionDisplayText('learning-action')).toBe('学习动作')
    expect(formatSelfEvolutionDisplayText('learning-domain')).toBe('学习域')
    expect(formatSelfEvolutionDisplayText('learning-result')).toBe('学习结果')
    expect(formatSelfEvolutionDisplayText('resolution-surface-policy')).toBe('解析表面策略')
    expect(formatSelfEvolutionDisplayText('resolution-closure-state')).toBe('解析闭环状态')
    expect(formatSelfEvolutionDisplayText('resolution-suppression-tags')).toBe('解析抑制标签')
    expect(formatSelfEvolutionDisplayText('memory-stage')).toBe('记忆阶段')
    expect(formatSelfEvolutionDisplayText('memory-stage-summary')).toBe('记忆阶段摘要')
    expect(formatSelfEvolutionDisplayText('memory-stage-latency-ms')).toBe('记忆阶段延迟毫秒')
    expect(formatSelfEvolutionDisplayText('resolution-rationale')).toBe('解析依据')
    expect(formatSelfEvolutionDisplayText('kind')).toBe('类型')
    const formatSelfEvolutionCandidateStatus = (selfEvolutionDisplay as Record<string, unknown>).formatSelfEvolutionCandidateStatus
    expect(typeof formatSelfEvolutionCandidateStatus).toBe('function')

    if (typeof formatSelfEvolutionCandidateStatus !== 'function')
      return

    expect(formatSelfEvolutionCandidateStatus('shadow')).toBe('影子')
    expect(formatSelfEvolutionCandidateStatus('active')).toBe('激活')
    expect(formatSelfEvolutionCandidateStatus('rejected')).toBe('拒绝')
    expect(formatSelfEvolutionCandidateStatus('rolled-back')).toBe('回滚')
    expect(formatSelfEvolutionCandidateStatus('unknown-status')).toBe('unknown-status')
    expect(formatSelfEvolutionDisplayText('apply-workflow-context')).toBe('应用工作流上下文')
    expect(formatSelfEvolutionDisplayText('restore-current-short')).toBe('恢复当前侧')
    expect(formatSelfEvolutionDisplayText('unknown-self-evolution-key')).toBe('unknown-self-evolution-key')

    expect(formatSelfEvolutionClosureStatus(true)).toBe('已闭环')
    expect(formatSelfEvolutionClosureStatus(false)).toBe('未闭环')

    expect(formatSelfEvolutionRuntimeStatus('grounded')).toBe('已落地')
    expect(formatSelfEvolutionRuntimeStatus('partial')).toBe('部分落地')
    expect(formatSelfEvolutionRuntimeStatus('missing')).toBe('缺失')
    expect(formatSelfEvolutionRuntimeStatus('drifted')).toBe('已漂移')
    expect(formatSelfEvolutionRuntimeStatus('predicted-only')).toBe('仅预测')
    expect(formatSelfEvolutionRuntimeStatus('unknown-status')).toBe('unknown-status')

    expect(formatSelfEvolutionRuntimeValue('posture', 'observe-first')).toBe('先观察')
    expect(formatSelfEvolutionRuntimeValue('posture', 'unknown-posture')).toBe('unknown-posture')
    expect(formatSelfEvolutionRuntimeValue('action', 'hover')).toBe('悬停')
    expect(formatSelfEvolutionRuntimeValue('action', 'hold')).toBe('保持')
    expect(formatSelfEvolutionRuntimeValue('action', 'observe_focus')).toBe('观察焦点')
    expect(formatSelfEvolutionRuntimeValue('action', 'unknown-action')).toBe('unknown-action')
    expect(formatSelfEvolutionRuntimeValue('other', 'hold')).toBe('hold')

    expect(formatSelfEvolutionBooleanValue(true)).toBe('是')
    expect(formatSelfEvolutionBooleanValue(false)).toBe('否')
    expect(formatSelfEvolutionBooleanValue(null)).toBe('n/a')

    expect(formatSelfEvolutionGovernanceValue('turn-mode', 'care')).toBe('关怀')
    expect(formatSelfEvolutionGovernanceValue('truth-state', 'live-grounded')).toBe('现实落地')
    expect(formatSelfEvolutionGovernanceValue('repair-state', 'none')).toBe('无')
    expect(formatSelfEvolutionGovernanceValue('memory-stage', 'recall')).toBe('召回')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'task-knot')).toBe('任务结')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'relationship')).toBe('关系')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'alicization-self')).toBe('Alicization 自我')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'host-state')).toBe('宿主状态')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'visible-scene')).toBe('可见场景')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'self-model')).toBe('自我模型')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'general')).toBe('通用')
    expect(formatSelfEvolutionGovernanceValue('screen-reference-mode', 'avoid')).toBe('避免引用屏幕')
    expect(formatSelfEvolutionGovernanceValue('screen-reference-mode', 'helpful')).toBe('按需引用屏幕')
    expect(formatSelfEvolutionGovernanceValue('screen-reference-mode', 'required')).toBe('必须引用屏幕')
    expect(formatSelfEvolutionGovernanceValue('unknown-kind', 'care')).toBe('care')
    expect(formatSelfEvolutionGovernanceValue('turn-mode', 'unknown-mode')).toBe('unknown-mode')
    expect(formatSelfEvolutionGovernanceValue('answer-subject', 'unknown-subject')).toBe('unknown-subject')

    expect(formatSelfEvolutionLearningValue('action', 'record')).toBe('记录')
    expect(formatSelfEvolutionLearningValue('action', 'reflect')).toBe('反思')
    expect(formatSelfEvolutionLearningValue('action', 'verify')).toBe('验证')
    expect(formatSelfEvolutionLearningValue('action', 'revise')).toBe('修订')
    expect(formatSelfEvolutionLearningValue('action', 'internalize')).toBe('内化')
    expect(formatSelfEvolutionLearningValue('action', 'hold')).toBe('保持')
    expect(formatSelfEvolutionLearningValue('domain', 'procedure')).toBe('程序性知识')
    expect(formatSelfEvolutionLearningValue('domain', 'relationship')).toBe('关系')
    expect(formatSelfEvolutionLearningValue('domain', 'self-model')).toBe('自我模型')
    expect(formatSelfEvolutionLearningValue('domain', 'world-model')).toBe('世界模型')
    expect(formatSelfEvolutionLearningValue('domain', 'general')).toBe('通用')
    expect(formatSelfEvolutionLearningValue('domain', 'dialogue-style')).toBe('对话风格')
    expect(formatSelfEvolutionLearningValue('domain', 'proactive-policy')).toBe('主动策略')
    expect(formatSelfEvolutionLearningValue('unknown-kind', 'verify')).toBe('verify')
    expect(formatSelfEvolutionLearningValue('action', 'unknown-action')).toBe('unknown-action')
    expect(formatSelfEvolutionLearningValue('domain', 'unknown-domain')).toBe('unknown-domain')

    expect(formatSelfEvolutionMemoryResolutionValue('surface-policy', 'procedural-carry')).toBe('程序延续')
    expect(formatSelfEvolutionMemoryResolutionValue('surface-policy', 'authority-first')).toBe('权威优先')
    expect(formatSelfEvolutionMemoryResolutionValue('surface-policy', 'internal-only')).toBe('仅内部保留')
    expect(formatSelfEvolutionMemoryResolutionValue('surface-policy', 'answer-anchoring')).toBe('回答锚定')
    expect(formatSelfEvolutionMemoryResolutionValue('surface-policy', 'gist-first')).toBe('先给要点')
    expect(formatSelfEvolutionMemoryResolutionValue('closure-state', 'grounded-recall')).toBe('已落地召回')
    expect(formatSelfEvolutionMemoryResolutionValue('closure-state', 'approximate-recall')).toBe('近似召回')
    expect(formatSelfEvolutionMemoryResolutionValue('closure-state', 'conflicted-recall')).toBe('冲突召回')
    expect(formatSelfEvolutionMemoryResolutionValue('closure-state', 'inward-only')).toBe('仅内隐保留')
    expect(formatSelfEvolutionMemoryResolutionValue('closure-state', 'no-recall')).toBe('无召回')
    expect(formatSelfEvolutionMemoryResolutionValue('closure-state', 'open-loop')).toBe('未闭环')
    expect(formatSelfEvolutionMemoryResolutionValue('unknown-kind', 'grounded-recall')).toBe('grounded-recall')
    expect(formatSelfEvolutionMemoryResolutionValue('surface-policy', 'unknown-policy')).toBe('unknown-policy')
    expect(formatSelfEvolutionMemoryResolutionValue('closure-state', 'unknown-closure')).toBe('unknown-closure')

    expect(formatSelfEvolutionTraceListValue('event-kind', 'governance-normalized')).toBe('治理归位')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'recall-attribution')).toBe('召回归因')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'memory-deliberation-judged')).toBe('记忆审议已判定')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'memory-followup-deferred')).toBe('记忆后续已延后')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'memory-wrong-thread-suppressed')).toBe('错误线程记忆已抑制')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'dispatch')).toBe('派发')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'result')).toBe('结果')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'persistence-written')).toBe('持久化已写入')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'wrong-thread')).toBe('错误线程')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'nearby-thread')).toBe('邻近线程')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'late-night-fatigue')).toBe('深夜疲劳')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'companionship')).toBe('陪伴优先')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'other-thread')).toBe('其他线程')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'stable-core')).toBe('稳定核心')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'local-fallback')).toBe('本地回退')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'upstream-suppression')).toBe('上游抑制')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'old-branch')).toBe('旧分支')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'self-model-stale')).toBe('自我模型过期')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'relationship-era-confusion')).toBe('关系时期混淆')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'unsupported-specificity')).toBe('不支持的具体化')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'should-not-win')).toBe('不应胜出')
    expect(formatSelfEvolutionTraceListValue('lane', 'memory-policy')).toBe('记忆策略')
    expect(formatSelfEvolutionTraceListValue('lane', 'response-posture')).toBe('响应姿态')
    expect(formatSelfEvolutionTraceListValue('lane', 'learning-policy')).toBe('学习策略')
    expect(formatSelfEvolutionTraceListValue('lane', 'proactive-policy')).toBe('主动策略')
    expect(formatSelfEvolutionTraceListValue('lane', 'rollback-validation')).toBe('回滚校验')
    expect(formatSelfEvolutionTraceListValue('lane', 'relationship-posture')).toBe('关系姿态')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'domain:self-model')).toBe('领域：自我模型')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'domain:world-model')).toBe('领域：世界模型')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'domain:presence')).toBe('领域：存在显形')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'rollback-validation-required')).toBe('需要回滚校验')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'world-model-revalidation-required')).toBe('需要重新校验世界模型')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'presence-revalidation-required')).toBe('需要重新校验存在显形')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'self-evolution:active-version-present')).toBe('自演化：存在激活版本')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'self-evolution:shadow-candidates-present')).toBe('自演化：存在影子候选')
    expect(formatSelfEvolutionTraceListValue('trace-signal', 'candidate-id-mismatch')).toBe('候选项 ID 不匹配')
    expect(formatSelfEvolutionTraceListValue('trace-signal', 'patch-id-mismatch')).toBe('补丁 ID 不匹配')
    expect(formatSelfEvolutionTraceListValue('trace-signal', 'decision-trace-mismatch')).toBe('决策轨迹不匹配')
    expect(formatSelfEvolutionTraceListValue('trace-signal', 'traceCandidate:candidate-other')).toBe('轨迹候选项：candidate-other')
    expect(formatSelfEvolutionTraceListValue('trace-signal', 'tracePatch:patch-other')).toBe('轨迹补丁：patch-other')
    expect(formatSelfEvolutionTraceListValue('trace-signal', 'traceDecisionTrace:trace-other')).toBe('轨迹决策轨迹：trace-other')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'hypothesis-labeling')).toBe('假设标注')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'specificity-clamp')).toBe('具体性钳制')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'template-shell-suppression')).toBe('模板外壳抑制')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'planner:warm')).toBe('规划器：温暖')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'planner:restrained')).toBe('规划器：克制')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'compiler:restrained')).toBe('编译器：克制')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'shouldSpeak:true')).toBe('应当发声：是')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'shouldSpeak:false')).toBe('应当发声：否')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'selectedAction:speak')).toBe('选中动作：发声')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'selectedAction:hold')).toBe('选中动作：保持')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'runtimeAction:reflect')).toBe('运行时动作：反思')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'runtimeAction:verify')).toBe('运行时动作：验证')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'kernelAction:reflect')).toBe('内核动作：反思')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'kernelAction:verify')).toBe('内核动作：验证')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'focus:world-model')).toBe('焦点：世界模型')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'focus:relationship')).toBe('焦点：关系')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'focus:presence')).toBe('焦点：存在显形')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'opening-guidance:callback-bounded')).toBe('开场引导：回调受限')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'identityKernel.relationshipPosture:observer')).toBe('身份内核关系姿态：观察者')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'identityKernel.initiativeStyle:observant')).toBe('身份内核主动风格：观察型')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'initiativeBaseline.silenceReconnect:hold')).toBe('主动基线静默重连：保持')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'initiativeBaseline.comfortStyle:quiet-presence')).toBe('主动基线安抚风格：安静陪伴')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'personStateProjection.preferredProactiveStyle:silent-observe')).toBe('人格投影偏好主动风格：静默观察')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'runtime.personaBias')).toBe('运行时人格偏置')
    expect(formatSelfEvolutionTraceListValue('unknown-kind', 'result')).toBe('result')
    expect(formatSelfEvolutionTraceListValue('event-kind', 'unknown-event-kind')).toBe('unknown-event-kind')
    expect(formatSelfEvolutionTraceListValue('suppression-tag', 'unknown-tag')).toBe('unknown-tag')
    expect(formatSelfEvolutionTraceListValue('lane', 'unknown-lane')).toBe('unknown-lane')
    expect(formatSelfEvolutionTraceListValue('reason-code', 'unknown-reason')).toBe('unknown-reason')
    expect(formatSelfEvolutionTraceListValue('trace-signal', 'unknown-trace-signal')).toBe('unknown-trace-signal')
    expect(formatSelfEvolutionTraceListValue('alignment-signal', 'unknown-alignment-signal')).toBe('unknown-alignment-signal')
  })
})
