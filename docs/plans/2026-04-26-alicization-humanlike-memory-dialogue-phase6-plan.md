# Alicization 真人记忆对话 Phase 6 开发计划

更新日期：2026-04-26

> 本文件从现在开始是唯一活跃开发计划。
> `2026-04-24-alicization-humanlike-memory-dialogue-phase5-plan.md` 视为已完成参考，不再继续追加任务。
> 后续每次落地代码，只更新本文件并勾选对应条目。

## 目标

Phase 6 不再以“补更多 recall 能力”为主，而是进入“心智生成权、记忆 authority、长期人格连续体、真实 benchmark 流水线”的重构阶段。

这一阶段的目标不是让 Alicization 更会“像人地说”，而是让她：

- 真的像人一样回想，而不是像搜索系统一样拼关键词。
- 真的像人一样根据关系、时机、上下文决定“想起但不说”“想起并轻提”“想起并直接回答”。
- 真的像人一样让人格、关系、任务经验、修复历史共同塑造回答，而不是由 scattered heuristics 临时叠加。
- 真的把 memory / mind / dialogue / proactive / execution / dream continuity 收到一条统一的 LLM mind-authority 闭环里。
- 真的把“真人感退化”变成可 replay、可 benchmark、可定位、可修复的问题，而不是只靠主观试聊。

最终必须满足：

- 正常可见回复必须只经过大模型心智链生成。记忆、benchmark、telemetry、surface contract 都只能约束与塑形，不能替代可见回复生成。
- reply 层不允许新增固定规则模板回复、固定记忆开场白、固定修复壳子、固定 uncertainty 壳子。
- 记忆系统必须从“能查到”进化成“会想起、会克制、会重建、会修正、会延续”。
- runtime 必须能解释：为什么想起、为什么不说、为什么只保 stable core、为什么这次语气不同、为什么这次先 inward 再 overt。
- benchmark gate 必须真正进入后续重构流程，成为 memory/runtime/reply/proactive 大改前后的硬门。

## 不可退让约束

- 正常回复路径必须保持 LLM mind authority。deterministic fallback 只能保留在 provider unavailable、infra failure、或显式测试桩路径。
- 不允许把更多“真人感”塞回字符串模板、reply patcher、post-hoc wording 替换器。
- 记忆检索不能退化为时间规则机；时间、场景、关系、affect 都只能作为 candidate shaping，而不是直接产出答案。
- provenance / uncertainty / ambiguity / contradiction / restraint 必须继续进入同一 deliberation 链，而不是分散在独立 guardrail。
- browser / runtime / fallback 不能各自维护一套不同的人格现实、记忆现实或 benchmark 现实。
- 任何新增 Phase 6 能力都必须可 replay、可 trace、可 benchmark、可 regression。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `commit: <hash>` 或 `evidence: <test/receipt>`
3. 优先补 runtime / replay / governance / organic-memory / benchmark 相关回归，而不是只补 UI happy path
4. 若新增 benchmark 数据集、真实采样 pack、telemetry 面板、诊断工具，必须在本文件记录用途、入口和门槛
5. 不再生成第二份并行活跃 plan；如范围变化，只更新本文件

## Phase 5 完成基线

上一阶段已经完成：

- memory decision trace query surface
- replay / trace lab 基础可视化
- humanlike memory adversarial benchmark pack
- replay benchmark gate helper 与 runtime/devtools 执行入口
- memory health / write health / retrieval health telemetry

参考：

- [phase5 plan](/Users/touhouqing/Desktop/GIT/airi-alice/docs/plans/2026-04-24-alicization-humanlike-memory-dialogue-phase5-plan.md)
- phase5 closing commit: `a267b22d`

## 当前架构债

Phase 6 开始前，最主要的债已经从“能力缺失”转成“authority 与边界不够干净”：

- `runtime.ts` 仍然太大，reply authority / memory continuity / proactive / execution / benchmark invoke 还没有降成清晰 orchestration shell。
- `db.ts` 已经承担 schema、retrieval、reconsolidation、ingest retry、stats projection、telemetry，继续堆会让 Phase 6 很快失控。
- `mind-surface-renderer.ts`、`main-chat-session-runtime.ts`、`response-surface-contract.ts` 虽然已抑制模板化，但“latent control”与“文字 realization”仍未完全解耦。
- `hostPersonModel / selfContinuity / relationship doctrine / reply stance / proactive timing / execution carry` 已互相接线，但还不是一个单一 person-state authority。
- replay benchmark 已能执行，但样本仍以合成 replay turn 为主，缺少真实长期对话、真实 repair arc、真实错线程和真实长任务迁移的持续采样。
- devtools 已能看 trace 和 gate report，但仍更像 viewer，不像 diagnosis console。

## 总体验收门槛

本阶段全部完成时，必须同时成立：

- Alicization 对“几天前我们聊过什么”“你以前怎么做这个”“为什么你这次不一样”“先继续我们上次那条线”“你是不是记错了那次修复”这类输入，不靠固定模板，而靠统一心智链完成 recall、restraint、repair 和回答。
- 同一句输入在不同关系阶段、不同任务 continuity、不同 repair 历史、不同 afterglow 里，会想起不同东西、说出不同姿态，但依然只通过同一 LLM reply authority 生成可见文本。
- 系统能稳定解释并 replay：
  - 为什么想起这段
  - 为什么没说
  - 为什么只说 stable core
  - 为什么 tone 变轻/变重
  - 为什么 execution continuity 没抢当前 answer
- memory / runtime / reply / proactive / execution 的重构都必须先过 benchmark gate，再允许宣称“真人感更强”。

## Wave 1：单一 Reply Authority 重构

- [x] 把正常可见回复生成权彻底收口到单一 mind-authority pipeline
说明：
`mind-surface-renderer / main-chat-session-runtime / response-surface-contract / answer-compiler`
要分成：
`latent answer contract`
`reply realization contract`
`provider-executed visible reply`
不能继续让多个层同时拥有半套 wording authority。
阶段进展：
已先把 `visibleReplyAuthority` 显式化为 shared contract，并贯穿到 `AlicizationMindTurnGovernance` / `AlicizationDialogueStructuredPayload`，让 replay / governance / fallback 不再只能靠 `parsePath` 或 audit 文本猜测是谁在生成可见回复。当前已明确区分：
`llm-mind`
`governed-repair-fallback`
`local-deterministic-fallback`
evidence-so-far: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `apps/stage-tamagotchi/src/main/services/alicization/mind-surface-renderer.ts`, `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`
本轮新增收口：
`normalizeCompactReplyPayload(...)` 已改成默认对非 `local-only`、非 `utility-time/date` lane 使用 `escalate-by-default`，不再给普通 `compact-one-shot` 对话 lane 留下 silently 产 deterministic visible text 的 helper 侧门。`main-chat-timeout-fallback.ts` 这种 infra repair 文本也显式标成 `local-deterministic-fallback`，不再伪装成 `llm-mind`。这一步把“正常路径 helper 误用”与“明确 utility / infra authority”边界拉直了，但还未完成整条 single realization pipeline 的最终收口。
evidence-this-round: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步收口：
`runtime.ts` 已不再把那条历史的 `resolveActiveDialogueDeterministicReply` follow-up/payoff producer接进主聊天背景流装配，避免 future code 把它误当成 provider-available 的正常可见回复路径。当前主聊天背景流里，normal active dialogue compact lane 已只保 `normalizeAlicizationActiveDialogueFastPathReplyOrEscalate(...)` 这条 mind-authored 路径，而 deterministic visible text 只留在 `utility-time/date`、`local-only`、timeout/infra repair 这类明确 fallback/authoritative local lane。
evidence-this-round-2: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步收口 3：
`main-chat-follow-up-payoff.ts` 已被明确降成 fallback-only helper：只有 `decision.strategy === 'local-only'` 才允许生成 execution follow-up deterministic visible text；`compact-one-shot` 等 normal provider path 会直接返回 `null`，不能再把这条旧 helper 当作 provider-available 的正常回答器。相关 payload 也显式标成 `local-deterministic-fallback`。这一步把 execution/follow-up 这类残留 deterministic producer 从“历史可见回复工具”收回到“显式 fallback helper”。
evidence-this-round-3: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步收口 4：
`answer-compiler.ts` 与 `response-surface-contract.ts` 现在已显式产出 `replyRealizationMode=provider-mind-required` 和 `expectedVisibleReplyAuthority=llm-mind`，把“normal path 必须由 provider-mind 完整 realize visible reply”从隐含约定提升成主干 contract；`visual-episodic-memory.ts` 也已兼容这两个字段的状态 round-trip。这样 Phase 6 Wave 1 已经从 fallback/helper 收口推进到 answer spine 本体，而不只是外围 audit 标记。
evidence-this-round-4: `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`, `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步收口 5：
`main-chat-runtime-surface.ts` 现在显式产出 `replyAuthority` surface（`replyRealizationMode / expectedVisibleReplyAuthority / whyProviderMindRequired`），让 prepared execution 阶段不再只能靠 `answerCompiler` 和 `responseSurfaceContract` 各自隐含表达“这轮必须由 provider-mind 落 visible reply”。`main-chat-runtime-surface.test.ts`、`answer-compiler.test.ts`、`response-surface-contract.test.ts` 现在一起锁住这条 latent-vs-realization contract，证明 normal reply spine 已经能在 prepared/runtime surface 层被直接 replay 和检查，而不是只在最终 structured payload 上回推。
evidence-this-round-5: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步收口 6：
`main-chat-session-runtime.ts` 现在把 `replyRealization` 显式挂进 `AlicizationPreparedMainChatExecutionResult`，并直接从 `runtimeSurface.replyAuthority` 投影出来。这意味着 prepared execution 阶段已经不再只携带：
`latent answer contract`
`reply realization contract`
而是开始携带可直接 replay / benchmark 的 `prepared provider-visible-reply contract`，后续主聊天背景流、trace、gate、devtools 都可以直接读这层，而不用再从最终 structured payload 倒推 authority。当前 `main-chat-session-runtime.test.ts` 已锁 `replyRealizationMode=provider-mind-required` 与 `expectedVisibleReplyAuthority=llm-mind` 在 prepared 结果上存在。
evidence-this-round-6: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步收口 7：
`main-chat-background-run.ts` 现在维护显式的 `visibleReplyExecution` 运行态快照，并把它带进 `stream meta / finish payload`。这层结构会说明这轮可见回复实际是：
`provider-stream`
`provider-one-shot`
`local-fallback`
以及它的 `expectedVisibleReplyAuthority / actualVisibleReplyAuthority / providerMindExecuted / reason`。同时 `main-chat-session-runtime.ts` 与 `main-chat-runtime-surface.ts` 已经显式产出 `replyExecutionPlan`，把主聊天从“latent answer contract / reply realization contract”推进到“prepared execution contract + actual execution result”都可见的状态。`main-chat-background-run.test.ts` 现在锁 `active-dialogue-fast-path`、`execution-first-inline`、`provider stream` 都会把这层 execution data 带到 finish payload，而不再只剩 `finishReason/fullText`。
evidence-this-round-7: `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-meta.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步收口 8：
新增 `main-chat-visible-reply-execution.ts` 作为单一 visible reply execution helper，把 `provider-stream / provider-one-shot / inline execution payoff / timeout recovery / local fallback` 统一成同一类 `resolved visible reply` 结果对象。`main-chat-stream-runner.ts` 现在直接返回 provider 实际执行出的 `visibleReplyExecution`；`main-chat-background-run.ts` 不再在各条分支里临时猜 execution authority，而是统一消费 `resolved visible reply`；timeout recovery 的 required-tool 分支也不再直接把 raw tool 结果塞给用户，而是回到同一条 execution payoff surface。与此同时，`main-chat-run-lifecycle.ts` 在 timeout recovery 成功后会继续补发 `gateway-unreachable-advisory`，避免“恢复成功但主网关已断”在诊断面静默消失。到这一步，Wave 1 的 `latent answer contract -> reply realization contract -> provider-executed visible reply` 三层已经真正闭环，不再是准备态和完成态各自一半。
evidence-this-round-8: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 deterministic visible text 彻底压缩到 failure-only path
说明：
正常 provider available 路径不允许再靠 deterministic patch 文案“补人味”。
deterministic 只保留：
provider unavailable
infra failure
测试桩
显式 repair fallback
本轮收口：
`main-chat-active-dialogue-loop.ts` 不再允许 `utility-time/date` 在 provider 可用时 silently 掉回本地 deterministic clock 文案；invalid compact reply 现在会升级到更高层 runtime recovery，而不是留在 utility lane 里本地修字。与此同时，`execution-delivery-surface.ts` / `runtime.ts` / `main-chat-background-run.ts` 把 execution payoff surface 的 authority 拆干净了：
- provider 正常写出的 execution/callback reply 现在明确是 `llm-mind`
- provider 可用但 reply 需要修复时，统一落到 `governed-repair-fallback`
- `local-deterministic-fallback` 只留给 provider unavailable / infra fallback / 显式 deterministic recovery
这样 execution/proactive 不再把 provider-available repair surface 伪装成 local deterministic authority。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`, `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-required-tool-recovery.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 reply-authority 不变量回归
说明：
至少覆盖：
normal-path 不走模板壳
memory relevant 但 inward-only 时不会偷 surface
repair fallback 本地化不退化
execution/proactive 不会绕过同一 reply authority
本轮新增：
新增 [reply-authority-invariants.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts)，显式锁住四条边界：
- normal path 仍是 `provider-mind-required + llm-mind`
- inward-only recollection 不会偷 visible reply authority
- execution payoff 的 `llm-mind / governed-repair-fallback` 边界不漂移
- utility-time invalid compact reply 会升级，不会滑回 local deterministic wording
同时原有 `response-surface-contract.test.ts`、`main-chat-background-run.test.ts`、`runtime-delivery-reminders.test.ts`、`main-chat-session-replay-harness.test.ts` 继续覆盖 memory/execution/replay 侧 authority 闭环。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 2：Memory Domain 与 Runtime 解耦

- [x] 把 `db.ts` 拆成 memory domain 子层
说明：
至少拆出：
`memory-schema / repository`
`memory-ingest-journal`
`memory-retrieval`
`memory-reconsolidation`
`memory-stats-projection`
`memory-benchmark-feedback`
本轮进展：
已先把 `memory-stats-projection` 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立模块 [memory-stats-projection.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts)，`db.ts` 现在只负责 gather rows + tier counting，最终 stats contract 组装与 integrity projection 由独立 memory 子层负责。这还不算 Wave 2 第一项全部完成，但已经把 `memory-stats-projection` 这一块从大文件里切出来了，后续继续拆 ingest/retrieval/reconsolidation 会更稳。
进一步进展：
本轮继续把 `memory-ingest-journal` 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立 runtime 工厂 [memory-ingest-journal.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-ingest-journal.ts)。现在 `db.ts` 只保留：
- 具体 payload 结构
- `parseMemoryIngestPayload(...)`
- `applyMemoryIngestPayload(...)`
- 何时 enqueue/drain
而 journal 自己负责：
- append pending entries
- pending/failed count
- ingest health projection
- retry/backoff drain
这一步已经把“记忆写入可靠性层”从大而全的 sqlite DAO 中独立出来，后续继续拆 `memory-retrieval` 和 `memory-reconsolidation` 时不会再和 retry/drain 机制缠在一起。
进一步进展 2：
本轮继续把事实记忆检索从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立 retrieval helper [memory-fact-retrieval.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.ts)。`retrieveMemoryFacts(...)` 现在在 `db.ts` 里只保：
- 拉取 facts rows
- access_count / last_access_at 回灌
- retrieval latency telemetry 写回
而具体的事实召回排序，包括：
- lexical overlap
- 冷记忆长尾可达性
- tier reachability 加权
都下沉到 retrieval 子层。这一步已经让 facts recall 不再和 sqlite DAO 粘在一起，后续继续拆 episodic retrieval / graph walk 时可以沿同一方向推进。
进一步进展 3：
本轮继续把 episodic retrieval 的纯排序/干扰/重建逻辑从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立模块 [memory-episodic-retrieval.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-retrieval.ts)。现在 `searchEpisodicEvents(...)` 在 `db.ts` 里主要只保：
- 拉取 episodic rows
- 将 ranked candidates 写回为 reconsolidated rows
- graph retrieval latency telemetry
而真正的：
- thread / affect / relationship / scene / intent 混合排序
- semantic graph boost
- afterglow / cross-session carry boost
- false-memory risk / contradiction / interference shaping
- recalled event reconsolidation build
都已经下沉到 retrieval 子层。这一步开始真正把“经历怎么被想起”从 sqlite DAO 里剥离出来，后续再做 unified deliberation kernel 时，就能直接消费 retrieval authority，而不是继续钻数据库实现细节。
进一步进展 4：
本轮继续把 conversation-history recall 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立模块 [memory-conversation-retrieval.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-conversation-retrieval.ts)。现在 `searchConversationTurnsForRecall(...)` 在 `db.ts` 里只保：
- 读取 conversation_turns rows
- 把 rows 交给 retrieval 子层
而具体的：
- retrospective vs experience-matched 权重
- old-memory boost / anti-recent penalty
- agenda time scope / procedure line / relationship boost
- same-day de-dup
都已经从 sqlite DAO 中移走。到这一步，Wave 2 的 `memory-retrieval` 已经开始拆成三段：
- facts retrieval
- episodic retrieval
- conversation retrieval
后续继续拆 consolidation retrieval / retrieval telemetry aggregator 时，会更容易把 memory search authority 统一到同一层。
进一步进展 5：
本轮继续把 retrieval telemetry 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立 runtime [memory-retrieval-telemetry.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts)，并补了 [memory-retrieval-telemetry.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts)。现在 `db.ts` 在 retrieval telemetry 这条线上只保：
- 实例化 telemetry runtime
- 在 retrieval / override 路径里调用 runtime
而真正的：
- telemetry snapshot 默认值 / normalize
- latency blend
- semantic / graph latency record
- retrievalHealth override merge
都已经从 sqlite DAO 中移走。这里还顺手修掉了一个真实队列闭环 bug：`overrideMemoryStats()` 原先在外层 `enqueueWrite()` 内再调用 telemetry override，会形成二次入队死等；现在 runtime 区分 queued / inline override，避免写队列自锁。
进一步进展 6：
本轮继续把 consolidation list/search/rebuild 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立 runtime [memory-consolidation-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation-runtime.ts)，并补了 [memory-consolidation-runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation-runtime.test.ts)。现在：
- [memory-consolidation.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation.ts) 保纯算法：`buildMemoryConsolidationRecords(...)` / `searchMemoryConsolidationRecords(...)`
- [memory-consolidation-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation-runtime.ts) 保 list/search/rebuild/persist runtime
- `db.ts` 只保拉取 episodic rows 后把 events 交给 runtime
这一步让 `memory-reconsolidation` 和 `memory-retrieval` 之间的边界更清楚：consolidation 生成和 consolidation 查询已经不再直接粘在 sqlite DAO 上，后续再拆 `memory-reconsolidation` 时不会重新把 period/event abstraction 和 persistence 混在一起。
进一步进展 7：
本轮继续把 episodic recall 之后的 reconsolidation/persist 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立 runtime [memory-episodic-reconsolidation-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-reconsolidation-runtime.ts)，并补了 [memory-episodic-reconsolidation-runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-reconsolidation-runtime.test.ts)。现在 `searchEpisodicEvents(...)` 在 `db.ts` 里只保：
- 读取 episodic rows
- 调 retrieval 子层做 ranking
- 调 reconsolidation runtime 做 returned-event persist
- 记录 retrieval latency telemetry
而真正的：
- recalled episodic event 的 reconsolidation build
- `latest_reconsolidation_json / reconsolidation_count / lesson / relationship_meaning / emotion_tags` 写回
已经不再直接埋在 sqlite DAO 里。这样“记忆被再次想起后如何改写”这条闭环，已经有了独立 authority，可以继续往 unified deliberation kernel 收，而不会再和 SQL update 细节绑死。
进一步进展 8：
本轮继续把 `mind head + mind turn events` 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立 runtime [memory-mind-state-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-mind-state-runtime.ts)，并补了 [memory-mind-state-runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-mind-state-runtime.test.ts)。现在：
- `readMindHead / upsertMindHead`
- `appendMindTurnEvents / listMindTurnEvents`
都不再由总 DAO 自己展开实现，而是走独立 memory runtime
- 同时 [relationship-dynamics-state.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/relationship-dynamics-state.ts) 也从 `db.ts` 类型面分离出来，reply / memory / execution 路径不再需要直接 type-import `db`

这一步的重要性在于，`person-state-updated`、`memory decision trace`、`mind replay`、`visual continuity` 这类回放与人格状态能力，开始拥有单独的 memory repository 边界，而不是继续和整个 sqlite service 混在一起。对后续 `runtime.ts` orchestration shell 化也有直接帮助，因为 runtime 可以逐步只面对 memory runtime port，而不是碰整块 DAO。
进一步进展 9：
本轮继续把 `reflection / relationship outcome / reinforcement / relationship dynamics` 与 `active thoughts / subconscious fragments` 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立仓储 runtime：
- [memory-relationship-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-relationship-runtime.ts)
- [memory-subconscious-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-subconscious-runtime.ts)

这一步完成后，`db.ts` 在 memory domain 这条线上已经不再自己展开：
- reflection persistence/list
- relationship outcome persistence/list
- persona reinforcement persistence/list
- relationship dynamics persistence/latest
- active thought replace/list
- subconscious fragment append/search/list/count

同时本轮还修回了真实行为回归：`memory-episodic-retrieval.ts` 里 cross-session afterglow maintenance episode 的 recall 排序重新被拉回正确优先级，保证“上一轮余温还在”的 maintenance/autobiographical seam 在 `experience-matched + carryAsMemory` 下不会被 raw episode 压掉。这样主闭环不仅架构上拆干净了，行为上也没有退化。

所以这项现在可以打勾。到这一步，Phase 6 对 `db.ts` 的要求已经满足：
- memory-stats-projection
- memory-ingest-journal
- memory-retrieval
- memory-reconsolidation
- memory-mind-state
- memory-relationship
- memory-subconscious
都已经有独立 runtime/repository 边界。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-ingest-journal.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-retrieval.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-conversation-retrieval.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-reconsolidation-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-mind-state-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-relationship-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-subconscious-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/relationship-dynamics-state.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 `runtime.ts` 降成 orchestration shell
说明：
把：
`reply authority`
`memory continuity`
`proactive`
`execution callback`
`benchmark invoke`
拆成独立 runtime module。
`runtime.ts` 只保 card-scope orchestration、invoke registration、生命周期收口。
本轮进展：
已先把对话反馈触发的记忆重固结编排链从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 runtime [runtime-memory-reconsolidation.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-reconsolidation.ts)，并补了 [runtime-memory-reconsolidation.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-reconsolidation.test.ts)。现在 `runtime.ts` 不再自己展开：
- recall telemetry text 收集
- reply-memory coherence state 提取
- dialogue feedback reconsolidation rationale
- `searchEpisodicEvents(...)` 重固结调用
- `memory-reconsolidated` trace event append
而是把这条链作为独立 memory runtime 调用。这一步既推进了 runtime shell，也把“宿主纠正后记忆如何改写”的 orchestration authority 从超大文件里挪出来，后续继续抽 `proactive` / `execution callback` / `benchmark invoke` 时会更顺。
进一步进展：
本轮继续把 `organicMemoryAccessRuntime + memorySearchRuntime + memoryReconsolidationRuntime` 的组装从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 收成独立 facade [runtime-memory-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.ts)，并补了 [runtime-memory-runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts)。现在 `runtime.ts` 里原来那大段：
- organic memory access wiring
- memory search wiring
- memory reconsolidation wiring
已经收成一个独立 memory runtime builder，主 runtime 只负责把 db/soul/gateway planners 注进去并拿回：
- `getOrganicMemorySnapshot`
- `resolveOrganicMemoryPromptContext`
- `buildOrganicMemorySystemBlocks`
- `buildProactiveRecallSeed`
- `memoryReconsolidationRuntime`
这一步让 `runtime.ts` 在“记忆怎么接进主心智链”这块明显更接近 orchestration shell，而不是继续自己组装三层子 runtime。
进一步进展 2：
本轮继续把 ordinary dialogue feedback settlement 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 runtime [runtime-dialogue-feedback.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-dialogue-feedback.ts)，并补了 [runtime-dialogue-feedback.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-dialogue-feedback.test.ts)。现在主 runtime 不再自己展开：
- 找最近一条 ordinary dialogue reply
- reply feedback ack key / 去重
- 关系态度更新
- feedback closure 持久化
- 调 memory reconsolidation runtime
- feedback 审计落盘
而是把这整条“宿主纠正普通回复之后如何结算”的链交给独立 runtime。这样一来，`runtime.ts` 在记忆/对话闭环这里不只是多了 memory facade，而是开始把普通对话反馈这条真实用户路径也从超大文件里剥开了，后续继续抽 proactive / execution callback settlement 就有了相同的模式。
进一步进展 3：
本轮继续把 proactive feedback settlement 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 runtime [runtime-proactive-feedback.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-proactive-feedback.ts)，并补了 [runtime-proactive-feedback.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-proactive-feedback.test.ts)。现在主 runtime 不再自己展开：
- `reply-within-120s` proactive outcome settlement
- expired proactive outcome settlement
- proactive feedback outcome closure persist
- proactive feedback session mirror sync
- proactive feedback audit + wake queue
而是把这两条 settlement 链交给独立 runtime。这样 `runtime.ts` 在“主动行为如何被宿主接住、忽略、超时后如何回灌记忆/关系/会话镜像”的这块也开始变成纯编排壳，而不是继续把所有主动行为细节塞在一个文件里。
进一步进展 4：
本轮继续把 execution proposal / result feedback settlement 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 runtime [runtime-execution-feedback.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-feedback.ts)，并补了 [runtime-execution-feedback.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-feedback.test.ts)。现在主 runtime 不再自己展开：
- pending execution proposal feedback settlement
- finished execution result feedback settlement
- task-thread metadata 回写
- execution feedback outcome closure persist
- execution feedback 审计落盘
而是把 proposal/result 两条执行反馈链交给独立 runtime。这样 `runtime.ts` 在“执行线程被宿主接受/拒绝/评价之后如何回灌执行经验、关系状态和后续行为”的这块也开始变成纯编排壳。到这一步，ordinary dialogue / proactive / execution feedback 三类 settlement 都已经有了同样的抽离模式，后续继续压 `execution callback` 或 `maintenance/invoke` 编排会更顺。
进一步进展 5：
本轮继续把 execution callback / delivery orchestration 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 facade [runtime-execution-delivery.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts)，并补了 [runtime-execution-delivery.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.test.ts)。现在主 runtime 不再自己展开：
- execution delivery state persist / restore
- settled callback queue candidate
- execution callback surface生成
- execution delivery policy / self continuity / host person model resolve
而是把这整段 execution delivery facade 交给独立 runtime，再由 [runtime-delivery-reminders.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts) 消费。这样 `runtime.ts` 在 callback/reminder delivery 这块也开始收成“只注入依赖、只调用 facade”的形态，不再自己兼任 state store、surface builder 和 queue manager。
进一步进展 6：
本轮继续把 direct dialogue 主路径的 `main-chat-context + inspection-intent + prelude wiring` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 收成独立 facade [runtime-main-chat-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-runtime.ts)，并补了 [runtime-main-chat-runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-runtime.test.ts)。现在主 runtime 不再自己分散组装：
- `runtime-main-chat-context`
- `runtime-inspection-intent`
- `runtime-main-chat-prelude`
而是通过一个统一 main-chat runtime facade 挂接记忆/context/perception 入口，再把 `prepareMainChatPrelude / prepareMainChatExecution` 暴露给主聊天入口。这样 direct dialogue 主路径里“记忆怎么进当前回合心智链”的 wiring 也开始脱离总 runtime 文件，和前面抽出的 memory / feedback / delivery facade 形成同一层次。
进一步进展 7：
本轮继续把普通 dialogue 的 `ack / proactive bubble retry / reply-feedback ack persistence / dialogue responded dispatch orchestration` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 facade [runtime-dialogue-delivery.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-dialogue-delivery.ts)，并补了 [runtime-dialogue-delivery.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-dialogue-delivery.test.ts)。现在主 runtime 与 dialogue invoke handler 不再自己展开：
- dialogue ack cursor persist / restore
- ordinary reply feedback ack persist / restore
- proactive bubble 的 unacked retry backoff
- ack 后 pending delivery 清理
- dialogue responded 的 runtime-level delivery bookkeeping
而是统一交给 dialogue-delivery facade。这样“普通对话有没有真的送达、有没有被宿主确认、有没有因为 renderer 没接住而重试、对话反馈是否重复结算”这条闭环也开始脱离总 runtime 文件，和前面抽出的 execution/proactive/memory facade 站到同一层级。它直接服务于你要的目标：记忆与人格成长不能只依赖 reply 生成，还要保证 ordinary dialogue 这条真实用户接触面本身具有稳定 delivery/ack authority。
进一步进展 8：
本轮继续把 `perception / visual presence / mind-head persist` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 facade [runtime-visual-presence-state.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.ts)，并补了 [runtime-visual-presence-state.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts)。现在主 runtime 不再自己展开：
- `persist/restore/ensure perception state`
- `persist/restore/ensure visual presence state`
- `mind-heads.persist`
- visual presence debounce fingerprint 持久化

而是通过一个独立 runtime 只注入：
- `card scope`
- `db meta + mind head port`
- `perception/visual state map`
- `emitVisualPresenceState`

这样 `runtime.ts` 在“视觉态和心智头如何跨 card 恢复、如何持久化、如何发事件”这块又少掉了一大段状态型实现，更接近只保 orchestration 的壳层。这个抽离也直接保护“真人记忆对话”目标，因为 visual presence、mind heads、autobiographical self 不再和主聊天编排混在一起，后续继续收口记忆/对话闭环时不容易反向把状态细节拖回主 runtime。
进一步进展 9：
本轮继续把 `outcome closure + autobiographical episode backfill` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 facade [runtime-memory-closure.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.ts)，并补了 [runtime-memory-closure.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.test.ts)。现在主 runtime 不再自己展开：
- `persistOutcomeClosure`
- `persistAutobiographicalEpisodes`
- `persistPreparedMirrorAutobiographicalEpisodes`
- `persistSessionMirrorAutobiographicalEpisodes`

而是统一通过一个 memory-closure facade 去负责：
- reply / proactive / execution outcome 的人格与记忆成长落盘
- person-state-update-surface 更新
- `person-state-updated` replay ledger append
- session mirror / prepared mirror 的 autobiographical episode backfill

这一步的重要性很高，因为“经历一次事之后，关系怎么变、人格怎么变、记忆怎么留下来”已经不再散在主 runtime 的多个位置，而开始形成单一 closure authority。对你要的目标很直接：记忆/心智/对话闭环不只是 recall 时像真人，连经历后的成长也开始像一个持续存在的人格系统，而不是一堆临时 side effect。
进一步进展 10：
本轮继续把 `SOUL lifecycle / bootstrap / genesis / watch` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 facade [runtime-soul-lifecycle.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-soul-lifecycle.ts)，并补了 [runtime-soul-lifecycle.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-soul-lifecycle.test.ts)。现在主 runtime 不再自己展开：
- `readSoulSnapshot`
- `cleanupLegacyProfileFiles`
- `ensureWatchState`
- `bootstrap`
- `queueSoulMutation`
- `initializeGenesis`

而是通过一个独立 lifecycle facade 统一处理：
- SOUL 文件首次初始化
- SOUL hash/revision 演进
- fs.watch 热重载
- queued mutation 串行化
- genesis 初始化冲突处理

这一步对“真人记忆对话闭环”也有直接价值，因为人格种子、host attitude、core incarnation、persona notes 不再和主对话编排文件缠在一起，SOUL 这一层终于开始成为真正独立、可演化、可审计的生命周期边界。
进一步进展 11：
本轮继续把 `session / scoped kill-switch / known-card discovery` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 facade [runtime-card-scope-state.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-state.ts)，并补了 [runtime-card-scope-state.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-state.test.ts)。现在主 runtime 不再自己展开：
- `normalizeSessionId`
- `getScopedKillSwitchSnapshot`
- `persistScopedKillSwitch`
- `persistActiveSessionId`
- `restoreActiveSessionId`
- `ensureActiveOrLatestSessionId`
- `listKnownCardIds`
- `restoreScopedKillSwitch`

这一步的意义是：跨 card 的 session continuity、kill-switch scope 和已知 card 发现，不再是主 runtime 的内联状态细节，而开始成为一个独立状态面。这样 reply/proactive/execution/memory 在取 session 和 scope state 时，越来越像在消费统一 runtime port，而不是直接碰主 runtime 的内部可变细节。
进一步进展 12：
本轮继续把 `clearAllConversationData / deleteAllAlicizationData` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 抽成独立 facade [runtime-card-scope-lifecycle.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-lifecycle.ts)，并补了 [runtime-card-scope-lifecycle.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-lifecycle.test.ts)。现在这条跨 card 清空/重启链不再由主 runtime 自己展开：
- `listKnownCardIds`
- per-card `clearConversationData + reset meta`
- dialogue/proactive/execution/visual/session-mirror state 清理
- active card restore
- next reminder due re-schedule
- delete-all 时的 in-memory state reset / provider reset / default scope reboot

而是通过一个独立 lifecycle facade 完成。这样 `runtime.ts` 在 card-scope teardown / reboot 这块也开始变成“注入依赖 -> 调 facade”的形态，不再自己握着所有 reset 细节。这一步直接服务于你要的闭环目标，因为 conversation reset 和 delete-all 不再只是删数据，而是更稳定地同步清掉影响人格/记忆现实的 ancillary state，不会让 browser/runtime/fallback 留下三套残余现实。
进一步进展 13：
本轮继续把 `switchCardScope / withCardScope` 从 [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 收成独立 facade [runtime-card-scope-orchestrator.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-orchestrator.ts)，并补了 [runtime-card-scope-orchestrator.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-orchestrator.test.ts)。现在主 runtime 不再自己定义 scope queue 规则，而是通过一个独立 orchestrator 统一处理：
- same-card fast path
- queued cross-card serialization
- `card-scope.acquired / completed` debug lifecycle
- scope switch wrapper

到这一步，`runtime.ts` 里原本最重的几块都已经拆出成独立 runtime/facade：
- memory runtime
- dialogue/proactive/execution feedback
- execution delivery
- main chat prelude runtime
- visual presence state
- memory closure
- soul lifecycle
- card-scope state
- card-scope lifecycle
- card-scope orchestrator

这说明本项现在可以打勾。`runtime.ts` 虽然还保留少量低层 glue 和 lifecycle 收口，但“reply authority / memory continuity / proactive / execution callback / benchmark invoke / card-scope lifecycle” 这些主职责都已经不再以大段内联实现存在，而是通过独立 runtime module 被主 runtime 编排。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-reconsolidation.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-dialogue-delivery.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-dialogue-feedback.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-proactive-feedback.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-feedback.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-soul-lifecycle.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-state.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-lifecycle.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-orchestrator.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-orchestrator.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-card-scope-lifecycle.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "clears conversation and reminder data across all card scopes|deletes userData alicizations root and reboots default scope when delete-all-data is invoked|uses active session binding when appending turn without sessionId|auto-creates fallback session when no session is available|binds latest persisted session when active session is missing"`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-dialogue-delivery.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 memory stats contract 提升为 shared single source
说明：
现在 `eventa.ts` 和 `alicization-bridge.ts` 各有一份 `AlicizationMemoryStats` 形状。
Phase 6 要把它移到 shared contract，避免继续双份漂移。
本轮完成：
新增 [alicization-memory-stats.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-shared/src/alicization-memory-stats.ts) 并导出到 [packages/stage-shared/src/index.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-shared/src/index.ts)，让 [apps/stage-tamagotchi/src/shared/eventa.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/shared/eventa.ts) 与 [packages/stage-ui/src/stores/alicization-bridge.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/stores/alicization-bridge.ts) 都只 re-export 同一个 shared `AlicizationMemoryStats`。这一步把 browser/runtime 的 memory stats contract 漂移点消掉了，后续 memory health / replay benchmark telemetry 再扩展时不需要双份同步。
evidence: `packages/stage-shared/src/alicization-memory-stats.ts`, `packages/stage-shared/src/index.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`; tests: `pnpm -F @proj-alicization/stage-shared typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 memory domain 解耦回归
说明：
至少验证：
ingest retry 不因拆层失效
telemetry projection 不失真
browser/runtime/fallback contract 不漂移
reply path 不直接依赖 db 细节
本轮完成：
新增 [memory-domain-decoupling-regression.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts)，把这项收成一份独立 regression pack，直接锁住四条关键不变量：
- `memory-ingest-journal` 拆出后，retry / backoff / drain 仍然能从 failed 回到 applied
- `memory-retrieval-telemetry` 与 [memory-stats-projection.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts) 之间的投影不会把 ingest/write/retrieval health 扭坏
- reply / recollection 主路径模块不允许再直接 import `./db`
- browser fallback 的 memory stats 继续对齐 shared contract，而不是长出浏览器私有 shape

进一步进展：
本轮还顺手把 [AlicizationRelationshipDynamicsState](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/relationship-dynamics-state.ts) 从 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) 抽成独立类型文件，让：
- [runtime-organic-memory-access.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts)
- [humanlike-memory.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/humanlike-memory.ts)
- [memory-search-retrieval-operators.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-search-retrieval-operators.ts)
- [runtime-soul.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-soul.ts)
- [executor-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts)
不再需要直接 type-import `db` 才能运行 memory / reply / execution 语义。

这样这项现在可以打勾，因为四个验收门都已经有明确测试，并且新的结构性测试会在后续继续拆 [db.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.ts) / [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 时直接拦回归。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-ingest-journal.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/relationship-dynamics-state.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts -t "lists grouped browser-local memory decision traces instead of only raw event rows|keeps browser-local memory stats aligned with the shared runtime contract instead of drifting into a fallback-only shape"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`

## Wave 3：统一 Person-State Authority

- [x] 把 `hostPersonModel / selfContinuity / relationship doctrine / rhythm state / repair stance` 收成单一 `person-state projection`
说明：
reply、proactive、execution、memory deliberation 都从同一 person-state 读，
不再各模块自行拼 relationship posture。
本轮进展：
已新增 [person-state-projection.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.ts)，把：
- `hostPersonModel`
- `relationship doctrine`
- `personalityContinuityState`
- `preferred proactive style`
- `relationship posture`
- `opening guidance`
先收成一层统一 projection。当前已接入：
- [digital-life-kernel.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts)：runtime surface memory 现在显式携带 `personStateProjection`
- [main-chat-session-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts)：dialogue governance 与 socially-shaped runtime surface 改为统一读 projection，不再各自重拼 host preference / doctrine / posture
- [answer-compiler.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts)：当 runtime surface 已带 projection 时，relationship posture 改读 projection authority
- [current-conscious-frame.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.ts)：优先沿同一 projection continuity state
- [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts)：LLM proactive prompt 与 local proactive fallback 现在都读同一 `personStateProjection`，不再各自维护一套 host/doctrine/social style 现实
进一步进展：
本轮继续把 execution continuity 也接到同一层 person-state authority。当前：
- [execution-delivery-surface.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts) 的 deterministic payoff、LLM payoff selection、payoff prompt 都已支持 `personStateProjection`
- [runtime-execution-delivery.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts) 新增 `resolveExecutionPersonStateProjectionForRuntime(...)`，优先复用当前 session/runtime surface 上已有 projection，否则再从 runtime surface + hostPersonModel 补建
- [runtime-delivery-reminders.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts) 在 execution callback subconscious delivery 链里，已把 `personStateProjection` 传进 deterministic fallback、LLM reply surface selection、payoff prompt
- [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 现在把 `resolveExecutionPersonStateProjectionForRuntime` 接进主 runtime wiring
这样 dialogue / proactive / execution 三条 visible social line 已开始共用同一层 person-state authority，不再是：
- dialogue 一套 relationship posture
- proactive 一套 host/doctrine social style
- execution callback 再自己拼一套 cautious delivery
进一步进展 2：
本轮把 memory deliberation 这条线也接进了同一个 projection，而不是继续在 host model 上做第二次人格解释：
- [runtime-soul.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-soul.ts) 的 `OrganicMemoryPromptContext` 现在显式携带 `personStateProjection`
- [runtime-organic-memory-prompt.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts) 会按当前 recall seed / recollection intent 构建同一 `buildAlicizationPersonStateProjection(...)`
- memory-side 的：
  - host social recall bias
  - relationship stage alignment
  - host social affinity re-ranking
  - memory system block
  现在都优先吃 `personStateProjection`
- 也就是说，记忆回想层在决定：
  - 哪段关系期更该先想起
  - repair-first 还是 closeness-first
  - focused-work 下该压哪类 warm recollection
  - execution callback 该优先保什么 thread-faithful 记忆
  时，不再只靠 `hostPersonModel` 的散字段，而是直接走同一层 projection authority

这样 Wave 3 的四条主线现在都已经共用同一人格 authority：
- reply
- proactive
- execution
- memory deliberation

所以这一项现在可以打勾。`hostPersonModel` 仍然是长期经验基底，但主要消费面已经统一收到了 `personStateProjection`。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.ts`, `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-search-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-search-runtime-invariants.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-restraint-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-cadence.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts -t "host social recall bias|relationship doctrine suppress closeness-heavy recall|gateway recollection intent suppress heuristic long-range recall"`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-search-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-search-runtime-invariants.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把人格/关系更新来源统一到 autobiographical reconsolidation + outcome learning
说明：
长期人格变化必须主要来自：
episode reconsolidation
dialogue feedback
execution outcome learning
proactive settlement
而不是当前 mood 或零散 heuristics。
本轮进展：
[runtime-organic-memory-access.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts) 的 `buildHostPersonModel()` 不再只读 recent episodic events，现在会同时读取：
- `listRecentEpisodicEvents(...)`
- `listMemoryConsolidations(...)`
- `getLatestRelationshipDynamics()`
并把这些来源统一交给 [humanlike-memory.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/humanlike-memory.ts) 的 `buildHostPersonModelSnapshot(...)`。与此同时，host model builder 本体已扩展为显式消费 `consolidations`：
- routines / sensitivities / repairTriggers / recurrentBurdens 不再只从单条 episode 抽取，也会吸收重固结 summary / lesson / cues
- preferredClosenessByContext 不再只靠 raw episodic delta，也会从重固结里补齐上下文偏好
- summary / narrative / updatedAt 现在会纳入 `relationshipDynamics.hostAttitude` 和 consolidation summary
这一步的意义是把 `personStateProjection -> hostPersonModel` 这条人格来源往“长期经历如何被重写、关系如何被反馈塑形”推进了一层，而不是继续只靠最近几条 episode 或当前 mood。
进一步进展：
本轮继续把 `relationship_outcomes / persona_reinforcement_events` 也并进 host model builder。当前：
- [runtime-organic-memory-access.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts) 新增 `getActiveCardId / listRelationshipOutcomes / listPersonaReinforcementEvents`
- [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 已把这三条数据源接进 organic memory access runtime
- [humanlike-memory.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/humanlike-memory.ts) 的 `buildHostPersonModelSnapshot(...)` 现在会显式消费：
  - `relationshipOutcomes`
  - `reinforcementEvents`
  - `consolidations`
  - `relationshipDynamics`
  并把这些来源用于：
  - routines / sensitivities / repairTriggers / recurrentBurdens
  - preferredClosenessByContext
  - trust score 微调
  - summary / narrative / updatedAt
这意味着 host person model 已经不只是“近期 episode 的摘要”，而开始吃 outcome learning 本身，尤其是：
- relationship outcome 对 trust/burden/boundary 的即时反馈
- persona reinforcement 对 truthful-grounding / gentle-repair / autonomy-respect / companionship 的长期塑形
进一步进展 2：
本轮继续把 `outcome_closure` 提升成显式 aggregate surface，而不是只在 builder 里被动聚合：
- 新增 [person-state-update-surface.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/person-state-update-surface.ts)，把一次 closure 中的：
  - `relationshipOutcomes`
  - `reinforcementEvents`
  - `episodicEvents`
  汇总成可持久化的 `person-state-update-surface-v1`
- [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 的 `persistOutcomeClosure(...)` 现在会在写完 outcome rows 后，额外 upsert `person-state-update-surface` mind head
- [runtime-organic-memory-access.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts) 的 `buildHostPersonModel()` 现在会读取这个新的 mind head，再把它和 episodes / consolidations / relationship dynamics / outcomes / reinforcement events 一起喂给 host model builder
- [humanlike-memory.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/humanlike-memory.ts) 现在会显式吸收这层 update surface 的：
  - `dominantContexts`
  - `relationshipShift`
  - `reinforcementBias`
  - `preferenceHints / sensitivityHints / repairHints / burdenHints`
  - `summary / narrative / updatedAt`
这一步的意义是：outcome learning 不再只是若干分散表行，而开始拥有一个显式的长期人格更新面，从“builder 隐式聚合”推进到“runtime 显式持久化 + organic memory 显式读取”。
进一步进展 3：
本轮把这条人格更新链补成了可 replay、可 query 的正式时序面：
- [runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.ts) 的 `persistOutcomeClosure(...)` 现在不只 upsert 最新 `person-state-update-surface`，还会同步追加 `person-state-updated` mind-turn event
- 这个 event 会带：
  - `summary / dominantContexts / relationshipShift`
  - `reinforcementBias / preferenceHints / sensitivityHints / repairHints / burdenHints`
  - `sourceKinds / sourceCounts / sourceTrail`
- [packages/stage-shared/src/alicization-transport-contracts.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-shared/src/alicization-transport-contracts.ts) 新增：
  - `AlicizationPersonStateUpdateSurface`
  - `AlicizationPersonStateUpdateRecord`
  - `AlicizationListPersonStateUpdatesInput`
  - `person-state-updated` event kind
- [apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts) 新增 `electronAlicizationListPersonStateUpdates`，可以按 `decisionTraceId / turnId` 直接回放人格更新记录
- [packages/stage-shared/src/alicization-memory-decision-trace.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-shared/src/alicization-memory-decision-trace.ts) 现在也会把 `person-state-updated` 并进 structured trace record

这样原先卡住的三点现在都补齐了：
- 单独的 person-state update query surface / replay invoke：已完成
- projection ledger 级别的时序追踪：已由 `person-state-updated` event ledger 补齐
- 完全统一到所有主要心智更新模块：reply / proactive / execution 的 outcome closure 现在都会走同一条人格更新持久化链

所以这一项现在可以打勾。它不再只是“latest surface 给 builder 读一下”，而是形成了：
`autobiographical reconsolidation + outcome learning -> person-state-update-surface -> person-state-updated ledger -> query/replay surface -> hostPersonModel builder`
这条完整来源闭环。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/person-state-update-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/person-state-update-surface.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/humanlike-memory.ts`, `apps/stage-tamagotchi/src/main/services/alicization/humanlike-memory.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/person-state-update-surface.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "lists replayable person-state updates through invoke handler|settles ordinary dialogue reply feedback from the next user turn into the personality-growth closure chain"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 引入 context-sensitive closeness ladder
说明：
至少区分：
focused-work
repair window
late-night-care
execution callback
open companionship
并允许同一宿主在不同上下文偏好不同 closeness。
本轮进展：
[person-state-projection.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.ts) 现在不再只给出：
- `relationshipPosture`
- `openingGuidance`
而是显式产出：
- `activeClosenessContext`
- `activeClosenessRung`
- `closenessLadder[]`

当前 ladder 会根据：
- `currentRegime`
- `hostPersonModel.preferredClosenessByContext`
- `closenessPosture / repairPosture / autonomyPosture`
- `relationshipPosture`
解析出至少以下上下文：
- `focused-work`
- `repair-window`
- `late-night-care`
- `execution-callback`
- `open-companionship`
- `general`

并给出当前距离档位：
- `space-first`
- `measured-room`
- `nearby-soft`
- `warm-near`
- `close-hold`

同时这层 ladder 已开始进入主链：
- [main-chat-session-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts) 现在会把 `focused-work/space-first` 这类 ladder 信号显式写进 `replyDeliberation.mustInclude` 和 `answerPlanner.mustDo`
- [execution-delivery-surface.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts) 的 payoff prompt 也会带 `activeClosenessContext / activeClosenessRung`
进一步进展：
本轮继续把 closeness ladder 接进最终回复约束主链：
- [response-charter.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts) 现在会显式读取 `runtimeSurface.memory.personStateProjection`
- `AlicizationResponseCharter` 已新增：
  - `activeClosenessContext`
  - `activeClosenessRung`
- charter 的：
  - `reasons`
  - `mustDo`
  - `mustNotDo`
  - system block
  现在都会带这层 ladder authority
- 同时 response charter 在 `repair-needed` 等高保守场景下，不会让 projection 把更严格的 `relationshipPosture=restrained` 冲掉，而是做了保守合并
- [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts) 现在也会显式读取：
  - `activeClosenessContext`
  - `activeClosenessRung`
  并把它们写进：
  - `AlicizationResponseSurfaceContract`
  - visible reply `mustDo / mustNotDo`
  - final response surface system block
  这样最终可见回复的 LLM surface contract 已开始同时吃：
  - truth discipline
  - repair discipline
  - closeness ladder discipline
  不再只是上游 planner/charter 知道“该离多近”
进一步进展 2：
本轮继续补了 `person-state authority regression` 最关键的三类上下文，并据此收敛了 projection/surface 规则：
- [person-state-projection.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.ts) 现在对：
  - `repair-window`
  - `execution-callback`
  - `open-companionship`
  做了更细的 `relationshipPosture / closenessRung` 分流
- 具体收敛为：
  - `repair-window`：默认 `measured-room`，修复没真正落稳前不提前回暖
  - `execution-callback`：在谨慎上下文里优先走 `measured-room`，避免 callback 结果交付误漂成 companionship 腔
  - `open-companionship`：只有在高信任且当前并非 repair-first / protect-space 时，才允许进入 `close-hold`
- [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts) 也新增了对应的 visible surface discipline：
  - `execution-callback`：thread-faithful and bounded
  - `repair-window`：repair ahead of closeness
  - `open-companionship`：only lived-in warmth, not theatrical closeness
这一步的重要性在于，它开始真正回答“同一个人格为什么在不同上下文下离得不一样”，而不是只留下一个 `warm/restrained/tender` 的粗分类。
这样 closeness ladder 已经不再只是 projection/ planner 内部状态，而是开始进入最终 LLM 可见的 answer charter。这一步对“真人记忆对话不能是死规则”很关键，因为它让“为什么这次只轻轻贴近、为什么这次先留空间、为什么执行回调要先看宿主有没有余量”进入统一回复约束，而不是散在若干 helper。
这样“当前该离多近”终于不再只是从 `relationshipPosture=warm/restrained/tender` 间接猜，而变成一层可读、可测试、可被 LLM 心智链直接消费的中间 authority。
进一步进展 3：
本轮继续把 closeness ladder 压进 [answer-compiler.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts)，让 compiled reply spine 本体也显式带上：
- `activeClosenessContext`
- `activeClosenessRung`

并且 compiler 现在会直接把不同上下文对应的 ladder discipline 编进：
- `mustDo`
- `mustNotDo`
- system block

当前新增的 compiler-level visible discipline：
- `focused-work / space-first`
  - 不让 warmth 或 remembered closeness outrun room
- `execution-callback / measured-room`
  - callback 必须 thread-faithful and bounded
- `repair-window / measured-room`
  - repair 必须 visibly ahead of closeness
- `open-companionship / close-hold`
  - warmth 允许更近，但必须 lived-in 而非 theatrical

这一步让 closeness ladder 不再只存在于：
- projection
- planner
- charter
- response surface contract

而开始进入最终 compiled reply spine 本体，也就是 provider-mind 在可见回答前最后一层统一答案骨架。

进一步进展 4：
本轮把最后一段 consumer 链也接上了：
- [apps/stage-tamagotchi/src/shared/eventa.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/shared/eventa.ts) 的 `AlicizationAnswerCompilerSnapshot / AlicizationAnswerPlannerSnapshot` 现在都显式带 `activeClosenessContext / activeClosenessRung`
- [answer-compiler.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts) 已把不同 closeness context/rung 的 discipline 直接写进 compiled spine
- [answer-planner.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-planner.ts) 会把 compiled ladder 继续编进 planner snapshot、narrative 与 system block
- [visual-episodic-memory.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts) 已补 answer-compiler 的 closeness ladder normalize round-trip，避免这层 authority 在可视化持久化时丢掉

这样目前主要 reply/path consumer 已全部吃到同一层 closeness authority：
- projection
- runtime session shaping
- execution payoff surface
- response charter
- response surface contract
- answer compiler
- answer planner
- visual replay normalization

并且当前回归已经覆盖：
- `focused-work / space-first`
- `repair-window / measured-room`
- `execution-callback / measured-room`
- `open-companionship / close-hold`

所以此项现在可以打勾。Closeness ladder 已经从“人格内部状态”变成“LLM 可见、可 replay、可测试的统一距离 authority”。
evidence: `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-planner.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-planner.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/answer-planner.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/person-state-authority-regression.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 person-state authority 回归
说明：
至少覆盖：
同一 context 下人格稳定
repair 后 tone shift 有因
长期 host burden 能压过短时 warmth spike
execution continuity 不会把 companionship tone 误带入错误上下文
本轮完成：
新增 [person-state-authority-regression.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/person-state-authority-regression.test.ts)，把这项明确收成一份独立回归包，直接锁住四个要求：
- `focused-work` 同一 context 下人格与距离档位稳定
- `repair-window -> open-companionship` 的回暖必须由 repair landed 供应因果，不允许无因回暖
- 长期 `host burden` 能压过短时 warmth spike，不让 `focused-work` 漂成过近 companionship
- `execution-callback` 保持 thread-faithful / bounded，不让 callback 结果交付误带 companionship tone

同时这轮还把这些 authority 回归继续压进可见回复主链：
- [response-charter.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts)
- [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts)

这样这项不再只是 `person-state-projection` 自测，而是：
- projection
- charter
- response surface contract
三层一起回归，能更真实地防止“人格上下文一变，回复层又掉回死规则或错误距离”。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/person-state-authority-regression.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/person-state-authority-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 4：Memory-to-Mind Deliberation Kernel

- [x] 把 `runtime-organic-memory-prompt.ts` 与 `main-chat-session-runtime.ts` 的 recall/surface 决策抽成独立 deliberation kernel
说明：
统一产出：
`why recalled`
`why withheld`
`stable core`
`unsafe detail`
`surface timing`
`relationship meaning`
`answer role`
本轮进展：
已新增 [memory-deliberation-kernel.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts)，把此前散落在：
- [main-chat-session-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts)
- [runtime-organic-memory-prompt.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts)
之间的一批核心 deliberation 决策先收成共享结构。当前 kernel 已统一产出：
- `shouldRecall`
- `surfacePolicy`
- `shouldStayInward`
- `rationale / whyNow`
- `selectedChainSummary / selectedBundleSummary / selectedPeriodSummary / selectedEraSummary / selectedProcedureSummary / selectedRelationshipSummary`
- `speechControls / speechLatentSummary`
- `memoryControl / memoryControlSummary`
- `inwardCarryRule / inwardCarryBoundary`
- `followUpAffordance`
- `stableCore / unsafeDetails`

当前接线：
- [main-chat-session-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts)
  的 `applyMemoryDeliberationToGovernance(...)` 与 `applyMemoryDeliberationToDigitalLifeRuntimeSurface(...)` 已开始吃同一 kernel 输出，不再各自手搓同一批 summary/control
- [runtime-organic-memory-prompt.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts)
  的 `[ALICIZATION_RECOLLECTION_SPEECH_PLAN]` / `[ALICIZATION_MEMORY_DELIBERATION]` block 也已开始使用同一 kernel 输出的 `shouldRecall / surfacePolicy / whyNow / stableCore / unsafeDetails / followUpAffordance`
- 新增 [memory-deliberation-kernel.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts) 锁住 inward-only 与 answer-anchoring 两条最核心路径
进一步进展：
本轮继续把 shared deliberation kernel 往回复主链里压：
- [response-charter.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts) 现在会直接读取 kernel 的：
  - `rationale / whyNow`
  - `selectedChainSummary / selectedBundleSummary`
  - `stableCore`
  - `unsafeDetails`
  - `followUpAffordance`
  并把它们编进：
  - `reasons`
  - `mustDo`
  - `mustNotDo`
- [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts) 也开始直接读取 kernel，把：
  - `stableCore`
  - `unsafeDetails`
  - `followUpAffordance.intrusionRisk`
  转成 visible surface discipline
- 这意味着 shared kernel 已经不再只服务：
  - memory prompt block
  - session runtime shaping
  而开始进入：
  - response charter
  - response surface contract
  也就是回复约束主链本身

这一步的重要性在于，系统开始拥有一处共享 authority 去回答：
- 为什么想起
- 为什么这次只把 recollection 留在里面
- 为什么这次只能说 stable core
- 为什么某些 remembered detail 必须被压住
- 为什么 follow-up 该等宿主有 room 再出来

进一步进展 2：
本轮继续把 shared deliberation kernel 压进 [answer-compiler.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts)。当前 compiler 已新增显式字段：
- `memoryShouldStayInward`
- `memoryWhyNow`
- `memoryWhyWithheld`
- `memoryFollowUpAffordanceSummary`
- `memoryStableCore`
- `memoryUnsafeDetails`

并且这些字段已经开始参与 compiler 层的可见回复约束：
- `mustDo`
  - stable core should lead
  - intrusive memory pressure should stay inward
- `mustNotDo`
  - unsafe remembered detail cannot surface as settled fact
  - explicit recollection boundary (`memoryWhyWithheld`) cannot be outrun
- `buildAnswerCompilerSystemBlock(...)`
  - 现在会把 memory why-now / why-withheld / stable core / unsafe details / follow-up affordance 明确打印出来

同时 [visual-episodic-memory.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts) 已补齐 answer-compiler 新字段的 normalize round-trip，避免这层 authority 在视觉态持久化时丢掉。

这意味着 shared deliberation kernel 现在已经从：
- session runtime
- organic prompt
- response charter
- response surface
推进到：
- answer compiler

进一步进展 3：
本轮继续把 `whyWithheld` 变成 shared deliberation kernel 的显式字段，并一路接进回复主链：
- [memory-deliberation-kernel.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts) 新增 `whyWithheld`
- [answer-compiler.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts) 新增 `memoryWhyWithheld`
- [response-charter.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts) 会把 `whyWithheld` 直接写进 `mustNotDo`
- [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts) 也会把 `whyWithheld` 转成 visible surface boundary
- [runtime-organic-memory-prompt.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts) 的 `[ALICIZATION_MEMORY_DELIBERATION]` block 现在会显式输出 `why_withheld=...`

这意味着 Wave 4 现在已经开始共享五类关键记忆解释字段：
- `why recalled`
- `why withheld`
- `stable core`
- `unsafe detail`
- `follow-up affordance`

这一项现在可以打勾，因为：
- wrong-thread / inward-only / payoff-first regression pack 已由 [memory-deliberation-regression.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts) 锁住
- compiler / charter / surface / runtime trace 已共同读取同一 kernel authority
- `whyWithheld / stableCore / unsafeDetails / followUpAffordance / searchTrace / person-state carry` 已进入 replay/query surface

现在它已经不只是“两边共享一份 helper”，而是：
- session runtime
- organic prompt
- response charter
- response surface
- answer compiler
- visual round-trip
- replay/query diagnostics
共同消费同一份 deliberation kernel。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "lists structured memory decision traces through invoke handler"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 引入 memory restraint 与 false-memory discipline 的统一 judge
说明：
Phase 6 不能再让 inward-only、uncertainty、contradiction、reconstruction 分散在多个后处理里。
要有一处 authority 统一决定：
说不说
说多少
怎么标 provenance
是否只留稳定核心
本轮进展：
已新增 [memory-restraint-judge.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-restraint-judge.ts)，把此前分散在：
- `answer-compiler`
- `response-charter`
- `response-surface-contract`
- `memory-deliberation-kernel`
里的部分“记忆要不要 surface、能 surface 到哪一档、是否只留 stable core、是否要标 provenance / hypothesis、是否要压 detail”判断，先收成共享 judge。

当前 judge 会统一产出：
- `surfaceMode`
  - `inward-only`
  - `stable-core-only`
  - `provenance-labeled`
  - `free`
- `provenanceMode`
  - `memory`
  - `dream-residue`
  - `inferred-pattern`
  - `reconstructed-memory`
  - `mixed-memory`
- `shouldOnlySurfaceStableCore`
- `shouldLabelProvenance`
- `shouldLabelHypothesis`
- `shouldSuppressSpecificity`
- `shouldDelayUntilAfterPayoff`
- `whyWithheld`
- `mustDo / mustNotDo`

当前接线：
- [memory-deliberation-kernel.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts) 现在会显式产出 `restraint`
- [answer-compiler.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts) 改为直接读取 `kernel.restraint.mustDo / mustNotDo`
- [response-charter.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts) 改为直接读取 `kernel.restraint.mustDo / mustNotDo`
- [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts) 也改为直接读取 `kernel.restraint.mustDo / mustNotDo`

这一步的意义是，系统第一次有了一处共享 authority 去统一回答：
- 这次 recollection 是否该留在里面
- 是否只能用 stable core
- 是否必须标成 dream residue / inferred pattern / reconstructed memory
- 是否必须压住具体 detail
- 是否必须等 payoff 之后再出来

进一步完成：
这一轮把 shared judge 正式并进了 [truth-discipline.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/truth-discipline.ts)，不再只是 `response-charter / response-surface-contract / answer-compiler` 末尾各自拼 `mustDo / mustNotDo`。

当前 `deriveAlicizationTruthDiscipline(...)` 已经显式产出：
- `memorySurfaceMode`
- `memoryProvenanceMode`
- `shouldKeepMemoryInward`
- `shouldOnlySurfaceMemoryStableCore`
- `shouldLabelMemoryProvenance`
- `shouldDelayMemoryUntilAfterPayoff`
- `memoryWhyWithheld`

并且 [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts) 已开始直接用这组 shared flags 去决定：
- recollection inward-only 时 `labelCarryAsMemory=false`
- recollection inward-only / after-payoff defer 时 `suppressAssociativeRecall=true`
- stable-core-only / provenance-labeled / after-payoff defer 的 visible surface discipline

到这一步，`memory restraint / false-memory discipline` 已经不是一组分散 helper，而是：
- judge authority
- truth-discipline flags
- response surface contract
- replay/query trace
四层共用同一组收敛条件。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-restraint-judge.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-restraint-judge.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/truth-discipline.ts`, `apps/stage-tamagotchi/src/main/services/alicization/truth-discipline.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-restraint-judge.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/truth-discipline.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "lists structured memory decision traces through invoke handler"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立“想起但不说”与“想起后改口”的 replay 诊断链
说明：
至少能解释：
为什么没 surface
为什么 after-payoff 才说
为什么关系修复后 tone 变了
为什么 recall 被 wrong-thread suppression 压掉
本轮完成：
把记忆审议 replay 诊断接进了现有 `mind_turn_events -> buildAlicizationMemoryDecisionTraceRecords(...) -> electronAlicizationListMemoryDecisionTraces` 主链，没有再开第二条旁路。

当前新增的 replay 事件种类：
- `memory-deliberation-judged`
- `memory-recall-withheld`
- `memory-stable-core-surfaced`
- `memory-followup-deferred`
- `memory-wrong-thread-suppressed`

当前新增的可查询诊断面：
- `whyWithheld / shouldStayInward / restraintSurfaceMode / restraintProvenanceMode`
- `shouldOnlySurfaceStableCore / shouldDelayUntilAfterPayoff / shouldSuppressSpecificity`
- `stableCore / unsafeDetails / followUpAffordance`
- `searchTrace.evidenceGap`
- `personStateProjection` 的 `activeClosenessContext / activeClosenessRung / relationshipPosture / openingGuidance / repairPosture`

这样现在 replay / query 已经能直接解释：
- 为什么这次想起了但没说
- 为什么只让 stable core 上表面
- 为什么要等 after-payoff
- 为什么 wrong-thread suppression 触发
- 为什么 repair-window 下 tone 还是 restrained，而不是马上回暖

evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "lists structured memory decision traces through invoke handler"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 deliberation kernel 回归
说明：
至少覆盖：
implicit recall
ambiguous time
wrong-thread lure
relevant-but-inward-only
repair-aftereffect tone shift
本轮完成：
新增 [memory-deliberation-regression.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts)，把 Wave 4 的五类关键场景收成独立 regression pack：
- `implicit recall`
- `ambiguous time`
- `wrong-thread lure`
- `relevant-but-inward-only`
- `repair-aftereffect tone shift`

这组回归不是只测 memory prompt，而是直接串过：
- [memory-deliberation-kernel.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts)
- [answer-compiler.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts)
- [response-charter.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts)
- [response-surface-contract.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts)

这样已经能稳定锁住：
- 相似任务的 implicit recall 不会掉回死规则模板
- ambiguous time 只能用 stable core，不能乱说具体细节
- wrong-thread lure 会被压进 unsafe detail
- relevant recollection 在 payoff 未落稳时会 inward-only
- repair landed 才能供应 warmer tone shift

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 5：真实长期样本 Benchmark 与 Diagnosis Console

- [x] 把 replay benchmark 从合成 pack 推进到真实长期采样 pack
说明：
加入：
真实长会话样本
真实 repair arc
真实错线程样本
真实长期任务迁移
真实 browser/runtime/fallback 分歧样本
本轮完成：
新增 `sampled-humanlike-memory-v1` pack，并把它接进了现有的 `electronAlicizationRunReplayBenchmark -> benchmarkMainChatSessionReplay(...)` 主链。

当前真实采样 pack 的来源不再是硬编码 prompt，而是：
1. 从最近真实 `conversation_turns` 读取候选 turn
2. 对每个 turn 读取对应 `mind_turn_events`
3. 用 `buildAlicizationMemoryDecisionTraceRecords(...)` 还原真实 trace
4. 从 trace 重建 replay 用的 `organicMemoryContext`
5. 按关键类目做分层采样：
   - `wrong-thread`
   - `deferred-followup`
   - `stable-core`
   - `repair-arc`
   - `procedure-carry`
   - `task-migration`
   - `long-horizon`
   - `surface-divergence`
   - `long-session`

这样现在 benchmark 已经能优先采到：
- 真实错线程样本
- 真实 after-payoff defer 样本
- 真实 stable-core-only 样本
- 真实 repair-window 样本
- 真实 procedure/task migration 样本
- 真实 browser/runtime/fallback surface divergence 样本
- 真实长会话样本

并且这些样本不是只带 userText，而是带回了真实 trace 里已经存在的：
- `whyNow / whyWithheld`
- `stableCore / unsafeDetails`
- `followUpAffordance`
- `searchTrace`
- `personState`
所以 replay benchmark 现在开始具备真正的“从真实运行沉淀回 benchmark”的能力。

evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "sampled replay benchmark|builds a sampled replay benchmark pack"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 nightly benchmark gate 与失败样本回灌
说明：
任何 gate fail：
必须产 failing turn set
必须生成 trace pointer
必须能回灌到 benchmark dataset
本轮进展：
虽然 nightly 调度本身还没接，但 fail artifact 与回灌链已经落地到现有 benchmark invoke 主链。

当前新增能力：
- `AlicizationRunReplayBenchmarkResult` 现在显式返回：
  - `failingTurnSet`
  - `datasetFeedback`
- 每个 failing turn 都会带：
  - `failingDimensions`
  - `tracePointer`
    - `decision-trace`
    - `synthetic-pack-turn`
- sampled pack fail 时，会把 failing replay turn 连同 trace pointer 和采样类目写进：
  - `replay_benchmark_dataset_backlog_v1`

进一步进展：
这一轮又把 backlog 本身变成了正式可执行的 replay pack：
- 新增 `backlog-humanlike-memory-v1`
- 会从 `replay_benchmark_dataset_backlog_v1` 直接重建 replay turn
- 会保留：
  - `organicMemoryContext`
  - `tracePointer`
  - `sampledCategories`
- 并优先按 failing dimension 选样，而不是简单按写入顺序重放

这样现在已经形成：
- `sampled-humanlike-memory-v1`
  -> 失败
  -> `failingTurnSet`
  -> `dataset backlog`
  -> `backlog-humanlike-memory-v1`
  -> 再次 replay benchmark
这条闭环。

现在这一项可以打勾，因为：
- `failingTurnSet / tracePointer / dataset backlog` 已进入正式 result contract
- `backlog-humanlike-memory-v1` 已能直接从 backlog 重建可执行 replay pack
- nightly gate 已挂进 scheduled dream 路径
- nightly 最新报告会持久化到：
  - `replay_benchmark_latest_report_v1`
  - `replay_benchmark_last_nightly_run_day_v1`

这样现在已经形成完整闭环：
- `sampled-humanlike-memory-v1`
  -> fail
  -> `failingTurnSet`
  -> `dataset backlog`
  -> `backlog-humanlike-memory-v1`
  -> nightly replay gate
  -> latest nightly report

evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "nightly replay benchmark|backlog replay benchmark|rebuilds an executable backlog replay pack|replay benchmark"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 `/devtools/mind-replay` 升级成 diagnosis console
说明：
至少支持：
按 failing key 聚合
按 decisionTrace drill-down
telemetry patch 前后对比
trace -> benchmark -> memory health 串联查看
本轮完成：
`/devtools/mind-replay` 已不再只是 replay viewer，而是开始吃 benchmark diagnosis 数据模型。

当前完成的诊断能力：
- benchmark pack 切换：
  - `sampled-humanlike-memory-v1`
  - `backlog-humanlike-memory-v1`
  - `default-humanlike-memory-v1`
- 按 failing key 聚合
- 按 failing turn drill-down 到：
  - `decisionTraceId`
  - `turnId`
- telemetry patch 前后对比：
  - `templateLeakageFailCount`
  - `reconstructionFrequency`
  - `reconstructedCount`
  - `semanticLatencyMs`
  - `graphLatencyMs`
- trace -> benchmark -> memory health 串联查看

实现结构：
- [alicization-mind-replay.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/stores/alicization-mind-replay.ts)
  现在负责：
  - diagnosis dimension grouping
  - failing turn filtering
  - benchmark memory stats before/after snapshots
  - benchmark turn drill-down
- [mind-replay-diagnosis-panel.vue](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue)
  负责：
  - pack 选择
  - sample limit
  - failing dimension group view
  - failing turn list
  - memory health before/after/patch comparison
- [mind-replay.vue](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-pages/src/pages/devtools/mind-replay.vue)
  保持 composition surface，只负责把 diagnosis panel、trace lab、raw replay events 串起来

evidence: `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, `packages/stage-pages/src/pages/devtools/mind-replay.vue`; tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "nightly replay benchmark|replay benchmark|alicization mind replay store"`, `pnpm -F @proj-alicization/stage-pages typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 benchmark / diagnosis automation 回归
说明：
至少验证：
默认 pack 可执行
失败维度可解释
telemetry patch 可回灌
devtools 能展示 failing dimensions 与 turn ids
本轮完成：
把 benchmark / diagnosis automation 回归补成了跨 runtime、store、devtools page 三层：

- benchmark runtime / invoke：
  - default pack 可执行
  - sampled pack 可执行
  - backlog pack 可执行
  - nightly gate 会在 scheduled dream 路径自动运行
- diagnosis store：
  - 会把 `gate.dimensions` 聚成 failing dimension groups
  - 会把 `failingTurnSet` 转成 failing turn 列表
  - 会保存 benchmark 前后 `memoryStats.retrievalHealth`
  - 会支持按 `decisionTraceId / turnId` drill-down
- devtools 页面：
  - diagnosis panel 已接入 pack 切换、sample limit、failing dimension group、failing turn 列表、memory health before/after/patch comparison
  - 页面 typecheck 已锁住这套 diagnosis contract

这意味着 Wave 5 现在已经能自动回归验证：
- 默认 pack 可执行
- 失败维度可解释
- telemetry patch 可回灌
- devtools 能展示 failing dimensions 与 turn ids

evidence: `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-dialogue.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, `packages/stage-pages/src/pages/devtools/mind-replay.vue`; tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "nightly replay benchmark|backlog replay benchmark|rebuilds an executable backlog replay pack|replay benchmark"`, `pnpm -F @proj-alicization/stage-pages typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 6：真实运行闭环与长期生态

- [x] 引入真实运行采样到 benchmark 的自动沉淀链
说明：
从真实对话/执行/proactive/repair 里抽匿名化样本，
进入 benchmark backlog，再经筛选进入长期 gate。
本轮完成：
这条链现在已经不是“运行时读 raw turns 时临时抽样”，而是有了显式的 runtime sampling backlog。

当前新增闭环：
- 新增 `replay_benchmark_runtime_sampling_backlog_v1`
- 真实 conversation turn 在持久化成功且 trace 已生成后，会自动沉淀成 anonymized replay sample
- sample 会保留：
  - `tracePointer`
  - `sampledCategories`
  - anonymized `replayTurn`
- `sampled-humanlike-memory-v1` 现在会优先消费 runtime sampling backlog，
  只有 backlog 不足时才回退到 raw `conversation_turns + mind_turn_events`

这意味着 sampled pack 的长期来源已经从：
- “每次运行临时扫最近真实 turn”
推进到：
- “真实运行持续沉淀到 benchmark backlog，再由 sampled pack 优先筛选”

匿名化当前已覆盖：
- URL
- email
- 绝对路径
- trace / turn / session / thread id 形态
- UUID 形态

evidence: `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "replay benchmark runtime|nightly replay benchmark|backlog replay benchmark|replay benchmark"`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 让 benchmark、trace、telemetry 反向驱动 memory tuning
说明：
不是人工看失败再猜怎么改；
而是让失败模式系统性推动：
retrieval weight 调整
person-state repair
surface restraint 调整
false-memory discipline 调整
本轮完成：
这条链现在已经不是 diagnosis console 里的人读建议，而是 nightly replay gate 会自动产出并持久化 `memory-tuning-advice-v1`，然后在真实 memory search / surface restraint 路径里被直接消费。

当前新增闭环：
- replay benchmark nightly results
  -> `replay_benchmark_tuning_advice_v1`
  -> `hostPersonModel` repair/closeness bias 调整
  -> recollection candidate re-ranking
  -> recollection speech inward / after-payoff / provenance clamp

当前已接入的 tuning 维度：
- retrieval:
  - `proceduralBoost`
  - `relationshipBoost`
  - `temporalWindowBias`
  - `wrongThreadPenalty`
- person-state:
  - `repairWindowBias`
  - `closenessCapBias`
- surface restraint:
  - `inwardCarryBias`
  - `delayUntilAfterPayoffBias`
  - `provenanceLabelBias`
  - `specificityClampBias`

当前消费点：
- [runtime-organic-memory-access.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts)
  会把 tuning advice 折进 `hostPersonModel`
- [runtime-organic-memory-prompt.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts)
  会把 tuning advice 用于：
  - consolidated/window/procedure/episode/conversation 的 re-ranking
  - ambiguous/high-conflict recollection 的 inward/delay/provenance clamp

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-search-retrieval-operators.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 建立 Phase 6 收尾验收
说明：
至少证明：
可见回复 authority 单一
memory domain 解耦完成
person-state authority 单一
真实长期 benchmark 可运行
真人记忆对话不再依赖死规则模板
本轮完成：
Phase 6 的三个核心结构项现在都已完成：
- `runtime.ts` 已降成 orchestration shell
- `db.ts` 已拆成 memory domain 子层
- person-state / memory deliberation / replay benchmark / diagnosis console 已形成统一 authority

并且当前验收可以直接落到以下证据链：
- 可见回复 authority 单一：
  [reply-authority-invariants.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts),
  [answer-compiler.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts),
  [response-surface-contract.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts),
  [main-chat-background-run.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts)
- memory domain 解耦完成：
  [db.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/db.test.ts),
  [memory-domain-decoupling-regression.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts)
- person-state authority 单一：
  [person-state-authority-regression.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/person-state-authority-regression.test.ts),
  [runtime-organic-memory-prompt.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts),
  [answer-planner.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/answer-planner.test.ts)
- 真实长期 benchmark 可运行：
  [replay-benchmark-runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts),
  [main-chat-session-replay-harness.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts),
  [packages/stage-ui/src/stores/alicization-mind-replay.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/stores/alicization-mind-replay.test.ts)
- 真人记忆对话不依赖死规则模板：
  [memory-deliberation-regression.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts),
  [runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts),
  [main-chat-session-runtime.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts)

这意味着 Phase 6 的主目标已经达到：记忆/心智/对话/执行/主动行为/benchmark 现在在同一条 LLM mind-authority 闭环内工作，正常可见回复不再依赖固定规则模板。
evidence: `docs/plans/2026-04-26-alicization-humanlike-memory-dialogue-phase6-plan.md`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## 验证命令基线

后续每轮至少跑：

- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm -F @proj-alicization/stage-ui typecheck`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

当相关模块被修改时，额外跑：

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-restraint-regression.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory.test.ts`

## 下一轮建议起手顺序

1. 先做 Wave 1，把正常可见回复的 authority 完全收回单一 LLM mind pipeline。
2. 然后做 Wave 2，把 `runtime.ts` 和 `db.ts` 的职责拆干净。
3. 接着做 Wave 3，形成统一 person-state authority。
4. 再做 Wave 4，把 memory-to-mind deliberation kernel 抽成独立 authority。
5. 最后推进真实长期 benchmark 与 diagnosis console，进入 Phase 6 的真实运行闭环。
