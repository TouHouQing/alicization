import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

export interface KeyboardFixtureState {
  saves: number
  tabs: number
  escapes: number
  content: string
  focused: string | null
  focusCommand: string | null
  passive: boolean
  foreground: boolean
}

/** Observe one atomic fixture snapshot; sharing conflicts never replay input. */
export async function readKeyboardFixtureState(file: string, options: {
  deadline?: number
  now?: () => number
  readText?: (file: string) => Promise<string>
  wait?: (milliseconds: number) => Promise<unknown>
} = {}): Promise<KeyboardFixtureState> {
  const now = options.now ?? Date.now
  const deadline = options.deadline ?? now() + 1500
  const readText = options.readText ?? (file => readFile(file, 'utf8'))
  const wait = options.wait ?? delay
  let lastConflict: unknown
  const timeout = () => Object.assign(new Error('Owned fixture state observation exceeded its deadline', { cause: lastConflict }), { code: 'OWNED_FIXTURE_STATE_TIMEOUT' })
  for (;;) {
    if (now() >= deadline)
      throw timeout()
    try {
      const text = await readText(file)
      if (now() >= deadline)
        throw timeout()
      return JSON.parse(text) as KeyboardFixtureState
    }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || !['ENOENT', 'EBUSY'].includes(String(error.code)))
        throw error
      lastConflict = error
      if (now() >= deadline)
        throw timeout()
      await wait(Math.min(30, deadline - now()))
    }
  }
}
