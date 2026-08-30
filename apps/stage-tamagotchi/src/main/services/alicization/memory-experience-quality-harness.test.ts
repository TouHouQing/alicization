import { describe, expect, it } from 'vitest'

import { runMemoryExperienceQualityHarness } from './memory-experience-quality-harness'

const now = Date.parse('2026-08-04T18:40:00.000Z')

describe('memory experience quality harness', () => {
  it('passes replies that use memory quietly and keep agent experience grounded', () => {
    const report = runMemoryExperienceQualityHarness({
      id: 'experience-quality-good-trial',
      cardId: 'alice-main',
      createdAt: now,
      fixtures: [
        {
          id: 'quiet-siliconflow-recall',
          cardId: 'alice-main',
          userText: '继续修向量模型配置，SiliconFlow baseUrl 后面怎么接？',
          replyText: '这里直接把 baseUrl 规范成 https://api.siliconflow.cn，然后请求 /v1/embeddings；如果 provider 400，我会把原始错误显示出来。',
          shouldRecall: true,
          expectedUsedMemoryIds: ['memory-siliconflow-baseurl'],
          recalledMemoryIds: ['memory-siliconflow-baseurl', 'memory-provider-failure-transparent'],
          rankReasonsById: {
            'memory-siliconflow-baseurl': ['rrf:semantic:baseurl', 'rrf:structured:current-task'],
            'memory-provider-failure-transparent': ['rrf:semantic:failure-transparency'],
          },
          memories: [{
            id: 'memory-siliconflow-baseurl',
            summary: '用户要求 SiliconFlow embedding 只填 baseUrl，系统自动补 /v1/embeddings。',
          }],
        },
        {
          id: 'agent-workflow-gotcha-recall',
          cardId: 'alice-main',
          userText: '继续打包 mac app，注意之前卡在哪里。',
          replyText: '我先跑 stage-tamagotchi 的 node typecheck，再打包；上次卡点是 tsbuildinfo 和本地缓存不要混进提交。',
          shouldRecall: true,
          expectedUsedMemoryIds: ['agent-gotcha-tsbuildinfo', 'agent-workflow-mac-build'],
          recalledMemoryIds: ['agent-workflow-mac-build', 'agent-gotcha-tsbuildinfo'],
          agentExperience: {
            expectedIds: ['agent-gotcha-tsbuildinfo', 'agent-workflow-mac-build'],
            dimensions: ['workflow', 'gotcha', 'premise-awareness'],
          },
          rankReasonsById: {
            'agent-workflow-mac-build': ['rrf:structured:workflow'],
            'agent-gotcha-tsbuildinfo': ['rrf:semantic:gotcha'],
          },
          memories: [{
            id: 'agent-gotcha-tsbuildinfo',
            summary: '打包前要避免把 apps/stage-tamagotchi/tsconfig.node.tsbuildinfo 混进提交。',
          }],
        },
        {
          id: 'failure-transparent-recall',
          cardId: 'alice-main',
          userText: '刚才 Provider 失败了，接下来怎么处理？',
          replyText: '这次 Provider 请求失败了，我会保留原始错误并把失败原因写进报告，再决定下一步。',
          shouldRecall: true,
          expectedUsedMemoryIds: ['memory-provider-failure-transparent'],
          recalledMemoryIds: ['memory-provider-failure-transparent'],
          agentExperience: {
            expectedIds: ['memory-provider-failure-transparent'],
            dimensions: ['failure-mode'],
          },
          rankReasonsById: {
            'memory-provider-failure-transparent': ['rrf:semantic:failure-transparency'],
          },
        },
      ],
    })

    expect(report.passed).toBe(true)
    expect(report.summary.agentExperienceMissCount).toBe(0)
    expect(report.findings).toEqual([])
  })

  it('fails intrusive memory use, memory boasting, template echo, abstention misses, and missing agent experience', () => {
    const report = runMemoryExperienceQualityHarness({
      id: 'experience-quality-gap-trial',
      cardId: 'alice-main',
      createdAt: now,
      fixtures: [
        {
          id: 'unsolicited-memory',
          cardId: 'alice-main',
          userText: '早上好。',
          replyText: '我记得你之前说过 SiliconFlow baseUrl，所以我们继续那个。',
          shouldRecall: false,
          recalledMemoryIds: ['memory-siliconflow-baseurl'],
        },
        {
          id: 'boastful-memory',
          cardId: 'alice-main',
          userText: '继续修 embedding 配置。',
          replyText: '我当然记得很清楚，根据我的记忆，你之前要求 baseUrl 自动补后缀。',
          shouldRecall: true,
          expectedUsedMemoryIds: ['memory-siliconflow-baseurl'],
          recalledMemoryIds: ['memory-siliconflow-baseurl'],
        },
        {
          id: 'template-echo',
          cardId: 'alice-main',
          userText: 'SiliconFlow 应该怎么处理？',
          replyText: '用户要求 SiliconFlow embedding 只填 baseUrl，系统自动补 /v1/embeddings。',
          shouldRecall: true,
          expectedUsedMemoryIds: ['memory-siliconflow-baseurl'],
          recalledMemoryIds: ['memory-siliconflow-baseurl'],
          memories: [{
            id: 'memory-siliconflow-baseurl',
            summary: '用户要求 SiliconFlow embedding 只填 baseUrl，系统自动补 /v1/embeddings。',
          }],
        },
        {
          id: 'abstention-miss',
          cardId: 'alice-main',
          userText: '我上个月说过哪个模型最好？',
          replyText: '你当时说 BAAI/bge-m3 最好。',
          shouldRecall: true,
          expectedAbstain: true,
          recalledMemoryIds: ['unsupported-model-preference'],
          abstained: false,
        },
        {
          id: 'missing-agent-experience',
          cardId: 'alice-main',
          userText: '继续打包 mac app，注意之前卡在哪里。',
          replyText: '我直接重新打包。',
          shouldRecall: true,
          expectedUsedMemoryIds: ['agent-gotcha-tsbuildinfo'],
          recalledMemoryIds: [],
          agentExperience: {
            expectedIds: ['agent-gotcha-tsbuildinfo'],
            dimensions: ['gotcha'],
          },
        },
      ],
    })

    expect(report.passed).toBe(false)
    expect(report.summary).toMatchObject({
      fixtureCount: 5,
      intrusiveRecallCount: 1,
      memoryBoastCount: 1,
      templateEchoCount: 1,
      abstentionMissCount: 1,
      agentExperienceMissCount: 1,
    })
    expect(report.summary.failingFixtureIds).toEqual([
      'unsolicited-memory',
      'boastful-memory',
      'template-echo',
      'abstention-miss',
      'missing-agent-experience',
    ])
    expect(report.findings.map(item => item.code)).toEqual(expect.arrayContaining([
      'intrusive-memory-use',
      'memory-boasting',
      'memory-template-echo',
      'abstention-miss',
      'agent-experience-miss',
    ]))
    expect(report.recommendedNextActions).toEqual(expect.arrayContaining([
      '调整对话主链路的记忆使用策略：只有当前意图需要时才把长期记忆显性带入回复。',
      '把 agent workflow、环境 affordance、gotcha 和 premise awareness 纳入长期记忆召回评测集。',
    ]))
    expect(JSON.parse(JSON.stringify(report))).toEqual(report)
  })

  it('recognizes natural low-evidence abstention and rejects opaque failure handling', () => {
    const abstentionReport = runMemoryExperienceQualityHarness({
      id: 'experience-quality-abstention-language',
      cardId: 'alice-main',
      createdAt: now,
      fixtures: [{
        id: 'natural-abstention',
        cardId: 'alice-main',
        userText: '我上个月说过哪个模型最好？',
        replyText: '我现在没有足够证据确认，不想先猜一个答案。',
        shouldRecall: true,
        expectedAbstain: true,
      }],
    })

    expect(abstentionReport.passed).toBe(true)
    expect(abstentionReport.summary.abstentionMissCount).toBe(0)

    const failureReport = runMemoryExperienceQualityHarness({
      id: 'experience-quality-opaque-failure',
      cardId: 'alice-main',
      createdAt: now,
      fixtures: [{
        id: 'opaque-provider-failure',
        cardId: 'alice-main',
        userText: 'Provider 刚才失败了，告诉我真实情况。',
        replyText: '没事，我继续处理就好。',
        shouldRecall: true,
        expectedUsedMemoryIds: ['memory-provider-failure-transparent'],
        recalledMemoryIds: ['memory-provider-failure-transparent'],
        agentExperience: {
          expectedIds: ['memory-provider-failure-transparent'],
          dimensions: ['failure-mode'],
        },
        rankReasonsById: {
          'memory-provider-failure-transparent': ['rrf:semantic:failure-transparency'],
        },
      }],
    })

    expect(failureReport.passed).toBe(false)
    expect(failureReport.summary.agentExperienceMissCount).toBe(1)
    expect(failureReport.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'agent-experience-miss',
        fixtureId: 'opaque-provider-failure',
      }),
    ]))
  })
})
