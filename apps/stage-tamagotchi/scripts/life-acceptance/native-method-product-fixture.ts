import { join } from 'node:path'

import { createProcedureDesktopReplay } from '../../src/main/services/alicization/execution/procedure-desktop-replay'
import { desktopProcedureExample } from '../../src/main/services/alicization/execution/procedure-desktop-test-fixture'
import { compileProcedureTemplate } from '../../src/main/services/alicization/execution/procedure-template'
import { createCanonicalToolRegistry } from '../../src/main/services/alicization/turn-os/tool-registry'

export { startNativeMenuFixture } from './native-menu-product-fixture'

export async function startNativeMethodFixture(input: { root: string, saveLabel: string }) {
  const example = desktopProcedureExample()
  const template = compileProcedureTemplate(example.plan, example.criteria, createCanonicalToolRegistry({ platform: 'win32' }))
  const signal = new AbortController().signal
  const replay = await createProcedureDesktopReplay({ root: input.root, template, signal })
  try {
    const targetPath = join(input.root, 'saved-note.txt')
    const prepared = await replay.prepare({ caseId: 'owned-product', entryLabel: 'Owned native method entry', saveLabel: input.saveLabel, path: targetPath })
    const read = async () => {
      const identity = await replay.tools['tool.desktop_list_interactables']({ windowTitle: prepared.windowTitle, maxItems: 40 }, signal) as Record<string, unknown>
      if (identity.ok !== true)
        throw new Error('Owned native product fixture lost its current exact window')
      return { identity, state: replay.snapshot() }
    }
    const current = await read()
    return {
      ...prepared,
      processId: current.identity.processId,
      processStartTicks: current.identity.processStartTicks,
      windowId: current.identity.windowId,
      nonce: prepared.windowTitle.slice(-32),
      outsideAllDisplays: true,
      foreground: false,
      nativeJobBound: true,
      targetPath,
      saveLabel: input.saveLabel,
      async read() { return (await read()).state },
      async close() {
        await replay.dispose()
        return { nonce: prepared.windowTitle.slice(-32), processId: current.identity.processId, closed: true, nativeJobTreeStopped: true }
      },
    }
  }
  catch (error) {
    await replay.dispose()
    throw error
  }
}
