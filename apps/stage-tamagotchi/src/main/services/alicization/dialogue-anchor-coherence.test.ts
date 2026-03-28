import { describe, expect, it } from 'vitest'

import {
  anchorsMateriallyAlign,
  anchorsMateriallyConflict,
  resolveDialogueAnchorCoherence,
} from './dialogue-anchor-coherence'

describe('dialogue-anchor-coherence', () => {
  it('treats grounded scene anchors as dominant over stale carried threads', () => {
    const result = resolveDialogueAnchorCoherence({
      subject: 'visible-scene',
      screenReferenceMode: 'required',
      truthState: 'live-grounded',
      groundedThisTurn: true,
      hostMove: '你看看正在忙什么',
      candidates: [
        { role: 'focus', text: 'GitHub repository page for lingshu-ai-assistant' },
        { role: 'answer-intent', text: 'macOS crash report for Alicization app' },
        { role: 'carry', text: 'macOS crash report for Alicization app' },
      ],
    })

    expect(result.sceneAuthority).toBe(true)
    expect(result.dominant).toBe('GitHub repository page for lingshu-ai-assistant')
    expect(result.conflicting).toContain('macOS crash report for Alicization app')
  })

  it('keeps aligned coding anchors on the same line', () => {
    const result = resolveDialogueAnchorCoherence({
      subject: 'task-knot',
      screenReferenceMode: 'helpful',
      truthState: 'live-grounded',
      hostMove: '看看这个 diff 哪里有问题',
      candidates: [
        { role: 'scene', text: 'VS Code diff with a missing null guard in fetchUser().' },
        { role: 'answer-intent', text: 'Explain the missing null guard before suggesting edits.' },
        { role: 'thread', text: 'The current diff still needs a grounded explanation.' },
      ],
    })

    expect(result.dominant).toContain('VS Code diff')
    expect(result.aligned).toContain('Explain the missing null guard before suggesting edits.')
    expect(result.conflicting).toContain('The current diff still needs a grounded explanation.')
  })

  it('detects materially different anchors as conflicts', () => {
    expect(anchorsMateriallyAlign('GitHub markdown doc with AI architecture diagram', 'GitHub markdown doc with AI architecture diagram')).toBe(true)
    expect(anchorsMateriallyConflict('GitHub repository page for lingshu-ai-assistant', 'macOS crash report for Alicization app')).toBe(true)
  })
})
