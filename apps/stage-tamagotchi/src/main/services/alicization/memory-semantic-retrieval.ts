function sanitizeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).toLowerCase()
}

function uniqueList(values: string[], maxItems = values.length) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 96)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

const semanticConceptMatchers = [
  {
    concept: 'thread-continuity',
    pattern: /thread|seam|line|chain|continuity|carry|branch|knot|reconnect|return before branching|接回|接起来|那条线|那条链|收束|延续|同一条/u,
  },
  {
    concept: 'repair-fix',
    pattern: /repair|fix|patch|correct|recover|stabilize|mend|修|修复|补丁|改掉|修好|稳住|恢复|断掉|接回去|接回|接起来/u,
  },
  {
    concept: 'procedure-reuse',
    pattern: /same way|like before|prior way|reuse|handled before|how we did it|之前那样|按之前|以前怎么做|旧做法|收束方式/u,
  },
  {
    concept: 'runtime-tooling',
    pattern: /runtime|terminal|diff|cursor|cli|codex|claude|command|workflow|编辑器|终端|运行时/u,
  },
  {
    concept: 'relationship-shift',
    pattern: /relationship|bond|trust|distance|tone|different this time|why different|关系|信任|距离|语气|这次不一样/u,
  },
  {
    concept: 'boundary-space',
    pattern: /boundary|space|lighter|quiet|room|not too close|边界|空间|轻一点|留白|别太近/u,
  },
  {
    concept: 'care-fatigue',
    pattern: /late[- ]?night|drain|tired|fatigue|afterglow|rest|熬夜|累|疲惫|余温|休息/u,
  },
  {
    concept: 'execution-callback',
    pattern: /execution|proposal|result|callback|handoff|delivery|执行|提案|结果|回调|交付/u,
  },
]

function tokenizeLoose(text: string) {
  return uniqueList(text.match(/\p{Script=Han}{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? [])
}

function buildCharacterTrigrams(text: string) {
  const normalized = sanitizeText(text, 512).replace(/\s+/g, '')
  if (normalized.length < 3)
    return new Set(normalized ? [normalized] : [])
  const result = new Set<string>()
  for (let index = 0; index <= normalized.length - 3; index += 1)
    result.add(normalized.slice(index, index + 3))
  return result
}

function computeSetOverlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0)
    return 0
  let overlap = 0
  for (const item of left) {
    if (right.has(item))
      overlap += 1
  }
  return overlap / Math.max(left.size, right.size)
}

export function extractSemanticConcepts(...texts: Array<string | null | undefined>) {
  const haystack = sanitizeText(texts.filter(Boolean).join(' '), 1024)
  if (!haystack)
    return [] as string[]
  return semanticConceptMatchers
    .filter(item => item.pattern.test(haystack))
    .map(item => item.concept)
}

export function scoreSemanticRecall(input: {
  queryTexts: string[]
  candidateTexts: string[]
}) {
  const queryText = sanitizeText(input.queryTexts.join(' '), 1024)
  const candidateText = sanitizeText(input.candidateTexts.join(' '), 1024)
  if (!queryText || !candidateText)
    return 0

  const lexicalExact = candidateText.includes(queryText) || queryText.includes(candidateText) ? 1 : 0
  const tokenScore = computeSetOverlap(
    new Set(tokenizeLoose(queryText)),
    new Set(tokenizeLoose(candidateText)),
  )
  const trigramScore = computeSetOverlap(
    buildCharacterTrigrams(queryText),
    buildCharacterTrigrams(candidateText),
  )
  const conceptScore = computeSetOverlap(
    new Set(extractSemanticConcepts(queryText)),
    new Set(extractSemanticConcepts(candidateText)),
  )

  return clamp01(
    lexicalExact * 0.18
    + tokenScore * 0.22
    + trigramScore * 0.2
    + conceptScore * 0.4,
  )
}

export interface SemanticGraphNode {
  id: string
  primaryText: string
  semanticTexts: string[]
  groupKeys?: string[]
  neighborKeys?: string[]
}

export function scoreSemanticGraphWalk<T extends SemanticGraphNode>(input: {
  nodes: T[]
  queryTexts: string[]
  getId: (node: T) => string
}) {
  const directScoreById = new Map<string, number>()
  for (const node of input.nodes) {
    directScoreById.set(
      input.getId(node),
      scoreSemanticRecall({
        queryTexts: input.queryTexts,
        candidateTexts: [node.primaryText, ...node.semanticTexts],
      }),
    )
  }

  const graphBoostById = new Map<string, number>()
  for (const node of input.nodes) {
    const nodeId = input.getId(node)
    const nodeGroups = new Set(uniqueList(node.groupKeys ?? []))
    const nodeNeighbors = new Set(uniqueList(node.neighborKeys ?? []))
    let bestBoost = 0
    for (const candidate of input.nodes) {
      const candidateId = input.getId(candidate)
      if (candidateId === nodeId)
        continue
      const candidateGroups = new Set(uniqueList(candidate.groupKeys ?? []))
      const candidateNeighbors = new Set(uniqueList(candidate.neighborKeys ?? []))
      const sharedGroupScore = computeSetOverlap(nodeGroups, candidateGroups)
      const sharedNeighborScore = computeSetOverlap(nodeNeighbors, candidateNeighbors)
      const semanticBridge = scoreSemanticRecall({
        queryTexts: [node.primaryText, ...node.semanticTexts],
        candidateTexts: [candidate.primaryText, ...candidate.semanticTexts],
      })
      const edgeWeight = clamp01(sharedGroupScore * 0.44 + sharedNeighborScore * 0.32 + semanticBridge * 0.24)
      if (edgeWeight <= 0.08)
        continue
      const candidateDirect = directScoreById.get(candidateId) ?? 0
      bestBoost = Math.max(bestBoost, candidateDirect * edgeWeight)
    }
    graphBoostById.set(nodeId, clamp01(bestBoost))
  }

  return {
    directScoreById,
    graphBoostById,
  }
}
