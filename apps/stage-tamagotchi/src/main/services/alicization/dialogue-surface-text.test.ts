import { describe, expect, it } from 'vitest'

import {
  sanitizeDialogueAnchorText,
  sanitizeDialogueSurfaceText,
} from './dialogue-surface-text'

describe('dialogue surface text', () => {
  it('preserves ordinary natural language without assigning authority to retired cue phrases', () => {
    expect(sanitizeDialogueAnchorText('先回答当前问题，再处理索引失败。'))
      .toBe('先回答当前问题，再处理索引失败。')
    expect(sanitizeDialogueSurfaceText('The current knot is the embedding index failure.'))
      .toBe('The current knot is the embedding index failure.')
  })

  it('still withholds serialized internal fact lines from provider-facing text', () => {
    const internalFactLine = [
      `${['opening', 'policy'].join('_')}=memory-led`,
      `${['relationship', 'cadence'].join('_')}=lower-pressure`,
    ].join('; ')

    expect(sanitizeDialogueSurfaceText(internalFactLine)).toBe('')
  })
})
