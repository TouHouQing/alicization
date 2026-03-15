---
title: A.L.I.C.E 文档索引
description: A.L.I.C.E 需求、架构、规划与 Epoch 1/2 开发与验收文档入口
---

# A.L.I.C.E 文档索引

## 1. 文档入口

1. [全景需求文档（Epoch 1-5）](./requirements)
2. [架构设计文档（全局 + Epoch 1）](./architecture)
3. [未来规划文档（Epoch 路线）](./roadmap)
4. [开发需求文档（仅 Epoch 1，任务级）](./development-epoch1)
5. [Epoch1 收官验收报告](./epoch1-closure-report)
6. [Epoch2 收官验收报告（进行中）](./epoch2-closure-report)

## 2. 建议阅读顺序

1. 先读 `requirements.md`，确认需求范围与编号。
2. 再读 `architecture.md`，确认实现边界与接口。
3. 再读 `roadmap.md`，确认阶段节奏与风险。
4. 最后读 `development-epoch1.md`，按任务清单执行开发。
5. 执行完成后读 `epoch1-closure-report.md`，核对门禁与回归结果。
6. 进入 Epoch2 后读 `epoch2-closure-report.md`，核对 M2.1/M2.2/M2.3 门禁。

## 3. 追踪矩阵（需求ID -> 架构章节 -> Epoch1任务ID）

| 需求ID | 架构章节 | Epoch1 任务ID |
| --- | --- | --- |
| ALICIZATION-F1.1 | 6.2, 8.1, 9.1, 9.4 | ALICIZATION-E1-T003, ALICIZATION-E1-T005 |
| ALICIZATION-F1.2 | 5.1, 6.2 | ALICIZATION-E1-T004 |
| ALICIZATION-F1.3 | 6.3, 6.4, 9.2, 9.5 | ALICIZATION-E1-T007, ALICIZATION-E1-T008, ALICIZATION-E1-T010 |
| ALICIZATION-F2.1 | 5.2（预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-F2.2 | 5.2, 9.2 | ALICIZATION-E1-T005, ALICIZATION-E1-T006 |
| ALICIZATION-F3.1 | 3.1（Sensory Bus 预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-F3.2 | 3.1（Sensory Bus 预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-F3.3 | 3.1, 4.3（预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-F4.1 | 4.3（调度预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-F4.2 | 3.1 + 6.4（预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-F4.3 | 7.2, 7.3, 9.3 | ALICIZATION-E1-T012（接口与门禁骨架） |
| ALICIZATION-F5.1 | 3.1（Holographic 预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-F5.2 | 3.1（Holographic 预留） | N/A（非 Epoch 1 范围） |
| ALICIZATION-NFR-PRIV-001 | 6.1, 6.3, 7.1 | ALICIZATION-E1-T009 |
| ALICIZATION-NFR-PRIV-002 | 7.1 | ALICIZATION-E1-T011 |
| ALICIZATION-NFR-PRIV-003 | 7.1, 7.2 | ALICIZATION-E1-T011, ALICIZATION-E1-T013 |
| ALICIZATION-NFR-SAFE-001 | 5.3, 7.3 | ALICIZATION-E1-T012 |
| ALICIZATION-NFR-SAFE-002 | 7.2 | ALICIZATION-E1-T013 |
| ALICIZATION-NFR-SAFE-003 | 5.3, 7.3 | ALICIZATION-E1-T003, ALICIZATION-E1-T012 |
| ALICIZATION-NFR-PERF-001 | 3, 6（预算与修剪） | ALICIZATION-E1-T010, ALICIZATION-E1-T013 |
| ALICIZATION-NFR-PERF-002 | 3, 4（主链路解耦） | ALICIZATION-E1-T005, ALICIZATION-E1-T013 |
| ALICIZATION-NFR-PERF-003 | 3, 4（动态降载预留） | ALICIZATION-E1-T013（基线与监测） |
| ALICIZATION-NFR-ENG-001 | 1, 2, 10 | ALICIZATION-E1-T001 |
| ALICIZATION-NFR-ENG-002 | 1, 2, 10 | ALICIZATION-E1-T001 |
| ALICIZATION-NFR-ENG-003 | 1, 4 | ALICIZATION-E1-T002, ALICIZATION-E1-T013 |

## 4. 任务回溯矩阵（Epoch 1）

| Epoch1任务ID | 对应需求ID | 对应架构章节 |
| --- | --- | --- |
| ALICIZATION-E1-T001 | ALICIZATION-NFR-ENG-001/002 | 1, 2, 10 |
| ALICIZATION-E1-T002 | ALICIZATION-DEP-001, ALICIZATION-NFR-ENG-003 | 4.1, 4.2, 4.3 |
| ALICIZATION-E1-T003 | ALICIZATION-F1.1, ALICIZATION-NFR-SAFE-003 | 6.2, 8.1, 9.1, 9.4 |
| ALICIZATION-E1-T004 | ALICIZATION-F1.2 | 5.1, 6.2 |
| ALICIZATION-E1-T005 | ALICIZATION-F1.1, ALICIZATION-F2.2 | 3, 5.2, 9.2 |
| ALICIZATION-E1-T006 | ALICIZATION-F2.2 | 5.2, 9.2 |
| ALICIZATION-E1-T007 | ALICIZATION-F1.3 | 6.3, 6.4, 9.2 |
| ALICIZATION-E1-T008 | ALICIZATION-F1.3, ALICIZATION-NFR-PERF-002 | 6.4, 9.2 |
| ALICIZATION-E1-T009 | ALICIZATION-NFR-PRIV-001, ALICIZATION-DEP-002 | 6.1, 6.3 |
| ALICIZATION-E1-T010 | ALICIZATION-F1.3, ALICIZATION-NFR-PERF-001 | 6.4, 9.5 |
| ALICIZATION-E1-T011 | ALICIZATION-NFR-PRIV-002/003 | 7.1 |
| ALICIZATION-E1-T012 | ALICIZATION-NFR-SAFE-001/003 | 5.3, 7.3, 9.3 |
| ALICIZATION-E1-T013 | ALICIZATION-EPOCH-1, ALICIZATION-NFR-PERF-001/002 | 3, 4, 8.1 |
