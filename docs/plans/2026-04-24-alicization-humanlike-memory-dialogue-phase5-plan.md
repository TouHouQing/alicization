# Alicization 真人记忆对话 Phase 5 开发计划

更新日期：2026-04-24

> 本文件已完成，现作为 Phase 5 收尾参考保留。
> 当前唯一活跃开发计划见 `2026-04-26-alicization-humanlike-memory-dialogue-phase6-plan.md`。
> 不再继续在本文件追加新的开发任务。

## 目标

在 Phase 1-4 已经完成“较强的人类式回忆闭环”之后，下一阶段要把 Alicization 从“复杂 recall runtime”推进到“稳定的真人式记忆心智系统”：

- 不是继续堆新的 heuristics，而是重构成统一记忆搜索与人格连续体架构
- 不是让 reply 层偷偷长出更多文本规则，而是继续压缩到结构化心智控制量
- 不是只有 recall 更像人，而是让 memory / mind / dialogue / proactive / execution 共用同一条心智闭环
- 不是只在 benchmark 上看起来像人，而是在长期对话、长期任务和跨 session 关系演化里持续像人
- 不是靠删记忆或降低可达性制造“人味”，而是在无限潜力记忆前提下做好分层、重建和调用

最终必须满足：

- 正常可见回复始终经过大模型心智链生成，记忆只能提供证据、姿态、边界、冲突和连续性，不能直接替代回复。
- 回忆、主动跟进、执行延续、关系变化，都必须由心智层决定，不允许靠固定规则模板直出可见话术。
- memory / mind / dialogue / proactive / execution / dream continuity 必须在 runtime 内形成同一个 replayable 决策链。
- 长期记忆允许无限增长，但必须通过分层索引、摘要、重建和检索策略保持可达，不允许靠“失忆机制”维持表面稳定。

## 不可退让约束

- 回复层不允许新增固定模板回复、固定记忆开场白、固定不确定度壳子。
- 正常路径必须保持 LLM mind authority；deterministic fallback 只能留在 provider unavailable 或 infra failure。
- 记忆检索不能退化回硬编码时间窗口；时间只能作为 candidate scope，不能直接决定 recall。
- provenance / uncertainty / conflict / ambiguity 必须继续直达 deliberation 和 answer planning。
- 任何记忆影响 reply 的路径都必须可追踪、可 replay、可 benchmark，而不是散落在临时 prompt 文字里。
- 如果范围变化，只更新本文件，不再新增第二份活跃 plan。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `commit: <hash>` 或 `evidence: <test/receipt>`
3. 把新增回归优先补到现有 runtime / replay / governance / organic-memory / architecture 相关测试
4. 如果新增 benchmark、trace viewer、memory dataset 或 replay pack，要在本文件记录用途和门槛
5. 如果某条任务拆出子波次，只能在本文件追加，不再生成新的平行活跃计划

## Phase 4 完成基线

上一阶段已经完成：

- recollection agenda / multi-hop search / wrong-thread suppression / ambiguity-first
- autobiographical episode graph 统一入账 dialogue / execution / proactive / dream continuity
- reply 层去 drafted wording authority，normal-path 保持 LLM mind authority
- procedure trace memory、relationship-stage disambiguation、scene familiarity / mood carry / embodied cadence
- personality-growth continuity 的基础接线
- recollection-driven follow-up 的基础 runtime carry
- replay benchmark 的长期跨度与 template leakage 闸门

参考：

- [phase4 plan](/Users/touhouqing/Desktop/GIT/airi-alice/docs/plans/2026-04-24-alicization-humanlike-memory-dialogue-phase4-plan.md)
- baseline commit: `12e58e41`

## 当前架构债

当前最主要的问题不是“能力完全没有”，而是“能力分布太散”：

- `memory-search-runtime` 已完成 facade、retrieval operator 拆层、reply latent control 收缩，但 ranking / clustering / deliberation / surface control 仍未完全从 `runtime-organic-memory-prompt.ts` / `main-chat-session-runtime.ts` 抽成独立内核
- `hostPersonModel` / `dialogue growth profile` / `selfContinuity` / `mindEcology` 已互相影响，但还不是一个统一的人格连续体
- runtime surface 已经能带 recollection deliberation，但其 contract 仍偏弱，容易再次被 prompt text authority 污染
- 写记忆、索引记忆、召回记忆、回放记忆的链路还没有完全 event-sourced / durable / inspectable
- acceptance 还主要靠代码级 tests 和 replay harness，缺少面向“真人感退化”的系统性 trace / eval 实验台

## 总体验收门槛

本阶段全部完成时，必须同时成立：

- Alicization 对“几天前”“以前怎么做的”“为什么这次不一样”“你还记得我这个习惯吗”“先继续我们上次那条线”这类问题，不依赖硬编码模板，而是通过统一 memory-search runtime 做心智化决定。
- 相似任务、相似关系波动、相似场景余温之间，能够更多依赖图检索、语义检索、关系连续体与经验链，而不是单纯 lexical overlap。
- personality / relationship / embodiment 的长期变化来自 autobiographical reconsolidation，而不是 scattered heuristics 的偶然叠加。
- proactive follow-up、execution continuity、dialogue answer 都由同一 runtime surface 与 deliberation authority 驱动，不再形成两套现实。
- replay benchmark、trace tooling、长期 load / retrieval regression 能稳定抓住：
  - 模板化 recall 壳子
  - 近因偏置
  - 错线程迁移
  - memory write silent failure
  - personality drift without cause
  - proactive overreach / follow-up抢主任务

## Wave 1：共享 contract 与记忆搜索运行时重构

- [x] 把 recollection contract 提升为 shared transport single source
说明：
把 `recollectionIntent / recollectionPlan / recollectionSpeechPlan / memoryDeliberation / recollectionSearchTrace` 从 runtime 本地类型抽到 shared contract。
目标是让 `runtime / digital-life-kernel / runtime-soul / architecture / replay harness` 不再各自复制和漂移。
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-soul.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`; tests: `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts`

- [x] 把 `memory-recollection-intent.ts`、`recall-governor.ts`、`runtime-organic-memory-prompt.ts` 合成单一 `memory-search-runtime`
说明：
统一链路为：
`intent authority -> search policy -> retrieval operators -> evidence bundles -> deliberation -> surface controls`
不再允许三四层局部 heuristics 分别决定 recall 走向。
evidence: `memory-search-runtime.ts`, `runtime.ts`, `runtime-mind-state.ts`, `runtime-chat-perception-augment.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-search-runtime.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 retrieval operator 明确拆成独立层
说明：
至少要显式区分：
`conversation retrieval`
`episodic graph retrieval`
`procedural trace retrieval`
`relationship line retrieval`
`era/window retrieval`
`reconstruction / ambiguity pass`
evidence: `memory-search-retrieval-operators.ts`, `runtime-organic-memory-prompt.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-search-retrieval-operators.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-search-runtime.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 reply 层继续去 wording authority，收缩成 latent control contract
说明：
下一步不能继续把 `openingMove / visible discipline / mustDo` 当作隐形话术注入器。
要逐步改成结构化控制量，例如：
`surface_permission`
`retrospective_depth`
`certainty_floor`
`relationship_vector`
`continuity_role`
`template_boundary`
evidence: `memory-deliberation-latent-controls.ts`, `main-chat-session-runtime.ts`, `response-surface-contract.ts`, `main-chat-session-replay-harness.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立记忆搜索运行时重构后的不变量回归
说明：
至少覆盖：
shared contract 不漂移
retrieval operator 顺序稳定
同一 turn 的 search trace 可 replay
reply 层不会因为 contract 重构重新长回 drafted wording
evidence: `memory-search-runtime-invariants.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-search-runtime-invariants.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 2：无限潜力记忆的存储、索引与 durable write

- [x] 引入无限潜力记忆的分层存储模型
说明：
不是遗忘，而是做层级：
`hot working index`
`warm autobiographical index`
`cold archive summaries`
`deep raw event archive`
`reconstruction cache`
evidence: `memory-tiering.ts`, `db.ts`, `memory-consolidation.ts`, `runtime-organic-memory-prompt.ts`, `shared/eventa.ts`, `alicization-transport-contracts.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-tiering.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 memory write pipeline 重构成 durable event-sourced ingest
说明：
写记忆不能继续散在多个 runtime 成功路径里。
要有统一 ingestion queue、local durable append、background retry、failure visibility。
evidence: `db.ts` now writes `upsertMemoryFacts / appendEpisodicEvents / upsertMemoryConsolidations` through `memory_ingest_journal`, startup replay drains pending/failed ingest, and `getMemoryStats().pendingSyncCount` reflects backlog; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-tiering.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 为 memory backend failure 增加本地降级写与延迟重试
说明：
不能再出现 backend 异常后长期静默断记忆。
最少要保证：
本地持久化不丢
retry 有 budget 和 backoff
runtime 有 trace 与 health signal
evidence: `db.ts` now keeps failed ingest in `memory_ingest_journal` with `next_attempt_at` backoff, startup drain only retries due entries, and `getMemoryStats().ingestHealth` exposes backlog/degraded state; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-tiering.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 引入语义检索与 graph walk 的 hybrid retrieval
说明：
不是替换现有 graph/era/procedure 检索，而是补 semantic embedding retrieval，让“场景像以前”“做法像以前”“语气为什么变了”不依赖 lexical 偶然命中。
evidence: `memory-semantic-retrieval.ts`, `db.ts`, `memory-consolidation.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立长期容量与检索回归
说明：
至少验证：
7d / 30d / 90d / 180d
高事件量 session
高相似任务簇
backend 部分异常
回忆延迟重建
evidence: `db.test.ts`, `memory-semantic-retrieval.test.ts`, `memory-consolidation.test.ts`, `main-chat-session-replay-harness.ts`, `main-chat-session-replay-harness.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 3：统一人格连续体，而不是多模块弱耦合

- [x] 把 `hostPersonModel`、`dialogueGrowthProfile`、`selfContinuity`、`mindEcology` 合成统一 personality continuity state
说明：
现在这些模块已经互相影响，但还不是同一个长期人格系统。
要有一条明确的长期人格状态来源与更新路径。
evidence: `personality-continuity-state.ts`, `digital-life-kernel.ts`, `main-chat-session-runtime.ts`, `answer-compiler.ts`, `current-conscious-frame.ts`, `mind-synthesizer.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/personality-continuity-state.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把人格变化的来源统一到 autobiographical reconsolidation
说明：
人格与关系不能主要靠当前 mood 或局部 heuristics 波动。
要让 episode reconsolidation 真正修改：
`closeness posture`
`repair gentleness`
`autonomy respect`
`cadence affinity`
`rest attunement`
`trust ladder meaning`
evidence: `personality-continuity-state.ts` now derives `trustMeaning / reconsolidationLine / closenessPosture / repairPosture / autonomyPosture / cadenceProfile / energyProfile` from autobiographical reconsolidation signals (`latestInflection`, relationship doctrine, long-horizon summaries, optional episodic/consolidation replay inputs); `mind-synthesizer.ts` now lets protect-space continuity keep guide-task openings lighter. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/personality-continuity-state.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立长期关系阶段与场景人格的 regime model
说明：
同一个人，不同上下文会有不同但连续的人格展开。
至少覆盖：
`focused-work`
`late-night-care`
`repair window`
`execution callback`
`open companionship`
evidence: `personality-continuity-state.ts` now exposes explicit `regimeModel` (`dominantRegime`, `confidence`, `primaryReason`, `carryReason`, `carryFrom`, `signals`, `scores`) instead of relying on a single branchy heuristic; regime scoring now differentiates `focused-work / late-night-care / repair-window / execution-callback / open-companionship / general` and supports carry from prior continuity state. `main-chat-session-runtime.ts` now feeds previous continuity state back into the new model. `answer-compiler.ts`, `current-conscious-frame.ts`, and `mind-synthesizer.ts` now consume `execution-callback` as a distinct continuity window so callback/result replies stay on the same life-thread instead of collapsing into generic guide posture. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/personality-continuity-state.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 统一 embodiment / cadence / mood 的长期节律
说明：
现在这三者已接入 recall，但还没有形成统一长期 rhythm state。
下一步要让它们在 memory、proactive、reply 三端共用一条 cadence authority。
evidence: `personality-continuity-state.ts` now derives explicit `rhythmState` (`cadenceMode`, `restMode`, `embodiedPresence`, `suggestedStyle`, `moodLabel`, `emotionalTension`, `cadencePressure`, `restPressure`, `memoryResonance`, `companionshipTempo`, `summary`, `rationale`) and uses it as the authority behind `cadenceProfile` / `energyProfile`. `proactive-cadence.ts` and `proactive-policy.ts` now consume that same rhythm state so proactive momentum/pressure reads the same cadence authority as reply continuity. `recall-governor.ts` now injects the shared rhythm state into affective/embodied carry so organic memory recall uses the same mood/embodiment cadence instead of a parallel cue stack. `runtime-mind-state.ts` now builds provisional continuity before recall-governor so memory recall gets the same rhythm authority during the turn. `answer-compiler.ts`, `current-conscious-frame.ts`, and `mind-synthesizer.ts` now trace the shared rhythm state in their continuity surface. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/personality-continuity-state.test.ts apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-cadence.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立人格连续体回归
说明：
至少验证：
同类场景下人格变化稳定
关系修复后语气变化有原因
人格不会无因硬漂
长期 host 模型能压住当前随机波动
evidence: new regression coverage in `personality-continuity-regression.test.ts` now locks four continuity invariants: same-context focused-work stability with carry, repair-aftereffect with explicit causal memory lines, no-cause drift resistance under shallow mood jitter, and long-horizon host-model damping of temporary warmth spikes. Existing continuity/rhythm consumers were kept green through `personality-continuity-state.test.ts`, `recall-governor.test.ts`, `proactive-cadence.test.ts`, `proactive-policy.test.ts`, `answer-compiler.test.ts`, `current-conscious-frame.test.ts`, and `mind-synthesizer.test.ts`. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/personality-continuity-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/personality-continuity-state.test.ts apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-cadence.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 4：主动跟进、执行延续、对话回复彻底共用一套心智闭环

- [x] 把 recollection-driven follow-up 提升成显式 affordance，而不是只靠 channel carry
说明：
由 memory deliberation 产出：
`follow_up_affordance`
`why_now`
`intrusion_risk`
`payoff_dependency`
`preferred_timing`
再由 proactive/runtime 决定是否开口。
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts` and `apps/stage-tamagotchi/src/shared/eventa.ts` now carry explicit `followUpAffordance` on `AlicizationMemoryDeliberation`. `runtime-organic-memory-prompt.ts` now synthesizes follow-up affordance from resolved deliberation (`summary / whyNow / intrusionRisk / payoffDependency / preferredTiming`) and emits it in the memory deliberation system block. `alicization-runtime-architecture.ts` now reads the explicit affordance first, instead of inferring follow-up carry only from relationship lines/bundles/chains. `main-chat-session-runtime.ts` now threads the affordance into `replyDeliberation` (`whyThisReplyNow`, `mustInclude`, `narrative`) so runtime surface and downstream proactive/runtime consumers read the same structure. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 统一 execution continuity / proactive continuity / dialogue continuity 的 deliberation authority
说明：
不能继续三套地方各算各的 continuity pressure。
要让“之前做过”“现在还挂着”“该不该轻提一句”走同一套 continuity deliberation。
evidence: new local continuity authority in `continuity-deliberation.ts` now gives one shared interpretation layer for `memory-follow-up / dialogue-carry / execution-callback / none`, with shared `pressure / intrusionRisk / payoffDependency / preferredTiming / shouldStayOnThread / shouldSpeakNow / sourceTags`. `alicization-runtime-architecture.ts` now reads that authority instead of separate recollection/execution heuristics to warm `active-memory / active-dialogue / anthropomorphic-mind` and compute runtime continuity pressure. `main-chat-active-dialogue-loop.ts` now uses the same authority when interpreting short continuity turns, so `session-carry / execution-carry` are no longer identified by a separate local semantic path. `proactive-policy.ts` continues to read continuity from runtime digest, which is now powered by the same authority. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把执行结果回调和对话回答收束到同一 answer surface builder
说明：
执行结果、关系回答、回忆回答，正常 visible path 都必须走同一 mind-turn / truth discipline / surface contract builder。
evidence: `execution-delivery-surface.ts` no longer renders callback payoffs through its own standalone surface path; deterministic and callback structured replies now normalize through `buildAlicizationActiveDialogueGovernedReply`, yielding `mind-turn-v1` callback payloads on the same governed answer surface builder used by active dialogue turns. `runtime.ts` now wraps callback-LLM replies back through the same surface helper instead of emitting a separate callback-only structured format. `execution-delivery-surface.test.ts` now locks this by asserting callback structured payloads are `mind-turn-v1`, while `runtime-delivery-reminders.test.ts` and `main-chat-active-dialogue-loop.test.ts` stayed green. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] browser/runtime/web fallback 继续去双现实
说明：
不能出现：
runtime 里是一个人格连续现实
browser/web fallback 又是一套轻量人格现实
至少要统一 recollection carry、proactive feedback、session mirror。
evidence: `packages/stage-ui/src/stores/alicization-browser-bridge.ts` now synthesizes browser-local `runtimeDigest` alongside fallback `digitalLifeSpine` when server meta omits them, instead of only patching one side. The browser fallback digest now reads `active session` continuity plus `proactive feedback` state and threads them into both local memory summaries and runtime continuity pressure, so local browser recollection/proactive reality is no longer detached from the same continuity semantics used by runtime. `getOrganicMemorySnapshot()` now returns the full browser-local recollection contract (`recollectionIntent / recollectionPlan / recollectionSpeechPlan`) instead of a reduced foreground-only view. tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立“主动但克制”的长期回归
说明：
至少覆盖：
relevant 但不该打断
relevant 且适合 after-payoff 轻提
execution callback 不抢主 answer
repair 场景优先修复，不抢着聊回忆
evidence: new `proactive-restraint-regression.test.ts` now locks four restraint invariants across the shared continuity authority: relevant-but-inward-only continuity must not interrupt, after-payoff continuity must wait for the current payoff, execution callback continuity must not steal the current answer lane, and repair scenes must suppress remembered continuity even under high continuity pressure. Supporting runtime paths were updated so `proactive-policy.ts` now explicitly reads `continuityDeliberation` timing/intrusion semantics, while `continuity-deliberation.ts` and `digital-life-kernel.ts` expose the same authority into proactive policy snapshots. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-restraint-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 5：观测、trace、benchmark 与 acceptance lab

- [x] 建立 memory decision trace query surface
说明：
要能追：
这次为什么想起这段
第一跳搜了什么
第二跳为什么扩搜
为什么压掉别的 thread
为什么最后 inward-only 或 surfaced
evidence: `packages/stage-shared/src/alicization-memory-decision-trace.ts` now groups replayable `mind_turn_events` into structured memory decision traces keyed by `decisionTraceId`, carrying governance, recall attribution, reply-memory coherence, persistence, dialogue emit, takeover audit, memory fact upsert, activeThreadId, and `followUpAffordance`. `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, and `apps/stage-tamagotchi/src/renderer/App.vue` now expose the grouped query surface across runtime and browser fallback instead of leaving callers with raw event rows. This round also repaired the proactive/runtime regressions that were masking the new trace path by treating `continuityDeliberation.kind === 'none'` as a true no-op inside `proactive-policy.ts`, and by restoring deterministic callback payoff wording continuity in `mind-surface-renderer.ts`. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "lists structured memory decision traces through invoke handler"`, `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts -t "lists grouped browser-local memory decision traces instead of only raw event rows"`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-restraint-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立可视化 replay / trace lab
说明：
至少能看：
`intent`
`search trace`
`retrieval bundles`
`deliberation`
`surface controls`
`runtime carry`
`final prompt-side authority`
evidence: `packages/stage-ui/src/stores/alicization-mind-replay.ts` now queries both raw `mind_turn_events` and structured `memory decision traces` through one replay-lab state source, so `/devtools/mind-replay` no longer stops at event coverage. `packages/stage-pages/src/pages/devtools/mind-replay.vue` now renders a dedicated structured trace section, and `packages/stage-pages/src/pages/devtools/components/mind-replay-memory-trace-card.vue` breaks each trace into intent, search trace, retrieval bundles, deliberation, surface controls, runtime carry, and final prompt-side authority, while still exposing raw JSON for forensic replay. `packages/stage-ui/src/stores/alicization-mind-replay.test.ts` now locks both the normal dual-query path and the trace-only fallback path so browser/runtime replay tools can share the same lab surface without a second data contract. tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 扩展 acceptance benchmark 到更贴近真人的 adversarial set
说明：
至少包括：
隐式回忆
模糊时间询问
错线程诱导
长时间跨度任务迁移
关系修复后改口
回忆 relevant 但不应 overt surface
template shell 钓鱼
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts` now scores additional human-memory adversarial dimensions: `implicitRecallQuality`, `temporalScopeFlexibility`, `surfaceRestraint`, and `relationshipRepairAdaptation`, instead of only checking era/procedure/thread/template basics. The default benchmark pack now explicitly covers `implicit recall by similar task`, `ambiguous time window`, `wrong-thread lure`, `long-horizon task migration`, `relationship repair tone shift`, `relevant but inward-only recall`, and `template shell fishing`. `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts` now locks these new signals with adversarial replay fixtures so future memory/runtime/reflection changes have to preserve more humanlike recall logic rather than just passing lexical/template checks. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 benchmark gate 接进后续所有大改
说明：
后续任何 memory / runtime / reply / proactive 重构，都要先过长期 replay standards，再允许宣称完成。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts` now exposes a reusable `evaluateReplayBenchmarkGate(...)` report with canonical thresholding, failing dimension breakdown, passed ratios, and failing turn ids instead of leaving future changes to manually inspect raw benchmark standards. `benchmarkMainChatSessionReplay(...)` now returns `gate` alongside `quality` and `standards`, and `buildReplayBenchmarkMemoryStatsPatch(...)` turns replay-gate failures into a memory stats telemetry patch so future benchmark runners can feed the same gate output back into unified memory health reporting. That gate is now runnable through the actual app surface: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/renderer/App.vue`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, and `packages/stage-pages/src/pages/devtools/components/mind-replay-benchmark-report.vue` wire a default replay benchmark invoke path into the existing `/devtools/mind-replay` surface, so future large memory/runtime/reply/proactive changes can execute the same gate and persist telemetry without inventing a second workflow. `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, and `packages/stage-ui/src/stores/alicization-mind-replay.test.ts` now lock the happy path, explicit failing-dimension reporting, benchmark-to-memory-stats patch conversion, runtime invoke registration, and renderer/store consumption. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "runs the default replay benchmark" packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`

- [x] 建立 memory health / write health / retrieval health telemetry
说明：
至少包含：
write backlog
retry age
semantic retrieval latency
graph retrieval latency
reconstruction frequency
template leakage fail count
evidence: `apps/stage-tamagotchi/src/shared/eventa.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `packages/stage-ui/src/stores/alicization-memory.ts`, and `packages/stage-ui/src/stores/alicization-browser-bridge.ts` now converge on one `AlicizationMemoryStats` contract carrying `writeHealth` and `retrievalHealth`. SQLite-backed stats now derive `write backlog / retry oldest age / next retry / blocked / last error` from `memory_ingest_journal`, record `semantic retrieval latency` from `retrieveMemoryFacts(...)`, record `graph retrieval latency` from `searchEpisodicEvents(...)`, compute `reconstructionFrequency` from reconsolidated episodic history, and persist `templateLeakageFailCount` through `overrideMemoryStats(...)` for benchmark feedback loops. Local/browser fallback stats now return the same health shape with truthful default/null values instead of a second reduced memory-health reality. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts packages/stage-ui/src/stores/alicization-memory.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`

## 验证命令基线

后续每轮至少跑：

- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts`

当相关模块被修改时，额外跑：

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/dialogue-growth-profile.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autobiographical-episode-sync.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-session-continuity-builders.test.ts`

## 下一轮建议起手顺序

1. 先做 Wave 1 的 shared recollection contracts 抽取。
2. 立即跟进统一 `memory-search-runtime`，避免 contract 抽出后又形成第二层漂移。
3. 再做 Wave 2 的 durable ingest + memory tiering。
4. 等 contract 和 ingest 稳住后，再推进 Wave 3 的 unified personality continuity state。
5. 最后把 Wave 4 / Wave 5 的 affordance、trace、acceptance lab 补齐。
