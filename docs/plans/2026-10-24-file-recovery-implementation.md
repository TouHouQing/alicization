# EX14 文件恢复接线

本补充服务于 Phase 1 的可信执行：保留实际文件变更前后的版本，让主人能理解、停止和纠正操作。它不创建另一个人格、目标或执行器。

## 所有权和风险

- 元数据、原 effect、来源、原路径、before/after hash、恢复决定和结果都由现有 life writer 记录。加密 blob 只是本地字节产物。
- Vault 放在当前 card 数据目录内，随 card 的删除、备份和迁移一同处理。原文件内容不写入 ingress、模型上下文、训练材料或遥测。
- 对既有文件的备份属于已授权文件变更的一部分；不可用时，在业务字节写入前拒绝变更。普通操作不增加一次额外审批。
- 恢复属于文件破坏操作，必须使用可信设置页的一次确认，展示原路径、版本和将恢复/删除的具体对象。禁止模型自行调用恢复入口。
- 当前文件已被主人修改、路径/身份变化、备份损坏或无法解密、原生 writer 尚未停止时，禁止覆盖。
- 外发消息、支付、上传和任意命令没有假回滚。恢复文件也不能把未完成的原目标变为完成。

## 接线顺序

1. 修复现有 compensation 的结果审计失败释放问题；取消回调与原生 close 分开确认，晚到 close 只清理私有 worker，不自动释放未知文件结果。
2. `file-recovery-vault.ts` 提供有界加密 blob 存储、稳定读回、精确删除和占用统计。生产 codec 使用本机 Electron safeStorage；测试注入真实加密 codec。
3. `file-version-repository.ts` 将不可变 before-image 和实际 after-image 写入同一 ingress journal，绑定原 effect 和已打开文件身份。仅重试无关全局时钟变化。
4. 文件适配器在实际句柄上采集原字节，持久化成功并复查同一版本后才写入；关闭句柄后记录实际结果。前台和工作计划共用同一个受主进程控制的 hook。
5. 恢复控制器重新读原 effect、备份和当前文件，生成有期限的窗口确认。实际恢复/删除通过独占原生文件句柄、明确的来源栅栏、截止时间、审计和停止协议完成。
6. 界面展示版本、可恢复状态、变更冲突、停止和未知结果；重开页面以生命账本为准。结果归档与当前产物状态分别可追溯。
7. 清理先由 writer 标记过期，再删除匹配的密文字节；运行中/未知的恢复不得清理。孤立 blob 只有超过保留窗口且账本无引用时才可删除。

默认边界：原文件最多 2 MiB，单个密文最多 3 MiB，每个 card 的 vault 最多 64 MiB/4096 文件；每次读取、列举和清理都有明确预算。达到容量上限不能通过丢弃活动备份继续写入。保留时间应显示在恢复界面，并支持主人明确删除备份。

## 必须保留的验证

- 真实文件：正常覆盖、创建文件、写后主人编辑、相同字节但不同文件身份、路径被替换、空文件、UTF-8/二进制原字节、容量不足。
- 密文：没有明文字节落盘；损坏、错误 key、跨 card/路径、重复 capture、并发预算、断电遗留文件和精确清理。
- 生命周期：准备审计失败、结果审计失败、取消先于 close、超时未停、late close、重启后 unknown、不得重放恢复。
- 事务：确认过期、另一个窗口、来源改变、同一目标变化、无关 owner 竞争、重复按钮、清理与恢复竞争。
- 产品：实际 Live2D 页面三轮查看/确认/恢复/重开及正常退出后的只读检查；原始任务、文件结果、身体状态与按钮含义一致。

## 参考

- [Cline checkpoints](https://github.com/cline/cline/blob/main/docs/core-workflows/checkpoints.mdx)：可比较的持久检查点和选择性恢复。
- [Cline restore implementation](https://github.com/cline/cline/blob/main/sdk/packages/core/src/session/checkpoint-restore.ts)：恢复对象和会话状态需要各自明确处理。
- [Node child process](https://nodejs.org/api/child_process.html)：AbortError 和 close 是不同事实。
- [Windows SetFileInformationByHandle](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfileinformationbyhandle)：破坏性变更需要绑定实际打开的文件句柄。

这些参考没有直接复制源码。当前文档是实现约束，不能作为 EX14 已验收的证明。

## 隔离实现进展（尚未合入主工作区）

当前 execution-transfer 管理工作树已经实现：有界加密 vault、同一生命 writer 的不可变 before/after 版本记录、实际文件适配器句柄上的采集与等待后的版本复查、前台及工作计划的私有 dispatch port、Electron safeStorage 生产 codec、原生独占句柄恢复与删除本次创建文件。版本读回核对当前 card、journal hash、原 effect、文件身份和字节 hash；原内容不写入 journal、模型参数或训练数据。

执行层 57 文件/232 项集成测试和主进程类型检查通过。随后新增的 NTFS 限制、相同字节的另一个文件对象、2 MiB 恢复、创建文件删除、共享 hard-link 拒绝和实际备份采集共 7 项测试通过。实际 Electron 私有桌面探针 pass3 使用生产 safeStorage：第一个进程三次覆盖/备份后退出，第二个进程解密各版本并从真实密文恢复文件，capture 14 项、reopen 10 项通过；两个进程和控制器均退出 0，Default 未切换，4898 个源码文件的冻结哈希一致。pass1 的档案登记失败与 pass2 的测试读取目录错误均保留，不能计为成功。

这些结果尚未证明恢复产品闭环。确认 UI、未知恢复治理、保留/清理、启动时恢复资源占用和应用关闭等待仍需完成。主工作区暂不接入该备份服务，避免产生主人无法治理的备份或恢复任务。

## 恢复控制器的实现约束

1. 使用独立、主进程拥有的 Eventa 文件恢复命令，不注册模型工具。命令只接收 card、版本 ID、动作和一次 token；路径、before/after hash、原 effect 与目标身份全部由 repository 读取。列表使用 16 项分页，不能把原文或密文交给 renderer。
2. 预览显示将恢复原文件还是移除本次创建文件、原路径、原/现版本、将停止的关联责任及当前不可恢复原因。token 绑定窗口 surface、动作、版本及当前文件/原 effect/责任快照，120 秒过期；确认在任何 await 前消费。其他窗口、改动后的文件或版本、来源/责任竞争、重复点击均拒绝。
3. 关联工作先在同一生命 writer 中取消，保存恢复开始记录，再启动 native helper。不要把恢复视为原目标完成，也不要重放原业务动作。完成的旧目标可作为历史，但不得据此宣称当前路径仍保有旧产物。
4. 原生恢复使用真实 NTFS 身份、当前 after hash、独占句柄和截止时间；同字节的另一个对象、reparse point、共享 hard-link 和其他文件系统均拒绝。父目录改变不能把批准的目标换成其他文件。
5. audit prepared 成功之前没有 native 输入。扩展 helper 的启动握手，记录 PID/进程身份后才发送写入请求；记录失败时终止并确认 close。AbortError、期限到达和请求了 kill 都不是停止回执。实际 close 与结果审计齐全后才释放文件占用。
6. 恢复尝试、结果和主人接管决定各用不可变 journal 记录。未有终止结果的尝试在重启后恢复精确文件占用；全历史分页扫描具有明确上限，损坏或超过预算时保持 bootstrap 阻断，不忽略。不能以 UI 历史展示范围代替资源恢复范围。
7. 未知状态由当前窗口的另一次确认接管：主人明确确认外部 writer 已停止，保存原未知记录和非独立接管决定后再释放具体占用。接管不产生恢复成功、文件成功或目标成功。进程/卡片退出时请求停止所有恢复 owner，并等待实际 native close 和 journal drain。
8. 清理先写入有依据的 tombstone，再精确删除匹配的密文，最后记录删除结果；部分失败可在启动后继续，但不能重新执行文件恢复。原 effect 或恢复 owner 仍活动/未知时拒绝清理。无引用旧 blob 的清理同时核对全账本引用、当前 capture、文件身份、密文 hash 和最短保留窗口；零长度断电遗留文件也要有独立、可追溯的治理入口。

[Microsoft 的文件身份说明](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileinformationbyhandle)用于确定 NTFS 文件对象与路径不是同一事实；参考 [libuv Windows stat 实现](https://github.com/libuv/libuv/blob/v1.51.0/src/win/fs.c)核对 Node identity 的来源，没有复制其源码。当前仓库安装的 Electron 40.x 类型仅暴露同步 safeStorage API，因此使用其实际可用接口；加密不可用或 Linux basic_text 时拒绝明文降级。升级 Electron 后再按[官方 safeStorage 文档](https://www.electronjs.org/docs/latest/api/safe-storage)迁移异步接口。

## 恢复状态复用现有 LifeEffect

恢复控制器将使用已有 life effect writer，避免另建一套未知结果状态机。每次主人确认生成 recoveryId，原生 helper 的资源 effectId 固定为 file-restore:<recoveryId>。控制器在同一 writer 中记录真实 UI 命令、取消预览中已确认的关联责任、准备/认领/派发 host.filesystem_restore_version effect；turnId 为 null，不伪造聊天输入。参数只存版本 ID、路径、before/after hash 与原 effect，绝不存原字节。

resourceSnapshot 保存真实路径和 inode；现有 executionOperationResources 可按 filesystem 能力恢复资源。启动握手的 PID、创建 ticks、worker 路径/hash 与截止时间写入该 effect 的辅助 journal。只有 observed 审计成功，effect 才 settled/failed；异常保留 dispatched/uncertain。现有跨 card 启动扫描可恢复其占用；通用 host-effect 接管机制保留原未知回执，不产生恢复成功。新的恢复控制器必须接上仍活着的 native owner 检查，防止通用接管忽略一个已知还在运行的 helper。

helper 当前已实现 durable-startup-before-stdin、迟到审计不能发送输入、严格终止帧校验与独立恢复资源 owner；实际文件 9 项和新增启动故障 6 项测试通过，独立 owner 再回归 13 项通过。新的 recoveryId 必须由可信控制器显式传入，不增加旧调用缺参时生成身份的兼容分支。下一步依次为控制器、不可用/未知状态治理、IPC、确认界面、保留与清理，以及三轮真实 Live2D 产品验收。

## 10 月 24 日：控制器、停止和备份接线

控制器已接上可信 Eventa 命令和生命状态页的独立 FileRecovery 组件；页面只接收分页元数据、确认 token 和结果状态。Stop 绕过正在执行恢复的 foreground 队列。主进程复用实际 PID、创建时间和 executable 的 Windows kernel handle 检查，异步 stop guard 在每次接管/核对前均 await，不把 Promise 当作“已停止”。Kill switch 和退出调用 interrupt/dispose，等待 admission、native owner 和迟到 journal drain；数据库关闭不先于这些任务。

控制器、未知状态接管、异步停止和 IPC 共 4 文件 26 项通过，包含停止前置 admission 仍在持久化、native 已退出但审计未结束的真实 RED/GREEN 回归。实际 Windows 进程控制测试已通过：错误创建时间和镜像不能终止另一个进程，正确身份终止后确认 handle 退出。UI、控制器及备份接线后的主进程类型检查通过；界面首次类型检查通过，实际 renderer 操作仍未验收。

整卡备份新增明确的 life-backup-v2 格式：仅复制数据库快照引用的加密 blob，记录精确密文引用并验证；备份运输不解密。原 life-backup-v1 仅在数据库没有文件密文引用时可恢复，有引用的旧格式必须拒绝。还原保留当前执行记录、文件 before/after 与恢复审计，并将快照和当前操作引用的密文一同放入 staged card；激活前再次验证。15 项备份/版本测试已通过，包括 staged 和 before-moved 中断、较新版本的原字节重开，以及缺失/篡改密文、伪造旧格式拒绝。

Windows DPAPI 密文仍绑定本机账户；跨机器可解密迁移没有实现，不能声称备份已具备此能力。保留/tombstone/孤儿治理、实际 renderer 确认和三轮 Live2D 接线验收仍未完成，EX14 不标完成，隔离实现暂不合入主工作区。

## 后续闭环验证：真实界面、版本清理与孤立密文

以上“仍未完成”为当时状态。后续已实现独立的版本清理确认：先通过既有 evidence-forget writer 撤回版本，再精确删除密文，最后持久化结果；中途失败保留待清理状态。恢复与清理 token 按用途和窗口隔离，活动或未知原 writer 不得清理。撤回不能被旧整卡备份复活，也不能改变业务文件或原任务结果。

启动和日常维护调用独立的孤立密文清理器：超过 24 小时、全历史无版本引用、无 pending capture 的对象才候选；每批最多 16 个。先保存精确文件身份、大小、mtime 和密文 hash 的 prepared 审计，再复查引用和 writer 后删除，最后保存 observed。零长度断电文件也纳入；结果审计失败后重启只能补记缺失，不能重放业务写入。扫描预算为 131072 条版本/审计历史与 4096 个未完成审计，预算或完整性不满足时拒绝清理。退出先等待维护任务再关数据库。

实际 Electron probe pass5 完成 capture 14、reopen 28 项，合计 42 项；生产 Windows DPAPI、三次原生恢复、原生进程停止、旧整卡恢复后的版本解密均通过。随后实际 Live2D renderer 专项 pass1 完成三次恢复，28 项通过；pass2 增加一次独立版本清理和两个启动孤立文件清理，共 35 项、7 个页面通过。两个应用进程及控制器正常退出，Default 桌面未切换，冻结源码在各轮前后一致。完整恢复面板已人工查看，清理后的版本不能再次确认恢复，现存业务文件保持原样。

这些专项使用合成身份和实际生产适配器捕获的版本，不等于模型生成任务、全部身体表现或 EX00–EX23 总验收通过。之后复核又新增两条实际失败回归：16 个有引用旧版本不能阻塞后面的孤立文件；旧身份还原必须保留未完成的孤立清理审计。修复后冻结 v4 的生命周期等 31 项和主运行时/IPC/备份 177 项通过，主进程类型检查通过，源码前后哈希一致；较新下载表述同步之后须再验证。主工作区仍未合入 EX14；跨机器密文迁移、完整长期保留治理与总故障矩阵保持开放。

## 选择性合入主工作区

在主目录 49 个目标文件的原 hash 全部符合审阅基线后，已合入 27 个新增文件和 22 个更新。原文件备份、完整 patch、候选 hash 和应用回执保存在 output/file-recovery-reviewed-merge-20261024。已有受理文档、近期回复校验和下载专项分支全部保留。隔离 Live2D pass3 再次通过 35 项、7 页面，两个应用及控制器退出 0，Default 未切换，v7 哈希前后一致。合并后的主目录尚待类型、集成和真实产品复核；本次合入不代表 EX14 或 EX00–EX23 全部验收完成。
