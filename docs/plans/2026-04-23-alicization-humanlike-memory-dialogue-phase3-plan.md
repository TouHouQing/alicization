# Alicization 真人记忆对话 Phase 3 开发计划（已完成参考）

更新日期：2026-04-24

> Phase 3 已完成。
> `2026-04-22-alicization-humanlike-memory-dialogue-phase2-plan.md` 和本文件都视为已完成参考，不再继续追加任务。
> 后续唯一活跃计划切换到 `2026-04-24-alicization-humanlike-memory-dialogue-phase4-plan.md`。

## 目标

把 Alicization 从“已经有真人记忆闭环”推进到“回忆方式、回忆不确定度、回忆对回答的影响，都更像真人”：

- 不是把记忆检索结果塞给回答器
- 不是把 `visibleLine` 之类半成品措辞偷偷变成模板
- 不是只会记住最近几轮，而是能先想到某段时期、某类经历、某条关系演化
- 不是把用户纠正记下来就结束，而是要真的改写后续回想和答法

最终必须满足：

- 记忆会被反馈改写：
  `被想起 -> 被说出/没说出 -> 被用户纠正 -> 下次更可能想起别的，或以不同确定度想起`
- 回忆先选“阶段/时期”，再选事件/做法/关系含义，而不是直接 lexical 命中最近聊天
- 回复层只吃心智控制量，不吃模板半成句
- 当记忆不稳、冲突、被纠正过时，回复能自然带不确定度，而不是硬说“我记得”

## 不可退让约束

- 正常用户可见回复必须继续经过大模型心智链生成。
- deterministic / local-only 只能留在 provider unavailable / infra failure fallback。
- 不允许通过删记忆、降级记忆可达性来制造“像人”。
- 不允许把 `visibleLine`、`openingLead`、`memory cue sentence` 这类字段继续演化成隐藏模板回复系统。
- 记忆可以影响回答，但不能绕过回答层的心智思考 authority。
- 用户纠正必须优先改变未来 recall ranking / confidence / relationship meaning，而不是只追加一条新 fragment。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `commit: <hash>` 或 `evidence: <test/receipt>`
3. 如果范围变化，只更新本文件，不再新增第二份活跃 plan
4. 回归优先补到现有 `runtime.test.ts`、`main-chat-session-replay-harness.test.ts`、`runtime-governance.test.ts`、`runtime-organic-memory-prompt.test.ts`

## 已完成基线

上一阶段已经完成：

- `memory deliberation` 成为 recall authority
- multi-hop bundle / chain recall
- host person model / relationship doctrine 行为化
- 正常回复 authority 去模板化
- `recall-attribution` / `reply-memory-coherence` / `memory-reconsolidated` 事件链
- 用户纠正进入同 trace 下的 episodic reconsolidation

参考：

- `docs/plans/2026-04-22-alicization-humanlike-memory-dialogue-phase2-plan.md`

## 总体验收门槛

本阶段全部完成时，必须同时成立：

- 当用户问“几天前那个事”“以前你是怎么帮我做的”“你为什么这次改口了”时，Alicization 更常先想到一段时期/线程，而不是只抓最近 turn。
- 当用户纠正“不是那次”“不是这个语气”“你记错了”后，后续 recall 排序、confidence、relationship meaning 会发生可观察改变。
- 回答生成不再依赖 `visibleLine` 这类半句提示；记忆只通过心智控制量进入 reply generation。
- 回忆冲突、模糊、被重构过的情况可以自然表达不确定度，而不是硬模板承认或硬模板回避。

## P0：让 reconsolidation 真正改变下一次 recall

- [x] 把 `memory-reconsolidated` 反喂进 episodic recall scoring
说明：
`searchEpisodicEvents(...)` 不能只把 reconsolidation 当附属字段。
需要让这些量真正改变排序：
`latestReconsolidation.confidence`
`latestReconsolidation.provenance`
`latestReconsolidation.lesson`
`latestReconsolidation.relationshipMeaning`
`reply-memory-coherence`
evidence: `db.ts` now scores `latestReconsolidation` text / confidence / recency / count / lastRecalledAt` and biases same-thread carry recall toward recently corrected memories.

- [x] 建立“被纠正后，下次想起不同内容”的回归
说明：
至少覆盖：
第一次回错
用户纠正
第二次再问同类问题时，召回顺序或 certainty 发生变化
evidence: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "prioritizes a feedback-reconsolidated memory on the next similar recall"`

- [x] 把 recall telemetry 和 reconsolidation 绑定到同一 replay 视图
说明：
要能在同一个 `decisionTraceId` 里看见：
`recall-attribution -> reply-memory-coherence -> memory-reconsolidated -> next recall shift`
evidence: `runtime.ts` writes feedback reconsolidation with source trace; `db.ts` preserves reconsolidation trace across later recalls; future `recall-attribution` now surfaces `reconsolidatedFromTraceId`.

## P0：把记忆输出从“半句提示”升级成“心智控制量”

- [x] 收缩 `visibleLine / inwardLine` 的 reply 直接影响面
说明：
保留它们做过渡兼容，但新主链不再依赖这类半句直接牵引输出。
evidence: `main-chat-session-runtime.ts` removes direct `visibleLine` use from `openingClaim / mustSay / openingMove` and keeps it as inner telemetry/control only.

- [x] 为 memory deliberation 增加抽象控制量
说明：
至少补：
`memoryPressure`
`certaintyPosture`
`relationshipVector`
`procedureCarryStrength`
`conflictBurden`
`surfacePermission`
`retrospectiveDepth`
evidence: `deriveMemoryDeliberationControlState(...)` in `main-chat-session-runtime.ts`.

- [x] 让 reply planner / answer planner / mind turn frame 只消费控制量
说明：
回复层拿到的是“回忆该怎么影响思考”，不是“该怎么说那句回忆”。
evidence: `main-chat-session-runtime.ts` now derives and consumes `memoryPressure / certaintyPosture / relationshipVector / procedureCarryStrength / conflictBurden / surfacePermission / retrospectiveDepth` in governance/runtime surfaces.

- [x] 建立“去半模板提示依赖”的回归
说明：
验证删掉 `visibleLine` 具体措辞后，LLM 仍然能在心智链下生成自然的 remembered answer，而不是退回壳子。
evidence: `main-chat-session-runtime.test.ts` and `response-surface-contract.test.ts` now assert memory-authored visible wording is not copied into planner/contract visible-surface guidance.

## P0：先想起“哪段时期”，再想起“什么事”

- [x] 做 `era / period selector` 心智层
说明：
在 episode / procedure 检索前，先让心智选：
`relationship-era`
`task-era`
`project-era`
`self-era`
evidence: `memory deliberation` now accepts `selectedEraIds` and resolves `selectedEras` from consolidated memories/windows in `runtime.ts` and `runtime-organic-memory-prompt.ts`.

- [x] 为长期记忆建立时期索引和摘要面
说明：
不是只靠散 event。
需要能从多条事件自动长成“那段时间”的 summary / dominant mood / dominant lesson / recurrent burden。
evidence: `memory-consolidation.ts` now builds `autobiographical` consolidation records with `relationship-era / task-era / self-era / phase` facets from multiple episodic events; `memory-consolidation.test.ts` covers facet generation and ranking.

- [x] 把时期选择接进长程提问
说明：
至少让下面几类问题先走时期选择，再落到事件：
`几天前我们聊过什么`
`之前那段时间你为什么总这么回我`
`以前你是怎么做这类事的`
evidence: `main-chat-session-runtime.ts` and `runtime-organic-memory-prompt.ts` now let `selectedEras` constrain foreground memory and push era summaries into planner/dialogue evidence before lower-level event detail.

- [x] 建立“先时期、后事件”的 replay 回归
说明：
验证不同问题会先选不同 era，而不是直接命中最近 session。
evidence: `main-chat-session-replay-harness.test.ts` and `runtime-organic-memory-prompt.test.ts` now assert long-range conversation / procedure / relationship questions foreground different eras before event detail.

## P1：让不确定、冲突、重构后的记忆像真人

- [x] 把冲突记忆显式接进 memory deliberation
说明：
当同类 episode 有冲突时，心智层应该拿到：
`conflictVariants`
`conflictSeverity`
`stableCore`
`unsafeDetails`
evidence: `runtime-soul.ts` / `runtime.ts` / `runtime-organic-memory-prompt.ts` now carry and synthesize `conflictVariants / conflictSeverity / stableCore / unsafeDetails`.

- [x] 让 answer planner 处理记忆不确定度
说明：
不是模板化地说“我不太确定”。
而是把不确定度变成：
答法更保守
细节粒度下降
更偏 summary 而不是细节断言
evidence: `main-chat-session-runtime.ts` now lowers certainty via conflict controls, sets `shouldWithholdSpecificity`, prefers stable core in evidence, and forbids unsafe details in planner surfaces.

- [x] 让 provenance 影响显式回忆方式
说明：
`observed / remembered / dreamt / inferred / reconstructed`
不能只显示在 telemetry。
它们要改变心智层是否敢说、说多细、是否要先留余地。
evidence: `main-chat-session-runtime.ts` now derives provenance-aware control state and adjusts certainty, unsafe detail guards, and explicit recall discipline; `main-chat-session-runtime.test.ts` covers dream residue / inferred-style recall handling.

- [x] 建立“冲突记忆 / 不确定回忆”回归
说明：
至少覆盖：
同一问题下两个冲突版本
被纠正后的 reconstructed 版本
回答自然降确定度但不掉进模板
evidence: `runtime-organic-memory-prompt.test.ts` / `main-chat-session-runtime.test.ts` / `memory-consolidation.test.ts`

## P1：把社会记忆更深地压进 recall，而不是只压进 reply style

- [x] 把 host person model 接进 recall ranking
说明：
当前 host person model 已能影响 reply posture。
下一步要让它直接影响“想起什么”：
不同 burden / trust stage / sensitivity 下，优先召回不同 episode / procedure / relationship line。
evidence: `runtime-organic-memory-prompt.ts` now socially re-ranks consolidations/windows/episodes/procedures from `host person model`; `runtime-organic-memory-prompt.test.ts` proves the same question foregrounds different relationship eras under cautious vs trusted host models.

- [x] 把 relationship doctrine 接进 recall suppression / activation
说明：
例如：
`repair before closeness`
应优先唤起修复线索，而不是亲近线索。
evidence: `runtime-organic-memory-prompt.ts` now uses `coreIncarnation` doctrine text via `buildRelationshipDoctrineGuidance(...)` to suppress closeness-heavy recall and foreground repair-first memory eras.

- [x] 建立“同一句话在不同关系阶段想起不同东西”的长程回归
说明：
这个回归要比 phase2 更长，至少跨多天、多 session。
evidence: `runtime-organic-memory-prompt.test.ts` now proves the same relationship-history question foregrounds different eras under cautious vs trusted host models, and doctrine can suppress closeness-heavy recall in favor of repair-first eras.

## P1：把 benchmark 做成真实开发闸门

- [x] 扩展 replay harness 场景集
说明：
增加：
`几天前`
`几周前那段时间`
`你是不是记错了`
`不是那次，是另一次`
`为什么你现在口气和那时候不一样`
evidence: `main-chat-session-replay-harness.test.ts` now covers long-range conversation-history, procedure-history, relationship-tone, conflict/reconsolidation, and dream-residue scenarios.

- [x] 增加 memory quality 断言
说明：
至少评估：
`era-first`
`bundle coherence`
`reply-memory coherence`
`reconsolidation effect`
`uncertainty discipline`
evidence: `main-chat-session-replay-harness.ts` now exports replay benchmark quality evaluation and `main-chat-session-replay-harness.test.ts` asserts these quality dimensions.

- [x] 把这些 benchmark 纳入每轮真人记忆开发验收
说明：
后续新改动不能只过单元测试，必须过这套 replay benchmark。
evidence: replay benchmark now lives in the maintained regression path `main-chat-session-replay-harness.test.ts` and is runnable alongside targeted `typecheck`.

## P2：更像真人的回忆节律

- [x] 做 delayed recollection / afterthought
说明：
有些记忆不是当句就想到，而是说到一半、或下一句才想起来。
要允许“迟到的回忆”进入后续 turn，而不是要求首句全想完。
evidence: `dialogue-session-manager.ts` marks inward recollection as `afterthought=ripe`; `main-chat-session-runtime.ts` feeds ripe recollection afterthought back into the next turn recall seed; covered by `dialogue-session-manager.test.ts` and `main-chat-session-runtime.test.ts`.

- [x] 做 involuntary recall / scene-triggered recall
说明：
不是只有用户问“你记得吗”才 recall。
某些场景、气氛、任务线程自然会把旧经验顶上来。
evidence: `runtime-organic-memory-prompt.ts` now derives a low-confidence scene-triggered `recollectionIntent` from familiar recalled episodes even when no explicit retrospective wording is present.

- [x] 做 familiarity / attachment bias 的更细粒度建模
说明：
让熟悉的线程、熟悉的工作模式、熟悉的关系紧张点更容易自然浮现，而不是全靠 query hints。
evidence: `runtime-organic-memory-prompt.ts` uses `sceneAttachment / recallCount` to trigger involuntary recall and re-ranks recall foreground using social familiarity, era affinity, and doctrine/host-model pressure; `runtime-organic-memory-prompt.test.ts` covers familiar scene-triggered recall.

## 本阶段完成定义

当以下条件同时成立，才允许把本计划视为完成：

- 被用户纠正过的记忆，会在未来 recall 中表现出实际排序和 certainty 变化。
- 回忆入口先走 era / period，再走 event / procedure / relationship meaning。
- 回复层不再依赖半模板记忆提示字段。
- 记忆冲突、重构、不确定度可以通过心智链自然表现到回复，而不是模板化声明。
- 长程 replay benchmark 能稳定区分“最近 turn 命中”与“真人式回忆”。
