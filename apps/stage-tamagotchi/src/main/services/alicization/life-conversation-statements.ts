import { createHash } from 'node:crypto'

export interface LifeConversationStatement {
  binding: { kind: 'dialogue', id: string, version: string }
  speaker: 'host' | 'companion'
  text: string
  occurredAt: number
}

export async function readPresentedConversationStatements(ports: { turns: () => Promise<Array<{ turnId: string | null, assistantText: string | null, structuredJson: string | null, createdAt: number }>>, presented: (ids: string[]) => Promise<ReadonlySet<string>> }) {
  const turns = await ports.turns()
  const presented = await ports.presented(turns.flatMap(turn => turn.turnId ? [turn.turnId] : []))
  return turns.flatMap((turn) => {
    if (!turn.turnId || !turn.assistantText || !presented.has(turn.turnId))
      return []
    try {
      const structured = JSON.parse(turn.structuredJson ?? '{}') as Record<string, unknown>
      return structured.format === 'mind-turn-v1' && structured.visibleReplyAuthority === 'llm-mind' && structured.reply === turn.assistantText && !structured.contractFailed
        ? [{ turnId: turn.turnId, text: turn.assistantText, occurredAt: turn.createdAt }]
        : []
    }
    catch { return [] }
  })
}

export function companionStatement(turn: { turnId: string, text: string, occurredAt: number }): LifeConversationStatement {
  return { binding: { kind: 'dialogue', id: `dialogue:${turn.turnId}`, version: createHash('sha256').update(turn.text).digest('hex') }, speaker: 'companion', text: turn.text.slice(0, 1600), occurredAt: turn.occurredAt }
}

/** A statement proves attributed speech, never the truth of a quoted task result. */
export function attributesConversationStatement(draft: string, quote: string, speaker: 'host' | 'companion') {
  const position = draft.indexOf(quote)
  if (position < 0)
    return false
  if (/^(?:现在|明天|随后|以后|下次)?我(?:明天|后天|稍后|随后|下次|一会儿|以后)?(?:会|将|打算|准备|保证|承诺)|\b(?:i will|i promise|i intend)\b/iu.test(quote))
    return false
  // "让我实际写入" is a request object; "我实际写入" is an execution assertion.
  if (/(?<![让请求望令])我(?:也|已经|确实|实际|就|终于|真的|刚才)?(?:完成|执行|写入|保存|读取|删除|取消|支付|上传|下载)|我(?:把|将)[^。；;\n]{0,60}(?:写入|保存|删除|完成)/u.test(quote))
    return false
  const hostAttribution = /你[^。；;\n]{0,60}?(?:让我|要求我|请我|希望我|允许我|问|告诉我|说)|\byou\b[^.!?;\n]{0,60}?\b(?:asked|requested|said|told)\b/iu
  const companionAttribution = /我[^。；;\n]{0,40}?(?:告诉|说|提到|回答|回复|解释|讲过|选了|选择了)|\bi\b[^.!?;\n]{0,40}?\b(?:said|told|answered|replied|explained)\b/iu
  if ((speaker === 'host' ? hostAttribution : companionAttribution).test(quote))
    return true
  const prefix = draft.slice(0, position).split(/[。！？!?\n]/u).at(-1)?.slice(-240) ?? ''
  const prior = speaker === 'host' ? hostAttribution.test(prefix) : companionAttribution.test(prefix)
  if (!prior)
    return false
  // Inherit a speaker for omitted reporting verbs or a reported question's
  // object; an independent status such as "读取失败" is not reported speech.
  const omittedReport = speaker === 'host'
    ? /^(?:(?:接着|随后|后来|然后|[又还也并而])(?:[又还也]|明确|特意)?)*(?:让我|要求我|请我|希望我|允许我|告诉我|说)/u
    : /^(?:(?:接着|随后|后来|然后|[又还也并而])[又还也]?)*(?:说|提到|回答|回复|解释|告诉)/u
  return omittedReport.test(quote) || /(?:说|问我|告诉我|回答|回复)[，,:：\s]*$/u.test(prefix)
}

/** Current affect is expressed now; it is not an assertion of a prior utterance. */
export function isCurrentConversationReflection(draft: string, quote: string) {
  if (/我(?:明天|后天|稍后|随后|下次|一会儿|以后)?(?:会|将|打算|准备|保证|承诺)|\b(?:i will|i promise|i intend)\b/iu.test(quote))
    return false
  if (/文件|路径|目录|不存在|执行|完成|保存|写入|删除|支付|上传|发送|永久|记住|记忆|承诺|保证|\b(?:file|saved|executed|deleted|sent|uploaded|remembered|promise)\b/iu.test(quote))
    return false
  if (attributesConversationStatement(draft, quote, 'host') || attributesConversationStatement(draft, quote, 'companion'))
    return false
  const position = draft.indexOf(quote)
  if (position < 0)
    return false
  const sentence = draft.slice(0, position).split(/[。！？!?；;\n]/u).at(-1) ?? ''
  return /我[^。；;\n]{0,12}(?:觉得|感到|感觉|感受|意识到|更愿意|更踏实|更坦然)|(?:这|两件事|这个想法)[^。；;\n]{0,16}让我|有一点变化|但不是突然变得更亲近或疏远/u.test(`${sentence}${quote}`)
}
