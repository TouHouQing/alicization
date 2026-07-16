import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { executeCliTaskThread } from './cli'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-cli-1',
    decisionTraceId: 'mind:trace:cli-1',
    turnId: 'turn-cli-1',
    sessionId: 'session-cli-1',
    origin: 'user-turn',
    goal: 'Run the local command body.',
    kind: 'run-command',
    status: 'planned',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'initial plan',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: null,
    completedAt: null,
    ...overrides,
  }
}

describe('cli executor adapter', () => {
  it('dispatches a safe CLI command and records dispatch, step, and result events', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'console.log("hello cli"); console.error("stderr cli")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('hello cli')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
    expect(result.events.at(-1)).toEqual(expect.objectContaining({
      kind: 'result',
      threadStatus: 'completed',
    }))
  })

  it('blocks dangerous CLI commands without explicit permission', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'rm',
        args: ['-rf', 'dist'],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-cli-danger-1',
          decisionTraceId: 'mind:trace:cli-danger-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 15,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 1,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLI_PERMISSION_REQUIRED')
    expect(result.events[0]).toEqual(expect.objectContaining({
      kind: 'result',
      threadStatus: 'failed',
      payload: expect.objectContaining({
        adapter: 'cli',
        errorCode: 'CLI_PERMISSION_REQUIRED',
        safetyGate: expect.objectContaining({
          effect: 'mutate',
          permissionMode: 'implicit',
          confirmationRequired: true,
          riskPolicy: 'explicit-confirmation-required',
          auditability: 'blocked-before-dispatch',
          interruptibility: 'no-process-started',
          riskLevel: 'danger',
          actionCategory: 'delete',
        }),
        hasRuntimeContext: true,
      }),
    }))
  })

  it('blocks origin-thin autonomous sensitive CLI writes when legacy threads lost explicit permission metadata', async () => {
    const result = await executeCliTaskThread({
      thread: createThread({
        turnId: 'subconscious:cli-origin-thin-sensitive-write-1',
        origin: 'user-turn',
        metadata: {
          task: {
            effect: 'mutate',
          },
        },
      }),
      command: {
        command: 'mkdir',
        args: ['tmp-origin-thin-cli-test'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLI_PERMISSION_REQUIRED')
  })

  it('normalizes inline command strings when args are omitted', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node -e "console.log(\'inline cli\')"',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('inline cli')
    expect(result.events.at(0)).toEqual(expect.objectContaining({
      kind: 'dispatch',
      payload: expect.objectContaining({
        command: expect.stringContaining('node -e'),
      }),
    }))
  })

  it('supports shell-mode compound commands passed as a single command string', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node -e "process.stdout.write(\'abc\')" | wc -c',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('3')
    expect(result.events.at(0)).toEqual(expect.objectContaining({
      kind: 'dispatch',
      payload: expect.objectContaining({
        command: expect.stringContaining('| wc -c'),
      }),
    }))
  })

  it('auto-normalizes to shell mode when args contain shell operators', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'process.stdout.write("1")', '&&', 'node', '-e', 'process.stdout.write("2")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('12')
    expect(result.events.at(0)).toEqual(expect.objectContaining({
      kind: 'dispatch',
      payload: expect.objectContaining({
        command: expect.stringContaining('&&'),
        args: [],
      }),
    }))
  })

  it('expands home-directory aliases in CLI args before process spawn', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'process.stdout.write(process.argv[1] || "")', '~/Desktop'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).not.toContain('~/Desktop')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      aliasExpansionCount: expect.any(Number),
    }))
    expect(Number((result.events[0]?.payload as { aliasExpansionCount?: unknown }).aliasExpansionCount ?? 0)).toBeGreaterThan(0)
  })

  it('expands home-directory aliases inside option assignments', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'process.stdout.write(process.argv[1] || "")', '--', '--target=~/Desktop'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).not.toContain('~/Desktop')
    expect(result.output).toContain('--target=')
    expect(result.output).toMatch(/--target=.+(Desktop|桌面)/u)
  })

  it('expands home-directory aliases from inline command strings', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node -e "process.stdout.write(process.argv[1] || \'\')" ~/Desktop',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).not.toContain('~/Desktop')
    expect(result.output).toMatch(/(Desktop|桌面)/u)
  })

  it('builds callback-friendly summaries for ls listings and keeps decoded hints', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'alicization-cli-ls-'))
    const encodedName = '%E5%B0%8F%E7%A0%96%E7%8C%BF'
    const chineseName = '小砖猿'

    try {
      await Promise.all([
        mkdir(join(tempRoot, encodedName)),
        mkdir(join(tempRoot, chineseName)),
      ])

      const result = await executeCliTaskThread({
        thread: createThread(),
        command: {
          command: 'ls',
          args: ['-la', tempRoot],
        },
        workspaceRoot: process.cwd(),
      })

      expect(result.ok).toBe(true)
      expect(result.finalStatus).toBe('completed')
      expect(result.summary).toContain('Listed entries')
      expect(result.summary).toContain(`${encodedName} (${chineseName})`)
      expect(result.summary).not.toContain('drwx')
      expect(result.events.at(-1)?.payload).toEqual(expect.objectContaining({
        summary: expect.stringContaining('Listed entries'),
      }))
    }
    finally {
      await rm(tempRoot, {
        recursive: true,
        force: true,
      })
    }
  })

  it('cancels a running CLI command when the abort signal fires', async () => {
    const controller = new AbortController()
    const execution = executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'setTimeout(() => console.log("late output"), 3000)'],
        timeoutMs: 5_000,
      },
      abortSignal: controller.signal,
      workspaceRoot: process.cwd(),
    })

    setTimeout(() => {
      controller.abort('kill-switch-suspended')
    }, 80)

    const result = await execution

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('cancelled')
    expect(result.errorCode).toBe('CLI_ABORTED')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'cancel']))
  })

  it('injects runtime context into the CLI environment and execution events', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: [
          '-e',
          [
            'const legacyNames = [',
            '"ALICIZATION_EXECUTION_PROJECT_IDENTITY",',
            '"ALICIZATION_EXECUTION_PROJECT_PHASE",',
            '"ALICIZATION_EXECUTION_PROJECT_LANDED_PROGRESS",',
            '"ALICIZATION_EXECUTION_PROJECT_OPEN_LOOP",',
            '"ALICIZATION_EXECUTION_PROJECT_NEXT_CLOSURE",',
            '"ALICIZATION_EXECUTION_PROJECT_SAME_HER",',
            '"ALICIZATION_EXECUTION_PROJECT_SAME_HER_HOLD",',
            '"ALICIZATION_EXECUTION_PROJECT_SAME_HER_DRIFT_RISK",',
            '"ALICIZATION_EXECUTION_PROJECT_CONTINUITY_RESTRAINT",',
            '"ALICIZATION_EXECUTION_PROJECT_CONTINUITY",',
            '"ALICIZATION_EXECUTION_PROJECT_PREFLIGHT",',
            '"ALICIZATION_EXECUTION_PROJECT_AWARENESS",',
            '"ALICIZATION_EXECUTION_PROJECT_PREFERRED_PAUSE_MODE",',
            '"ALICIZATION_EXECUTION_PROJECT_PREFERRED_LIPSYNC_MODE",',
            '"ALICIZATION_EXECUTION_PROJECT_PREFERRED_VOICE_MODE",',
            '"ALICIZATION_EXECUTION_PROJECT_PREFERRED_PACING_MODE"',
            '];',
            'const runtimeJson = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}");',
            'const runtimeFact = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_BLOCK || "{}");',
            'process.stdout.write(JSON.stringify({',
            'foreground: process.env.ALICIZATION_EXECUTION_FOREGROUND_WINDOW || "",',
            'generatedAt: process.env.ALICIZATION_EXECUTION_CONTEXT_GENERATED_AT || "",',
            'runtimeIdentifiers: { cardId: runtimeJson.cardId ?? null, turnId: runtimeJson.turnId ?? null },',
            'runtimeFact: { type: runtimeFact.type ?? null, owners: runtimeFact.data?.owners ?? null, failureSurface: runtimeFact.data?.failureSurface ?? null, status: runtimeFact.data?.execution?.status ?? null },',
            'statusLatest: process.env.ALICIZATION_EXECUTION_STATUS_LATEST || "",',
            'statusOpen: process.env.ALICIZATION_EXECUTION_STATUS_OPEN || "",',
            'statusNext: process.env.ALICIZATION_EXECUTION_STATUS_NEXT || "",',
            'continuityArcStage: process.env.ALICIZATION_EXECUTION_CONTINUITY_ARC_STAGE || "",',
            'continuityRestraint: process.env.ALICIZATION_EXECUTION_CONTINUITY_RESTRAINT || "",',
            'continuityPreferredTiming: process.env.ALICIZATION_EXECUTION_CONTINUITY_PREFERRED_TIMING || "",',
            'continuityCadence: process.env.ALICIZATION_EXECUTION_CONTINUITY_CADENCE || "",',
            'blinkCadence: process.env.ALICIZATION_EXECUTION_EMBODIMENT_BLINK_CADENCE || "",',
            'gazeMode: process.env.ALICIZATION_EXECUTION_EMBODIMENT_GAZE_MODE || "",',
            'pauseMode: process.env.ALICIZATION_EXECUTION_EMBODIMENT_PAUSE_MODE || "",',
            'lipsyncMode: process.env.ALICIZATION_EXECUTION_EMBODIMENT_LIPSYNC_MODE || "",',
            'voiceMode: process.env.ALICIZATION_EXECUTION_EMBODIMENT_VOICE_MODE || "",',
            'pacingMode: process.env.ALICIZATION_EXECUTION_EMBODIMENT_PACING_MODE || "",',
            'legacy: Object.fromEntries(legacyNames.map(name => [name, process.env[name] ?? null]))',
            '}));',
          ].join(''),
        ],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-cli-1',
          decisionTraceId: 'mind:trace:cli-1',
          projectBriefing: {
            identity: 'legacy identity prompt must not reach CLI env',
            currentPhase: 'legacy phase prompt must not reach CLI env',
            latestLandedProgress: 'Runtime context normalization is complete.',
            sameHerSelfLine: 'legacy persona prompt must not reach CLI env',
            sameHerHoldDetail: null,
            primaryOpenLoop: 'CLI still needs neutral execution status variables.',
            nextClosureTarget: 'Expose typed execution facts without project prompt variables.',
            sameHerDriftRisk: null,
            continuityArcStage: 'repair-pass',
            continuityRestraint: 'measured-return',
            continuityCue: null,
            continuityPreferredTiming: 'after-payoff',
            continuityCadence: 'steady-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            preflightSummary: 'legacy preflight prompt must not reach CLI env',
            preDialogueAwarenessLine: 'legacy awareness prompt must not reach CLI env',
          },
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 17,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 2,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    const parsed = JSON.parse(result.output ?? '{}') as {
      foreground?: string
      generatedAt?: string
      runtimeIdentifiers?: {
        cardId?: string | null
        turnId?: string | null
      }
      runtimeFact?: {
        type?: string | null
        owners?: Record<string, string> | null
        failureSurface?: string | null
        status?: Record<string, string> | null
      }
      statusLatest?: string
      statusOpen?: string
      statusNext?: string
      continuityArcStage?: string
      continuityRestraint?: string
      continuityPreferredTiming?: string
      continuityCadence?: string
      blinkCadence?: string
      gazeMode?: string
      pauseMode?: string
      lipsyncMode?: string
      voiceMode?: string
      pacingMode?: string
      legacy?: Record<string, string | null>
    }

    expect(parsed).toEqual(expect.objectContaining({
      foreground: 'Cursor | cursor | airi-alice',
      generatedAt: '1710000000000',
      statusLatest: 'Runtime context normalization is complete.',
      statusOpen: 'CLI still needs neutral execution status variables.',
      statusNext: 'Expose typed execution facts without project prompt variables.',
      continuityArcStage: 'repair-pass',
      continuityRestraint: 'measured-return',
      continuityPreferredTiming: 'after-payoff',
      continuityCadence: 'steady-return',
      blinkCadence: 'quiet',
      gazeMode: 'soften',
      pauseMode: 'longer',
      lipsyncMode: 'restrained',
      voiceMode: 'lower-pressure',
      pacingMode: 'slower',
    }))
    expect(parsed.runtimeIdentifiers).toEqual({
      cardId: 'default',
      turnId: 'turn-cli-1',
    })
    expect(parsed.runtimeFact).toEqual({
      type: 'alicization-execution-runtime-context',
      owners: {
        shortTerm: 'WorkingMemory',
        longTermRecall: 'LongTermMemoryRecall',
      },
      failureSurface: 'transparent',
      status: {
        latest: 'Runtime context normalization is complete.',
        open: 'CLI still needs neutral execution status variables.',
        next: 'Expose typed execution facts without project prompt variables.',
      },
    })
    expect(Object.values(parsed.legacy ?? {}).every(value => value === null)).toBe(true)
    expect(result.output).not.toMatch(/\[ALICIZATION_EXECUTION_|legacy (?:identity|phase|persona|preflight|awareness) prompt/iu)
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-cli-1',
      }),
    }))
  })

  it('normalizes execution status aliases without exporting legacy project or persona variables', async () => {
    const aliasLatest = 'Alias latest execution status remains available.'
    const aliasOpen = 'Alias open execution status remains available.'
    const aliasNext = 'Alias next execution status remains available.'

    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: [
          '-e',
          'process.stdout.write(JSON.stringify({ latest: process.env.ALICIZATION_EXECUTION_STATUS_LATEST || "", open: process.env.ALICIZATION_EXECUTION_STATUS_OPEN || "", next: process.env.ALICIZATION_EXECUTION_STATUS_NEXT || "", legacyDrift: process.env.ALICIZATION_EXECUTION_PROJECT_SAME_HER_DRIFT_RISK ?? null, runtimeBlock: process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_BLOCK || "" }))',
        ],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-cli-alias-project-briefing',
          decisionTraceId: 'mind:trace:cli-alias-project-briefing',
          projectBriefing: {
            latestLandedProgress: ' ',
            primaryOpenLoop: ' ',
            nextClosureTarget: '',
            landedProgressSummary: aliasLatest,
            openClosureSummary: aliasOpen,
            nextClosureTargetSummary: aliasNext,
            sameHerDriftRiskSummary: 'legacy drift prompt must not reach CLI env',
          } as any,
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 17,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 2,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    const parsed = JSON.parse(result.output ?? '{}') as {
      latest?: string
      open?: string
      next?: string
      legacyDrift?: string | null
      runtimeBlock?: string
    }
    const runtimeFact = JSON.parse(parsed.runtimeBlock ?? '{}') as {
      data?: {
        execution?: {
          status?: Record<string, string>
        }
      }
    }

    expect(parsed.latest).toBe(aliasLatest)
    expect(parsed.open).toBe(aliasOpen)
    expect(parsed.next).toBe(aliasNext)
    expect(parsed.legacyDrift).toBeNull()
    expect(runtimeFact.data?.execution?.status).toEqual({
      latest: aliasLatest,
      open: aliasOpen,
      next: aliasNext,
    })
    expect(parsed.runtimeBlock).not.toContain('legacy drift prompt')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          latestLandedProgress: aliasLatest,
          primaryOpenLoop: aliasOpen,
          nextClosureTarget: aliasNext,
        }),
      }),
    }))
  })
})
