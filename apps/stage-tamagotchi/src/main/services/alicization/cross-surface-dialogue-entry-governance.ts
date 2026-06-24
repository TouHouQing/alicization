import {
  collectRendererChatEntryGovernedFiles,
} from '../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit'
import {
  collectAlicizationChatEntryComposerSurfaceGovernedFiles,
} from './chat-entry-composer-surface-entrypoint-audit'
import {
  collectAlicizationPreDialogueTransportGovernedFiles,
} from './pre-dialogue-transport-entrypoint-audit'

export function resolveAlicizationCrossSurfaceDialogueEntryGovernedFiles() {
  return [
    ...new Set([
      ...collectAlicizationPreDialogueTransportGovernedFiles(),
      ...collectRendererChatEntryGovernedFiles(),
      ...collectAlicizationChatEntryComposerSurfaceGovernedFiles(),
    ]),
  ].sort()
}
