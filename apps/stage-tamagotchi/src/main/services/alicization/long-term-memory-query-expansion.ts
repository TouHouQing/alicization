export interface LongTermMemoryQueryExpansion {
  normalizedQuery: string
  phraseQueries: string[]
  charGramQueries: string[]
  negativeCues: string[]
  entityHints: string[]
  temporalHints: string[]
  procedureHints: string[]
  confidencePolicy: 'direct' | 'tentative' | 'inward-only'
}

function normalizeText(raw: unknown, maxChars = 360) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 16, maxChars = 120) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function collectMatches(text: string, patterns: RegExp[], maxItems = 12) {
  const result: string[] = []
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    const globalPattern = new RegExp(pattern.source, flags)
    for (const match of text.matchAll(globalPattern)) {
      const value = normalizeText(match[1] ?? match[0], 120)
      if (!value || result.includes(value))
        continue
      result.push(value)
      if (result.length >= maxItems)
        return result
    }
  }
  return result
}

function collectCjkRuns(text: string) {
  return text.match(/[\u4E00-\u9FFF]{2,}/gu) ?? []
}

export function buildCjkCharGramQueries(text: string, options?: {
  minGram?: number
  maxGram?: number
  maxItems?: number
}) {
  const minGram = Math.max(2, Math.floor(options?.minGram ?? 2))
  const maxGram = Math.max(minGram, Math.floor(options?.maxGram ?? 4))
  const maxItems = Math.max(1, Math.floor(options?.maxItems ?? 24))
  const grams: string[] = []
  for (const run of collectCjkRuns(text)) {
    for (let size = Math.min(maxGram, run.length); size >= minGram; size--) {
      for (let index = 0; index + size <= run.length; index++) {
        grams.push(run.slice(index, index + size))
        if (grams.length >= maxItems)
          return uniqueTexts(grams, maxItems, maxGram)
      }
    }
  }
  return uniqueTexts(grams, maxItems, maxGram)
}

export function expandLongTermMemoryQuery(input: {
  rawQuery: string
  workingMemoryQueryHints?: string[]
}): LongTermMemoryQueryExpansion {
  const normalizedQuery = normalizeText(input.rawQuery, 600)
  const hints = uniqueTexts(input.workingMemoryQueryHints ?? [], 8, 120)
  const phraseQueries = uniqueTexts(hints, 16, 140)
  const negativeCues = uniqueTexts(collectMatches(normalizedQuery, [
    /不是([^，。！？,.!?]{2,24})/gu,
    /不要([^，。！？,.!?]{2,24})/gu,
    /不想要([^，。！？,.!?]{2,24})/gu,
  ]), 8, 120)
  const entityHints = uniqueTexts([
    /游戏|打游戏|开黑|联机|Minecraft|mc\b/iu.test(normalizedQuery) ? '游戏 共同游玩 Minecraft 联机' : '',
    /开发|代码|commit|编译|测试|文档/u.test(normalizedQuery) ? '开发任务 代码 文档 测试' : '',
  ], 8, 120)
  const temporalHints = uniqueTexts([
    /刚刚|刚才|当前|现在/u.test(normalizedQuery) ? '当前 刚刚 这轮' : '',
    /昨天|最近|上次|前几天/u.test(normalizedQuery) ? '最近 上次 昨天' : '',
    /上周|这周|上个月|前段时间/u.test(normalizedQuery) ? '上周 这周 前段时间' : '',
    /以前|之前|那次|还记得|记不记得/u.test(normalizedQuery) ? '以前 之前 那次 共同经历' : '',
  ], 6, 100)
  const procedureHints = uniqueTexts([
    /继续|接着|上次/u.test(normalizedQuery) ? '继续 上次任务 未完成事项' : '',
    /怎么做|步骤|流程|方案/u.test(normalizedQuery) ? '流程 步骤 方法' : '',
  ], 6, 100)
  const confidencePolicy = /也许|可能|好像|不确定|似乎/u.test(normalizedQuery)
    ? 'tentative'
    : /秘密|隐私|私下|别说出来/u.test(normalizedQuery)
      ? 'inward-only'
      : 'direct'

  return {
    normalizedQuery,
    phraseQueries,
    charGramQueries: buildCjkCharGramQueries([
      normalizedQuery,
      ...phraseQueries,
      ...hints,
    ].join(' ')),
    negativeCues,
    entityHints,
    temporalHints,
    procedureHints,
    confidencePolicy,
  }
}
