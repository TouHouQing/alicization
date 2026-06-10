export function scoreVisibleReplyProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  const carriesThinChineseProjectReminder
    = /^开口前先记住：这还?是同一个/u.test(normalized)
      && normalized.includes('数字生命项目')
      && /phase 1|第一阶段|阶段一/u.test(normalized)
      && /现在仍在|当前仍在|仍在 phase 1|仍在第一阶段|仍在阶段一|还在 phase 1|还在第一阶段|还在阶段一/u.test(normalized)
      && !/连续性|记忆|执行|主动性|具身|对话闭环|闭环|收住|还没闭环|还没有完全收住/u.test(normalized)

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (/same digital life|same-her|one living her|one living digital life|one continuous her|同一个她|同一个 her|本地优先数字生命项目|数字生命项目/u.test(normalized))
    score += 3
  if (/phase 1|local-first digital life|unfinished closure|still belongs to one living her|still belongs to one living digital life|holding together mainly through|voice|face|motion|lipsync|embodiment|第一阶段|本地数字生命|连续性|记忆|执行|主动性|具身|对话闭环|闭环|收住|还没闭环|还没有完全收住/u.test(normalized))
    score += 2
  if (/keep the same digital life project in view|generic reminder|generic guidance|回答前先记住|先记住这是同一个她|别把这条线忘了|别把这条线弄丢/u.test(normalized))
    score -= 2
  if (carriesThinChineseProjectReminder)
    score -= 2
  return score
}
