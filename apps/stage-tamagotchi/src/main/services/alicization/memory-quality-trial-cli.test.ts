import type { MemoryProductionTrialReport } from './memory-production-trial-runner'

import { describe, expect, it, vi } from 'vitest'

import {
  createMemoryQualityTrialCliReport,
  parseMemoryQualityTrialCliArgs,
  resolveDefaultMemoryQualityTrialUserDataPath,
  runMemoryQualityTrialCli,
} from './memory-quality-trial-cli'

function report(overrides: Partial<MemoryProductionTrialReport> = {}) {
  return {
    version: 'memory-production-trial-runner-v1',
    id: 'cli-report',
    cardId: 'default',
    createdAt: 1,
    passed: false,
    summary: {
      dialogueReplayCount: 0,
      workingMemoryFixtureCount: 0,
      compressedContextBehaviorFixtureCount: 0,
      temporalConflictFixtureCount: 0,
      semanticScaleSoakRunCount: 0,
      experienceQualityFixtureCount: 0,
      scopeFuzzCaseCount: 0,
      longTermFixtureCount: 0,
      userTrialCount: 0,
      personaTrainingFixtureCount: 0,
      goldLabelCount: 0,
      goldRegressionPackId: null,
      failingStageIds: [],
      notRunStageIds: ['dialogue-replay'],
      optimizationFindingCount: 0,
      recommendedActionCount: 1,
      lastError: 'not-run: no primary session',
    },
    stages: [{
      stage: 'dialogue-replay',
      id: 'dialogue-replay',
      passed: false,
      status: 'not-run',
      itemCount: 0,
      error: 'not-run: no primary session',
    }],
    dialogueReplay: null,
    liveProviderTrial: null,
    runtimeHealth: null,
    regression: {
      recallAt1: 0,
      recallAt3: 0,
      recallAt5: 0,
      wrongThreadRate: 0,
      semanticHitRate: 0,
      sourceTraceRate: 0,
      abstentionPrecision: 0,
      abstentionRecall: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      staleMemoryLeakRate: null,
      temporalUpdateAccuracy: null,
      providerFailureRate: 0,
      queueFailureRate: 0,
      deadLetterRate: 0,
      embeddingCoverageRatio: null,
    },
    quality: {
      version: 'memory-quality-harness-v1',
      passed: false,
      createdAt: 1,
      summary: {
        longTermFixtureCount: 0,
        workingMemoryFixtureCount: 0,
        userTrialCount: 0,
        personaTrainingFixtureCount: 0,
        failingFixtureIds: [],
        recallAtK: 0,
        recallAt1: 0,
        recallAt3: 0,
        recallAt5: 0,
        wrongThreadRate: 0,
        semanticHitRate: 0,
        sourceTraceRate: 0,
        abstentionPrecision: 0,
        abstentionRecall: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        compressionLossCount: 0,
        blockedLeakCount: 0,
        optimizationFindingCount: 0,
        lastError: 'not-run: no primary session',
      },
      longTerm: [],
      workingMemory: [],
      userTrials: [],
      personaTraining: [],
      optimizationFindings: [],
      recommendedNextActions: [],
      traces: [],
    },
    goldRegressionPack: null,
    compressedContextBehavior: null,
    temporalConflict: null,
    semanticScaleSoak: null,
    experienceQuality: null,
    scopeFuzz: null,
    recommendedNextActions: ['先创建主对话记录。'],
    ...overrides,
  } satisfies MemoryProductionTrialReport
}

describe('memory quality trial CLI', () => {
  it('finds the installed macOS app data directory without requiring novice users to provide a path', () => {
    const existing = new Set([
      '/Users/alice/Library/Application Support/com.tohoqing.alicization/alicizations/alicization.db',
    ])

    expect(resolveDefaultMemoryQualityTrialUserDataPath({
      platform: 'darwin',
      homeDir: '/Users/alice',
      env: {},
      pathExists: path => existing.has(path),
    })).toBe('/Users/alice/Library/Application Support/com.tohoqing.alicization')
  })

  it('allows the package command to run without path arguments on an installed macOS app', () => {
    expect(parseMemoryQualityTrialCliArgs([], {
      defaultUserDataPath: '/Users/alice/Library/Application Support/com.tohoqing.alicization',
    })).toMatchObject({
      userDataPath: '/Users/alice/Library/Application Support/com.tohoqing.alicization',
      databasePath: null,
      cardId: 'default',
      mode: 'historical-replay',
      readOnly: true,
    })
  })

  it('parses the local DB, card, mode, report, and primary session options', () => {
    expect(parseMemoryQualityTrialCliArgs([
      '--user-data-path',
      '/tmp/alicization',
      '--card-id',
      'card-a',
      '--mode',
      'historical-replay',
      '--report',
      '/tmp/report.json',
      '--session-id',
      'session:primary:card-a',
    ])).toEqual({
      userDataPath: '/tmp/alicization',
      databasePath: null,
      cardId: 'card-a',
      mode: 'historical-replay',
      reportPath: '/tmp/report.json',
      sessionId: 'session:primary:card-a',
      readOnly: false,
    })
  })

  it('accepts the package-script argument separator before CLI options', () => {
    expect(parseMemoryQualityTrialCliArgs([
      '--',
      '--db=/tmp/alicization/cards/card-a/alicization.db',
      '--card-id=card-a',
    ])).toMatchObject({
      databasePath: '/tmp/alicization/cards/card-a/alicization.db',
      cardId: 'card-a',
    })
  })

  it('allows direct database invocation without a separate user-data path', () => {
    expect(parseMemoryQualityTrialCliArgs([
      '--db=/tmp/alicization/cards/card-a/alicization.db',
      '--card-id=card-a',
    ])).toMatchObject({
      userDataPath: '/tmp/alicization/cards/card-a',
      databasePath: '/tmp/alicization/cards/card-a/alicization.db',
      cardId: 'card-a',
    })
  })

  it('parses read-only mode for a non-destructive real DB trial', () => {
    expect(parseMemoryQualityTrialCliArgs([
      '--db=/tmp/alicization/cards/card-a/alicization.db',
      '--card-id=card-a',
      '--read-only',
    ])).toMatchObject({
      databasePath: '/tmp/alicization/cards/card-a/alicization.db',
      cardId: 'card-a',
      readOnly: true,
    })
  })

  it('rejects a non-primary session before opening the database', async () => {
    const setupDb = vi.fn()
    await expect(runMemoryQualityTrialCli({
      args: {
        userDataPath: '/tmp/alicization',
        databasePath: null,
        cardId: 'card-a',
        mode: 'historical-replay',
        reportPath: null,
        sessionId: 'legacy-session',
      },
      setupDb,
      writeReport: vi.fn(),
      writeOutput: vi.fn(),
    })).resolves.toMatchObject({
      exitCode: 1,
      report: null,
      error: '只允许回放当前机体的主对话会话：session:primary:card-a。',
    })
    expect(setupDb).not.toHaveBeenCalled()
  })

  it('keeps an empty real DB explicit as not-run and returns a non-zero quality exit code', async () => {
    const db = {
      runMemoryWorkbenchProductionTrial: vi.fn(async () => report()),
      close: vi.fn(async () => {}),
    }
    const writeOutput = vi.fn()
    const result = await runMemoryQualityTrialCli({
      args: {
        userDataPath: '/tmp/alicization',
        databasePath: '/tmp/alicization/cards/default/alicization.db',
        cardId: 'default',
        mode: 'historical-replay',
        reportPath: null,
        sessionId: null,
      },
      setupDb: vi.fn(async () => db),
      writeReport: vi.fn(),
      writeOutput,
    })

    expect(result).toMatchObject({
      exitCode: 2,
      report: {
        passed: false,
        summary: {
          notRunStageIds: ['dialogue-replay'],
        },
      },
    })
    expect(writeOutput).toHaveBeenCalledWith(expect.stringContaining('"status": "not-run"'))
    expect(db.close).toHaveBeenCalledOnce()
  })

  it('passes read-only mode through to the DB facade', async () => {
    const db = {
      runMemoryWorkbenchProductionTrial: vi.fn(async () => report()),
      close: vi.fn(async () => {}),
    }
    const setupDb = vi.fn(async () => db)
    const result = await runMemoryQualityTrialCli({
      args: {
        userDataPath: '/tmp/alicization',
        databasePath: '/tmp/alicization/cards/default/alicization.db',
        cardId: 'default',
        mode: 'historical-replay',
        reportPath: null,
        sessionId: null,
        readOnly: true,
      },
      setupDb,
      writeReport: vi.fn(),
      writeOutput: vi.fn(),
    })

    expect(result.exitCode).toBe(2)
    expect(setupDb).toHaveBeenCalledWith(expect.objectContaining({
      readOnly: true,
    }))
    expect(db.runMemoryWorkbenchProductionTrial).toHaveBeenCalledWith(expect.objectContaining({
      readOnly: true,
    }))
  })

  it('writes a private default JSON report and returns its path when --report is omitted', async () => {
    const db = {
      runMemoryWorkbenchProductionTrial: vi.fn(async () => report()),
      close: vi.fn(async () => {}),
    }
    const writeReport = vi.fn(async () => {})
    const result = await runMemoryQualityTrialCli({
      args: {
        userDataPath: '/tmp/alicization',
        databasePath: '/tmp/alicization/alicizations/alicization.db',
        cardId: 'default',
        mode: 'historical-replay',
        reportPath: null,
        sessionId: null,
        readOnly: true,
      },
      setupDb: vi.fn(async () => db),
      writeReport,
      writeOutput: vi.fn(),
      now: () => 1_786_800_000_000,
    })

    expect(result.reportPath).toBe(
      '/tmp/alicization/alicizations/quality-reports/memory-quality-trial-1786800000000.json',
    )
    expect(writeReport).toHaveBeenCalledWith(
      result.reportPath,
      expect.stringContaining('"version": "memory-production-trial-runner-v1"'),
    )
  })

  it('creates an operational not-run report without hiding the real error', () => {
    const result = createMemoryQualityTrialCliReport({
      cardId: 'card-a',
      error: 'database unavailable',
      createdAt: 10,
    })

    expect(result.passed).toBe(false)
    expect(result.summary.notRunStageIds).toContain('dialogue-replay')
    expect(result.summary.lastError).toBe('database unavailable')
  })
})
