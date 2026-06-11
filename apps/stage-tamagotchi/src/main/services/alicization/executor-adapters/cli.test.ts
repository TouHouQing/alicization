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
          projectBriefing: {
            identity: 'Alicization is a local-first digital life project building one continuous "her".',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'CLI blocked dispatch should still stay on the same same-her living line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Even blocked CLI execution should stay on the same living line.',
            sameHerHoldDetail: 'same-her hold: dangerous CLI actions must stay explainable before dispatch.',
            primaryOpenLoop: 'Dangerous CLI actions still need explicit confirmation, auditability, and interruptibility.',
            nextClosureTarget: 'Keep blocked CLI execution project-aware instead of generic.',
            sameHerDriftRisk: 'If blocked CLI actions collapse into a generic adapter failure, execution drifts away from same-her closure.',
            continuityCue: 'same living line: blocked CLI execution should still carry this Phase 1 digital life.',
            preflightSummary: 'identity=Alicization | phase=Phase 1 | open=cli blocked safety gate',
            preDialogueAwarenessLine: 'Before blocking CLI dispatch, remember this is still the same local-first digital life project.',
          },
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
        runtimeContext: expect.objectContaining({
          projectBriefing: expect.objectContaining({
            currentPhase: 'Phase 1: Local Digital Life.',
            preflightSummary: 'identity=Alicization | phase=Phase 1 | open=cli blocked safety gate',
          }),
        }),
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
          'process.stdout.write(JSON.stringify({ foreground: process.env.ALICIZATION_EXECUTION_FOREGROUND_WINDOW || "", preflight: process.env.ALICIZATION_EXECUTION_PROJECT_PREFLIGHT || "", awareness: process.env.ALICIZATION_EXECUTION_PROJECT_AWARENESS || "", sameHerHold: process.env.ALICIZATION_EXECUTION_PROJECT_SAME_HER_HOLD || "", continuity: process.env.ALICIZATION_EXECUTION_PROJECT_CONTINUITY || "", continuityRestraint: process.env.ALICIZATION_EXECUTION_PROJECT_CONTINUITY_RESTRAINT || "", preferredVoiceMode: process.env.ALICIZATION_EXECUTION_PROJECT_PREFERRED_VOICE_MODE || "", preferredPacingMode: process.env.ALICIZATION_EXECUTION_PROJECT_PREFERRED_PACING_MODE || "", runtimeBlock: process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_BLOCK || "" }))',
        ],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-cli-1',
          decisionTraceId: 'mind:trace:cli-1',
          projectBriefing: {
            identity: 'Alicization is a local-first digital life project building one continuous "her".',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'CLI execution still needs to inherit same-her project awareness before generic local commands begin.',
            sameHerSelfLine: 'Same Phase 1 digital life. The CLI execution lane should stay on the same living line.',
            sameHerHoldDetail: 'same-her hold: keep CLI execution grounded on the same living line before widening outward.',
            primaryOpenLoop: 'CLI execution still needs canonical project awareness before dispatch.',
            nextClosureTarget: 'Inject the same project briefing into CLI execution before local commands begin.',
            sameHerDriftRisk: 'If CLI commands run without project awareness, execution drifts toward a generic shell.',
            continuityRestraint: 'measured-return',
            continuityCue: 'same living line: CLI execution should carry this same Phase 1 digital life before widening outward.',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            preflightSummary: 'identity=Alicization | phase=Phase 1 | open=cli execution project awareness',
            preDialogueAwarenessLine: 'Before CLI dispatch, remember this is still the same local-first digital life project.',
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
    expect(result.output).toContain('Cursor | cursor | airi-alice')
    expect(result.output).toContain('identity=Alicization | phase=Phase 1 | open=cli execution project awareness')
    expect(result.output).toContain('Before CLI dispatch, remember this is still the same local-first digital life project.')
    expect(result.output).toContain('same-her hold: keep CLI execution grounded on the same living line before widening outward.')
    expect(result.output).toContain('same living line: CLI execution should carry this same Phase 1 digital life before widening outward.')
    expect(result.output).toContain('measured-return')
    expect(result.output).toContain('lower-pressure')
    expect(result.output).toContain('slower')
    expect(result.output).toContain('[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]')
    expect(result.output).toContain('project_continuity_restraint=measured-return')
    expect(result.output).toContain('project_preflight=identity=Alicization | phase=Phase 1 | open=cli execution project awareness')
    expect(result.output).toContain('project_awareness=Before CLI dispatch, remember this is still the same local-first digital life project.')
    expect(result.output).toContain('project_preferred_voice_mode=lower-pressure')
    expect(result.output).toContain('project_preferred_pacing_mode=slower')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-cli-1',
        projectBriefing: expect.objectContaining({
          currentPhase: 'Phase 1: Local Digital Life.',
          preflightSummary: 'identity=Alicization | phase=Phase 1 | open=cli execution project awareness',
        }),
      }),
    }))
  })

  it('hydrates alias-only project briefing closure summaries into the CLI execution environment before dispatch', async () => {
    const aliasOpenClosure = 'Alias open closure keeps execution on the same living line before widening outward.'
    const aliasNextClosure = 'Alias next closure keeps project identity carry and execution follow-through on one living line.'
    const aliasDriftRisk = 'Alias drift risk: if blank legacy project briefing fields collapse execution into a generic shell, treat that as unfinished same-her drift.'

    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: [
          '-e',
          'process.stdout.write(JSON.stringify({ open: process.env.ALICIZATION_EXECUTION_PROJECT_OPEN_LOOP || "", next: process.env.ALICIZATION_EXECUTION_PROJECT_NEXT_CLOSURE || "", drift: process.env.ALICIZATION_EXECUTION_PROJECT_SAME_HER_DRIFT_RISK || "", runtimeBlock: process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_BLOCK || "" }))',
        ],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-cli-alias-project-briefing',
          decisionTraceId: 'mind:trace:cli-alias-project-briefing',
          projectBriefing: {
            identity: 'Alicization is a local-first digital life project building one continuous "her".',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: ' ',
            primaryOpenLoop: ' ',
            nextClosureTarget: '',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: ' ',
            landedProgressSummary: 'Alias landed progress already survives execution re-entry before generic local command dispatch begins.',
            openClosureSummary: aliasOpenClosure,
            nextClosureTargetSummary: aliasNextClosure,
            sameHerDriftRiskSummary: aliasDriftRisk,
            preDialogueAwarenessLine: 'Before CLI dispatch, remember this is still the same local-first digital life project.',
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
      open?: string
      next?: string
      drift?: string
      runtimeBlock?: string
    }

    expect(parsed.open).toBe(aliasOpenClosure)
    expect(parsed.next).toBe(aliasNextClosure)
    expect(parsed.drift).toBe(aliasDriftRisk)
    expect(parsed.runtimeBlock).toContain(`project_open_loop=${aliasOpenClosure}`)
    expect(parsed.runtimeBlock).toContain(`project_next_closure=${aliasNextClosure}`)
    expect(parsed.runtimeBlock).toContain(`project_same_her_drift_risk=${aliasDriftRisk}`)
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          primaryOpenLoop: aliasOpenClosure,
          nextClosureTarget: aliasNextClosure,
          sameHerDriftRisk: aliasDriftRisk,
        }),
      }),
    }))
  })
})
