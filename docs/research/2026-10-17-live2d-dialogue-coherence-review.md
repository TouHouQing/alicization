# Live2D 对话动作、表情与口型一致性体验复查

本轮完整复查与最终包验收已经完成。修复了旧动画吞掉新点头、语音回调重复动作、分句轮换大动作、直接点头祈使句漏识别四类问题。表达节奏更安静、更连贯；这仍不能证明完整数字生命或逐音素自然口型已经实现。最终指标与安装包来源见文末。

本轮围绕 Phase 1 的身体表达一致性，从新建测试身份开始复查产品使用流程。全部 GUI 运行于没有切换输入桌面权限的独立 Windows 桌面，使用 Live2D Hiyori，不切到 VRM。保留既有本地修改，不修改用户的实际人格、记忆或供应商配置。

## 基线实际发现

1. 当前已交付包 `live2d-text-presence-20261017` 在原生举手尚未结束时收到程序点头，点头指令被当作已执行，但渲染插件因前景原生动画仍在运行而立刻取消。受控真实模型检查中，点头及紧接的重复点头各有约 20 个绘制帧，程序动作有效帧均为 0。原始失败：`output/live2d-coherence-handoff-baseline-20261017/report.json`。这是渲染交接校准，不充当真实自主动作证明。
2. 实际配置模型与真实 UI 的语音对话中，同一段 `celebrate_small` 出现 `segment-preview`、`segment-shift` 两个 revision；下一段 `cheer_raise_hand` 出现 `segment-shift`、`segment-start` 两个 revision。不同回调重复承诺动作，可能导致资产重演。实际原始帧：`output/live2d-coherence-voice-baseline-20261017/report.json`。
3. 实际用户说法“你轻轻点一次头”未命中有界身体请求识别，回复时可能选中无关动作。原先支持“你能轻轻…”和“现在只轻轻…”，存在具体语言缺口。
4. 新消息确实可以停止正在播放的旧音频，基线实际检查通过。保留并加强下一轮身体响应、旧音频不复活、结束后嘴部恢复的检查，不能把该通过项说成新修复。
5. 第一次候选包虽然通过重复动作检查，逐帧画面仍显示安静的六句描述轮换原生动作，该回复实际 SDK 记录有 4 次原生动作调用，整次语音检查有 5 次。只去掉同一动作的重复不够自然，因此继续将语音收敛为每次回复最多一个主要动作。候选 ASAR SHA-256 为 `35a41aa1db3b1a7bf04a78a587b11f7405c8ec698a34be5a798180813dfc0f23`；对应候选报告、源码指纹和画面证据仍保留。

## 实现与责任边界

- 桌面主进程 `embodiment/requested-gesture.ts` 负责将当前直接请求匹配到实际能力，扩大明确祈使句覆盖，保留否定、假设、引用等限制。
- `Stage.vue` 仍负责语音管线与表演组件的组合。文字与语音均等到实际回复文本出现才允许主要动作，准备阶段的空元数据不消耗动作名额。`stage-action-delivery.ts` 作为 performance runtime 的局部状态，按逻辑 utterance 限制一次主要动作，不以分句、文本空白或 gateway 重试制造新动作。面部、目光、口型和说话微动继续更新；普通显式动作片段和独立主动事件保留自己的语义。名额在自然冷却和缓冲空档后仍保留，避免下一句又重新开始；显式清理释放，记录上限 256。
- 语音片段尚未出现时，`armPerformance` 用明确的 turn ID 认领同一动作名额；后续真实片段回到该身份，避免早到元数据绕过整轮限制。新一轮有自己的身份；旧轮的晚到片段不能因准备下一轮而重新获得动作名额。
- `use-stage-embodiment-performance-runtime.ts` 继续拥有语义表演。预备交给正式播放时表情和驱动来源可以更新，同一动作不重新发号；`cadence-peak` 等到真正节拍，不在片段开始时抢跑。
- Live2D `Model.vue` 继续接收 readonly `performanceState`、`speechRenderState` 与 bindings。`procedural-action.ts` 将程序动作接入与原生资产相同的前景所有权；只有实际支持并接受的新前景动作才撤销旧资产及异步预约，清理过期执行诊断。后台主动小动作不能抢占前景动作。显式启用的循环在有限程序动作结束后恢复；默认自然待机不启动整段循环。
- `pose-recovery.ts` 仍负责结束后虚拟部件选择器和透明度的 SDK 平滑回落；口型仍由真实音频负责，文字不制造声学时钟。

未把表演状态拆成新的人格或情绪中心，也未添加主动性计时器、提高执行权限或改写记忆语义。

原有“预备转正式播放”测试要求 action revision 再增长，本轮改为保持同一 revision，同时继续断言动作、面部与驱动来源交接到 segment，匹配不重复演出的新行为。节拍测试继续要求真正的 `segment-beat` 并检查后续声学峰值不重演；实现修复抢跑条件，没有删除节拍覆盖。增加跨分句、冷却空档和下一轮的运行时测试。先行测试的失败记录保留。

候选完整产品检查还撞到独立 `presence-pulse` 恰在采样结尾进入短冷却，原断言把它当作聊天卡住。保留失败轨迹；最终检查在原有 18 秒观察后再等待最多 6 秒的实际 idle 恢复，完整保留主动事件与所有绘制帧，不禁用主动性，也不删除最终恢复断言。针对新一轮点头的证据另按指令 revision、发号时间和来源复核，排除前一轮带来的 12 帧，实际新请求点头为 9 帧。

## 外部实现依据

参考 [VTube Studio 的参数控制优先级与平滑交接](https://github.com/DenchiSoft/VTubeStudio/wiki/Interaction-between-Animations,-Tracking,-Physics,-etc.)：身体参数需要明确控制者，控制权释放后平滑回到下一层；参考 [Cubism 官方 Motion 说明](https://docs.live2d.com/en/cubism-sdk-manual/motion/) 和本地固定版本 `pixi-live2d-display 0.4.0` 的 `MotionState.reserve/start/reset`，核对异步加载后的预约验证与公开 `stopAllMotions()` 行为。本轮独立实现，没有复制来源不明的代码，也未声称运行闭源 VTube Studio 客户端。

## 验收与体验判断

编译运行时的先行检查已经完成：785 项回归、55 个文件全部通过；整仓类型检查与 lint 通过，保留既有警告。真实语音检查 50 项通过，865 个最终绘制帧；发声中通过 UI 开始下一轮后约 417.6 毫秒停止旧音频，下一轮实际点头 9 帧；同一语义片段的相同动作重复为 0。`output/live2d-coherence-voice-fixed-20261017/report.json` 保存原始记录。程序交接校准 15 项通过，新点头实际生效 9 帧；`output/live2d-coherence-handoff-fixed-20261017/report.json`。

最终精确包结果见文末。检查包括新建人格、连接失败反馈、模型选择、设置、数据导入导出、辅助窗口、真实文字和语音对话、连续动作交接、发声中打断和正常退出。受控表情/口型校准与真实 UI 模型对话分开记证据。

| 体验问题 | 观察依据 | 不能据此推断的事项 |
| --- | --- | --- |
| 对话是否真的驱动身体 | 用户通过实际聊天输入发送，观察动作 revision、SDK 请求和最终编译参数 | 仅收到动作名称不能证明动作实际画出 |
| 表情是否符合当前语气 | 喜悦、安慰、确认的实际回复与说话截图；受控 angry/happy/wide-eye 最终参数 | 不能把受控输入说成自主情绪 |
| 口型是否随声音而动 | 实际 AudioBuffer 与最终绘制，完整 200 毫秒低能量 PCM 窗口、发声开口、停止释放 | 未验证每个音素的精确对齐和物理扬声器听感 |
| 连续回复是否打架 | 前一原生动作未结束时新的程序动作；实际发声中开始下一轮 | 校准中的强制动作不证明模型会自主做该动作 |
| 结束后是否安静 | 语音停止、表演 idle、原生优先级 0、嘴部和实际手臂部件恢复 | 一段安静样本不能证明长期人格连续性 |

短画面由实际运行时 JPEG 按记录时间组合为 GIF，并保留每帧原图；不是生成的动画，也不是音素质量的完整视频证明。编译运行时证据为 `output/live2d-coherence-voice-fixed-20261017/actual-dialogue-1.gif`、`actual-dialogue-2.gif` 及对应接触表。

这些修复消除可复现的动作丢失和重复发号，提高同一轮对话的表达一致性。有限资产的肢体词汇、细粒度音素时间对齐、个性化微表情与长期情绪连续性的体验仍需持续扩展；本轮通过不等于“数字生命已经完成”。静音后台音频验证涵盖真实 PCM 与最终绘制，不涵盖物理扬声器听感和麦克风采集。

## 最终交付与验证

| 检查 | 最终结果 |
| --- | --- |
| 回归 | 788 项、55 个文件全部通过，失败与跳过均为 0；覆盖人格、记忆、执行策略、主动性和身体表达。`output/live2d-coherence-final-regressions-20261017.json` |
| 静态检查 | 整仓 `pnpm typecheck`、`pnpm lint:fix` 通过；既有 725 个 ESLint、7 个 Oxc 警告，无错误；验收脚本单独 ESLint 通过。 |
| 精确包完整产品流程 | 121 个界面状态、259 项检查通过。首启人格、配置失败恢复、模型及 ZIP 导入、动作预览、颜色与变换、角色卡、数据导入导出、服务配置入口、托盘窗口、实际模型文字对话均检查。意外渲染错误与裸露翻译键为 0。`output/live2d-coherence-final-product-packaged-20261017/report.json` |
| 实际文字表达 | 1139 个最终绘制帧；六类文字场景均回到 idle、无声且原生优先级 0，实际手臂部件恢复，没有模拟发声时钟；普通点头与中断后点头均实际执行。 |
| 精确包实际语音 | 51 项检查通过；21 段实际 SAPI 音频、897 个绘制帧；六轮回复每轮最多一个主要动作，分句没有形成大动作序列。完整 200 毫秒静音窗口、实际发声开口、停止释放通过。`output/live2d-coherence-final-voice-packaged-20261017/report.json` |
| 发声中断与新动作 | 新消息通过 UI 发出后约 383.9 毫秒停止正在播放的旧音频；旧音频未复活，新一轮点头为同一 revision 的 8 个绘制帧，最大偏移约 −1.94°；结束后嘴部和身体安静。 |
| 精确包校准 | 21 项检查、1056 个绘制帧通过。安静待机约 145.64 秒、720 帧，整段自动动作 0；喜悦、愤怒、惊讶、闭口音、发声、静音与停止通过；旧举手尚未结束时的新点头实际生效 8 帧，有限结束，手臂恢复。`output/live2d-coherence-final-calibration-packaged-20261017/report.json` |
| 启动退出 | 无 Node 调试器的精确包像素、静音 WebAudio 与 UI 关闭通过。四个最终后台运行均正常退出，耗时约 1115/1585/1320/1185 毫秒；未将 Windows Job 兜底结束算作正常退出。`output/live2d-coherence-final-native-exit-20261017/report.json` |
| 用户桌面隔离 | 四个最终 isolation JSON 均证明未切换输入桌面、准确登记的 QA 进程 Job 已关闭；输入桌面始终为 Default。 |
| 凭据与临时语音 | 只读扫描本轮 16 个合成档案、1208 个文件、277771971 字节，真实密钥残留、非空密钥配置和临时语音文件均为 0。`output/live2d-coherence-release-hygiene-20261017.json` |
| 文件清理 | 构建工具已清除 NSIS 中间压缩包。删除本轮 1030195677 字节候选 ASAR 备份被自动审批审查拒绝，原因仅为 `blocked by policy`；文件保留，没有改用其他方式删除。拒绝记录：`output/live2d-coherence-candidate-cleanup-20261017.json`。 |

最终实际语音画面为 `output/live2d-coherence-final-voice-packaged-20261017/actual-dialogue-1.gif`、`actual-dialogue-2.gif` 及对应接触表；原始逐帧 JPEG 和采样时间保留。截图采样不是完整帧率视频，不替代原始音频和 Cubism 绘制轨迹。

安装包：`apps/stage-tamagotchi/dist/live2d-dialogue-coherence-20261017/Alicization-0.3.0-windows-x64-live2d-dialogue-coherence-20261017.exe`，608051213 字节，SHA-256 `fbb006a26ac3e49aa94e584ac5a571301131df49f3b959043f505d212b8cccc4`。解包入口为同目录 `win-unpacked/alicization.exe`。

代码基线 `f514ec005a39fc01c71043caf26275d14d016270`，包含已有本地工作与本轮修复，不称作未修改的上游提交。3008 个源码输入指纹为 `44787675f3e47230857a4aa8a499d13eda18f39b6be536ab58a1704e3f116e0f`；1173 个编译文件逐项匹配 ASAR，273 个原生资源验证通过。ASAR SHA-256 `bdea581b8232104ac9dbb3be3078ecbd657d3bc42f8c617e68d2e3662124b7ac`。严格来源核验通过，完整记录在发行目录的 `release-provenance.json`，机器摘要为 `output/live2d-coherence-release-summary-20261017.json`。

本轮确认产品与表达流程可用。所有付费供应商的联网能力、任意自定义模型、物理语音设备、长期人格与关系连续性、多步身体指令编排均不在这一组实际验收的覆盖承诺内；没有把更大范围的 resident-life、执行治理或长期真实体验验收标志置为通过。
