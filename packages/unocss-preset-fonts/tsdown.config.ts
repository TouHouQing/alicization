import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
  ],
  noExternal: [
    '@proj-alicization/font-cjkfonts-allseto',
    '@proj-alicization/font-departure-mono',
    '@proj-alicization/font-xiaolai',
  ],
  dts: true,
  sourcemap: true,
})
