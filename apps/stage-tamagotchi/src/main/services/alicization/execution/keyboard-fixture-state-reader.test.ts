import { expect, it, vi } from 'vitest'

import { readKeyboardFixtureState } from '../../../../../scripts/life-acceptance/read-keyboard-fixture-state'

const state = { saves: 1, tabs: 2, escapes: 0, content: 'Exact 中文🙂', focused: 'entry', focusCommand: 'owned', passive: false, foreground: true }
const conflict = (code: string) => Object.assign(new Error(code), { code })

it.each(['ENOENT', 'EBUSY'])('observes the same complete snapshot after a transient %s without any action callback', async (code) => {
  let now = 0
  const readText = vi.fn().mockRejectedValueOnce(conflict(code)).mockResolvedValueOnce(JSON.stringify(state))
  const wait = vi.fn(async (milliseconds: number) => {
    now += milliseconds
  })
  expect(await readKeyboardFixtureState('owned/fixture-state.json', { now: () => now, readText, wait })).toEqual(state)
  expect(readText.mock.calls).toEqual([['owned/fixture-state.json'], ['owned/fixture-state.json']])
  expect(wait.mock.calls).toEqual([[30]])
})

it('keeps repeated sharing conflicts inside the single original deadline', async () => {
  let now = 0
  const readText = vi.fn().mockRejectedValue(conflict('EBUSY'))
  const wait = vi.fn(async (milliseconds: number) => {
    now += milliseconds
  })
  await expect(readKeyboardFixtureState('owned/state.json', { deadline: 65, now: () => now, readText, wait })).rejects.toMatchObject({ code: 'OWNED_FIXTURE_STATE_TIMEOUT', cause: { code: 'EBUSY' } })
  expect(now).toBe(65)
  expect(readText).toHaveBeenCalledTimes(3)
  expect(wait.mock.calls).toEqual([[30], [30], [5]])
})

it('refuses malformed state immediately instead of waiting for unrelated replacement contents', async () => {
  const readText = vi.fn().mockResolvedValueOnce('{broken').mockResolvedValueOnce(JSON.stringify(state))
  const wait = vi.fn()
  await expect(readKeyboardFixtureState('owned/state.json', { readText, wait })).rejects.toBeInstanceOf(SyntaxError)
  expect(readText).toHaveBeenCalledOnce()
  expect(wait).not.toHaveBeenCalled()
})

it('does not reinterpret a permanent permission error as a sharing conflict', async () => {
  const error = conflict('EACCES')
  const readText = vi.fn().mockRejectedValue(error)
  const wait = vi.fn()
  await expect(readKeyboardFixtureState('owned/state.json', { readText, wait })).rejects.toBe(error)
  expect(readText).toHaveBeenCalledOnce()
  expect(wait).not.toHaveBeenCalled()
})

it('rejects even a complete snapshot when its read arrives after the shared deadline', async () => {
  let now = 0
  const readText = vi.fn(async () => {
    now = 101
    return JSON.stringify(state)
  })
  await expect(readKeyboardFixtureState('owned/state.json', { deadline: 100, now: () => now, readText })).rejects.toMatchObject({ code: 'OWNED_FIXTURE_STATE_TIMEOUT' })
  expect(readText).toHaveBeenCalledOnce()
})
