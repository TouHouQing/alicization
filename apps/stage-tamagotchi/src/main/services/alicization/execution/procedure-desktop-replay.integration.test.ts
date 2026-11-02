import type { ProcedureCandidate } from './procedure-candidate-repository'

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

import { expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createProcedureDesktopReplay } from './procedure-desktop-replay'
import { desktopProcedureExample } from './procedure-desktop-test-fixture'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { compileProcedureTemplate } from './procedure-template'

it.skipIf(platform !== 'win32' || process.env.LIFE_QA_NATIVE_DESKTOP_METHOD !== '1')('independently identifies the exact passive owned native editor through real UIA', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-desktop-method-read-'))
  const source = desktopProcedureExample()
  const registry = createCanonicalToolRegistry({ platform: 'win32' })
  const template = compileProcedureTemplate(source.plan, source.criteria, registry)
  const signal = new AbortController().signal
  const replay = await createProcedureDesktopReplay({ root, template, signal })
  try {
    const directory = join(root, 'actual-input')
    await mkdir(directory)
    const current = await replay.prepare({ caseId: 'direct-read', entryLabel: 'Owned exact entry', saveLabel: 'Owned exact save', path: join(directory, 'note.txt') })
    const observed = await replay.tools['tool.desktop_list_interactables']({ windowTitle: current.windowTitle, maxItems: 40 }, signal)
    expect(observed, JSON.stringify(observed, null, 2)).toMatchObject({ ok: true, provider: 'bounded-standard-hwnd', title: current.windowTitle, elements: expect.arrayContaining([expect.objectContaining({ name: '', role: 'input' }), expect.objectContaining({ name: 'Owned exact save', role: 'button' })]) })
  }
  finally {
    await replay.dispose()
    await rm(root, { recursive: true, force: true })
  }
}, 35_000)

it.skipIf(platform !== 'win32' || process.env.LIFE_QA_NATIVE_DESKTOP_METHOD !== '1')('evaluates actual passive native editor input/save and independent negative outcomes without keyboard injection', async () => {
  const registry = createCanonicalToolRegistry({ platform: 'win32' })
  const source = desktopProcedureExample()
  const template = compileProcedureTemplate(source.plan, source.criteria, registry)
  const candidate = { id: 'owned-native-method', version: 'a'.repeat(64), templateHash: 'b'.repeat(64), template } as ProcedureCandidate
  const observed: unknown[] = []
  const factory: typeof createProcedureDesktopReplay = async (input) => {
    const actual = await createProcedureDesktopReplay(input)
    for (const id of ['tool.desktop_type_text', 'tool.desktop_click_element'] as const) {
      const perform = actual.tools[id]
      actual.tools[id] = async (input, signal) => {
        const outcome = await perform(input, signal)
        observed.push(outcome)
        return outcome
      }
    }
    return actual
  }
  const result = await evaluateProcedureCandidate('owned-native-candidate', candidate, registry, new AbortController().signal, undefined, undefined, factory)
  expect(result.cases, JSON.stringify({ result, observed }, null, 2)).toHaveLength(10)
  expect(result.status, JSON.stringify(result, null, 2)).toBe('passed')
  expect(result.evaluatorVersion).toBe('windows-desktop-replay-v1')
  expect(result.cases.filter(item => item.sample).map(item => item.sample)).toMatchObject([{ fulfilled: true, rework: 0, approvals: 0 }, { fulfilled: true, rework: 0, approvals: 0 }])
}, 180_000)
