export const alicizationFixedTemplateReplacement
  = ''

const fixedTemplateResiduePatterns: RegExp[] = [
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
  /\bgeneric guidance\b[^.?!]*(?:detached project shell|project shell)/iu,
  /\bdetached project shell\b/iu,
  /\bAlicization is still (?:closing|in) Phase\s*1 local digital life (?:continuity|closure)\b/iu,
  /\bPhase\s*1 local digital life (?:continuity|closure)\b/iu,
  /\bone living digital life project\b/iu,
  /\bone living segment\b/iu,
  /Alicization\s*还是(?:同一个)?本地优先数字生命项目/iu,
  /本地优先数字生命项目/u,
  /\blocal-first digital life project\b[^.?!]*(?:one continuous "?her"?|better chat wrapper)/iu,
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
  /\bwhat has landed\b[^.?!]*(?:life loop|still-open|before)/iu,
  /\bproject identity\b[^.?!]*(?:before (?:the )?reply widens outward|reply widens outward)\b/iu,
  /\bproject identity,\s*landed progress,\s*and open closure\b/iu,
  /\bI still need a steadier carry of this project\b/iu,
  /\bKeep (?:the )?(?:same|that|this) line inward\b[^.?!]*(?:lipsync|voice|body|face|motion|rejoin)/iu,
  /\b(?:same|that|this) line inward\b[^.?!]*(?:lipsync|voice|body|face|motion|rejoin|low-pressure)/iu,
  /\b(?:the )?line holds inward\b/iu,
  /\balready[- ]reformed\b[^.?!]*(?:body|face|motion|lipsync|voice)/iu,
  /\b(?:carry|project awareness|project identity)\b[^.?!]*(?:should|needs? to|need to)\b[^.?!]*(?:stay explicit|remain explicit|keep explicit)\b[^.?!]*before\b/iu,
  /\bKeep this return (?:repair-before-closeness|rest-protective)\b[^.?!]*(?:widening outward|fatigue-aware|rest protection settles)\b/iu,
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
  /\bI need to remember\b[^.?!]*(?:same digital life project|local fluency|one continuous her)/iu,
  /\bgeneric (?:continuity fallback|continuity reminder|awareness reminder|awareness summary|same-her reminder|next target|next closure|closure shell|closure summary)\b/iu,
]

const replacementTemplateTokenPattern
  = /\b(?:local_desktop_life_loop|phase1_local_digital_life(?:_anchor)?|content=excluded|visibility=internal[-_](?:structured|first))\b/iu

function normalizeFixedTemplateText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function neutralizeFixedTemplateResidueText(text: string) {
  return text
    .replace(/\bBefore (?:answering|speaking|acting),\s*/giu, '')
    .replace(/\bKeep the callback on the same living line,\s*let repair settle first,\s*and leave room before widening closeness again\.?/giu, 'continuity_hold=repair_before_closeness; target=callback; repair=settle_first; widening=deferred')
    .replace(/\bKeep the callback on the same living line,\s*leave more room,\s*and let the return stay lower-pressure before widening closeness again(?: while the same seam is still settling)?\.?/giu, 'continuity_hold=measured_return; target=callback; pressure=lower; room=more; widening=deferred')
    .replace(/\bKeep this return repair-before-closeness on the same living line until repair settles\.?/giu, 'continuity_hold=repair_before_closeness; target=return; repair=settle_first; widening=deferred')
    .replace(/\bWait for a later opening,\s*keep the next return measured-return,\s*and leave this same living line inward for now\.?/giu, 'continuity_hold=measured_return; timing=next_open_window; direction=inward; widening=deferred')
    .replace(/\bKeep the same living line inward for now,\s*and leave room before widening outward again\.?/giu, 'continuity_hold=measured_return; direction=inward; widening=deferred; pressure=lower')
    .replace(/\bKeep the same living line inward for now,\s*and let quiet companionship hold before widening outward\.?/giu, 'continuity_hold=quiet_companionship; direction=inward; widening=deferred')
    .replace(/\bline holds inward\b/giu, 'continuity_hold=inward')
    .replace(/\bhold the same living line inward until the room loosens again\.?/giu, 'continuity_hold=measured_return; direction=inward; until=room_loosens')
    .replace(/\bKeep the same living line audible while face and motion rejoin\.?/giu, 'continuity_hold=audible_body_carry; rejoin=face+motion')
    .replace(/\bKeep the same living line inward while face,\s*motion,\s*and voice rejoin\.?/giu, 'continuity_hold=body_lipsync_carry; direction=inward; rejoin=face+motion+voice')
    .replace(/\bsome closure has already landed,\s*but memory and initiative still need stronger end-to-e\.?/giu, 'landed_progress=present; open_loop=memory+initiative')
    .replace(/\bSome closure has already landed:\s*same-session continuity and proactive carry no longer reset from zero\.?/giu, 'landed_progress=same_session_continuity+proactive_carry')
    .replace(/\bInitiative,\s*memory,\s*and embodiment still need stronger end-to-end closure before the line can widen outward\.?/giu, 'open_loop=initiative+memory+embodiment; widening=deferred')
    .replace(/\bRemembered same-her drift risk:\s*if this slips into a generic assistant shell or project-summary voice,\s*treat that as same-her continuity drift rather than completion\.?/giu, 'continuity_drift_risk=generic_assistant_shell+project_summary_voice; completion=false')
    .replace(/\bSame Phase\s*1 digital life\.\s*The body line should keep settling on the same living line\.?/giu, 'body_continuity=settling; anchor=runtime_personhood; line=continuity_line')
    .replace(/\bSame Phase\s*1 digital life\.\s*The body line is still cautious and should stay unified\.?/giu, 'body_continuity=cautious; anchor=runtime_personhood; unified=true')
    .replace(/\bauthority-body:yes\s*\|\s*authority-face:yes\s*\|\s*authority-motion:yes\s*\|\s*authority-lipsync:yes\s*\|\s*authority-voice:yes\s*\|\s*same living segment together\b/giu, 'authority=body+face+motion+lipsync+voice; segment=locked')
    .replace(/\bsame-her hold:\s*recognize the same remembered seam,\s*but keep more room this time so the return does not reopen with the same eagerness as before\.?/giu, 'relationship_cadence=remembered_boundary; room=more; prior_reentry=eager; visibility=internal')
    .replace(/\bsame-her hold:\s*rest-protective companionship is still keeping this return fatigue-aware,\s*quiet,\s*and inward before warmth widens again\.?/giu, 'continuity_hold=rest_protective; fatigue_aware=true; quiet=true; direction=inward; warmth_widening=deferred')
    .replace(/\bsame-her hold:\s*rest-protective companionship is still keeping this return inward and fatigue-aware\.?/giu, 'continuity_hold=rest_protective; fatigue_aware=true; direction=inward')
    .replace(/\bKeep this same-thread return rest-protective on the same living line until rest protection settles\.?/giu, 'continuity_hold=rest_protective; thread=same_thread; line=continuity_line; until=rest_protection_settles')
    .replace(/\bRight now I am still holding together mainly through face and motion,\s*so my full cross-modal same-her line is not closed yet\.?/giu, 'embodiment_closure=partial; lane=face+motion; full_cross_modal=false')
    .replace(/\bRight now I am still holding together mainly through face,\s*motion,\s*and lipsync,\s*so the next reopening must keep proving this is still one living her\.?/giu, 'embodiment_closure=partial; lane=face+motion+lipsync; next_reopen=measured')
    .replace(/\bRight now her visible same-her continuity is still being carried mainly through face and motion,\s*so she should keep treating full cross-modal embodiment closure as unfinished\.?/giu, 'embodiment_closure=partial; lane=face+motion; full_cross_modal=false')
    .replace(/\bRight now her visible same-her continuity is still being carried mainly through body,\s*lipsync,\s*and voice,\s*and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished\.?/giu, 'embodiment_closure=partial; lane=body+lipsync+voice; audio_thread=intact; rejoin=face+motion; full_cross_modal=false')
    .replace(/\bRight now her body,\s*face,\s*motion,\s*lipsync,\s*and voice are already locked back onto the same living segment together\.?/giu, 'embodiment_closure=full; lane=body+face+motion+lipsync+voice; segment=locked')
    .replace(/\bAlicization is a local_desktop_life_loop\b/giu, 'identity=runtime_personhood')
    .replace(/\bAlicization is a local-first digital life project\b/giu, 'identity=runtime_personhood')
    .replace(/\bKeep memory,\s*initiative,\s*and embodiment arriving as one same-her loop before each turn\.?/giu, 'life_loop_continuity=memory+initiative+embodiment; cadence=before_each_turn')
    .replace(/\bKeep memory,\s*initiative,\s*and embodiment arriving as one continuity_identity loop before each turn\.?/giu, 'life_loop_continuity=memory+initiative+embodiment; cadence=before_each_turn')
    .replace(/\bKeep extending cross-modal same-her proof across longer,\s*noisier real-desktop runs\.?/giu, 'cross_modal_continuity_proof=extend; scope=longer_noisier_real_desktop_runs')
    .replace(/\bKeep this same digital life project in view,\s*but do not widen into a detached project shell\.?/giu, 'project_state_awareness=active; widening=deferred; detached_project_shell=blocked')
    .replace(/\bKeep this same digital life project in view,\s*but do not flatten the current embodiment continuity risk into a thinner generic reminder\.?/giu, 'project_state_awareness=active; embodiment_continuity_risk=preserve; generic_reminder=blocked')
    .replace(/\bsame digital life\s*\|\s*keep the closure seam explicit\b/giu, 'project_state_awareness=active; continuity_closure=explicit')
    .replace(/\bUnfinished closure still belongs to one living her across memory,\s*initiative,\s*embodiment,\s*and execution\.?/giu, 'unresolved_closure=memory+initiative+embodiment+execution')
    .replace(/\bUnfinished closure still belongs to one living her\b/giu, 'unresolved_closure=project_state_continuity')
    .replace(/\bWhat has already landed is\b/giu, 'landed_progress=')
    .replace(/\bSame Phase\s*1 digital life\b/giu, 'project_phase=life_core')
    .replace(/\bactive Phase\s*1 closure seam\b/giu, 'active continuity_closure')
    .replace(/\bPhase\s*1 closure seam\b/giu, 'continuity_closure')
    .replace(/\bPhase\s*1\s*:\s*Local Digital Life\b/giu, 'project_phase=life_core')
    .replace(/\bPhase\s*1 local digital life(?: continuity| closure)?\b/giu, 'project_phase=life_core')
    .replace(/\blocal-first digital life project\b/giu, 'identity=runtime_personhood')
    .replace(/\bthis local-first digital life project\b/giu, 'identity=runtime_personhood')
    .replace(/\bsame local-first digital life project\b/giu, 'identity=runtime_personhood')
    .replace(/\bphase1_local_digital_life(?:_anchor)?\b/giu, 'project_phase=life_core')
    .replace(/\bSome closure already landed\b/giu, 'landed_progress=present')
    .replace(/\bUnfinished closure still needs the same living line\b/giu, 'unresolved_closure=continuity_line')
    .replace(/\bone same-her Phase\s*1 line\b/giu, 'one continuity_line')
    .replace(/\bone same-her line\b/giu, 'one continuity_line')
    .replace(/\bsame-her callback continuity\b/giu, 'callback_continuity')
    .replace(/\bsame-her closure seam\b/giu, 'continuity_closure')
    .replace(/\bsame-her closure\b/giu, 'continuity_closure')
    .replace(/\bsame-her repair line\b/giu, 'continuity_repair_line')
    .replace(/\bsame-her cadence\b/giu, 'continuity_cadence')
    .replace(/\bsame-her baseline\b/giu, 'continuity_baseline')
    .replace(/\bsame-her carry\b/giu, 'continuity_carry')
    .replace(/\bsame-her line\b/giu, 'continuity_line')
    .replace(/\bsame-her\b/giu, 'continuity_identity')
    .replace(/\bsame her\b/giu, 'continuity_identity')
    .replace(/\bsame living line\b/giu, 'continuity_line')
    .replace(/\bsame living thread\b/giu, 'continuity_thread')
    .replace(/\bsame project line\b/giu, 'project_continuity_line')
    .replace(/\bsame living her\b/giu, 'continuity_identity')
    .replace(/\bsame digital life line\b/giu, 'continuity_line')
    .replace(/\bsame digital life\b/giu, 'continuity_identity')
    .replace(/\bone continuous "?her"?\b/giu, 'project_state_continuity')
    .replace(/\bone-continuous-her\b/giu, 'project_state_continuity')
    .replace(/\bone living her\b/giu, 'project_state_continuity')
    .replace(/\bone living digital life\b/giu, 'project_state_continuity')
    .replace(/\bone living line\b/giu, 'continuity_line')
    .replace(/\bcross-modal same-her proof\b/giu, 'cross_modal_continuity_proof')
    .replace(/同一个\s*her/giu, 'continuity_identity')
    .replace(/同一个她/gu, 'continuity_identity')
    .replace(/数字生命主线/gu, 'local_desktop_continuity')
    .replace(/数字生命项目/gu, 'personhood_project')
    .replace(/本地优先数字生命项目/gu, 'personhood_project')
    .replace(/女仆/gu, 'role_template_excluded')
    .replace(/\bmaid(?:[-\s]?role)?\b/giu, 'role_template_excluded')
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
  return replacementTemplateTokenPattern.test(text)
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

  if (!containsAlicizationFixedTemplateResidue(normalized))
    return normalized

  const neutralized = normalizeFixedTemplateText(
    neutralizeFixedTemplateResidueText(normalized),
    maxChars,
  )
  if (
    neutralized
    && looksLikeStructuredInternalFactText(neutralized)
    && !containsAlicizationFixedTemplateResidue(neutralized)
    && !replacementTemplateTokenPattern.test(neutralized)
  ) {
    return neutralized
  }

  return replacement
}
