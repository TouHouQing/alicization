import type { SerializableDesktopCapturerSource } from '@proj-alicization/electron-screen-capture'

import { choosePreferredScreenCaptureSource, sortScreenCaptureSources } from '@proj-alicization/electron-screen-capture/source-policy'
import { describe, expect, it } from 'vitest'

function createSource(id: string, name: string): SerializableDesktopCapturerSource {
  return {
    id,
    name,
    display_id: '',
  }
}

describe('screen capture source policy', () => {
  it('prioritizes display sources over windows by default', () => {
    const sources = [
      createSource('window:2:0', 'Terminal'),
      createSource('screen:1:0', 'Display 1'),
      createSource('window:1:0', 'Browser'),
    ]

    const preferred = choosePreferredScreenCaptureSource(sources)
    expect(preferred?.id).toBe('screen:1:0')
  })

  it('uses keyword ranking to stabilize preferred display source', () => {
    const sources = [
      createSource('screen:2:0', 'Display 2'),
      createSource('screen:1:0', 'Entire Screen'),
      createSource('screen:3:0', 'Projector'),
    ]

    const preferred = choosePreferredScreenCaptureSource(sources, {
      preferredKinds: ['display'],
      preferredNameKeywords: ['entire', 'screen'],
    })

    expect(preferred?.id).toBe('screen:1:0')
  })

  it('returns deterministic order when kinds are the same', () => {
    const sources = [
      createSource('window:3:0', 'Zeta'),
      createSource('window:1:0', 'Alpha'),
      createSource('window:2:0', 'Alpha'),
    ]

    const sorted = sortScreenCaptureSources(sources, {
      preferredKinds: ['window'],
    })

    expect(sorted.map(source => source.id)).toEqual([
      'window:1:0',
      'window:2:0',
      'window:3:0',
    ])
  })
})
