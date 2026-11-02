# Windows 执行身份与浏览器观察证据

本轮继续 Phase 1 的执行与对话闭环，不表示 EX00–EX23 已全部完成。

## Codex 临时目录

实际主目录适配器的随机文件读取曾因 `CreateProcessWithLogonW 1326` 失败。旧长任务测试只检查命令事件、心跳及会话终态，任务未启动也可能通过，原执行覆盖声明已撤回。

核对官方 CLI `rust-v0.142.3`（提交 `e2b60462a7321517895dd94920661599303a7539`）的 `windows-sandbox-rs/src/setup.rs`、`identity.rs`、`elevated_impl.rs` 后确认：现有 elevated 沙箱除了认证，还依赖版本 5 的 `.sandbox/setup_marker.json` 与 `.sandbox-secrets/sandbox_users.json`。后者为同机 DPAPI 密文。只复制 auth 的临时目录不能复用完整身份。

实现仅复制这两个固定文件，验证版本、用户名一致、普通文件、无链接、限定大小与来源范围，并前后核对字节。复制前给临时密文目录设置保护 DACL，仅保留当前用户、SYSTEM 和 Administrators。错误不输出密文内容，临时目录沿用任务生命周期清理；缺失或不兼容在派发前失败。不复制历史和会话，不重置账户，不改变沙箱模式。测试暴露的 PowerShell Security 模块加载问题已改为 .NET 目录权限接口。

隔离工作目录上，状态模块及适配器两文件 88 项通过，Node 类型通过。真实 CLI 三项通过：模型请求、随机标记文件读取、四阶段长任务。补强后的长任务要求实际命令 `completed`、退出码 0、全部四个 stdout 标记；模型自己说“完成”不能代替它。真实测试前后，两个沙箱账户密码更新时间均保留为 2026-10-25 01:33:42。已按主目录 v146 文件哈希核对并合入，主目录组合、构建和体验复验待完成。

参考：[官方 Windows 沙箱说明](https://learn.chatgpt.com/docs/windows/windows-sandbox)、[固定版本身份实现](https://github.com/openai/codex/blob/e2b60462a7321517895dd94920661599303a7539/codex-rs/windows-sandbox-rs/src/identity.rs)。仅按已核对协议支持当前版本，未宣称其他版本验收通过。

## 浏览器任务回复

v146 的 306 项组合和完整构建 pass106 通过。实际 Live2D 组合 pass103 已完成普通交付、步骤修复、条件修改、下载各三轮以及一次已登录浏览器交付，在 151 项处失败。它把“计划已接纳，但目前还没有浏览器步骤的执行结果或网站回执，不能确认交付已完成”误当为无证据的完成声明。退出正常，宿主 Default 输入桌面未切换。

这句话描述当前账本没有观察结果，不能作为网站实际失败或文件缺失的证明。现在只在同一输入绑定的浏览器计划上、全部步骤都没有观察记录时识别这一阶段；任一实际步骤已有记录、其他输入、额外保存/上传或网站实际不存在的断言均不能借用。回归先复现 RED，再验证 17 项通过，包含语义 review 将整句误标为无绑定步骤结果的情形。策略 v76；最新完整体验待复验。

证据保留在 `output/execution-browser-absence-*-20261025*.json`、`output/execution-codex-state-reviewed-merge-20261025.json`；隔离目录的实际 CLI 与 88 项单测日志保留，不改写之前的失败。
