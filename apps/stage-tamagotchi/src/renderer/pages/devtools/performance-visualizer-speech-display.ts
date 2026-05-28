function mapValue(
  value: string,
  mapping: Record<string, string>,
) {
  return mapping[value] ?? value
}

const speechDisplayTextLabels: Record<string, string> = {
  'speech-embodiment': '语音显形',
  phase: '阶段',
  'playback-phase': '播放阶段',
  'speech-energy': '语音能量',
  'prosody-intensity': '韵律强度',
  'emphasis-level': '强调等级',
  'cadence-pulse': '节拍脉冲',
  'viseme-intensity': '口型强度',
  'articulation-voice-language': '咬字语音语言',
  'articulation-consonant-precision': '咬字辅音精度',
  'articulation-closure-bias': '咬字收口偏置',
  'cue-micro-prosody-weight': '片段微表情韵律权重',
  'cue-micro-mouth-weight': '片段微表情口部权重',
  'cue-micro-head-weight': '片段微表情头部权重',
  'cue-micro-facial-hold-ms': '片段微表情表情保持毫秒',
  'cue-micro-action-hold-ms': '片段微表情动作保持毫秒',
  'cue-micro-emotion-hold-ms': '片段微表情情绪保持毫秒',
  'speech-observability-summary': '语音可观测性摘要',
  'articulation-observability': '咬字可观测性',
  'cue-micro-expression': '片段微表情',
  'viseme-hints': '口型提示',
  'speech-authority-segments': '语音权威片段',
  'speech-authority-hotspots': '语音权威热点',
  'top-hotspots': '热点优先',
  'playback-cue-authority': '播放片段权威',
  'recent-driving-trace-record': '最近驱动轨迹记录',
  'recent-driving-trace': '最近驱动轨迹',
  'recent-driving-trace-details': '最近驱动轨迹细节',
  'live2d-authority-comparison': 'Live2D 权威对比',
  'vrm-authority-comparison': 'VRM 权威对比',
  'authority-summary': '权威摘要',
  active: '活跃',
  voice: '语音',
  'lip-closure': '闭口',
  'lip-round': '圆唇',
  'lip-spread': '展唇',
  'jaw-open': '张口',
  openness: '开口度',
  'top-visemes': '主要口型',
  'cue-id': '片段 ID',
  'cue-text': '片段文本',
  cue: '片段',
  drift: '漂移',
  aligned: '对齐',
  severity: '严重度',
  lanes: '通道',
  surfaces: '表面',
  'all-lanes': '全通道',
  evidence: '证据',
  renderer: '渲染',
  settle: '稳定段',
  source: '来源',
  confidence: '置信度',
  planned: '规划',
  consumed: '消费',
  surface: '表面',
  lane: '通道',
  'live2d-release': 'Live2D 表情回收',
  'live2d-follow': 'Live2D 动作跟随',
  'vrm-action-fade': 'VRM 动作淡出',
  'vrm-expression-blend': 'VRM 表情混合',
  speech: '语音',
  'consumed-expression-name': '消费表情名',
  'expression-aligned': '表情对齐',
  'planned-face-cue': '规划表情线索',
  'consumed-face-cue': '消费表情线索',
  'face-source': '表情来源',
  'face-segment-aligned': '表情片段对齐',
  'planned-motion-aliases': '规划动作别名',
  'consumed-motion-aliases': '消费动作别名',
  'consumed-motion-group': '消费动作组',
  'motion-aligned': '动作对齐',
  'planned-motion-cue': '规划动作线索',
  'consumed-motion-cue': '消费动作线索',
  'motion-source': '动作来源',
  'motion-segment-aligned': '动作片段对齐',
  'consumed-lipsync-cue': '消费口型线索',
  'lipsync-source': '口型来源',
  'lipsync-segment-aligned': '口型片段对齐',
  'planned-live2d-facial-release-ms': '规划 Live2D 表情回收毫秒',
  'consumed-live2d-facial-release-ms': '消费 Live2D 表情回收毫秒',
  'facial-release-aligned': '表情回收对齐',
  'planned-live2d-motion-follow-through-ms': '规划 Live2D 动作跟随毫秒',
  'consumed-live2d-motion-follow-through-ms': '消费 Live2D 动作跟随毫秒',
  'motion-follow-through-aligned': '动作跟随对齐',
  'consumed-expression-aliases': '消费表情别名',
  'planned-action-cue': '规划动作线索',
  'consumed-action-cue': '消费动作线索',
  'planned-vrm-action-fade-ms': '规划 VRM 动作淡出毫秒',
  'consumed-vrm-action-fade-ms': '消费 VRM 动作淡出毫秒',
  'vrm-action-fade-aligned': 'VRM 动作淡出对齐',
  'planned-vrm-expression-blend-ms': '规划 VRM 表情混合毫秒',
  'consumed-vrm-expression-blend-ms': '消费 VRM 表情混合毫秒',
  'vrm-expression-blend-aligned': 'VRM 表情混合对齐',
  'persona-style': '人格风格',
  timing: '时序',
  summary: '摘要',
  'tracing-enabled': 'Stage Three Runtime 跟踪已开启',
  'tracing-disabled': 'Stage Three Runtime 跟踪已关闭',
  'stop-tracing': '停止跟踪',
  'start-tracing': '开始跟踪',
  'refresh-self-evolution-inspector': '刷新自演化检查器',
  'refreshing-self-evolution': '正在刷新自演化…',
  'refresh-self-evolution': '刷新自演化',
  'show-only-drift-rows': '仅显示漂移行',
  'only-drift-rows': '仅漂移行',
  'all-rows': '全部行',
  'cycle-authority-surface-filter': '切换权威表面筛选',
  'cycle-authority-lane-filter': '切换权威通道筛选',
  'cycle-authority-drift-filter': '切换权威漂移筛选',
  'cycle-authority-speech-evidence-filter': '切换语音证据筛选',
  'cycle-settle-authority-filter': '切换稳定段权威筛选',
  'cycle-authority-mismatch-filter': '切换权威漂移类型筛选',
  'cycle-renderer-drift-filter': '切换显形漂移筛选',
  'search-cue-text': '搜索片段文本',
  'window-lifecycle': '窗口生命周期',
  visible: '可见',
  minimized: '最小化',
  focused: '聚焦',
  reason: '原因',
  'updated-at': '更新时间',
  'stage-paused': '舞台暂停',
  'three-render': 'Three 渲染',
  'render-count': '渲染次数',
  'draw-calls': '绘制调用',
  triangles: '三角面',
  points: '点',
  lines: '线',
  textures: '纹理',
  geometries: '几何体',
  'last-timestamp-ms': '最近时间戳毫秒',
  'vrm-update-frame': 'VRM 更新帧',
  'last-consumed-expression-aliases': '最近消费表情别名',
  'last-consumed-motion-aliases': '最近消费动作别名',
  'last-consumed-vrm-action-fade-ms': '最近消费 VRM 动作淡出毫秒',
  'last-consumed-vrm-expression-blend-ms': '最近消费 VRM 表情混合毫秒',
  'frame-count': '帧数',
  'total-ms': '总毫秒',
  'delta-ms': '帧间毫秒',
  'animation-mixer-ms': '动画混合器毫秒',
  'humanoid-ms': 'Humanoid 毫秒',
  'look-at-ms': '注视毫秒',
  'blink-and-saccade-ms': '眨眼与扫视毫秒',
  'emote-ms': '情绪动作毫秒',
  'lip-sync-ms': '唇形同步毫秒',
  'expression-ms': '表情毫秒',
  'spring-bone-ms': 'Spring Bone 毫秒',
  'vrm-frame-hook-ms': 'VRM 帧钩子毫秒',
  'fade-on-hover-hit-test': '悬停淡出命中测试',
  'read-count': '读取次数',
  'last-duration-ms': '最近耗时毫秒',
  'total-duration-ms': '累计耗时毫秒',
  'last-read-width': '最近读取宽度',
  'last-read-height': '最近读取高度',
  'vrm-lifecycle': 'VRM 生命周期',
  'last-model-src': '最近模型来源',
  'last-reason': '最近原因',
  'last-load-start-at': '最近加载开始时间',
  'last-load-end-at': '最近加载结束时间',
  'last-load-duration-ms': '最近加载耗时毫秒',
  'last-dispose-start-at': '最近释放开始时间',
  'last-dispose-end-at': '最近释放结束时间',
  'last-dispose-duration-ms': '最近释放耗时毫秒',
  'last-error-message': '最近错误信息',
  'renderer-resource-snapshots': '渲染器 / 资源快照',
  'after-load': '加载后',
  'before-dispose': '释放前',
  'after-dispose': '释放后',
  ts: '时间戳',
  calls: '调用',
  'mesh-count': '网格数量',
  'material-count': '材质数量',
  'history-entries': '历史条目',
}

const speechObservabilitySectionLabels: Record<string, string> = {
  articulation: '咬字',
  authority: '权威',
  cue: '片段',
  viseme: '口型',
}

const speechObservabilityLabels: Record<string, string> = {
  voice: '语音',
  visemes: '口型',
  'authority-match': '权威命中',
  'authority-mismatch': '权威漂移',
  'persona-style': '人格风格',
  timing: '时序',
  'renderer-live2d': '显形 Live2D',
  'renderer-vrm': '显形 VRM',
}

const speechAuthoritySurfaceLabels: Record<string, string> = {
  live2d: 'Live2D',
  vrm: 'VRM',
}

const speechAuthorityLaneLabels: Record<string, string> = {
  expression: '表情',
  motion: '动作',
  face: '表情',
  action: '动作',
  lipsync: '口型',
  settle: '稳定段',
}

const speechAuthorityDriftLabels: Record<string, string> = {
  'partial-drift': '部分漂移',
  'hard-drift': '严重漂移',
  'all-aligned': '全部对齐',
  unknown: '未知',
}

const speechAuthoritySourceLabels: Record<string, string> = {
  'prosody-authority': '韵律权威',
  'timeline-projection': '时间线投影',
  'seeded-face': '播种表情',
}

const speechCueActionWindowLabels: Record<string, string> = {
  'segment-start': '片段起始',
  'cadence-peak': '节拍峰值',
  none: '无',
}

const speechCueInterruptModeLabels: Record<string, string> = {
  continue: '继续',
  'soft-interrupt': '软打断',
  'hard-interrupt': '硬打断',
}

const speechCueSettleModeLabels: Record<string, string> = {
  hold: '保持',
  release: '释放',
  linger: '停留',
}

const speechDriverAttentionModeLabels: Record<string, string> = {
  'observe-first': '先观察',
}

const speechDriverPlaybackPhaseLabels: Record<string, string> = {
  playing: '播放中',
}

const speechAuthorityGenericFilterLabels: Record<string, string> = {
  all: '全部',
}

const speechAuthoritySpeechEvidenceFilterLabels: Record<string, string> = {
  speech: '语音',
  prosody: '韵律',
  viseme: '口型',
  'micro-expression': '微表情',
  'authority-match': '权威命中',
}

const speechAuthoritySettleFilterLabels: Record<string, string> = {
  'authority-bound': '权威绑定',
  'fallback-derived': '回退派生',
}

const speechAuthorityMismatchFilterLabels: Record<string, string> = {
  'face-mismatch': '表情漂移',
  'motion-mismatch': '动作漂移',
  'lipsync-mismatch': '口型漂移',
}

const speechAuthorityRendererDriftFilterLabels: Record<string, string> = {
  present: '存在漂移',
  'pending-or-runtime-only': '待执行或仅运行时',
  none: '无',
}

export function formatSpeechDisplayText(value: string) {
  return mapValue(value, speechDisplayTextLabels)
}

export function formatSpeechObservabilitySectionLabel(value: string) {
  return mapValue(value, speechObservabilitySectionLabels)
}

export function formatSpeechObservabilityLabel(value: string) {
  return mapValue(value, speechObservabilityLabels)
}

export function formatSpeechAuthorityValue(
  kind: 'surface' | 'lane' | 'drift' | 'source' | 'renderer-target' | string,
  value: string,
) {
  switch (kind) {
    case 'surface':
    case 'renderer-target':
      return mapValue(value, speechAuthoritySurfaceLabels)
    case 'lane':
      return mapValue(value, speechAuthorityLaneLabels)
    case 'drift':
      return mapValue(value, speechAuthorityDriftLabels)
    case 'source':
      return mapValue(value, speechAuthoritySourceLabels)
    default:
      return value
  }
}

export function formatSpeechCueMetadataValue(
  kind: 'action-window' | 'interrupt-mode' | 'settle-mode' | 'attention-mode' | 'playback-phase' | 'source' | string,
  value: string,
) {
  switch (kind) {
    case 'action-window':
      return mapValue(value, speechCueActionWindowLabels)
    case 'interrupt-mode':
      return mapValue(value, speechCueInterruptModeLabels)
    case 'settle-mode':
      return mapValue(value, speechCueSettleModeLabels)
    case 'attention-mode':
      return mapValue(value, speechDriverAttentionModeLabels)
    case 'playback-phase':
      return mapValue(value, speechDriverPlaybackPhaseLabels)
    case 'source':
      return mapValue(value, speechAuthoritySourceLabels)
    default:
      return value
  }
}

export function formatSpeechDriverExecutionSummary(value: string) {
  const normalized = value.trim()
  if (!normalized.includes('='))
    return normalized

  const sections = normalized
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)

  const formattedSections = sections.map((section) => {
    if (section.startsWith('face=')) {
      const faceMatch = /^face=([^@]+)@(\S+)(?:\s+hold=(\S+))?(?:\s+pre=(\S+))?(?:\s+post=(\S+))?(?:\s+src=(\S+))?(?:\s+conf=(\S+))?$/u.exec(section)
      if (faceMatch) {
        const [, identity, intensity, holdMs, preCue, postCue, source, confidence] = faceMatch
        const parts = [`表情 ${identity} @${intensity}`]
        if (holdMs)
          parts.push(`保持 ${holdMs}ms`)
        if (preCue)
          parts.push(`前置 ${preCue}`)
        if (postCue)
          parts.push(`后置 ${postCue}`)
        if (source)
          parts.push(`来源 ${formatSpeechCueMetadataValue('source', source)}`)
        if (confidence)
          parts.push(`置信 ${confidence}`)
        return parts.join('，')
      }

      const faceSourceOnlyMatch = /^face=(\S+)(?:\s+src=(\S+))?(?:\s+conf=(\S+))?$/u.exec(section)
      if (!faceSourceOnlyMatch)
        return section

      const [, identity, source, confidence] = faceSourceOnlyMatch
      if (!source && !confidence)
        return section

      const parts = [`表情 ${identity}`]
      if (source)
        parts.push(`来源 ${formatSpeechCueMetadataValue('source', source)}`)
      if (confidence)
        parts.push(`置信 ${confidence}`)
      return parts.join('，')
    }

    if (section.startsWith('motion=')) {
      const motionMatch = /^motion=(\S+)(?:\s+mode=(\S+))?(?:\s+idle=([^@]+)@(\S+))?(?:\s+hold=(\S+))?(?:\s+src=(\S+))?(?:\s+conf=(\S+))?$/u.exec(section)
      if (!motionMatch)
        return section

      const [, actionCue, attentionMode, idleBase, intensity, holdMs, source, confidence] = motionMatch
      const parts = [`动作 ${actionCue}`]
      if (attentionMode)
        parts.push(`模式 ${formatSpeechCueMetadataValue('attention-mode', attentionMode)}`)
      if (idleBase && intensity)
        parts.push(`待机 ${idleBase} @${intensity}`)
      if (holdMs)
        parts.push(`保持 ${holdMs}ms`)
      if (source)
        parts.push(`来源 ${formatSpeechCueMetadataValue('source', source)}`)
      if (confidence)
        parts.push(`置信 ${confidence}`)
      return parts.join('，')
    }

    if (section.startsWith('lipsync=')) {
      const lipsyncMatch = /^lipsync=(\S+)(?:\s+phase=(\S+))?$/u.exec(section)
      if (!lipsyncMatch)
        return section

      const [, mode, phase] = lipsyncMatch
      const parts = [`口型 ${mode}`]
      if (phase)
        parts.push(`阶段 ${formatSpeechCueMetadataValue('playback-phase', phase)}`)
      return parts.join('，')
    }

    return section
  })

  return formattedSections.join(' | ')
}

export function formatSpeechAuthorityFilterValue(
  kind: 'surface' | 'lane' | 'drift' | 'speech-evidence' | 'settle-authority' | 'authority-mismatch' | 'renderer-drift' | string,
  value: string,
) {
  if (value === 'all')
    return speechAuthorityGenericFilterLabels.all

  switch (kind) {
    case 'surface':
      return mapValue(value, speechAuthoritySurfaceLabels)
    case 'lane':
      return mapValue(value, speechAuthorityLaneLabels)
    case 'drift':
      return mapValue(value, speechAuthorityDriftLabels)
    case 'speech-evidence':
      return mapValue(value, speechAuthoritySpeechEvidenceFilterLabels)
    case 'settle-authority':
      return mapValue(value, speechAuthoritySettleFilterLabels)
    case 'authority-mismatch':
      return mapValue(value, speechAuthorityMismatchFilterLabels)
    case 'renderer-drift':
      return mapValue(value, speechAuthorityRendererDriftFilterLabels)
    default:
      return value
  }
}
