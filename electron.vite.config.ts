import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

/**
 * Build stamp for packaged builds. The PKGBUILD exports these while building;
 * from the repo they're unset and Polaris runs in "checkout" mode.
 */
const build = {
  channel: process.env.POLARIS_CHANNEL || null,
  commit: process.env.POLARIS_COMMIT || null,
  pkgver: process.env.POLARIS_PKGVER || null
}

export default defineConfig({
  main: {
    define: { __POLARIS_BUILD__: JSON.stringify(build) }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [tailwindcss(), solid()],
    server: {
      host: '127.0.0.1'
    }
  }
})
