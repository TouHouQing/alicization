import { describe, expect, it } from 'vitest'

import { parseScreenSemanticSummary, pickScreenSemanticCaptureCandidate } from './proactive-screen-semantic'

describe('proactive screen semantic helpers', () => {
  it('prefers the matching foreground window source over screen fallback', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'index.ts - Project Alice',
      },
      sources: [
        { id: 'screen:0:0', name: 'Built-in Retina Display' } as any,
        { id: 'window:123:0', name: 'index.ts - Project Alice' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('window:123:0')
    expect(candidate?.strategy).toBe('window-title')
    expect(candidate?.focusTarget).toEqual(expect.objectContaining({
      appName: 'Visual Studio Code',
      title: 'index.ts - Project Alice',
      source: 'foreground-window',
    }))
  })

  it('falls back to a screen source when no window source matches', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'Unknown App',
        processName: 'Unknown',
        title: 'Untitled',
      },
      sources: [
        { id: 'screen:0:0', name: 'Studio Display' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('screen:0:0')
    expect(candidate?.strategy).toBe('screen-fallback')
    expect(candidate?.focusTarget).toEqual(expect.objectContaining({
      appName: 'Unknown App',
      title: 'Untitled',
    }))
  })

  it('prefers a concrete window over weak Screen N shell fallback even with stale weak anchors', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'idea',
        processName: 'idea',
        title: 'Screen 1',
      },
      attentionAnchor: {
        appName: 'idea',
        processName: 'idea',
        title: 'Screen 1',
      },
      sources: [
        { id: 'window:idea:0', name: 'runtime.ts - Project Alice - IntelliJ IDEA' } as any,
        { id: 'screen:1:0', name: 'Screen 1' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('window:idea:0')
    expect(candidate?.strategy).toBe('app-name')
  })

  it('prefers the anchored coding window even when the current foreground is Alicization itself', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'Alicization',
        processName: 'Codex',
        title: 'Chat Overlay',
      },
      attentionAnchor: {
        appName: 'Code',
        processName: 'Code',
        title: 'diff-view.ts - Project Alice',
      },
      hintTerms: ['vscode', 'code', 'diff'],
      avoidSourcePattern: /\b(?:alicization|codex)\b/i,
      sources: [
        { id: 'window:chat:0', name: 'Alicization Chat Overlay' } as any,
        { id: 'window:code:0', name: 'diff-view.ts - Project Alice' } as any,
        { id: 'screen:0:0', name: 'Built-in Retina Display' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('window:code:0')
    expect(candidate?.strategy).toBe('window-title')
    expect(candidate?.focusTarget).toEqual(expect.objectContaining({
      appName: 'Code',
      title: 'diff-view.ts - Project Alice',
      source: 'attention-anchor',
    }))
  })

  it('avoids permission or chat windows when the user explicitly asks about a code diff', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'WeChat',
        processName: 'WeChat',
        title: 'Screen & System Audio Recording',
      },
      attentionAnchor: {
        appName: 'WeChat',
        processName: 'WeChat',
        title: 'Screen & System Audio Recording',
      },
      hintTerms: ['vscode', 'diff', 'error'],
      sources: [
        { id: 'window:wechat:0', name: 'WeChat | Screen & System Audio Recording' } as any,
        { id: 'window:code:0', name: 'my-feature.diff - Visual Studio Code' } as any,
        { id: 'screen:0:0', name: 'Built-in Retina Display' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('window:code:0')
    expect(candidate?.strategy).toBe('window-title')
    expect(candidate?.focusTarget?.source).toBe('hint-terms')
  })

  it('hard-excludes the Alicization self window when an external focus target exists', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'Alicization',
        processName: 'Codex',
        title: 'Chat Overlay',
      },
      attentionAnchor: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'review.diff - Project Alice',
      },
      avoidSourcePattern: /\b(?:alicization|codex)\b/i,
      sources: [
        { id: 'window:self:0', name: 'Alicization Chat Overlay' } as any,
        { id: 'screen:0:0', name: 'Entire screen' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('screen:0:0')
    expect(candidate?.strategy).toBe('screen-fallback')
    expect(candidate?.focusTarget).toEqual(expect.objectContaining({
      appName: 'Cursor',
      title: 'review.diff - Project Alice',
      source: 'attention-anchor',
    }))
  })

  it('prefers the current QQMusic focus over stale browser observations', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'QQMusic',
        processName: 'QQMusic',
        title: 'Melt - QQMusic',
      },
      attentionAnchor: {
        appName: 'QQMusic',
        processName: 'QQMusic',
        title: 'Melt - QQMusic',
      },
      recentObservations: [{
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: '2760. 最长奇偶子数组 - 力扣（LeetCode）',
      }],
      sources: [
        { id: 'window:chrome:0', name: '2760. 最长奇偶子数组 - 力扣（LeetCode）' } as any,
        { id: 'window:qqmusic:0', name: 'Melt - QQMusic' } as any,
        { id: 'screen:1:0', name: 'Entire screen' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('window:qqmusic:0')
    expect(candidate?.focusTarget).toEqual(expect.objectContaining({
      appName: 'QQMusic',
      source: 'attention-anchor',
    }))
  })

  it('falls back to the whole screen when current media focus has no viable window match', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'QQMusic',
        processName: 'QQMusic',
        title: 'Melt - QQMusic',
      },
      attentionAnchor: {
        appName: 'QQMusic',
        processName: 'QQMusic',
        title: 'Melt - QQMusic',
      },
      recentObservations: [{
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: '2760. 最长奇偶子数组 - 力扣（LeetCode）',
      }],
      sources: [
        { id: 'window:chrome:0', name: '2760. 最长奇偶子数组 - 力扣（LeetCode）' } as any,
        { id: 'screen:1:0', name: 'Entire screen' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('screen:1:0')
    expect(candidate?.strategy).toBe('screen-fallback')
    expect(candidate?.focusTarget).toEqual(expect.objectContaining({
      appName: 'QQMusic',
      source: 'attention-anchor',
    }))
  })

  it('does not let weak browser-no-title anchors lock candidate selection', () => {
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: '',
      },
      attentionAnchor: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: '',
      },
      hintTerms: ['vscode', 'diff'],
      sources: [
        { id: 'window:code:0', name: 'review.diff - Visual Studio Code' } as any,
        { id: 'screen:1:0', name: 'Screen 1' } as any,
      ],
    })

    expect(candidate?.source.id).toBe('window:code:0')
  })

  it('parses valid structured screen semantic output', () => {
    const summary = parseScreenSemanticSummary({
      raw: JSON.stringify({
        workload: 'coding',
        content: 'error',
        summary: 'red TypeScript error panel',
        confidence: 0.88,
        matchedLabels: ['typescript-error', 'editor'],
      }),
      analyzedAt: 1_234,
      source: {
        id: 'window:123:0',
        name: 'index.ts - Project Alice',
        strategy: 'window-title',
      },
    })

    expect(summary).toEqual({
      workload: {
        kind: 'coding',
        confidence: 0.88,
        matchedLabels: ['typescript-error', 'editor'],
      },
      content: {
        kind: 'error',
        confidence: 0.88,
        matchedLabels: ['typescript-error', 'editor'],
        summary: 'red TypeScript error panel',
      },
      analyzedAt: 1_234,
      source: {
        id: 'window:123:0',
        name: 'index.ts - Project Alice',
        strategy: 'window-title',
      },
    })
  })
})
