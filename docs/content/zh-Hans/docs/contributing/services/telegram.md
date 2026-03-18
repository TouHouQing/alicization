---
title: Telegram Bot
description: 参与并贡献 Project Alicization
---

### Telegram Bot / 机器人

需要使用 pgvector（基于 Postgres）数据库。

```shell
cd services/telegram-bot
docker compose up -d
```

配置 `.env` 文件：

```shell
cp .env .env.local
```

编辑 `.env.local` 中的各类密钥和配置信息。

执行数据库迁移：

```shell
pnpm -F @proj-alicization/telegram-bot db:generate
pnpm -F @proj-alicization/telegram-bot db:push
```

启动机器人：

```shell
pnpm -F @proj-alicization/telegram-bot start
```

::: tip

如果你使用 [@antfu/ni](https://github.com/antfu-collective/ni)，你可以：

```shell
nr -F @proj-alicization/telegram-bot dev
```

:::
