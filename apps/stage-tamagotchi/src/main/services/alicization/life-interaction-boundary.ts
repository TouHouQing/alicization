import type { LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

const quietBoundarySchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
  sourceTurnId: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
  inputId: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
  inputHash: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u)),
  createdAt: v.pipe(v.number(), v.minValue(0)),
  scope: v.literal('ordinary-outreach'),
  release: v.literal('next-host-turn'),
})

export function requestsQuietCompanionship(message: unknown) {
  if (!message || typeof message !== 'object')
    return false
  const content = (message as { content?: unknown }).content
  const text = (typeof content === 'string' ? content : Array.isArray(content) ? content.filter(part => part?.type === 'text' && typeof part.text === 'string').map(part => part.text).join('\n') : '').slice(0, 4000).replace(/```[\s\S]*?```|“[^”]*”|「[^」]*」|『[^』]*』|"[^"]*"/gu, '')
  if (/如果|假如|要是|他说|她说|文档(?:里|中)(?:写|说|提到)|网页[里上中](?:写|说)|什么意思|要不要|是否|怎样|如何|怎么|为什么|\b(?:if|suppose|quoted|what does)\b/iu.test(text))
    return false
  return /(?:先|暂时|现在|这会儿|接下来)?(?:别|不要|不用|请勿|别再)(?:主动)?(?:找我(?:说话|聊天)?|打扰我|跟我说话|和我说话|跟我聊天|说话|聊天|发消息|开口|吵我|出声)|(?:让我|给我)(?:安静|独处)一会儿?|(?:先|暂时)(?:保持)?安静|\b(?:do not|don't|please don't|stop)\s+(?:interrupt(?:ing)?|disturb(?:ing)?|bother(?:ing)?|talk(?:ing)? to)\s+me\b|\bleave me alone(?: for now)?\b|\b(?:please )?(?:stay|keep|be) quiet\b|\bkeep me company quietly\b/iu.test(text)
}

export function createLifeQuietBoundary(cardId: string, sourceTurnId: string, inputHash: string, createdAt: number) {
  return { id: `quiet-boundary:${createHash('sha256').update(JSON.stringify({ cardId, sourceTurnId, inputHash })).digest('hex')}`, sourceTurnId, inputId: `user:${sourceTurnId}`, inputHash, createdAt, scope: 'ordinary-outreach' as const, release: 'next-host-turn' as const }
}

export function readLifeQuietBoundary(values: LifeStateView['values']) {
  const raw = values['life:initiative']
  const state = raw ? JSON.parse(raw) as { outreachHold?: unknown } : null
  const parsed = v.safeParse(quietBoundarySchema, state?.outreachHold)
  return parsed.success ? parsed.output : null
}

const quietIntervalSchema = v.strictObject({
  id: v.string(),
  beganAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  endedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  beganByTurnId: v.string(),
  endedByTurnId: v.string(),
  endingInputHash: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u)),
})

export function readLifeQuietInterval(values: LifeStateView['values']) {
  const raw = values['life:initiative']
  const state = raw ? JSON.parse(raw) as { lastQuietInterval?: unknown } : null
  const parsed = v.safeParse(quietIntervalSchema, state?.lastQuietInterval)
  return parsed.success ? parsed.output : null
}

export function requestsQuietIntervalRecall(text: string) {
  const direct = text.slice(0, 4000).replace(/```[\s\S]*?```|“[^”]*”|「[^」]*」|『[^』]*』|"[^"]*"/gu, '')
  if (/(?:刚才|刚刚|方才)(?:这段|那段)(?:时间|期间)[\s\S]{0,100}(?:你|自己)[\s\S]{0,60}(?:做|干|发生|想过)|\b(?:what did you do|did you do anything)[\s\S]{0,60}\b(?:in|during)\s+(?:that|this|the last)\s+(?:time|period|few minutes)\b/iu.test(direct))
    return true
  return /(?:安静|我(?:忙|不在)|独处)[\s\S]{0,80}(?:这段|那段|期间|时候|时|时间)[\s\S]{0,80}(?:做|干|发生)|\b(?:during|while)[\s\S]{0,80}(?:quiet|busy|away)[\s\S]{0,80}\b(?:do|did|happened)\b|\b(?:do|did|happened)[\s\S]{0,80}(?:during|while)[\s\S]{0,80}(?:quiet|busy|away)\b/iu.test(direct)
}
