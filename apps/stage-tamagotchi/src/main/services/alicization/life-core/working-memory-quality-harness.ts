import type { WorkingMemorySnapshot } from './working-memory'
import type { WorkingMemoryQualityView } from './working-memory-quality-view'

import { compressWorkingMemorySnapshot } from './working-memory-compressor'
import { buildWorkingMemoryQualityView } from './working-memory-quality-view'

export interface WorkingMemoryQualityFixture {
  id: string
  snapshot: WorkingMemorySnapshot
  compressedSnapshot?: WorkingMemorySnapshot
  maxRawTurns?: number
  now: number
  expectedTaskIncludes?: string[]
  expectedQuestionIncludes?: string[]
  expectedCommitmentIncludes?: string[]
  expectedCorrectionIncludes?: string[]
  expectedFailureTurnIds?: string[]
  forbiddenConfirmedCandidateText?: string[]
}

export interface WorkingMemoryQualityMetrics {
  obligationRetentionRate: number
  correctionRetentionRate: number
  commitmentRetentionRate: number
  failureTransparencyRetentionRate: number
  candidateBoundaryViolationCount: number
  compressionLossCount: number
}

export interface WorkingMemoryQualityTrace {
  id: string
  fixtureId: string
  owner: 'WorkingMemory'
  query: string
  intentMode: string | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: {
    available: false
    providerId: null
    modelId: null
    dimensions: null
    reindexRequired: false
  }
  metrics: WorkingMemoryQualityMetrics
  error: string | null
  createdAt: number
}

export interface WorkingMemoryQualityResult {
  fixtureId: string
  compressedSnapshot: WorkingMemorySnapshot
  view: WorkingMemoryQualityView
  metrics: WorkingMemoryQualityMetrics
  trace: WorkingMemoryQualityTrace
  passed: boolean
}

function includesAll(text: string, expected: string[]) {
  if (expected.length === 0)
    return true
  return expected.every(item => text.includes(item))
}

function scoreExpected(expected: string[], actualText: string) {
  if (expected.length === 0)
    return 1
  const hits = expected.filter(item => actualText.includes(item)).length
  return hits / expected.length
}

function buildFailureText(view: WorkingMemoryQualityView) {
  return [
    ...view.modules.audit.failureTurnIds.map(id => `failure:${id}`),
    ...view.modules.audit.notes,
  ].join('\n')
}

function compactWorkingMemoryForQuality(fixture: WorkingMemoryQualityFixture) {
  return fixture.compressedSnapshot ?? compressWorkingMemorySnapshot(fixture.snapshot, {
    maxRawTurns: fixture.maxRawTurns ?? 6,
    now: fixture.now,
  })
}

export function runWorkingMemoryQualityHarnessFixture(input: {
  fixture: WorkingMemoryQualityFixture
}): WorkingMemoryQualityResult {
  const fixture = input.fixture
  const compressedSnapshot = compactWorkingMemoryForQuality(fixture)
  const view = buildWorkingMemoryQualityView(compressedSnapshot)
  const structuredViewText = JSON.stringify(view.modules)
  const taskText = [
    view.modules.task.summary ?? '',
    view.modules.task.status ?? '',
    view.modules.thread.title ?? '',
    view.modules.thread.currentUserMove ?? '',
  ].join('\n')
  const questionText = view.modules.unresolvedQuestions.join('\n')
  const commitmentText = view.modules.commitments.join('\n')
  const correctionText = view.modules.corrections.map(item => `${item.scope}:${item.text}`).join('\n')
  const failureText = buildFailureText(view)
  const expectedFailureMarkers = (fixture.expectedFailureTurnIds ?? []).map(id => `failure:${id}`)

  const taskScore = scoreExpected(fixture.expectedTaskIncludes ?? [], taskText)
  const questionScore = scoreExpected(fixture.expectedQuestionIncludes ?? [], questionText)
  const commitmentScore = scoreExpected(fixture.expectedCommitmentIncludes ?? [], commitmentText)
  const correctionScore = scoreExpected(fixture.expectedCorrectionIncludes ?? [], correctionText)
  const failureScore = scoreExpected(expectedFailureMarkers, failureText)
  const candidateBoundaryViolationCount = (fixture.forbiddenConfirmedCandidateText ?? [])
    .filter(text => structuredViewText.includes(text))
    .length
  const missingReasons = [
    !includesAll(taskText, fixture.expectedTaskIncludes ?? []) ? 'missing-task' : null,
    !includesAll(questionText, fixture.expectedQuestionIncludes ?? []) ? 'missing-question' : null,
    !includesAll(commitmentText, fixture.expectedCommitmentIncludes ?? []) ? 'missing-commitment' : null,
    !includesAll(correctionText, fixture.expectedCorrectionIncludes ?? []) ? 'missing-correction' : null,
    !includesAll(failureText, expectedFailureMarkers) ? 'missing-failure' : null,
    candidateBoundaryViolationCount > 0 ? 'candidate-boundary-violation' : null,
  ].filter(Boolean) as string[]
  const compressionLossCount = missingReasons.filter(reason => reason.startsWith('missing-')).length
  const metrics: WorkingMemoryQualityMetrics = {
    obligationRetentionRate: (taskScore + questionScore) / 2,
    correctionRetentionRate: correctionScore,
    commitmentRetentionRate: commitmentScore,
    failureTransparencyRetentionRate: failureScore,
    candidateBoundaryViolationCount,
    compressionLossCount,
  }
  const selectedIds = [
    metrics.obligationRetentionRate === 1 ? 'task' : null,
    ...view.modules.audit.failureTurnIds.map(id => `failure:${id}`),
  ].filter(Boolean) as string[]

  const trace: WorkingMemoryQualityTrace = {
    id: `working-memory-quality:${fixture.id}:${fixture.now}`,
    fixtureId: fixture.id,
    owner: 'WorkingMemory',
    query: fixture.id,
    intentMode: view.modules.thread.mode,
    queryPlan: {
      lexicalQueries: view.modules.memoryQueryHints,
      phraseQueries: [],
      semanticQueries: [],
      threadHints: [view.modules.thread.title ?? '', view.modules.task.summary ?? ''].filter(Boolean),
    },
    selectedIds,
    rejectedIds: missingReasons,
    forbiddenIds: fixture.forbiddenConfirmedCandidateText ?? [],
    rankReasonsById: Object.fromEntries(selectedIds.map(id => [id, ['working-memory:retained']])),
    semantic: {
      available: false,
      providerId: null,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    },
    metrics,
    error: missingReasons.length > 0 ? missingReasons.join(';') : null,
    createdAt: fixture.now,
  }

  return {
    fixtureId: fixture.id,
    compressedSnapshot,
    view,
    metrics,
    trace,
    passed: missingReasons.length === 0,
  }
}

export function runWorkingMemoryQualityHarnessSuite(input: {
  fixtures: WorkingMemoryQualityFixture[]
}) {
  const results = input.fixtures.map(fixture => runWorkingMemoryQualityHarnessFixture({ fixture }))
  return {
    results,
    traces: results.map(result => result.trace),
    passed: results.every(result => result.passed),
    compressionLossCount: results.reduce((sum, result) => sum + result.metrics.compressionLossCount, 0),
    candidateBoundaryViolationCount: results.reduce((sum, result) => sum + result.metrics.candidateBoundaryViolationCount, 0),
  }
}
