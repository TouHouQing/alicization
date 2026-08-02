function mapValue(
  value: string | null | undefined,
  mapping: Record<string, string>,
) {
  if (!value)
    return 'n/a'
  return mapping[value] ?? value
}

const focusCardLabels: Record<string, string> = {
  'repair-owner': '修复归属',
  'first-check': '首查点',
  'repair-path': '修复路径',
}

const evidencePanelLabels: Record<string, string> = {
  'candidate-trajectory-summary': '候选轨迹摘要',
  'proactive-decision-consumption-summary': '主动决策消费摘要',
  'persona-bias-provenance': '人格偏置来源',
  'proactive-action-chain': '主动行动链',
  'proactive-manifestation-chain': '主动显形链',
  'runtime-continuity-projection': '运行时连续性投影',
  'renderer-authority-projection': '显形权威投影',
}

const traceSectionLabels: Record<string, string> = {
  'trace-consumption': '轨迹消费',
  'trace-details': '轨迹细节',
  'trace-timeline': '轨迹时间线',
  'selected-trace-event': '选中轨迹事件',
}

const traceEventLabels: Record<string, string> = {
  'event-person-state': '人格状态事件',
  'event-takeover': '接管事件',
  'event-governance': '治理事件',
}

const eventKindLabels: Record<string, string> = {
  'person-state-updated': '人格状态更新',
  'takeover-audit': '接管审计',
  'governance-normalized': '治理归位',
}

const governanceLayerLabels: Record<string, string> = {
  'persona': '人格层',
  'renderer-authority': '显形权威层',
  'body-continuity': '身体连续性层',
}

const workflowSideLabels: Record<string, string> = {
  current: '当前侧',
  previous: '前一侧',
}

const repairOwnerHintLabels: Record<string, string> = {
  'persona': '人格',
  'renderer authority': '显形权威',
  '身体连续性治理': '身体连续性治理',
}

const candidateStatusLabels: Record<string, string> = {
  'shadow': '影子',
  'active': '激活',
  'rejected': '拒绝',
  'rolled-back': '回滚',
}

const runtimeStatusLabels: Record<string, string> = {
  'grounded': '已落地',
  'partial': '部分落地',
  'missing': '缺失',
  'drifted': '已漂移',
  'predicted-only': '仅预测',
}

const runtimePostureLabels: Record<string, string> = {
  'observe-first': '先观察',
  'warm': '温暖',
  'restrained': '克制',
  'observer': '观察者',
}

const runtimeActionLabels: Record<string, string> = {
  hover: '悬停',
  hold: '保持',
  observe_focus: '观察焦点',
}

const governanceTurnModeLabels: Record<string, string> = {
  care: '关怀',
}

const governanceTruthStateLabels: Record<string, string> = {
  'live-grounded': '现实落地',
}

const governanceRepairStateLabels: Record<string, string> = {
  none: '无',
}

const governanceMemoryStageLabels: Record<string, string> = {
  recall: '召回',
}

const governanceAnswerSubjectLabels: Record<string, string> = {
  'task-knot': '任务结',
  'relationship': '关系',
  'alicization-self': 'Alicization 自我',
  'host-state': '宿主状态',
  'visible-scene': '可见场景',
  'self-model': '自我模型',
  'general': '通用',
}

const governanceScreenReferenceModeLabels: Record<string, string> = {
  avoid: '避免引用屏幕',
  helpful: '按需引用屏幕',
  required: '必须引用屏幕',
}

const learningActionLabels: Record<string, string> = {
  record: '记录',
  reflect: '反思',
  verify: '验证',
  revise: '修订',
  internalize: '内化',
  hold: '保持',
}

const learningDomainLabels: Record<string, string> = {
  'procedure': '程序性知识',
  'relationship': '关系',
  'self-model': '自我模型',
  'world-model': '世界模型',
  'general': '通用',
  'dialogue-style': '对话风格',
  'proactive-policy': '主动策略',
}

const memoryResolutionSurfacePolicyLabels: Record<string, string> = {
  'procedural-carry': '程序延续',
  'authority-first': '权威优先',
  'internal-only': '仅内部保留',
  'answer-anchoring': '回答锚定',
  'gist-first': '先给要点',
}

const memoryResolutionClosureStateLabels: Record<string, string> = {
  'grounded-recall': '已落地召回',
  'approximate-recall': '近似召回',
  'conflicted-recall': '冲突召回',
  'inward-only': '仅内隐保留',
  'no-recall': '无召回',
  'open-loop': '未闭环',
}

const traceEventKindValueLabels: Record<string, string> = {
  'governance-normalized': '治理归位',
  'recall-attribution': '召回归因',
  'memory-deliberation-judged': '记忆审议已判定',
  'memory-followup-deferred': '记忆后续已延后',
  'memory-wrong-thread-suppressed': '错误线程记忆已抑制',
  'dispatch': '派发',
  'result': '结果',
  'persistence-written': '持久化已写入',
}

const traceSuppressionTagLabels: Record<string, string> = {
  'wrong-thread': '错误线程',
  'nearby-thread': '邻近线程',
  'late-night-fatigue': '深夜疲劳',
  'companionship': '陪伴优先',
  'other-thread': '其他线程',
  'stable-core': '稳定核心',
  'local-fallback': '本地回退',
  'upstream-suppression': '上游抑制',
  'old-branch': '旧分支',
  'self-model-stale': '自我模型过期',
  'relationship-era-confusion': '关系时期混淆',
  'unsupported-specificity': '不支持的具体化',
  'should-not-win': '不应胜出',
}

const traceLaneLabels: Record<string, string> = {
  'memory-policy': '记忆策略',
  'response-posture': '响应姿态',
  'learning-policy': '学习策略',
  'proactive-policy': '主动策略',
  'rollback-validation': '回滚校验',
  'relationship-posture': '关系姿态',
}

const traceReasonCodeLabels: Record<string, string> = {
  'rollback-validation-required': '需要回滚校验',
  'world-model-revalidation-required': '需要重新校验世界模型',
  'presence-revalidation-required': '需要重新校验存在显形',
  'self-evolution:active-version-present': '自演化：存在激活版本',
  'self-evolution:shadow-candidates-present': '自演化：存在影子候选',
}

const traceSignalLabels: Record<string, string> = {
  'candidate-id-mismatch': '候选项 ID 不匹配',
  'patch-id-mismatch': '补丁 ID 不匹配',
  'decision-trace-mismatch': '决策轨迹不匹配',
}

const alignmentSignalLabels: Record<string, string> = {
  'hypothesis-labeling': '假设标注',
  'specificity-clamp': '具体性钳制',
  'runtime.personaBias': '运行时人格偏置',
}

const selfEvolutionDisplayTextLabels: Record<string, string> = {
  'self-evolution-runtime': '自演化运行时',
  'snapshot': '快照',
  'active-candidate-id': '当前候选项 ID',
  'shadow-count': '影子候选数',
  'active-count': '激活候选数',
  'rejected-count': '拒绝候选数',
  'rolled-back-count': '回滚候选数',
  'latest-snapshot': '最新快照',
  'candidate': '候选项',
  'trace': '轨迹',
  'thread': '线程',
  'focus': '聚焦',
  'snapshot-history': '快照历史',
  'focus-history-summary': '聚焦历史摘要',
  'owner': '归属',
  'repair-session-checklist': '修复会话检查清单',
  'completion': '完成度',
  'repair-closure': '修复闭环',
  'status': '状态',
  'next-action': '下一步动作',
  'run-suggested-repair-action': '执行建议修复动作',
  'run-next-action-short': '执行下一步',
  'action-feedback': '动作反馈',
  'baseline-quality': '基线质量',
  'baseline-adoption': '基线采纳',
  'adopted-anchor': '已采纳锚点',
  'adoption-audit': '采纳审计',
  'history-drilldown': '历史钻取',
  'previous-current-comparison': '前后对比',
  'show-diff-detail': '显示前后差异高亮',
  'show-diff-short': '查看差异',
  'restore-previous-detail': '恢复前一侧漂移状态',
  'restore-previous-short': '恢复前一侧',
  'restore-current-detail': '恢复当前侧漂移状态',
  'restore-current-short': '恢复当前侧',
  'body-only-hold': '身体独撑态',
  'body-carried-to-renderer-rejoin': '身体承接态 -> 显形补回态',
  'full-cross-modal-lock': '跨模态重锁态',
  'renderer-rejoin-without-body': '显形回接失身态',
  'recurring-drift-patterns': '重复漂移模式',
  'occurrences': '出现记录',
  'repair-guidance': '修复指引',
  'repair-workflow': '修复工作流',
  'apply-workflow-context': '应用工作流上下文',
  'validation-checklist': '校验清单',
  'layer': '层级',
  'evidence': '证据',
  'events': '事件',
  'focus-diff-vs-last-snapshot': '相对上一快照的聚焦差异',
  'persona-action-evidence': '人格动作证据',
  'trace-consumption-evidence': '轨迹消费证据',
  'cross-turn-candidate-consumption': '跨轮候选消费',
  'candidate-stability': '候选稳定性',
  'runtime-reasons': '运行时原因',
  'candidates': '候选项列表',
  'selected-details': '选中详情',
  'active-summary': '当前摘要',
  'selected-candidate': '选中候选项',
  'source-turn-id': '来源轮次 ID',
  'source-event-id': '来源事件 ID',
  'activated-at': '激活时间',
  'rolled-back-at': '回滚时间',
  'replay-passed': '回放通过',
  'replay-required': '需要回放',
  'rollback-supported': '支持回滚',
  'final-replay-gate-passed': '最终回放闸门通过',
  'production-gold-sample-count': '生产金样本数',
  'production-gold-coverage': '生产金样本覆盖率',
  'patch-domain': '补丁域',
  'patch-action': '补丁动作',
  'reason-codes': '原因码',
  'blocked-reasons': '阻塞原因',
  'internalization-readiness': '内化就绪度',
  'rollback-plan': '回滚计划',
  'candidate-consumption-preview': '候选消费预览',
  'memory': '记忆',
  'verification-strictness': '校验严格度',
  'top-k-expansion-active': 'Top-K 扩展已启用',
  'wrong-thread-suppression-raised': '错误线程抑制已提升',
  'provenance-labeling-raised': '来源标注已提升',
  'source-weight-shift': '来源权重偏移',
  'resolved-posture': '已解析姿态',
  'repair-window-raised': '修复窗口已抬升',
  'closeness-capped': '亲密度已封顶',
  'warmth-may-release': '温度可释放',
  'hypothesis-labeling-raised': '假设标注已提升',
  'specificity-clamp-raised': '具体性钳制已提升',
  'hold-likely': '可能保持',
  'learning-proposal-raised': '学习提案已提升',
  'restraint-raised': '克制已提升',
  'cooldown-raised': '冷却已提升',
  'authority-surfaces': '权威表面',
  'persistent-mind-state': '持续心智状态',
  'host-person-model-present': '宿主人格模型已存在',
  'affective-residue-present': '情感残留已存在',
  'self-evolution-present': '自演化已存在',
  'learning-execution-present': '学习执行已存在',
  'recall-latency-policy-present': '召回延迟策略已存在',
  'derived-mind-state-bundle-present': '派生心智状态包已存在',
  'dominant-trajectory': '主导轨迹',
  'next-learning-action': '下一学习动作',
  'active-focuses': '活跃焦点',
  'turn-trace-state': '轮次轨迹状态',
  'memory-stage-replay-present': '记忆阶段回放已存在',
  'memory-resolution-ledger-present': '记忆解析账本已存在',
  'latest-trace-stage': '最近轨迹阶段',
  'latest-trace-closure-state': '最近轨迹闭环状态',
  'latest-trace-surface-policy': '最近轨迹表面策略',
  'suppression-tags': '抑制标签',
  'runtime-alignment': '运行时对齐',
  'relationship': '关系',
  'response': '响应',
  'proactive': '主动性',
  'learning': '学习',
  'birth-persona-authority': '初生人格权威',
  'persona-authority-mapping': '人格权威映射',
  'personality-trajectory': '人格轨迹',
  'candidate-impact-summary': '候选影响摘要',
  'baseline-anchor-audit': '基线锚点审计',
  'self-evolution-summary': '自演化摘要',
  'focus-repair-path': '聚焦修复路径',
  'capture-focus-snapshot': '捕获聚焦快照',
  'id': 'ID',
  'expected-posture': '预期姿态',
  'planner-posture': '规划器姿态',
  'compiler-posture': '编译器姿态',
  'confirmed-signals': '确认信号',
  'expected-signals': '预期信号',
  'observed-signals': '观测信号',
  'expected-hold': '预期保持',
  'should-speak': '应当发声',
  'selected-action': '选中动作',
  'expected-action': '预期动作',
  'runtime-action': '运行时动作',
  'kernel-action': '内核动作',
  'open-selected-candidate-trace': '打开选中候选项轨迹',
  'open-trace-short': '打开轨迹',
  'trace-events-count': '轨迹事件数',
  'trace-records-count': '轨迹记录数',
  'trace-summary': '轨迹摘要',
  'trace-coverage': '轨迹覆盖',
  'trace-event-kinds': '轨迹事件类型',
  'trace-timeline': '轨迹时间线',
  'selected-trace-event': '选中轨迹事件',
  'no-drilled-trace-events-yet': '暂无下钻轨迹事件。',
  'inspect-event': '检查事件',
  'inspect-short': '检查',
  'no-structured-event-details': '暂无结构化事件细节。',
  'matched-candidate-id': '匹配候选项 ID',
  'matched-active-candidate-id': '匹配当前候选项 ID',
  'trace-patch-id': '轨迹补丁 ID',
  'trace-patch-decision-trace-id': '轨迹补丁决策轨迹 ID',
  'matched-patch-id': '匹配补丁 ID',
  'matched-decision-trace-id': '匹配决策轨迹 ID',
  'trace-lanes': '轨迹通道',
  'trace-reason-codes': '轨迹原因码',
  'missing-signals': '缺失信号',
  'drifting-signals': '漂移信号',
  'decision-trace-id': '决策轨迹 ID',
  'turn-id': '轮次 ID',
  'consumed-at': '消费时间',
  'lanes': '通道',
  'trajectory-summary': '轨迹摘要',
  'consumed-turn-count': '已消费轮次数',
  'latest-consumed-at': '最近消费时间',
  'latest-decision-trace-id': '最近决策轨迹 ID',
  'dominant-learning-action': '主导学习动作',
  'lane-coverage': '通道覆盖',
  'drift-detected': '检测到漂移',
  'trace-turn-mode': '轨迹轮次模式',
  'trace-truth-state': '轨迹真值状态',
  'trace-repair-state': '轨迹修复状态',
  'trace-answer-subject': '轨迹回答主体',
  'trace-screen-reference-mode': '轨迹屏幕引用模式',
  'learning-action': '学习动作',
  'learning-domain': '学习域',
  'learning-result': '学习结果',
  'resolution-surface-policy': '解析表面策略',
  'resolution-closure-state': '解析闭环状态',
  'resolution-suppression-tags': '解析抑制标签',
  'memory-stage': '记忆阶段',
  'memory-stage-summary': '记忆阶段摘要',
  'memory-stage-latency-ms': '记忆阶段延迟毫秒',
  'resolution-rationale': '解析依据',
  'summary': '摘要',
  'kind': '类型',
}

export function formatSelfEvolutionFocusCardLabel(value: string | null | undefined) {
  return mapValue(value, focusCardLabels)
}

export function formatSelfEvolutionEvidencePanelLabel(value: string | null | undefined) {
  return mapValue(value, evidencePanelLabels)
}

export function formatSelfEvolutionTraceSectionLabel(value: string | null | undefined) {
  return mapValue(value, traceSectionLabels)
}

export function formatSelfEvolutionTraceEventLabel(value: string | null | undefined) {
  return mapValue(value, traceEventLabels)
}

export function formatSelfEvolutionEventKindLabel(value: string | null | undefined) {
  return mapValue(value, eventKindLabels)
}

export function formatSelfEvolutionGovernanceLayerLabel(value: string | null | undefined) {
  return mapValue(value, governanceLayerLabels)
}

export function formatSelfEvolutionWorkflowSideLabel(value: 'current' | 'previous') {
  return workflowSideLabels[value]
}

export function formatSelfEvolutionRepairOwnerHint(value: string | null | undefined) {
  return mapValue(value, repairOwnerHintLabels)
}

export function formatRendererRejoinSurfaceLabel(
  surfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null,
) {
  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  return 'renderer'
}

export function formatSelfEvolutionDisplayText(value: string) {
  return selfEvolutionDisplayTextLabels[value] ?? value
}

export function formatSelfEvolutionCandidateStatus(value: string | null | undefined) {
  return mapValue(value, candidateStatusLabels)
}

export function formatSelfEvolutionRuntimeStatus(value: string | null | undefined) {
  return mapValue(value, runtimeStatusLabels)
}

export function formatSelfEvolutionRuntimeValue(
  kind: 'posture' | 'action' | string,
  value: string | null | undefined,
) {
  if (!value)
    return 'n/a'

  switch (kind) {
    case 'posture':
      return runtimePostureLabels[value] ?? value
    case 'action':
      return runtimeActionLabels[value] ?? value
    default:
      return value
  }
}

export function formatSelfEvolutionBooleanValue(value: boolean | null | undefined) {
  if (typeof value !== 'boolean')
    return 'n/a'
  return value ? '是' : '否'
}

export function formatSelfEvolutionGovernanceValue(
  kind: 'turn-mode' | 'truth-state' | 'repair-state' | 'memory-stage' | 'answer-subject' | 'screen-reference-mode' | string,
  value: string | null | undefined,
) {
  if (!value)
    return 'n/a'

  switch (kind) {
    case 'turn-mode':
      return governanceTurnModeLabels[value] ?? value
    case 'truth-state':
      return governanceTruthStateLabels[value] ?? value
    case 'repair-state':
      return governanceRepairStateLabels[value] ?? value
    case 'memory-stage':
      return governanceMemoryStageLabels[value] ?? value
    case 'answer-subject':
      return governanceAnswerSubjectLabels[value] ?? value
    case 'screen-reference-mode':
      return governanceScreenReferenceModeLabels[value] ?? value
    default:
      return value
  }
}

export function formatSelfEvolutionLearningValue(
  kind: 'action' | 'domain' | string,
  value: string | null | undefined,
) {
  if (!value)
    return 'n/a'

  switch (kind) {
    case 'action':
      return learningActionLabels[value] ?? value
    case 'domain':
      return learningDomainLabels[value] ?? value
    default:
      return value
  }
}

export function formatSelfEvolutionMemoryResolutionValue(
  kind: 'surface-policy' | 'closure-state' | string,
  value: string | null | undefined,
) {
  if (!value)
    return 'n/a'

  switch (kind) {
    case 'surface-policy':
      return memoryResolutionSurfacePolicyLabels[value] ?? value
    case 'closure-state':
      return memoryResolutionClosureStateLabels[value] ?? value
    default:
      return value
  }
}

export function formatSelfEvolutionTraceListValue(
  kind: 'event-kind' | 'suppression-tag' | 'lane' | 'reason-code' | 'trace-signal' | 'alignment-signal' | string,
  value: string | null | undefined,
) {
  if (!value)
    return 'n/a'

  switch (kind) {
    case 'event-kind':
      return traceEventKindValueLabels[value] ?? value
    case 'suppression-tag':
      return traceSuppressionTagLabels[value] ?? value
    case 'lane':
      return traceLaneLabels[value] ?? value
    case 'reason-code':
      if (value.startsWith('domain:')) {
        const domain = value.slice('domain:'.length)
        const localizedDomain = learningDomainLabels[domain] ?? (domain === 'presence' ? '存在显形' : domain)
        return `领域：${localizedDomain}`
      }
      return traceReasonCodeLabels[value] ?? value
    case 'trace-signal':
      if (value.startsWith('traceCandidate:'))
        return `轨迹候选项：${value.slice('traceCandidate:'.length)}`
      if (value.startsWith('tracePatch:'))
        return `轨迹补丁：${value.slice('tracePatch:'.length)}`
      if (value.startsWith('traceDecisionTrace:'))
        return `轨迹决策轨迹：${value.slice('traceDecisionTrace:'.length)}`
      return traceSignalLabels[value] ?? value
    case 'alignment-signal':
      if (value.startsWith('planner:'))
        return `规划器：${formatSelfEvolutionRuntimeValue('posture', value.slice('planner:'.length))}`
      if (value.startsWith('compiler:'))
        return `编译器：${formatSelfEvolutionRuntimeValue('posture', value.slice('compiler:'.length))}`
      if (value.startsWith('shouldSpeak:'))
        return `应当发声：${value.slice('shouldSpeak:'.length) === 'true' ? '是' : value.slice('shouldSpeak:'.length) === 'false' ? '否' : value.slice('shouldSpeak:'.length)}`
      if (value.startsWith('selectedAction:'))
        return `选中动作：${formatSelfEvolutionLearningValue('action', value.slice('selectedAction:'.length) === 'speak' ? 'speak' : value.slice('selectedAction:'.length)) === 'speak' ? '发声' : formatSelfEvolutionRuntimeValue('action', value.slice('selectedAction:'.length))}`
      if (value.startsWith('runtimeAction:'))
        return `运行时动作：${formatSelfEvolutionLearningValue('action', value.slice('runtimeAction:'.length))}`
      if (value.startsWith('kernelAction:'))
        return `内核动作：${formatSelfEvolutionLearningValue('action', value.slice('kernelAction:'.length))}`
      if (value.startsWith('focus:')) {
        const focus = value.slice('focus:'.length)
        const localizedFocus = learningDomainLabels[focus] ?? (focus === 'presence' ? '存在显形' : focus)
        return `焦点：${localizedFocus}`
      }
      if (value.startsWith('initiativeBaseline.silenceReconnect:'))
        return `主动基线静默重连：${formatSelfEvolutionRuntimeValue('action', value.slice('initiativeBaseline.silenceReconnect:'.length))}`
      if (value.startsWith('initiativeBaseline.comfortStyle:'))
        return `主动基线安抚风格：${value.slice('initiativeBaseline.comfortStyle:'.length) === 'quiet-presence' ? '安静陪伴' : value.slice('initiativeBaseline.comfortStyle:'.length)}`
      if (value.startsWith('personStateProjection.preferredProactiveStyle:'))
        return `人格投影偏好主动风格：${value.slice('personStateProjection.preferredProactiveStyle:'.length) === 'silent-observe' ? '静默观察' : value.slice('personStateProjection.preferredProactiveStyle:'.length)}`
      return alignmentSignalLabels[value] ?? value
    default:
      return value
  }
}

export function formatSelfEvolutionClosureStatus(isClosed: boolean) {
  return isClosed ? '已闭环' : '未闭环'
}

export function buildSelfEvolutionFocusSnapshotDisplay(input: {
  capturedAt: number
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: string | null
}) {
  return {
    ...input,
    focusLabel: formatSelfEvolutionFocusCardLabel(input.selectedCardId),
  }
}

export function buildSelfEvolutionFocusSnapshotHistoryDisplay(input: Array<{
  capturedAt: number
  decisionTraceId: string | null
  selectedCardId: string | null
}>) {
  return input.map(item => ({
    ...item,
    focusLabel: formatSelfEvolutionFocusCardLabel(item.selectedCardId),
  }))
}

export function buildSelfEvolutionFocusHistoryPatternGuidanceDisplay(input: {
  governanceLayer: string
  governanceLayerDisplay?: string
  repairOwnerHint: string
  recommendedEvidencePanels: string[]
  recommendedTraceSections: string[]
  recommendedEventKinds: string[]
  summaryLine: string
}) {
  return {
    governanceLayerLabel: input.governanceLayerDisplay ?? formatSelfEvolutionGovernanceLayerLabel(input.governanceLayer),
    repairOwnerHintLabel: formatSelfEvolutionRepairOwnerHint(input.repairOwnerHint),
    evidenceLabels: input.recommendedEvidencePanels.map(formatSelfEvolutionEvidencePanelLabel).join('，'),
    traceLabels: input.recommendedTraceSections.map(formatSelfEvolutionTraceSectionLabel).join('，'),
    eventLabels: input.recommendedEventKinds.map(formatSelfEvolutionEventKindLabel).join('，'),
  }
}

export function formatSelfEvolutionRepairActionLabel(input: {
  label: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
}) {
  if (/^Inspect\s+/i.test(input.label)) {
    switch (input.targetType) {
      case 'evidence':
        return `检查 ${formatSelfEvolutionEvidencePanelLabel(input.targetId)}`
      case 'trace':
        return `检查 ${formatSelfEvolutionTraceSectionLabel(input.targetId)}`
      case 'event':
        return `检查 ${formatSelfEvolutionEventKindLabel(input.targetId)}`
      case 'snapshot':
        return `检查 ${input.targetId}`
    }
  }

  return input.label
}
