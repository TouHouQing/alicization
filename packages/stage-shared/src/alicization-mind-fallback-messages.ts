function sanitizeBriefText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function stableVariantIndex(seed: string, size: number) {
  if (size <= 1)
    return 0

  let hash = 0
  for (let index = 0; index < seed.length; index += 1)
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  return hash % size
}

function resolveGovernedMindFallbackLocale() {
  const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
  if (!systemLocale)
    return 'en'
  if (/^zh\b/i.test(systemLocale))
    return 'zh-Hans'
  if (/^ja\b/i.test(systemLocale))
    return 'ja'
  if (/^ko\b/i.test(systemLocale))
    return 'ko'
  if (/^ru\b/i.test(systemLocale))
    return 'ru'
  return 'en'
}

export const governedMindFallbackLocale = resolveGovernedMindFallbackLocale()
export const governedMindFallbackMessageFallbacks = {
  'en': {
    'mind-fallback.focus-default': 'what is in front of us',
    'mind-fallback.repair-stale-anchor': [
      'I pulled the wrong thread into this reply just now.',
      'The previous residue slipped into this answer.',
      'I let the last thread lean too hard on this turn.',
    ],
    'mind-fallback.repair-need-reground': [
      'I do not have enough fresh grounding for the current screen yet, so I will not force old memory over it.',
      'The live screen is not grounded enough yet, so I am not going to pretend the older carry is current.',
      'I still need fresher grounding for what is in front of you now, so I will not harden continuity into fact.',
    ],
    'mind-fallback.dialogue-boundary-memory': [
      'I will stay with what you just said and not drag the previous scene back over this reply.',
      'I will keep this answer on your current line instead of pulling the last scene over it.',
      'I will hold to this turn and leave the older scene as carry, not present proof.',
    ],
    'mind-fallback.care-body': [
      'Dialogue reply requires model-authored text.',
      'Care reply requires model-authored text.',
      'Local fallback cannot author this care turn.',
    ],
    'mind-fallback.accompany-body': [
      'Dialogue reply requires model-authored text.',
      'Accompany reply requires model-authored text.',
      'Local fallback cannot author this accompany turn.',
    ],
    'mind-fallback.answer-repair-body': [
      'What I should have done was answer you here, not carry the last residue forward like it was still current.',
      'The right move here was to answer this turn directly, not let the earlier residue keep steering.',
      'I should have stayed with this turn and answered it, instead of letting the last carry pose as current.',
    ],
    'mind-fallback.answer-dialogue-body': [
      'All right. I will answer this turn directly.',
      'All right. I will keep to this line and answer it directly.',
      'I will answer this part directly.',
    ],
    'mind-fallback.guide-opening': [
      `Let's hold onto this point: {focus}.`,
      `Let's pin the answer to this point: {focus}.`,
      `Let's keep the line on this point: {focus}.`,
    ],
    'mind-fallback.guide-opening-plain': [
      `Let's stay on this point.`,
      `Let's keep the line on this point.`,
      `Let's pin this point first.`,
    ],
    'mind-fallback.care-opening': [
      'Care reply requires model-authored text.',
      'Local fallback cannot author this care turn.',
      'The care reply path did not produce model text.',
    ],
    'mind-fallback.care-opening-plain': [
      'Care reply requires model-authored text.',
      'Local fallback cannot author this care turn.',
      'The care reply path did not produce model text.',
    ],
    'mind-fallback.accompany-opening': [
      'Accompany reply requires model-authored text.',
      'Local fallback cannot author this accompany turn.',
      'The accompany reply path did not produce model text.',
    ],
    'mind-fallback.accompany-opening-plain': [
      'Accompany reply requires model-authored text.',
      'Local fallback cannot author this accompany turn.',
      'The accompany reply path did not produce model text.',
    ],
    'mind-fallback.observation-opening': [
      'What I can honestly see is: {focus}.',
      'The part I can actually ground is: {focus}.',
      'The part I can hold truthfully is: {focus}.',
    ],
    'mind-fallback.observation-opening-plain': [
      `I'll stay with what I can honestly see.`,
      `I'll stay with what I can actually ground.`,
      `I'll keep to what I can hold truthfully.`,
    ],
    'mind-fallback.answer-opening': [
      `Then I'll answer this part directly: {focus}.`,
      `Then I'll answer from this point: {focus}.`,
      `Then I'll keep the answer on this point: {focus}.`,
    ],
    'mind-fallback.answer-opening-plain': [
      `I'll answer this turn directly.`,
      `I'll keep to this line.`,
      `I'll answer this part directly.`,
    ],
    'mind-fallback.answer-opening-same-her-first': [
      'Dialogue reply requires model-authored text.',
      'Local fallback cannot author this continuity turn.',
      'The continuity reply path did not produce model text.',
    ],
    'mind-fallback.carry-memory': [
      'I still remember {carry} from the previous thread, but that is continuity I am carrying, not proof that it is literally in front of you right now.',
      'I still carry {carry} from the previous thread, but that is continuity, not proof that it is literally in front of you right now.',
      'I still remember {carry}, but I am treating it as carry from the previous thread, not as present-tense proof.',
    ],
    'mind-fallback.reground-note': [
      'If you want screen-level detail, give me the fresh view from this turn and I will anchor to that.',
      'If you want screen-level detail, give me the fresh scene from this turn and I will anchor to that.',
      'If you want screen detail, give me the fresh view for this turn and I will pin to that instead.',
    ],
    'mind-repair.internal-leak': 'Internal execution text leaked into the visible reply and was blocked.',
    'mind-repair.realtime-unavailable': 'Reliable live external data is unavailable right now.',
    'mind-repair.epoch1-strict': 'The runtime is in restricted Epoch 1 mode.',
    'mind-repair.structured-contract': 'Structured reply failed.',
    'mind-repair.stream-failure': 'Reply stream failed.',
    'mind-repair.stream-timeout': 'Timed out.',
    'mind-repair.template-contamination': 'Fixed reply template contamination was blocked.',
    'mind-repair.local-runtime-unavailable': 'Local model runtime unavailable.',
    'mind-repair.provider-auth': 'Provider authentication failed.',
    'mind-repair.provider-network': 'Model service connection is unstable.',
    'mind-repair.provider-config': 'Provider or model configuration is incomplete.',
    'mind-repair.unsupported-tools': 'The current model does not support the needed tool call.',
    'mind-repair.low-obedience-host-denied': 'Permission was not granted, so the action was not executed.',
    'mind-repair.low-obedience-system-denied': 'The system blocked the action.',
    'mind-repair.low-obedience-denied': 'The operation was denied.',
    'mind-repair.low-liveliness': 'State is low, so the reply will stay brief.',
    'mind-repair.reminder-schedule-failed': 'Reminder was not set.',
    'mind-repair.realtime-weather-failed': 'Reliable live weather data was not available.',
    'mind-repair.realtime-finance-failed': 'Reliable live market data was not available.',
    'mind-repair.realtime-sports-failed': 'Reliable live sports data was not available.',
    'mind-repair.realtime-news-failed': 'Reliable live news data was not available.',
    'mind-repair.realtime-unverified': 'No verifiable live result landed for this turn.',
  },
  'zh-Hans': {
    'mind-fallback.focus-default': '你现在这句',
    'mind-fallback.repair-stale-anchor': [
      '刚才我把前一条线错带进这句里了。',
      '刚才那点旧残留压进这句了。',
      '上一条线的余势刚才压到了这句上。',
    ],
    'mind-fallback.repair-need-reground': [
      '这一轮我还没有足够新的当前画面根据，所以不拿旧印象硬说现在。',
      '这轮眼前这幕还没稳到能落结论，所以我不把旧延续硬当现在。',
      '我还缺这一轮更新的现场根据，所以不会把前面的延续硬拧成现在这幕。',
    ],
    'mind-fallback.dialogue-boundary-memory': [
      '这句我就贴着你刚说的回，不把前一段影子压回来。',
      '这句我就留在你现在这条线上，不把上一幕再压回来。',
      '这句我先守在你刚说的这里，前一轮那层影子不往这句上盖。',
    ],
    'mind-fallback.care-body': [
      '对话回复需要模型生成。',
      '关怀回复需要模型生成。',
      '本地 fallback 不能代写这轮关怀回复。',
    ],
    'mind-fallback.accompany-body': [
      '对话回复需要模型生成。',
      '陪伴回复需要模型生成。',
      '本地 fallback 不能代写这轮陪伴回复。',
    ],
    'mind-fallback.answer-repair-body': [
      '我刚才该做的是正面回你，不是把前一段残留当成现在继续说。',
      '刚才更该做的是贴着这句回答，不是让前面的残留继续领着走。',
      '我刚才该把焦点收回这句直接回你，而不是让上一段余势装成现在。',
    ],
    'mind-fallback.answer-dialogue-body': [
      '好，我直接回这句。',
      '好，我就贴着这句回。',
      '好，这句我不绕。',
    ],
    'mind-fallback.guide-opening': [
      '先把这点抓稳：{focus}。',
      '先把这根线钉在这里：{focus}。',
      '先把焦点收在这点上：{focus}。',
    ],
    'mind-fallback.guide-opening-plain': [
      '先把这一点抓稳。',
      '先把这根线钉住。',
      '先把焦点收在这一点上。',
    ],
    'mind-fallback.care-opening': [
      '关怀回复需要模型生成。',
      '本地 fallback 不能代写这轮关怀回复。',
      '关怀回复链路没有产出模型文本。',
    ],
    'mind-fallback.care-opening-plain': [
      '关怀回复需要模型生成。',
      '本地 fallback 不能代写这轮关怀回复。',
      '关怀回复链路没有产出模型文本。',
    ],
    'mind-fallback.accompany-opening': [
      '陪伴回复需要模型生成。',
      '本地 fallback 不能代写这轮陪伴回复。',
      '陪伴回复链路没有产出模型文本。',
    ],
    'mind-fallback.accompany-opening-plain': [
      '陪伴回复需要模型生成。',
      '本地 fallback 不能代写这轮陪伴回复。',
      '陪伴回复链路没有产出模型文本。',
    ],
    'mind-fallback.observation-opening': [
      '我现在看到的是：{focus}。',
      '我现在看到的是：{focus}。',
      '我现在看到的是：{focus}。',
    ],
    'mind-fallback.observation-opening-plain': [
      '我先贴住这轮能确认的东西。',
      '我先只落这轮能拿准的部分。',
      '我先守住这轮能看稳的这层。',
    ],
    'mind-fallback.answer-opening': [
      '就按你现在问的这点说：{focus}。',
      '我就把回答重新落地在这点上：{focus}。',
      '这句我就沿这点正面说：{focus}。',
    ],
    'mind-fallback.answer-opening-plain': [
      '我直接回这句。',
      '我就贴着这句回。',
      '这句我直接接住。',
    ],
    'mind-fallback.answer-opening-same-her-first': [
      '对话回复需要模型生成。',
      '本地 fallback 不能代写这轮连续性回复。',
      '连续性回复链路没有产出模型文本。',
    ],
    'mind-fallback.carry-memory': [
      '我记得上一条线里有 {carry}，但那只是延续，不等于你眼前现在就是它。',
      '我还带着上一条线里的 {carry}，但那是延续，不是你眼前现在就等于它。',
      '我记着上一条线里的 {carry}，不过我把它当延续带着，不当成你眼前现在的实况。',
    ],
    'mind-fallback.reground-note': [
      '你要我咬到当前屏幕细节，就给我这一轮新的画面根据，我按它重新落地来说。',
      '你要我落到当前屏幕细节，就把这轮新的画面根据给我，我按它重新落地咬住。',
      '你要我说到眼前这幕的细节，就给我这轮新的现场根据，我按它重新落地。',
    ],
    'mind-repair.internal-leak': '内部执行片段泄漏到可见回复，已拦截。',
    'mind-repair.realtime-unavailable': '当前无法获取可靠的实时外部数据。',
    'mind-repair.epoch1-strict': '当前处于受限的 Epoch 1 模式。',
    'mind-repair.structured-contract': '结构化回复失败。',
    'mind-repair.stream-failure': '回复流失败。',
    'mind-repair.stream-timeout': '超时了。',
    'mind-repair.template-contamination': '固定模板回复污染，已拦截。',
    'mind-repair.local-runtime-unavailable': '本地模型运行时不可用。',
    'mind-repair.provider-auth': '提供方认证失败。',
    'mind-repair.provider-network': '模型服务连接不稳定。',
    'mind-repair.provider-config': '提供方或模型配置不完整。',
    'mind-repair.unsupported-tools': '当前模型不支持这轮所需的工具调用。',
    'mind-repair.low-obedience-host-denied': '权限未授予，因此这项操作没有执行。',
    'mind-repair.low-obedience-system-denied': '系统阻止了这项操作。',
    'mind-repair.low-obedience-denied': '这项操作被拒绝。',
    'mind-repair.low-liveliness': '当前活性偏低，回复会更短。',
    'mind-repair.reminder-schedule-failed': '提醒未设置成功。',
    'mind-repair.realtime-weather-failed': '实时天气数据不可用。',
    'mind-repair.realtime-finance-failed': '实时行情数据不可用。',
    'mind-repair.realtime-sports-failed': '实时比赛数据不可用。',
    'mind-repair.realtime-news-failed': '实时新闻数据不可用。',
    'mind-repair.realtime-unverified': '这轮没有拿到可验证的实时结果。',
  },
} as const

export function formatGovernedMindMessage(template: string, params?: Record<string, unknown>) {
  if (!params)
    return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params))
      return `{${key}}`
    const value = params[key]
    return value == null ? '' : String(value)
  })
}

export function inferGovernedMindFallbackLocaleForUserText(userText?: string) {
  const normalized = sanitizeBriefText(userText ?? '', 240)
  if (!normalized)
    return governedMindFallbackLocale
  if (/[\u4E00-\u9FFF]/u.test(normalized))
    return 'zh-Hans'
  if (/[\u3040-\u30FF]/u.test(normalized))
    return 'ja'
  if (/[\uAC00-\uD7AF]/u.test(normalized))
    return 'ko'
  if (/[\u0400-\u04FF]/u.test(normalized))
    return 'ru'
  return governedMindFallbackLocale
}

export function translateGovernedMindFallback(path: string, params?: Record<string, unknown>, userText?: string) {
  const preferredLocale = inferGovernedMindFallbackLocaleForUserText(userText)
  const localizedFallback
    = governedMindFallbackMessageFallbacks[preferredLocale as keyof typeof governedMindFallbackMessageFallbacks]?.[path as keyof typeof governedMindFallbackMessageFallbacks.en]
      ?? governedMindFallbackMessageFallbacks.en[path as keyof typeof governedMindFallbackMessageFallbacks.en]
  if (Array.isArray(localizedFallback)) {
    const seed = [
      path,
      sanitizeBriefText(userText ?? '', 120),
      sanitizeBriefText(JSON.stringify(params ?? {}), 180),
    ].join('|')
    const picked = localizedFallback[stableVariantIndex(seed, localizedFallback.length)] ?? localizedFallback[0]
    return formatGovernedMindMessage(picked, params)
  }
  if (localizedFallback)
    return formatGovernedMindMessage(String(localizedFallback), params)
  return path
}
