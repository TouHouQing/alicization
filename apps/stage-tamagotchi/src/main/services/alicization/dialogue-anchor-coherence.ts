import type {
  AlicizationDialogueAnswerSubject,
  AlicizationMindTurnFrameSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueScreenReferenceMode } from './dialogue-focus-governor'

import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { isSceneThreadSubject, sanitizeDialogueAnchorText } from './dialogue-surface-text'

export type AlicizationDialogueAnchorRole
  = | 'scene'
    | 'focus'
    | 'visible-surface'
    | 'opening-claim'
    | 'answer-intent'
    | 'live-surface'
    | 'project'
    | 'thread'
    | 'question'
    | 'carry'

export interface AlicizationDialogueAnchorCandidate {
  role: AlicizationDialogueAnchorRole
  text?: string | null
}

export interface AlicizationDialogueAnchorCoherence {
  dominant: string | null
  dominantRole: AlicizationDialogueAnchorRole | null
  aligned: string[]
  conflicting: string[]
  sceneAuthority: boolean
  reasonTags: string[]
}

function normalizeComparisonText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractComparisonTerms(raw: unknown) {
  const normalized = normalizeComparisonText(raw)
  if (!normalized)
    return []

  return [...new Set(
    (normalized.match(/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [])
      .filter(segment => [...segment].length >= 2),
  )]
}

function mirrorsHostMove(candidate: unknown, hostMove: unknown) {
  const normalizedCandidate = normalizeComparisonText(candidate)
  const normalizedHostMove = normalizeComparisonText(hostMove)
  if (!normalizedCandidate || !normalizedHostMove)
    return false

  if (normalizedCandidate === normalizedHostMove)
    return true

  const shorterLength = Math.max(1, Math.min(normalizedCandidate.length, normalizedHostMove.length))
  if (
    (normalizedCandidate.includes(normalizedHostMove) || normalizedHostMove.includes(normalizedCandidate))
    && shorterLength / Math.max(normalizedCandidate.length, normalizedHostMove.length) >= 0.68
  ) {
    return true
  }

  const hostTerms = extractComparisonTerms(normalizedHostMove)
  const candidateTerms = extractComparisonTerms(normalizedCandidate)
  if (hostTerms.length === 0 || candidateTerms.length === 0)
    return false

  const overlap = candidateTerms.filter(term => hostTerms.includes(term))
  return overlap.length / Math.max(1, Math.min(hostTerms.length, candidateTerms.length)) >= 0.72
}

function isSameAnchor(left: string, right: string) {
  const normalizedLeft = normalizeComparisonText(left)
  const normalizedRight = normalizeComparisonText(right)
  if (!normalizedLeft || !normalizedRight)
    return false
  return normalizedLeft === normalizedRight
}

export function anchorsMateriallyAlign(left: unknown, right: unknown) {
  const normalizedLeft = sanitizeDialogueAnchorText(left, 220)
  const normalizedRight = sanitizeDialogueAnchorText(right, 220)
  if (!normalizedLeft || !normalizedRight)
    return false

  if (isSameAnchor(normalizedLeft, normalizedRight))
    return true

  const shorterLength = Math.max(1, Math.min(normalizedLeft.length, normalizedRight.length))
  if (
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    && shorterLength / Math.max(normalizedLeft.length, normalizedRight.length) >= 0.72
  ) {
    return true
  }

  const leftAlignment = measureDialogueFocusAlignment({
    message: normalizedLeft,
    contextPhrases: [normalizedRight],
  })
  const rightAlignment = measureDialogueFocusAlignment({
    message: normalizedRight,
    contextPhrases: [normalizedLeft],
  })

  return leftAlignment.overlapRatio >= 0.34
    || rightAlignment.overlapRatio >= 0.34
    || leftAlignment.overlapTerms.length >= 2
    || rightAlignment.overlapTerms.length >= 2
}

export function anchorsMateriallyConflict(left: unknown, right: unknown) {
  const normalizedLeft = sanitizeDialogueAnchorText(left, 220)
  const normalizedRight = sanitizeDialogueAnchorText(right, 220)
  if (!normalizedLeft || !normalizedRight)
    return false
  return !anchorsMateriallyAlign(normalizedLeft, normalizedRight)
}

function roleWeight(role: AlicizationDialogueAnchorRole) {
  switch (role) {
    case 'scene':
      return 1.28
    case 'focus':
      return 1.2
    case 'opening-claim':
      return 1.08
    case 'visible-surface':
      return 0.98
    case 'answer-intent':
      return 0.92
    case 'live-surface':
      return 0.84
    case 'project':
      return 0.66
    case 'thread':
      return 0.58
    case 'question':
      return 0.5
    case 'carry':
      return 0.36
    default:
      return 0.3
  }
}

function isScenePrivilegedRole(role: AlicizationDialogueAnchorRole) {
  return role === 'scene'
    || role === 'focus'
    || role === 'opening-claim'
    || role === 'visible-surface'
    || role === 'answer-intent'
    || role === 'live-surface'
}

function sceneAuthorityEnabled(input: {
  subject?: AlicizationDialogueAnswerSubject | null
  screenReferenceMode?: AlicizationDialogueScreenReferenceMode | null
  truthState?: AlicizationMindTurnFrameSnapshot['world']['truthState'] | null
  groundedThisTurn?: boolean
}) {
  if (!isSceneThreadSubject(input.subject))
    return false
  if (input.screenReferenceMode === 'avoid')
    return false
  return input.groundedThisTurn === true
    || input.truthState === 'live-grounded'
    || input.truthState === 'live-observed'
}

export function resolveDialogueAnchorCoherence(input: {
  subject?: AlicizationDialogueAnswerSubject | null
  screenReferenceMode?: AlicizationDialogueScreenReferenceMode | null
  truthState?: AlicizationMindTurnFrameSnapshot['world']['truthState'] | null
  groundedThisTurn?: boolean
  hostMove?: string | null
  candidates: AlicizationDialogueAnchorCandidate[]
}): AlicizationDialogueAnchorCoherence {
  const sceneAuthority = sceneAuthorityEnabled(input)
  const sanitizedCandidates = input.candidates
    .map((candidate, index) => ({
      role: candidate.role,
      text: sanitizeDialogueAnchorText(candidate.text, 220),
      index,
    }))
    .filter((candidate): candidate is { role: AlicizationDialogueAnchorRole, text: string, index: number } => Boolean(candidate.text))
    .filter((candidate, index, items) => items.findIndex(other => isSameAnchor(other.text, candidate.text)) === index)

  if (sanitizedCandidates.length === 0) {
    return {
      dominant: null,
      dominantRole: null,
      aligned: [],
      conflicting: [],
      sceneAuthority,
      reasonTags: sceneAuthority ? ['scene-authority-without-anchor'] : ['no-anchor'],
    }
  }

  const privilegedAnchor = sceneAuthority
    ? sanitizedCandidates.find(candidate => isScenePrivilegedRole(candidate.role)) ?? null
    : null

  const scoredCandidates = sanitizedCandidates.map((candidate) => {
    let score = roleWeight(candidate.role)
    if (mirrorsHostMove(candidate.text, input.hostMove))
      score -= 0.22

    if (sceneAuthority) {
      if (isScenePrivilegedRole(candidate.role))
        score += 0.34
      else
        score -= 0.18

      if (privilegedAnchor && candidate !== privilegedAnchor) {
        if (anchorsMateriallyAlign(candidate.text, privilegedAnchor.text))
          score += 0.12
        else
          score -= 0.42
      }
    }

    return {
      ...candidate,
      score,
    }
  })

  const dominantCandidate = (() => {
    const sorted = [...scoredCandidates].sort((left, right) => {
      if (right.score !== left.score)
        return right.score - left.score
      return left.index - right.index
    })
    const leading = sorted[0] ?? null
    if (!leading)
      return null

    if (
      sceneAuthority
      && privilegedAnchor
      && !isScenePrivilegedRole(leading.role)
      && anchorsMateriallyConflict(leading.text, privilegedAnchor.text)
    ) {
      return scoredCandidates.find(candidate => candidate.text === privilegedAnchor.text) ?? leading
    }

    return leading
  })()

  if (!dominantCandidate) {
    return {
      dominant: null,
      dominantRole: null,
      aligned: [],
      conflicting: [],
      sceneAuthority,
      reasonTags: sceneAuthority ? ['scene-authority-without-dominant-anchor'] : ['no-dominant-anchor'],
    }
  }

  const aligned = sanitizedCandidates
    .filter(candidate => candidate.text !== dominantCandidate.text && anchorsMateriallyAlign(candidate.text, dominantCandidate.text))
    .map(candidate => candidate.text)

  const conflicting = sanitizedCandidates
    .filter(candidate => candidate.text !== dominantCandidate.text && anchorsMateriallyConflict(candidate.text, dominantCandidate.text))
    .map(candidate => candidate.text)

  const reasonTags = [
    sceneAuthority ? 'scene-authority' : 'dialogue-authority',
    privilegedAnchor && dominantCandidate.text === privilegedAnchor.text ? 'scene-anchor-dominant' : '',
    conflicting.length > 0 ? 'anchor-conflict-detected' : 'anchor-coherent',
  ].filter(Boolean)

  return {
    dominant: dominantCandidate.text,
    dominantRole: dominantCandidate.role,
    aligned,
    conflicting,
    sceneAuthority,
    reasonTags,
  }
}
