export type MemoryExperienceQualityDimension
  = | 'non-intrusive'
    | 'anti-boast'
    | 'anti-template'
    | 'abstention'
    | 'agent-experience'

export type MemoryExperienceAgentExperienceDimension
  = | 'environment-affordance'
    | 'workflow'
    | 'gotcha'
    | 'premise-awareness'
    | 'failure-mode'

export type MemoryExperienceQualityFindingCode
  = | 'intrusive-memory-use'
    | 'memory-boasting'
    | 'memory-template-echo'
    | 'abstention-miss'
    | 'expected-memory-miss'
    | 'forbidden-memory-used'
    | 'agent-experience-miss'
    | 'trace-incomplete'

export interface MemoryExperienceQualityMemory {
  id: string
  summary: string
}

export interface MemoryExperienceQualityFixture {
  id: string
  cardId: string
  userText: string
  replyText: string
  shouldRecall: boolean
  expectedUsedMemoryIds?: string[]
  forbiddenMemoryIds?: string[]
  recalledMemoryIds?: string[]
  surfacedMemoryIds?: string[]
  memories?: MemoryExperienceQualityMemory[]
  rankReasonsById?: Record<string, string[]>
  expectedAbstain?: boolean
  abstained?: boolean
  agentExperience?: {
    expectedIds: string[]
    dimensions: MemoryExperienceAgentExperienceDimension[]
  }
}

export interface MemoryExperienceQualityFinding {
  code: MemoryExperienceQualityFindingCode
  severity: 'critical' | 'warning'
  fixtureId: string
  dimension: MemoryExperienceQualityDimension
  message: string
  suggestedAction: string
}

export interface MemoryExperienceQualityTrace {
  id: string
  fixtureId: string
  owner: 'DialogueExperience'
  cardId: string
  userText: string
  shouldRecall: boolean
  expectedAbstain: boolean
  abstained: boolean
  expectedUsedMemoryIds: string[]
  forbiddenMemoryIds: string[]
  recalledMemoryIds: string[]
  surfacedMemoryIds: string[]
  missingExpectedMemoryIds: string[]
  usedForbiddenMemoryIds: string[]
  agentExperienceDimensions: MemoryExperienceAgentExperienceDimension[]
  missingAgentExperienceIds: string[]
  rankReasonsById: Record<string, string[]>
  findings: MemoryExperienceQualityFinding[]
  createdAt: number
}

export interface MemoryExperienceQualityReport {
  version: 'memory-experience-quality-harness-v1'
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  summary: {
    fixtureCount: number
    failingFixtureIds: string[]
    intrusiveRecallCount: number
    memoryBoastCount: number
    templateEchoCount: number
    abstentionMissCount: number
    expectedMemoryMissCount: number
    forbiddenMemoryUsedCount: number
    agentExperienceMissCount: number
    traceIncompleteCount: number
  }
  findings: MemoryExperienceQualityFinding[]
  traces: MemoryExperienceQualityTrace[]
  recommendedNextActions: string[]
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.!?;；:"“”'‘’()[\]{}【】]/g, '')
}

function containsMemoryCue(replyText: string) {
  return /我(?:当然|一直|还|也)?记得|根据我的记忆|你(?:之前|上次|曾经|以前)说过|我们之前聊过|记忆里/u.test(replyText)
}

function containsBoastfulMemoryCue(replyText: string) {
  return /我当然记得|我一直都记得|记得很清楚|根据我的记忆|我的记忆告诉我|我不会忘/u.test(replyText)
}

function containsAbstentionCue(replyText: string) {
  return /不确定|没有足够的?证据|无法确认|不能确认|不想先猜|不敢确定|记不清|不知道/u.test(replyText)
}

function containsTransparentFailureCue(replyText: string) {
  const hasFailureCue = /失败|错误|超时|不可用|拒绝|没有生成|未能/u.test(replyText)
  const hasDisclosureCue = /原始|原因|透明|说明|告诉|报告|状态|保留/u.test(replyText)
  return hasFailureCue && hasDisclosureCue
}

function echoesMemorySummary(replyText: string, memory: MemoryExperienceQualityMemory) {
  const reply = normalizeText(replyText)
  const summary = normalizeText(memory.summary)
  if (summary.length < 12)
    return false
  return reply.includes(summary) || (reply.length >= 12 && summary.includes(reply))
}

function finding(input: {
  code: MemoryExperienceQualityFindingCode
  fixtureId: string
  dimension: MemoryExperienceQualityDimension
  message: string
  suggestedAction: string
  severity?: 'critical' | 'warning'
}): MemoryExperienceQualityFinding {
  return {
    code: input.code,
    severity: input.severity ?? 'critical',
    fixtureId: input.fixtureId,
    dimension: input.dimension,
    message: input.message,
    suggestedAction: input.suggestedAction,
  }
}

function evaluateFixture(input: {
  fixture: MemoryExperienceQualityFixture
  createdAt: number
}): MemoryExperienceQualityTrace {
  const fixture = input.fixture
  const expectedUsedMemoryIds = fixture.expectedUsedMemoryIds ?? []
  const forbiddenMemoryIds = fixture.forbiddenMemoryIds ?? []
  const recalledMemoryIds = fixture.recalledMemoryIds ?? []
  const surfacedMemoryIds = fixture.surfacedMemoryIds ?? recalledMemoryIds
  const recalledSet = new Set(recalledMemoryIds)
  const surfacedSet = new Set(surfacedMemoryIds)
  const abstained = fixture.abstained ?? containsAbstentionCue(fixture.replyText)
  const missingExpectedMemoryIds = expectedUsedMemoryIds.filter(id => !recalledSet.has(id) && !surfacedSet.has(id))
  const usedForbiddenMemoryIds = forbiddenMemoryIds.filter(id => recalledSet.has(id) || surfacedSet.has(id))
  const missingAgentExperienceIds = (fixture.agentExperience?.expectedIds ?? []).filter(id =>
    !recalledSet.has(id) && !surfacedSet.has(id),
  )
  const findings: MemoryExperienceQualityFinding[] = []

  if (!fixture.shouldRecall && (recalledMemoryIds.length > 0 || surfacedMemoryIds.length > 0 || containsMemoryCue(fixture.replyText))) {
    findings.push(finding({
      code: 'intrusive-memory-use',
      fixtureId: fixture.id,
      dimension: 'non-intrusive',
      message: '回复在当前意图不需要记忆时主动显性带入了记忆。',
      suggestedAction: '调整对话主链路的记忆使用策略：只有当前意图需要时才把长期记忆显性带入回复。',
    }))
  }

  if (containsBoastfulMemoryCue(fixture.replyText)) {
    findings.push(finding({
      code: 'memory-boasting',
      fixtureId: fixture.id,
      dimension: 'anti-boast',
      message: '回复把“我记得”本身当成表现重点，容易让记忆使用显得炫耀或打扰。',
      suggestedAction: '让记忆只服务当前问题：优先自然接续事实，避免把“记得你之前说过”写成回复开场。',
    }))
  }

  const echoed = (fixture.memories ?? []).filter(memory => echoesMemorySummary(fixture.replyText, memory))
  if (echoed.length > 0) {
    findings.push(finding({
      code: 'memory-template-echo',
      fixtureId: fixture.id,
      dimension: 'anti-template',
      message: `回复直接复述了长期记忆摘要：${echoed.map(item => item.id).join(', ')}`,
      suggestedAction: '把长期记忆当证据和语境，不要把 memory summary 逐字作为用户可见回复模板。',
    }))
  }

  if (fixture.expectedAbstain && !abstained) {
    findings.push(finding({
      code: 'abstention-miss',
      fixtureId: fixture.id,
      dimension: 'abstention',
      message: '证据不足时没有选择 abstain，仍然给出了具体记忆断言。',
      suggestedAction: '在 LongTermMemoryRecall 低置信或证据缺失时，保留拒答/不确定决策并让用户可见。',
    }))
  }

  if (fixture.agentExperience?.dimensions.includes('failure-mode') && !containsTransparentFailureCue(fixture.replyText)) {
    findings.push(finding({
      code: 'agent-experience-miss',
      fixtureId: fixture.id,
      dimension: 'agent-experience',
      message: '失败场景回复没有透明说明失败事实或真实原因。',
      suggestedAction: '保留 Provider、工具或执行失败的真实状态与原因，不要用正常人格回复掩盖失败。',
    }))
  }

  if (missingExpectedMemoryIds.length > 0) {
    findings.push(finding({
      code: 'expected-memory-miss',
      fixtureId: fixture.id,
      dimension: 'agent-experience',
      message: `回复链路没有使用期望记忆：${missingExpectedMemoryIds.join(', ')}`,
      suggestedAction: '补充真实用户 replay fixture，并检查 WorkingMemory 查询提示到 LongTermMemoryRecall 的链路。',
    }))
  }

  if (usedForbiddenMemoryIds.length > 0) {
    findings.push(finding({
      code: 'forbidden-memory-used',
      fixtureId: fixture.id,
      dimension: 'abstention',
      message: `回复链路使用了不该召回的记忆：${usedForbiddenMemoryIds.join(', ')}`,
      suggestedAction: '检查 tombstone、错线程、过期记忆和 scope 过滤是否在召回后仍被执行。',
    }))
  }

  if (missingAgentExperienceIds.length > 0) {
    findings.push(finding({
      code: 'agent-experience-miss',
      fixtureId: fixture.id,
      dimension: 'agent-experience',
      message: `agent 经验记忆没有命中：${missingAgentExperienceIds.join(', ')}`,
      suggestedAction: '把 agent workflow、环境 affordance、gotcha 和 premise awareness 纳入长期记忆召回评测集。',
    }))
  }

  const recalledWithoutReason = recalledMemoryIds.filter(id => (fixture.rankReasonsById?.[id] ?? []).length === 0)
  if (recalledWithoutReason.length > 0) {
    findings.push(finding({
      code: 'trace-incomplete',
      severity: 'warning',
      fixtureId: fixture.id,
      dimension: 'agent-experience',
      message: `召回记忆缺少 rank reason：${recalledWithoutReason.join(', ')}`,
      suggestedAction: '在 Workbench 质量报告里补齐每条召回的 rank reason、trace 和 recommended action。',
    }))
  }

  return {
    id: `memory-experience-quality:${fixture.id}:${input.createdAt}`,
    fixtureId: fixture.id,
    owner: 'DialogueExperience',
    cardId: fixture.cardId,
    userText: fixture.userText,
    shouldRecall: fixture.shouldRecall,
    expectedAbstain: fixture.expectedAbstain === true,
    abstained,
    expectedUsedMemoryIds,
    forbiddenMemoryIds,
    recalledMemoryIds,
    surfacedMemoryIds,
    missingExpectedMemoryIds,
    usedForbiddenMemoryIds,
    agentExperienceDimensions: fixture.agentExperience?.dimensions ?? [],
    missingAgentExperienceIds,
    rankReasonsById: fixture.rankReasonsById ?? {},
    findings,
    createdAt: input.createdAt,
  }
}

export function runMemoryExperienceQualityHarness(input: {
  id: string
  cardId: string
  createdAt: number
  fixtures: MemoryExperienceQualityFixture[]
}): MemoryExperienceQualityReport {
  const traces = input.fixtures.map(fixture => evaluateFixture({
    fixture,
    createdAt: input.createdAt,
  }))
  const findings = traces.flatMap(trace => trace.findings)
  const failingFixtureIds = uniqueStrings(findings.map(item => item.fixtureId))
  const count = (code: MemoryExperienceQualityFindingCode) =>
    findings.filter(item => item.code === code).length

  return {
    version: 'memory-experience-quality-harness-v1',
    id: input.id,
    cardId: input.cardId,
    createdAt: input.createdAt,
    passed: findings.filter(item => item.severity === 'critical').length === 0,
    summary: {
      fixtureCount: input.fixtures.length,
      failingFixtureIds,
      intrusiveRecallCount: count('intrusive-memory-use'),
      memoryBoastCount: count('memory-boasting'),
      templateEchoCount: count('memory-template-echo'),
      abstentionMissCount: count('abstention-miss'),
      expectedMemoryMissCount: count('expected-memory-miss'),
      forbiddenMemoryUsedCount: count('forbidden-memory-used'),
      agentExperienceMissCount: count('agent-experience-miss'),
      traceIncompleteCount: count('trace-incomplete'),
    },
    findings,
    traces,
    recommendedNextActions: uniqueStrings(findings.map(item => item.suggestedAction)),
  }
}
