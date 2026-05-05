# 2026-04-14 Dialogue Mind Closed Loop

## Goal

彻底修复 Alicization 当前对话链路里的模板化回复、时间/天气查询误判、以及心智未能统一介入的问题，让对话、上下文、CLI、记忆、工具、心智形成同一条闭环链路。

## Problem Statement

当前运行时存在三类根因问题：

1. 对话快路径直接在 runtime 内部拼接固定文案，导致 `你在干嘛`、`答非所问`、`继续` 等短句经常落到模板回复，而不是经过统一心智表层。
2. 天气/实时查询地点抽取在 main runtime、browser bridge、UI execution engine 各自复制一套正则，且中文地点抽取会把“帮我查一下天津天气”误抽成“帮我查一下天津”。
3. 时间/日期/当下同在类问题与实时工具类问题没有共用统一的 utility intent 解析层，导致局部修补越来越多，无法保证“数字生命”式一致性。

## Deliverable

1. 一个共享的 utility / realtime query 解析层，供 main runtime、browser bridge、UI execution engine 共用。
2. 一个重构后的 active dialogue fast-path，使本地快路径不再直接输出模板字符串，而是统一经过 mind-surface move 渲染。
3. 为“你在干嘛/你在忙什么/what are you doing”增加独立的 present-state lane，不能再误判为 repair。
4. 对天气地点抽取、时间/日期快路径、present-state lane 行为新增测试。

## Constraints

1. 不回滚用户现有非本任务改动。
2. `vibe` 产物保留在工作区，但不纳入后续源码 commit。
3. 不提交 `N.E.K.O/` 与 `claude-code-main/`。
4. 保持 Alicization P0-P4 的 mind/runtime contract 不被破坏。

## Acceptance Criteria

1. 输入 `你在干嘛` 不再触发 `repair-clarify` 模板回复。
2. 输入 `帮我查一下天津天气`、`帮我查一下现在天津气温` 能正确识别地点为 `天津`。
3. 时间/日期/天气类响应路径都经过统一 intent 解析和统一表层渲染，不再分散在多份 duplicated regex / duplicated fallback string 中。
4. 相关 targeted tests 通过，typecheck 通过。

## Non-goals

1. 这轮不重做 UI 视觉样式。
2. 这轮不引入新的外部天气服务提供商。
3. 这轮不处理 `N.E.K.O` 或 `claude-code-main` 自身源码。
