import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'

import {
  buildGovernedMindThought,
  buildMindGovernedFallbackSurface,
  resolveGovernedMindEmotion,
  resolveGovernedMindObligation,
  resolveGovernedMindTone,
  resolveGovernedMindTruth,
  translateGovernedMindFallback,
} from '@proj-alicization/stage-shared'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function countCjkChars(raw: string) {
  return [...raw].filter(char => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char)).length
}

function stableVariantIndex(seed: string, size: number) {
  if (size <= 1)
    return 0

  let hash = 0
  for (let index = 0; index < seed.length; index += 1)
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  return hash % size
}

function pickVariant(seed: string, candidates: readonly string[]) {
  if (candidates.length === 0)
    return ''
  return candidates[stableVariantIndex(seed, candidates.length)] ?? candidates[0] ?? ''
}

function uniqueSentences(sentences: Array<string | null | undefined>, maxSentences: number) {
  const output: string[] = []
  for (const sentence of sentences) {
    const normalized = sanitizeText(sentence, 260)
    if (!normalized || output.includes(normalized))
      continue
    output.push(normalized)
    if (output.length >= maxSentences)
      break
  }
  return output
}

function quoteCue(text: string, locale: 'zh' | 'en') {
  const normalized = sanitizeText(text, 72)
  if (!normalized)
    return ''
  return locale === 'zh' ? `「${normalized}」` : `"${normalized}"`
}

function normalizeSentenceFingerprint(raw: string) {
  return sanitizeText(raw, 260)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function shouldSuppressRepeatedSentence(candidate: string, previousAssistantText: string) {
  const candidateFingerprint = normalizeSentenceFingerprint(candidate)
  const previousFingerprint = normalizeSentenceFingerprint(previousAssistantText)
  if (!candidateFingerprint || !previousFingerprint)
    return false

  if (candidateFingerprint.length >= 10 && previousFingerprint.includes(candidateFingerprint))
    return true

  const overlapNeedle = candidateFingerprint.slice(0, Math.min(16, candidateFingerprint.length))
  return overlapNeedle.length >= 8 && previousFingerprint.includes(overlapNeedle)
}

function normalizeTemplatePhrasing(sentence: string, locale: 'zh' | 'en') {
  if (locale !== 'zh')
    return sentence

  return sentence
    .replace(/你现在追问的是([^。]+)这一层。那我就直接说：/u, '你问的是$1。直接回答：')
    .replace(/那我就从/gu, '我会从')
    .replace(/那我就/gu, '我会')
    .replace(/我就贴着/gu, '我会沿着')
}

const allowedEmotions = new Set([
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
])

const allowedDeliveries = new Set([
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
])

export interface AlicizationMindSurfaceClockSnapshot {
  language: 'zh' | 'en'
  timeText: string
  dateText: string
  weekdayText: string
}

export interface AlicizationMindSurfaceGreetingMove {
  kind: 'greeting'
  salutation: string
  continuityAnchor?: string | null
  presenceCheck?: boolean
}

export interface AlicizationMindSurfaceIdentityMove {
  kind: 'identity'
  name: string
  askedLabel?: string | null
}

export interface AlicizationMindSurfaceCapabilityMove {
  kind: 'capability'
  capabilities: string[]
  continuityAnchor?: string | null
}

export interface AlicizationMindSurfacePresenceRepairMove {
  kind: 'presence-repair'
}

export interface AlicizationMindSurfaceTimeMove {
  kind: 'local-time'
  clock: AlicizationMindSurfaceClockSnapshot
  includeDate?: boolean
}

export interface AlicizationMindSurfaceDateMove {
  kind: 'local-date'
  clock: AlicizationMindSurfaceClockSnapshot
  includeTime?: boolean
}

export interface AlicizationMindSurfaceFollowUpMove {
  kind: 'follow-up'
  anchor?: string | null
  variant: 'continue' | 'remaining' | 'identity-confirm'
}

export interface AlicizationMindSurfaceRepairMove {
  kind: 'repair'
  target: 'time' | 'date' | 'capability' | 'dialogue'
  anchor?: string | null
  clock?: AlicizationMindSurfaceClockSnapshot | null
  capabilities?: string[]
}

export interface AlicizationMindSurfaceDialogueMove {
  kind: 'dialogue'
  focus?: string | null
  continuityAnchor?: string | null
}

export interface AlicizationMindSurfacePresentStateMove {
  kind: 'present-state'
  threadSummary?: string | null
}

export interface AlicizationMindSurfaceExecutionListingMove {
  kind: 'execution-listing'
  scope: 'desktop' | 'directory'
  count: number
  previewItems: string[]
  extraCount: number
  mode: 'inline' | 'callback' | 'follow-up'
  remainingOnly?: boolean
  requestedCount?: number | null
}

export interface AlicizationMindSurfaceExecutionDetailMove {
  kind: 'execution-detail'
  status: 'completed' | 'running' | 'queued' | 'blocked' | 'cancelled' | 'failed' | 'not-routed'
  detail?: string | null
  summary?: string | null
  channelLabel?: string | null
  mode: 'inline' | 'callback' | 'follow-up'
}

export interface AlicizationMindSurfaceDirectReplyMove {
  kind: 'direct-reply'
  text: string
}

export type AlicizationMindSurfaceMove
  = | AlicizationMindSurfaceGreetingMove
    | AlicizationMindSurfaceIdentityMove
    | AlicizationMindSurfaceCapabilityMove
    | AlicizationMindSurfacePresenceRepairMove
    | AlicizationMindSurfaceTimeMove
    | AlicizationMindSurfaceDateMove
    | AlicizationMindSurfaceFollowUpMove
    | AlicizationMindSurfaceRepairMove
    | AlicizationMindSurfaceDialogueMove
    | AlicizationMindSurfacePresentStateMove
    | AlicizationMindSurfaceExecutionListingMove
    | AlicizationMindSurfaceExecutionDetailMove
    | AlicizationMindSurfaceDirectReplyMove

export interface AlicizationMindSurfaceRenderInput {
  governance: AlicizationMindTurnGovernance
  userText?: string
  previousAssistantText?: string
  moves: AlicizationMindSurfaceMove[]
  thought?: string
  emotion?: string
  delivery?: string
  forceDialogueAnswerFallback?: boolean
  suppressGovernedLead?: boolean
}

export interface AlicizationMindSurfaceRenderResult {
  governance: AlicizationMindTurnGovernance
  thought: string
  emotion: string
  reply: string
  performance: {
    baseEmotion: string
    facialCue: null
    actionCue: null
    delivery: string
    emphasis: 0
  }
}

function inferLocale(userText: string, moves: AlicizationMindSurfaceMove[]) {
  if (moves.some(move => move.kind === 'execution-listing' || move.kind === 'execution-detail'))
    return 'zh'
  for (const move of moves) {
    if (move.kind === 'local-time' || move.kind === 'local-date')
      return move.clock.language
  }
  return countCjkChars(userText) > 0 ? 'zh' : 'en'
}

function resolveGovernedDelivery(governance: AlicizationMindTurnGovernance) {
  const tone = resolveGovernedMindTone(governance)
  if (governance.repairState !== 'none')
    return 'firm' as const
  if (tone === 'tender')
    return 'gentle' as const
  if (tone === 'direct')
    return 'calm' as const
  return governance.answerSubject === 'relationship' ? 'gentle' : 'calm'
}

function renderLocalTime(clock: AlicizationMindSurfaceClockSnapshot, includeDate = false) {
  if (clock.language === 'zh') {
    return includeDate
      ? `现在是 ${clock.timeText}，今天是 ${clock.dateText}，${clock.weekdayText}。`
      : `现在是 ${clock.timeText}，${clock.weekdayText}。`
  }

  return includeDate
    ? `It's ${clock.timeText} right now. Today is ${clock.dateText} (${clock.weekdayText}).`
    : `It's ${clock.timeText} right now (${clock.weekdayText}).`
}

function renderLocalDate(clock: AlicizationMindSurfaceClockSnapshot, includeTime = false) {
  if (clock.language === 'zh') {
    return includeTime
      ? `今天是 ${clock.dateText}，${clock.weekdayText}，现在是 ${clock.timeText}。`
      : `今天是 ${clock.dateText}，${clock.weekdayText}。`
  }

  return includeTime
    ? `Today is ${clock.dateText} (${clock.weekdayText}), and it's ${clock.timeText} right now.`
    : `Today is ${clock.dateText} (${clock.weekdayText}).`
}

function renderGreetingMove(move: AlicizationMindSurfaceGreetingMove, locale: 'zh' | 'en', seed: string) {
  if (locale === 'zh') {
    if (move.presenceCheck)
      return [pickVariant(seed, ['我在。', '我在，你直接说。'])]
    return [`${move.salutation}。`]
  }

  if (move.presenceCheck)
    return [`I'm here. Say it directly.`]
  return [
    `${move.salutation}. Say it directly and I will meet this turn.`,
  ]
}

function renderIdentityMove(move: AlicizationMindSurfaceIdentityMove, locale: 'zh' | 'en', seed: string) {
  const askedLabel = quoteCue(move.askedLabel ?? '', locale)
  if (locale === 'zh') {
    return [
      askedLabel
        ? pickVariant(seed, [
            `你问的是 ${askedLabel}。直接说结论：我是${move.name}，现在回你这句的就是我。`,
            `${askedLabel} 这层我不绕，答案是：我是${move.name}，此刻在和你对话的是我。`,
          ])
        : pickVariant(seed, [
            `我是${move.name}，现在和你说话的是我本人。`,
            `直接回答：我是${move.name}，此刻在回你的是我。`,
          ]),
    ]
  }

  return [
    askedLabel
      ? pickVariant(seed, [
          `You asked about ${askedLabel}. Plain answer: I am ${move.name}, and I'm the one speaking with you now.`,
          `No detour on ${askedLabel}: I am ${move.name}, and this reply is from me.`,
        ])
      : pickVariant(seed, [
          `I am ${move.name}, and I'm the one speaking with you now.`,
          `Direct answer: I am ${move.name}, and this turn is from me.`,
        ]),
  ]
}

function renderCapabilityMove(move: AlicizationMindSurfaceCapabilityMove, locale: 'zh' | 'en') {
  const capabilities = move.capabilities.filter(Boolean)
  const capabilityText = capabilities.join(locale === 'zh' ? '、' : ', ')
  if (locale === 'zh') {
    return [
      `我能 ${capabilityText}。你给我一个具体目标，我就直接开始。`,
    ]
  }

  return [
    `I can ${capabilityText}. Give me one concrete goal and I will start.`,
  ]
}

function renderPresenceRepairMove(locale: 'zh' | 'en', seed: string) {
  if (locale === 'zh') {
    return [
      pickVariant(seed, [
        '对，刚才那句更像流程播报，不像我在跟你说话。',
        '你说得对，我刚才那句像系统口气，不像真正的对话。',
        '是，刚才那样说太像机器在报状态，不像我在接你这句。',
      ]),
    ]
  }

  return [
    pickVariant(seed, [
      'You are right. That sounded like process narration, not like me talking to you.',
      'Fair. That line sounded robotic, not like a living reply.',
    ]),
  ]
}

function renderFollowUpMove(move: AlicizationMindSurfaceFollowUpMove, locale: 'zh' | 'en') {
  const anchor = quoteCue(move.anchor ?? '', locale)
  if (move.variant === 'identity-confirm') {
    return locale === 'zh'
      ? ['确定。我刚才不是在报一个标签，我是在直接回答：现在在这里和你说话、以 Alicization 回应你的，就是我。']
      : ['Yes. I was not naming a label; I was answering directly that Alicization is the one speaking with you here.']
  }

  if (move.variant === 'remaining') {
    return locale === 'zh'
      ? [anchor ? `前半段我不复述，直接把 ${anchor} 后面还欠的那部分补上。` : '前半段我不复述，直接把后面还欠的那部分补上。']
      : [anchor ? `I won't restate the first half. I'll fill in the missing part after ${anchor}.` : `I won't restate the first half. I'll fill in what is still missing.`]
  }

  return locale === 'zh'
    ? [anchor ? `好，我会从 ${anchor} 这点继续往下。` : '好，我会把后面缺的那段直接接上。']
    : [anchor ? `Alright, I'll continue from ${anchor}.` : `Alright, I'll continue from the missing part directly.`]
}

function renderRepairMove(move: AlicizationMindSurfaceRepairMove, locale: 'zh' | 'en', seed: string) {
  if (move.target === 'time' && move.clock)
    return locale === 'zh'
      ? [pickVariant(seed, [
          `刚才那句没贴住你的问题。你问的是时间，${renderLocalTime(move.clock, true)}`,
          `上一句我接偏了。你要的是时间，${renderLocalTime(move.clock, true)}`,
        ])]
      : [pickVariant(seed, [
          `That missed your question. You were asking for the time, and ${renderLocalTime(move.clock, true)}`,
          `I answered the wrong thing. You wanted the time, and ${renderLocalTime(move.clock, true)}`,
        ])]
  if (move.target === 'date' && move.clock)
    return locale === 'zh'
      ? [pickVariant(seed, [
          `刚才那句没贴住你的问题。你问的是日期，${renderLocalDate(move.clock, true)}`,
          `上一句我接偏了。你要的是日期，${renderLocalDate(move.clock, true)}`,
        ])]
      : [pickVariant(seed, [
          `That missed your question. You were asking for the date, and ${renderLocalDate(move.clock, true)}`,
          `I answered the wrong thing. You wanted the date, and ${renderLocalDate(move.clock, true)}`,
        ])]
  if (move.target === 'capability') {
    const capabilityText = (move.capabilities ?? []).filter(Boolean).join(locale === 'zh' ? '、' : ', ')
    return locale === 'zh'
      ? [pickVariant(seed, [
          `刚才那句没贴住你的重点。你真正问的是我能做什么：我能 ${capabilityText}。`,
          `上一句我答偏了。你问的是能力面：我能 ${capabilityText}。`,
        ])]
      : [pickVariant(seed, [
          `That missed your actual point. What you were asking was what I can do: I can ${capabilityText}.`,
          `I answered the wrong layer. You were asking about capability: I can ${capabilityText}.`,
        ])]
  }

  const anchor = quoteCue(move.anchor ?? '', locale)
  return locale === 'zh'
    ? [anchor
        ? pickVariant(seed, [
            `刚才那句没有贴住你真正想问的点。我现在就按 ${anchor} 直接回你。`,
            `上一句我接偏了。你真正要的是 ${anchor} 这点，我现在直接回到这里。`,
          ])
        : pickVariant(seed, [
            '刚才那句没有贴住你真正想问的点。我现在直接回这句。',
            '上一句我接偏了。我现在把焦点收回这句，直接答你。',
          ])]
    : [anchor
        ? pickVariant(seed, [
            `I missed the point you were actually asking for. I'll answer directly from ${anchor}.`,
            `I drifted off the real question. I'll come straight back to ${anchor}.`,
          ])
        : pickVariant(seed, [
            `I missed the point you were actually asking for. I'll answer this turn directly now.`,
            `I drifted off the real question. I'm pulling the focus back to this turn now.`,
          ])]
}

function renderDialogueMove(move: AlicizationMindSurfaceDialogueMove, locale: 'zh' | 'en', seed: string) {
  const anchor = quoteCue(move.continuityAnchor ?? '', locale)
  const focus = quoteCue(move.focus ?? '', locale)
  if (locale === 'zh') {
    return [
      anchor
        ? pickVariant(seed, [
            `我们就沿 ${anchor} 往下，不把话题滑开。`,
            `这轮就贴着 ${anchor} 往下说，我不把它扯去别处。`,
          ])
        : focus
          ? pickVariant(seed, [
              `焦点就在 ${focus}，我直接接这点回你。`,
              `这句的重点就是 ${focus}，我现在就贴着它回。`,
            ])
          : pickVariant(seed, [
              '我就在这句上继续，不绕别处。',
              '我贴着这句继续回你，不把话题滑开。',
            ]),
    ]
  }

  return [
    anchor
      ? pickVariant(seed, [
          `I'll stay with ${anchor} and keep going from there.`,
          `I'll hold to ${anchor} and keep the reply on that line.`,
        ])
      : focus
        ? pickVariant(seed, [
            `I'll answer right on ${focus}, without drifting away from it.`,
            `The focus is ${focus}, so I'll answer directly on that point.`,
          ])
        : pickVariant(seed, [
            `I'll stay with this turn and continue from here.`,
            `I'll keep the reply on this turn instead of drifting away.`,
          ]),
  ]
}

function renderPresentStateMove(move: AlicizationMindSurfacePresentStateMove, locale: 'zh' | 'en', seed: string) {
  const summary = quoteCue(move.threadSummary ?? '', locale)
  if (locale === 'zh') {
    if (summary) {
      return [
        pickVariant(seed, [
          `我现在就在接 ${summary} 这条线，也在看你这句。`,
          `我这会儿主要盯着 ${summary} 这条线，同时在接你现在这句。`,
        ]),
      ]
    }

    return [
      pickVariant(seed, [
        '我现在就在这轮里，正看着你这句，也准备直接接下去。',
        '我这会儿就在接这轮对话，没有飘去别处。',
      ]),
    ]
  }

  if (summary) {
    return [
      pickVariant(seed, [
        `Right now I'm staying with ${summary} while answering this turn.`,
        `I'm currently holding ${summary} and meeting this turn at the same time.`,
      ]),
    ]
  }

  return [
    pickVariant(seed, [
      `Right now I'm here in this turn, watching what you're saying and ready to keep going.`,
      `I'm currently staying with this conversation instead of drifting somewhere else.`,
    ]),
  ]
}

function renderExecutionListingMove(move: AlicizationMindSurfaceExecutionListingMove, locale: 'zh' | 'en') {
  const scopeLabel = move.scope === 'desktop'
    ? (locale === 'zh' ? '桌面' : 'desktop')
    : (locale === 'zh' ? '目录' : 'directory')
  const previewText = move.previewItems.map(item => sanitizeText(item, 72)).filter(Boolean).join(locale === 'zh' ? '、' : ', ')
  const extraCount = Math.max(0, move.extraCount)

  if (move.mode === 'follow-up') {
    if (!previewText)
      return [locale === 'zh' ? `${scopeLabel}这边没有新的剩余项了。` : `There are no remaining ${scopeLabel} items to add.`]
    if (locale === 'zh') {
      return [
        move.requestedCount && move.requestedCount > 0
          ? `另外 ${move.previewItems.length} 项是：${previewText}。${extraCount > 0 ? `剩下还有 ${extraCount} 项，你要我就继续往下列。` : ''}`
          : `剩下这些是：${previewText}。${extraCount > 0 ? `后面还有 ${extraCount} 项，你要我就继续往下列。` : ''}`,
      ]
    }
    return [
      move.requestedCount && move.requestedCount > 0
        ? `The other ${move.previewItems.length} items are: ${previewText}.${extraCount > 0 ? ` There are ${extraCount} more after that if you want me to keep listing them.` : ''}`
        : `The remaining items are: ${previewText}.${extraCount > 0 ? ` There are ${extraCount} more after that if you want me to keep going.` : ''}`,
    ]
  }

  if (!previewText) {
    return locale === 'zh'
      ? [`${scopeLabel}里现在一共是 ${move.count} 项。`]
      : [`There are ${move.count} items in the ${scopeLabel} right now.`]
  }

  if (locale === 'zh') {
    return [
      `${scopeLabel}里现在一共 ${move.count} 项，先能点出来的是：${previewText}${extraCount > 0 ? `，另外还有 ${extraCount} 项` : ''}。`,
    ]
  }

  return [
    `There are ${move.count} items in the ${scopeLabel} right now. The ones I can name first are: ${previewText}${extraCount > 0 ? `, plus ${extraCount} more` : ''}.`,
  ]
}

function renderExecutionDetailMove(move: AlicizationMindSurfaceExecutionDetailMove, locale: 'zh' | 'en') {
  const detail = sanitizeText(move.detail, 220)
  const summary = sanitizeText(move.summary, 180)
  const channelLabel = sanitizeText(move.channelLabel, 48) || 'CLI'

  if (locale === 'zh') {
    if (move.mode === 'follow-up') {
      if (move.status === 'completed') {
        return [
          `${channelLabel} 那条任务已经跑完了${detail ? `，现在拿到的是：${detail}。` : '。'}${summary ? `概括上就是：${summary}。` : ''}`,
        ]
      }
      if (move.status === 'failed' || move.status === 'blocked' || move.status === 'cancelled' || move.status === 'not-routed') {
        return [
          `${channelLabel} 那条任务这次没跑通${detail ? `：${detail}。` : '。'}${summary ? `概括上就是：${summary}。` : ''}`,
        ]
      }
    }

    switch (move.status) {
      case 'completed':
        return [detail ? `这件事已经有结果了：${detail}。` : '这件事已经有结果了。']
      case 'running':
        return [`这件事已经交给 ${channelLabel} 在跑了。`]
      case 'queued':
        return [`这件事已经排进 ${channelLabel} 了。`]
      case 'cancelled':
        return [detail ? `这次执行中断了：${detail}。` : '这次执行中断了。']
      case 'blocked':
      case 'not-routed':
        return [detail ? `这件事没能真正跑出去：${detail}。` : '这件事没能真正跑出去。']
      case 'failed':
      default:
        return [detail ? `这件事没跑通：${detail}。` : summary ? `这件事没跑通：${summary}。` : '这件事没跑通。']
    }
  }

  switch (move.status) {
    case 'completed':
      return [detail ? `The task has a result now: ${detail}.` : 'The task has a result now.']
    case 'running':
      return [`The task is already running in ${channelLabel}.`]
    case 'queued':
      return [`The task is already queued in ${channelLabel}.`]
    case 'cancelled':
      return [detail ? `The execution stopped partway through: ${detail}.` : 'The execution stopped partway through.']
    case 'blocked':
    case 'not-routed':
      return [detail ? `The task did not actually get out: ${detail}.` : 'The task did not actually get out.']
    case 'failed':
    default:
      return [detail ? `The task failed: ${detail}.` : summary ? `The task failed: ${summary}.` : 'The task failed.']
  }
}

function renderMove(move: AlicizationMindSurfaceMove, locale: 'zh' | 'en', seed: string) {
  switch (move.kind) {
    case 'greeting':
      return renderGreetingMove(move, locale, seed)
    case 'identity':
      return renderIdentityMove(move, locale, seed)
    case 'capability':
      return renderCapabilityMove(move, locale)
    case 'presence-repair':
      return renderPresenceRepairMove(locale, seed)
    case 'local-time':
      return [renderLocalTime(move.clock, move.includeDate === true)]
    case 'local-date':
      return [renderLocalDate(move.clock, move.includeTime === true)]
    case 'follow-up':
      return renderFollowUpMove(move, locale)
    case 'repair':
      return renderRepairMove(move, locale, seed)
    case 'dialogue':
      return renderDialogueMove(move, locale, seed)
    case 'present-state':
      return renderPresentStateMove(move, locale, seed)
    case 'execution-listing':
      return renderExecutionListingMove(move, locale)
    case 'execution-detail':
      return renderExecutionDetailMove(move, locale)
    case 'direct-reply':
      return [sanitizeText(move.text, 320)]
  }
}

function deriveKernelCues(moves: AlicizationMindSurfaceMove[], locale: 'zh' | 'en') {
  const cues: string[] = []
  for (const move of moves) {
    switch (move.kind) {
      case 'greeting':
        cues.push(locale === 'zh' ? `接住${move.salutation}这句问候` : `receive the greeting ${move.salutation}`)
        if (move.continuityAnchor)
          cues.push(sanitizeText(move.continuityAnchor, 120))
        break
      case 'identity':
        cues.push(locale === 'zh' ? `我是${move.name}` : `I am ${move.name}`)
        break
      case 'capability':
        cues.push(move.capabilities.join(locale === 'zh' ? '、' : ', '))
        break
      case 'local-time':
        cues.push(move.clock.language === 'zh'
          ? `现在是 ${move.clock.timeText}`
          : `It is ${move.clock.timeText}`)
        break
      case 'local-date':
        cues.push(move.clock.language === 'zh'
          ? `今天是 ${move.clock.dateText}`
          : `Today is ${move.clock.dateText}`)
        break
      case 'follow-up':
        if (move.anchor)
          cues.push(sanitizeText(move.anchor, 120))
        break
      case 'repair':
        if (move.anchor)
          cues.push(sanitizeText(move.anchor, 120))
        break
      case 'dialogue':
        if (move.focus)
          cues.push(sanitizeText(move.focus, 120))
        else if (move.continuityAnchor)
          cues.push(sanitizeText(move.continuityAnchor, 120))
        break
      case 'present-state':
        if (move.threadSummary)
          cues.push(sanitizeText(move.threadSummary, 120))
        break
      case 'execution-listing':
        cues.push(locale === 'zh'
          ? `${move.scope === 'desktop' ? '桌面' : '目录'}里一共 ${move.count} 项`
          : `${move.count} ${move.scope === 'desktop' ? 'desktop' : 'directory'} items`)
        if (move.previewItems[0])
          cues.push(sanitizeText(move.previewItems[0], 120))
        break
      case 'execution-detail':
        if (move.detail)
          cues.push(sanitizeText(move.detail, 120))
        else if (move.summary)
          cues.push(sanitizeText(move.summary, 120))
        break
      case 'presence-repair':
      case 'direct-reply':
        break
    }
  }
  return uniqueSentences(cues, 4)
}

function enrichGovernance(input: AlicizationMindSurfaceRenderInput, locale: 'zh' | 'en'): AlicizationMindTurnGovernance {
  const cues = deriveKernelCues(input.moves, locale)
  if (cues.length === 0)
    return input.governance

  const baseKernel = input.governance.dialogueActKernel
  const subject = input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation?.subject ?? 'task-knot'
  const hostGoal = sanitizeText(
    input.governance.mindTurnFrame?.relation?.hostGoal
    || input.userText
    || input.governance.focusAnchor
    || cues[0],
    160,
  ) || cues[0]
  const relationNeed = sanitizeText(
    input.governance.mindTurnFrame?.relation?.relationNeed
    || input.governance.answerIntent
    || cues[0],
    180,
  ) || cues[0]
  const truthMode = input.governance.evidenceMode === 'continuity-carry'
    ? 'memory-only'
    : input.governance.evidenceMode ?? 'dialogue-grounded'
  const speechAct = input.governance.answerAct ?? input.governance.mindTurnFrame?.obligation?.answerAct ?? 'answer'
  const turnMode = input.governance.turnMode
  const screenReferenceMode = input.governance.screenReferenceMode ?? 'avoid'
  const speakingFrom = input.governance.answerSubject === 'relationship'
    ? 'dialogue-bond'
    : input.governance.answerSubject === 'alicization-self'
      ? 'self-continuity'
      : input.governance.screenReferenceMode === 'avoid'
        ? 'task-thread'
        : 'held-memory'

  return {
    ...input.governance,
    dialogueActKernel: {
      subject,
      hostGoal,
      relationNeed,
      activeProject: baseKernel?.activeProject ?? null,
      truthMode,
      speechAct,
      turnMode,
      screenReferenceMode,
      speakingFrom,
      selectedEvidence: baseKernel?.selectedEvidence?.length
        ? baseKernel.selectedEvidence
        : cues.slice(0, 2).map(summary => ({
            kind: 'reply-motive' as const,
            source: 'answer-planner' as const,
            summary,
            confidence: 0.88,
          })),
      openingClaim: sanitizeText(
        baseKernel?.openingClaim,
        160,
      ) || cues[0],
      openingMove: sanitizeText(
        baseKernel?.openingMove
        || input.governance.mindTurnFrame?.obligation?.openingMove
        || input.governance.openingMove,
        120,
      ) || cues[0],
      whyNow: sanitizeText(
        baseKernel?.whyNow
        || input.governance.mindTurnFrame?.obligation?.whyNow,
        180,
      ) || cues[0],
      mustSay: uniqueSentences([
        ...(baseKernel?.mustSay ?? []),
        ...cues,
      ], 4),
      mustAvoid: baseKernel?.mustAvoid ?? [],
      sourceTrace: baseKernel?.sourceTrace ?? ['mind-surface-renderer'],
      confidence: Math.max(0.78, baseKernel?.confidence ?? 0.9),
      updatedAt: baseKernel?.updatedAt ?? 0,
    },
  }
}

function shouldUseGovernedLead(input: {
  moves: AlicizationMindSurfaceMove[]
  governedReply: string
  previousAssistantText: string
  suppressGovernedLead?: boolean
}) {
  if (input.suppressGovernedLead)
    return false
  if (!input.governedReply)
    return false

  if (shouldSuppressRepeatedSentence(input.governedReply, input.previousAssistantText))
    return false

  if (input.moves.some(move => move.kind === 'direct-reply'))
    return false

  if (input.moves.some(move => move.kind === 'local-time' || move.kind === 'local-date'))
    return false

  if (input.moves.some(move => move.kind === 'execution-listing' || move.kind === 'execution-detail'))
    return false

  return input.moves.some(move =>
    move.kind === 'identity'
    || move.kind === 'presence-repair'
    || move.kind === 'repair'
    || move.kind === 'dialogue'
    || move.kind === 'present-state'
    || move.kind === 'follow-up',
  )
}

export function renderAlicizationMindSurface(input: AlicizationMindSurfaceRenderInput): AlicizationMindSurfaceRenderResult {
  const userText = sanitizeText(input.userText, 240)
  const previousAssistantText = sanitizeText(input.previousAssistantText, 420)
  const locale = inferLocale(userText, input.moves)
  const governance = enrichGovernance(input, locale)
  const governedSurface = buildMindGovernedFallbackSurface({
    governance,
    userText,
    translate: (path, params) => translateGovernedMindFallback(path, params, userText),
    forceDialogueAnswerFallback: input.forceDialogueAnswerFallback === true,
  })
  const seed = [
    governance.answerSubject,
    governance.turnMode,
    userText,
    previousAssistantText,
    input.moves.map(move => move.kind).join('|'),
  ].join('|')
  const moveSentences = input.moves
    .flatMap(move => renderMove(move, locale, seed))
    .map(sentence => normalizeTemplatePhrasing(sentence, locale))
  const maxSentences = Math.max(1, Math.min(3, governance.maxSentences || 2))
  const governedReply = governedSurface?.reply ?? ''
  const normalizedGovernedReply = normalizeTemplatePhrasing(governedReply, locale)
  const governedVisibleReplyMode = governedSurface?.visibleReplyMode ?? 'bubble'
  const useGovernedLead = shouldUseGovernedLead({
    moves: input.moves,
    governedReply: normalizedGovernedReply,
    previousAssistantText,
    suppressGovernedLead: input.suppressGovernedLead,
  })
  const replySentences = uniqueSentences([
    useGovernedLead && governedVisibleReplyMode !== 'dispatch-only'
      ? normalizedGovernedReply
      : '',
    ...moveSentences,
    !useGovernedLead && moveSentences.length === 0 && governedVisibleReplyMode !== 'dispatch-only'
      ? normalizedGovernedReply
      : '',
  ], maxSentences)
  const filteredSentences = replySentences.filter((sentence, index) => {
    if (index > 0)
      return true
    return !shouldSuppressRepeatedSentence(sentence, previousAssistantText)
  })
  const reply = (filteredSentences.length > 0 ? filteredSentences : replySentences).join(' ')
  const trustedThought = sanitizeText(input.thought, 220)
  const thought = trustedThought
    && trustedThought.includes(`obligation=${resolveGovernedMindObligation(governance)}`)
    && trustedThought.includes(`truth=${resolveGovernedMindTruth(governance)}`)
      ? trustedThought
      : buildGovernedMindThought({
          governance,
          userText,
        })
  const emotion = allowedEmotions.has(sanitizeText(input.emotion, 24))
    ? sanitizeText(input.emotion, 24)
    : (governedSurface?.emotion ?? resolveGovernedMindEmotion(governance))
  const delivery = allowedDeliveries.has(sanitizeText(input.delivery, 24))
    ? sanitizeText(input.delivery, 24)
    : resolveGovernedDelivery(governance)

  return {
    governance,
    thought,
    emotion,
    reply,
    performance: {
      baseEmotion: emotion,
      facialCue: null,
      actionCue: null,
      delivery,
      emphasis: 0,
    },
  }
}

export function buildAlicizationMindSurfaceStructuredReply(input: AlicizationMindSurfaceRenderInput) {
  const rendered = renderAlicizationMindSurface(input)
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: rendered.thought,
    emotion: rendered.emotion,
    reply: rendered.reply,
    performance: rendered.performance,
    governance: rendered.governance,
  })
}
