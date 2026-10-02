import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/',
  plugins: [
    Vue({ template: { transformAssetUrls } }),
    Vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
