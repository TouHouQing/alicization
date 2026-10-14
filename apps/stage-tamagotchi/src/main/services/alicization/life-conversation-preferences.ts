import type { LifeIngress, LifeStateView } from '../../../shared/life-contracts'

import * as v from 'valibot'

import { readLifeInputText } from './life-input-preview'

export const lifeRelationshipKey = 'life:relationship'
const preferenceSchema = v.strictObject({
  kind: v.picklist(['fewer-questions', 'no-unrequested-plans']),
  value: v.boolean(),
  cardId: v.string(),
  conversationId: v.nullable(v.string()),
  sourceId: v.string(),
  inputHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)),
  startedAt: v.number(),
  expiresAt: v.number(),
})
const preferencesSchema = v.pipe(v.array(preferenceSchema), v.maxLength(16))
type ConversationPreference = v.InferOutput<typeof preferenceSchema>

function relationshipSnapshot(value?: string): Record<string, unknown> {
  const snapshot: unknown = value ? JSON.parse(value) : null
  if (snapshot === null)
    return {}
  if (typeof snapshot !== 'object' || Array.isArray(snapshot))
    throw new TypeError('Relationship authority requires an object or null snapshot')
  return snapshot as Record<string, unknown>
}

function storedPreferences(value?: string) {
  let parsed: unknown = []
  try { parsed = relationshipSnapshot(value).conversationPreferences ?? [] }
  catch { return [] }
  const result = v.safeParse(preferencesSchema, parsed)
  return result.success ? result.output : []
}

/** Appraisal replaces its own projection, preserving independently sourced requirements. */
export function preserveLifeConversationPreferences(previous: string | undefined, next: Record<string, unknown> | null) {
  const preferences = storedPreferences(previous)
  return preferences.length ? { ...next, conversationPreferences: preferences } : next
}

function explicitPreferences(text: string) {
  const plain = text.replace(/```[\s\S]*?```|“[^”]*”|「[^」]*」|‘[^’]*’|"[^"\n]*"/gu, '')
  if (/文档|举例|示例|假设|假如|如果|记得我说|解释这|什么意思|\b(?:for example|hypothetically|document says|if|when|while|unless|remember i said)\b/iu.test(plain))
    return []
  const result: Array<{ kind: ConversationPreference['kind'], value: boolean, quote: string }> = []
  for (const clause of plain.split(/[，,。；;！？!?\n]/u)) {
    const quote = clause.trim().slice(0, 240)
    if (/没有说|没说|不是说|不是要|不是让|并非要求|\b(?:did not ask|never asked)\b/iu.test(quote))
      continue
    if (/(?:不用|不要|别|不希望|不喜欢|不想)[\s\S]{0,12}(?:每次|每句|总是)[\s\S]{0,12}(?:问|追问)|\b(?:fewer questions|do not always ask|don't always ask)\b/iu.test(quote))
      result.push({ kind: 'fewer-questions', value: true, quote })
    else if (/(?:可以|请|希望你)(?:再|主动|多|继续)[\s\S]{0,8}问我|(?:取消|撤回|忘记)[\s\S]{0,12}(?:少问|少追问)|\b(?:ask me more|withdraw fewer questions)\b/iu.test(quote))
      result.push({ kind: 'fewer-questions', value: false, quote })
    if (/(?:不用|不要|别)[\s\S]{0,8}(?:给我|帮我|替我|为我)[\s\S]{0,8}(?:安排|制定|规划)[\s\S]{0,8}(?:计划|日程)|\b(?:do not|don't)[\s\S]{0,12}(?:plan for me|make plans for me)\b/iu.test(quote))
      result.push({ kind: 'no-unrequested-plans', value: true, quote })
    else if (/(?:可以|请|希望你)主动[\s\S]{0,8}(?:给我|帮我)[\s\S]{0,8}(?:安排|制定)(?:计划|日程)/u.test(quote))
      result.push({ kind: 'no-unrequested-plans', value: false, quote })
  }
  return result
}

/** Current interaction requirements are relationship state, not permanent persona learning. */
export function conversationPreferenceChange(previous: string | undefined, input: { cardId: string, conversationId: string, sourceId: string, inputHash: string, message: Record<string, unknown>, now: number }) {
  const text = readLifeInputText(input.message).text ?? ''
  const instructions = explicitPreferences(text)
  if (!instructions.length)
    return null
  const today = /今天|\btoday\b/iu.test(text)
  const endOfDay = new Date(input.now)
  endOfDay.setHours(24, 0, 0, 0)
  let records = storedPreferences(previous).filter(item => item.expiresAt > input.now && item.cardId === input.cardId)
  for (const instruction of instructions) {
    records = records.filter(item => item.kind !== instruction.kind)
    records.push({ kind: instruction.kind, value: instruction.value, cardId: input.cardId, conversationId: today ? null : input.conversationId, sourceId: input.sourceId, inputHash: input.inputHash, startedAt: input.now, expiresAt: today ? endOfDay.getTime() : input.now + 24 * 60 * 60 * 1000 })
  }
  return { owner: 'relationship' as const, key: lifeRelationshipKey, value: JSON.stringify({ ...relationshipSnapshot(previous), conversationPreferences: records.slice(-16) }), expectedValue: previous ?? null }
}

export function discardLifeConversationPreferences(previous: string | undefined, sourceId: string) {
  const records = storedPreferences(previous)
  const retained = records.filter(item => item.sourceId !== sourceId)
  return retained.length === records.length ? null : { owner: 'relationship' as const, key: lifeRelationshipKey, value: JSON.stringify({ ...relationshipSnapshot(previous), conversationPreferences: retained }), expectedValue: previous ?? null }
}

export async function readLifeConversationPreferences(view: LifeStateView, ports: { getIngress: (id: string) => Promise<LifeIngress | null>, readUserInput: (id: string) => Promise<Record<string, unknown> | null> }, now: number, conversationId?: string) {
  const currentConversation = conversationId ?? view.ingress.find(item => item.kind === 'user-turn' && item.source === 'dialogue')?.payload.conversationId
  const candidates = storedPreferences(view.values[lifeRelationshipKey]).filter(item => item.cardId === view.cardId && item.startedAt <= now && item.expiresAt > now && (item.conversationId === null || item.conversationId === currentConversation))
  const active = await Promise.all(candidates.map(async (item) => {
    try {
      const source = await ports.getIngress(item.sourceId)
      // Model delivery failure does not revoke the human's admitted requirement.
      // Explicit discard removes its record; unavailable/withdrawn input drops it below.
      if (source?.kind !== 'user-turn' || source.source !== 'dialogue' || source.payload.inputHash !== item.inputHash)
        return null
      const message = await ports.readUserInput(item.sourceId)
      const instruction = explicitPreferences(readLifeInputText(message).text ?? '').find(rule => rule.kind === item.kind && rule.value === item.value)
      return instruction ? { ...item, quote: instruction.quote, sourceEvidence: [{ cardId: view.cardId, kind: 'life-user-input', id: item.sourceId, version: item.inputHash }] } : null
    }
    catch {
      // Withdrawn or corrupt historical input cannot authorize a current rule.
      // Source validation failure drops its effect rather than breaking new input.
      return null
    }
  }))
  return active.filter((item): item is NonNullable<typeof item> => item !== null)
}

export type LifeConversationPreference = Awaited<ReturnType<typeof readLifeConversationPreferences>>[number]

export function conversationPreferenceAllowsClaim(quote: string, preference: Pick<LifeConversationPreference, 'kind' | 'value'>) {
  if (/永久|永远|明天|后天|定时|每天|每晚|删除|写入|改写|保存|执行|运行|发邮件|上传|下载|付款|支付|提醒|\b(?:forever|permanently|tomorrow|every day|delete|write file|save file|execute|upload|download|pay|remind)\b/iu.test(quote))
    return false
  if (preference.kind === 'fewer-questions') {
    if (!preference.value && /少(?:问|追问)|fewer questions/iu.test(quote))
      return false
    return preference.value ? /少(?:问|追问)|不[^。；;\n]{0,12}(?:问|追问)|\b(?:fewer questions|not ask|won't ask)\b/iu.test(quote) : /问|追问|\b(?:ask|questions?)\b/iu.test(quote)
  }
  return /计划|日程|安排|\b(?:plans?|agenda)\b/iu.test(quote)
}
