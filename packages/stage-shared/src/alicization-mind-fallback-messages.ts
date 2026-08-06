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
    'mind-repair.internal-leak': 'Internal execution text leaked into the visible reply and was blocked.',
    'mind-repair.realtime-unavailable': 'Reliable live external data is unavailable right now.',
    'mind-repair.structured-contract': 'Model output format was invalid, so this turn was blocked.',
    'mind-repair.provider-output-invalid': 'Model output format was invalid, so this turn was blocked.',
    'mind-repair.provider-request': 'Provider request failed ({provider} / {model}, HTTP {status}). Upstream returned {code}: {message}. Check whether the selected model supports this provider, or switch models.',
    'mind-repair.stream-failure': 'Reply stream failed.',
    'mind-repair.stream-timeout': 'Timed out.',
    'mind-repair.local-runtime-unavailable': 'Local model runtime unavailable.',
    'mind-repair.provider-auth': 'Provider authentication failed.',
    'mind-repair.provider-network': 'Model service connection is unstable.',
    'mind-repair.provider-config': 'Provider or model configuration is incomplete.',
    'mind-repair.provider-schema-unsupported': 'The current provider or model does not support the required output mode.',
    'mind-repair.recall-failure': 'Long-term memory recall failed for this turn.',
    'mind-repair.memory-persistence': 'Memory persistence failed for this turn.',
    'mind-repair.unsupported-tools': 'The current model does not support the needed tool call.',
    'mind-repair.low-obedience-host-denied': 'Permission was not granted, so the action was not executed.',
    'mind-repair.low-obedience-system-denied': 'The system blocked the action.',
    'mind-repair.low-obedience-denied': 'The operation was denied.',
    'mind-repair.reminder-schedule-failed': 'Reminder was not set.',
    'mind-repair.realtime-weather-failed': 'Reliable live weather data was not available.',
    'mind-repair.realtime-finance-failed': 'Reliable live market data was not available.',
    'mind-repair.realtime-sports-failed': 'Reliable live sports data was not available.',
    'mind-repair.realtime-news-failed': 'Reliable live news data was not available.',
    'mind-repair.realtime-unverified': 'No verifiable live result landed for this turn.',
  },
  'zh-Hans': {
    'mind-repair.internal-leak': '内部执行片段泄漏到可见回复，已拦截。',
    'mind-repair.realtime-unavailable': '当前无法获取可靠的实时外部数据。',
    'mind-repair.structured-contract': '模型输出格式异常，这轮回复已拦截。',
    'mind-repair.provider-output-invalid': '模型输出格式异常，这轮回复已拦截。',
    'mind-repair.provider-request': 'Provider 请求失败（{provider} / {model}，HTTP {status}）。上游返回 {code}：{message}。请检查当前模型是否支持该 Provider，或切换模型。',
    'mind-repair.stream-failure': '回复流失败。',
    'mind-repair.stream-timeout': '超时了。',
    'mind-repair.local-runtime-unavailable': '本地模型运行时不可用。',
    'mind-repair.provider-auth': '提供方认证失败。',
    'mind-repair.provider-network': '模型服务连接不稳定。',
    'mind-repair.provider-config': '提供方或模型配置不完整。',
    'mind-repair.provider-schema-unsupported': '当前 Provider/模型不支持所需的输出模式。',
    'mind-repair.recall-failure': '本轮长期记忆召回失败。',
    'mind-repair.memory-persistence': '本轮记忆持久化失败。',
    'mind-repair.unsupported-tools': '当前模型不支持这轮所需的工具调用。',
    'mind-repair.low-obedience-host-denied': '权限未授予，因此这项操作没有执行。',
    'mind-repair.low-obedience-system-denied': '系统阻止了这项操作。',
    'mind-repair.low-obedience-denied': '这项操作被拒绝。',
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
