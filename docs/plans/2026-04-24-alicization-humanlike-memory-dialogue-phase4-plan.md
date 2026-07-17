# Alicization 真人记忆对话 Phase 4 开发计划

更新日期：2026-04-24

> 本文件已完成，作为 Phase 4 完成参考保留。
> 新的唯一活跃开发计划切换到 `2026-04-24-alicization-humanlike-memory-dialogue-phase5-plan.md`。
> 后续不再继续往本文件追加任务。

## 目标

把 Alicization 从“已经能做较像人的 recall”推进到“能像真人一样决定为什么想起、先想起哪段经历、如何带着回忆继续说和做”：

- 不是硬编码一个时间检索器
- 不是把 memory cue 伪装成回复模板
- 不是只有用户明确问回忆时才会调用记忆
- 不是只能回忆最近 turn，而是能基于情景、关系、目标、情绪、熟悉感主动联想到过去经历
- 不是 recall 完就结束，而是让 recall 继续影响对话、执行、主动跟进和下一次回忆

最终必须满足：

- 正常可见回复始终经过大模型心智链生成，记忆只能提供证据、控制量、冲突和不确定度，不能直接替代回复。
- 回忆触发必须由心智层根据上下文决定，不允许靠固定规则模板硬选哪一天、哪一段时间、哪一句提示语。
- dialogue / execution / proactive / delayed recollection / dream continuity 必须统一进入同一套 autobiographical 闭环。
- 不允许通过失忆、删除、降低可达性来制造“像人”。

## 不可退让约束

- 正常用户可见回复必须继续经过 governed runtime 的 mind-turn 生成。
- deterministic / local-only 只能留在 provider unavailable 或 infra failure fallback。
- reply 层不允许重新长出固定开场白、固定回忆句式、固定“我记得/我不太确定”模板。
- provenance / uncertainty / conflict 必须继续直达 reply planning，而不是只存在 telemetry。
- 长期记忆允许 consolidation，但不允许人为设计遗忘式降级。
- 如果范围变化，只更新本文件，不再新增第二份活跃 plan。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `commit: <hash>` 或 `evidence: <test/receipt>`
3. 把新增回归优先补到现有 runtime / replay / governance / organic-memory 相关测试
4. 如果新增 benchmark 或 replay 数据集，要在本文件记录门槛和用途

## Phase 3 已完成基线

上一阶段已经完成：

- reconsolidation 反喂 recall ranking
- era-first recall 和 autobiographical era summaries
- provenance / conflict / uncertainty 进入 memory deliberation 和 planner
- host person model / doctrine 参与 recall reranking
- replayable `recall-attribution -> reply-memory-coherence -> memory-reconsolidated` 事件链
- 最小版 delayed recollection / scene-triggered recollection

参考：

- `docs/plans/2026-04-23-alicization-humanlike-memory-dialogue-phase3-plan.md`

## 总体验收门槛

本阶段全部完成时，必须同时成立：

- 当用户没有明确说“哪一天”而只是要求做一件以前做过的事时，Alicization 能更常通过目标相似性、关系上下文、情绪和情景熟悉感主动想起旧经历，而不是只搜最近聊天。
- 当用户问“前几天我们聊过什么”“上次你怎么做的”“你为什么现在改口了”时，Alicization 能由心智层决定检索时间段和候选经历，并能在模糊时自然表达不确定，而不是走硬编码时间窗口。
- dialogue / execution / proactive / delayed recollection 的经历能汇总成统一 autobiographical episode，并在后续 recall 中真的起作用。
- reply 层不会因为 memory cue 或 fallback 提示而退化成固定模板；正常答复仍是 mind-first、evidence-aware、relationship-aware。
- benchmark 能稳定抓住：错线程回忆、近因偏置、错误确定度、模板化 recall 句式、旧经验不会迁移到当前任务等典型退化。

## P0：让“想起什么”真正由心智决定，而不是由硬编码时间规则决定

- [x] 建立 `recollectionAgenda` / `memoryRecallIntent` 作为 recall authority
说明：
至少要让心智层显式给出：
`whyRecallNow`
`goalSimilarity`
`relationshipNeed`
`affectivePull`
`sceneFamiliarity`
`candidateTimeScopes`
`candidateEraFacets`
`candidateProcedureLines`
`uncertaintyTolerance`
evidence: `memory-recollection-intent.ts`, `runtime.ts`, `runtime-organic-memory-prompt.ts`, `main-chat-session-runtime.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

- [x] 把剩余时间检索硬规则收缩为候选器，不再直接决定 recall
说明：
例如“几天前”“之前”“以前怎么做的”不能直接映射成固定时间窗口。
规则只能提供候选区间，最终由心智层判断要先探哪一段、是否继续扩搜、还是承认模糊。
evidence: removed direct `isRetrospectiveRecallQuery(...)` authority from `runtime-organic-memory-prompt.ts` / `db.ts`; agenda candidate time scopes now steer ranking instead of hard-opening conversation recall.

- [x] 做多步 recollection search
说明：
至少支持：
第一跳先选 era / procedure / relationship line
第二跳根据证据缺口扩搜或缩搜
第三跳在必要时生成 conflict / ambiguity posture
evidence: `runtime-organic-memory-prompt.ts` now synthesizes `searchTrace(firstHop/secondHop/thirdHop)` and expands `recollectionPlan` selections into supporting episode / procedure / conversation evidence before deliberation; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`

- [x] 建立“没明说时间也能想起旧经验”的回归
说明：
至少覆盖：
用户让她做一件以前做过的事
用户问“上次你是怎么弄的”
用户问“为什么你这次和之前不一样”
evidence: `memory-recollection-intent.test.ts`, `memory-dialogue-regression.test.ts`, `runtime-organic-memory-prompt.test.ts` cover task reuse, `上次你是怎么弄的`, relationship-tone change, and non-explicit recall-triggered procedural search.

## P0：把 dialogue / execution / proactive / afterthought 真正合成同一条自传经历

- [x] 把 execution outcome / proactive outcome / dialogue outcome 统一写入同一 autobiographical episode 图
说明：
不是继续散在多个表里。
每次“经历过的一件事”至少要能挂回：
`episodeId`
`sessionId`
`mirrorId`
`eraFacet`
`source`
`provenance`
`participants`
`whatChanged`
evidence: dialogue / dialogue-feedback / execution-proposal / execution-result / proactive now all converge on `appendEpisodicEvents(...)`; this round adds task-thread/session-mirror execution sync and explicit proactive feedback closure persistence via `autobiographical-episode-sync.ts`, `runtime-agent-session-mirror.ts`, `runtime-invoke-handlers-dialogue.ts`, `runtime.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autobiographical-episode-sync.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [x] 让 session mirror / delayed recollection / dream continuity 直接回灌 episode graph
说明：
当前 afterthought 和 continuity 还是偏轻量。
下一步要让它们成为正式 autobiographical reference，而不是一次性提示。
evidence: ripe recollection afterthought now backfills `maintenance` episodic events from prepared session mirror; dream continuity now syncs through session mirror and backfills the same episode graph; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autobiographical-episode-sync.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [x] 做跨 session 的 delayed recollection / afterglow
说明：
不只是“下一轮想起来”。
要支持下一次会话甚至更晚的主动提起，并保持 provenance、confidence、why-now。
evidence: `runtime-session-continuity-builders.ts` now emits cross-session `autobiographical-afterglow` continuity signals from recent maintenance/session-mirror/dream continuity episodes; `main-chat-session-runtime.ts` injects those afterglow signals into organic recall seed; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-session-continuity-builders.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [x] 建立“经历统一入账后会改变后续 recall”的回归
说明：
至少覆盖 dialogue -> execution -> proactive follow-up 的连续链条。
evidence: `db.ts` now gives maintenance/session-mirror/dream continuity episodes explicit afterglow recall boosts across sessions; regressions in `db.test.ts`, `runtime.test.ts`, `autobiographical-episode-sync.test.ts`, and `memory-dialogue-regression.test.ts` cover unified experience entry changing later recall ordering and proactive/task-thread carry entering autobiographical recall.

## P0：继续硬化 reply 层，确保正常回复零模板偷跑

- [x] 清点 runtime / governance / response-surface 中残留的固定 recall 句式注入点
说明：
保留结构化约束，继续删掉会直接牵引措辞的半句文本 authority。
evidence: `response-surface-contract.ts`, `main-chat-session-runtime.ts`, `runtime-organic-memory-prompt.ts` no longer carry memory-authored reply drafts or opening/style cues into visible-surface governance or prompt blocks; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`

- [x] 让 reply planner 只消费记忆控制量、证据 ledger、provenance posture、relationship posture
说明：
禁止新增任何“如果命中记忆就说这句”的 normal-path 分支。
evidence: recollection surface handling now flows through abstract controls (`visibility / continuityRole / certainty / templateBoundary`) via `recollection-surface-controls.ts`; visible-surface rules stay generic and no longer carry drafted recollection wording into `mustDo`/system blocks.

- [x] 建立模板化回忆退化 benchmark
说明：
至少检测：
固定开场白
固定“我记得/我不太确定”壳子
memory cue 原句被照抄
reply 对 provenance / conflict 没有真实反映
evidence: `main-chat-session-replay-harness.ts` now evaluates `templateLeakage`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`

- [x] 建立 normal-path 和 fallback-path 的硬边界
说明：
只有 provider unavailable / infra failure 时允许 deterministic fallback。
正常路径必须保持 LLM mind authority。
evidence: `main-chat-background-run.ts` now blocks `local-fallback` and deterministic inline execution visible payoff whenever gateway reachability remains healthy, allowing deterministic visible fallback only after explicit reachability failure; regression: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

## P1：让程序记忆和类比回想更像真人做事

- [x] 建立 goal / tool / procedure similarity recall
说明：
用户没有明说“回忆”时，也能因为当前任务和过去任务相似而想起“以前是怎么做的”。
evidence: `executor-runtime.ts` now derives remembered execution traces from recent task threads + execution events and merges them with consolidated procedural memories using goal similarity before planning.

- [x] 把成功方案、失败教训、修复路径沉淀成 autobiographical procedure traces
说明：
procedure 不能只是执行日志。
要能带：
情境
约束
采取的步骤
失败点
修复点
最后学到什么
evidence: richer `rememberedProcedures` now carry `situation / steps / failurePoints / repairMoves / result / traceSummary / lastExperiencedAt` through `claw-fabric.ts`, `task-thread-governor.ts`, and `executor-runtime.ts`.

- [x] 让当前执行计划能引用历史 procedure trace，但不照抄旧回复
说明：
历史经验进入的是 mind planning，不是模板重放。
evidence: `claw-fabric.ts` narrative now prefers `traceSummary` from remembered procedure traces instead of old reply text; `runtime.test.ts` validates planning metadata receives autobiographical execution traces rather than reply snippets.

- [x] 建立“相似任务主动回想旧做法”的回归
说明：
至少覆盖 CLI / code fix / repair dialogue 三类任务。
evidence: `memory-dialogue-regression.test.ts`, `runtime.test.ts`, `claw-fabric.test.ts`, and `task-thread-governor.test.ts` cover non-explicit procedural recall and remembered-procedure-biased routing/planning.

## P1：让错线程、错时期、错关系阶段的回忆更少

- [x] 做多线程干扰抑制
说明：
相似项目、相似需求、相近时间段之间要能区分正确 episode cluster。
evidence: `runtime-organic-memory-prompt.ts` now derives candidate memory clusters and suppresses non-dominant clusters when one thread cluster clearly outranks nearby competitors, instead of letting similar runtime lines freely mix.

- [x] 做 ambiguity-first posture
说明：
当两个候选经历都像时，优先自然表达“我更像是在想起 A，但也可能混着 B”，而不是硬断言。
evidence: cluster competition now feeds `searchTrace.thirdHop.ambiguityPosture` and `conflictVariants` through `runtime-organic-memory-prompt.ts`, so close competing clusters become ambiguity-aware carry instead of forced certainty.

- [x] 把 relationship stage 变化更深地接进 recall disambiguation
说明：
同一句话在 repair / cautious / trusted / close 阶段，应该想到不同的经历和不同的可说边界。
evidence: `runtime-organic-memory-prompt.ts` now computes relationship-stage alignment from `trustLadder` + doctrine and uses it inside cluster analysis/reranking, strengthening repair-era vs closeness-era disambiguation beyond simple lexical match.

- [x] 建立“错线程抑制 / 关系阶段分流”的回归
说明：
至少覆盖多天、多 session、相似任务名称的干扰案例。
evidence: `runtime-organic-memory-prompt.test.ts`, `claw-fabric.test.ts`, `task-thread-governor.test.ts`, and `runtime.test.ts` now cover wrong-thread suppression, ambiguity-first memory posture, relationship-stage recall branching, and autobiographical procedure trace carry.

## P1：把 replay benchmark 升级成长期闸门

- [x] 扩展 benchmark pack 到 7d / 30d / 90d 记忆跨度
说明：
验证不是只能记住最近几轮。
evidence: `main-chat-session-replay-harness.ts` now exports `buildDefaultHumanlikeMemoryBenchmarkPack()` with explicit 7d / 30d / 90d memory-span scenarios.

- [x] 增加“非显式回忆触发”场景
说明：
至少包括：
相似任务
旧口吻变化
延迟想起
错误纠正后的改口
evidence: default benchmark pack now includes non-explicit trigger turns for similar-task carry, tone shift, delayed recollection, and correction-driven memory revision.

- [x] 为 benchmark 定义最小通过标准
说明：
至少包含：
era selection quality
procedure carry quality
wrong-thread suppression
reply-memory coherence
template leakage
evidence: `main-chat-session-replay-harness.ts` now exports `evaluateReplayBenchmarkStandards()` with explicit pass/fail gates for `eraSelectionQuality / procedureCarryQuality / wrongThreadSuppression / replyMemoryCoherence / templateLeakage`.

- [x] 把 benchmark 结果接进后续 phase 的回归门槛
说明：
后面每轮大改都能知道有没有把真人回忆感做坏。
evidence: `benchmarkMainChatSessionReplay()` now returns both per-turn quality and aggregate standards, and `main-chat-session-replay-harness.test.ts` asserts those benchmark gate outputs directly.

## P2：继续补真人感细节，但不牺牲真实性闭环

- [x] 做 scene familiarity / mood carry / embodied cadence 的稳定接入
说明：
让“为什么此刻突然想起”更自然，但不能盖过证据和 provenance。
evidence: `recall-governor.ts`, `runtime-organic-memory-prompt.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做更成熟的 personality-growth continuity
说明：
不是风格随机波动，而是长期关系和经历推动下的稳定变化。
evidence: `dialogue-growth-profile.ts`, `answer-compiler.ts`, `current-conscious-frame.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/dialogue-growth-profile.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做主动但克制的 recollection-driven follow-up
说明：
当某段经历在后续会话重新变得 relevant 时，可以自然提起，但要避免打断当前主任务。
evidence: `alicization-runtime-architecture.ts`, `main-chat-session-runtime.ts`, `digital-life-kernel.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立“更像真人但不更像模板”的验收回归
说明：
防止为了提高风味而重新长出固定套路。
evidence: `main-chat-session-replay-harness.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
