import { containsAlicizationFixedTemplateResidue } from './alicization-fixed-template-sanitizer'

function sanitizeProjectAwarenessText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const PROJECT_AWARENESS_RETURN_MAX_CHARS = 3200

function containsProjectAwarenessFixedTemplateResidue(raw: unknown) {
  const normalized = sanitizeProjectAwarenessText(raw, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  return Boolean(normalized) && (
    containsAlicizationFixedTemplateResidue(normalized)
    || /\b(?:continuity=embodiment(?::|=|\b)|pending-rejoin=|measured[-_]return|repair[-_]before[-_]closeness|rest[-_]protective|identity[-_]continuity|same[-_]her|phase\s*1|local[_ -]desktop[_ -]life[_ -]loop|opening[_ -]policy|relationship[_ -]cadence|redacted[_ -]internal|project[_ -]state(?:\s+(?:continuity|awareness|brief|cue|summary)|\s*[:=]))\b/iu.test(normalized)
    || /\bBefore (?:answering|speaking|acting)\b/iu.test(normalized)
  )
}

function looksLikeThinProjectAwarenessShell(text: string) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false
  if (/\b(?:detached project shell|detached project narration|project-summary voice|generic assistant|generic task shell|project shell)\b/i.test(normalized))
    return false

  return /\b(?:keep (?:(?:this|the) )?same digital life project in view|generic reminder|generic guidance|embodiment continuity risk)\b/i.test(normalized)
    || normalized === 'same digital life | keep the closure seam explicit'
    || normalized === 'same digital life | keep the desktop closure line explicit'
}

function carriesThinChinesePhaseOneShell(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  const carriesExplicitOpenLoopCue = /未闭环|没闭环|还没闭环|还差|收稳|收住|记忆|主动性|具身|执行|情绪|声音|表情|动作|唇型|open=|next=|same-her=|landed=|still-open/u.test(normalized)
  const carriesThinReminderShell
    = (
      /回答前先记住|先记住这是同一个她|先记住这是同一个 her/u.test(normalized)
      && normalized.includes('数字生命项目')
      && (/同一个她|同一个 her/u.test(normalized))
      && /别把这条线忘了|别把这条线弄丢/u.test(normalized)
    )

  return (
    /^开口前先记住：这还?是同一个/u.test(normalized)
    && normalized.includes('数字生命项目')
    && /phase 1|第一阶段|阶段一/u.test(normalized)
    && (/现在仍在|当前仍在|仍在 phase 1|仍在第一阶段|仍在阶段一|还在 phase 1|还在第一阶段|还在阶段一/u.test(normalized))
    && !carriesExplicitOpenLoopCue
  ) || (carriesThinReminderShell && !carriesExplicitOpenLoopCue)
}

function carriesStructuredEmbodimentContinuityProof(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  if (!normalized)
    return false

  return /(?:^|\|\s*)embodiment_lanes=(?:body|face|motion|lipsync|voice)(?:\+(?:body|face|motion|lipsync|voice))*/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line)/i.test(normalized)
    || /(?:same-segment\s+)?(?:face\+motion|face\+voice|motion\+voice|face\+lipsync\+voice|motion\+lipsync\+voice|body\+lipsync\+voice)\s+recovery@/i.test(normalized)
}

export function isAlicizationThinSamePhaseCarryLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('same phase 1 digital life.')
    && normalized.includes('same living line')
    && (
      normalized.includes('some closure already landed')
      || (
        normalized.includes('reopen')
        && (
          normalized.includes('generic shell')
          || normalized.includes('fresh shell')
        )
      )
    )
    && !normalized.includes('before speaking')
    && !normalized.includes('what has landed')
    && !normalized.includes('life loop is still open')
}

export function scoreAlicizationProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  const carriesFixedTemplateResidue = containsProjectAwarenessFixedTemplateResidue(normalized)
  if (carriesFixedTemplateResidue)
    score -= 8
  if (!carriesFixedTemplateResidue && /(?:^|\|\s*)(?:landed|open|next|status|summary|emotional_closure|embodiment_lanes|missing_lanes|pending_lanes|evidence|ref|trace|source)=/u.test(normalized))
    score += 3
  if (!carriesFixedTemplateResidue && /(?:^|\|\s*)(?:phase|landed|open|next|status)=|holding together mainly through|voice|face|motion|lipsync|具身|声音|表情|动作|唇型/u.test(normalized))
    score += 2
  if (carriesStructuredEmbodimentContinuityProof(normalized))
    score += 3
  if (/\blanded:|latest landed|already survives|already survive/u.test(normalized))
    score += 2
  if (/same thread|same line|continue|继续|沿着|别飘回|泛化助手|泛化工程|不要退回|不要压回/u.test(normalized))
    score += 2
  if (/keep the same digital life project in view|generic reminder|generic guidance|回答前先记住|先记住这是同一个她|先记住这是同一个 her|别把这条线忘了|别把这条线弄丢/u.test(normalized))
    score -= 2
  if (looksLikeThinProjectAwarenessShell(normalized) || carriesThinChinesePhaseOneShell(normalized))
    score -= 5
  return score
}

export function isAlicizationThinProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return true

  return containsProjectAwarenessFixedTemplateResidue(normalized)
    || /keep the same digital life project in view|generic reminder|generic guidance|same digital life \|\s*keep(?: the)?(?: desktop)? closure(?: seam| line)? explicit/u.test(normalized)
    || carriesThinChinesePhaseOneShell(normalized)
}

export function resolveAlicizationProjectPreDialogueAwarenessLine(input?: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return null

  const candidate = input as Record<string, unknown>
  const projectStates = [candidate.runtimeProjectState, candidate.fallbackProjectState]
  for (const projectState of projectStates) {
    if (!projectState || typeof projectState !== 'object' || Array.isArray(projectState))
      continue

    const awarenessLine = sanitizeProjectAwarenessText(
      (projectState as Record<string, unknown>).awarenessLine,
      PROJECT_AWARENESS_RETURN_MAX_CHARS,
    )
    if (!awarenessLine || containsProjectAwarenessFixedTemplateResidue(awarenessLine))
      continue

    return awarenessLine
  }

  return null
}
