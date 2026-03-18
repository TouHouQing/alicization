# @proj-alicization/server-sdk

The SDK for cliet-side code to connect to the server-side components.

## Usage

```shell
ni @proj-alicization/server-sdk -D # from @antfu/ni, can be installed via `npm i -g @antfu/ni`
pnpm i @proj-alicization/server-sdk -D
yarn i @proj-alicization/server-sdk -D
npm i @proj-alicization/server-sdk -D
```

```typescript
import { Client } from '@proj-alicization/server-sdk'

const c = new Client({ name: 'your airi plugin' })
```

## License

[MIT](../../LICENSE)
