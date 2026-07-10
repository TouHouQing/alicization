import { shouldAttachAlicizationProjectStateContext } from '@proj-alicization/stage-shared'

export type PreDialogueProjectStateOrigin = 'ui-user' | 'tool-output' | 'context-recall' | 'system'

export function shouldAttachProjectStatePreDialogueIdentity(input: {
  latestUserText?: string | null
  origin?: PreDialogueProjectStateOrigin | null
}) {
  return shouldAttachAlicizationProjectStateContext(input)
}
