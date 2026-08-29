import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('chat entry main chat dispatch', () => {
  it('routes the desktop main chat surface through the shared chat store', () => {
    const chatPageSource = readFileSync(new URL('../../../renderer/pages/chat.vue', import.meta.url), 'utf8')
    const interactiveAreaSource = readFileSync(new URL('../../../renderer/components/InteractiveArea.vue', import.meta.url), 'utf8')

    expect(chatPageSource).toContain('import InteractiveArea from \'../components/InteractiveArea.vue\'')
    expect(chatPageSource).toContain('<InteractiveArea')
    expect(interactiveAreaSource).toContain('import { useChatOrchestratorStore } from \'@proj-alicization/stage-ui/stores/chat\'')
    expect(interactiveAreaSource).toContain('const { ingest, discoverToolsCompatibility } = chatOrchestrator')
    expect(interactiveAreaSource).not.toContain('onAfterMessageComposed')
    expect(interactiveAreaSource).toContain('await ingest(textToSend, {')
    expect(interactiveAreaSource).toContain('origin: \'ui-user\'')
  })
})
