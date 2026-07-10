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
  const carriesFixedTemplateSlogan
    = /before (?:answering|speaking|acting)|same phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|phase 1:\s*local digital life|同一个她|同一个 her|数字生命主线/u.test(normalized)
  const carriesStructuredProjectFact
    = /(?:^|\s\|\s)(?:identity|phase|landed|open|next|continuity_anchor|continuity_hold|continuity_drift_risk|proactive_gap|emotional_closure|status|summary)=/u.test(normalized)
      || /local_desktop_life_loop|open_loop=|project_state_continuity=|life_loop_continuity=|cross_modal_continuity_proof=|memory_dialogue_embodiment_closure|embedding_recall_reindex/u.test(normalized)
  const carriesConcreteClosureProgress
    = /workingmemory|longtermmemoryrecall|semantic_recall|embedding|reindex|分页|搜索|召回|短期|长期|治理入口|review|memory_review|记忆闭环|语义召回|重建/u.test(normalized)

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (carriesStructuredProjectFact)
    score += 6
  if (carriesConcreteClosureProgress)
    score += 3
  if (!carriesFixedTemplateSlogan && /本地优先数字生命项目|数字生命项目/u.test(normalized))
    score += 3
  if (!carriesFixedTemplateSlogan && /本地数字生命|连续性|记忆|执行|主动性|具身|对话闭环|闭环|收住|还没闭环|还没有完全收住/u.test(normalized))
    score += 2
  if (!carriesFixedTemplateSlogan && /holding together mainly through|voice|face|motion|lipsync|embodiment/u.test(normalized))
    score += 2
  if (carriesFixedTemplateSlogan)
    score -= 6
  if (/keep the same digital life project in view|generic reminder|generic guidance|回答前先记住|先记住这是同一个她|别把这条线忘了|别把这条线弄丢/u.test(normalized))
    score -= 2
  if (carriesThinChineseProjectReminder)
    score -= 2
  return score
}
