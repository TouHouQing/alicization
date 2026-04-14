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
      'You do not need to organize it first. I am here. If you want, tell me the part that hit hardest.',
      'You do not need to tidy it up before speaking. Start from the part that hurts most and I will stay with it.',
      'You can drop the hardest piece first. I will stay with that piece before anything else.',
    ],
    'mind-fallback.accompany-body': [
      'I am here. We can stay with this for a moment, or go straight to the part that is catching.',
      'I am here. We can stay quiet for a beat, or go directly to the knot that is catching you.',
      'I am here. We can keep still for a moment, or go straight into the part that is snagging.',
    ],
    'mind-fallback.answer-repair-body': [
      'What I should have done was answer you here, not carry the last residue forward like it was still current.',
      'The right move here was to answer this turn directly, not let the earlier residue keep steering.',
      'I should have stayed with this turn and answered it, instead of letting the last carry pose as current.',
    ],
    'mind-fallback.answer-dialogue-body': [
      'Alright. I will answer right on this turn.',
      'Alright. I will stay on this turn and answer it directly.',
      'Alright. I will keep to this line and answer you here.',
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
      'Tell me from right here: {focus}.',
      'Start from this exact part: {focus}.',
      'Speak from this point first: {focus}.',
    ],
    'mind-fallback.care-opening-plain': [
      'Tell me this part directly.',
      'Start from this exact part.',
      'Drop this part first.',
    ],
    'mind-fallback.accompany-opening': [
      `I'm with you on this: {focus}.`,
      `I'll stay with this point: {focus}.`,
      `I'll keep near this point: {focus}.`,
    ],
    'mind-fallback.accompany-opening-plain': [
      `I'm with you on this.`,
      `I'll stay with this.`,
      `I'll keep near this point.`,
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
      `I'll answer you directly.`,
      `I'll answer from this turn.`,
      `I'll keep the answer on this line.`,
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
      '这句我就贴着你刚说的回，不把前一轮影子压回来。',
      '这句我就留在你现在这条线上，不把上一幕再压回来。',
      '这句我先守在你刚说的这里，前一轮那层影子不往这句上盖。',
    ],
    'mind-fallback.care-body': [
      '你不用先把话整理好。我在这里；你愿意的话，就从最难受的那一点慢慢说。',
      '你不用先收拾成完整句子。哪一点最难受，就先把那一点落给我。',
      '你不用先讲得很整齐。先把最刺你的那一点放下来，我跟着它走。',
    ],
    'mind-fallback.accompany-body': [
      '我在。你想先停一会儿也行，想直接说卡点也行。',
      '我在。你要先静一会儿也行，要直接把卡点摊开也行。',
      '我在。你想先缓一下可以，想直接把那处结说出来也可以。',
    ],
    'mind-fallback.answer-repair-body': [
      '我刚才该做的是正面回你，不是把前一段残留当成现在继续说。',
      '刚才更该做的是贴着这句回答，不是让前面的残留继续领着走。',
      '我刚才该把焦点收回这句直接回你，而不是让上一段余势装成现在。',
    ],
    'mind-fallback.answer-dialogue-body': [
      '好，我就沿你这句直接回答。',
      '好，我就贴着这句正面回你。',
      '好，我把回答收回到你这句上。',
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
      '就从你现在这一下说：{focus}。',
      '先从你现在最重的这点说：{focus}。',
      '先把你现在这一下放到这里：{focus}。',
    ],
    'mind-fallback.care-opening-plain': [
      '就从你现在这一下说。',
      '先从你现在最重的这点说。',
      '先把你现在这一下放出来。',
    ],
    'mind-fallback.accompany-opening': [
      '我陪你留在这一下：{focus}。',
      '我先陪你守着这点：{focus}。',
      '我先贴着这一下陪你待住：{focus}。',
    ],
    'mind-fallback.accompany-opening-plain': [
      '我陪你留在这一下。',
      '我先陪你守着这点。',
      '我先贴着这一下待住。',
    ],
    'mind-fallback.observation-opening': [
      '我现在能确实看见的是：{focus}。',
      '我这轮能落稳的是：{focus}。',
      '我现在能拿准的这一层是：{focus}。',
    ],
    'mind-fallback.observation-opening-plain': [
      '我先贴住这轮能确认的东西。',
      '我先只落这轮能拿准的部分。',
      '我先守住这轮能看稳的这层。',
    ],
    'mind-fallback.answer-opening': [
      '就按你现在问的这点说：{focus}。',
      '我就把回答收在这点上：{focus}。',
      '这句我就沿这点正面说：{focus}。',
    ],
    'mind-fallback.answer-opening-plain': [
      '我把回答收回这句。',
      '我就贴着这句回答。',
      '这句我正面回你。',
    ],
    'mind-fallback.carry-memory': [
      '我记得上一条线里有 {carry}，但那只是延续，不等于你眼前现在就是它。',
      '我还带着上一条线里的 {carry}，但那是延续，不是你眼前现在就等于它。',
      '我记着上一条线里的 {carry}，不过我把它当延续带着，不当成你眼前现在的实况。',
    ],
    'mind-fallback.reground-note': [
      '你要我咬到当前屏幕细节，就给我这一轮新的画面根据，我按它说。',
      '你要我落到当前屏幕细节，就把这轮新的画面根据给我，我按它咬住。',
      '你要我说到眼前这幕的细节，就给我这轮新的现场根据，我按它落。',
    ],
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
