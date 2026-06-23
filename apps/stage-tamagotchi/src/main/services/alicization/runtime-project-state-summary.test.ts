import { describe, expect, it, vi } from 'vitest'

vi.mock('@moeru/eventa', () => ({
  defineEventa: vi.fn((name: string) => ({ name })),
  defineInvokeEventa: vi.fn((name: string) => ({ name })),
  defineInvokeHandler: vi.fn(),
}))

vi.mock('@moeru/eventa/adapters/electron/main', () => ({
  createContext: () => ({
    context: {
      emit: vi.fn(),
    },
  }),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/airi-runtime-should-not-be-used'),
    getLocale: vi.fn(() => 'zh-Hans'),
  },
  globalShortcut: {
    register: vi.fn(() => true),
    isRegistered: vi.fn(() => false),
    unregister: vi.fn(),
  },
  powerMonitor: {
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  desktopCapturer: {
    getSources: vi.fn(async () => []),
  },
  systemPreferences: {
    getMediaAccessStatus: vi.fn(() => 'granted'),
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
}))

vi.mock('../../libs/bootkit/lifecycle', () => ({
  onAppBeforeQuit: vi.fn(),
}))

vi.mock('./db', () => ({
  setupAlicizationDb: vi.fn(),
}))

vi.mock('@proj-alicization/electron-screen-capture/main', () => ({
  getScreenCaptureDiagnosticsForWebContentsId: vi.fn(() => null),
}))

const { runtimeTestInternals } = await import('./runtime')

describe('runtime project-state summary', () => {
  it('keeps host-corrected same-person continuity authority over generic progress recap pressure when merging visible-reply project-state audit sources', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    const mergedAudit = runtimeTestInternals.mergeVisibleReplyProjectStateAudit({
      primary: {
        sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        landedProgressSummary: 'Runtime project-state carry already survives into the visible reply merge path.',
        openClosureSummary: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
        nextClosureTargetSummary: 'Keep project identity, landed progress, and still-open closure on one same living line.',
        preDialogueAwarenessSummary: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        sameHerHoldDetail: genericProgressRecapPressure,
        preservedIntoRewrite: true,
        rewriteClosureApplied: false,
      },
      structured: {
        sameHerHoldDetail: correctedSamePersonAuthority,
      },
    })

    expect(mergedAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail: correctedSamePersonAuthority,
      continuitySummary: expect.stringContaining(`hold=${correctedSamePersonAuthority}`),
    }))
    expect(String(mergedAudit?.continuitySummary ?? '')).not.toContain(genericProgressRecapPressure)
  })
})
