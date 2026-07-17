# 历史归档：2026-04-10 Alicization Organic Runtime Refactor

> 状态：已失效
> 归档日期：2026-07-16

本文件仅保留历史索引，不再包含可执行实现步骤。原方案依赖的本地回复塑形、旁路回复权威和固定自然语言治理已经从生产链路删除，不得从 Git 历史恢复。

现行不变量：

- 正常用户可见回复只来自 Provider。
- WorkingMemory 是短期记忆 owner。
- LongTermMemoryRecall 是长期回想 owner。
- timeout、Provider、工具、权限、协议、召回和持久化失败使用透明 FailureSurface。
- 失败文本、raw transcript 和待审核候选不得进入 persona learning。

现行依据：`docs/superpowers/specs/2026-07-13-alicization-single-memory-dialogue-mainline-design.md`。
