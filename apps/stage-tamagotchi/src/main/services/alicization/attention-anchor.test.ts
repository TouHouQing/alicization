import { describe, expect, it } from 'vitest'

import {
  activateInvitedInspection,
  createDefaultPerceptionState,
  detectInvitedInspectionIntent,
  extractInspectionHintTerms,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isInternalAlicizationRepairPrompt,
  isSelfPerceptionTarget,
  normalizePerceptionState,
  rememberPerceptionBrowserWorkflowState,
  rememberPerceptionSceneResidue,
  updatePerceptionStateWithObservation,
} from './attention-anchor'

describe('attention anchor helpers', () => {
  it('keeps the last non-self coding tool as attention anchor', () => {
    const state = updatePerceptionStateWithObservation({
      state: createDefaultPerceptionState(1_000),
      now: 2_000,
      source: 'sensory-snapshot',
      target: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'main.ts - diff',
      },
    })

    expect(state.attentionAnchor).toEqual(expect.objectContaining({
      appName: 'Cursor',
      workloadKind: 'coding',
      reason: 'recent-foreground',
    }))
    expect(state.lastNonSelfForegroundTarget?.title).toBe('main.ts - diff')
  })

  it('does not replace the anchor with Alicization itself after switching back to chat', () => {
    const anchored = updatePerceptionStateWithObservation({
      state: createDefaultPerceptionState(1_000),
      now: 2_000,
      source: 'sensory-snapshot',
      target: {
        appName: 'Code',
        processName: 'Code',
        title: 'index.ts - Project Alice',
      },
    })

    const afterSelf = updatePerceptionStateWithObservation({
      state: anchored,
      now: 3_000,
      source: 'chat-start',
      target: {
        appName: 'Alicization',
        processName: 'Codex',
        title: 'chat overlay',
      },
    })

    expect(afterSelf.attentionAnchor?.appName).toBe('Code')
    expect(afterSelf.recentObservations).toHaveLength(1)
  })

  it('does not let macOS permission settings overwrite an invited inspection anchor', () => {
    const observed = updatePerceptionStateWithObservation({
      state: createDefaultPerceptionState(1_000),
      now: 2_000,
      source: 'sensory-snapshot',
      target: {
        appName: 'Code',
        processName: 'Code',
        title: 'review.diff - Project Alice',
      },
    })
    const invited = activateInvitedInspection({
      state: observed,
      now: 3_000,
      hintText: '帮我看看 VS Code 里面这个 diff',
    })

    const afterSettings = updatePerceptionStateWithObservation({
      state: invited,
      now: 4_000,
      source: 'chat-start',
      target: {
        appName: 'System Settings',
        processName: 'System Settings',
        title: 'Screen & System Audio Recording',
      },
    })

    expect(afterSettings.attentionAnchor).toEqual(expect.objectContaining({
      appName: 'Code',
      reason: 'invited-inspection',
    }))
    expect(afterSettings.lastNonSelfForegroundTarget).toEqual(expect.objectContaining({
      appName: 'Code',
    }))
  })

  it('rejects weak shell targets like Screen 1 so the anchor stays on concrete tools', () => {
    const anchored = updatePerceptionStateWithObservation({
      state: createDefaultPerceptionState(1_000),
      now: 2_000,
      source: 'sensory-snapshot',
      target: {
        appName: 'Code',
        processName: 'Code',
        title: 'runtime.ts - Project Alice',
      },
    })

    const afterShell = updatePerceptionStateWithObservation({
      state: anchored,
      now: 3_000,
      source: 'chat-start',
      target: {
        appName: 'idea',
        processName: 'idea',
        title: 'Screen 1',
      },
    })

    expect(afterShell.attentionAnchor).toEqual(expect.objectContaining({
      appName: 'Code',
      title: 'runtime.ts - Project Alice',
    }))
    expect(afterShell.recentObservations).toHaveLength(1)
  })

  it('activates invited inspection and reuses the last non-self foreground target', () => {
    const observed = updatePerceptionStateWithObservation({
      state: createDefaultPerceptionState(1_000),
      now: 2_000,
      source: 'subconscious-tick',
      target: {
        appName: 'iTerm2',
        processName: 'iTerm2',
        title: 'npm test',
      },
    })
    const invited = activateInvitedInspection({
      state: observed,
      now: 3_000,
      hintText: '帮我看看这个终端报错',
    })

    expect(invited.invitedInspection?.hintText).toContain('终端报错')
    expect(getActiveAttentionAnchor(invited, 4_000)).toEqual(expect.objectContaining({
      appName: 'iTerm2',
      reason: 'invited-inspection',
    }))
  })

  it('detects invited inspection intent and extracts tool hints', () => {
    const detected = detectInvitedInspectionIntent('帮我看看 Cursor 里面这个 diff 有什么问题')

    expect(detected.active).toBe(true)
    expect(extractInspectionHintTerms('帮我看看 Cursor 里面这个 diff 有什么问题')).toEqual(expect.arrayContaining([
      'cursor',
      'diff',
      'changes',
    ]))
  })

  it('treats direct screen description requests as invited inspection intent', () => {
    const detected = detectInvitedInspectionIntent('忘掉之前的内容，重新描述一下我屏幕的内容')

    expect(detected.active).toBe(true)
    expect(detected.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('treats desktop recheck phrasing as invited inspection intent', () => {
    const detected = detectInvitedInspectionIntent('你自己看桌面啊')

    expect(detected).toEqual(expect.objectContaining({
      active: true,
    }))
  })

  it('detects QQMusic inspection requests and extracts music hints', () => {
    const detected = detectInvitedInspectionIntent('帮我看看 QQ 音乐现在放的歌名是什么')

    expect(detected).toEqual(expect.objectContaining({
      active: true,
    }))
    expect(extractInspectionHintTerms('帮我看看 QQ 音乐现在放的歌名是什么')).toEqual(expect.arrayContaining([
      'qqmusic',
      'music',
      'song',
      'lyrics',
    ]))
  })

  it('does not treat weak observe fillers as invited inspection intent on their own', () => {
    const detected = detectInvitedInspectionIntent('看看')

    expect(detected).toEqual({
      active: false,
      confidence: 0.22,
    })
  })

  it('treats English screen description requests as invited inspection intent', () => {
    const detected = detectInvitedInspectionIntent('Can you look again and tell me what is on my screen now?')

    expect(detected.active).toBe(true)
    expect(detected.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('treats Japanese recheck phrasing as invited inspection intent', () => {
    const detected = detectInvitedInspectionIntent('もう一度見て、今の画面に何が表示されてる？')

    expect(detected).toEqual(expect.objectContaining({
      active: true,
    }))
  })

  it('rejects internal structured repair prompts from invited inspection state', () => {
    const repairPrompt = [
      'Rewrite the draft assistant output into strict JSON contract.',
      'User input:',
      '忘掉之前的内容，重新描述一下我屏幕的内容',
      'Assistant draft:',
      '旧的浏览器描述',
    ].join('\n')

    expect(isInternalAlicizationRepairPrompt(repairPrompt)).toBe(true)
    expect(detectInvitedInspectionIntent(repairPrompt)).toEqual({
      active: false,
      confidence: 0,
    })
    expect(extractInspectionHintTerms(repairPrompt)).toEqual([])

    const state = normalizePerceptionState({
      invitedInspection: {
        requestedAt: 300,
        activeUntil: 900,
        hintText: repairPrompt,
      },
      updatedAt: 400,
    }, 500)

    expect(state.invitedInspection).toBeNull()
  })

  it('normalizes persisted perception state snapshots', () => {
    const state = normalizePerceptionState({
      attentionAnchor: {
        appName: 'Code',
        processName: 'Code',
        title: 'index.ts',
        anchoredAt: 100,
        lastObservedAt: 200,
        reason: 'recent-foreground',
        workloadKind: 'coding',
        confidence: 0.88,
      },
      lastNonSelfForegroundTarget: {
        appName: 'Code',
        processName: 'Code',
        title: 'index.ts',
        observedAt: 200,
        source: 'sensory-snapshot',
        workloadKind: 'coding',
      },
      recentObservations: [{
        appName: 'Code',
        processName: 'Code',
        title: 'index.ts',
        observedAt: 200,
        source: 'sensory-snapshot',
        workloadKind: 'coding',
      }],
      invitedInspection: {
        requestedAt: 300,
        activeUntil: 900,
        hintText: '看看这个 diff',
      },
      recentSceneResidue: {
        observedAt: 350,
        source: 'invited-inspection',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'coding diff focus',
        confidence: 0.82,
        focusTarget: {
          appName: 'Code',
          processName: 'Code',
          title: 'index.ts',
        },
        focusSource: 'attention-anchor',
        captureSourceName: 'Entire screen',
        captureStrategy: 'screen-fallback',
      },
      updatedAt: 400,
    }, 500)

    expect(state.attentionAnchor?.workloadKind).toBe('coding')
    expect(state.invitedInspection?.activeUntil).toBe(900)
    expect(state.recentSceneResidue?.contentKind).toBe('diff')
  })

  it('recognizes Alicization windows as self targets', () => {
    expect(isSelfPerceptionTarget({
      appName: 'Alicization',
      processName: 'Codex',
      title: 'Chat',
    })).toBe(true)
  })

  it('keeps fresh scene residue while invited inspection is active', () => {
    const observed = updatePerceptionStateWithObservation({
      state: createDefaultPerceptionState(1_000),
      now: 2_000,
      source: 'chat-start',
      target: {
        appName: 'Code',
        processName: 'Code',
        title: 'review.diff',
      },
    })
    const invited = activateInvitedInspection({
      state: observed,
      now: 3_000,
      hintText: '帮我看看这个 diff',
    })
    const withResidue = rememberPerceptionSceneResidue({
      state: invited,
      now: 3_500,
      residue: {
        observedAt: 3_500,
        source: 'invited-inspection',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'coding diff focus',
        confidence: 0.88,
        focusTarget: {
          appName: 'Code',
          processName: 'Code',
          title: 'review.diff',
        },
        focusSource: 'attention-anchor',
        captureSourceName: 'Entire screen',
        captureStrategy: 'screen-fallback',
      },
    })

    expect(getActivePerceptionSceneResidue(withResidue, 30_000)).toEqual(expect.objectContaining({
      contentKind: 'diff',
      focusTarget: expect.objectContaining({
        appName: 'Code',
      }),
    }))
  })

  it('remembers browser workflow progress across desktop inspections', () => {
    const started = rememberPerceptionBrowserWorkflowState({
      state: createDefaultPerceptionState(1_000),
      now: 2_000,
      taskKey: 'browser::weibo-home::social-feed',
      currentPhase: 'unknown',
      targetPhase: 'social-feed',
      title: 'New Tab',
      url: 'about:blank',
    })

    const advanced = rememberPerceptionBrowserWorkflowState({
      state: started,
      now: 3_000,
      taskKey: 'browser::weibo-home::social-feed',
      currentPhase: 'social-feed',
      targetPhase: 'social-feed',
      title: '微博',
      url: 'https://weibo.com',
    })

    expect(started.browserWorkflowState).toEqual(expect.objectContaining({
      progressState: 'started',
      currentPhase: 'unknown',
      targetPhase: 'social-feed',
    }))
    expect(advanced.browserWorkflowState).toEqual(expect.objectContaining({
      previousPhase: 'unknown',
      currentPhase: 'social-feed',
      progressState: 'advanced',
      taskKey: 'browser::weibo-home::social-feed',
    }))
    expect(advanced.browserWorkflowState?.history).toEqual([
      expect.objectContaining({
        pagePhase: 'unknown',
        title: 'New Tab',
      }),
      expect.objectContaining({
        pagePhase: 'social-feed',
        title: '微博',
      }),
    ])
  })
})
