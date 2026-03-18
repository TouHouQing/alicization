---
title: Discord Bot
description: 参与并贡献 Project Alicization
---

### Discord Bot / 机器人

```shell
cd services/discord-bot
```

配置 `.env` 文件：

```shell
cp .env .env.local
```

编辑 `.env.local` 中的各类密钥和配置信息。

启动机器人：

```shell
pnpm -F @proj-alicization/discord-bot start
```

::: tip

如果你使用 [@antfu/ni](https://github.com/antfu-collective/ni)，你可以：

```shell
nr -F @proj-alicization/discord-bot dev
```

:::
