---
title: A.L.I.C.E 文档索引
description: Alicization 当前实现、架构、路线图与阶段验收文档入口
---

# A.L.I.C.E / Alicization 文档索引

## 1. 当前文档快照

本文档集已按 **2026-03-17** 的仓库代码基线更新，当前项目状态为：

- `Epoch 1` 已于 **2026-03-09** 收官。
- `Epoch 2` 已于 **2026-03-11** 收官。
- 当前主线已进入 `Epoch 3`，重点是持续加强视觉、听觉、语音对话与更可靠的主动性。
- 主要落地面仍然是 `apps/stage-tamagotchi` 桌面端。

## 2. 文档入口

| 文档 | 作用 | 状态 |
| --- | --- | --- |
| [全景需求文档（Epoch 1-5）](./requirements) | 描述 Alicization 的产品目标、功能边界、非功能要求与阶段性能力基线 | 已更新 |
| [架构设计文档（当前实现快照）](./architecture) | 描述当前代码中的运行时拓扑、存储模型、控制平面与模块落点 | 已更新 |
| [未来规划文档（Epoch 路线）](./roadmap) | 描述从 Epoch 1 到 Epoch 5 的路线图、当前状态、风险与阶段门禁 | 已更新 |
| [优先级开发实施蓝图（对标 N.E.K.O）](./development-priority-blueprint) | 面向执行的研发计划，按优先级拆解对话、心智、记忆、TTS、Live2D/VRM、屏幕捕捉实现细节 | 新增 |
| [Claw 与自我意识数字生命开发优先级方案](./claw-self-aware-priority-plan) | 聚焦浏览器操控、软件操控、CLI、Claude Code、Codex、OpenClaw、主动感知与自我意识闭环的优先级路线图 | 新增 |
| [开发需求文档（仅 Epoch 1）](./development-epoch1) | `Epoch 1` 的历史任务分解文档，仅作回溯参考 | 历史归档 |
| [Epoch1 收官验收报告](./epoch1-closure-report) | `Epoch 1` 完整闭环与门禁结果 | 历史验收记录 |
| [Epoch2 收官验收报告](./epoch2-closure-report) | `Epoch 2` 感知、表现层与 MCP 安全闭环验收结果 | 历史验收记录 |

## 3. 建议阅读顺序

如果你是第一次进入 Alicization 文档，建议按下面顺序阅读：

1. 先读 [全景需求文档](./requirements)，确认它到底想做什么、已经做到什么、哪些还是未来目标。
2. 再读 [架构设计文档](./architecture)，确认当前代码中的运行时、存储、感知、权限与表现层是怎么接起来的。
3. 再读 [未来规划文档](./roadmap)，确认下一阶段的主线工作和长期目标。
4. 再读 [优先级开发实施蓝图](./development-priority-blueprint)，按优先级拆成迭代任务并执行。
5. 如果你要推进浏览器操控、软件操控、CLI、Claude Code、Codex、OpenClaw 和“更有自我意识的数字生命”能力，继续读 [Claw 与自我意识数字生命开发优先级方案](./claw-self-aware-priority-plan)。
6. 如果你要回溯为什么 `Epoch 1`、`Epoch 2` 被视为完成，再读两份收官验收报告。
7. 只有在你要回顾早期任务拆解时，才需要读 `development-epoch1.md`。

## 4. 文档维护原则

这些文档不再只服务于“设计预研”，还承担当前实现的说明职责。后续维护需要遵守下面的约束：

- 文档必须优先描述 **当前代码已经具备的能力**，不能把未来愿景写成现状。
- 未来规划必须明确标注为 `进行中`、`规划中` 或 `概念前瞻`。
- 每当 `SOUL.md`、记忆层、潜意识链路、MCP 安全门禁、表现层或多模态能力发生明显变化时，都应同步更新 `requirements.md`、`architecture.md` 和 `roadmap.md`。
- 每个 Epoch 收官后，应新增或更新对应的验收报告，而不是只改 README。

## 5. 历史文档说明

- [`development-epoch1.md`](./development-epoch1) 是 `Epoch 1` 的任务级执行文档，今天仍然有价值，但它不再代表当前代码的全貌。
- [`epoch1-closure-report.md`](./epoch1-closure-report) 和 [`epoch2-closure-report.md`](./epoch2-closure-report) 是阶段门禁证据，不是未来设计文档。
- 如果未来新增 `Epoch 3` 收官验收，请在本索引中补充并更新当前状态说明。
