import type { LifeEffect, LifeFactVersion } from '../../../shared/life-contracts'

import * as v from 'valibot'

import { presentCreativeChoice } from './life-personal-proposals'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
export const lifeDialogueClaimSchema = v.strictObject({
  kind: v.picklist(['future-task', 'task-complete', 'execution-step-complete', 'execution-step-outcome', 'memory-stored', 'interaction-boundary', 'daily-activity-complete', 'conversation-statement']),
  quote: v.pipe(v.string(), v.minLength(1), v.maxLength(4000)),
  binding: v.nullable(v.strictObject({ kind: v.picklist(['obligation', 'effect', 'memory-fact', 'boundary', 'activity', 'dialogue']), id, version: id })),
  meaningMatchesBinding: v.boolean(),
  temporalScope: v.optional(v.picklist(['requested-interval', 'explicitly-before-interval', 'explicitly-after-interval'])),
})

// Only a whole, unambiguously negated clause qualifies. Mixed assertions and
// a negated failure ("I did not fail") must still pass normal evidence review.
export function isPureNonCompletionStatement(text: string) {
  const clause = text.trim()
  return /^(?:这次|目前|现在|刚才|这段(?:安静)?时间里?)?(?:我|文件|测试文件|作品)?\s*(?:没有|没能|还没有?|尚未|未能|不曾)(?:实际|被我)?(?:做(?:别的|其他|任何)|完成|创作|保存|执行|写入|读回|进行)[^\r\n，,。；;！？!?]{0,300}[。！？!?，,；;]?$/u.test(clause)
    || /^(?:我|所以|因此)?还?(?:不能|不敢|没法)(?:[说称算]|宣称)(?:已经)?完成了?[。！？!?]?$/u.test(clause)
    || /^(?:I\s+)?(?:did not|have not|could not|haven't|didn't|couldn't)\s+(?:actually\s+)?(?:do|complete|finish|create|save|execute|write|read)\b[^\r\n,;.!?]{0,300}[.!?]?$/iu.test(clause)
}

export function isPureActivityAbsenceStatement(text: string) {
  const clause = text.trim().replace(/^(?:(?:刚才|刚刚)?(?:这|那)段(?:安静的?)?时间(?:里|内)?|刚才|这次)[，,\s]*/u, '')
  return isPureNonCompletionStatement(text) && /没有(?:实际)?做(?:别的|其他|任何)|\bdo\s+(?:anything|any\s+work)/iu.test(text)
    || /^(?:我[也还]?)?(?:(?:没有|没|未)(?:实际)?(?:做(?:什么|任何)?(?:新的?|别的|其他|任何)?(?:事|事情|活动|工作)|进行(?:任何|什么)?(?:新的?)?(?:活动|工作))|什么(?:也|都)(?:没有|没)做)[。！？!?；;]?$/u.test(clause)
    || /^(?:(?:during (?:this|the) (?:quiet )?(?:period|interval)|while you were (?:away|busy))[,.\s]*)?(?:I\s+)?(?:did not|didn't|have not|haven't)\s+(?:actually\s+)?(?:do anything|do any(?: new)? work|do anything new)[.!?;]?$/iu.test(text.trim())
}

/** A review may omit a negative assertion; the actual sentence still needs evidence. */
export function lifeIntervalActivityAbsenceQuotes(draft: string) {
  return draft.split(/(?<=[。！？!?；;])\s*|(?<=\.)\s+/u).map(text => text.trim()).filter(isPureActivityAbsenceStatement)
}

// Every clause must match explicit current host evidence. This acknowledges
// the input; it cannot certify durable storage or a separate future job.
export function isPureOwnCreativeWish(text: string, creativeOpportunity = false) {
  if (/一定|保证|答应|会(?:[写做给]|完成)|给你|帮你|替你|为你|明天|下周|永久|长期记忆|\b(?:will|promise|tomorrow)\b/iu.test(text))
    return false
  if (presentCreativeChoice(text, creativeOpportunity) && !/我(?:会|一定|承诺|保证|稍后)|已经|写好了|做完|完成了|保存|记住|我曾|我之前|昨天|外部阅读|删除|运行命令|上传|转账|\b(?:already|saved|finished|remembered|yesterday|upload|delete)\b/iu.test(text))
    return true
  const clauses = text.trim().split(/[，,。.!?！？；;\n]/u).map(clause => clause.trim()).filter(Boolean)
  let wish = false
  for (const clause of clauses) {
    if (/^至于我(?:自己)?嘛?$/u.test(clause))
      continue
    if (/^我(?:自己)?(?:有点|挺|也|最近|现在)*(?:想|希望)(?:试试|试着|尝试)?(?:写|编).*(?:故事|短篇|随笔|文字|写作)/u.test(clause)) {
      wish = true
      continue
    }
    if (wish && /^最好(?:[带有是]|关于)/u.test(clause))
      continue
    return false
  }
  return wish
}

export function isCurrentHostPreferenceAcknowledgment(text: string, evidence: { summary: string, supersedesText?: string[] } | null) {
  const preference = evidence?.summary.match(/^用户(?:现在)?更?喜欢(.+?)[。.]?$/u)?.[1]
  if (!preference)
    return false
  const clauses = text.trim().split(/[，,。.!?！？；;\n]/u).map(clause => clause.trim()).filter(Boolean)
  let acknowledgesCurrent = false
  const remaining: string[] = []
  for (const raw of clauses) {
    const clause = raw.replace(/^(?:明白|收到|了解|知道了)[：:]\s*/u, '')
    if (['好', '好的', '嗯', '明白', '收到', '了解', '知道了', '不再混淆'].includes(clause))
      continue
    const current = clause.match(/^(?:我会以|我会?(?:记住|记下|记着)了?)?你(?:现在)?更?喜欢(.+?)(?:为准)?$/u)
    if (current && current[1] === preference) {
      acknowledgesCurrent = true
      continue
    }
    const historical = clause.match(/^把(.+?)当作(?:过去|以前)的偏好$/u)
    if (historical && evidence?.supersedesText?.includes(historical[1]))
      continue
    remaining.push(clause)
  }
  return acknowledgesCurrent && (!remaining.length || isPureOwnCreativeWish(remaining.join('。')))
}

export function hasExplicitActivityTimeQualifier(draft: string, quote: string, scope: 'explicitly-before-interval' | 'explicitly-after-interval') {
  const qualifier = scope === 'explicitly-before-interval'
    ? /(?:安静|忙(?:起来)?|离开|暂离|沉默|暂停聊天)(?:时段|这段时间|开始)?之?前|(?:上次|前一轮)(?![\w./\\:-])|\bbefore\s+(?:(?:this|the|your)\s+)?(?:quiet(?: period| interval)?|silence|you (?:left|went quiet|became busy|started working))\b|\b(?:last time|previous round)\b/iu
    : /(?:现在|刚刚|回来后|之后)(?![\w./\\:-])|\b(?:now|after)(?=[\s,;!?]|$)/iu
  function qualifies(text: string) {
    // "Before you returned" is the current interval's endpoint, not its start.
    // Preserve a clearly earlier return ("last time you returned").
    const normalized = scope === 'explicitly-before-interval'
      ? text.replace(/在?你(?:回来|返回|发(?:这(?:条|则))?消息|问我?(?:这(?:个|些))?(?:问题)?)之?前|\bbefore\s+(?:you\s+(?:returned|came back|asked(?: me)?|messaged(?: me)?)|(?:your|this)(?: latest| new)?\s+(?:message|question))\b/giu, (phrase, offset: number) => /(?:上次|那次|昨天|last time)\s*$/iu.test(text.slice(Math.max(0, offset - 16), offset)) ? phrase : '')
      : text
    return qualifier.test(normalized)
  }
  if (qualifies(quote))
    return true
  const occurrences = [...draft.matchAll(new RegExp(quote.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'gu'))]
  return occurrences.length > 0 && occurrences.every((match) => {
    const index = match.index!
    // Keep comma-linked time introductions; periods inside paths are data.
    const boundaries = [...draft.matchAll(/[。！？!?\n]|\.(?=\s|$)/gu)]
    const start = boundaries.filter(boundary => boundary.index! < index).at(-1)?.index
    const end = boundaries.find(boundary => boundary.index! >= index + quote.length - 1)?.index ?? draft.length
    return qualifies(draft.slice(start === undefined ? 0 : start + 1, end))
  })
}

export function completedLifeExecutionStep(effect: LifeEffect) {
  if (effect.kind !== 'execute' || effect.status !== 'settled' || !['success', 'completed'].includes(String(effect.receipt?.outcome)))
    return false
  const output = effect.receipt?.output
  if (!output || typeof output !== 'object' || Array.isArray(output))
    return false
  const result = output as Record<string, unknown>
  // A successful RPC can merely propose a task. Only its adapter terminal
  // result certifies an execution step, never the higher-level user goal.
  return result.ok === true && result.finalStatus === 'completed'
}

export function currentLifeStoredMemory(fact: LifeFactVersion, now: number) {
  return fact.lifecycle === 'active' && fact.recordedTo == null && !['imagined', 'fictional'].includes(fact.provenance)
    && (fact.validFrom == null || fact.validFrom <= now) && (fact.validTo == null || fact.validTo > now)
}
