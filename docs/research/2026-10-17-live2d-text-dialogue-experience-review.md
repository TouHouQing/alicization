# Live2D 文字对话表达复查（2026-10-17）

本轮检验 Phase 1 中人格、情绪与身体的一致性。实际桌面 Live2D、真实配置模型、实际聊天界面，全部运行于隔离 Windows desktop，不切换用户输入桌面，不使用 VRM。参数取自 Cubism 最终绘制阶段。受控表情校准与实际模型回复分别记录。

## 已复现的问题

关闭语音的文字分句仍进入 `applySyntheticSpeechSegment`：按文字长度累计模拟发声时间，用正弦波合成能量。口型与节拍系统因此认为她在持续说话；没有音频，绘制口型却达到 1。

另一个独立问题是 `currentMotion` 被当作 localStorage 设置跨窗口同步。历史指令重复进入 Model 的 watcher。第二次完整基线四轮分别启动 64、2、8、62 次原生动作，调用栈多数来自 `setMotion`，实际语义指令远少于此。将正在执行的动作存为同步设置会重放历史命令。

情绪选择与语义动作也有两个执行出口，同一回复可能启动两个不同动作。默认将完整 `Idle:0` 资产称作“轻轻点头”不准确。另外语音节拍动作去重键包含自身递增 revision，同一分句的后续节拍仍可重启相同动作。

第一次基线测试错误使用了结束事件名，原始失败报告保留；第二次使用实际 `assistant-end` 后完成全部观察。第一次修复诊断已无模拟发声、动作次数大幅下降，但“任何时候嘴都不能张开”的断言失败：原生一次性惊喜动作可以张嘴。最终验收要求无模拟声学信号、非前景动作时嘴部无声学驱动、原生动作有唯一语义来源、同轮动作不重复；不以单一嘴部最大值否定所有表情。

## 对照与实现取舍

| 项目 | 查阅内容 | 采用的做法 |
| --- | --- | --- |
| Open-LLM-VTuber | [表情生命周期](https://docs.llmvtuber.com/en/docs/user-guide/live2d/)、固定版本 [expression hook](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web/blob/d176e7df2366952e3bacbf12cf9a8b18a4315932/src/renderer/src/hooks/canvas/use-live2d-expression.ts) 与 [audio task](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web/blob/d176e7df2366952e3bacbf12cf9a8b18a4315932/src/renderer/src/hooks/utils/use-audio-task.ts) | 表情由语义保持，结束时恢复；音频存在时才进入音频口型路径。未照搬自动 Idle 循环。 |
| N.E.K.O | 固定版本 [live2d-emotion.js](https://github.com/Project-N-E-K-O/N.E.K.O/blob/96dd26258003c74970e9d75e24f4e863012ba20d/static/live2d/live2d-emotion.js) 的 timer generation、soft clear、基线恢复 | 临时动作有所有权，过期任务不能污染下一次动作，动作与保留的表情分别释放。 |
| VTube Studio | [参数来源优先级与交接](https://github.com/DenchiSoft/VTubeStudio/wiki/Interaction-between-Animations,-Tracking,-Physics,-etc.) | 一次性动作、表情、基础姿态各有归属，平滑交接。仅研究公开文档，未声称运行或复制闭源实现。 |

本轮独立实现，无第三方源码复制或新依赖。读取的开源文件固定版本，仅将小文件保存在被忽略的 output，不克隆大型仓库与资产。

## 代码节点与闭环

1. `Stage.vue` 接收真实聊天生命周期。`speech-noop` 的分句进入文字表达，结束事件结算当前轮；新一轮取消旧临时状态。
2. `stage-text-dialogue-delivery.ts` 持有轮次、语义签名和动作预算。语义重复不重新表演；文字每轮最多执行一个主要动作，新情绪仍可改变表情，下一轮可以再次执行动作。旧轮次的结束信号不能结束新轮次，结束后的晚到投影不重演；无关主动回应保留自己的轮次。
3. 文字以当前轮的权威 performance 元信息表达情绪，不把为语音生成的分句修饰当作新的文字情绪证据，也不启动音频、模拟能量或虚假播放进度。真实语音保留已有 speech runtime。
4. `use-stage-embodiment-runtime.ts` 连接权威元信息与分句表达。performance runtime 保持最终表情 2.4 秒后使用原有平滑恢复；新回复取消恢复计时器。语音节拍去重改用稳定的分句／动作键。
5. `Model.vue` 收到结构化 performance 后只执行 action pulse，旧情绪选择不是第二个命令。独立查看器仍接受直接命令；显式预览使用唯一 request ID；用户主动开启的资产循环使用独立待机策略。
6. Live2D store 的 `currentMotion` 仅为当前 actor 的临时状态，持久化保留模型偏好。移除默认 `Idle:0` 点头绑定，有头部参数时由已有的有界程序点头表达；用户显式绑定资产仍遵从其选择。
7. 实测“请求点头却举手”后，在桌面主进程增加 `embodiment/requested-gesture.ts`。只解析当前用户直接提出的点头、摇头、歪头请求，并与真实 manifest 能力匹配；引用、代码、否定、假设、翻译解释、绘画和写作提及不授权动作。这是三个小动作的有界识别，不声称完整理解任意身体指令。主进程把选定动作同步投影到 envelope、timeline、script 与 digital-life frame，后续语音分句不重演。stream meta 与最终 commit 都携带同一个当前用户文本来源。
8. 实际中断暴露了没有终止事件导致的 `armed` 残留。新增类型化 `stream-cancel`，串行传递取消事件并校验会话、generation 和消息 ID；准备阶段也能取消，晚到取消不能结束下一轮。Stage 取消语音意图并释放当前文字表演。正常结束同样核对轮次。已完成 action pulse 清空载荷并保留单调 revision，避免新加载的身体重演旧动作。
9. 对截图逐项复核发现，举手结束后手臂仍举着，原生动画已停止也不能说明身体恢复了。Hiyori 的 `PartArmA/PartArmB` 使用 Cubism pose 的虚拟选择参数，不属于编译参数数组。`pose-recovery.ts` 在动作与预约均结束后恢复 SDK 自带的默认姿势选择，同时保存当前部件透明度，再让原有 pose fade 平滑交接；不在前景动作或用户选择的循环期间重置。新增最终绘制的手臂部件透明度验收。
10. 无声的主动回应不经过用户聊天结束或音频结束事件，同样需要有界的表情释放；运行时为它安排相同的短暂停留与恢复，不增加主动触发频率。

以上不改变人格、记忆、执行风险权限或主动性判定，不制造新的私人思绪或随机情绪。呼吸、眨眼、目光继续使用既有基础层。

## 验收边界

实际文字场景覆盖初次认识、分享喜悦、安静安慰、请求点头和较长回复，记录 SDK 动作、语义指令、无音频证据和结束后的恢复。完整产品流程复查初始化、设置、模型、导入导出、聊天、辅助窗口和正常退出；语音及受控校准检查真实口型是否回归。

程序点头使用已有参数，不能生成资产没有的手势。一次性资产本身可能有夸张表情，需与重复启动分别判断。软件 GL 后台测试不覆盖用户当前 GPU、物理鼠标、麦克风与扬声器体验，也不等同长期数字生命已经完成。最终结果见下节；临时凭据、语音文件由测试正常清理，保留复现证据。

动作断言以实际指令 revision 和来源界定一次用户请求。一次观察中，请求点头已完成，7.8 秒后另有独立 `presence-pulse` 点头，旧测试把两者都归入同一截图阶段而误判重复请求；原始失败保留。校正后的断言只核对本轮 `dialogue` 指令，独立主动事件仍保留在完整轨迹中。自动部件回落依赖模型提供的 SDK pose；无 pose 的自定义资产不在该项验证范围。供应商页面检查覆盖配置入口，真实联网对话只使用当前已配置供应商，不代表已验证所有外部服务。

## 最终验收结果

| 检查 | 结果与证据 |
| --- | --- |
| 回归测试 | 772 项全部通过，53 个测试文件；覆盖人格、情绪、记忆可追溯性、执行风险、主动性与身体表达。`output/live2d-text-final-release-regressions-20261017.json` |
| 静态检查 | 整仓 `pnpm typecheck`、`pnpm lint:fix` 通过；保留仓库原有的 725 个 ESLint、7 个 Oxc 警告，没有错误。新增验收脚本单独 ESLint 通过。 |
| 精确包产品流程 | 121 个界面状态、259 项检查通过，实际配置模型的初次认识和六轮文字场景；993 个最终绘制帧，无模拟发声或声学能量。六轮结束后均为 idle、无声音、原生动画优先级 0，手臂部件恢复。`output/live2d-text-product-packaged-20261017/report.json` |
| 实际点头 | 普通请求及 UI 中断后的下一轮分别观察到 8 个实际程序点头绘制帧，同一个指令 revision，峰值偏移约 −2.42°，并恢复。 |
| 精确包语音 | 39 项检查通过；实际模型回复、13 段有界静音输出的 Windows SAPI 合成、548 个最终绘制帧；连续 PCM 静音窗口的嘴部释放与真实发声张嘴均检查。`output/live2d-text-voice-packaged-20261017/report.json` |
| 精确包待机与校准 | 21 项检查通过，1067 个绘制帧；实际待机观察 146.34 秒、689 帧，自动整段动作启动 0、嘴部开合 0。排除最初 3 秒目光交接后，头部 X/Y/Z 最大绝对值约 4.25°/4.33°/1.13°。原生举手结束后 PartArmA/B 恢复为 1/0。`output/live2d-text-calibration-packaged-20261017/report.json` |
| 无 Node 调试器启动退出 | 精确包实际像素、静音 WebAudio 与 UI 关闭检查通过，退出码 0。`output/live2d-text-native-exit-20261017/report.json` |
| 正常退出 | 四个最终包验收分别正常退出，耗时约 1894/1368/719/548 毫秒；未将 Windows Job 兜底关闭算作正常退出。对应 isolation JSON 均证明未切换输入桌面、子 Job 已关闭。 |
| 清理检查 | 16 个本轮合成测试档案、1194 个文件、274451871 字节扫描通过，真实密钥残留和临时语音文件均为 0。构建工具已移除中间 NSIS 压缩包；保留交付产物与必要诊断材料。`output/live2d-text-release-hygiene-20261017.json` |

扩展回归首次与编译、类型检查同时运行时，一个现有执行账本测试在默认等待窗口内未收到结束事件。原始失败保留；该用例独立运行通过，限定 Vitest 为两个 worker 后完整回归通过，没有修改该测试的等待窗口或跳过断言。

安装包：`apps/stage-tamagotchi/dist/live2d-text-presence-20261017/Alicization-0.3.0-windows-x64-live2d-text-presence-20261017.exe`，608048157 字节，SHA-256 `b1e5bb0d7bdb806710d8c96f52c8a1fb3d82388eae713ef875f3a2fe5e3ae69f`。

构建基线为 `f514ec005a39fc01c71043caf26275d14d016270`，包含此前本地修改与本轮修复，不声称是未修改的上游提交。3004 个源码输入指纹为 `39780070ede45fbd6e74ff3d03ee1f20e68ee190b82da44ac41007fa7005872f`；1173 个编译文件逐项匹配 ASAR，273 个原生资源验证通过。ASAR SHA-256 为 `7ab8b848c583945d03e68b4410b33383997488bd4ec2497fdd355d42190a70d6`。严格发布来源核验通过，完整记录位于该发行目录的 `release-provenance.json`。

原生举手回落对照图：`output/live2d-text-pose-comparison-20261017.png`。这是相同模型资产的一次性动画校准截图，不充当自主行为或长期数字生命的证明。
