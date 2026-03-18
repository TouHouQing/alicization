---
title: Telegram Bot
description: Project Alicization への貢献
---

### Telegram bot 統合

Postgres データベースが必要です。

```shell
cd services/telegram-bot
docker compose up -d
```

`.env` の設定

```shell
cp .env .env.local
```

`.env.local` 内の認証情報を編集します。

データベースのマイグレーション

```shell
pnpm -F @proj-alicization/telegram-bot db:generate
pnpm -F @proj-alicization/telegram-bot db:push
```

ボットの実行

```shell
pnpm -F @proj-alicization/telegram-bot start
```

::: tip

[@antfu/ni](https://github.com/antfu-collective/ni) ユーザーの場合：

```shell
nr -F @proj-alicization/telegram-bot dev
```

:::
