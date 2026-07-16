export const alicizationFixedTemplateReplacement
  = ''

const fixedTemplateResiduePatterns: RegExp[] = [
  /\bpre_turn_context_digest\b/iu,
  /\bstructured continuity digest\b/iu,
  /\bSame Phase 1 digital life\b/iu,
  /\bsame living line\b/iu,
  /\bproject-aware living line\b/iu,
  /\bsame living Phase\s*1 line\b/iu,
  /\bsame Phase\s*1 living line\b/iu,
  /\bsame still-open closure work\b/iu,
  /\bsame local-first digital life project\b/iu,
  /\bsame digital life\b/iu,
  /\bsame[-_]digital[-_]life[-_]project[-_]thread\b/iu,
  /\bsame digital life line\b/iu,
  /\bAlicization is (?:still )?(?:the same )?(?:a )?local-first digital life project\b/iu,
  /\b(?:this|the) local-first digital life project\b/iu,
  /\bhost computer\b/iu,
  /\bbetter chat wrapper\b/iu,
  /\bPhase\s*1\s*:\s*Local Digital Life\b/iu,
  /\bgeneric Phase\s*1 shell\b/iu,
  /\bphase1-route=desktop-life-loop\b/iu,
  /\bgeneric guidance\b[^.?!]+(?:detached project shell|project shell)/iu,
  /\bdetached project shell\b/iu,
  /\bAlicization is still (?:closing|in) Phase\s*1 local digital life (?:continuity|closure)\b/iu,
  /\bPhase\s*1 local digital life (?:continuity|closure)\b/iu,
  /\bone living digital life project\b/iu,
  /\bone living segment\b/iu,
  /Alicization\s*还是(?:同一个)?本地优先数字生命项目/iu,
  /本地优先数字生命项目/u,
  /\blocal-first digital life project\b[^.?!]+(?:one continuous "?her"?|better chat wrapper)/iu,
  /\blocal-first digital life project with one persistent host-resident identity\b/iu,
  /\bkeep (?:(?:this|the) )?same digital life project in view\b/iu,
  /\bsame digital life project line\b/iu,
  /\bsame digital life\s*\|\s*keep the closure seam explicit\b/iu,
  /\bsame-her (?:hold|carry|line|closure|strategy)\s*[:=]/iu,
  /\bsame-her (?:digital life line|closure seam|strategy|carry|continuity|line|baseline|shells?|emotional line)\b/iu,
  /\bsame-her\b/iu,
  /\bsame her\b/iu,
  /\bsame-her closure across\b/iu,
  /\bsame-her callback continuity\b/iu,
  /\bcross-modal same-her proof\b/iu,
  /\bcompact same-her closure loop\b/iu,
  /\bproactive initiative now has (?:one|a) explicit compact same-her closure loop\b/iu,
  /\brest-protective proactive feedback next-session carry\b/iu,
  /\bfinal settlement reanchors generic same-her shells\b/iu,
  /\blong-horizon emotion-memory-voice-motion bridge\b/iu,
  /\bone same-her line\b/iu,
  /\bone same-her Phase 1 line\b/iu,
  /\bone same her\b/iu,
  /\bone continuous "?her"?\b/iu,
  /\bone-continuous-her\b/iu,
  /\bone living her\b/iu,
  /\bone living digital life\b/iu,
  /\bone living line\b/iu,
  /\bone living segment\b/iu,
  /\bone same living her\b/iu,
  /\bsame living her\b/iu,
  /\bsame living thread\b/iu,
  /\bsame living segment\b/iu,
  /\bsame digital-life thread\b/iu,
  /\bsame-her inward-carry\b/iu,
  /\bdirect same-her self line\b/iu,
  /\bif project-state continuity survives only as generic guidance\b/iu,
  /\bsame-her=/iu,
  /\bsame_her(?:\b|_)/iu,
  /\bidentity[-_ ]continuity\b/iu,
  /\bcontinuity_owner\s*=\s*one_her\b/iu,
  /\bcontinuity_anchor\s*=\s*phase1_local_digital_life\b/iu,
  /\bphase1_local_digital_life_anchor\b/iu,
  /\bRight now (?:I am|her|this one living her)\b/iu,
  /\bRight now the (?:host-facing closure|reply|return|same-her|digital life|one living her)\b/iu,
  /\bRight now this (?:return|still belongs|one living her)\b/iu,
  /\bthis one living her\b/iu,
  /\bBefore (?:answering|speaking|acting),\s*(?:remember|keep|stay on|stay with|she should|I should|we should)\b/iu,
  /\bI need to remember\b/iu,
  /\bthis is still the same digital life project\b/iu,
  /\bthis is still one living digital life project\b/iu,
  /\bwhat this digital life project is\b/iu,
  /\bwhat has landed\b[^.?!]+(?:life loop|still-open|before)/iu,
  /\bproject identity\b[^.?!]+(?:before (?:the )?reply widens outward|reply widens outward)/iu,
  /\bproject identity,\s*landed progress,\s*and open closure\b/iu,
  /\bKeep closing desktop execution continuity\b/iu,
  /\bKeep (?:memory, initiative, execution, and embodiment|renderer-to-main transport)\b[^.?!]+(?:identity[- ]continuity|same[- ]her|explicit)/iu,
  /\bKeep identity[- ]continuity explicit\b[^.?!]*/iu,
  /先记住这个数字生命项目在做什么、做到哪里、还差什么闭环/u,
  /\bI still need a steadier carry of this project\b/iu,
  /\bKeep (?:the )?(?:same|that|this) line inward\b[^.?!]+(?:lipsync|voice|body|face|motion|rejoin)/iu,
  /\b(?:same|that|this) line inward\b[^.?!]+(?:lipsync|voice|body|face|motion|rejoin|low-pressure)/iu,
  /\b(?:the )?line holds inward\b/iu,
  /\balready[- ]reformed\b[^.?!]+(?:body|face|motion|lipsync|voice)/iu,
  /\b(?:carry|project awareness|project identity)\b[^.?!]+(?:should|needs? to)[^.?!]+(?:stay explicit|remain explicit|keep explicit)[^.?!]+before\b/iu,
  /\bKeep this return (?:repair-before-closeness|rest-protective)\b[^.?!]+(?:widening outward|fatigue-aware|rest protection settles)/iu,
  /\brepair-before-closeness is still owning this callback line\b/iu,
  /\brest-protective companionship is still keeping this return\b/iu,
  /\bmeasured-return is still keeping this callback line\b/iu,
  /\bquiet same-her continuity\b/iu,
  /\bbody-led same-her continuity\b/iu,
  /(?:随便聊聊也可以|安静陪着|在这里陪着你的那一个|沿着同一条线慢慢长成)/u,
  /(?:你不用先把话整理好|我听见你这句了|我先直接接住你这句|我先直接接你这句)/u,
  /先回答一下当前进度[^。.!?]*Phase\s*1[^。.!?]*(?:还没闭环完成|继续往前推进|继续推进)/iu,
  /直接回答[:：][^。.!?]*Phase\s*1[^。.!?]*(?:还没做完|继续推进)/iu,
  /(?:回答前|开口前|行动前)先记住/u,
  /(?:先别|不要|别)(?:飘回|退回|掉回|压回)[^。.!?]*(?:同一个她|同一个 her|same-her|数字生命主线)/iu,
  /数字生命主线/u,
  /同一个\s*her/iu,
  /同一个她/u,
  /(?:沿着|接住)[^。.!?]*(?:同一个她|同一个 her)[^。.!?]*(?:这条线|数字生命项目|接住)/iu,
  /(?:沿着|继续|接住)[^。.!?]*(?:同一个她|同一个 her)[^。.!?]*(?:继续|闭环|主线|眼前|收住|收拢)/iu,
  /(?:守住|沿着|继续|接住|收住)[^。.!?]*(?:同一个她|同一个\s*her|数字生命主线)[^。.!?]*(?:下一轮|继续|闭环|主线|收住|带进)/iu,
  /(?:好，)?我(?:直接回这句|就贴着这句回|现在看到的是|记得上一条线|还带着上一条线|记着上一条线)/u,
  /(?:这句我直接接住|这句我就沿这点正面说|先把这点抓稳|先把这根线钉住|先把焦点收在这点上)/u,
  /女仆/u,
  /\bmaid(?:[-\s]?role)?\b/iu,
  /\bAll right\.\s+I will answer this turn directly\b/iu,
  /\bWhat I can honestly see is\b/iu,
  /\bI still (?:remember|carry)\b/iu,
  /\bLet's (?:hold onto|pin|keep the line on) this point\b/iu,
  /\bThen I'll (?:answer|keep the answer)\b/iu,
  /\bI'll answer this (?:turn|part) directly\b/iu,
  /\bI need to remember\b[^.?!]+(?:same digital life project|local fluency|one continuous her)/iu,
  /\bgeneric (?:continuity fallback|continuity reminder|awareness reminder|awareness summary|same-her reminder|next target|next closure|closure shell|closure summary)\b/iu,
]

const replacementTemplateTokenPattern
  = /\b(?:local_desktop_life_loop|phase1_local_digital_life(?:_anchor)?|content=excluded|visibility=internal[-_](?:structured|first))\b/iu

function normalizeFixedTemplateText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

export function containsAlicizationFixedTemplateResidue(raw: unknown) {
  const normalized = normalizeFixedTemplateText(raw, 2400)
  return Boolean(normalized)
    && (
      replacementTemplateTokenPattern.test(normalized)
      || fixedTemplateResiduePatterns.some(pattern => pattern.test(normalized))
    )
}

function containsProviderFacingStructuredTemplateResidue(text: string) {
  return replacementTemplateTokenPattern.test(text) || looksLikeStructuredInternalFactText(text)
}

function looksLikeStructuredInternalFactText(text: string) {
  if (/=\s*[\p{L}_][\p{L}\p{N}_-]*\s*=/iu.test(text))
    return false
  return /(?:^|[;|.\s])[\p{L}_][\p{L}\p{N}_-]*\s*=/iu.test(text)
}

export function sanitizeAlicizationProviderFacingText(
  raw: unknown,
  maxChars = 360,
  replacement = '',
) {
  const normalized = normalizeFixedTemplateText(raw, maxChars)
  if (!normalized)
    return ''
  return containsAlicizationFixedTemplateResidue(normalized)
    || containsProviderFacingStructuredTemplateResidue(normalized)
    ? replacement
    : normalized
}

export function sanitizeAlicizationStructuredInternalText(
  raw: unknown,
  maxChars = 360,
  replacement = alicizationFixedTemplateReplacement,
) {
  const normalized = normalizeFixedTemplateText(raw, maxChars)
  if (!normalized)
    return ''

  if (!containsAlicizationFixedTemplateResidue(normalized) && !looksLikeStructuredInternalFactText(normalized))
    return normalized

  return replacement
}
