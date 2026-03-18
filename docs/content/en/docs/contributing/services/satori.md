---
title: Satori Bot
description: Contribute to Project Alicization
---

### Satori Bot

```shell
cd services/satori-bot
```

Configure the `.env` file:

```shell
cp .env .env.local
```

Edit various keys and configuration information in `.env.local`.

Start the bot:

```shell
pnpm -F @proj-alicization/satori-bot dev
```

::: tip

If you use [@antfu/ni](https://github.com/antfu-collective/ni), you can:

```shell
nr -F @proj-alicization/satori-bot dev
```

:::
