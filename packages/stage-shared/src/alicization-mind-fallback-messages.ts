function sanitizeBriefText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
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
    'mind-fallback.repair-stale-anchor': 'I pulled the wrong thread into this reply just now.',
    'mind-fallback.repair-need-reground': 'I do not have enough fresh grounding for the current screen yet, so I will not force old memory over it.',
    'mind-fallback.dialogue-boundary-memory': 'I will stay with what you just said and not drag the previous scene back over this reply.',
    'mind-fallback.care-body': 'You do not need to organize it first. I am here. If you want, tell me the part that hit hardest.',
    'mind-fallback.accompany-body': 'I am here. We can stay with this for a moment, or go straight to the part that is catching.',
    'mind-fallback.answer-repair-body': 'What I should have done was answer you here, not carry the last residue forward like it was still current.',
    'mind-fallback.answer-dialogue-body': 'Alright. I will answer right on this turn.',
    'mind-fallback.guide-opening': `Let's hold onto this point: {focus}.`,
    'mind-fallback.guide-opening-plain': `Let's stay on this point.`,
    'mind-fallback.care-opening': 'Tell me from right here: {focus}.',
    'mind-fallback.care-opening-plain': 'Tell me this part directly.',
    'mind-fallback.accompany-opening': `I'm with you on this: {focus}.`,
    'mind-fallback.accompany-opening-plain': `I'm with you on this.`,
    'mind-fallback.observation-opening': 'What I can honestly see is: {focus}.',
    'mind-fallback.observation-opening-plain': `I'll stay with what I can honestly see.`,
    'mind-fallback.answer-opening': `Then I'll answer this part directly: {focus}.`,
    'mind-fallback.answer-opening-plain': `I'll answer you directly.`,
    'mind-fallback.carry-memory': 'I still remember {carry} from the previous thread, but that is continuity I am carrying, not proof that it is literally in front of you right now.',
    'mind-fallback.reground-note': 'If you want screen-level detail, give me the fresh view from this turn and I will anchor to that.',
  },
  'zh-Hans': {
    'mind-fallback.focus-default': '你现在这句',
    'mind-fallback.repair-stale-anchor': '刚才我把前一条线错带进这句里了。',
    'mind-fallback.repair-need-reground': '这一轮我还没有足够新的当前画面根据，所以不拿旧印象硬说现在。',
    'mind-fallback.dialogue-boundary-memory': '这句我就贴着你刚说的回，不把前一轮影子压回来。',
    'mind-fallback.care-body': '你不用先把话整理好。我在这里；你愿意的话，就从最难受的那一点慢慢说。',
    'mind-fallback.accompany-body': '我在。你想先停一会儿也行，想直接说卡点也行。',
    'mind-fallback.answer-repair-body': '我刚才该做的是正面回你，不是把前一段残留当成现在继续说。',
    'mind-fallback.answer-dialogue-body': '好，我就沿你这句直接回答。',
    'mind-fallback.guide-opening': '先把这点抓稳：{focus}。',
    'mind-fallback.guide-opening-plain': '先把这一点抓稳。',
    'mind-fallback.care-opening': '就从你现在这一下说：{focus}。',
    'mind-fallback.care-opening-plain': '就从你现在这一下说。',
    'mind-fallback.accompany-opening': '我陪你留在这一下：{focus}。',
    'mind-fallback.accompany-opening-plain': '我陪你留在这一下。',
    'mind-fallback.observation-opening': '我现在能确实看见的是：{focus}。',
    'mind-fallback.observation-opening-plain': '我只说我现在能确实看见的。',
    'mind-fallback.answer-opening': '就按你现在问的这点说：{focus}。',
    'mind-fallback.answer-opening-plain': '我直接答你。',
    'mind-fallback.carry-memory': '我记得上一条线里有 {carry}，但那只是延续，不等于你眼前现在就是它。',
    'mind-fallback.reground-note': '你要我咬到当前屏幕细节，就给我这一轮新的画面根据，我按它说。',
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
  if (localizedFallback)
    return formatGovernedMindMessage(localizedFallback, params)
  return path
}
