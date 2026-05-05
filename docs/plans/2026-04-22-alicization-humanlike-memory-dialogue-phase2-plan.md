# Alicization 真人记忆对话 Phase 2 开发计划

更新日期：2026-04-22

> 本文件已完成，现转为完成参考。
> 当前唯一活跃开发计划见 `2026-04-23-alicization-humanlike-memory-dialogue-phase3-plan.md`。
> `2026-04-20-alicization-humanlike-memory-dialogue-checklist.md` 视为上一阶段已完成清单。
> 后续继续开发时，不再向本文件追加任务。

## 目标

继续把 Alicization 推进到更接近真人的记忆对话闭环：

- 不是硬编码的时间检索器
- 不是固定规则模板回复
- 不是只会“搜记忆”，而是真的会“想起”
- 不是把记忆放进 prompt 就算完成，而是要让记忆改变心智与回答

最终必须满足：

- 记忆像真人一样进入心智：
  先决定要不要想起，再决定想起哪一段、哪种经验、哪条关系线
- 回忆像真人一样组织：
  不是扔碎片，而是能从时期、事件、关系节点、做法之间串联
- 回复像真人一样生成：
  所有正常用户可见回复都必须经过大模型心智思考生成
- 系统闭环真实成立：
  `memory -> mind -> dialogue -> outcome -> memory`

## 不可退让约束

- 用户可见回复不允许依赖固定规则模板作为正常路径。
- 正常路径下，用户可见回复必须经过大模型心智生成。
- deterministic / local-only 回复只能作为基础设施故障兜底。
- 不允许主动失忆、删记忆、靠删除制造“像人”。
- 人格成长必须建立在保留记忆、前景竞争、矛盾重构、场景唤起、关系含义改写上。
- 记忆候选可以由规则层生成，但最终 authority 必须是心智层。
- 回复层不允许用“我记得…… / 我隐约记得……”之类固定模板强塞答案；是否显式回忆、怎么显式，必须由心智层决定。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `commit: <hash>` 或 `evidence: <test/receipt>`
3. 如果范围变化，只更新本文件，不新增第二份活跃 plan
4. 如果新增测试，优先补到现有回归集，而不是只写一次性临时测试

## 已完成基线

上一阶段已完成：

- episodic event graph / provenance / recollection planner / recollection speech plan
- autobiographical summaries / host person model / procedural memory / outcome learning
- non-deletion salience prioritization / contradiction-aware reconstruction / mood-congruent recall
- place / scene attachment / silent recollection before speech
- browser fallback / session mirror / memory dialogue regression set

参考：

- `docs/plans/2026-04-20-alicization-humanlike-memory-dialogue-checklist.md`

## 验收总门槛

本阶段全部完成时，必须同时成立：

- Alicization 在“几天前我们聊过什么”“以前你是怎么帮我做这个的”“你为什么这次会这样回应我”“你记得我对这类事的敏感点吗”这类问题上，能表现出连续、非模板化、带不确定度控制的真人式回忆。
- 同一句用户话，在不同场景、关系张力、疲劳状态、任务线程下，会想起不同的记忆组合，而不是稳定落到同一条规则模板。
- 正常主路径下，回复必须是 LLM-authored mind reply，不允许 fallback 模板偷偷承担主回答。
- 很久以前的记忆不会因为 prune / archive / backend failure 而丢失，只会改变前景权重。

## P0：记忆进入心智的唯一 authority

- [x] 做 `memory deliberation` 独立层
说明：
在候选记忆生成之后、reply deliberation 之前，新增一层独立的记忆心智决策。
它至少要输出：
`shouldRecall`
`selectedPeriods`
`selectedEpisodes`
`selectedProcedures`
`selectedRelationshipLines`
`surfacePolicy`
`confidence`
`whyNow`
evidence: `runtime.ts` / `runtime-organic-memory-prompt.ts` / `runtime-organic-memory-prompt.test.ts`

- [x] 让 `memory deliberation` 成为唯一 recall authority
说明：
`recollectionIntent / recallGovernor / recollectionPlan / recollectionSpeechPlan` 继续保留，但它们只能提供候选与约束，不能越权决定最终“想起什么”。
最终 foreground memory bundle 必须由心智决策层收口。
evidence: `runtime-organic-memory-prompt.ts` / `main-chat-session-runtime.ts` / `runtime-organic-memory-prompt.test.ts` / `main-chat-session-runtime.test.ts`

- [x] 把 `memory deliberation` 接进完整主链
说明：
必须实接到：
`current-conscious-frame`
`reply-deliberator`
`answer-planner`
`dialogue-act-kernel`
`mind-turn-frame`
`chat governance`
而不是只停在 organic memory prompt。
evidence: `main-chat-session-runtime.ts` / `main-chat-session-runtime.test.ts` / `runtime-organic-memory-prompt.ts`

- [x] 让 `memory deliberation` 支持多跳回忆包
说明：
一次回忆不应该只选单条 episode。
需要支持：
`一个时期 + 一个事件 + 一个做法 + 一条关系含义`
这样的 linked bundle。
evidence: `runtime-soul.ts` / `runtime.ts` / `runtime-organic-memory-prompt.ts` / `main-chat-session-runtime.ts` / `runtime-organic-memory-prompt.test.ts`

- [x] 为 `memory deliberation` 建立回放回归
说明：
至少覆盖“同一句话在不同场景下想起不同内容”的对照测试。
例如：
`继续像之前那样做`
在 focused-work / late-night / relationship-repair / execution-callback 四种上下文下，不应总是召回同一条记忆。
evidence: `runtime-organic-memory-prompt.test.ts`

## P0：无损长期记忆运行时

- [x] 把长期记忆层改成真正的无损 `hot / warm / cold` 体系
说明：
不是 archive 删除，而是前景可达性与检索代价分层。
冷层记忆仍然必须可被 vague cue 或经验相似度唤起。
evidence: `alicization-memory.ts` / `db.ts` / `alicization-browser-bridge.ts` / `alicization-memory.test.ts` / `db.test.ts`

- [x] 做 memory backend failure 的写入保底
说明：
当 sqlite / runtime backend 短暂失败时，不能停写。
至少要支持：
本地 write-behind 队列
延迟重试
恢复后回灌
evidence: `alicization-memory.ts` / `alicization-memory.test.ts`

- [x] 做 memory persistence integrity 校验
说明：
需要能检测：
是否有记忆被写入但永远不可召回
是否有 recall source 指向已不可达对象
是否有冷层记忆永远无法被 query hints 命中
evidence: `alicization-memory.ts` / `db.ts` / `alicization-browser-bridge.ts` / `alicization-memory.test.ts`

- [x] 做长期记忆可达性回归
说明：
至少覆盖：
旧记忆不因 salience refresh 被删
backend failure 后恢复能继续召回
模糊任务词也能唤起旧 procedure / old relationship line
evidence: `alicization-memory.test.ts` / `db.test.ts`

## P0：端到端多轮回忆回放

- [x] 做 `session replay harness`
说明：
输入多轮历史 turn + 当前提问，跑完整：
`memory -> mind -> governance -> reply`
而不是只测某个中间函数。
evidence: `main-chat-session-replay-harness.ts` / `main-chat-session-replay-harness.test.ts`

- [x] 建立真人记忆对话 E2E 场景集
至少覆盖：
`几天前我们聊过什么`
`以前你是怎么帮我做这个的`
`我们之前关系为什么会变差`
`你为什么这次会这样回应我`
`你记得我对这类事的敏感点吗`
`继续像之前那样做`
evidence: `main-chat-session-replay-harness.test.ts`

- [x] 建立“非模板回复” E2E 守门测试
说明：
验证正常路径下不会落到 deterministic/local-only reply authority。
provider 可用时，主回答必须来自 mind-driven LLM path。
evidence: `main-chat-session-replay-harness.test.ts`

## P1：社会记忆与行为化

- [x] 让 host person model 真正进入 `reply-deliberator`
说明：
不只是 recall 时展示出来，而是要直接改变：
`selectedMotive`
`speakingFrom`
`whyThisReplyNow`
`mustInclude / mustAvoid`
evidence: `main-chat-session-runtime.ts` / `main-chat-session-runtime.test.ts`

- [x] 让 host person model 真正进入 `answer-planner`
说明：
把 routines / sensitivities / repair triggers / closeness preference 接到：
`openingMove`
`answerIntent`
`relationshipPosture`
`care / repair / guide` 取舍
evidence: `main-chat-session-runtime.ts` / `main-chat-session-runtime.test.ts`

- [x] 让 host person model 进入 proactive / execution callback
说明：
同一件结果回调，在不同信任阶段、不同 burden 状态下，要自动切换更轻或更近的表达方式。
evidence: `runtime-subconscious-tick.ts` / `runtime.ts` / `execution-delivery-surface.ts` / `host-social-guidance.test.ts` / `execution-delivery-surface.test.ts`

- [x] 做 relationship doctrine 的行为闭环
说明：
autobiographical self / motive engine / habit policy / relationship doctrine 的输出，要真正回灌到回复决策，而不是只作为背景说明。
evidence: `relationship-doctrine-guidance.ts` / `main-chat-session-runtime.ts` / `execution-delivery-surface.ts` / `relationship-doctrine-guidance.test.ts` / `main-chat-session-runtime.test.ts`

## P1：多跳回忆与经验链

- [x] 做 `task -> procedure -> relationship meaning -> current stance` 多跳链
说明：
用户问一件事时，不只是想起做法，也要能想起“为什么当时这样做”和“现在因此该怎么说”。
evidence: `runtime-soul.ts` / `runtime-organic-memory-prompt.ts` / `main-chat-session-runtime.ts` / `runtime-organic-memory-prompt.test.ts`

- [x] 做 `period -> event -> lesson -> answer posture` 多跳链
说明：
当用户问关系、态度、变化原因时，先想到一个阶段，再想到关键事件，再想到 lesson，再转成当前答法。
evidence: `runtime-soul.ts` / `runtime-organic-memory-prompt.ts` / `main-chat-session-runtime.ts` / `main-chat-session-replay-harness.test.ts`

- [x] 做 bundle coherence ranking
说明：
不是只给单条记忆排序，而是给“记忆组合”排序，避免拉出不相关但高 salience 的孤立碎片。
evidence: `runtime-organic-memory-prompt.ts` / `runtime-organic-memory-prompt.test.ts`

## P1：正常回复路径去模板 authority 审计

- [x] 盘点所有 deterministic 用户可见回复入口
说明：
包括：
repair
follow-up
identity
memory follow-up
execution follow-up
browser fallback
web/runtime parity
evidence: `main-chat-active-dialogue-loop.ts` / `main-chat-background-run.ts` / `main-chat-timeout-fallback.ts` / `main-chat-active-dialogue-loop.test.ts` / `main-chat-background-run.test.ts`

- [x] 把所有正常入口降为 LLM-authored
说明：
模板或本地规则只能保留为 provider unavailable / infra failure fallback。
evidence: `main-chat-background-run.ts` now defers `local-only` / `deterministic-payoff` to main runtime; compact invalid replies escalate instead of local replacement.

- [x] 建立 reply authority 回归
说明：
当 provider 可用时，任何主回答都不允许绕开 mind-driven 生成路径。
evidence: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts`

## P2：可观测性与长期学习

- [x] 记录 recall attribution telemetry
说明：
至少记录：
为什么想起
最终想起了什么 bundle
哪些记忆只影响内在立场而未显式说出
哪些记忆显式 surfaced
evidence: `runtime-governance.ts` / `runtime.ts` / `runtime-governance.test.ts` / `main-chat-background-run.test.ts`

- [x] 记录 reply-memory coherence telemetry
说明：
检测：
召回了但没用
没召回却硬说记得
内部 recollection 明明应该 inward 却被生硬外显
evidence: `runtime-governance.ts` emits `reply-memory-coherence`; `runtime-governance.test.ts` verifies integrated/missed classification.

- [x] 把用户纠正接成 reconsolidation
说明：
当用户说“不是那次”“你记错了”“不是这个语气”时，不能只当当前 turn 文本。
要进入：
confidence 修正
relationship meaning 改写
lesson 改写
surface style 修正
evidence: `runtime.ts` / `runtime.test.ts` settled dialogue feedback now loads same-trace recall/coherence events, calls episodic reconsolidation, and appends `memory-reconsolidated`.

## 本阶段完成定义

当以下条件同时成立，才允许把本计划视为完成：

- 所有 `P0` 条目完成并有证据
- 至少一条真实多轮 replay 跑通完整闭环
- 正常主路径下不存在模板 authority 抢答
- 旧记忆不会因维护任务或 backend failure 失活
- 回忆结果能稳定改变 reply deliberation，而不只是增加 prompt 文本
