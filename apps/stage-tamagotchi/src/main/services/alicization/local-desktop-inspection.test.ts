import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDesktopInspectionSceneSnapshot,
  buildAlicizationDesktopInspectionSuggestedActions,
  summarizeAlicizationDesktopInspection,
} from './local-desktop-inspection'

describe('local desktop inspection', () => {
  it('derives gui structure and next-step actions from desktop interactables even without semantic summary', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我判断下一步该点什么',
      foregroundWindow: {
        appName: 'Cursor',
        title: 'Publish Dialog',
      },
      focusTarget: null,
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'button', text: '继续', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'input', text: '标题', enabled: true, actions: [] },
      ],
    })

    expect(snapshot.guiStructure).toEqual(expect.objectContaining({
      interactableCount: 3,
      roleCounts: expect.objectContaining({
        button: 2,
        input: 1,
      }),
    }))
    expect(snapshot.guiStructure?.primaryActionCandidates[0]).toEqual(expect.objectContaining({
      role: 'button',
      text: '继续',
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '继续',
        role: 'button',
      }),
    }))
    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
      recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
    }))
  })

  it('prefers browser-first execution strategy for browser scenes', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '看看微博首页现在该点哪里',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '微博',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '微博',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.66,
          matchedLabels: ['weibo'],
          summary: 'weibo home feed',
        },
        source: {
          id: 'window:chrome',
          name: 'Google Chrome | 微博',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'link', text: '首页', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '发微博', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'browser-dom',
      recommendedChannel: 'browser',
      recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
    }))
    expect(snapshot.executionStrategy.rationale).toContain('浏览器')
  })

  it('derives social-feed phase and compose intent from a weibo home feed scene', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '看看微博首页现在下一步该做什么',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '微博',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '微博',
        source: 'foreground-window',
        confidence: 0.92,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.72,
          matchedLabels: ['weibo', 'feed'],
          summary: 'weibo home feed with compose entry',
        },
        source: {
          id: 'window:chrome-weibo-feed',
          name: 'Google Chrome | 微博',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://weibo.com',
        title: '微博',
        textExcerpt: '首页 关注 推荐 热搜 这里是微博首页信息流',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '首页',
            ariaLabel: null,
            title: null,
            href: 'https://weibo.com',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '关注',
            ariaLabel: null,
            title: null,
            href: 'https://weibo.com/follow',
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '发微博',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('social-feed')
    expect(snapshot.nextActionIntent).toBe('compose-post')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      targetPhase: 'form-entry',
      continuationMode: 'ready-to-act',
      advanceCondition: 'compose-editor-visible-or-post-form-opened',
      failureCondition: 'social-feed-still-visible-after-compose-attempt',
    }))
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '发微博',
        targetType: 'button',
      }),
    }))
  })

  it('derives social-feed phase and compose intent from a generic community home feed with a create-thread entry', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '看看这个社区首页现在下一步该做什么',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '社区广场',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '社区广场',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.74,
          matchedLabels: ['community', 'feed'],
          summary: 'community home feed with a visible create-thread entry',
        },
        source: {
          id: 'window:chrome-community-feed',
          name: 'Google Chrome | 社区广场',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/home',
        title: '社区广场',
        textExcerpt: '首页 关注 推荐 热门 这里是社区动态广场',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '首页',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/home',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '关注',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/following',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '推荐',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/discover',
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '创建帖子',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('social-feed')
    expect(snapshot.nextActionIntent).toBe('compose-post')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      targetPhase: 'form-entry',
      continuationMode: 'ready-to-act',
      advanceCondition: 'compose-editor-visible-or-post-form-opened',
      failureCondition: 'social-feed-still-visible-after-compose-attempt',
    }))
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '创建帖子',
        targetType: 'button',
      }),
    }))
  })

  it('prefers a true create-thread entry over generic post links on an english community feed', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: 'what should I click next on this community home page',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Community Home',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Community Home',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.73,
          matchedLabels: ['community', 'feed'],
          summary: 'community feed with a create thread entry and multiple post links',
        },
        source: {
          id: 'window:chrome-community-feed-en',
          name: 'Google Chrome | Community Home',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/home',
        title: 'Community Home',
        textExcerpt: 'Home Following Trending Top posts from the community',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Home',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/home',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Following',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/following',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Top posts',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/top',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'View post',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/post/1',
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: 'Create thread',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('social-feed')
    expect(snapshot.nextActionIntent).toBe('compose-post')
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: 'Create thread',
        targetType: 'button',
      }),
    }))
    expect(snapshot.suggestedActions).not.toContainEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: 'View post',
      }),
    }))
  })

  it('does not guess a generic primary link when a community feed lacks a real compose entry', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: 'what should I click next on this community home page',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Community Home',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Community Home',
        source: 'foreground-window',
        confidence: 0.89,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.72,
          matchedLabels: ['community', 'feed'],
          summary: 'community feed without a visible compose entry',
        },
        source: {
          id: 'window:chrome-community-feed-no-compose',
          name: 'Google Chrome | Community Home',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/home',
        title: 'Community Home',
        textExcerpt: 'Home Following Trending Top posts from the community',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Home',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/home',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Top posts',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/top',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'View post',
            ariaLabel: null,
            title: null,
            href: 'https://community.example.com/post/1',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('social-feed')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'observe-and-recheck',
      targetPhase: 'form-entry',
    }))
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      toolName: 'browser_read_page',
      arguments: expect.objectContaining({
        format: 'interactables',
        browser: 'chrome',
      }),
    }))
    expect(snapshot.suggestedActions).not.toContainEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: 'Home',
      }),
    }))
    expect(snapshot.suggestedActions).not.toContainEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: 'Top posts',
      }),
    }))
  })

  it('derives form-entry phase from a weibo compose editor with a single textbox', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续发微博',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '发微博',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '发微博',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.75,
          matchedLabels: ['weibo', 'compose'],
          summary: 'weibo compose editor',
        },
        source: {
          id: 'window:chrome-weibo-compose',
          name: 'Google Chrome | 发微博',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        textExcerpt: '有什么新鲜事想分享给大家？',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: '有什么新鲜事想分享给大家？',
            ariaLabel: '发微博输入框',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '发布',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('form-entry')
    expect(snapshot.nextActionIntent).toBe('fill-form')
    expect(snapshot.blockingSignals).toEqual(expect.arrayContaining([
      'awaiting-input',
    ]))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      targetPhase: 'content-detail',
    }))
  })

  it('prioritizes filling content before publish when compose editor is still awaiting input', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '下一步该做什么继续发微博',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '发微博',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '发微博',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.75,
          matchedLabels: ['weibo', 'compose'],
          summary: 'weibo compose editor',
        },
        source: {
          id: 'window:chrome-weibo-compose',
          name: 'Google Chrome | 发微博',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        textExcerpt: '有什么新鲜事想分享给大家？',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: '有什么新鲜事想分享给大家？',
            ariaLabel: '发微博输入框',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '发布',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:fill-current-form',
      title: '完成当前表单输入',
    }))
    expect(snapshot.suggestedActions[0]?.toolName).toBeUndefined()
  })

  it('prioritizes upload bridge before publish when compose editor should continue with image upload', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续发微博并上传图片',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '发微博',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '发微博',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.76,
          matchedLabels: ['weibo', 'compose', 'upload'],
          summary: 'weibo compose editor with image upload entry',
        },
        source: {
          id: 'window:chrome-weibo-compose-upload',
          name: 'Google Chrome | 发微博',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        textExcerpt: '有什么新鲜事想分享给大家？ 可以上传图片',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: '有什么新鲜事想分享给大家？',
            ariaLabel: '发微博输入框',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '上传图片',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '发布',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('form-entry')
    expect(snapshot.blockingSignals).not.toContain('awaiting-input')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'upload-flow',
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-upload-entry',
      title: '点击“上传图片”打开当前上传入口',
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '上传图片',
        targetType: 'button',
        browser: 'chrome',
        expectedPhase: 'browser-desktop-handoff',
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我继续发微博并上传图片',
      }),
    }))
  })

  it('prioritizes upload bridge before publish in a generic community composer with media entry', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续创建帖子并添加图片',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '创建帖子',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '创建帖子',
        source: 'foreground-window',
        confidence: 0.92,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.78,
          matchedLabels: ['community', 'compose', 'upload'],
          summary: 'community post composer with a media upload entry',
        },
        source: {
          id: 'window:chrome-community-compose-upload',
          name: 'Google Chrome | 创建帖子',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/compose',
        title: '创建帖子',
        textExcerpt: '分享点什么？ 可以添加图片',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: '分享点什么？',
            ariaLabel: '帖子输入框',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '添加图片',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '发布帖子',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('form-entry')
    expect(snapshot.blockingSignals).not.toContain('awaiting-input')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'upload-flow',
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-upload-entry',
      title: '点击“添加图片”打开当前上传入口',
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '添加图片',
        targetType: 'button',
        browser: 'chrome',
        expectedPhase: 'browser-desktop-handoff',
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我继续创建帖子并添加图片',
      }),
    }))
  })

  it('offers a safe browser reread before submit when upload flow has returned to the browser', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我完成文件上传',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Upload asset',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Upload asset',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: null,
      unavailableReason: 'screen-semantic-parse-failed',
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload asset',
        textExcerpt: 'Upload asset and finish the form.',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '上传',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('upload-flow')
    expect(snapshot.blockingSignals).toEqual(expect.arrayContaining([
      'awaiting-selection',
    ]))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      targetPhase: 'content-detail',
      repairActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_read_page',
          arguments: expect.objectContaining({
            format: 'text',
            browser: 'chrome',
          }),
        }),
      ]),
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_read_page',
      arguments: expect.objectContaining({
        format: 'text',
        browser: 'chrome',
      }),
    }))
  })

  it('keeps selected-image compose return pages in upload-flow even when the upload entry is no longer visible', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续发微博并上传图片',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '发微博',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '发微博',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: null,
      unavailableReason: 'screen-semantic-parse-failed',
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        textExcerpt: '已选择 1 张图片，继续补充微博内容或发布。',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '发布',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('upload-flow')
    expect(snapshot.blockingSignals).toEqual(expect.arrayContaining([
      'awaiting-selection',
    ]))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      targetPhase: 'content-detail',
      repairActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_read_page',
          arguments: expect.objectContaining({
            format: 'text',
            browser: 'chrome',
          }),
        }),
      ]),
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_read_page',
      arguments: expect.objectContaining({
        format: 'text',
        browser: 'chrome',
      }),
    }))
  })

  it('fills explicit weibo compose content without auto-submitting publish', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我在发微博输入框里输入 "今天继续推进 Alicization" 然后发布',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '发微博',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '发微博',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.75,
          matchedLabels: ['weibo', 'compose'],
          summary: 'weibo compose editor',
        },
        source: {
          id: 'window:chrome-weibo-compose',
          name: 'Google Chrome | 发微博',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        textExcerpt: '有什么新鲜事想分享给大家？',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: '有什么新鲜事想分享给大家？',
            ariaLabel: '发微博输入框',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '发布',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_type_text',
      arguments: expect.objectContaining({
        text: '今天继续推进 Alicization',
        targetText: '发微博',
        browser: 'chrome',
        submit: false,
      }),
    }))
    expect(snapshot.suggestedActions[0]?.arguments).toEqual(expect.not.objectContaining({
      expectedPhase: expect.anything(),
      reinspectAfterAction: true,
      autoContinueSuggestedActions: true,
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'fill-current-form',
        toolName: 'browser_type_text',
        arguments: expect.objectContaining({
          text: '今天继续推进 Alicization',
          submit: false,
        }),
      }),
      expect.objectContaining({
        id: 'advance-form-flow',
        toolName: 'browser_click_element',
        arguments: expect.objectContaining({
          text: '发布',
          targetType: 'button',
        }),
      }),
    ]))
  })

  it('derives form-entry from a generic community thread composer', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: 'help me continue this discussion draft',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Create thread',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Create thread',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.77,
          matchedLabels: ['community', 'compose'],
          summary: 'community thread composer',
        },
        source: {
          id: 'window:chrome-community-compose',
          name: 'Google Chrome | Create thread',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/threads/new',
        title: 'Create thread',
        textExcerpt: 'Start a new discussion in the community.',
        interactables: [
          {
            tag: 'input',
            role: 'textbox',
            type: 'text',
            text: 'Title',
            ariaLabel: 'Thread title',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: 'Write your discussion',
            ariaLabel: 'Discussion body',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: 'Create thread',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('form-entry')
    expect(snapshot.nextActionIntent).toBe('fill-form')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      targetPhase: 'content-detail',
    }))
  })

  it('fills explicit community composer content without auto-submitting create thread', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: 'type "Ship the new build tonight" into the discussion body and then create thread',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Create thread',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Create thread',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.78,
          matchedLabels: ['community', 'compose'],
          summary: 'community thread composer',
        },
        source: {
          id: 'window:chrome-community-compose',
          name: 'Google Chrome | Create thread',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/threads/new',
        title: 'Create thread',
        textExcerpt: 'Start a new discussion in the community.',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: 'Write your discussion',
            ariaLabel: 'Discussion body',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: 'Create thread',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_type_text',
      arguments: expect.objectContaining({
        text: 'Ship the new build tonight',
        targetText: 'Discussion body',
        browser: 'chrome',
        submit: false,
      }),
    }))
    expect(snapshot.suggestedActions[0]?.arguments).toEqual(expect.not.objectContaining({
      expectedPhase: expect.anything(),
      reinspectAfterAction: true,
      autoContinueSuggestedActions: true,
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'fill-current-form',
        toolName: 'browser_type_text',
        arguments: expect.objectContaining({
          text: 'Ship the new build tonight',
          submit: false,
        }),
      }),
      expect.objectContaining({
        id: 'advance-form-flow',
        toolName: 'browser_click_element',
        arguments: expect.objectContaining({
          text: 'Create thread',
          targetType: 'button',
        }),
      }),
    ]))
  })

  it('derives form-entry from a generic discussion composer without compose-specific summary labels', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: 'help me continue this discussion draft',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Start discussion',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Start discussion',
        source: 'foreground-window',
        confidence: 0.92,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.74,
          matchedLabels: ['community', 'discussion'],
          summary: 'community discussion draft',
        },
        source: {
          id: 'window:chrome-community-discussion-compose',
          name: 'Google Chrome | Start discussion',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/discussions/new',
        title: 'Start discussion',
        textExcerpt: 'Write your update for the community.',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: 'Write your update',
            ariaLabel: 'Discussion body',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: 'Start discussion',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('form-entry')
    expect(snapshot.nextActionIntent).toBe('fill-form')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      targetPhase: 'content-detail',
    }))
  })

  it('derives form-entry from a generic discussion composer without draft or compose wording', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: 'help me continue this community discussion',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Start discussion',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Start discussion',
        source: 'foreground-window',
        confidence: 0.92,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.72,
          matchedLabels: ['community', 'discussion'],
          summary: 'community conversation',
        },
        source: {
          id: 'window:chrome-community-discussion-no-draft',
          name: 'Google Chrome | Start discussion',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://community.example.com/discussions/new',
        title: 'Start discussion',
        textExcerpt: 'Write your update for the community.',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: 'Write your update',
            ariaLabel: 'Discussion body',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: 'Start discussion',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('form-entry')
    expect(snapshot.nextActionIntent).toBe('fill-form')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      targetPhase: 'content-detail',
    }))
  })

  it('surfaces DOM-level browser context and click candidates for browser scenes', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '下一步该点哪里继续登录',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Example Login',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Example Login',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.71,
          matchedLabels: ['login'],
          summary: 'example login page',
        },
        source: {
          id: 'window:chrome-login',
          name: 'Google Chrome | Example Login',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/login',
        title: 'Example Login',
        textExcerpt: 'Please sign in to continue.',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '登录',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '忘记密码',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/forgot',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.browserPageContext).toEqual(expect.objectContaining({
      browser: 'chrome',
      url: 'https://example.com/login',
      title: 'Example Login',
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '登录',
        targetType: 'button',
      }),
    }))
  })

  it('derives login page phase, auth intent, and blocking signals from browser DOM context', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续登录',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Example Login',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Example Login',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.7,
          matchedLabels: ['login'],
          summary: 'example login page',
        },
        source: {
          id: 'window:chrome-auth',
          name: 'Google Chrome | Example Login',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/login',
        title: 'Example Login',
        textExcerpt: 'Please sign in to continue with your email and password.',
        interactables: [
          {
            tag: 'input',
            role: 'textbox',
            type: 'email',
            text: '邮箱',
            ariaLabel: '邮箱',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'input',
            role: 'textbox',
            type: 'password',
            text: '密码',
            ariaLabel: '密码',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '登录',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('login')
    expect(snapshot.nextActionIntent).toBe('authenticate')
    expect(snapshot.blockingSignals).toEqual(expect.arrayContaining([
      'credential-required',
      'awaiting-input',
    ]))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'await-host-input',
      completionSignals: expect.arrayContaining([
        'navigation-away-from-login',
        'authenticated-home-visible',
      ]),
      blockingReasons: expect.arrayContaining(['credential-required']),
      targetPhase: 'content-detail',
      advanceCondition: 'credentials-submitted-and-login-ui-hidden',
      failureCondition: 'login-ui-still-visible-or-credential-rejected',
      reentryHint: expect.stringContaining('登录'),
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'fill-credentials',
        status: 'blocked',
      }),
      expect.objectContaining({
        id: 'submit-login',
        toolName: 'browser_click_element',
        postActionExpectedPhase: 'content-detail',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_read_page',
      arguments: expect.objectContaining({
        format: 'text',
      }),
    }))
  })

  it('suggests browser text entry with follow-up metadata when login input text is explicit in the question', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我在密码输入框里输入 "hunter2" 然后登录',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Example Login',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Example Login',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.7,
          matchedLabels: ['login'],
          summary: 'example login page',
        },
        source: {
          id: 'window:chrome-auth',
          name: 'Google Chrome | Example Login',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/login',
        title: 'Example Login',
        textExcerpt: 'Please sign in to continue with your email and password.',
        interactables: [
          {
            tag: 'input',
            role: 'textbox',
            type: 'email',
            text: '邮箱',
            ariaLabel: '邮箱',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'input',
            role: 'textbox',
            type: 'password',
            text: '密码',
            ariaLabel: '密码',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '登录',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_type_text',
      arguments: expect.objectContaining({
        text: 'hunter2',
        targetText: '密码',
        browser: 'chrome',
        submit: true,
        expectedPhase: 'content-detail',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我在密码输入框里输入 "hunter2" 然后登录',
        inspectionMaxSuggestedActions: 3,
      }),
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'fill-credentials',
        toolName: 'browser_type_text',
        arguments: expect.objectContaining({
          text: 'hunter2',
          targetText: '密码',
          browser: 'chrome',
          submit: false,
        }),
      }),
      expect.objectContaining({
        id: 'submit-login',
        toolName: 'browser_click_element',
        postActionExpectedPhase: 'content-detail',
      }),
    ]))
  })

  it('suggests browser search-box entry for natural-language on-page search requests without requiring quoted text', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我在站内搜索框里搜索 Alicization 闭环',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization Docs',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization Docs',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.73,
          matchedLabels: ['docs'],
          summary: 'documentation page with site search',
        },
        source: {
          id: 'window:chrome-docs-search',
          name: 'Google Chrome | Alicization Docs',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/docs',
        title: 'Alicization Docs',
        textExcerpt: 'Search the docs to find specific topics quickly.',
        interactables: [
          {
            tag: 'input',
            role: 'searchbox',
            type: 'search',
            text: '站内搜索',
            ariaLabel: '站内搜索',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '搜索',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_type_text',
      arguments: expect.objectContaining({
        text: 'Alicization 闭环',
        targetText: '站内搜索',
        browser: 'chrome',
        submit: true,
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我在站内搜索框里搜索 Alicization 闭环',
        inspectionMaxSuggestedActions: 3,
      }),
    }))
  })

  it('suggests browser search-box entry after page open even when the original question keeps the open-url prefix', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开 https://example.com/docs 然后在站内搜索框里搜索 Alicization 闭环',
      url: 'https://example.com/docs',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization Docs',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization Docs',
        source: 'foreground-window',
        confidence: 0.95,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.74,
          matchedLabels: ['docs'],
          summary: 'documentation page with site search',
        },
        source: {
          id: 'window:chrome-docs-opened',
          name: 'Google Chrome | Alicization Docs',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/docs',
        title: 'Alicization Docs',
        textExcerpt: 'Search the docs to find specific topics quickly.',
        interactables: [
          {
            tag: 'input',
            role: 'searchbox',
            type: 'search',
            text: '站内搜索',
            ariaLabel: '站内搜索',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '搜索',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_type_text',
      arguments: expect.objectContaining({
        text: 'Alicization 闭环',
        targetText: '站内搜索',
        browser: 'chrome',
        submit: true,
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我打开 https://example.com/docs 然后在站内搜索框里搜索 Alicization 闭环',
        inspectionMaxSuggestedActions: 3,
      }),
    }))
  })

  it('derives search-results page phase and next-step intent from browser DOM context', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我从百度结果里继续找',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.69,
          matchedLabels: ['search'],
          summary: 'baidu search results',
        },
        source: {
          id: 'window:chrome-search',
          name: 'Google Chrome | Alicization - 百度搜索',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://www.baidu.com/s?wd=alicization',
        title: 'Alicization - 百度搜索',
        textExcerpt: '百度为您找到相关结果约 10,000 个',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Alicization 官方文档',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/doc',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Alicization GitHub',
            ariaLabel: null,
            title: null,
            href: 'https://github.com/example',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Alicization 介绍',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/intro',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('search-results')
    expect(snapshot.nextActionIntent).toBe('open-search-result')
    expect(snapshot.blockingSignals).toEqual([])
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      completionSignals: expect.arrayContaining([
        'content-detail-visible',
        'url-changed-from-search-results',
      ]),
      targetPhase: 'content-detail',
      advanceCondition: 'search-result-opened-and-detail-page-visible',
      failureCondition: 'search-results-still-visible-after-click',
      reentryHint: expect.stringContaining('搜索结果'),
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-top-result',
        toolName: 'browser_click_element',
        status: 'ready',
        postActionExpectedPhase: 'content-detail',
      }),
      expect.objectContaining({
        id: 'wait-navigation',
        toolName: 'browser_wait',
        status: 'pending',
        postActionExpectedPhase: 'content-detail',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: 'Alicization 官方文档',
        targetType: 'link',
        expectedPhase: 'content-detail',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我从百度结果里继续找',
      }),
    }))
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      toolName: 'browser_wait',
      arguments: expect.objectContaining({
        state: 'complete',
        expectedPhase: 'content-detail',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我从百度结果里继续找',
      }),
    }))
  })

  it('prefers a real external result over search-engine navigation links on search-results pages', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我从百度结果里继续找',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.69,
          matchedLabels: ['search'],
          summary: 'baidu search results',
        },
        source: {
          id: 'window:chrome-search-external-result',
          name: 'Google Chrome | Alicization - 百度搜索',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://www.baidu.com/s?wd=alicization',
        title: 'Alicization - 百度搜索',
        textExcerpt: '百度为您找到相关结果约 10,000 个',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '视频',
            ariaLabel: null,
            title: null,
            href: 'https://www.baidu.com/sf/vsearch?pd=video&wd=alicization',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '图片',
            ariaLabel: null,
            title: null,
            href: 'https://image.baidu.com/search/index?word=alicization',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Alicization 官方文档',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/doc',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '下一页',
            ariaLabel: null,
            title: null,
            href: 'https://www.baidu.com/s?wd=alicization&pn=10',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('search-results')
    expect(snapshot.nextActionIntent).toBe('open-search-result')
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: 'Alicization 官方文档',
        targetType: 'link',
      }),
    }))
    expect(snapshot.suggestedActions[0]?.arguments).toEqual(expect.not.objectContaining({
      text: '视频',
    }))
    expect(snapshot.suggestedActions[0]?.arguments).toEqual(expect.not.objectContaining({
      text: '下一页',
    }))
  })

  it('continues to the next search-results page when no stable external result is visible yet', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我从百度结果里继续找',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.69,
          matchedLabels: ['search'],
          summary: 'baidu search results without stable external result yet',
        },
        source: {
          id: 'window:chrome-search-next-page',
          name: 'Google Chrome | Alicization - 百度搜索',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://www.baidu.com/s?wd=alicization',
        title: 'Alicization - 百度搜索',
        textExcerpt: '百度为您找到相关结果约 10,000 个',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '视频',
            ariaLabel: null,
            title: null,
            href: 'https://www.baidu.com/sf/vsearch?pd=video&wd=alicization',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '图片',
            ariaLabel: null,
            title: null,
            href: 'https://image.baidu.com/search/index?word=alicization',
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '下一页',
            ariaLabel: null,
            title: null,
            href: 'https://www.baidu.com/s?wd=alicization&pn=10',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('search-results')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'search-results',
      advanceCondition: 'search-results-page-advanced-and-new-results-visible',
      failureCondition: 'search-results-page-did-not-advance',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-next-search-results-page',
        toolName: 'browser_click_element',
        status: 'ready',
        postActionExpectedPhase: 'search-results',
        arguments: expect.objectContaining({
          text: '下一页',
          targetType: 'link',
        }),
      }),
      expect.objectContaining({
        id: 'wait-next-search-results-page',
        toolName: 'browser_wait',
        status: 'pending',
        postActionExpectedPhase: 'search-results',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '下一页',
        targetType: 'link',
        expectedPhase: 'search-results',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我从百度结果里继续找',
      }),
    }))
  })

  it('treats a button-style more-results control as a valid search-results pagination step', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续找这个搜索结果',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization - Google 搜索',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization - Google 搜索',
        source: 'foreground-window',
        confidence: 0.95,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.72,
          matchedLabels: ['search'],
          summary: 'search results with a button-style more results control',
        },
        source: {
          id: 'window:chrome-search-more-button',
          name: 'Google Chrome | Alicization - Google 搜索',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://www.google.com/search?q=alicization',
        title: 'Alicization - Google 搜索',
        textExcerpt: '页面底部出现一个更多结果按钮，但还没有稳定暴露出目标结果。',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '更多结果',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'search-results',
      advanceCondition: 'search-results-page-advanced-and-new-results-visible',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-next-search-results-page',
        toolName: 'browser_click_element',
        status: 'ready',
        postActionExpectedPhase: 'search-results',
        arguments: expect.objectContaining({
          text: '更多结果',
          targetType: 'button',
        }),
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '更多结果',
        targetType: 'button',
        browser: 'chrome',
        expectedPhase: 'search-results',
      }),
    }))
  })

  it('scrolls search-results pages locally when no stable result or pagination entry is visible yet but more results can load', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续找这个搜索结果',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization - Google 搜索',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization - Google 搜索',
        source: 'foreground-window',
        confidence: 0.95,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.72,
          matchedLabels: ['search'],
          summary: 'continuous search results still loading more entries',
        },
        source: {
          id: 'window:chrome-search-scroll',
          name: 'Google Chrome | Alicization - Google 搜索',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://www.google.com/search?q=alicization',
        title: 'Alicization - Google 搜索',
        textExcerpt: '搜索结果仍在继续，页面底部还能继续加载更多内容。',
        scrollState: {
          offsetY: 1400,
          viewportHeight: 900,
          documentHeight: 5200,
          canScrollDown: true,
          canScrollUp: true,
        },
        interactables: [
          {
            tag: 'div',
            role: 'generic',
            type: null,
            text: '相关搜索',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('search-results')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'search-results',
      advanceCondition: 'search-results-scrolled-and-new-results-visible',
      failureCondition: 'search-results-did-not-advance-after-scroll',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'scroll-search-results',
        toolName: 'browser_scroll',
        status: 'ready',
        postActionExpectedPhase: 'search-results',
        arguments: expect.objectContaining({
          action: 'down',
          amount: 1,
        }),
      }),
      expect.objectContaining({
        id: 'wait-scrolled-search-results',
        toolName: 'browser_wait',
        status: 'pending',
        postActionExpectedPhase: 'search-results',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_scroll',
      arguments: expect.objectContaining({
        action: 'down',
        amount: 1,
        browser: 'chrome',
        expectedPhase: 'search-results',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我继续找这个搜索结果',
      }),
    }))
  })

  it('treats search-box refinement on a search-results page as another search-results hop before opening a result', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我在搜索框里搜索 Alicization 官方文档',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization - 百度搜索',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.7,
          matchedLabels: ['search'],
          summary: 'baidu search results with editable search box',
        },
        source: {
          id: 'window:chrome-search-refine',
          name: 'Google Chrome | Alicization - 百度搜索',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://www.baidu.com/s?wd=alicization',
        title: 'Alicization - 百度搜索',
        textExcerpt: '百度为您找到相关结果约 10,000 个',
        interactables: [
          {
            tag: 'input',
            role: 'searchbox',
            type: 'search',
            text: '搜索',
            ariaLabel: '搜索',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: 'Alicization 官方文档',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/doc',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_type_text',
      arguments: expect.objectContaining({
        text: 'Alicization 官方文档',
        targetText: '搜索',
        browser: 'chrome',
        submit: true,
        expectedPhase: 'search-results',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我在搜索框里搜索 Alicization 官方文档',
        inspectionMaxSuggestedActions: 3,
      }),
    }))
  })

  it('switches browser scenes into desktop handoff mode when native dialog-like controls appear', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '下一步该点什么完成上传',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Choose File',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Choose File',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.62,
          matchedLabels: ['upload'],
          summary: 'browser file picker dialog',
        },
        source: {
          id: 'window:chrome-file-picker',
          name: 'Google Chrome | Choose File',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'button', text: '打开', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'input', text: '文件名', enabled: true, actions: [] },
      ],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload',
        textExcerpt: 'Select a file to upload.',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '选择文件',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'browser-desktop-handoff',
      recommendedChannel: 'desktop',
      recommendedToolNames: ['desktop_wait', 'desktop_click_element', 'desktop_type_text', 'desktop_list_interactables'],
    }))
    expect(snapshot.pagePhase).toBe('browser-desktop-handoff')
    expect(snapshot.nextActionIntent).toBe('confirm-dialog')
    expect(snapshot.blockingSignals).toEqual(expect.arrayContaining(['desktop-dialog-visible']))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'handoff-to-desktop',
      completionSignals: expect.arrayContaining([
        'dialog-dismissed',
        'upload-flow-returned-to-browser',
      ]),
      targetPhase: 'upload-flow',
      advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
      failureCondition: 'native-dialog-still-blocking-browser-flow',
      reentryHint: expect.stringContaining('原生对话框'),
      repairActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'desktop_list_interactables',
        }),
      ]),
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'stabilize-native-dialog',
        toolName: 'desktop_wait',
        status: 'ready',
      }),
      expect.objectContaining({
        id: 'confirm-dialog-primary-action',
        toolName: 'desktop_click_element',
        postActionExpectedPhase: 'upload-flow',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_wait',
      arguments: expect.objectContaining({
        titleIncludes: 'Choose File',
      }),
    }))
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '打开',
        role: 'button',
        expectedPhase: 'upload-flow',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '下一步该点什么完成上传',
      }),
    }))
  })

  it('suggests desktop text entry with follow-up metadata when dialog input text is explicit in the question', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我在文件名输入框里输入 "demo.png" 然后打开',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Choose File',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Choose File',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.62,
          matchedLabels: ['upload'],
          summary: 'browser file picker dialog',
        },
        source: {
          id: 'window:chrome-file-picker',
          name: 'Google Chrome | Choose File',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'button', text: '打开', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'input', text: '文件名', enabled: true, actions: [] },
      ],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload',
        textExcerpt: 'Select a file to upload.',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '选择文件',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_type_text',
      arguments: expect.objectContaining({
        text: 'demo.png',
        targetText: '文件名',
        submit: true,
        expectedPhase: 'upload-flow',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我在文件名输入框里输入 "demo.png" 然后打开',
        inspectionMaxSuggestedActions: 3,
      }),
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'type-dialog-input',
        toolName: 'desktop_type_text',
        status: 'ready',
        arguments: expect.objectContaining({
          text: 'demo.png',
          targetText: '文件名',
          submit: false,
        }),
      }),
      expect.objectContaining({
        id: 'confirm-dialog-primary-action',
        toolName: 'desktop_click_element',
        postActionExpectedPhase: 'upload-flow',
      }),
    ]))
  })

  it('suggests desktop search-box entry for natural-language in-app search requests without requiring quoted text', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我在搜索框里搜索 Alice',
      foregroundWindow: {
        appName: 'WeChat',
        title: '微信',
      },
      focusTarget: {
        appName: 'WeChat',
        title: '微信',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'input', text: '搜索', enabled: true, actions: [] },
        { ordinal: 2, role: 'list-item', text: '聊天', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_type_text',
      arguments: expect.objectContaining({
        text: 'Alice',
        targetText: '搜索',
        submit: true,
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我在搜索框里搜索 Alice',
        inspectionMaxSuggestedActions: 3,
      }),
    }))
  })

  it('suggests desktop search-box entry after app launch even when the original question keeps the open-app prefix', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开微信然后搜索 Alice',
      foregroundWindow: {
        appName: 'WeChat',
        title: '微信',
      },
      focusTarget: {
        appName: 'WeChat',
        title: '微信',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'input', text: '搜索', enabled: true, actions: [] },
        { ordinal: 2, role: 'list-item', text: '最近聊天', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_type_text',
      arguments: expect.objectContaining({
        text: 'Alice',
        targetText: '搜索',
        submit: true,
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        inspectionQuestion: '帮我打开微信然后搜索 Alice',
        inspectionMaxSuggestedActions: 3,
      }),
    }))
  })

  it('builds a stronger generic desktop dialog workflow for cross-software input and primary action sequences', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我在标题输入框里输入 "发布说明" 然后点击继续',
      foregroundWindow: {
        appName: 'Cursor',
        title: 'Publish Dialog',
      },
      focusTarget: {
        appName: 'Cursor',
        title: 'Publish Dialog',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'button', text: '继续', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'input', text: '标题', enabled: true, actions: [] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
      recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_type_text',
      arguments: expect.objectContaining({
        text: '发布说明',
        targetText: '标题',
        submit: true,
      }),
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-dialog-advanced-or-follow-up-scene-identified',
      failureCondition: 'desktop-dialog-still-visible-or-primary-action-not-committed',
      repairActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'desktop_list_interactables',
        }),
      ]),
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'fill-desktop-dialog-input',
        toolName: 'desktop_type_text',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '发布说明',
          targetText: '标题',
          submit: false,
        }),
      }),
      expect.objectContaining({
        id: 'advance-desktop-dialog',
        toolName: 'desktop_click_element',
        status: 'pending',
        arguments: expect.objectContaining({
          text: '继续',
          role: 'button',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-dialog-follow-up-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
        arguments: expect.objectContaining({
          maxItems: 12,
        }),
      }),
    ]))
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      kind: 'workflow-step:advance-desktop-dialog',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '继续',
        role: 'button',
      }),
    }))
  })

  it('builds a checkbox-first desktop settings workflow for explicit toggle requests', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开麦克风权限开关然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Privacy & Security',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Privacy & Security',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'checkbox', text: '麦克风权限', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-toggle-committed-or-follow-up-scene-identified',
      failureCondition: 'desktop-toggle-not-applied-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'toggle-desktop-setting',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '麦克风权限',
          role: 'checkbox',
        }),
      }),
      expect.objectContaining({
        id: 'confirm-desktop-setting-change',
        toolName: 'desktop_click_element',
        status: 'pending',
        arguments: expect.objectContaining({
          text: '完成',
          role: 'button',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-setting-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:toggle-desktop-setting',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '麦克风权限',
        role: 'checkbox',
      }),
    }))
  })

  it('builds a setting-item-first desktop workflow for explicit enable requests without toggle wording', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我启用开发者模式然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Developer Options',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Developer Options',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'menu-item', text: '开发者模式', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-toggle-committed-or-follow-up-scene-identified',
      failureCondition: 'desktop-toggle-not-applied-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'toggle-desktop-setting',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '开发者模式',
          role: 'menu-item',
        }),
      }),
      expect.objectContaining({
        id: 'confirm-desktop-setting-change',
        toolName: 'desktop_click_element',
        status: 'pending',
        arguments: expect.objectContaining({
          text: '完成',
          role: 'button',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-setting-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:toggle-desktop-setting',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '开发者模式',
        role: 'menu-item',
      }),
    }))
  })

  it('builds a selection-first desktop settings workflow for explicit choose requests', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我切换到简体中文然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Language & Region',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Language & Region',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'menu-item', text: 'English', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'menu-item', text: '简体中文', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-setting-selection-committed-or-follow-up-scene-identified',
      failureCondition: 'desktop-setting-selection-not-applied-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'select-desktop-setting-item',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '简体中文',
          role: 'menu-item',
        }),
      }),
      expect.objectContaining({
        id: 'confirm-desktop-setting-selection',
        toolName: 'desktop_click_element',
        status: 'pending',
        arguments: expect.objectContaining({
          text: '完成',
          role: 'button',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-setting-selection-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:select-desktop-setting-item',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '简体中文',
        role: 'menu-item',
      }),
    }))
  })

  it('builds a radio-first desktop settings workflow for explicit mode selection requests', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我切换到深色模式然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Appearance',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Appearance',
        source: 'foreground-window',
        confidence: 0.92,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'radio', text: '浅色模式', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'radio', text: '深色模式', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-setting-selection-committed-or-follow-up-scene-identified',
      failureCondition: 'desktop-setting-selection-not-applied-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'select-desktop-setting-item',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '深色模式',
          role: 'radio',
        }),
      }),
      expect.objectContaining({
        id: 'confirm-desktop-setting-selection',
        toolName: 'desktop_click_element',
        status: 'pending',
        arguments: expect.objectContaining({
          text: '完成',
          role: 'button',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-setting-selection-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:select-desktop-setting-item',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '深色模式',
        role: 'radio',
      }),
    }))
  })

  it('builds a selector-first desktop workflow before selection items become visible', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我把首选语言切换到简体中文然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Language & Region',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Language & Region',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'select', text: '首选语言', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-selector-opened-or-selection-options-visible',
      failureCondition: 'desktop-selector-not-opened-or-selection-options-still-hidden',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-desktop-selector',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '首选语言',
          role: 'select',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-selector-options',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-desktop-selector',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '首选语言',
        role: 'select',
      }),
    }))
  })

  it('builds a selector-first desktop workflow for menu-button style selectors', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我把导出格式切换到 PNG 然后点击完成',
      foregroundWindow: {
        appName: 'Preview',
        title: 'Export',
      },
      focusTarget: {
        appName: 'Preview',
        title: 'Export',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'menu-button', text: '导出格式', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-selector-opened-or-selection-options-visible',
      failureCondition: 'desktop-selector-not-opened-or-selection-options-still-hidden',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-desktop-selector',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '导出格式',
          role: 'select',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-selector-options',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
  })

  it('builds a tab-first desktop workflow before follow-up setting actions become visible', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我切换到隐私标签页然后启用麦克风权限再点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Settings',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Settings',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'tab', text: '通用', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'tab', text: '隐私', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-tab-switched-or-follow-up-scene-identified',
      failureCondition: 'desktop-tab-switch-not-applied-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'switch-desktop-tab',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '隐私',
          role: 'tab',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-tab-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:switch-desktop-tab',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '隐私',
        role: 'tab',
      }),
    }))
  })

  it('builds a list-item-first desktop workflow before follow-up setting actions become visible', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开隐私侧边栏然后启用麦克风权限再点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Settings',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Settings',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'list-item', text: '通用', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'list-item', text: '隐私', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
    }))
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-navigation-item-opened-or-follow-up-scene-identified',
      failureCondition: 'desktop-navigation-item-not-opened-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-desktop-navigation-item',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '隐私',
          role: 'list-item',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-navigation-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-desktop-navigation-item',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '隐私',
        role: 'list-item',
      }),
    }))
  })

  it('prefers coding executor strategy for coding and error scenes', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '看看这个报错该怎么修',
      foregroundWindow: {
        appName: 'Cursor',
        title: 'runtime.ts',
      },
      focusTarget: {
        appName: 'Cursor',
        title: 'runtime.ts',
        source: 'foreground-window',
        confidence: 0.9,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'coding',
          confidence: 0.97,
          matchedLabels: ['cursor'],
        },
        content: {
          kind: 'error',
          confidence: 0.92,
          matchedLabels: ['typescript'],
          summary: 'TypeScript error in runtime.ts',
        },
        source: {
          id: 'window:cursor',
          name: 'Cursor | runtime.ts',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'coding-investigation',
      recommendedChannel: 'codex',
      recommendedToolNames: ['executor_run_codex', 'executor_run_claude_code', 'executor_run_cli'],
    }))
    expect(snapshot.executionStrategy.rationale).toContain('编码')
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      toolName: 'executor_run_codex',
      arguments: expect.objectContaining({
        kind: 'codebase-investigation',
        effect: 'observe',
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        reinspectAfterAction: true,
        inspectionMaxSuggestedActions: 3,
      }),
    }))
    const codexAction = snapshot.suggestedActions.find(action => action.toolName === 'executor_run_codex')
    expect(codexAction?.arguments).toEqual(expect.objectContaining({
      prompt: expect.stringContaining('TypeScript error in runtime.ts'),
      goal: expect.stringContaining('Investigate visible coding scene'),
      inspectionQuestion: 'Codex 调查当前代码/报错后现在界面到了哪一步',
    }))
    const claudeAction = snapshot.suggestedActions.find(action => action.toolName === 'executor_run_claude_code')
    expect(claudeAction?.arguments).toEqual(expect.objectContaining({
      prompt: expect.stringContaining('TypeScript error in runtime.ts'),
      kind: 'codebase-investigation',
      effect: 'observe',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
      reinspectAfterAction: true,
      inspectionMaxSuggestedActions: 3,
      inspectionQuestion: 'Claude Code 调查当前代码/报错后现在界面到了哪一步',
    }))
  })

  it('suggests cli investigation for terminal error scenes before codex fallback when a visible command can be inferred', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '看下这个终端报错',
      foregroundWindow: {
        appName: 'iTerm2',
        title: 'pnpm test',
      },
      focusTarget: {
        appName: 'iTerm2',
        title: 'pnpm test',
        source: 'foreground-window',
        confidence: 0.87,
      },
      capture: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'terminal',
          confidence: 0.94,
          matchedLabels: ['terminal'],
        },
        content: {
          kind: 'error',
          confidence: 0.9,
          matchedLabels: ['test failed'],
          summary: 'pnpm test failed with stack trace',
        },
        source: {
          id: 'window:iterm',
          name: 'iTerm2 | pnpm test',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'terminal-investigation',
      recommendedChannel: 'cli',
      recommendedToolNames: ['executor_run_cli', 'executor_run_codex', 'executor_run_claude_code'],
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'executor_run_cli',
      arguments: expect.objectContaining({
        command: 'pnpm',
        args: ['test'],
        effect: 'observe',
        goal: expect.stringContaining('Investigate visible terminal scene'),
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 1,
        reinspectAfterAction: true,
        inspectionMaxSuggestedActions: 3,
        inspectionQuestion: 'CLI 调查可见终端命令后现在界面到了哪一步',
      }),
    }))
    const codexAction = snapshot.suggestedActions.find(action => action.toolName === 'executor_run_codex')
    expect(codexAction?.arguments).toEqual(expect.objectContaining({
      kind: 'codebase-investigation',
      effect: 'observe',
      prompt: expect.stringContaining('pnpm test failed with stack trace'),
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
      reinspectAfterAction: true,
      inspectionMaxSuggestedActions: 3,
      inspectionQuestion: 'Codex 调查当前终端报错后现在界面到了哪一步',
    }))
    const claudeAction = snapshot.suggestedActions.find(action => action.toolName === 'executor_run_claude_code')
    expect(claudeAction?.arguments).toEqual(expect.objectContaining({
      kind: 'codebase-investigation',
      effect: 'observe',
      prompt: expect.stringContaining('pnpm test failed with stack trace'),
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
      reinspectAfterAction: true,
      inspectionMaxSuggestedActions: 3,
      inspectionQuestion: 'Claude Code 调查当前终端报错后现在界面到了哪一步',
    }))
  })

  it('mentions structured controls in the inspection summary when semantic grounding is unavailable', () => {
    const summary = summarizeAlicizationDesktopInspection({
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Privacy & Security',
      },
      focusTarget: null,
      summary: null,
      unavailableReason: 'screen-semantic-weak-summary',
      guiStructure: {
        enabledInteractableCount: 4,
        interactableCount: 4,
        roleCounts: {
          button: 2,
          input: 1,
          checkbox: 1,
        },
        primaryActionCandidates: [],
        primaryInputCandidates: [],
      },
    })

    expect(summary).toContain('4 interactable controls')
    expect(summary).toContain('button:2')
    expect(summary).toContain('screen-semantic-weak-summary')
  })

  it('mentions browser page context when semantic grounding is unavailable but DOM context exists', () => {
    const summary = summarizeAlicizationDesktopInspection({
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Example Login',
      },
      focusTarget: null,
      summary: null,
      unavailableReason: 'screen-semantic-weak-summary',
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/login',
        title: 'Example Login',
        textExcerpt: 'Please sign in to continue.',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '登录',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '忘记密码',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/forgot',
            disabled: false,
          },
        ],
      },
      guiStructure: null,
    })

    expect(summary).toContain('Example Login')
    expect(summary).toContain('https://example.com/login')
    expect(summary).toContain('2 browser interactables')
    expect(summary).toContain('screen-semantic-weak-summary')
  })

  it('mentions workflow advancement in the inspection summary for browser tasks', () => {
    const summary = summarizeAlicizationDesktopInspection({
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档',
      },
      focusTarget: null,
      summary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.96,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.74,
          matchedLabels: ['content'],
          summary: 'Alicization content detail page',
        },
        source: {
          id: 'window:chrome-doc',
          name: 'Google Chrome | Alicization 官方文档',
          strategy: 'app-name',
        },
      },
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['content-goal-met'],
        blockingReasons: [],
        advanceCondition: 'content-read-complete-or-next-primary-action-identified',
        failureCondition: 'content-goal-still-unclear-after-reread',
        repairActions: [],
        reentryHint: '继续读取正文和可交互元素，再决定下一步。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::baidu-search::content-detail',
        currentPhase: 'content-detail',
        previousPhase: 'search-results',
        progressState: 'advanced',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'search-results',
            title: 'Alicization - 百度搜索',
            url: 'https://www.baidu.com/s?wd=alicization',
          },
          {
            observedAt: 2,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Alicization 官方文档',
        url: 'https://example.com/doc',
      },
      unavailableReason: null,
      guiStructure: null,
    })

    expect(summary).toContain('Workflow advanced from search-results to content-detail.')
  })

  it('prioritizes low-risk continuation actions on content-detail pages before rereading the page', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续看这个页面',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: {
        analyzedAt: 3,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.8,
          matchedLabels: ['content'],
          summary: 'Alicization content detail page',
        },
        source: {
          id: 'window:chrome-content-detail',
          name: 'Google Chrome | Alicization 官方文档',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
        textExcerpt: '这里是 Alicization 的正文内容，当前已经打开详情页。',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '继续阅读',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '目录',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/toc',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('content-detail')
    expect(snapshot.nextActionIntent).toBe('continue-browsing')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'content-detail',
      advanceCondition: 'content-read-complete-or-next-primary-action-identified',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'advance-content-detail',
        toolName: 'browser_click_element',
        status: 'ready',
        postActionExpectedPhase: 'content-detail',
      }),
      expect.objectContaining({
        id: 'continue-page-reading',
        toolName: 'browser_read_page',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:advance-content-detail',
      toolName: 'browser_click_element',
      arguments: expect.objectContaining({
        text: '继续阅读',
        targetType: 'button',
        expectedPhase: 'content-detail',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
        inspectionQuestion: '帮我继续看这个页面',
      }),
    }))
    expect(snapshot.suggestedActions).toContainEqual(expect.objectContaining({
      kind: 'workflow-step:continue-page-reading',
      toolName: 'browser_read_page',
      arguments: expect.objectContaining({
        format: 'text',
        browser: 'chrome',
      }),
    }))
  })

  it('suggests scrolling content-detail pages before rereading when continuation is requested and the page can keep moving', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我继续看这个页面',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档',
        source: 'foreground-window',
        confidence: 0.95,
      },
      capture: null,
      summary: {
        analyzedAt: 3,
        workload: {
          kind: 'browser',
          confidence: 0.97,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.82,
          matchedLabels: ['content'],
          summary: 'Alicization content detail page',
        },
        source: {
          id: 'window:chrome-content-detail',
          name: 'Google Chrome | Alicization 官方文档',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
        textExcerpt: '这里是 Alicization 的正文内容，页面还没有看到新的延续按钮，但正文显然还没结束。',
        scrollState: {
          offsetY: 480,
          viewportHeight: 920,
          documentHeight: 3600,
          canScrollDown: true,
          canScrollUp: true,
        },
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '目录',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/toc',
            disabled: false,
          },
        ],
      },
    })

    expect(snapshot.pagePhase).toBe('content-detail')
    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'content-detail',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'scroll-content-detail',
        toolName: 'browser_scroll',
        status: 'ready',
        postActionExpectedPhase: 'content-detail',
      }),
      expect.objectContaining({
        id: 'continue-page-reading',
        toolName: 'browser_read_page',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:scroll-content-detail',
      toolName: 'browser_scroll',
      arguments: expect.objectContaining({
        action: 'down',
        amount: 1,
        browser: 'chrome',
        expectedPhase: 'content-detail',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
        inspectionQuestion: '帮我继续看这个页面',
      }),
    }))
  })

  it('suggests browser_search_web as a direct entry action for explicit search requests', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我百度搜索 Alicization 本地执行闭环',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: '新标签页',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: '新标签页',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: {
        analyzedAt: 4,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.52,
          matchedLabels: ['blank-tab'],
          summary: 'blank browser tab',
        },
        source: {
          id: 'window:chrome-new-tab',
          name: 'Google Chrome | 新标签页',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'chrome://newtab/',
        title: '新标签页',
        textExcerpt: '新标签页',
        interactables: [],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_search_web',
      arguments: expect.objectContaining({
        query: 'Alicization 本地执行闭环',
        searchEngine: 'baidu',
        browser: 'chrome',
        expectedPhase: 'search-results',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        inspectionQuestion: '帮我百度搜索 Alicization 本地执行闭环',
      }),
    }))
  })

  it('prefers opening the requested site before searching when the question asks to open a website and then search inside it', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开微博然后搜索 Alicization',
      site: 'weibo',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.75,
      },
      capture: null,
      summary: {
        analyzedAt: 10,
        workload: {
          kind: 'unknown',
          confidence: 0.72,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.41,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_open_url',
      arguments: expect.objectContaining({
        site: 'weibo',
        autoContinueSuggestedActions: true,
        reinspectAfterAction: true,
        inspectionQuestion: '帮我打开微博然后搜索 Alicization',
      }),
    }))
  })

  it('suggests browser_open_url for known website opening requests before generic reread actions', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开微博',
      site: 'weibo',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.74,
      },
      capture: null,
      summary: {
        analyzedAt: 5,
        workload: {
          kind: 'unknown',
          confidence: 0.71,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.4,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_open_url',
      arguments: expect.objectContaining({
        site: 'weibo',
        autoContinueSuggestedActions: true,
        reinspectAfterAction: true,
        inspectionQuestion: '帮我打开微博',
      }),
    }))
  })

  it('does not infer a website target from the free-form inspection question', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开微博',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.74,
      },
      capture: null,
      summary: {
        analyzedAt: 5,
        workload: {
          kind: 'unknown',
          confidence: 0.71,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.4,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions).not.toContainEqual(expect.objectContaining({
      toolName: 'browser_open_url',
      arguments: expect.objectContaining({
        site: 'weibo',
      }),
    }))
  })

  it('suggests browser_navigate for explicit refresh requests before generic browser reread actions', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我刷新当前页面然后继续',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档',
        source: 'foreground-window',
        confidence: 0.93,
      },
      capture: null,
      summary: {
        analyzedAt: 5,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.8,
          matchedLabels: ['content'],
          summary: 'Alicization content detail page',
        },
        source: {
          id: 'window:chrome-content-detail',
          name: 'Google Chrome | Alicization 官方文档',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
        textExcerpt: '这里是 Alicization 的正文内容。',
        interactables: [],
      },
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'browser_navigate',
      arguments: expect.objectContaining({
        action: 'reload',
        browser: 'chrome',
        expectedPhase: 'content-detail',
        autoContinueSuggestedActions: true,
        reinspectAfterAction: true,
        inspectionQuestion: '帮我刷新当前页面然后继续',
      }),
    }))
  })

  it('suggests desktop_open_application for explicit cross-software launch requests', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开微信',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.73,
      },
      capture: null,
      summary: {
        analyzedAt: 6,
        workload: {
          kind: 'unknown',
          confidence: 0.72,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.4,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_open_application',
      arguments: expect.objectContaining({
        appName: '微信',
        autoContinueSuggestedActions: true,
        reinspectAfterAction: true,
        inspectionQuestion: '帮我打开微信',
      }),
    }))
  })

  it('suggests desktop_open_application first for cross-software multihop requests that start from opening a target app', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开系统设置然后进入隐私再打开麦克风权限',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.71,
      },
      capture: null,
      summary: {
        analyzedAt: 8,
        workload: {
          kind: 'unknown',
          confidence: 0.7,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.38,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_open_application',
      arguments: expect.objectContaining({
        appName: '系统设置',
        autoContinueSuggestedActions: true,
        reinspectAfterAction: true,
        inspectionQuestion: '帮我打开系统设置然后进入隐私再打开麦克风权限',
      }),
    }))
  })

  it('suggests desktop_open_application first for cross-software app-search requests instead of falling back to web search', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开微信然后搜索 Alice',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.72,
      },
      capture: null,
      summary: {
        analyzedAt: 9,
        workload: {
          kind: 'unknown',
          confidence: 0.71,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.39,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_open_application',
      arguments: expect.objectContaining({
        appName: '微信',
        autoContinueSuggestedActions: true,
        reinspectAfterAction: true,
        inspectionQuestion: '帮我打开微信然后搜索 Alice',
      }),
    }))
  })

  it('trims trailing post-launch observation phrasing when extracting desktop application names', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开微信后看看现在能操作什么',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.72,
      },
      capture: null,
      summary: {
        analyzedAt: 10,
        workload: {
          kind: 'unknown',
          confidence: 0.71,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.39,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_open_application',
      arguments: expect.objectContaining({
        appName: '微信',
        inspectionQuestion: '帮我打开微信后看看现在能操作什么',
      }),
    }))
  })

  it('builds a generic destination-first desktop workflow for entering a target settings area without explicit sidebar wording', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我进入隐私再打开麦克风权限',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Settings',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Settings',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'list-item', text: '通用', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'list-item', text: '隐私', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-destination-opened-or-follow-up-scene-identified',
      failureCondition: 'desktop-destination-not-opened-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-desktop-destination',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '隐私',
          role: 'list-item',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-destination-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-desktop-destination',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '隐私',
        role: 'list-item',
      }),
    }))
  })

  it('still prioritizes entering the requested desktop destination before toggling when both controls are already visible', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我先进入隐私再打开麦克风权限',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Settings',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Settings',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'list-item', text: '通用', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'list-item', text: '隐私', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'checkbox', text: '麦克风权限', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
      ],
    })

    expect(snapshot.workflowPlan).toEqual(expect.objectContaining({
      continuationMode: 'ready-to-act',
      targetPhase: 'unknown',
      advanceCondition: 'desktop-destination-opened-or-follow-up-scene-identified',
      failureCondition: 'desktop-destination-not-opened-or-follow-up-scene-unclear',
    }))
    expect(snapshot.workflowPlan.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'open-desktop-destination',
        toolName: 'desktop_click_element',
        status: 'ready',
        arguments: expect.objectContaining({
          text: '隐私',
          role: 'list-item',
        }),
      }),
      expect.objectContaining({
        id: 'recheck-desktop-destination-scene',
        toolName: 'desktop_list_interactables',
        status: 'pending',
      }),
    ]))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-desktop-destination',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '隐私',
        role: 'list-item',
      }),
    }))
  })

  it('suggests desktop_press_keys for explicit shortcut requests before generic scene stabilization', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我按下 command+l',
      foregroundWindow: {
        appName: 'Finder',
        title: 'Desktop',
      },
      focusTarget: {
        appName: 'Finder',
        title: 'Desktop',
        source: 'foreground-window',
        confidence: 0.7,
      },
      capture: null,
      summary: {
        analyzedAt: 7,
        workload: {
          kind: 'unknown',
          confidence: 0.68,
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'doc',
          confidence: 0.36,
          matchedLabels: ['desktop'],
          summary: 'desktop idle scene',
        },
        source: {
          id: 'window:finder-desktop',
          name: 'Finder | Desktop',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [],
    })

    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_press_keys',
      arguments: expect.objectContaining({
        shortcut: 'command+l',
        autoContinueSuggestedActions: true,
        reinspectAfterAction: true,
        inspectionQuestion: '帮我按下 command+l',
      }),
    }))
  })

  it('does not re-suggest desktop_press_keys after shortcut workflow already advanced and fresh controls are visible', () => {
    const snapshot = buildAlicizationDesktopInspectionSuggestedActions({
      question: '帮我按下 command+l 然后继续看现在能操作什么',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档（地址栏已聚焦）',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档（地址栏已聚焦）',
        source: 'foreground-window',
        confidence: 0.92,
      },
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
        textExcerpt: '地址栏已经聚焦。',
        interactables: [],
      },
      guiStructure: {
        interactableCount: 2,
        enabledInteractableCount: 2,
        roleCounts: {
          input: 1,
          button: 1,
        },
        primaryActionCandidates: [
          { ordinal: 2, role: 'button', text: '刷新', enabled: true },
        ],
        primaryInputCandidates: [
          { ordinal: 1, role: 'input', text: '地址栏', enabled: true },
        ],
      },
      executionStrategy: {
        mode: 'desktop-dialog',
        recommendedChannel: 'desktop',
        recommendedToolNames: ['desktop_list_interactables', 'desktop_type_text', 'desktop_click_element'],
        confidence: 0.88,
        rationale: '快捷键后先列出当前桌面控件最稳。',
      },
      pagePhase: 'unknown',
      nextActionIntent: 'focus-address-bar',
      summary: {
        analyzedAt: 8,
        workload: {
          kind: 'browser',
          confidence: 0.91,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.62,
          matchedLabels: ['browser'],
          summary: 'browser page after focusing the address bar',
        },
        source: {
          id: 'window:chrome-address-bar',
          name: 'Google Chrome | Alicization 官方文档',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['target-control-identified'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'next-desktop-control-identified',
        failureCondition: 'target-control-still-unclear',
        reentryHint: '先列出当前控件，再确认要输入或点击的位置。',
        steps: [],
        targetPhase: 'unknown',
      },
      workflowState: {
        taskKey: 'desktop::browser::address-bar',
        currentPhase: 'unknown',
        previousPhase: 'unknown',
        progressState: 'advanced',
        targetPhase: 'unknown',
        history: [
          {
            observedAt: 1,
            pagePhase: 'unknown',
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
          {
            observedAt: 2,
            pagePhase: 'unknown',
            title: 'Alicization 官方文档（地址栏已聚焦）',
            url: 'https://example.com/doc',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Alicization 官方文档（地址栏已聚焦）',
        url: 'https://example.com/doc',
      },
    })

    expect(snapshot[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_list_interactables',
    }))
    expect(snapshot.some(action => action.toolName === 'desktop_press_keys')).toBe(false)
  })

  it('does not re-suggest browser_navigate after a refresh workflow already advanced to the refreshed page', () => {
    const snapshot = buildAlicizationDesktopInspectionSuggestedActions({
      question: '帮我刷新当前页面然后继续',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档（刷新后）',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档（刷新后）',
        source: 'foreground-window',
        confidence: 0.92,
      },
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc?refresh=1',
        title: 'Alicization 官方文档（刷新后）',
        textExcerpt: '刷新后的页面已稳定。',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'button',
            text: '继续阅读',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
      guiStructure: {
        interactableCount: 1,
        enabledInteractableCount: 1,
        roleCounts: {
          button: 1,
        },
        primaryActionCandidates: [
          { ordinal: null, role: 'button', text: '继续阅读', enabled: true },
        ],
        primaryInputCandidates: [],
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_wait'],
        confidence: 0.9,
        rationale: '刷新后仍在内容页，继续读取或推进正文更稳。',
      },
      pagePhase: 'content-detail',
      summary: {
        analyzedAt: 11,
        workload: {
          kind: 'browser',
          confidence: 0.94,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.82,
          matchedLabels: ['content'],
          summary: 'refreshed browser content detail page',
        },
        source: {
          id: 'window:chrome-content-detail-refreshed',
          name: 'Google Chrome | Alicization 官方文档（刷新后）',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['content-goal-met'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'content-read-complete-or-next-primary-action-identified',
        failureCondition: 'content-goal-still-unclear-after-reread',
        reentryHint: '继续读取正文和可交互元素，再决定下一步。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::content-detail::content-detail',
        currentPhase: 'content-detail',
        previousPhase: 'content-detail',
        progressState: 'advanced',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
          {
            observedAt: 2,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档（刷新后）',
            url: 'https://example.com/doc?refresh=1',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Alicization 官方文档（刷新后）',
        url: 'https://example.com/doc?refresh=1',
      },
    })

    expect(snapshot.some(action => action.toolName === 'browser_navigate')).toBe(false)
    expect(snapshot[0]).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
    }))
  })

  it('prefers desktop_list_interactables over browser reread after a shortcut already shifted browser chrome focus', () => {
    const snapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我按下 command+l 然后继续看现在能操作什么',
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档（地址栏已聚焦）',
      },
      focusTarget: {
        appName: 'Google Chrome',
        title: 'Alicization 官方文档（地址栏已聚焦）',
        source: 'foreground-window',
        confidence: 0.94,
      },
      capture: null,
      summary: {
        analyzedAt: 9,
        workload: {
          kind: 'browser',
          confidence: 0.94,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.71,
          matchedLabels: ['browser'],
          summary: 'browser page after focusing the address bar',
        },
        source: {
          id: 'window:chrome-address-bar-focused',
          name: 'Google Chrome | Alicization 官方文档',
          strategy: 'app-name',
        },
      },
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'input', text: '地址栏', enabled: true, actions: [] },
        { ordinal: 2, role: 'button', text: '刷新', enabled: true, actions: ['AXPress'] },
      ],
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
        textExcerpt: '地址栏已经聚焦。',
        interactables: [],
      },
      workflowState: {
        taskKey: 'desktop::browser::address-bar',
        currentPhase: 'content-detail',
        previousPhase: 'content-detail',
        progressState: 'steady',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
          {
            observedAt: 2,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档（地址栏已聚焦）',
            url: 'https://example.com/doc',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Alicization 官方文档（地址栏已聚焦）',
        url: 'https://example.com/doc',
      },
    })

    expect(snapshot.pagePhase).toBe('unknown')
    expect(snapshot.nextActionIntent).toBe('focus-address-bar')
    expect(snapshot.executionStrategy).toEqual(expect.objectContaining({
      mode: 'desktop-dialog',
      recommendedChannel: 'desktop',
      recommendedToolNames: ['desktop_list_interactables', 'desktop_type_text', 'desktop_click_element'],
    }))
    expect(snapshot.suggestedActions[0]).toEqual(expect.objectContaining({
      toolName: 'desktop_list_interactables',
    }))
    expect(snapshot.suggestedActions.some(action => action.toolName === 'desktop_press_keys')).toBe(false)
  })

  it('mentions holding workflow state when browser progress is waiting on host input', () => {
    const summary = summarizeAlicizationDesktopInspection({
      foregroundWindow: {
        appName: 'Google Chrome',
        title: 'Example Login',
      },
      focusTarget: null,
      summary: {
        analyzedAt: 1,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.7,
          matchedLabels: ['login'],
          summary: 'example login page',
        },
        source: {
          id: 'window:chrome-login',
          name: 'Google Chrome | Example Login',
          strategy: 'app-name',
        },
      },
      workflowPlan: {
        continuationMode: 'await-host-input',
        completionSignals: ['navigation-away-from-login', 'authenticated-home-visible'],
        blockingReasons: ['credential-required', 'awaiting-input'],
        advanceCondition: 'credentials-submitted-and-login-ui-hidden',
        failureCondition: 'login-ui-still-visible-or-credential-rejected',
        repairActions: [],
        reentryHint: '先补齐凭据，再继续提交登录。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::login::content-detail',
        currentPhase: 'login',
        previousPhase: null,
        progressState: 'steady',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'login',
            title: 'Example Login',
            url: 'https://example.com/login',
          },
        ],
        lastInspectionAt: 1,
        updatedAt: 1,
        title: 'Example Login',
        url: 'https://example.com/login',
      },
      unavailableReason: null,
      guiStructure: null,
    })

    expect(summary).toContain('Workflow still holding on login awaiting host input.')
  })
})
