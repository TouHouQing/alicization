import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { normalizeStageClosureVisibleText } from './stage-closure-visible-text'

const defaultHint = '可在开发诊断里查看回放基准与状态修正记录。'

const LEGACY_FIXED_PERSONA_TEXT_PATTERN
  = /\b(?:continuity state|identity[-_]continuity|measured[-_]return|one continuous her|one living her|opening[_ -]policy|phase\s*1|relationship[_ -]cadence|renderer continuity|repair[-_]before[-_]closeness|same[- ]her|same living line|still[- ]voiced)\b|Right now I am still holding together|同一个\s*her|同一个她|数字生命主线|我还需要|我还在/iu

export interface StageQuickReplyPreDialogueClosureSnapshot {
  status: 'closed' | 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  reasons: string[]
}

export interface StageQuickReplyPreDialogueAwarenessSnapshot {
  status: 'closed' | 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  awarenessLine?: string | null
  reasonPreview: string[]
}

export interface StageQuickReplyClosureDiagnosticEntry {
  visible: boolean
  label: string
  hint: string
  headline: string | null
  briefingHeadline: string | null
  nextClosureLine: string | null
  routeQuery: Record<string, string>
}

function sanitizeQuickReplyVisibleLine(line: string | null | undefined) {
  const normalized = normalizeStageClosureVisibleText(line)
  if (
    !normalized
    || LEGACY_FIXED_PERSONA_TEXT_PATTERN.test(normalized)
    || containsAlicizationFixedTemplateResidue(normalized)
  ) {
    return null
  }

  const providerFacingText = sanitizeAlicizationProviderFacingText(normalized, 720)
  return normalizeStageClosureVisibleText(providerFacingText)
}

function resolveFirstVisibleLine(candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const visibleLine = sanitizeQuickReplyVisibleLine(candidate)
    if (visibleLine)
      return visibleLine
  }

  return null
}

export function buildStageQuickReplyClosureDiagnosticEntry(
  snapshot: StageQuickReplyPreDialogueClosureSnapshot | null | undefined,
  awarenessSnapshot?: StageQuickReplyPreDialogueAwarenessSnapshot | null,
): StageQuickReplyClosureDiagnosticEntry {
  const status = typeof snapshot?.status === 'string'
    ? snapshot.status.trim().toLowerCase()
    : ''

  if (!snapshot || !status) {
    return {
      visible: false,
      label: '打开运行诊断',
      hint: defaultHint,
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {},
    }
  }

  const visible = status !== 'grounded' && status !== 'closed'
  const headline = resolveFirstVisibleLine([
    snapshot.companionHeadlineLine,
    awarenessSnapshot?.awarenessLine,
    awarenessSnapshot?.companionHeadlineLine,
    awarenessSnapshot?.companionBriefingLine,
    snapshot.summaryLine,
  ])
  const briefingHeadline = resolveFirstVisibleLine([
    snapshot.companionBriefingLine,
  ])
  const nextClosureLine = resolveFirstVisibleLine([
    snapshot.companionNextClosureLine,
  ])

  return {
    visible,
    label: visible ? '查看运行诊断' : '诊断正常',
    hint: defaultHint,
    headline,
    briefingHeadline: briefingHeadline === headline ? null : briefingHeadline,
    nextClosureLine,
    routeQuery: visible
      ? {
          source: 'quick-reply-closure',
          status,
          focus: 'project-state',
          eventFocus: 'takeover-audit',
        }
      : {},
  }
}
